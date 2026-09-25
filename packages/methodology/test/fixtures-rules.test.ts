import { describe, expect, it } from 'vitest';
import { BYD_SEAL_IDS, GOLF_2018_IDS, LEON_EHYBRID_IDS, MODEL3_2021_IDS, X3_2018_IDS, GOLF_CURRENT_IDS, loadAllCases } from '@vscar/fixtures';
import type { SpecValue } from '@vscar/vehicle-schema';
import { compareValues, dgtLabel, mapRange, rangeVerdict, scenarioValue, meaningfulForYou } from '../src/index.ts';

/** Valida las reglas de methodology v0.1 contra los seis casos reales de Dataset Core v0.1. */
const all = loadAllCases();
const val = (variantId: string, key: string, pick: (v: SpecValue) => boolean = () => true): SpecValue => {
  const v = all.spec_values.find((x) => x.variant_id === variantId && x.spec_key === key && pick(x));
  if (!v) throw new Error(`fixture value missing: ${key}`);
  return v;
};
const variant = (id: string) => all.variants.find((v) => v.id === id)!;
const homologation = (variantId: string) => all.homologations.find((h) => h.id === variant(variantId).homologation_id)!;

describe('Meaningful Difference on real fixtures', () => {
  it('Golf 2018: NEDC (TAN *33) vs WLTP (TAN *35) CO₂ is NOT_DIRECTLY_COMPARABLE', () => {
    const r = compareValues(val(GOLF_2018_IDS.rvA, 'emi.co2_combined_gkm'), val(GOLF_2018_IDS.rvB, 'emi.co2_combined_gkm', (v) => v.test_cycle === 'WLTP'));
    expect(r).toEqual({ comparable: false, reason: 'NOT_DIRECTLY_COMPARABLE: NEDC vs WLTP' });
  });

  it('Golf 2018: declared NEDC vs inferred NEDC-correlated is not comparable either', () => {
    const inferred = val(GOLF_2018_IDS.rvB, 'emi.co2_combined_gkm', (v) => v.test_cycle === 'UNDECLARED');
    const r = compareValues(val(GOLF_2018_IDS.rvA, 'emi.co2_combined_gkm'), inferred);
    expect(r.comparable).toBe(false);
  });

  it('X3 CO₂ range 132–142 vs Golf 2018 113 (both NEDC): RANGE_DEPENDENT, Golf better', () => {
    const r = compareValues(val(X3_2018_IDS.variant, 'emi.co2_combined_gkm'), val(GOLF_2018_IDS.rvA, 'emi.co2_combined_gkm'));
    expect(r).toMatchObject({ comparable: true, classification: 'RANGE_DEPENDENT', low: 'MEANINGFUL', high: 'CLEAR', delta: [-29, -19], better: 'b' });
  });

  it('BYD SEAL 570 km vs Model 3 448 km (WLTP): CLEAR, BYD better', () => {
    const r = compareValues(val(MODEL3_2021_IDS.srp, 'rng.electric_combined_km'), val(BYD_SEAL_IDS.variant, 'rng.electric_combined_km'));
    expect(r).toMatchObject({ comparable: true, classification: 'CLEAR', better: 'b' });
  });

  it('BYD SEAL 16.6 vs Model 3 14.2 kWh/100 km: MEANINGFUL, Model 3 better', () => {
    const r = compareValues(val(BYD_SEAL_IDS.variant, 'nrg.electric_combined_kwh100'), val(MODEL3_2021_IDS.srp, 'nrg.electric_combined_kwh100', (v) => v.external_field === undefined));
    expect(r).toMatchObject({ comparable: true, classification: 'MEANINGFUL', better: 'b' });
  });

  it('battery capacities with UNSPECIFIED basis are never compared (BYD 82.5 vs Model 3 50)', () => {
    const r = compareValues(val(BYD_SEAL_IDS.variant, 'bat.capacity_kwh'), val(MODEL3_2021_IDS.srp, 'bat.capacity_kwh', (v) => v.source_authority !== 'SECONDARY_REFERENCE'));
    expect(r).toEqual({ comparable: false, reason: 'NOT_DIRECTLY_COMPARABLE: battery_capacity_basis unspecified' });
  });

  it('DC times with different SoC windows are not comparable (BYD 10→80 vs 30→80)', () => {
    const [a, b] = all.spec_values.filter((v) => v.variant_id === BYD_SEAL_IDS.variant && v.spec_key === 'chg.dc_time_min');
    expect(compareValues(a!, b!)).toMatchObject({ comparable: false });
  });

  it('WLTP vs NEDC fuel consumption is not comparable (Golf eTSI vs X3)', () => {
    expect(compareValues(val(GOLF_CURRENT_IDS.variant, 'nrg.fuel_combined_l100'), val(X3_2018_IDS.variant, 'nrg.fuel_combined_l100')).comparable).toBe(false);
  });

  it('Model 3 SR+ 5.6 s vs RWD 6.1 s: SLIGHT', () => {
    expect(compareValues(val(MODEL3_2021_IDS.srp, 'perf.accel_0_100_s'), val(MODEL3_2021_IDS.rwd, 'perf.accel_0_100_s'))).toMatchObject({
      classification: 'SLIGHT',
      better: 'a',
    });
  });

  it('warranty 3 vs 2 years (X3 vs Golf 2018): MEANINGFUL', () => {
    expect(compareValues(val(X3_2018_IDS.variant, 'war.years'), val(GOLF_2018_IDS.rvA, 'war.years'))).toMatchObject({ classification: 'MEANINGFUL', better: 'a' });
  });
});

describe('Meaningful For You on real fixtures', () => {
  const rangeCmp = compareValues(val(MODEL3_2021_IDS.srp, 'rng.electric_combined_km'), val(BYD_SEAL_IDS.variant, 'rng.electric_combined_km'));
  const general = rangeCmp.comparable ? (rangeCmp.classification as 'CLEAR') : 'TIE';

  it('+122 km range stays CLEAR for frequent long trips', () => {
    expect(meaningfulForYou('rng.electric_combined_km', general, { long_trips_per_year: 8 }, { smallest_value: 448 }).for_you).toBe('CLEAR');
  });

  it('+122 km range becomes SLIGHT for 35 km/day with home charging', () => {
    const r = meaningfulForYou('rng.electric_combined_km', general, { daily_km: 35, home_charging: true, long_trips_per_year: 1 }, { smallest_value: 448 });
    expect(r.for_you).toBe('SLIGHT');
    expect(r.applied_rules).toHaveLength(1);
  });
});

describe('DGT label rule v1 reproduces the curated fixtures', () => {
  const rangeOf = (v: SpecValue) => (typeof v.value === 'number' ? { min: v.value, max: v.value } : { min: v.value_min!, max: v.value_max! });

  it('BMW X3 xDrive20d (diesel, EURO_6) → C, as curated', () => {
    const h = homologation(X3_2018_IDS.variant);
    const r = dgtLabel({ homologation_powertrain: h.homologation_powertrain, fuel_type: 'diesel', emissions_standard_family: h.emissions_standard_family });
    expect(r.label).toBe(val(X3_2018_IDS.variant, 'emi.dgt_label_es').value);
    expect(r.rule_version).toBe('dgt-label-v1');
  });

  it('SEAT León e-HYBRID (OVC-HEV, 126–134 km) → 0, as declared by SEAT', () => {
    const h = homologation(LEON_EHYBRID_IDS.variant);
    const r = dgtLabel({ homologation_powertrain: h.homologation_powertrain, fuel_type: 'petrol', emissions_standard_family: h.emissions_standard_family, electric_range_km: rangeOf(val(LEON_EHYBRID_IDS.variant, 'rng.electric_combined_km')) });
    expect(r.label).toBe(val(LEON_EHYBRID_IDS.variant, 'emi.dgt_label_es').value);
  });

  it('Golf eTSI (MHEV homologated NOVC-HEV) → ECO', () => {
    const h = homologation(GOLF_CURRENT_IDS.variant);
    expect(dgtLabel({ homologation_powertrain: h.homologation_powertrain, fuel_type: 'petrol', emissions_standard_family: h.emissions_standard_family }).label).toBe('ECO');
  });

  it('BYD SEAL and Model 3 (BEV) → 0', () => {
    for (const id of [BYD_SEAL_IDS.variant, MODEL3_2021_IDS.srp]) {
      const h = homologation(id);
      expect(dgtLabel({ homologation_powertrain: h.homologation_powertrain, emissions_standard_family: h.emissions_standard_family }).label).toBe('0');
    }
  });

  it('Golf 2018 with unknown emissions standard → no label (never assumed)', () => {
    const h = homologation(GOLF_2018_IDS.rvA);
    const r = dgtLabel({ homologation_powertrain: h.homologation_powertrain, fuel_type: 'petrol', emissions_standard_family: h.emissions_standard_family });
    expect(r.label).toBeUndefined();
    expect(r.reason).toBe('emissions standard unknown');
  });
});

describe('Range rules (D4) on real fixtures', () => {
  const costPer1000Km = (kwh100: number) => kwh100 * 10 * 0.15; // precio ilustrativo del test

  it('León e-HYBRID 15.5–16.3 vs BYD SEAL 16.6 kWh/100 km: stable across the homologated range', () => {
    const leon = val(LEON_EHYBRID_IDS.variant, 'nrg.electric_combined_kwh100');
    const byd = val(BYD_SEAL_IDS.variant, 'nrg.electric_combined_kwh100');
    const r = rangeVerdict(
      [
        { id: 'leon', outcome: mapRange({ min: leon.value_min!, max: leon.value_max! }, costPer1000Km) },
        { id: 'byd', outcome: mapRange({ min: byd.value as number, max: byd.value as number }, costPer1000Km) },
      ],
      true,
    );
    expect(r).toEqual({ verdict: 'RESULT_STABLE_ACROSS_HOMOLOGATED_RANGE', leader: 'leon' });
  });

  it('León charge-sustaining 5.0–5.3 vs Golf eTSI 5.2 L/100 km: depends on configuration', () => {
    const leon = val(LEON_EHYBRID_IDS.variant, 'nrg.fuel_charge_sustaining_l100');
    const golf = val(GOLF_CURRENT_IDS.variant, 'nrg.fuel_combined_l100');
    const r = rangeVerdict(
      [
        { id: 'leon', outcome: { min: leon.value_min!, max: leon.value_max! } },
        { id: 'golf', outcome: { min: golf.value as number, max: golf.value as number } },
      ],
      true,
    );
    expect(r.verdict).toBe('RESULT_DEPENDS_ON_CONFIGURATION');
  });

  it('X3 fuel range: CONSERVATIVE is the unfavourable extreme and BASE needs a rule', () => {
    const x3 = val(X3_2018_IDS.variant, 'nrg.fuel_combined_l100');
    const range = { min: x3.value_min!, max: x3.value_max! };
    expect(scenarioValue(range, 'LOW', false)).toBe(5.0);
    expect(scenarioValue(range, 'CONSERVATIVE', false)).toBe(5.4);
    expect(() => scenarioValue(range, 'BASE', false)).toThrow(/requires a published methodology rule/);
  });
});
