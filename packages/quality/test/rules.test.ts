import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { loadCase, GOLF_CURRENT_IDS } from '@vscar/fixtures';
import { SpecValue, type Homologation, type ReferenceVariant, type SpecValueInput } from '@vscar/vehicle-schema';
import { checkPlausibility, detectConflicts } from '../src/index.ts';

const golf = loadCase('golfCurrentOfficialConflict');
const variant = golf.variants[0]!;
const homologation = golf.homologations[0]!;
const hybrid: ReferenceVariant = { ...variant, technical: { ...variant.technical, powertrain_type: 'HEV' } };

let n = 0;
const value = (over: Partial<SpecValueInput>): SpecValue =>
  SpecValue.parse({
    id: `00000000-0000-4000-8000-${String(++n).padStart(12, '0')}`,
    variant_id: variant.id,
    spec_key: 'dim.length_mm',
    value: 4000,
    unit: 'mm',
    source_id: golf.sources[0]!.id,
    source_url: 'https://example.org',
    source_market: 'ES',
    reference_market: 'ES',
    source_authority: 'OFFICIAL_MANUFACTURER',
    mapping_confidence: 'EXACT',
    homologation_match: 'NOT_APPLICABLE',
    retrieved_at: '2026-09-24',
    ...over,
  });

const rules = (values: SpecValue[], v: ReferenceVariant = variant, h: Homologation = homologation) =>
  checkPlausibility({ variant: v, homologation: h, values }).map((f) => [f.rule, f.status]);

describe('plausibility rules (never auto-correct)', () => {
  it('min > max → BLOCK', () => {
    expect(rules([value({ value: undefined, value_min: 10, value_max: 5, range_basis: 'TRIM' })])).toContainEqual(['RANGE_MIN_GT_MAX', 'BLOCK']);
  });

  it('usable > gross → BLOCK', () => {
    const cap = (v: number, basis: 'USABLE' | 'GROSS') => value({ spec_key: 'bat.capacity_kwh', unit: 'kWh', value: v, measurement_basis: { battery_capacity_basis: basis } });
    expect(rules([cap(80, 'USABLE'), cap(75, 'GROSS')])).toContainEqual(['USABLE_GT_GROSS', 'BLOCK']);
    expect(rules([cap(70, 'USABLE'), cap(75, 'GROSS')])).not.toContainEqual(['USABLE_GT_GROSS', 'BLOCK']);
  });

  it('combustion power cannot stand in for hybrid system power → BLOCK', () => {
    const p = value({ spec_key: 'perf.power_max_kw', unit: 'kW', value: 132, measurement_basis: { power_basis: 'ICE_ONLY' } });
    expect(rules([p], hybrid)).toContainEqual(['ICE_POWER_AS_SYSTEM', 'BLOCK']);
  });

  it('braked < unbraked towing → WARNING', () => {
    expect(
      rules([
        value({ spec_key: 'cap.towing_braked_kg', unit: 'kg', value: 750, measurement_basis: { towing_gradient_pct: 12 } }),
        value({ spec_key: 'cap.towing_unbraked_kg', unit: 'kg', value: 1600 }),
      ]),
    ).toContainEqual(['TOWING_BRAKED_LT_UNBRAKED', 'WARNING']);
  });

  it('turning "radius" of 11 m → WARNING (probable diameter)', () => {
    expect(rules([value({ spec_key: 'dim.turning_m', unit: 'm', value: 11, measurement_basis: { turning_measure: 'RADIUS' } })])).toContainEqual([
      'TURNING_RADIUS_SUSPECT',
      'WARNING',
    ]);
  });

  it('secondary references are blocked for engines', () => {
    expect(rules([value({ source_authority: 'SECONDARY_REFERENCE' })])).toContainEqual(['NOT_ENGINE_USABLE', 'BLOCK']);
  });
});

describe('Conflict Engine properties', () => {
  const powers = golf.spec_values.filter((v) => v.spec_key === 'perf.power_max_kw');

  it('is independent of input order (symmetry)', () => {
    fc.assert(
      fc.property(fc.shuffledSubarray(golf.spec_values, { minLength: golf.spec_values.length }), (shuffled) => {
        expect(detectConflicts(shuffled)).toEqual(detectConflicts(golf.spec_values));
      }),
    );
  });

  it('never drops values: every conflicting value id comes from the input', () => {
    const [c] = detectConflicts(powers);
    expect(c!.value_ids.sort()).toEqual(powers.map((p) => p.id).sort());
    expect(c!.value_ids).toContain(GOLF_CURRENT_IDS.powerIdae);
  });

  it('values within tolerance never conflict', () => {
    fc.assert(
      fc.property(fc.integer({ min: 50, max: 400 }), fc.double({ min: -0.004, max: 0.004, noNaN: true }), (kw, eps) => {
        const a = value({ spec_key: 'perf.power_max_kw', unit: 'kW', value: kw, measurement_basis: { power_basis: 'SYSTEM' } });
        const b = value({ spec_key: 'perf.power_max_kw', unit: 'kW', value: kw * (1 + eps), measurement_basis: { power_basis: 'SYSTEM' } });
        expect(detectConflicts([a, b])).toEqual([]);
      }),
    );
  });

  it('different measurement bases or non-overlapping periods are not conflicts', () => {
    const system = value({ spec_key: 'perf.power_max_kw', unit: 'kW', value: 150, measurement_basis: { power_basis: 'SYSTEM' } });
    const electric = value({ spec_key: 'perf.power_max_kw', unit: 'kW', value: 80, measurement_basis: { power_basis: 'ELECTRIC_ONLY' } });
    expect(detectConflicts([system, electric])).toEqual([]);
    const early = value({ value: 4000, valid_to: '2020-12-31' });
    const late = value({ value: 4100, valid_from: '2021-01-01' });
    expect(detectConflicts([early, late])).toEqual([]);
  });

  it('a clearly better candidate is proposed without review when only one source is official', () => {
    const official = value({ value: 4282 });
    const secondary = value({ value: 4500, source_authority: 'SECONDARY_REFERENCE', mapping_confidence: 'INFERRED' });
    const [c] = detectConflicts([official, secondary]);
    expect(c!.proposed_value_id).toBe(official.id);
    expect(c!.requires_human_review).toBe(false);
  });
});
