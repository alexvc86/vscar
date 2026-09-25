import { mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { runEsiosImport, runMitecoImport, type FetchLike } from '@vscar/data-connectors';
import { SOURCES } from '@vscar/fixtures';
import { effectiveEnergyInputs, loadEnergyContext } from '@vscar/market-context';
import { createCatalogRepository, createMarketDataRepository, type DbHandle } from '../src/index.ts';
import { TEST_DATABASE_URL, freshTestDb } from './test-db.ts';

/**
 * Extremo a extremo (Step 4g): respuestas reales grabadas → adapters → raw + energy_prices (MySQL) →
 * market-context vía el repositorio como puerto. market-context no conoce ni MITECO, ni ESIOS, ni MySQL.
 */
const fixture = (path: string): { Fecha?: string; ListaEESSPrecio?: unknown[] } =>
  JSON.parse(readFileSync(fileURLToPath(new URL(`../../data-connectors/test/fixtures/${path}.json`, import.meta.url)), 'utf8'));

describe.skipIf(!TEST_DATABASE_URL)('adapters → MySQL → market-context', () => {
  let handle: DbHandle;
  const rawDir = mkdtempSync(join(tmpdir(), 'vscar-raw-'));

  beforeAll(async () => {
    handle = await freshTestDb(TEST_DATABASE_URL!);
    const catalog = createCatalogRepository(handle.db);
    const market = createMarketDataRepository(handle.db);
    await catalog.saveBundle({ sources: [SOURCES.miteco, SOURCES.esios], homologations: [], variants: [], spec_values: [] });

    // MITECO "nacional" con las 5 provincias grabadas (4 zonas fiscales) → agregados TAX_ZONE reales.
    const stations = ['42', '26', '35', '51', '52'].flatMap((p) => fixture(`miteco/hist-2026-09-20-p${p}`).ListaEESSPrecio!);
    const national = { Fecha: '20/09/2026 0:00:00', ListaEESSPrecio: stations, Nota: 'recorded', ResultadoConsulta: 'OK' };
    const m = await runMitecoImport({ date: '2026-09-20', sourceId: SOURCES.miteco.id, rawDir, retrievedAt: '2026-09-24', fetchImpl: async () => ({ ok: true, status: 200, json: async () => national }) });
    await catalog.saveRawIngest({ ...m.raw, source_id: SOURCES.miteco.id });
    await market.appendEnergyPrices(m.observations);

    const pvpc: FetchLike = async () => ({ ok: true, status: 200, json: async () => fixture('esios/pvpc-2026-09-24') });
    const e = await runEsiosImport({ date: '2026-09-24', sourceId: SOURCES.esios.id, rawDir, retrievedAt: '2026-09-25', fetchImpl: pvpc, now: new Date('2026-09-25T09:00:00Z') });
    await catalog.saveRawIngest({ ...e.raw, source_id: SOURCES.esios.id });
    await market.appendEnergyPrices(e.observations);
  });
  afterAll(async () => {
    await handle?.close();
  });

  it('Madrid on 2026-09-24: Península fuel median (4 days old, RECENT) + PVPC daily average (CURRENT)', async () => {
    const ctx = await loadEnergyContext(createMarketDataRepository(handle.db), { market: 'ES', region: 'ES-MD', date: '2026-09-24' });
    expect(ctx.fuelPricesEurPerL).toEqual({ PETROL_95_E5: 1.975, DIESEL_A: 1.974 });
    expect(ctx.fuel.DIESEL_A).toMatchObject({ observationDate: '2026-09-20', ageDays: 4, freshness: 'RECENT' });
    expect(ctx.fuel.DIESEL_A!.provenance).toMatchObject({ scope_code: 'PENINSULA_BALEARES', statistic: 'MEDIAN', sample_size: 124, taxes: 'INCLUDED' });
    expect(ctx.electricity).toMatchObject({ value: 0.194264, observationDate: '2026-09-24', freshness: 'CURRENT' });
    expect(ctx.electricity!.provenance).toMatchObject({ price_basis: 'PVPC_ENERGY_TERM', taxes: 'EXCLUDED', sample_size: 24 });
    // UX Alpha: "Gasolina 95 de referencia · Electricidad de referencia · Carga en casa 80 % [Editar]".
    const inputs = effectiveEnergyInputs(ctx, { homeChargingShare: 0.8 });
    expect([inputs.fuel.PETROL_95_E5!.value, inputs.electricity.value, inputs.homeChargingShare!.value]).toEqual([1.975, 0.194264, 0.8]);
  });

  it('Canarias and Ceuta resolve to their own fuel zones from the same stored data', async () => {
    const repo = createMarketDataRepository(handle.db);
    const canarias = await loadEnergyContext(repo, { market: 'ES', region: 'ES-CN', date: '2026-09-24', fuelProducts: ['DIESEL_A'] });
    const ceuta = await loadEnergyContext(repo, { market: 'ES', region: 'ES-CE', date: '2026-09-24', fuelProducts: ['DIESEL_A'] });
    expect([canarias.fuelPricesEurPerL.DIESEL_A, ceuta.fuelPricesEurPerL.DIESEL_A]).toEqual([1.659, 1.748]);
    expect(canarias.electricity!.provenance.scope_code).toBe('PENINSULA_CANARIAS_BALEARES');
    expect(ceuta.electricity!.provenance.scope_code).toBe('CEUTA_MELILLA');
  });

  it('a date past the lookback window returns no reference instead of an old price', async () => {
    const ctx = await loadEnergyContext(createMarketDataRepository(handle.db), { market: 'ES', region: 'ES-MD', date: '2026-10-20' });
    expect(ctx.fuelPricesEurPerL).toEqual({});
    expect(ctx.electricityPriceEurPerKwh).toBeUndefined();
    expect(ctx.missing.map((m) => m.product).sort()).toEqual(['DIESEL_A', 'ELECTRICITY', 'PETROL_95_E5']);
  });
});
