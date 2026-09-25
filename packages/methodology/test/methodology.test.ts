import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { SPEC_KEY_DEFINITIONS, UsedVehicleInstance, isSpecKey, type SpecKey, type UsedVehicleInstanceInput } from '@vscar/vehicle-schema';
import {
  DIFFERENCE_THRESHOLDS,
  METHODOLOGY_CONFIG,
  METHODOLOGY_VERSION,
  SENSITIVITY_RANGES,
  USAGE_PRESETS,
  UTILITY_CURVES,
  evaluateUtility,
  meaningfulForYou,
  methodologyFingerprint,
  recommendationConfidenceLevel,
  usedInformationConfidence,
} from '../src/index.ts';

describe('methodology config integrity', () => {
  it('references only existing numeric SpecKeys', () => {
    for (const key of [...Object.keys(UTILITY_CURVES), ...Object.keys(DIFFERENCE_THRESHOLDS).filter((k) => k !== 'price_eur')]) {
      expect(isSpecKey(key), key).toBe(true);
      expect(['int', 'decimal']).toContain(SPEC_KEY_DEFINITIONS.get(key as SpecKey)!.dataType);
    }
  });

  it('thresholds are ordered tie < meaningful < clear', () => {
    for (const [key, th] of Object.entries(DIFFERENCE_THRESHOLDS)) {
      expect(th!.abs[0] < th!.abs[1] && th!.abs[1] < th!.abs[2], key).toBe(true);
    }
  });

  it('has a version and a stable fingerprint that changes with the config', () => {
    expect(METHODOLOGY_VERSION).toBe('2026.3');
    expect(methodologyFingerprint()).toBe(methodologyFingerprint(JSON.parse(JSON.stringify(METHODOLOGY_CONFIG))));
    expect(methodologyFingerprint({ ...METHODOLOGY_CONFIG, version: '2026.4' })).not.toBe(methodologyFingerprint());
  });

  it('presets and sensitivity ranges exist for both reference markets', () => {
    expect(USAGE_PRESETS.ES.map((p) => p.id)).toEqual(['city_driver', 'commuter', 'family_travel', 'high_mileage']);
    expect(USAGE_PRESETS.US.every((p) => p.distance_unit === 'mi')).toBe(true);
    for (const r of Object.values(SENSITIVITY_RANGES.ES)) expect(r.min).toBeLessThan(r.max);
  });

  it('confidence levels: number is secondary, levels are HIGH/MEDIUM/LOW', () => {
    expect([90, 70, 40].map(recommendationConfidenceLevel)).toEqual(['HIGH', 'MEDIUM', 'LOW']);
  });
});

describe('utility curves', () => {
  it('match the plan examples', () => {
    const accel = UTILITY_CURVES['perf.accel_0_100_s']!;
    expect(Math.abs(evaluateUtility(accel, 6.8) - evaluateUtility(accel, 7.0))).toBeLessThanOrEqual(3);
    const cargo = UTILITY_CURVES['cap.boot_l']!;
    expect(evaluateUtility(cargo, 400)).toBeCloseTo(64, 0);
    expect(evaluateUtility(cargo, 500)).toBeCloseTo(85, 0);
  });

  it('stay within [0,100] and follow higher_is_better monotonically', () => {
    for (const [key, curve] of Object.entries(UTILITY_CURVES)) {
      const hib = SPEC_KEY_DEFINITIONS.get(key as SpecKey)!.higherIsBetter;
      fc.assert(
        fc.property(fc.double({ min: -1_000, max: 2_000, noNaN: true }), fc.double({ min: -1_000, max: 2_000, noNaN: true }), (x, y) => {
          const [a, b] = x <= y ? [x, y] : [y, x];
          const ua = evaluateUtility(curve!, a);
          const ub = evaluateUtility(curve!, b);
          expect(ua).toBeGreaterThanOrEqual(0);
          expect(ua).toBeLessThanOrEqual(100);
          if (hib === true) expect(ub).toBeGreaterThanOrEqual(ua - 1e-9);
          if (hib === false) expect(ub).toBeLessThanOrEqual(ua + 1e-9);
        }),
        { numRuns: 200 },
      );
    }
  });
});

describe('Meaningful For You', () => {
  it('never turns a numeric TIE into a difference', () => {
    expect(meaningfulForYou('cap.boot_l', 'TIE', { family_size: 6 }).for_you).toBe('TIE');
  });

  it('upgrades cargo for large families and downgrades performance when it is not a priority', () => {
    expect(meaningfulForYou('cap.boot_l', 'MEANINGFUL', { family_size: 4 }).for_you).toBe('CLEAR');
    expect(meaningfulForYou('perf.accel_0_100_s', 'MEANINGFUL', { priorities: { performance: 'low' } }).for_you).toBe('SLIGHT');
  });
});

describe('Used Information Confidence (information, not reliability)', () => {
  const base = (over: Partial<UsedVehicleInstanceInput> = {}) =>
    UsedVehicleInstance.parse({
      id: '00000000-0000-4000-8000-000000000001',
      reference_variant_id: '00000000-0000-4000-8000-000000000002',
      asking_price_minor: 2_150_000,
      currency: 'EUR',
      mileage_km: 94_000,
      registration_year: 2019,
      service_history: 'full',
      accident_history: 'none_declared',
      owners: 2,
      warranty_remaining_months: 0,
      inspection_status: 'valid',
      condition: 'good',
      ...over,
    });

  it('a fully described unit is HIGH even with high mileage', () => {
    expect(usedInformationConfidence(base({ mileage_km: 210_000 }), { powertrain: 'ICE', age_years: 7 }).level).toBe('HIGH');
  });

  it('the mileage value never changes the confidence; knowing it does', () => {
    const ctx = { powertrain: 'ICE' as const, age_years: 7 };
    const a = usedInformationConfidence(base({ mileage_km: 20_000 }), ctx);
    const b = usedInformationConfidence(base({ mileage_km: 250_000 }), ctx);
    expect(a).toEqual(b);
    expect(usedInformationConfidence(base({ mileage_km: undefined }), ctx).level).toBe('LOW');
  });

  it('decision relevance: unknown owners matters less than unknown service history', () => {
    const ctx = { powertrain: 'ICE' as const, age_years: 7 };
    const noOwners = usedInformationConfidence(base({ owners: 'unknown' }), ctx).score;
    const noService = usedInformationConfidence(base({ service_history: 'unknown' }), ctx).score;
    expect(noOwners).toBeGreaterThan(noService);
  });

  it('battery health matters for a used EV, not for an ICE', () => {
    const ev = usedInformationConfidence(base(), { powertrain: 'BEV', age_years: 5 });
    const ice = usedInformationConfidence(base(), { powertrain: 'ICE', age_years: 5 });
    expect(ev.missing).toContain('battery_health');
    expect(ice.missing).not.toContain('battery_health');
    expect(ev.score).toBeLessThan(ice.score);
  });

  it('property: more known fields never lower the confidence (unknown → known)', () => {
    const fields = ['service_history', 'accident_history', 'owners', 'warranty_remaining_months', 'inspection_status', 'condition', 'battery_health_pct'] as const;
    const knownValue: Record<(typeof fields)[number], unknown> = {
      service_history: 'partial',
      accident_history: 'declared',
      owners: 3,
      warranty_remaining_months: 6,
      inspection_status: 'expired',
      condition: 'fair',
      battery_health_pct: 88,
    };
    fc.assert(
      fc.property(fc.subarray([...fields]), fc.constantFrom(...fields), fc.constantFrom('ICE', 'HEV', 'PHEV', 'BEV'), (knownSet, extra, powertrain) => {
        const make = (ks: readonly string[]) =>
          base(Object.fromEntries(fields.map((f) => [f, ks.includes(f) ? knownValue[f] : 'unknown'])) as Partial<UsedVehicleInstanceInput>);
        const ctx = { powertrain: powertrain as 'ICE', age_years: 6 };
        const before = usedInformationConfidence(make(knownSet), ctx);
        const after = usedInformationConfidence(make([...knownSet, extra]), ctx);
        expect(after.score).toBeGreaterThanOrEqual(before.score);
        expect(after.information_completeness).toBeGreaterThanOrEqual(before.information_completeness);
      }),
    );
  });
});
