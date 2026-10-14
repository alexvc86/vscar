import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createCatalogReader, createCatalogRepository, type DbHandle } from '@vscar/db';
import { freshTestDb } from '@vscar/db/testing';
import { GOLF_2018_IDS, loadAllCases } from '@vscar/fixtures';
import type { VehicleModelMediaInput } from '@vscar/vehicle-schema';
import { NextRequest } from 'next/server';
import { createVehicleCatalogService } from '../src/server/catalog-service.ts';

/**
 * Step 7b.2 — navegación del selector y media de modelo contra MySQL real (`vscar_test`): Dataset Core + registros de
 * media SINTÉTICOS (marcados como tales; no apuntan a assets reales) → CatalogReader → servicio → API interna.
 */
const url = process.env.VSCAR_TEST_DATABASE_URL;

const SYNTHETIC: VehicleModelMediaInput[] = [
  { id: '00000000-0000-4000-8000-0000000002a1', brand: 'Volkswagen', model: 'Golf', role: 'SELECTOR', media_type: 'IMAGE', asset_path: '/media/synthetic/golf.webp', width: 640, height: 360, origin: 'SELF_CREATED', rights_status: 'VERIFIED', license: 'synthetic test', verified_at: '2026-10-14', notes: 'synthetic test record' },
  { id: '00000000-0000-4000-8000-0000000002a2', brand: 'Volkswagen', model: 'Golf', generation_code: 'Mk7', role: 'SELECTOR', media_type: 'IMAGE', asset_path: '/media/synthetic/golf-mk7.webp', width: 640, height: 360, origin: 'SELF_CREATED', rights_status: 'VERIFIED', license: 'synthetic test', verified_at: '2026-10-14', notes: 'synthetic test record' },
  { id: '00000000-0000-4000-8000-0000000002a3', brand: 'SEAT', model: 'León', role: 'SELECTOR', media_type: 'IMAGE', asset_path: '/media/synthetic/leon.webp', width: 640, height: 360, origin: 'MANUFACTURER_VERIFIED', rights_status: 'PENDING', notes: 'synthetic test record' },
];

describe.skipIf(!url)('browse + model media over MySQL', () => {
  let handle: DbHandle;
  let reader: ReturnType<typeof createCatalogReader>;

  beforeAll(async () => {
    handle = await freshTestDb(url!);
    const repo = createCatalogRepository(handle.db);
    await repo.saveBundle(loadAllCases());
    await repo.saveModelMedia(SYNTHETIC);
    reader = createCatalogReader(handle.db);
  });
  afterAll(async () => {
    await handle?.close();
  });

  const service = (channel: 'PUBLIC' | 'PREVIEW') => createVehicleCatalogService({ reader: () => reader, channel });

  it('model grouping: Golf variants → one card, several years, model media (not one generation)', async () => {
    const cards = await service('PREVIEW').listModels('ES', 'Volkswagen');
    expect(cards).toHaveLength(1);
    expect(cards[0]).toMatchObject({ model: 'Golf', years: [2027, 2018], media: { src: '/media/synthetic/golf.webp', match: 'MODEL' } });
  });

  it('year grouping and year filter: Golf 2018 → only its two technical variants, exact ids', async () => {
    const c = service('PREVIEW');
    expect((await c.listModelYears('ES', 'Volkswagen', 'Golf')).map((y) => y.year)).toEqual([2027, 2018]);
    const rows = await c.listVariants('ES', 'Volkswagen', 'Golf', 2018);
    expect(rows.map((r) => r.id).sort()).toEqual([GOLF_2018_IDS.rvA, GOLF_2018_IDS.rvB].sort());
    expect(rows.map((r) => r.cycle).sort()).toEqual(['NEDC', 'WLTP']);
    expect(rows.every((r) => r.media?.match === 'GENERATION')).toBe(true);
  });

  it('rights filtering: a PENDING image reaches PREVIEW flagged, never PUBLIC; without media → SVG fallback', async () => {
    const [leon] = await service('PREVIEW').listModels('ES', 'SEAT');
    expect(leon?.media).toMatchObject({ src: '/media/synthetic/leon.webp', preview: true });
    const [byd] = await service('PREVIEW').listModels('ES', 'BYD');
    expect(byd?.media).toBeUndefined();
    const pub = service('PUBLIC');
    expect(JSON.stringify([await pub.listBrands('ES'), await pub.listModels('ES', 'SEAT')])).not.toContain('/media/');
  });

  it('PUBLIC never sends technical identity details', async () => {
    const rows = await service('PUBLIC').listVariants('ES', 'Volkswagen', 'Golf', 2018);
    expect(rows).toEqual([]);
    const pre = await service('PREVIEW').listVariants('ES', 'Volkswagen', 'Golf', 2018);
    expect(pre.every((r) => r.identity?.referenceVariantId === r.id)).toBe(true);
  });
});

describe.skipIf(!url)('internal browse API /api/catalog/browse (MySQL)', () => {
  let handle: DbHandle;
  let GET: (r: NextRequest) => Promise<Response>;
  const call = async (query: string, headers: Record<string, string> = {}) => {
    const res = await GET(new NextRequest(`http://localhost/api/catalog/browse?${query}`, { headers }));
    return { status: res.status, body: (await res.json()) as Record<string, unknown> };
  };

  beforeAll(async () => {
    handle = await freshTestDb(url!);
    await createCatalogRepository(handle.db).saveBundle(loadAllCases());
    process.env.DATABASE_URL = url;
    process.env.VSCAR_PUBLICATION_CHANNEL = 'PREVIEW';
    const g = globalThis as Record<string, unknown>;
    delete g.__vscarCatalog;
    delete g.__vscarDb;
    ({ GET } = await import('../src/app/api/catalog/browse/route.ts'));
  });
  afterAll(async () => {
    const g = globalThis as { __vscarDb?: DbHandle };
    await g.__vscarDb?.close();
    delete g.__vscarDb;
    delete (globalThis as Record<string, unknown>).__vscarCatalog;
    await handle?.close();
  });

  it('brands → models → years → variants; same answer whatever the UI language', async () => {
    const brands = await call('market=ES&level=brands', { 'accept-language': 'es-ES' });
    expect(brands.status).toBe(200);
    expect(await call('market=ES&level=brands', { 'accept-language': 'en-GB' })).toEqual(brands);
    expect((brands.body.brands as { brand: string }[]).map((b) => b.brand)).toEqual(['BMW', 'BYD', 'SEAT', 'Tesla', 'Volkswagen']);
    expect(((await call('market=ES&level=models&brand=Volkswagen')).body.models as unknown[]).length).toBe(1);
    expect((await call('market=ES&level=years&brand=Volkswagen&model=Golf')).body.years).toEqual([
      { year: 2027, generations: ['Mk8'] },
      { year: 2018, generations: ['Mk7'] },
    ]);
    const variants = (await call('market=ES&level=variants&brand=Volkswagen&model=Golf&year=2018')).body.variants as { id: string; year: number }[];
    expect(variants.map((v) => v.year)).toEqual([2018, 2018]);
  });

  it('minimal payloads: variant rows carry no specs beyond power/gearbox/drivetrain', async () => {
    const [row] = (await call('market=ES&level=variants&brand=Volkswagen&model=Golf&year=2018')).body.variants as Record<string, unknown>[];
    expect(Object.keys(row!).sort()).toEqual(['bodyType', 'brand', 'cycle', 'drivetrain', 'generation', 'id', 'identity', 'model', 'powerKw', 'powertrainType', 'preview', 'slug', 'transmission', 'variant', 'year']);
  });

  it('validates input', async () => {
    expect((await call('market=ES&level=models')).status).toBe(400);
    expect((await call('market=XX&level=brands')).status).toBe(400);
    expect((await call('market=ES&level=variants&brand=Volkswagen&model=Golf&year=1800')).status).toBe(400);
    expect((await call(`market=ES&level=models&brand=${'x'.repeat(65)}`)).status).toBe(400);
  });
});
