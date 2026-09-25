import { describe, expect, it } from 'vitest';
import {
  BYD_SEAL_IDS,
  GOLF_2018_IDS,
  GOLF_CURRENT_IDS,
  LEON_EHYBRID_IDS,
  MODEL3_2021_IDS,
  X3_2018_IDS,
  loadCase,
} from '@vscar/fixtures';
import { SpecValue, displayCycle, isValidAt, type DatasetBundle } from '@vscar/vehicle-schema';
import { checkPlausibility, detectConflicts, evaluateEligibility, engineUsability, overallStatus, vehiclePageEligible } from '../src/index.ts';

/** Datos de una variant técnica dentro de un bundle. */
function view(bundle: DatasetBundle, variantId: string, at?: string) {
  const variant = bundle.variants.find((v) => v.id === variantId)!;
  const homologation = bundle.homologations.find((h) => h.id === variant.homologation_id)!;
  return {
    variant,
    homologation,
    values: bundle.spec_values.filter((v) => v.variant_id === variantId),
    prices: bundle.prices.filter((p) => p.variant_id === variantId),
    ...(at ? { at } : {}),
  };
}

describe('Case 1 — Golf 2018: one commercial name, two homologations', () => {
  const bundle = loadCase('golf2018TwoHomologations');

  it('produces two technical ReferenceVariants sharing the commercial group', () => {
    const [a, b] = [GOLF_2018_IDS.rvA, GOLF_2018_IDS.rvB].map((id) => bundle.variants.find((v) => v.id === id)!);
    expect(a!.commercial_group_key).toBe(b!.commercial_group_key);
    expect(a!.homologation_id).not.toBe(b!.homologation_id);
    expect(a!.commercial).toEqual(b!.commercial);
  });

  it('never mixes values between the two homologations', () => {
    const massA = view(bundle, GOLF_2018_IDS.rvA).values.find((v) => v.spec_key === 'dim.mass_kg')!;
    const massB = view(bundle, GOLF_2018_IDS.rvB).values.find((v) => v.spec_key === 'dim.mass_kg')!;
    expect([massA.value, massB.value]).toEqual([1301, 1315]);
  });

  it('keeps the inferred NEDC-correlated cycle distinct from a declared cycle', () => {
    const co2 = view(bundle, GOLF_2018_IDS.rvB).values.filter((v) => v.spec_key === 'emi.co2_combined_gkm');
    const inferred = co2.find((v) => v.test_cycle === 'UNDECLARED')!;
    expect(displayCycle(inferred)).toMatchObject({ cycle: 'NEDC_CORRELATED', declared: false });
    // WLTP 136 y NEDC-correlated 113 no son un conflicto: son ciclos distintos.
    expect(detectConflicts(co2)).toEqual([]);
  });

  it('exists as a historical page even with Economy NOT_AVAILABLE', () => {
    const e = evaluateEligibility(view(bundle, GOLF_2018_IDS.rvA));
    expect(e.Economy.status).toBe('NOT_AVAILABLE');
    expect(e.Economy.missing).toContain('missing nrg.fuel_combined_l100');
    expect(e.Warranty.status).toBe('AVAILABLE');
    expect(vehiclePageEligible(view(bundle, GOLF_2018_IDS.rvA))).toBe(true);
  });
});

describe('Case 2 — BMW X3 2018: homologated ranges are never collapsed', () => {
  const bundle = loadCase('bmwX3Range');
  const input = view(bundle, X3_2018_IDS.variant);

  it('stores the range with value undefined', () => {
    const fuel = input.values.find((v) => v.spec_key === 'nrg.fuel_combined_l100')!;
    expect(fuel.value).toBeUndefined();
    expect([fuel.value_min, fuel.value_max, fuel.range_basis]).toEqual([5.0, 5.4, 'WHEEL_SIZE']);
  });

  it('marks Economy / Range / Eco as PARTIAL because of the ranges (and unknown taxes)', () => {
    const e = evaluateEligibility(input);
    expect(e.Economy.status).toBe('PARTIAL');
    expect(e.Economy.partial_reasons).toEqual(
      expect.arrayContaining(['nrg.fuel_combined_l100: homologated range 5–5.4', 'price: incl_taxes UNKNOWN']),
    );
    expect(e.Range.status).toBe('PARTIAL');
    expect(e.Eco.status).toBe('PARTIAL');
  });

  it('keeps the expired Euro NCAP rating with its status and tested-variant note', () => {
    const [r] = bundle.safety_ratings;
    expect(r).toMatchObject({ rating_status: 'EXPIRED', protocol_version: 'Euro NCAP 2017', tested_year: 2017 });
    expect(r!.tested_variant_note).toBeDefined();
  });

  it('only exists until the 09/2018 homologation change', () => {
    expect(isValidAt(input.homologation, '2018-06-15')).toBe(true);
    expect(isValidAt(input.homologation, '2018-10-01')).toBe(false);
  });
});

describe('Case 3 — BYD SEAL: battery capacity with UNSPECIFIED basis', () => {
  const bundle = loadCase('bydSealBatteryUnspecified');
  const input = view(bundle, BYD_SEAL_IDS.variant);

  it('keeps 82.5 kWh without pretending it is gross or usable', () => {
    const cap = input.values.find((v) => v.spec_key === 'bat.capacity_kwh')!;
    expect(cap.value).toBe(82.5);
    expect(cap.measurement_basis?.battery_capacity_basis).toBe('UNSPECIFIED');
    expect(input.values.some((v) => v.measurement_basis?.battery_capacity_basis === 'USABLE')).toBe(false);
  });

  it('activates Range through the official range, not through the capacity', () => {
    const e = evaluateEligibility(input);
    expect(e.Range.status).not.toBe('NOT_AVAILABLE');
    const used = e.Range.value_ids.map((id) => input.values.find((v) => v.id === id)!.spec_key);
    expect(used).toEqual(['rng.electric_combined_km']);
  });

  it('keeps DC times with different SoC windows apart (not a conflict)', () => {
    const dc = input.values.filter((v) => v.spec_key === 'chg.dc_time_min');
    expect(dc.map((v) => [v.value, v.measurement_basis?.soc_from_pct, v.measurement_basis?.soc_to_pct])).toEqual([
      [37, 10, 80],
      [26, 30, 80],
    ]);
    expect(detectConflicts(dc)).toEqual([]);
  });

  it('detects the internal battery-warranty conflict (250,000 vs 200,000 km)', () => {
    const conflicts = detectConflicts(input.values);
    expect(conflicts.map((c) => c.spec_key)).toEqual(['bat.warranty_km']);
    expect(conflicts[0]!.requires_human_review).toBe(true);
  });
});

describe('Case 4 — SEAT León e-HYBRID: cross-market PHEV data', () => {
  const bundle = loadCase('seatLeonEhybridCrossMarket');
  const input = view(bundle, LEON_EHYBRID_IDS.variant);
  const cs = input.values.find((v) => v.spec_key === 'nrg.fuel_charge_sustaining_l100')!;

  it('keeps source_market DE visible on a variant of market ES', () => {
    expect([cs.source_market, cs.reference_market, cs.homologation_match]).toEqual(['DE', 'ES', 'UNCONFIRMED']);
  });

  it('does not use an UNCONFIRMED cross-market value in calculations', () => {
    expect(engineUsability(cs).usable).toBe(false);
    const e = evaluateEligibility(input);
    expect(e.Economy.status).toBe('NOT_AVAILABLE');
    expect(e.Economy.missing.join(' ')).toContain('homologation_match UNCONFIRMED');
    expect(overallStatus(checkPlausibility(input))).toBe('BLOCK');
  });

  it('with an EXACT homologation match the same value can feed engines', () => {
    const exact = SpecValue.parse({ ...cs, homologation_match: 'EXACT', mapping_confidence: 'CROSS_MARKET_EXACT_HOMOLOGATION' });
    const others = input.values.filter((v) => v.id !== cs.id);
    const e = evaluateEligibility({ ...input, values: [...others, exact] });
    expect(engineUsability(exact).usable).toBe(true);
    expect(e.Economy.status).toBe('PARTIAL'); // rangos + base UNSPECIFIED + impuestos desconocidos
  });

  it('PARTIAL match needs human review before feeding engines', () => {
    const partial = SpecValue.parse({ ...cs, homologation_match: 'PARTIAL' });
    expect(engineUsability(partial).usable).toBe(false);
    expect(engineUsability({ ...partial, status: 'REVIEWED' }).usable).toBe(true);
  });

  it('rejects cross-market reuse of a market element (DGT label)', () => {
    const label = input.values.find((v) => v.spec_key === 'emi.dgt_label_es')!;
    expect(SpecValue.safeParse({ ...label, source_market: 'DE', homologation_match: 'EXACT' }).success).toBe(false);
  });

  it('flags the contradictory gross capacities as a conflict, usable stays separate', () => {
    const conflicts = detectConflicts(input.values).filter((c) => c.spec_key === 'bat.capacity_kwh');
    expect(conflicts).toHaveLength(1);
    expect(conflicts[0]!.value_ids).toHaveLength(2);
    expect(checkPlausibility(input).some((f) => f.rule === 'USABLE_GT_GROSS')).toBe(false);
  });
});

describe('Case 5 — Tesla Model 3 2021: changes within the same year', () => {
  const bundle = loadCase('teslaModel3IntraYear');

  it('resolves the list price valid at a given date', () => {
    const priceAt = (date: string) =>
      bundle.prices.filter((p) => p.variant_id === MODEL3_2021_IDS.srp && isValidAt(p, date)).map((p) => p.amount_minor / 100);
    expect(priceAt('2021-03-01')).toEqual([49_000]);
    expect(priceAt('2021-07-01')).toEqual([45_990]);
    expect(priceAt('2021-11-15')).toEqual([46_990]);
  });

  it('resolves the technical variant on sale at a given date', () => {
    const variantAt = (date: string) =>
      bundle.variants.filter((v) => isValidAt(bundle.homologations.find((h) => h.id === v.homologation_id)!, date)).map((v) => v.id);
    expect(variantAt('2021-06-01')).toEqual([MODEL3_2021_IDS.srp]);
    expect(variantAt('2021-09-01')).toEqual([MODEL3_2021_IDS.srpE6cr]);
    expect(variantAt('2021-12-10')).toEqual([MODEL3_2021_IDS.rwd]);
  });

  it('E6R and E6CR share the commercial group but are separate technical variants', () => {
    const [a, b] = [MODEL3_2021_IDS.srp, MODEL3_2021_IDS.srpE6cr].map((id) => bundle.variants.find((v) => v.id === id)!);
    expect(a!.commercial_group_key).toBe(b!.commercial_group_key);
    expect(a!.homologation_id).not.toBe(b!.homologation_id);
  });

  it('does not activate Charging from secondary-only data', () => {
    const e = evaluateEligibility(view(bundle, MODEL3_2021_IDS.srp));
    expect(e.Charging.status).toBe('NOT_AVAILABLE');
    expect(e.Charging.missing.join(' ')).toContain('SECONDARY_REFERENCE');
    expect(e.Range.status).toBe('AVAILABLE'); // rng 448 km oficial (IDAE, WLTP)
  });

  it('agreeing IDAE and EEA values are not a conflict', () => {
    const cons = bundle.spec_values.filter((v) => v.spec_key === 'nrg.electric_combined_kwh100' && v.variant_id === MODEL3_2021_IDS.srp);
    expect(cons).toHaveLength(2);
    expect(detectConflicts(cons)).toEqual([]);
  });
});

describe('Case 6 — Golf eTSI: official authority vs official manufacturer', () => {
  const bundle = loadCase('golfCurrentOfficialConflict');
  const input = view(bundle, GOLF_CURRENT_IDS.variant);

  it('detects the conflict, keeps both values and requires human review', () => {
    const [conflict, ...rest] = detectConflicts(input.values);
    expect(rest).toEqual([]);
    expect(conflict!.spec_key).toBe('perf.power_max_kw');
    expect(new Set(conflict!.value_ids)).toEqual(new Set([GOLF_CURRENT_IDS.powerVw, GOLF_CURRENT_IDS.powerIdae]));
    expect(conflict!.requires_human_review).toBe(true);
    expect(conflict!.rationale).toContain('official authority and official manufacturer disagree');
  });

  it('EEA combustion power (Ep) lives in perf.power_ice_kw, not in system power', () => {
    const ice = input.values.find((v) => v.spec_key === 'perf.power_ice_kw')!;
    expect(ice.external_field).toBe('Ep (KW)');
    expect(checkPlausibility(input).some((f) => f.rule === 'ICE_POWER_AS_SYSTEM')).toBe(false);
  });

  it('flags provisional EEA data and keeps the length range', () => {
    expect(checkPlausibility(input).some((f) => f.rule === 'PROVISIONAL_VALUE')).toBe(true);
    const e = evaluateEligibility(input);
    expect(e.Size.status).toBe('NOT_AVAILABLE'); // falta anchura/altura/maletero en el fixture
    expect(e.Economy.status).toBe('AVAILABLE');
  });
});
