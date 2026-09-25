import { checkPlausibility, detectConflicts, engineUsability, valueStatus } from '@vscar/quality';
import { isValidAt, type DatasetBundle, type MappingConfidence, type SourceAuthority, type SpecValue, type UsedVehicleInstance } from '@vscar/vehicle-schema';
import type { ElectricQuantity, EconomicVehicleInputIn, MoneyInput, Quantity } from './contracts.ts';

/**
 * Construye `EconomicVehicleInput` desde el dataset curado con las MISMAS reglas que el resto del sistema
 * (`@vscar/quality`): solo valores usables por engines, válidos en la fecha, sin BLOCK de plausibilidad y
 * sin conflicto pendiente de revisión humana. Lo excluido se declara en `exclusions` (nunca se usa en silencio).
 */
const MAPPING_RANK: Record<MappingConfidence, number> = {
  EXACT: 0,
  CROSS_MARKET_EXACT_HOMOLOGATION: 1,
  TRIM_LEVEL: 2,
  POWERTRAIN_LEVEL: 3,
  GENERATION_LEVEL: 4,
  INFERRED: 5,
  UNCONFIRMED: 9,
};
const AUTHORITY_RANK: Partial<Record<SourceAuthority, number>> = { OFFICIAL_AUTHORITY: 0, OFFICIAL_MANUFACTURER: 1, VERIFIED_EDITORIAL: 2 };

export interface BuildInputOptions {
  /** Fecha de referencia (validez de valores y precios). */
  at?: string;
  participant?: 'NEW' | 'USED';
  /** Unidad usada (datos USER_PROVIDED). Nunca sustituye specs técnicas. */
  usedInstance?: UsedVehicleInstance;
}

export function economicVehicleInputFromBundle(bundle: DatasetBundle, variantId: string, opts: BuildInputOptions = {}): EconomicVehicleInputIn {
  const variant = bundle.variants.find((v) => v.id === variantId);
  if (!variant) throw new Error(`variant ${variantId} not in bundle`);
  const homologation = bundle.homologations.find((h) => h.id === variant.homologation_id)!;
  const values = bundle.spec_values.filter((v) => v.variant_id === variantId);
  const findings = checkPlausibility({ variant, homologation, values });
  const conflicted = new Set(detectConflicts(values).flatMap((c) => c.value_ids));
  const exclusions: string[] = [];

  const pick = (key: string): SpecValue | undefined => {
    const candidates = values.filter((v) => v.spec_key === key && isValidAt(v, opts.at));
    const usable = candidates.filter((v) => engineUsability(v).usable && valueStatus(findings, v.id) !== 'BLOCK');
    for (const v of candidates.filter((c) => !usable.includes(c))) {
      const reasons = [...engineUsability(v).reasons, ...(valueStatus(findings, v.id) === 'BLOCK' ? ['plausibility BLOCK'] : [])];
      exclusions.push(`${key} ${v.value ?? `${v.value_min}–${v.value_max}`} (${v.source_market}) not used: ${reasons.join('; ')}`);
    }
    const clean = usable.filter((v) => !conflicted.has(v.id));
    if (usable.length > 0 && clean.length === 0) exclusions.push(`${key}: values in unresolved conflict (human review) are not used automatically`);
    return [...clean].sort(
      (a, b) =>
        MAPPING_RANK[a.mapping_confidence] - MAPPING_RANK[b.mapping_confidence] ||
        (AUTHORITY_RANK[a.source_authority] ?? 5) - (AUTHORITY_RANK[b.source_authority] ?? 5) ||
        a.id.localeCompare(b.id),
    )[0];
  };
  const quantity = (v: SpecValue | undefined): Quantity | undefined => {
    if (!v) return undefined;
    const min = typeof v.value === 'number' ? v.value : v.value_min;
    const max = typeof v.value === 'number' ? v.value : v.value_max;
    if (min === undefined || max === undefined) return undefined;
    return {
      min,
      max,
      value_id: v.id,
      source_id: v.source_id,
      source_authority: v.source_authority,
      mapping_confidence: v.mapping_confidence,
      ...(v.test_cycle ? { test_cycle: v.test_cycle } : {}),
      ...(v.test_cycle_inferred ? { test_cycle_inferred: v.test_cycle_inferred } : {}),
    };
  };

  const pt = variant.technical.powertrain_type;
  const fuel = pt === 'ICE' || pt === 'MHEV' || pt === 'HEV' ? quantity(pick('nrg.fuel_combined_l100')) : undefined;
  const cs = pt === 'PHEV' ? quantity(pick('nrg.fuel_charge_sustaining_l100')) : undefined;
  const elecValue = pt === 'PHEV' || pt === 'BEV' ? pick('nrg.electric_combined_kwh100') : undefined;
  const elecQ = quantity(elecValue);
  const electric: ElectricQuantity | undefined = elecQ ? { ...elecQ, charging_loss_basis: elecValue!.measurement_basis?.charging_loss_basis ?? 'UNSPECIFIED' } : undefined;
  if (pt === 'PHEV' && values.some((v) => v.spec_key === 'nrg.phev_weighted_fuel_l100')) {
    exclusions.push('nrg.phev_weighted_fuel_l100: WLTP weighted consumption is never used for cost');
  }

  const participant = opts.participant ?? (opts.usedInstance ? 'USED' : 'NEW');
  const listOf = (type: 'current_new' | 'original_list') =>
    bundle.prices.find((p) => p.variant_id === variantId && p.price_type === type && p.price_basis === 'LIST' && isValidAt(p, opts.at) && p.source_authority !== 'SECONDARY_REFERENCE');
  const list = participant === 'NEW' ? listOf('current_new') ?? listOf('original_list') : listOf('original_list') ?? listOf('current_new');
  const listPrice: MoneyInput | undefined = list
    ? { amount_minor: list.amount_minor, currency: 'EUR', status: 'KNOWN', source_id: list.source_id, record_id: list.id, incl_taxes: list.incl_taxes, label: `${list.price_type} list price` }
    : undefined;
  const u = opts.usedInstance;
  const usedAskingPrice: MoneyInput | undefined =
    u?.asking_price_minor !== undefined ? { amount_minor: u.asking_price_minor, currency: 'EUR', status: 'USER_PROVIDED', label: 'used asking price' } : undefined;

  return {
    id: variant.id,
    market: 'ES',
    powertrainType: pt,
    ...(variant.technical.fuel_type ? { fuelType: variant.technical.fuel_type } : {}),
    ...(fuel ? { fuelConsumptionL100: fuel } : {}),
    ...(cs ? { chargeSustainingL100: cs } : {}),
    ...(electric ? { electricConsumptionKwh100: electric } : {}),
    purchase: { participant, ...(listPrice ? { listPrice } : {}), ...(usedAskingPrice ? { usedAskingPrice } : {}) },
    residualEstimates: [],
    exclusions,
  };
}
