import { computeEconomics, type EconomicVehicleInputIn } from '@vscar/economics-engine';
import { resolveEnergyContext, type EnergyContext } from '@vscar/market-context';
import type { CategoryEligibility } from '@vscar/quality';
import { ALPHA_CATEGORIES, EnergyPriceObservation, SpecValue, getSpecKeyDefinition, type AlphaCategory, type PowertrainType } from '@vscar/vehicle-schema';
import type { ComparisonCandidate, ComparisonResult, MetricComparison } from '../src/index.ts';

let seq = 0;
export const uuid = () => `00000000-0000-4000-8000-${String(++seq).padStart(12, '0')}`;
const SOURCE = '00000000-0000-4000-8000-00000000c008';

const DEFAULT_BASIS: Record<string, unknown> = {
  range_type: 'WLTP_COMBINED',
  soc_from_pct: 10,
  soc_to_pct: 80,
  boot_method: 'VDA',
  turning_measure: 'DIAMETER',
  towing_gradient_pct: 12,
  consumption_basis: 'COMBINED',
  charging_loss_basis: 'UNSPECIFIED',
  power_basis: 'SYSTEM',
};

type Val = number | string | boolean | [number, number];
export type FactSpec = [key: string, value: Val, extra?: Record<string, unknown>];

export function sv(variantId: string, key: string, value: Val, extra: Record<string, unknown> = {}): SpecValue {
  const def = getSpecKeyDefinition(key)!;
  const basis = Object.fromEntries((def.basis ?? []).map((f) => [f, DEFAULT_BASIS[f]]));
  return SpecValue.parse({
    id: uuid(),
    variant_id: variantId,
    spec_key: key,
    ...(Array.isArray(value) ? { value_min: value[0], value_max: value[1], range_basis: 'TRIM' } : { value }),
    unit: def.unit,
    source_id: SOURCE,
    source_url: 'https://example.org/spec',
    source_market: 'ES',
    reference_market: 'ES',
    source_authority: 'OFFICIAL_MANUFACTURER',
    mapping_confidence: 'EXACT',
    homologation_match: 'NOT_APPLICABLE',
    retrieved_at: '2026-09-24',
    ...(def.cycle ? { test_cycle: 'WLTP' } : {}),
    ...(Object.keys(basis).length || def.fixedBasis ? { measurement_basis: { ...def.fixedBasis, ...basis, ...((extra.measurement_basis as object) ?? {}) } } : {}),
    ...Object.fromEntries(Object.entries(extra).filter(([k]) => k !== 'measurement_basis')),
  });
}

const allAvailable = (): Partial<Record<AlphaCategory, CategoryEligibility>> =>
  Object.fromEntries(ALPHA_CATEGORIES.map((c) => [c, { status: 'AVAILABLE', missing: [], partial_reasons: [], value_ids: [] }]));

export function cand(label: string, facts: FactSpec[], over: Partial<ComparisonCandidate> = {}): ComparisonCandidate {
  const id = over.id ?? uuid();
  const byKey: Record<string, SpecValue[]> = {};
  for (const [k, v, extra] of facts) byKey[k] = [...(byKey[k] ?? []), sv(id, k, v, extra)];
  return { id, label, market: 'ES', powertrainType: 'BEV' as PowertrainType, facts: byKey, safetyRatings: [], eligibility: allAvailable(), exclusions: [], ...over };
}

export function fuelCtx(petrol = 1.65, diesel = 1.974): EnergyContext {
  const obs = EnergyPriceObservation.parse({
    id: '00000000-0000-4000-8000-0000000fe001', market_code: 'ES', energy_product: 'PETROL_95_E5', price_basis: 'RETAIL_PUMP_PRICE', scope_type: 'TAX_ZONE', scope_code: 'PENINSULA_BALEARES',
    price_date: '2026-09-23', observed_at: '2026-09-23T00:00:00', source_timezone: 'Europe/Madrid', statistic: 'MEDIAN', value: petrol, unit: 'EUR_PER_L', currency: 'EUR', taxes: 'INCLUDED',
    aggregation_method: 'UNWEIGHTED_STATION_MEDIAN', distribution: { n: 100, p25: petrol, p75: petrol, min: petrol, max: petrol, excluded_restricted: 0, excluded_implausible: 0 },
    source_authority: 'CALCULATED', derived_from_authority: 'OFFICIAL_AUTHORITY', source_id: '00000000-0000-4000-8000-00000000c003', source_url: 'https://sedeaplicaciones.minetur.gob.es/x',
    provisional: true, retrieved_at: '2026-09-23', raw_ingest_id: '00000000-0000-4000-8000-0000000fe002', external_field: 'Precio Gasolina 95 E5', adapter_version: '0.1.0', transformation_version: 1,
  });
  const pvpc = EnergyPriceObservation.parse({
    id: '00000000-0000-4000-8000-0000000fe003', market_code: 'ES', energy_product: 'ELECTRICITY', price_basis: 'PVPC_ENERGY_TERM', scope_type: 'TARIFF_ZONE', scope_code: 'PENINSULA_CANARIAS_BALEARES',
    price_date: '2026-09-24', observed_at: '2026-09-24T00:00:00', source_timezone: 'Europe/Madrid', statistic: 'MEAN', value: 0.194264, unit: 'EUR_PER_KWH', currency: 'EUR', taxes: 'EXCLUDED',
    aggregation_method: 'HOURLY_ARITHMETIC_MEAN', distribution: { n: 24, min: 0.04916, max: 0.38922, excluded_restricted: 0, excluded_implausible: 0 },
    source_authority: 'CALCULATED', derived_from_authority: 'OFFICIAL_AUTHORITY', source_id: '00000000-0000-4000-8000-00000000c004', source_url: 'https://api.esios.ree.es/archives/70/download_json?locale=es&date=2026-09-24',
    provisional: false, retrieved_at: '2026-09-25', raw_ingest_id: '00000000-0000-4000-8000-0000000fe004', external_field: 'PCB', adapter_version: '0.1.0', transformation_version: 1,
  });
  const dieselObs = EnergyPriceObservation.parse({ ...obs, id: '00000000-0000-4000-8000-0000000fe005', energy_product: 'DIESEL_A', value: diesel, distribution: { ...obs.distribution, p25: diesel, p75: diesel, min: diesel, max: diesel }, external_field: 'Precio Gasoleo A' });
  return resolveEnergyContext({ market: 'ES', region: 'ES-MD', date: '2026-09-24' }, [obs, dieselObs, pvpc]);
}

export const iceEconomic = (id: string, l100: number, ctx: EnergyContext, scenario = { annualKm: 18_000, horizonYears: 5 }, over: Partial<EconomicVehicleInputIn> = {}) =>
  computeEconomics({ id, market: 'ES', powertrainType: 'ICE', fuelType: 'petrol', fuelConsumptionL100: { min: l100, max: l100, test_cycle: 'WLTP', mapping_confidence: 'EXACT' }, purchase: { participant: 'NEW' }, ...over }, ctx, scenario);

export const metric = (r: ComparisonResult, key: string): MetricComparison => r.technicalComparisons.find((m) => m.metric === key)!;
