import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createCatalogReader, createCatalogRepository, type DbHandle } from '@vscar/db';
import { freshTestDb } from '@vscar/db/testing';
import { BYD_SEAL_IDS, loadAllCases } from '@vscar/fixtures';
import { NextRequest } from 'next/server';
import { pairSlug } from '../src/domain/catalog.ts';
import type { ComparisonData } from '../src/domain/comparison-data.ts';
import { computeDecision, computeRobustness } from '../src/domain/decision.ts';
import { DEFAULT_SCENARIO } from '../src/domain/scenario.ts';
import { buildDecisionView, withRobustness } from '../src/domain/view-model.ts';
import { createVehicleCatalogService, type VehicleCatalogService } from '../src/server/catalog-service.ts';
import { loadComparisonData } from '../src/server/comparison-loader.ts';
import { CatalogUnavailableError } from '../src/server/db.ts';
import { serverDecisionView } from '../src/server/server-decision.ts';
import { comparisonData, DEMO_PAIR } from './support/catalog.ts';

/**
 * Step 7b — integración REAL con MySQL (`VSCAR_TEST_DATABASE_URL`, base `*_test`): Dataset Core en MySQL →
 * CatalogReader (@vscar/db) → VehicleCatalogService → orquestador → engines, y la API interna de búsqueda.
 */
const url = process.env.VSCAR_TEST_DATABASE_URL;
const BYD = 'byd-seal-2026-design-rwd-82-5-kwh';
const M3 = 'tesla-model-3-2021-standard-range-plus-e6r';

describe.skipIf(!url)('catalog over MySQL', () => {
  let handle: DbHandle;
  let catalog: VehicleCatalogService;

  beforeAll(async () => {
    handle = await freshTestDb(url!);
    await createCatalogRepository(handle.db).saveBundle(loadAllCases());
    const reader = createCatalogReader(handle.db);
    catalog = createVehicleCatalogService({ reader: () => reader, channel: 'PREVIEW' });
  });
  afterAll(async () => {
    await handle?.close();
  });

  it('DB-backed search: exact, partial, accent-insensitive; ranked, ≤ 20, no specs', async () => {
    const slugs = async (q: string) => (await catalog.searchVehicles('ES', q)).results.map((o) => o.slug);
    expect(await slugs('seal')).toEqual([BYD]);
    expect(await slugs('leon')).toEqual(await slugs('León'));
    expect(await slugs('leon')).toEqual(['seat-leon-2026-style-e-hybrid-204']);
    expect((await slugs('tesla')).length).toBe(3);
    const r = await catalog.searchVehicles('ES', 'golf');
    expect(r.results.length).toBeLessThanOrEqual(20);
    expect(Object.keys(r.results[0]!).sort()).toEqual(['bodyType', 'brand', 'id', 'model', 'powertrainType', 'preview', 'slug', 'variant', 'year']);
  });

  it('PUBLIC channel over the same database: nothing selectable today (rights + identity + record status)', async () => {
    const reader = createCatalogReader(handle.db);
    const pub = createVehicleCatalogService({ reader: () => reader, channel: 'PUBLIC' });
    expect((await pub.index('ES')).options).toEqual([]);
    expect(await pub.getVariantBySlug('ES', BYD)).toBeUndefined();
  });

  it('slug resolution and 404 outcomes against MySQL', async () => {
    expect((await catalog.getVariantBySlug('ES', BYD))?.option.id).toBe(BYD_SEAL_IDS.variant);
    expect(await loadComparisonData('ES', pairSlug(BYD, 'nope'), catalog)).toEqual({ kind: 'not-found', reason: 'UNKNOWN_VEHICLE' });
    expect(await loadComparisonData('ES', pairSlug(BYD, BYD), catalog)).toEqual({ kind: 'not-found', reason: 'SAME_VEHICLE' });
  });

  it('golden: BYD vs Model 3 from MySQL === in-memory catalog path === Step 7a fixture path (same decision)', async () => {
    const db = await comparisonData(DEMO_PAIR, catalog);
    const memory = await comparisonData(DEMO_PAIR);
    expect(db.vehicles.map((v) => v.pipeline)).toEqual(memory.vehicles.map((v) => v.pipeline));
    const tie = computeDecision(db, { ...DEFAULT_SCENARIO, trips: 1 }, { robustness: true }).result;
    const byd = computeDecision(db, { ...DEFAULT_SCENARIO, trips: 10 }, { robustness: true }).result;
    expect(tie.alphaBestForYou.status).toBe('PRACTICAL_TIE');
    expect(byd.alphaBestForYou.status).toBe('BEST_FOR_YOU');
    expect(byd.alphaBestForYou.candidateId).toBe(BYD_SEAL_IDS.variant);
  });

  it('server initial result (DB) === client recompute from the SERIALIZED data + worker robustness', async () => {
    const server = await comparisonData(pairSlug(BYD, M3), catalog);
    const client: ComparisonData = JSON.parse(JSON.stringify(server));
    for (const trips of [1, 10]) {
      const s = { ...DEFAULT_SCENARIO, trips };
      const initial = serverDecisionView(server, s).view;
      const run = computeDecision(client, s, { robustness: false });
      const recomputed = withRobustness(buildDecisionView(client, run.input, run.result, false), computeRobustness(client, s));
      expect(recomputed).toEqual(initial);
    }
  });

  it('the result carries the data snapshot (catalog version, energy, rights matrix) for traceability', async () => {
    const data = await comparisonData(DEMO_PAIR, catalog);
    expect(data.dataSnapshot.vehicles).toMatch(/^9\.\d+\.\d+\.\d+@/); // variants.values.prices.media@último cambio
    expect(data.dataSnapshot.rights).toBe('DATA_RIGHTS_MATRIX v0.2');
    expect(data.channel).toBe('PREVIEW');
  });
});

describe.skipIf(!url)('internal search API /api/catalog/search (MySQL)', () => {
  let handle: DbHandle;
  let GET: (r: NextRequest) => Promise<Response>;
  const call = async (query: string, headers: Record<string, string> = {}) => {
    const res = await GET(new NextRequest(`http://localhost/api/catalog/search?${query}`, { headers }));
    return { status: res.status, body: (await res.json()) as { results?: { slug: string }[]; error?: string; mode?: string } };
  };

  beforeAll(async () => {
    handle = await freshTestDb(url!);
    await createCatalogRepository(handle.db).saveBundle(loadAllCases());
    process.env.DATABASE_URL = url;
    process.env.VSCAR_PUBLICATION_CHANNEL = 'PREVIEW';
    const g = globalThis as Record<string, unknown>;
    delete g.__vscarCatalog;
    delete g.__vscarDb;
    ({ GET } = await import('../src/app/api/catalog/search/route.ts'));
  });
  afterAll(async () => {
    const g = globalThis as { __vscarDb?: DbHandle };
    await g.__vscarDb?.close();
    delete g.__vscarDb;
    delete (globalThis as Record<string, unknown>).__vscarCatalog;
    await handle?.close();
  });

  it('same catalog whatever the UI language (es-es / en-es)', async () => {
    const es = await call('market=ES&q=model', { 'accept-language': 'es-ES' });
    const en = await call('market=ES&q=model', { 'accept-language': 'en-GB' });
    expect(es.status).toBe(200);
    expect(en.body).toEqual(es.body);
  });
  it('accent-insensitive, browse below 2 characters', async () => {
    expect((await call('market=ES&q=le%C3%B3n')).body.results).toEqual((await call('market=ES&q=leon')).body.results);
    expect((await call('market=ES&q=g')).body.mode).toBe('browse');
  });
  it('validates input: query ≤ 100 chars, known market', async () => {
    expect((await call(`market=ES&q=${'a'.repeat(101)}`)).status).toBe(400);
    expect((await call('market=XX&q=golf')).status).toBe(400);
    expect((await call('q=golf')).status).toBe(400);
  });
  it('database down → controlled 503, never a stack trace', async () => {
    const g = globalThis as { __vscarDb?: DbHandle };
    const saved = g.__vscarDb;
    delete g.__vscarDb;
    delete (globalThis as Record<string, unknown>).__vscarCatalog;
    const realUrl = process.env.DATABASE_URL;
    process.env.DATABASE_URL = 'mysql://nobody:nothing@127.0.0.1:1/vscar_down';
    try {
      const r = await call('market=ES&q=golf');
      expect(r.status).toBe(503);
      expect(r.body).toEqual({ error: 'CATALOG_UNAVAILABLE' });
    } finally {
      await (g.__vscarDb as DbHandle | undefined)?.close().catch(() => undefined);
      g.__vscarDb = saved!;
      delete (globalThis as Record<string, unknown>).__vscarCatalog;
      process.env.DATABASE_URL = realUrl;
    }
  });
});

describe('catalog unavailable is a controlled error type', () => {
  it('a reader failure surfaces as CatalogUnavailableError', async () => {
    const broken = createVehicleCatalogService({
      reader: () => {
        throw new Error('ECONNREFUSED');
      },
      channel: 'PREVIEW',
    });
    await expect(broken.searchVehicles('ES', 'golf')).rejects.toBeInstanceOf(CatalogUnavailableError);
  });
});
