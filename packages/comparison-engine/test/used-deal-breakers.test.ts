import type { UsedSubjectFacts } from '@vscar/vehicle-schema';
import { describe, expect, it } from 'vitest';
import { evaluateDealBreakers, type ComparisonCandidate } from '../src/index.ts';
import { cand } from './helpers.ts';

/** Step 8a — requisitos de la unidad usada: solo en sujetos USED_INSTANCE; desconocido nunca es PASS; N/A no cuenta. */
const facts = (over: Partial<UsedSubjectFacts> = {}): UsedSubjectFacts => ({
  ageMonths: { state: 'KNOWN', min: 40, max: 40, basis: 'CALCULATED' },
  mileageKm: { state: 'KNOWN', min: 120_000, max: 120_000, basis: 'USER_PROVIDED' },
  batteryHealthPct: { state: 'NOT_APPLICABLE' },
  warrantyRemainingMonths: { state: 'UNKNOWN' },
  ...over,
});
const used = (c: ComparisonCandidate, f: UsedSubjectFacts): ComparisonCandidate => ({
  ...c,
  id: '00000000-0000-4000-8000-0000000e0001',
  subject: { kind: 'USED_INSTANCE', subjectId: '00000000-0000-4000-8000-0000000e0001', referenceVariantId: c.id, usedInstanceId: '00000000-0000-4000-8000-0000000e0001', usedFacts: f },
});
const REQ = { requirements: { maxMileageKm: 80_000, maxAgeYears: 5, minBatteryHealthPct: 80, minWarrantyRemainingMonths: 1 } };

describe('used-unit deal breakers', () => {
  const ice = cand('ICE', [], { powertrainType: 'ICE', seats: 5 });

  it('do not apply to a reference (new) subject', () => {
    expect(evaluateDealBreakers(ice, REQ)).toMatchObject({ status: 'PASS', checks: [] });
  });
  it('max mileage 80,000 vs 120,000 → FAIL; unknown warranty → UNKNOWN; battery N/A on ICE → no check', () => {
    const r = evaluateDealBreakers(used(ice, facts()), REQ);
    expect(r.status).toBe('FAIL');
    expect(r.checks.map((c) => [c.criterion, c.status])).toEqual([
      ['maxMileageKm', 'FAIL'],
      ['maxAgeYears', 'PASS'],
      ['minWarrantyRemainingMonths', 'UNKNOWN'],
    ]);
    expect(r.failedChecks[0]).toMatchObject({ observedValue: { min: 120_000, max: 120_000, unit: 'km' }, message: { messageKey: 'comparison.requirement.fail', params: { criterion: 'maxMileageKm', required: 80_000, unit: 'km' } } });
    expect(r.unknownChecks[0]!.message).toMatchObject({ messageKey: 'comparison.requirement.used_unknown', params: { criterion: 'minWarrantyRemainingMonths', required: 1, unit: 'months' } });
  });
  it('unknown mileage → UNKNOWN (never PASS)', () => {
    const r = evaluateDealBreakers(used(ice, facts({ mileageKm: { state: 'UNKNOWN' } })), { requirements: { maxMileageKm: 80_000 } });
    expect(r).toMatchObject({ status: 'UNKNOWN', unknownChecks: [{ criterion: 'maxMileageKm' }] });
  });
  it('age from a registration-year range that straddles the limit → UNKNOWN (range dependent)', () => {
    const r = evaluateDealBreakers(used(ice, facts({ ageMonths: { state: 'KNOWN', min: 57, max: 69, basis: 'CALCULATED' } })), { requirements: { maxAgeYears: 5 } });
    expect(r.checks[0]).toMatchObject({ status: 'UNKNOWN', observedValue: { min: 4.75, max: 5.75, unit: 'years' }, message: { messageKey: 'comparison.requirement.range_dependent' } });
  });
  it('BEV battery health: known SOH is checked; unknown SOH is UNKNOWN', () => {
    const bev = cand('BEV', [], { powertrainType: 'BEV', seats: 5 });
    expect(evaluateDealBreakers(used(bev, facts({ batteryHealthPct: { state: 'KNOWN', min: 76, max: 76, basis: 'USER_PROVIDED' } })), { requirements: { minBatteryHealthPct: 80 } }).status).toBe('FAIL');
    expect(evaluateDealBreakers(used(bev, facts({ batteryHealthPct: { state: 'UNKNOWN' } })), { requirements: { minBatteryHealthPct: 80 } }).status).toBe('UNKNOWN');
  });
  it('calculated warranty: 0 is a certain FAIL; above the requirement it must be confirmed (UNKNOWN)', () => {
    const calc = (m: number) => facts({ warrantyRemainingMonths: { state: 'KNOWN', min: m, max: m, basis: 'CALCULATED' } });
    expect(evaluateDealBreakers(used(ice, calc(0)), { requirements: { minWarrantyRemainingMonths: 1 } }).status).toBe('FAIL');
    const r = evaluateDealBreakers(used(ice, calc(20)), { requirements: { minWarrantyRemainingMonths: 1 } });
    expect(r.checks[0]).toMatchObject({ status: 'UNKNOWN', message: { messageKey: 'comparison.requirement.calculated_unconfirmed' } });
    const declared = facts({ warrantyRemainingMonths: { state: 'KNOWN', min: 20, max: 20, basis: 'USER_PROVIDED' } });
    expect(evaluateDealBreakers(used(ice, declared), { requirements: { minWarrantyRemainingMonths: 1 } }).status).toBe('PASS');
  });
  it('Step 8b — full service history: FULL → PASS, PARTIAL/NONE → FAIL, unknown → UNKNOWN (never PASS)', () => {
    const req = { requirements: { mustHaveFullServiceHistory: true as const } };
    const sh = (v?: 'FULL' | 'PARTIAL' | 'NONE') => facts({ serviceHistory: v ? { state: 'KNOWN', value: v, basis: 'USER_PROVIDED' } : { state: 'UNKNOWN' } });
    expect(evaluateDealBreakers(used(ice, sh('FULL')), req).checks[0]).toMatchObject({ status: 'PASS', message: { messageKey: 'comparison.requirement.service_history_full', params: { flag: true } } });
    for (const v of ['PARTIAL', 'NONE'] as const) {
      expect(evaluateDealBreakers(used(ice, sh(v)), req).checks[0]).toMatchObject({ status: 'FAIL', message: { messageKey: 'comparison.requirement.service_history_not_full', params: { history: v, flag: true } } });
    }
    expect(evaluateDealBreakers(used(ice, sh()), req).checks[0]).toMatchObject({ status: 'UNKNOWN', message: { messageKey: 'comparison.requirement.used_unknown', params: { flag: true } } });
    // Sin hecho de historial (contrato 8a) = desconocido.
    expect(evaluateDealBreakers(used(ice, facts()), req).status).toBe('UNKNOWN');
    // Nunca aplica a un coche nuevo.
    expect(evaluateDealBreakers(ice, req).checks).toEqual([]);
  });
});
