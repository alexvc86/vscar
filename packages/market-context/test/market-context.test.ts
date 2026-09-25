import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { ENERGY_MARKET_RULES, METHODOLOGY_VERSION } from '@vscar/methodology';
import { EnergyPriceObservation, type EnergyProduct, type PriceScopeType } from '@vscar/vehicle-schema';
import { effectiveEnergyInputs, loadEnergyContext, resolveEnergyContext, type EnergyPriceReader } from '../src/index.ts';

/** Observaciones válidas con valores reales de los imports MITECO (2026-09-20, fixtures) y ESIOS (2026-09-24). */
let seq = 0;
const id = () => `00000000-0000-4000-8000-${String(++seq).padStart(12, '0')}`;
const MITECO_ID = '00000000-0000-4000-8000-00000000c003';
const ESIOS_ID = '00000000-0000-4000-8000-00000000c004';

function fuel(product: EnergyProduct, scope_type: PriceScopeType, scope_code: string, price_date: string, value: number, over: Partial<EnergyPriceObservation> = {}) {
  return EnergyPriceObservation.parse({
    id: id(), market_code: 'ES', energy_product: product, price_basis: 'RETAIL_PUMP_PRICE', scope_type, scope_code, price_date,
    observed_at: `${price_date}T00:00:00`, source_timezone: 'Europe/Madrid', statistic: 'MEDIAN', value, unit: 'EUR_PER_L', currency: 'EUR',
    taxes: 'INCLUDED', aggregation_method: 'UNWEIGHTED_STATION_MEDIAN',
    distribution: { n: 124, p25: value - 0.1, p75: value + 0.03, min: value - 0.2, max: value + 0.1, excluded_restricted: 0, excluded_implausible: 0 },
    source_authority: 'CALCULATED', derived_from_authority: 'OFFICIAL_AUTHORITY', source_id: MITECO_ID,
    source_url: `https://sedeaplicaciones.minetur.gob.es/ServiciosRESTCarburantes/PreciosCarburantes/EstacionesTerrestresHist/${price_date.split('-').reverse().join('-')}`,
    provisional: true, retrieved_at: '2026-09-24', raw_ingest_id: id(), external_field: 'Precio Gasoleo A', adapter_version: '0.1.0', transformation_version: 1, ...over,
  });
}
function pvpc(zone: string, price_date: string, value: number, over: Partial<EnergyPriceObservation> = {}) {
  return EnergyPriceObservation.parse({
    id: id(), market_code: 'ES', energy_product: 'ELECTRICITY', price_basis: 'PVPC_ENERGY_TERM', scope_type: 'TARIFF_ZONE', scope_code: zone, price_date,
    observed_at: `${price_date}T00:00:00`, source_timezone: 'Europe/Madrid', statistic: 'MEAN', value, unit: 'EUR_PER_KWH', currency: 'EUR',
    taxes: 'EXCLUDED', aggregation_method: 'HOURLY_ARITHMETIC_MEAN', distribution: { n: 24, min: 0.04916, max: 0.38922, excluded_restricted: 0, excluded_implausible: 0 },
    source_authority: 'CALCULATED', derived_from_authority: 'OFFICIAL_AUTHORITY', source_id: ESIOS_ID,
    source_url: `https://api.esios.ree.es/archives/70/download_json?locale=es&date=${price_date}`,
    provisional: false, retrieved_at: '2026-09-25', raw_ingest_id: id(), external_field: 'PCB', adapter_version: '0.1.0', transformation_version: 1, ...over,
  });
}

const OBS = [
  fuel('DIESEL_A', 'TAX_ZONE', 'PENINSULA_BALEARES', '2026-09-23', 1.974),
  fuel('PETROL_95_E5', 'TAX_ZONE', 'PENINSULA_BALEARES', '2026-09-23', 1.975),
  fuel('DIESEL_A', 'TAX_ZONE', 'CANARIAS', '2026-09-23', 1.659),
  fuel('PETROL_95_E5', 'TAX_ZONE', 'CANARIAS', '2026-09-23', 1.509),
  fuel('DIESEL_A', 'TAX_ZONE', 'CEUTA', '2026-09-23', 1.748),
  fuel('DIESEL_A', 'TAX_ZONE', 'MELILLA', '2026-09-23', 1.517),
  fuel('DIESEL_A', 'REGION', 'ES-MD', '2026-09-23', 1.899),
  pvpc('PENINSULA_CANARIAS_BALEARES', '2026-09-24', 0.194264),
  pvpc('CEUTA_MELILLA', '2026-09-24', 0.194267, { external_field: 'CYM' }),
];

describe('market-context — fuel zone resolution', () => {
  it('Madrid → Península+Baleares zone median (not the region or a national price); electricity PCB', () => {
    const ctx = resolveEnergyContext({ market: 'ES', region: 'ES-MD', date: '2026-09-24' }, OBS);
    expect(ctx.zones).toEqual({ fuel: 'PENINSULA_BALEARES', electricity: 'PENINSULA_CANARIAS_BALEARES', resolution: 'REGION' });
    expect(ctx.fuelPricesEurPerL).toEqual({ PETROL_95_E5: 1.975, DIESEL_A: 1.974 });
    expect(ctx.electricityPriceEurPerKwh).toBe(0.194264);
    expect(ctx.missing).toEqual([]);
  });

  it('Canarias → Canarias fuel price; electricity stays in the PCB PVPC zone', () => {
    const ctx = resolveEnergyContext({ market: 'ES', region: 'ES-CN', date: '2026-09-24' }, OBS);
    expect(ctx.fuelPricesEurPerL).toEqual({ PETROL_95_E5: 1.509, DIESEL_A: 1.659 });
    expect(ctx.zones.electricity).toBe('PENINSULA_CANARIAS_BALEARES');
  });

  it('Ceuta and Melilla are separate fuel zones and share the CYM electricity zone', () => {
    const ceuta = resolveEnergyContext({ market: 'ES', region: 'ES-CE', date: '2026-09-24', fuelProducts: ['DIESEL_A'] }, OBS);
    const melilla = resolveEnergyContext({ market: 'ES', region: 'ES-ML', date: '2026-09-24', fuelProducts: ['DIESEL_A'] }, OBS);
    expect([ceuta.fuelPricesEurPerL.DIESEL_A, melilla.fuelPricesEurPerL.DIESEL_A]).toEqual([1.748, 1.517]);
    expect([ceuta.electricityPriceEurPerKwh, melilla.electricityPriceEurPerKwh]).toEqual([0.194267, 0.194267]);
  });

  it('a partial MITECO import (province aggregates only) is never used as a zone price', () => {
    const partial = [fuel('DIESEL_A', 'PROVINCE', '42', '2026-09-23', 1.985), fuel('DIESEL_A', 'PROVINCE', '35', '2026-09-23', 1.659)];
    const ctx = resolveEnergyContext({ market: 'ES', region: 'ES-CL', date: '2026-09-24', fuelProducts: ['DIESEL_A'] }, partial);
    expect(ctx.fuelPricesEurPerL).toEqual({});
    expect(ctx.missing).toContainEqual({ product: 'DIESEL_A', reason: 'NO_OBSERVATION' });
  });

  it('no region → declared market default zones', () => {
    const ctx = resolveEnergyContext({ market: 'ES', date: '2026-09-24' }, OBS);
    expect(ctx.zones.resolution).toBe('MARKET_DEFAULT');
    expect(ctx.fuelPricesEurPerL.DIESEL_A).toBe(1.974);
    expect(() => resolveEnergyContext({ market: 'ES', region: 'ES-XX', date: '2026-09-24' }, OBS)).toThrow(/unknown region/);
  });
});

describe('market-context — electricity reference', () => {
  it('uses the PVPC daily average (energy term, taxes excluded) labelled as a reference', () => {
    const ctx = resolveEnergyContext({ market: 'ES', region: 'ES-MD', date: '2026-09-24' }, [
      ...OBS,
      // Otro tipo de precio eléctrico o estadística nunca se toma como referencia.
      pvpc('PENINSULA_CANARIAS_BALEARES', '2026-09-24', 0.3, { statistic: 'MEDIAN', distribution: { n: 24, p25: 0.2, p75: 0.35, min: 0.04916, max: 0.38922, excluded_restricted: 0, excluded_implausible: 0 } }),
    ]);
    expect(ctx.electricity).toMatchObject({ value: 0.194264, unit: 'EUR_PER_KWH', observationDate: '2026-09-24', freshness: 'CURRENT' });
    expect(ctx.electricity!.provenance).toMatchObject({ statistic: 'MEAN', price_basis: 'PVPC_ENERGY_TERM', taxes: 'EXCLUDED', aggregation_method: 'HOURLY_ARITHMETIC_MEAN' });
    expect(ctx.electricity!.provenance.label).toMatch(/^reference electricity price/);
  });
});

describe('market-context — temporal fallback and freshness', () => {
  const at = (date: string, ...obs: EnergyPriceObservation[]) => resolveEnergyContext({ market: 'ES', region: 'ES-MD', date, fuelProducts: ['DIESEL_A'] }, obs);
  const d = (date: string, v = 1.9) => fuel('DIESEL_A', 'TAX_ZONE', 'PENINSULA_BALEARES', date, v);

  it('requested 2026-09-24, latest MITECO 2026-09-23 → used, 1 day old, CURRENT', () => {
    const f = at('2026-09-24', d('2026-09-23')).fuel.DIESEL_A!;
    expect(f).toMatchObject({ observationDate: '2026-09-23', ageDays: 1, freshness: 'CURRENT' });
  });

  it('freshness thresholds come from methodology: 2 → CURRENT, 3 → RECENT, 7 → RECENT, 8 → STALE', () => {
    expect(ENERGY_MARKET_RULES.freshness).toEqual({ current_max_age_days: 2, recent_max_age_days: 7 });
    expect(at('2026-09-24', d('2026-09-22')).fuel.DIESEL_A!.freshness).toBe('CURRENT');
    expect(at('2026-09-24', d('2026-09-21')).fuel.DIESEL_A!.freshness).toBe('RECENT');
    expect(at('2026-09-24', d('2026-09-17')).fuel.DIESEL_A!.freshness).toBe('RECENT');
    expect(at('2026-09-24', d('2026-09-16')).fuel.DIESEL_A!.freshness).toBe('STALE');
  });

  it('older than the methodology lookback window → not used (reported), never presented as current', () => {
    const ctx = at('2026-09-24', d('2026-09-09'));
    expect(ctx.fuel.DIESEL_A).toBeUndefined();
    expect(ctx.missing).toContainEqual({ product: 'DIESEL_A', reason: 'OLDER_THAN_LOOKBACK', latestSeen: '2026-09-09' });
    expect(at('2026-09-24', d('2026-09-10')).fuel.DIESEL_A!.ageDays).toBe(14);
  });

  it('never uses data from after the requested date; newest date wins, then the latest retrieval', () => {
    expect(at('2026-09-20', d('2026-09-21', 2.5), d('2026-09-19', 1.8)).fuel.DIESEL_A!.value).toBe(1.8);
    const revised = fuel('DIESEL_A', 'TAX_ZONE', 'PENINSULA_BALEARES', '2026-09-23', 1.95, { retrieved_at: '2026-09-25' });
    expect(at('2026-09-24', d('2026-09-23', 1.9), revised, d('2026-09-22', 1.7)).fuel.DIESEL_A!.value).toBe(1.95);
  });
});

describe('market-context — provenance and separation of assumptions', () => {
  it('keeps what "How we calculated this" needs: source, zone, date, method, sample size', () => {
    const ctx = resolveEnergyContext({ market: 'ES', region: 'ES-MD', date: '2026-09-24' }, OBS);
    const src = OBS.find((o) => o.energy_product === 'DIESEL_A' && o.scope_code === 'PENINSULA_BALEARES')!;
    expect(ctx.fuel.DIESEL_A!.provenance).toEqual({
      observation_id: src.id,
      source_id: MITECO_ID,
      source_url: src.source_url,
      derived_from_authority: 'OFFICIAL_AUTHORITY',
      scope_type: 'TAX_ZONE',
      scope_code: 'PENINSULA_BALEARES',
      statistic: 'MEDIAN',
      aggregation_method: 'UNWEIGHTED_STATION_MEDIAN',
      price_basis: 'RETAIL_PUMP_PRICE',
      taxes: 'INCLUDED',
      sample_size: 124,
      provisional: true,
      raw_ingest_id: src.raw_ingest_id,
      retrieved_at: '2026-09-24',
      label: 'reference fuel price (median of public stations)',
    });
    expect(ctx.rules).toEqual({ methodology_version: METHODOLOGY_VERSION, energy_market_rules: 'energy-market-v1' });
  });

  it('EnergyContext holds observed facts only: no home-charging share, no vehicle costs', () => {
    const ctx = resolveEnergyContext({ market: 'ES', region: 'ES-MD', date: '2026-09-24' }, OBS);
    const keys = JSON.stringify(ctx);
    for (const forbidden of ['homeCharging', 'home_charging', 'per100', 'annual', 'tco', 'breakEven', 'cost']) expect(keys.toLowerCase()).not.toContain(forbidden.toLowerCase());
  });

  it('EnergyScenario is separate: user override > market reference > methodology fallback (none yet) > UNAVAILABLE', () => {
    const ctx = resolveEnergyContext({ market: 'ES', region: 'ES-MD', date: '2026-09-24', fuelProducts: ['DIESEL_A'] }, OBS);
    const reference = effectiveEnergyInputs(ctx);
    expect(reference.electricity).toMatchObject({ value: 0.194264, origin: 'MARKET_REFERENCE', status: 'CALCULATED' });
    const user = effectiveEnergyInputs(ctx, { homeChargingShare: 0.8, electricityPriceOverride: 0.14, fuelPriceOverrides: { DIESEL_A: 1.79 } });
    expect(user.electricity).toMatchObject({ value: 0.14, origin: 'USER_OVERRIDE', status: 'USER_PROVIDED' });
    expect(user.electricity.reference!.value).toBe(0.194264);
    expect(user.fuel.DIESEL_A).toMatchObject({ value: 1.79, origin: 'USER_OVERRIDE' });
    expect(user.homeChargingShare).toEqual({ value: 0.8, status: 'USER_PROVIDED' });
    expect(ctx).not.toHaveProperty('homeChargingShare');
    const empty = effectiveEnergyInputs(resolveEnergyContext({ market: 'ES', region: 'ES-MD', date: '2026-09-24' }, []));
    expect(empty.electricity).toEqual({ unit: 'EUR_PER_KWH', origin: 'UNAVAILABLE', status: 'UNAVAILABLE' });
    expect(() => effectiveEnergyInputs(ctx, { homeChargingShare: 1.2 })).toThrow();
  });

  it('loadEnergyContext asks the reader only for the methodology scopes and window', async () => {
    const queries: unknown[] = [];
    const reader: EnergyPriceReader = {
      async loadEnergyPrices(q) {
        queries.push(q);
        return OBS.filter((o) => o.scope_type === q.scope_type && o.scope_code === q.scope_code && (!q.products || q.products.includes(o.energy_product)));
      },
    };
    const ctx = await loadEnergyContext(reader, { market: 'ES', region: 'ES-CN', date: '2026-09-24' });
    expect(queries).toEqual([
      { market_code: 'ES', scope_type: 'TAX_ZONE', scope_code: 'CANARIAS', products: ['PETROL_95_E5', 'DIESEL_A'], from: '2026-09-10', to: '2026-09-24' },
      { market_code: 'ES', scope_type: 'TARIFF_ZONE', scope_code: 'PENINSULA_CANARIAS_BALEARES', products: ['ELECTRICITY'], from: '2026-09-10', to: '2026-09-24' },
    ]);
    expect(ctx.fuelPricesEurPerL.DIESEL_A).toBe(1.659);
  });
});

describe('market-context — architecture boundary', () => {
  const srcDir = fileURLToPath(new URL('../src/', import.meta.url));
  // Solo código: se ignoran comentarios (que sí nombran @vscar/db como implementador del puerto).
  const sources = readdirSync(srcDir)
    .map((f) => readFileSync(`${srcDir}${f}`, 'utf8'))
    .join('\n')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/^\s*\/\/.*$/gm, '');
  const imports = [...sources.matchAll(/from '([^']+)'/g)].map((m) => m[1]!);

  it('does not import adapters, the database or any I/O module', () => {
    for (const i of imports) expect(i.startsWith('./') || ['@vscar/methodology', '@vscar/vehicle-schema', 'zod'].includes(i), i).toBe(true);
    expect(sources).not.toMatch(/fetch\(|node:|mysql|drizzle|data-connectors|@vscar\/db/);
  });

  it('declares only pure dependencies', () => {
    const pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8')) as { dependencies: Record<string, string>; devDependencies?: Record<string, string> };
    expect(Object.keys(pkg.dependencies).sort()).toEqual(['@vscar/methodology', '@vscar/vehicle-schema', 'zod']);
    expect(pkg.devDependencies ?? {}).toEqual({});
  });
});
