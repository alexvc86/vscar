import { mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { runEsiosImport, runMitecoImport, type FetchLike } from '@vscar/data-connectors';
import { SOURCES } from '@vscar/fixtures';
import { createCatalogRepository, createMarketDataRepository, type DbHandle } from '../src/index.ts';
import { TEST_DATABASE_URL, freshTestDb } from './test-db.ts';

/** MITECO (respuestas grabadas) → raw_ingest + energy_prices (append-only) → recarga validada. */
const hist = (p: string): unknown =>
  JSON.parse(readFileSync(fileURLToPath(new URL(`../../data-connectors/test/fixtures/miteco/hist-2026-09-20-p${p}.json`, import.meta.url)), 'utf8'));
const provinceFetch: FetchLike = async (url) => ({ ok: true, status: 200, json: async () => hist(/\/(\d{2})$/.exec(url)![1]!) });

describe.skipIf(!TEST_DATABASE_URL)('MITECO import → MySQL energy_prices', () => {
  let handle: DbHandle;
  const rawDir = mkdtempSync(join(tmpdir(), 'vscar-raw-'));

  beforeAll(async () => {
    handle = await freshTestDb(TEST_DATABASE_URL!);
    await createCatalogRepository(handle.db).saveBundle({ sources: [SOURCES.miteco, SOURCES.esios], homologations: [], variants: [], spec_values: [] });
  });
  afterAll(async () => {
    await handle?.close();
  });

  const importOnce = async () => {
    const catalog = createCatalogRepository(handle.db);
    const market = createMarketDataRepository(handle.db);
    const res = await runMitecoImport({ date: '2026-09-20', provinces: ['42', '35'], sourceId: SOURCES.miteco.id, rawDir, retrievedAt: '2026-09-24', fetchImpl: provinceFetch });
    await catalog.saveRawIngest({ ...res.raw, source_id: SOURCES.miteco.id });
    const inserted = await market.appendEnergyPrices(res.observations);
    await catalog.markRawIngest(res.raw.id, 'IMPORTED');
    return { res, inserted };
  };

  it('persists validated observations traceable to the raw file, and re-import is idempotent', async () => {
    const first = await importOnce();
    expect(first.inserted).toBe(first.res.observations.length);
    expect(first.inserted).toBeGreaterThan(0);
    const again = await importOnce();
    expect(again.inserted).toBe(0);
    const raw = await createCatalogRepository(handle.db).getRawIngest(first.res.raw.id);
    expect(raw).toMatchObject({ source_code: 'S03', dataset_status: 'SNAPSHOT', import_status: 'IMPORTED', row_count: 298 });
  });

  it('round-trips without losing provenance, time or distribution', async () => {
    const market = createMarketDataRepository(handle.db);
    const [soria] = await market.loadEnergyPrices({ market_code: 'ES', scope_type: 'PROVINCE', scope_code: '42', products: ['DIESEL_A'] });
    expect(soria).toMatchObject({
      value: 1.985,
      observed_at: '2026-09-20T00:00:00',
      price_date: '2026-09-20',
      taxes: 'INCLUDED',
      provisional: true,
      derived_from_authority: 'OFFICIAL_AUTHORITY',
      distribution: { n: 41, p25: 1.809, p75: 2.009, min: 1.739, max: 2.029, excluded_restricted: 0, excluded_implausible: 0 },
    });
    const lasPalmas = await market.loadEnergyPrices({ market_code: 'ES', scope_type: 'PROVINCE', scope_code: '35', from: '2026-09-20', to: '2026-09-20' });
    expect(lasPalmas.map((o) => o.energy_product).sort()).toEqual(['DIESEL_A', 'DIESEL_A_PREMIUM', 'LPG', 'PETROL_95_E5', 'PETROL_98_E5']);
    expect(await market.loadEnergyPrices({ market_code: 'ES', scope_type: 'TAX_ZONE', scope_code: 'CANARIAS' })).toEqual([]);
  });

  it('ESIOS PVPC: persisted once per payload, reloaded with price basis and taxes excluded', async () => {
    const pvpc: unknown = JSON.parse(readFileSync(fileURLToPath(new URL('../../data-connectors/test/fixtures/esios/pvpc-2026-09-24.json', import.meta.url)), 'utf8'));
    const fetchImpl: FetchLike = async () => ({ ok: true, status: 200, json: async () => pvpc });
    const catalog = createCatalogRepository(handle.db);
    const market = createMarketDataRepository(handle.db);
    const once = async () => {
      const res = await runEsiosImport({ date: '2026-09-24', sourceId: SOURCES.esios.id, rawDir, retrievedAt: '2026-09-25', fetchImpl, now: new Date('2026-09-25T09:00:00Z') });
      await catalog.saveRawIngest({ ...res.raw, source_id: SOURCES.esios.id });
      return market.appendEnergyPrices(res.observations);
    };
    expect(await once()).toBe(2);
    expect(await once()).toBe(0);
    const [pcb] = await market.loadEnergyPrices({ market_code: 'ES', scope_type: 'TARIFF_ZONE', scope_code: 'PENINSULA_CANARIAS_BALEARES', products: ['ELECTRICITY'] });
    expect(pcb).toMatchObject({ value: 0.194264, unit: 'EUR_PER_KWH', price_basis: 'PVPC_ENERGY_TERM', taxes: 'EXCLUDED', statistic: 'MEAN', distribution: { n: 24, min: 0.04916, max: 0.38922 } });
    expect(pcb!.distribution.p25).toBeUndefined();
    // Las filas MITECO anteriores conservan su base de precio.
    const [fuel] = await market.loadEnergyPrices({ market_code: 'ES', scope_type: 'PROVINCE', scope_code: '42', products: ['DIESEL_A'] });
    expect(fuel!.price_basis).toBe('RETAIL_PUMP_PRICE');
  });
});
