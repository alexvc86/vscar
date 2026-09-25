import type { HomologationPowertrain, MeasurementBasis, SpecValueInput } from '@vscar/vehicle-schema';
import type { HomologationMatchResult } from './match.ts';
import type { EeaNumericField, EeaObservation } from './normalize.ts';

/**
 * Mapeo EEA → SpecKeys v0.2 (DATA_RIGHTS_MATRIX §4.1). `transformation_version` = EEA_MAPPING_VERSION.
 * Cada fila documenta campo externo, transformación, base de medida y regla de ciclo.
 */
export const EEA_MAPPING_VERSION = 2;
/** Versión del adapter (código), distinta de la versión del mapeo de campos. */
export const EEA_ADAPTER_VERSION = '0.2.0';

export interface MappingRule {
  external_field: EeaNumericField;
  spec_key: string;
  unit: string;
  transformation: 'identity' | 'unit_conversion';
  convert?: (x: number) => number;
  /** Powertrains de homologación a los que aplica la regla. */
  applies_to: readonly HomologationPowertrain[];
  measurement_basis?: (hp: HomologationPowertrain, wltp: boolean) => MeasurementBasis;
  cycle: 'NONE' | 'NEDC_FIELD' | 'WLTP_FIELD' | 'FROM_CONTEXT';
  mapping_confidence_cap?: 'INFERRED';
  note?: string;
}

const ICE_LIKE: readonly HomologationPowertrain[] = ['ICE', 'NOVC_HEV', 'OVC_HEV'];
const ELECTRIC: readonly HomologationPowertrain[] = ['BEV', 'OVC_HEV'];

export const EEA_MAPPING: readonly MappingRule[] = [
  { external_field: 'Ewltp (g/km)', spec_key: 'emi.co2_combined_gkm', unit: 'g/km', transformation: 'identity', applies_to: ['ICE', 'NOVC_HEV', 'OVC_HEV', 'BEV'], cycle: 'WLTP_FIELD' },
  {
    external_field: 'Enedc (g/km)',
    spec_key: 'emi.co2_combined_gkm',
    unit: 'g/km',
    transformation: 'identity',
    applies_to: ICE_LIKE,
    cycle: 'NEDC_FIELD',
    note: 'with Ewltp present the NEDC value is NEDC-correlated (inferred, not declared)',
  },
  { external_field: 'M (kg)', spec_key: 'dim.mass_kg', unit: 'kg', transformation: 'identity', applies_to: ['ICE', 'NOVC_HEV', 'OVC_HEV', 'BEV'], cycle: 'NONE', measurement_basis: () => ({ mass_definition: 'EU_RUNNING_ORDER' }) },
  { external_field: 'Mt', spec_key: 'dim.mass_kg', unit: 'kg', transformation: 'identity', applies_to: ['ICE', 'NOVC_HEV', 'OVC_HEV', 'BEV'], cycle: 'NONE', measurement_basis: () => ({ mass_definition: 'WLTP_TEST_MASS' }) },
  { external_field: 'W (mm)', spec_key: 'dim.wheelbase_mm', unit: 'mm', transformation: 'identity', applies_to: ['ICE', 'NOVC_HEV', 'OVC_HEV', 'BEV'], cycle: 'NONE' },
  { external_field: 'Ec (cm3)', spec_key: 'pt.displacement_cc', unit: 'cm³', transformation: 'identity', applies_to: ICE_LIKE, cycle: 'NONE' },
  // "Engine power": nunca potencia de sistema en híbridos.
  { external_field: 'Ep (KW)', spec_key: 'perf.power_max_kw', unit: 'kW', transformation: 'identity', applies_to: ['ICE'], cycle: 'NONE', measurement_basis: () => ({ power_basis: 'ICE_ONLY' }) },
  { external_field: 'Ep (KW)', spec_key: 'perf.power_ice_kw', unit: 'kW', transformation: 'identity', applies_to: ['NOVC_HEV', 'OVC_HEV'], cycle: 'NONE' },
  { external_field: 'Ep (KW)', spec_key: 'perf.power_electric_kw', unit: 'kW', transformation: 'identity', applies_to: ['BEV'], cycle: 'NONE' },
  {
    external_field: 'Z (Wh/km)',
    spec_key: 'nrg.electric_combined_kwh100',
    unit: 'kWh/100 km',
    transformation: 'unit_conversion',
    convert: (whKm) => Math.round(whKm) / 10,
    applies_to: ELECTRIC,
    cycle: 'FROM_CONTEXT',
    measurement_basis: (hp) => ({ consumption_basis: hp === 'BEV' ? 'COMBINED' : 'UNSPECIFIED', charging_loss_basis: 'UNSPECIFIED' }),
  },
  {
    external_field: 'Zr',
    spec_key: 'rng.electric_combined_km',
    unit: 'km',
    transformation: 'identity',
    applies_to: ELECTRIC,
    cycle: 'FROM_CONTEXT',
    // La definición oficial solo dice "Electric range": ni ciclo ni tipo (EAER/AER/combinado) → UNSPECIFIED.
    measurement_basis: () => ({ range_type: 'UNSPECIFIED' }),
    note: 'official definition "Electric range" (no cycle, no range type); unit km per field magnitude — pending explicit confirmation',
  },
  {
    external_field: 'Fc',
    spec_key: 'nrg.fuel_combined_l100',
    unit: 'L/100 km',
    transformation: 'identity',
    applies_to: ['ICE', 'NOVC_HEV'],
    cycle: 'FROM_CONTEXT',
    note: '"Fuel consumption"; basis not stated in the table definition',
  },
  {
    external_field: 'Fc',
    spec_key: 'nrg.phev_weighted_fuel_l100',
    unit: 'L/100 km',
    transformation: 'identity',
    applies_to: ['OVC_HEV'],
    cycle: 'FROM_CONTEXT',
    mapping_confidence_cap: 'INFERRED',
    note: 'assumed weighted PHEV consumption (not stated in the table definition); never used for cost',
  },
];

export interface CandidateTarget {
  variant_id: string;
  reference_market: 'ES' | 'US';
  source_id: string;
  source_url: string;
  retrieved_at: string;
  homologation_powertrain: HomologationPowertrain;
}

type Cycle = { test_cycle: 'NEDC' | 'WLTP' | 'UNDECLARED'; test_cycle_inferred?: 'NEDC_CORRELATED' | 'WLTP'; cycle_evidence?: string };

function cycleFor(rule: MappingRule, hasWltp: boolean): Cycle | undefined {
  switch (rule.cycle) {
    case 'NONE':
      return undefined;
    case 'WLTP_FIELD':
      return { test_cycle: 'WLTP' };
    case 'NEDC_FIELD':
      return hasWltp
        ? { test_cycle: 'UNDECLARED', test_cycle_inferred: 'NEDC_CORRELATED', cycle_evidence: 'EEA: Enedc reported together with Ewltp for the same homologation (NEDC values derived from WLTP)' }
        : { test_cycle: 'NEDC' };
    case 'FROM_CONTEXT':
      return hasWltp
        ? { test_cycle: 'UNDECLARED', test_cycle_inferred: 'WLTP', cycle_evidence: `EEA: ${rule.external_field} has no declared cycle; Ewltp present for the same homologation` }
        : { test_cycle: 'UNDECLARED' };
  }
}

/** Combina las distribuciones de varias observaciones (varias versiones o varias filas). */
function combined(observations: readonly EeaObservation[], field: EeaNumericField): Map<number, number> {
  const out = new Map<number, number>();
  for (const o of observations) for (const [v, n] of o.fields[field] ?? []) out.set(v, (out.get(v) ?? 0) + n);
  return out;
}

/**
 * Genera SpecValues candidatos (DRAFT) para una ReferenceVariant a partir de observaciones emparejadas.
 * Un campo con varios valores produce un rango (nunca un promedio) con la distribución en notas.
 */
export function toCandidateSpecValues(match: HomologationMatchResult, target: CandidateTarget, makeId: (key: string) => string): SpecValueInput[] {
  if (match.level === 'NONE') return [];
  const obs = match.observations;
  const hasWltp = combined(obs, 'Ewltp (g/km)').size > 0;
  const provisional = obs.some((o) => o.status === 'P');
  const sourceMarket = obs[0]!.member_state;
  const registrations = obs.reduce((s, o) => s + o.registrations, 0);
  const idsNote = `EEA ${obs[0]!.year} ${sourceMarket}: TAN ${obs[0]!.type_approval_number} Va ${obs[0]!.variant_code} Ve ${[...new Set(obs.map((o) => o.version_code))].join('|')} (${registrations} registrations)`;

  const out: SpecValueInput[] = [];
  for (const rule of EEA_MAPPING) {
    if (!rule.applies_to.includes(target.homologation_powertrain)) continue;
    const dist = combined(obs, rule.external_field);
    if (dist.size === 0) continue;
    const values = [...dist.keys()].map((x) => (rule.convert ? rule.convert(x) : x)).sort((a, b) => a - b);
    const distribution = [...dist.entries()].sort(([a], [b]) => a - b).map(([v, n]) => `${v}×${n}`).join(', ');
    const cycle = cycleFor(rule, hasWltp);
    const mapping = rule.mapping_confidence_cap && match.mapping_confidence !== 'UNCONFIRMED' ? rule.mapping_confidence_cap : match.mapping_confidence;
    const basis = rule.measurement_basis?.(target.homologation_powertrain, hasWltp);

    out.push({
      id: makeId(`${rule.spec_key}:${rule.external_field}`),
      variant_id: target.variant_id,
      spec_key: rule.spec_key,
      ...(values.length === 1 ? { value: values[0]! } : { value_min: values[0]!, value_max: values[values.length - 1]!, range_basis: 'UNSPECIFIED' as const }),
      unit: rule.unit,
      source_id: target.source_id,
      source_url: target.source_url,
      source_market: sourceMarket,
      reference_market: target.reference_market,
      source_authority: 'OFFICIAL_AUTHORITY',
      mapping_confidence: mapping,
      homologation_match: match.homologation_match,
      retrieved_at: target.retrieved_at,
      ...(cycle ?? {}),
      status: 'DRAFT',
      provisional,
      ...(basis ? { measurement_basis: basis } : {}),
      external_field: rule.external_field,
      transformation: rule.transformation,
      transformation_version: EEA_MAPPING_VERSION,
      notes: [idsNote, `distribution (value×registrations): ${distribution}`, ...(rule.note ? [rule.note] : []), ...match.notes].join(' · '),
    });
  }
  return out;
}

