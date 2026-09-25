import { resolveEnergyContext, type EnergyContext } from '@vscar/market-context';
import { EnergyPriceObservation, type FuelProduct } from '@vscar/vehicle-schema';
import type { EconomicVehicleInputIn } from '../src/index.ts';

let seq = 0;
export const uuid = (n?: number) => `00000000-0000-4000-8000-${String(n ?? ++seq).padStart(12, '0')}`;
export const MITECO = '00000000-0000-4000-8000-00000000c003';
export const ESIOS = '00000000-0000-4000-8000-00000000c004';

export function fuelObs(product: FuelProduct, value: number, price_date = '2026-09-23', scope_code = 'PENINSULA_BALEARES') {
  return EnergyPriceObservation.parse({
    id: uuid(), market_code: 'ES', energy_product: product, price_basis: 'RETAIL_PUMP_PRICE', scope_type: 'TAX_ZONE', scope_code, price_date,
    observed_at: `${price_date}T00:00:00`, source_timezone: 'Europe/Madrid', statistic: 'MEDIAN', value, unit: 'EUR_PER_L', currency: 'EUR', taxes: 'INCLUDED',
    aggregation_method: 'UNWEIGHTED_STATION_MEDIAN', distribution: { n: 120, p25: value, p75: value, min: value, max: value, excluded_restricted: 0, excluded_implausible: 0 },
    source_authority: 'CALCULATED', derived_from_authority: 'OFFICIAL_AUTHORITY', source_id: MITECO, source_url: 'https://sedeaplicaciones.minetur.gob.es/x',
    provisional: true, retrieved_at: price_date, raw_ingest_id: uuid(), external_field: 'Precio', adapter_version: '0.1.0', transformation_version: 1,
  });
}

export function pvpcObs(value: number, price_date = '2026-09-24') {
  return EnergyPriceObservation.parse({
    id: uuid(), market_code: 'ES', energy_product: 'ELECTRICITY', price_basis: 'PVPC_ENERGY_TERM', scope_type: 'TARIFF_ZONE', scope_code: 'PENINSULA_CANARIAS_BALEARES',
    price_date, observed_at: `${price_date}T00:00:00`, source_timezone: 'Europe/Madrid', statistic: 'MEAN', value, unit: 'EUR_PER_KWH', currency: 'EUR', taxes: 'EXCLUDED',
    aggregation_method: 'HOURLY_ARITHMETIC_MEAN', distribution: { n: 24, min: value / 2, max: value * 2, excluded_restricted: 0, excluded_implausible: 0 },
    source_authority: 'CALCULATED', derived_from_authority: 'OFFICIAL_AUTHORITY', source_id: ESIOS, source_url: 'https://api.esios.ree.es/archives/70/download_json?locale=es&date=2026-09-24',
    provisional: false, retrieved_at: price_date, raw_ingest_id: uuid(), external_field: 'PCB', adapter_version: '0.1.0', transformation_version: 1,
  });
}

/** Contexto Madrid 2026-09-24 con los precios indicados (omitido = sin referencia). */
export function ctx(p: { petrol?: number; diesel?: number; electricity?: number; fuelDate?: string } = {}): EnergyContext {
  const obs = [
    ...(p.petrol !== undefined ? [fuelObs('PETROL_95_E5', p.petrol, p.fuelDate)] : []),
    ...(p.diesel !== undefined ? [fuelObs('DIESEL_A', p.diesel, p.fuelDate)] : []),
    ...(p.electricity !== undefined ? [pvpcObs(p.electricity)] : []),
  ];
  return resolveEnergyContext({ market: 'ES', region: 'ES-MD', date: '2026-09-24' }, obs);
}

export const ice = (l100: number | [number, number], over: Partial<EconomicVehicleInputIn> = {}): EconomicVehicleInputIn => ({
  id: uuid(),
  market: 'ES',
  powertrainType: 'ICE',
  fuelType: 'petrol',
  fuelConsumptionL100: { min: Array.isArray(l100) ? l100[0] : l100, max: Array.isArray(l100) ? l100[1] : l100, test_cycle: 'WLTP', mapping_confidence: 'EXACT' },
  purchase: { participant: 'NEW' },
  ...over,
});

export const bev = (kwh100: number, basis: 'INCLUDED' | 'EXCLUDED' | 'UNSPECIFIED' = 'EXCLUDED', over: Partial<EconomicVehicleInputIn> = {}): EconomicVehicleInputIn => ({
  id: uuid(),
  market: 'ES',
  powertrainType: 'BEV',
  electricConsumptionKwh100: { min: kwh100, max: kwh100, test_cycle: 'WLTP', mapping_confidence: 'EXACT', charging_loss_basis: basis },
  purchase: { participant: 'NEW' },
  ...over,
});

export const phev = (over: Partial<EconomicVehicleInputIn> = {}): EconomicVehicleInputIn => ({
  id: uuid(),
  market: 'ES',
  powertrainType: 'PHEV',
  fuelType: 'petrol',
  chargeSustainingL100: { min: 5.0, max: 5.0, test_cycle: 'WLTP', mapping_confidence: 'EXACT' },
  electricConsumptionKwh100: { min: 16, max: 16, test_cycle: 'WLTP', mapping_confidence: 'EXACT', charging_loss_basis: 'EXCLUDED' },
  purchase: { participant: 'NEW' },
  ...over,
});

export const warnCodes = (r: { warnings: { code: string }[] }) => r.warnings.map((w) => w.code);
