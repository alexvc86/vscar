import type { MeasurementBasis, MeasurementBasisField } from './measurement-basis.ts';
import type { PowertrainType, ReferenceMarket } from './enums.ts';
import type { SpecKey } from './spec-keys.ts';

/**
 * Claves críticas por categoría y powertrain (Catalog v0.2 §8.1) como datos.
 * Cada categoría es una lista de alternativas (OR); cada alternativa es un conjunto (AND) de requisitos.
 */

export type AlphaCategory = 'Economy' | 'Range' | 'Charging' | 'Performance' | 'Size' | 'Practicality' | 'Eco' | 'Warranty';

export type BasisConstraint = Partial<Record<MeasurementBasisField, readonly NonNullable<MeasurementBasis[MeasurementBasisField]>[]>>;

export type Requirement =
  | {
      kind: 'spec';
      key: SpecKey;
      /** Bases aceptadas para cumplir el requisito (p. ej. `battery_capacity_basis: ['USABLE']`). */
      basis?: BasisConstraint;
    }
  | { kind: 'price' }
  | { kind: 'seats' };

export interface Alternative {
  /** Si se indica, la alternativa solo vale en ese mercado. */
  readonly market?: ReferenceMarket;
  readonly all: readonly Requirement[];
}

type Alternatives = readonly Alternative[];

const spec = (key: SpecKey, basis?: BasisConstraint): Requirement => (basis ? { kind: 'spec', key, basis } : { kind: 'spec', key });
const PRICE: Requirement = { kind: 'price' };
const SEATS: Requirement = { kind: 'seats' };
const all = (...reqs: Requirement[]): Alternative => ({ all: reqs });
const inMarket = (market: ReferenceMarket, ...reqs: Requirement[]): Alternative => ({ market, all: reqs });

const performance = (systemOnly: boolean): Alternatives => {
  const power = spec('perf.power_max_kw', { power_basis: systemOnly ? ['SYSTEM'] : ['SYSTEM', 'ICE_ONLY', 'ELECTRIC_ONLY'] });
  return [inMarket('ES', power, spec('perf.accel_0_100_s')), inMarket('US', power, spec('perf.accel_0_60_s'))];
};

/** Eco en ES exige además la etiqueta DGT; en US solo CO₂. */
const eco = (co2: boolean): Alternatives => [
  inMarket('ES', ...(co2 ? [spec('emi.co2_combined_gkm')] : []), spec('emi.dgt_label_es')),
  ...(co2 ? [inMarket('US', spec('emi.co2_combined_gkm'))] : []),
];

const COMMON = {
  Size: [all(spec('dim.length_mm'), spec('dim.width_mm'), spec('dim.height_mm'), spec('cap.boot_l'))],
  Practicality: [all(SEATS, spec('cap.boot_l'))],
  Warranty: [all(spec('war.years'))],
} satisfies Partial<Record<AlphaCategory, Alternatives>>;

const ICE_LIKE: Record<AlphaCategory, Alternatives> = {
  ...COMMON,
  Economy: [all(spec('nrg.fuel_combined_l100'), PRICE)],
  Range: [all(spec('pt.fuel_tank_l'), spec('nrg.fuel_combined_l100'))],
  Charging: [],
  Performance: performance(false),
  Eco: eco(true),
};

const HEV_LIKE: Record<AlphaCategory, Alternatives> = { ...ICE_LIKE, Performance: performance(true) };

const PHEV: Record<AlphaCategory, Alternatives> = {
  ...COMMON,
  Economy: [all(spec('nrg.fuel_charge_sustaining_l100'), spec('nrg.electric_combined_kwh100'), spec('rng.electric_combined_km'), PRICE)],
  Range: [all(spec('rng.electric_combined_km'), spec('pt.fuel_tank_l'), spec('nrg.fuel_charge_sustaining_l100'))],
  Charging: [all(spec('chg.ac_max_kw'))],
  Performance: performance(true),
  Eco: eco(true),
};

const BEV: Record<AlphaCategory, Alternatives> = {
  ...COMMON,
  Economy: [all(spec('nrg.electric_combined_kwh100'), PRICE)],
  Range: [
    all(spec('rng.electric_combined_km')),
    all(spec('bat.capacity_kwh', { battery_capacity_basis: ['USABLE'] }), spec('nrg.electric_combined_kwh100')),
  ],
  Charging: [all(spec('chg.ac_max_kw'), spec('chg.dc_max_kw'))],
  Performance: performance(false),
  Eco: eco(false),
};

export const CATEGORY_REQUIREMENTS: Readonly<Record<PowertrainType, Record<AlphaCategory, Alternatives>>> = {
  ICE: ICE_LIKE,
  MHEV: ICE_LIKE,
  HEV: HEV_LIKE,
  PHEV,
  BEV,
  FCEV: BEV,
  EREV: PHEV,
};

export const ALPHA_CATEGORIES: readonly AlphaCategory[] = ['Economy', 'Range', 'Charging', 'Performance', 'Size', 'Practicality', 'Eco', 'Warranty'];
