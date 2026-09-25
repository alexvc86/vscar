import type { ReferenceMarket } from '@vscar/vehicle-schema';

/** Scenario Presets (Catalog v0.2 §19.1 del plan). Distancias en km para ES, en millas para US. */
export interface UsagePreset {
  id: 'city_driver' | 'commuter' | 'family_travel' | 'high_mileage';
  annual_distance: number;
  distance_unit: 'km' | 'mi';
  city_pct: number;
  highway_pct: number;
  long_trips_per_year?: number;
  note?: string;
}

export interface PurchasePreset {
  id: 'used_car_buyer';
  purchase_type: 'used';
  ownership_years: number;
  asking_price_required: true;
  mileage_required: true;
  suggested_deal_breakers: readonly string[];
}

const KM_PER_MI = 1.609344;
const toMiles = (km: number) => Math.round(km / KM_PER_MI / 500) * 500;

const ES_USAGE: readonly UsagePreset[] = [
  { id: 'city_driver', annual_distance: 15_000, distance_unit: 'km', city_pct: 80, highway_pct: 20, note: 'trayectos cortos, carga en casa si EV' },
  { id: 'commuter', annual_distance: 25_000, distance_unit: 'km', city_pct: 40, highway_pct: 60, note: 'diario autovía' },
  { id: 'family_travel', annual_distance: 20_000, distance_unit: 'km', city_pct: 50, highway_pct: 50, long_trips_per_year: 5, note: '4–6 viajes largos/año (≥ 400 km)' },
  { id: 'high_mileage', annual_distance: 40_000, distance_unit: 'km', city_pct: 25, highway_pct: 75 },
];

export const USAGE_PRESETS: Readonly<Record<ReferenceMarket, readonly UsagePreset[]>> = {
  ES: ES_USAGE,
  US: ES_USAGE.map((p) => ({ ...p, annual_distance: toMiles(p.annual_distance), distance_unit: 'mi' as const })),
};

export const PURCHASE_PRESETS: readonly PurchasePreset[] = [
  {
    id: 'used_car_buyer',
    purchase_type: 'used',
    ownership_years: 5,
    asking_price_required: true,
    mileage_required: true,
    suggested_deal_breakers: ['maximum_age', 'maximum_mileage', 'full_service_history_required', 'minimum_battery_health'],
  },
];

/** Rangos plausibles para Sensitivity Analysis (Plan §13.5): límites de búsqueda del punto de cambio. */
export interface PlausibleRange {
  min: number;
  max: number;
  unit: string;
}

export const SENSITIVITY_RANGES: Readonly<Record<ReferenceMarket, Readonly<Record<string, PlausibleRange>>>> = {
  ES: {
    annual_distance: { min: 5_000, max: 60_000, unit: 'km' },
    city_pct: { min: 0, max: 100, unit: '%' },
    fuel_price: { min: 1.0, max: 2.5, unit: 'EUR/L' },
    electricity_home_price: { min: 0.05, max: 0.45, unit: 'EUR/kWh' },
    electricity_public_ac_price: { min: 0.2, max: 0.7, unit: 'EUR/kWh' },
    electricity_public_dc_price: { min: 0.3, max: 0.9, unit: 'EUR/kWh' },
    home_charging_share: { min: 0, max: 1, unit: 'ratio' },
    ownership_years: { min: 1, max: 12, unit: 'years' },
    annual_maintenance_used: { min: 200, max: 2_500, unit: 'EUR' },
  },
  US: {
    annual_distance: { min: 3_000, max: 40_000, unit: 'mi' },
    city_pct: { min: 0, max: 100, unit: '%' },
    fuel_price: { min: 2.5, max: 6.5, unit: 'USD/gal' },
    electricity_home_price: { min: 0.08, max: 0.5, unit: 'USD/kWh' },
    electricity_public_ac_price: { min: 0.2, max: 0.6, unit: 'USD/kWh' },
    electricity_public_dc_price: { min: 0.3, max: 0.8, unit: 'USD/kWh' },
    home_charging_share: { min: 0, max: 1, unit: 'ratio' },
    ownership_years: { min: 1, max: 12, unit: 'years' },
    annual_maintenance_used: { min: 200, max: 3_000, unit: 'USD' },
  },
};
