import type { PowertrainType } from './enums.ts';
import type { MeasurementBasis, MeasurementBasisField } from './measurement-basis.ts';

/**
 * SpecKey Catalog v0.2 (docs/data/SPEC_KEY_CATALOG.md §7) como datos.
 * Fuente única para validación, `spec_definitions` en MySQL y reglas de calidad.
 */

export type ProductCategory =
  | 'Economy'
  | 'Range'
  | 'Charging'
  | 'Performance'
  | 'Size'
  | 'Practicality'
  | 'Family'
  | 'City'
  | 'Highway'
  | 'LongTrips'
  | 'Eco'
  | 'Safety'
  | 'Technology'
  | 'Warranty'
  | 'Ownership'
  | 'Used';

export type SpecDataType = 'int' | 'decimal' | 'enum' | 'text' | 'json';

export type CanonicalUnit =
  | 'mm' | 'm' | 'kg' | 'L' | 'kW' | 'N·m' | 's' | 'km/h' | 'km' | 'kWh' | 'g/km'
  | 'L/100 km' | 'kWh/100 km' | 'min' | 'cm³' | 'CVF' | '%' | 'years' | 'months' | 'in' | 'count';

export type Applicability = 'ALL' | readonly PowertrainType[];

export interface SpecKeyDefinition {
  readonly key: string;
  readonly description: string;
  readonly dataType: SpecDataType;
  readonly unit: CanonicalUnit | null;
  readonly powertrains: Applicability;
  readonly higherIsBetter: boolean | null;
  /** `is_critical` para `spec_definitions`; las reglas por categoría/powertrain están en critical-keys.ts. */
  readonly critical: boolean;
  readonly requiredFor: readonly ProductCategory[];
  readonly weight: 'A' | 'B' | 'C';
  /** Exige `test_cycle` en cada valor. */
  readonly cycle: boolean;
  /** Bases de medida obligatorias en cada valor (el valor puede ser `UNSPECIFIED`). */
  readonly basis?: readonly MeasurementBasisField[];
  /** Base implícita en la clave; si el valor declara la base, debe coincidir. */
  readonly fixedBasis?: Readonly<MeasurementBasis>;
  /** Cross-market permitido (con `homologation_match = EXACT`) — D1. */
  readonly crossMarket: boolean;
  readonly enumValues?: readonly string[];
}

const ICE_FAMILY: readonly PowertrainType[] = ['ICE', 'MHEV', 'HEV', 'PHEV'];
const ELEC: readonly PowertrainType[] = ['MHEV', 'HEV', 'PHEV', 'BEV'];
const PLUGIN: readonly PowertrainType[] = ['PHEV', 'BEV'];
const EQUIP = ['standard', 'optional', 'optional_pack', 'not_available', 'unknown'] as const;
const SMARTPHONE = [
  'standard_wireless', 'standard_wired', 'standard_unspecified', 'optional', 'optional_pack', 'not_available', 'unknown',
] as const;

type Def = Omit<SpecKeyDefinition, 'key'>;
const d = (def: Partial<Def> & Pick<Def, 'description' | 'dataType' | 'unit' | 'weight'>): Def => ({
  powertrains: 'ALL',
  higherIsBetter: null,
  critical: false,
  requiredFor: [],
  cycle: false,
  crossMarket: true,
  ...def,
});
const equip = (description: string, weight: 'A' | 'B' | 'C', requiredFor: ProductCategory[], enumValues: readonly string[] = EQUIP): Def =>
  d({ description, dataType: 'enum', unit: null, weight, requiredFor, higherIsBetter: true, crossMarket: false, enumValues });

const DEFINITIONS = {
  // 7.1 Dimensiones y masa
  'dim.length_mm': d({ description: 'Longitud total', dataType: 'int', unit: 'mm', critical: true, requiredFor: ['Size'], weight: 'A' }),
  'dim.width_mm': d({ description: 'Anchura sin retrovisores', dataType: 'int', unit: 'mm', critical: true, requiredFor: ['Size'], weight: 'A' }),
  'dim.width_mirrors_mm': d({ description: 'Anchura con retrovisores', dataType: 'int', unit: 'mm', requiredFor: ['Size'], weight: 'C' }),
  'dim.height_mm': d({ description: 'Altura', dataType: 'int', unit: 'mm', critical: true, requiredFor: ['Size'], weight: 'A' }),
  'dim.wheelbase_mm': d({ description: 'Batalla', dataType: 'int', unit: 'mm', higherIsBetter: true, requiredFor: ['Size'], weight: 'B' }),
  'dim.ground_clearance_mm': d({ description: 'Altura libre', dataType: 'int', unit: 'mm', higherIsBetter: true, requiredFor: ['Size'], weight: 'C' }),
  'dim.turning_m': d({ description: 'Giro (radio o diámetro)', dataType: 'decimal', unit: 'm', higherIsBetter: false, requiredFor: ['City'], weight: 'C', basis: ['turning_measure'] }),
  'dim.mass_kg': d({ description: 'Masa según definición', dataType: 'int', unit: 'kg', higherIsBetter: false, requiredFor: ['Performance', 'Eco'], weight: 'B', basis: ['mass_definition'] }),
  'dim.gross_weight_kg': d({ description: 'Masa máxima autorizada', dataType: 'int', unit: 'kg', requiredFor: ['Practicality'], weight: 'C', fixedBasis: { mass_definition: 'GROSS_VEHICLE' } }),

  // 7.2 Capacidad y practicidad
  'cap.boot_l': d({ description: 'Maletero, asientos en uso', dataType: 'int', unit: 'L', higherIsBetter: true, critical: true, requiredFor: ['Size', 'Practicality'], weight: 'A', basis: ['boot_method'] }),
  'cap.boot_roof_l': d({ description: 'Maletero hasta techo, asientos en uso', dataType: 'int', unit: 'L', higherIsBetter: true, requiredFor: ['Practicality'], weight: 'C', basis: ['boot_method'] }),
  'cap.boot_max_l': d({ description: 'Maletero, asientos abatidos', dataType: 'int', unit: 'L', higherIsBetter: true, requiredFor: ['Practicality'], weight: 'B', basis: ['boot_method'] }),
  'cap.frunk_l': d({ description: 'Maletero delantero', dataType: 'int', unit: 'L', powertrains: ['BEV'], higherIsBetter: true, requiredFor: ['Practicality'], weight: 'C', basis: ['boot_method'] }),
  'cap.payload_kg': d({ description: 'Carga útil', dataType: 'int', unit: 'kg', higherIsBetter: true, requiredFor: ['Practicality'], weight: 'C' }),
  'cap.towing_braked_kg': d({ description: 'Remolque con freno', dataType: 'int', unit: 'kg', higherIsBetter: true, requiredFor: ['Practicality'], weight: 'B', basis: ['towing_gradient_pct'] }),
  'cap.towing_unbraked_kg': d({ description: 'Remolque sin freno', dataType: 'int', unit: 'kg', higherIsBetter: true, requiredFor: ['Practicality'], weight: 'C' }),
  'cap.roof_load_kg': d({ description: 'Carga en techo', dataType: 'int', unit: 'kg', higherIsBetter: true, requiredFor: ['Practicality'], weight: 'C' }),
  'cap.isofix_positions': d({ description: 'Anclajes ISOFIX', dataType: 'int', unit: 'count', higherIsBetter: true, requiredFor: ['Family'], weight: 'B', crossMarket: false }),
  'cap.third_row': d({ description: 'Tercera fila', dataType: 'enum', unit: null, requiredFor: ['Family'], weight: 'B', crossMarket: false, enumValues: ['standard', 'optional', 'not_available', 'unknown'] }),

  // 7.3 Prestaciones
  'perf.power_max_kw': d({ description: 'Potencia máxima', dataType: 'decimal', unit: 'kW', higherIsBetter: true, critical: true, requiredFor: ['Performance'], weight: 'A', basis: ['power_basis'] }),
  'perf.torque_max_nm': d({ description: 'Par máximo', dataType: 'int', unit: 'N·m', higherIsBetter: true, requiredFor: ['Performance'], weight: 'B', basis: ['power_basis'] }),
  'perf.accel_0_100_s': d({ description: '0–100 km/h', dataType: 'decimal', unit: 's', higherIsBetter: false, critical: true, requiredFor: ['Performance'], weight: 'A' }),
  'perf.accel_0_60_s': d({ description: '0–60 mph (solo US)', dataType: 'decimal', unit: 's', higherIsBetter: false, requiredFor: ['Performance'], weight: 'B', crossMarket: false }),
  'perf.top_speed_kmh': d({ description: 'Velocidad máxima', dataType: 'int', unit: 'km/h', higherIsBetter: true, requiredFor: ['Performance'], weight: 'C' }),
  'perf.power_ice_kw': d({ description: 'Potencia del motor térmico', dataType: 'decimal', unit: 'kW', powertrains: ICE_FAMILY, higherIsBetter: true, requiredFor: ['Performance'], weight: 'C', fixedBasis: { power_basis: 'ICE_ONLY' } }),
  'perf.power_electric_kw': d({ description: 'Potencia eléctrica', dataType: 'decimal', unit: 'kW', powertrains: ELEC, higherIsBetter: true, requiredFor: ['Performance'], weight: 'C', fixedBasis: { power_basis: 'ELECTRIC_ONLY' } }),

  // 7.4 Motor térmico
  'pt.displacement_cc': d({ description: 'Cilindrada', dataType: 'int', unit: 'cm³', powertrains: ['ICE', 'HEV', 'PHEV', 'MHEV'], weight: 'C' }),
  'pt.cylinders': d({ description: 'Cilindros', dataType: 'int', unit: 'count', powertrains: ['ICE', 'HEV', 'PHEV', 'MHEV'], weight: 'C' }),
  'pt.fuel_tank_l': d({ description: 'Depósito', dataType: 'decimal', unit: 'L', powertrains: ICE_FAMILY, higherIsBetter: true, critical: true, requiredFor: ['Range'], weight: 'A' }),
  'pt.fiscal_hp_es': d({ description: 'Potencia fiscal (CVF)', dataType: 'decimal', unit: 'CVF', powertrains: ICE_FAMILY, requiredFor: ['Ownership'], weight: 'B', crossMarket: false }),
  'pt.timing_drive': d({ description: 'Distribución', dataType: 'enum', unit: null, powertrains: ICE_FAMILY, requiredFor: ['Ownership'], weight: 'C', enumValues: ['belt', 'chain', 'gear', 'unknown'] }),

  // 7.5 Batería
  'bat.capacity_kwh': d({ description: 'Capacidad de batería de tracción', dataType: 'decimal', unit: 'kWh', powertrains: ELEC, higherIsBetter: true, requiredFor: ['Range', 'Charging'], weight: 'A', basis: ['battery_capacity_basis'] }),
  'bat.chemistry': d({ description: 'Química', dataType: 'enum', unit: null, powertrains: ELEC, weight: 'C', enumValues: ['NMC', 'NCA', 'LFP', 'NIMH', 'LI_ION_UNSPECIFIED', 'other', 'unknown'] }),
  'bat.heat_pump': d({ ...equip('Bomba de calor', 'C', ['Range']), powertrains: PLUGIN }),
  'bat.warranty_years': d({ description: 'Garantía de batería (años)', dataType: 'int', unit: 'years', powertrains: ELEC, higherIsBetter: true, requiredFor: ['Warranty', 'Used'], weight: 'B', crossMarket: false }),
  'bat.warranty_km': d({ description: 'Garantía de batería (km)', dataType: 'int', unit: 'km', powertrains: ELEC, higherIsBetter: true, requiredFor: ['Warranty', 'Used'], weight: 'B', crossMarket: false }),
  'bat.warranty_soh_pct': d({ description: 'SOH mínimo garantizado', dataType: 'int', unit: '%', powertrains: PLUGIN, higherIsBetter: true, requiredFor: ['Warranty', 'Used'], weight: 'C', crossMarket: false }),
  'bat.warranty_conditions': d({ description: 'Condiciones de la garantía de batería', dataType: 'text', unit: null, powertrains: ELEC, requiredFor: ['Warranty', 'Used'], weight: 'C', crossMarket: false }),

  // 7.6 Carga
  'chg.ac_max_kw': d({ description: 'Carga AC máxima', dataType: 'decimal', unit: 'kW', powertrains: PLUGIN, higherIsBetter: true, critical: true, requiredFor: ['Charging'], weight: 'A' }),
  'chg.dc_max_kw': d({ description: 'Carga DC máxima', dataType: 'decimal', unit: 'kW', powertrains: PLUGIN, higherIsBetter: true, critical: true, requiredFor: ['Charging', 'LongTrips'], weight: 'A' }),
  'chg.dc_time_min': d({ description: 'Tiempo de carga DC en una ventana de SoC', dataType: 'int', unit: 'min', powertrains: PLUGIN, higherIsBetter: false, requiredFor: ['Charging', 'LongTrips'], weight: 'A', basis: ['soc_from_pct', 'soc_to_pct'] }),
  'chg.ac_phases': d({ description: 'Fases del cargador AC', dataType: 'int', unit: 'count', powertrains: PLUGIN, higherIsBetter: true, requiredFor: ['Charging'], weight: 'C' }),
  'chg.dc_connector': d({ description: 'Conector DC', dataType: 'enum', unit: null, powertrains: PLUGIN, requiredFor: ['Charging'], weight: 'C', enumValues: ['CCS2', 'CCS1', 'NACS', 'CHAdeMO', 'GBT'] }),
  'chg.charging_curve': d({ description: 'Curva de carga', dataType: 'json', unit: null, powertrains: ['BEV'], requiredFor: ['Charging'], weight: 'C' }),
  'chg.v2l': d({ ...equip('Vehicle-to-load', 'C', ['Technology']), powertrains: PLUGIN }),

  // 7.7 Consumo (todas con ciclo)
  'nrg.fuel_combined_l100': d({ description: 'Consumo combinado', dataType: 'decimal', unit: 'L/100 km', powertrains: ['ICE', 'MHEV', 'HEV'], higherIsBetter: false, critical: true, requiredFor: ['Economy', 'Range', 'Eco'], weight: 'A', cycle: true, fixedBasis: { consumption_basis: 'COMBINED' } }),
  'nrg.fuel_urban_l100': d({ description: 'Consumo urbano (NEDC urban / EPA city)', dataType: 'decimal', unit: 'L/100 km', powertrains: ICE_FAMILY, higherIsBetter: false, requiredFor: ['Economy', 'City'], weight: 'B', cycle: true }),
  'nrg.fuel_extra_urban_l100': d({ description: 'Consumo extraurbano (NEDC extra-urban / EPA hwy)', dataType: 'decimal', unit: 'L/100 km', powertrains: ICE_FAMILY, higherIsBetter: false, requiredFor: ['Economy', 'Highway'], weight: 'B', cycle: true }),
  'nrg.fuel_wltp_low_l100': d({ description: 'WLTP Low', dataType: 'decimal', unit: 'L/100 km', powertrains: ['ICE', 'MHEV', 'HEV'], higherIsBetter: false, requiredFor: ['Economy', 'City'], weight: 'C', cycle: true }),
  'nrg.fuel_wltp_medium_l100': d({ description: 'WLTP Medium', dataType: 'decimal', unit: 'L/100 km', powertrains: ['ICE', 'MHEV', 'HEV'], higherIsBetter: false, requiredFor: ['Economy'], weight: 'C', cycle: true }),
  'nrg.fuel_wltp_high_l100': d({ description: 'WLTP High', dataType: 'decimal', unit: 'L/100 km', powertrains: ['ICE', 'MHEV', 'HEV'], higherIsBetter: false, requiredFor: ['Economy'], weight: 'C', cycle: true }),
  'nrg.fuel_wltp_extra_high_l100': d({ description: 'WLTP Extra High', dataType: 'decimal', unit: 'L/100 km', powertrains: ['ICE', 'MHEV', 'HEV'], higherIsBetter: false, requiredFor: ['Economy', 'Highway'], weight: 'C', cycle: true }),
  'nrg.fuel_charge_sustaining_l100': d({ description: 'Consumo con batería descargada', dataType: 'decimal', unit: 'L/100 km', powertrains: ['PHEV'], higherIsBetter: false, critical: true, requiredFor: ['Economy', 'Range'], weight: 'A', cycle: true, fixedBasis: { consumption_basis: 'CHARGE_SUSTAINING' } }),
  'nrg.phev_weighted_fuel_l100': d({ description: 'Consumo ponderado homologado (nunca para coste)', dataType: 'decimal', unit: 'L/100 km', powertrains: ['PHEV'], higherIsBetter: false, weight: 'C', cycle: true, fixedBasis: { consumption_basis: 'WEIGHTED_PHEV' } }),
  'nrg.electric_combined_kwh100': d({ description: 'Consumo eléctrico', dataType: 'decimal', unit: 'kWh/100 km', powertrains: PLUGIN, higherIsBetter: false, critical: true, requiredFor: ['Economy', 'Range'], weight: 'A', cycle: true, basis: ['consumption_basis', 'charging_loss_basis'] }),
  'nrg.electric_urban_kwh100': d({ description: 'Consumo eléctrico urbano', dataType: 'decimal', unit: 'kWh/100 km', powertrains: PLUGIN, higherIsBetter: false, requiredFor: ['Economy', 'City'], weight: 'B', cycle: true, basis: ['charging_loss_basis'] }),
  'nrg.electric_highway_kwh100': d({ description: 'Consumo eléctrico carretera', dataType: 'decimal', unit: 'kWh/100 km', powertrains: PLUGIN, higherIsBetter: false, requiredFor: ['Economy', 'Highway', 'LongTrips'], weight: 'B', cycle: true, basis: ['charging_loss_basis'] }),

  // 7.8 Autonomía (todas con ciclo)
  'rng.electric_combined_km': d({ description: 'Autonomía eléctrica combinada', dataType: 'int', unit: 'km', powertrains: PLUGIN, higherIsBetter: true, critical: true, requiredFor: ['Range', 'Economy'], weight: 'A', cycle: true, basis: ['range_type'] }),
  'rng.electric_urban_km': d({ description: 'Autonomía eléctrica urbana', dataType: 'int', unit: 'km', powertrains: PLUGIN, higherIsBetter: true, requiredFor: ['Range', 'City'], weight: 'B', cycle: true, basis: ['range_type'] }),
  'rng.electric_highway_km': d({ description: 'Autonomía eléctrica carretera', dataType: 'int', unit: 'km', powertrains: ['BEV'], higherIsBetter: true, requiredFor: ['Range', 'LongTrips'], weight: 'B', cycle: true, basis: ['range_type'] }),
  'rng.phev_total_km': d({ description: 'Autonomía total PHEV', dataType: 'int', unit: 'km', powertrains: ['PHEV'], higherIsBetter: true, requiredFor: ['Range', 'LongTrips'], weight: 'B', cycle: true, fixedBasis: { range_type: 'TOTAL' } }),

  // 7.9 Emisiones
  'emi.co2_combined_gkm': d({ description: 'CO₂ combinado (ponderado en PHEV)', dataType: 'int', unit: 'g/km', higherIsBetter: false, critical: true, requiredFor: ['Eco'], weight: 'A', cycle: true }),
  'emi.co2_charge_sustaining_gkm': d({ description: 'CO₂ con batería descargada', dataType: 'int', unit: 'g/km', powertrains: ['PHEV'], higherIsBetter: false, requiredFor: ['Eco'], weight: 'B', cycle: true, fixedBasis: { consumption_basis: 'CHARGE_SUSTAINING' } }),
  'emi.dgt_label_es': d({ description: 'Etiqueta ambiental DGT', dataType: 'enum', unit: null, critical: true, requiredFor: ['Eco', 'City'], weight: 'A', crossMarket: false, enumValues: ['0', 'ECO', 'C', 'B', 'none'] }),

  // 7.10 Seguridad (vista normalizada de safety_ratings)
  'saf.ncap_stars': d({ description: 'Estrellas NCAP', dataType: 'int', unit: 'count', higherIsBetter: true, requiredFor: ['Safety'], weight: 'A' }),
  'saf.ncap_adult_pct': d({ description: 'Ocupante adulto', dataType: 'int', unit: '%', higherIsBetter: true, requiredFor: ['Safety'], weight: 'B' }),
  'saf.ncap_child_pct': d({ description: 'Ocupante infantil', dataType: 'int', unit: '%', higherIsBetter: true, requiredFor: ['Safety', 'Family'], weight: 'B' }),
  'saf.ncap_vru_pct': d({ description: 'Usuarios vulnerables', dataType: 'int', unit: '%', higherIsBetter: true, requiredFor: ['Safety'], weight: 'C' }),
  'saf.ncap_assist_pct': d({ description: 'Sistemas de asistencia', dataType: 'int', unit: '%', higherIsBetter: true, requiredFor: ['Safety'], weight: 'C' }),
  'saf.airbags_count': d({ description: 'Nº de airbags', dataType: 'int', unit: 'count', higherIsBetter: true, requiredFor: ['Safety'], weight: 'C', crossMarket: false }),

  // 7.11 ADAS (equipamiento de mercado)
  'adas.aeb': equip('Frenada autónoma de emergencia', 'A', ['Safety', 'Technology']),
  'adas.aeb_vru': equip('AEB peatones/ciclistas', 'B', ['Safety', 'Technology']),
  'adas.acc': equip('Crucero adaptativo', 'B', ['Safety', 'Technology']),
  'adas.lane_keep': equip('Mantenimiento de carril', 'B', ['Safety', 'Technology']),
  'adas.blind_spot': equip('Ángulo muerto', 'B', ['Safety', 'Technology']),
  'adas.rear_cross_traffic': equip('Tráfico trasero', 'C', ['Safety', 'Technology']),
  'adas.traffic_sign_recognition': equip('Reconocimiento de señales', 'C', ['Safety', 'Technology']),
  'adas.driver_monitoring': equip('Fatiga/atención', 'C', ['Safety', 'Technology']),
  'adas.surround_camera': equip('Cámara 360°', 'C', ['Safety', 'Technology']),

  // 7.12 Tecnología (equipamiento de mercado)
  'tech.apple_carplay': equip('Apple CarPlay', 'B', ['Technology'], SMARTPHONE),
  'tech.android_auto': equip('Android Auto', 'B', ['Technology'], SMARTPHONE),
  'tech.center_screen_in': d({ description: 'Pantalla central', dataType: 'decimal', unit: 'in', higherIsBetter: true, requiredFor: ['Technology'], weight: 'C', crossMarket: false }),
  'tech.digital_cluster': equip('Cuadro digital', 'C', ['Technology']),
  'tech.connected_services': equip('Servicios conectados', 'C', ['Technology']),
  'tech.ota_updates': equip('Actualizaciones OTA', 'C', ['Technology']),

  // 7.13 Garantía original (de mercado)
  'war.years': d({ description: 'Garantía general (años)', dataType: 'int', unit: 'years', higherIsBetter: true, critical: true, requiredFor: ['Warranty', 'Used'], weight: 'A', crossMarket: false }),
  'war.km': d({ description: 'Garantía general (km)', dataType: 'int', unit: 'km', higherIsBetter: true, requiredFor: ['Warranty', 'Used'], weight: 'B', crossMarket: false }),
  'war.conditions': d({ description: 'Condiciones de la garantía', dataType: 'text', unit: null, requiredFor: ['Warranty'], weight: 'C', crossMarket: false }),

  // 7.14 Mantenimiento de referencia (de mercado)
  'mnt.service_interval_km': d({ description: 'Intervalo de mantenimiento', dataType: 'int', unit: 'km', weight: 'C', crossMarket: false }),
  'mnt.service_interval_months': d({ description: 'Intervalo de mantenimiento', dataType: 'int', unit: 'months', weight: 'C', crossMarket: false }),
} as const satisfies Record<string, Def>;

export type SpecKey = keyof typeof DEFINITIONS;

export const SPEC_KEYS = Object.keys(DEFINITIONS) as SpecKey[];

export const SPEC_KEY_DEFINITIONS: ReadonlyMap<SpecKey, SpecKeyDefinition> = new Map(
  SPEC_KEYS.map((key) => [key, { key, ...DEFINITIONS[key] } as SpecKeyDefinition]),
);

export function getSpecKeyDefinition(key: string): SpecKeyDefinition | undefined {
  return SPEC_KEY_DEFINITIONS.get(key as SpecKey);
}

export function isSpecKey(key: string): key is SpecKey {
  return SPEC_KEY_DEFINITIONS.has(key as SpecKey);
}

export function appliesTo(def: SpecKeyDefinition, powertrain: PowertrainType): boolean {
  return def.powertrains === 'ALL' || def.powertrains.includes(powertrain);
}
