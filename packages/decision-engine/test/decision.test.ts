import { describe, expect, it } from 'vitest';
import { METHODOLOGY_VERSION } from '@vscar/methodology';
import { compareCandidates } from '@vscar/comparison-engine';
import { decide, technicalCapability } from '../src/index.ts';
import { cand, fuelCtx, iceEconomic, run } from './helpers.ts';

const ctx = fuelCtx(1.65);
const ice = (label: string, l100: number, facts: Parameters<typeof cand>[1] = [], over: Parameters<typeof cand>[2] = {}) => {
  const c = cand(label, facts, { powertrainType: 'ICE', seats: 5, ...over });
  c.economic = iceEconomic(c.id, l100, ctx);
  return c;
};
const pf = (r: ReturnType<typeof run>, id: string) => r.practicalFit.find((p) => p.candidateId === id)!;

describe('golden 50 — deal breaker: a FAIL never wins', () => {
  it('7 seats required: A (7) eligible, B (5) FAIL and never Best For You even if better everywhere else', () => {
    const A = ice('A 7-seater', 7.5, [['cap.boot_l', 300], ['perf.accel_0_100_s', 11]], { seats: 7 });
    const B = ice('B 5-seater', 4.5, [['cap.boot_l', 650], ['perf.accel_0_100_s', 6]], { seats: 5 });
    const r = run([A, B], { horizonYears: 5, comparison: { annualKm: 18_000, requirements: { minSeats: 7 } } });
    expect(pf(r, A.id).status).toBe('PASS');
    expect(pf(r, B.id)).toMatchObject({ status: 'FAIL', failed: [{ criterion: 'minSeats' }] });
    expect(pf(r, B.id).score!.min).toBeGreaterThan(pf(r, A.id).score!.max); // score alto, pero FAIL manda
    expect(r.alphaBestForYou).toMatchObject({ status: 'BEST_FOR_YOU', candidateId: A.id });
    expect(r.topContributions[0]).toMatchObject({ component: 'DEAL_BREAKER', text: 'B 5-seater: seats 5 seats does not meet ≥ 7 seats' });
    expect(r.alphaBestForYou.alphaFit.map((x) => x.candidateId)).toEqual([A.id]);
  });

  it('all FAIL → NO_FULL_MATCH, closest candidate is informational only', () => {
    const A = ice('A', 6, [['cap.boot_l', 480]]);
    const B = ice('B', 6, [['cap.boot_l', 300]]);
    const r = run([A, B], { horizonYears: 5, comparison: { annualKm: 18_000, requirements: { minBootL: 500 } } });
    expect(r.alphaBestForYou.status).toBe('NO_FULL_MATCH');
    expect(r.alphaBestForYou.candidateId).toBeUndefined();
    expect(r.alphaBestForYou.closestCandidate).toMatchObject({ candidateId: A.id, note: expect.stringMatching(/not a recommendation/) });
    expect(r.alphaBestForYou.explanation).toMatch(/^None fully meets your requirements\./);
    expect(r.topContributions).toEqual([]);
  });

  it('a mandatory requirement without data → UNCONFIRMED (never PASS); still eligible but flagged for verification', () => {
    const A = ice('A', 6, [['cap.boot_l', 520]]);
    const B = ice('B', 6, [['cap.boot_l', 520], ['cap.towing_braked_kg', 1800]]);
    const r = run([A], { horizonYears: 5, comparison: { requirements: { minTowingKg: 1500 } } });
    expect(pf(r, A.id)).toMatchObject({ status: 'UNCONFIRMED', mandatoryUnknowns: [{ criterion: 'minTowingKg', status: 'UNKNOWN' }] });
    expect(r.alphaBestForYou).toMatchObject({ status: 'BEST_FOR_YOU', requiresVerification: [{ criterion: 'minTowingKg' }] });
    expect(pf(run([B], { horizonYears: 5, comparison: { requirements: { minTowingKg: 1500 } } }), B.id).status).toBe('PASS');
  });

  it('PASS_WITH_COMPROMISES: preferred boot 550 L, vehicle 510 L', () => {
    const A = ice('A', 6, [['cap.boot_l', 510]], { seats: 5 });
    const r = run([A], { horizonYears: 5, comparison: { requirements: { minSeats: 5 } }, desired: { minBootL: 550 } });
    expect(pf(r, A.id)).toMatchObject({ status: 'PASS_WITH_COMPROMISES', compromises: [{ criterion: 'minBootL' }] });
    expect(pf(r, A.id).reasons[0]).toBe('fits your 5-seat requirement, but boot is 40 L below your preferred 550 L');
  });
});

describe('golden 51 — COST priority', () => {
  it('386 €/year lower running cost is material with COST = HIGH; shown as the main reason', () => {
    const A = ice('Car A', 6.1);
    const B = ice('Car B', 4.8);
    const r = run([A, B], { horizonYears: 5, comparison: { annualKm: 18_000 }, priorities: { COST: 'HIGH' } });
    expect(r.alphaBestForYou).toMatchObject({ status: 'BEST_FOR_YOU', candidateId: B.id });
    expect(r.topContributions[0]).toMatchObject({ component: 'COST', metric: 'economic.running_annual', howMuch: '386.10 €', level: 'CLEAR', why: 'priority COST HIGH' });
    expect(r.topContributions[0]!.text).toBe('annual running cost: Car B costs about 386.10 € less per year than Car A (18,000 km/year)');
    // Economic Fit al horizonte del escenario (5 años) y también a 3.
    expect(r.economicFit).toMatchObject({ status: 'LEADER', leaderId: B.id, horizonYears: 5 });
    expect(r.economicFit.reasons[0]).toBe('Economic Fit — 5 years: Car B costs about 1,930.50 € less to run than Car A at 18,000 km/year');
    expect(run([A, B], { horizonYears: 3, comparison: { annualKm: 18_000 } }).economicFit.reasons[0]).toMatch(/3 years: Car B costs about 1,158.30 € less/);
  });
});

describe('golden 52 — SPACE priority', () => {
  it('+100 L boot contributes more with SPACE = HIGH than with SPACE = LOW', () => {
    const A = ice('A', 6, [['cap.boot_l', 500], ['perf.accel_0_100_s', 8]]);
    const B = ice('B', 6, [['cap.boot_l', 400], ['perf.accel_0_100_s', 8]]);
    const gap = (level: 'HIGH' | 'LOW') => {
      const r = run([A, B], { horizonYears: 5, priorities: { SPACE: level } });
      const s = (id: string) => r.alphaBestForYou.alphaFit.find((x) => x.candidateId === id)!.score!.min;
      return { gap: s(A.id) - s(B.id), r };
    };
    const high = gap('HIGH');
    const low = gap('LOW');
    expect(high.gap).toBeGreaterThan(low.gap);
    expect(high.r.alphaBestForYou.candidateId).toBe(A.id);
    const share = (r: ReturnType<typeof run>) => {
      const comps = r.alphaBestForYou.alphaFit.find((x) => x.candidateId === A.id)!.components;
      const W = comps.reduce((s, c) => s + c.weight, 0);
      return comps.find((c) => c.component === 'SPACE')!.weight / W;
    };
    expect(share(high.r)).toBeGreaterThan(share(low.r));
  });
});

describe('golden 53 — PERFORMANCE priority cannot inflate a trivial difference', () => {
  it('0–100 6.8 s vs 7.0 s with PERFORMANCE = HIGH → PRACTICAL_TIE', () => {
    const A = cand('A', [['perf.accel_0_100_s', 6.8]]);
    const B = cand('B', [['perf.accel_0_100_s', 7.0]]);
    const r = run([A, B], { horizonYears: 5, priorities: { PERFORMANCE: 'HIGH' } });
    expect(r.alphaBestForYou).toMatchObject({ status: 'PRACTICAL_TIE', tiedIds: [A.id, B.id].sort() });
    expect(r.topContributions).toEqual([]);
  });
});

describe('Technical Capability', () => {
  it('score comes with categories, contributions and coverage; missing categories are excluded, never zero', () => {
    const A = cand('A', [['cap.boot_l', 500], ['perf.accel_0_100_s', 7], ['rng.electric_combined_km', 450]]);
    const t = technicalCapability(A);
    expect(t.coverage).toBe(0.45); // Performance 15 + Range 15 + Space 15 de 100
    expect(t.categories.find((c) => c.category === 'Efficiency')).toMatchObject({ status: 'NOT_AVAILABLE', effectiveWeight: 0 });
    expect(t.categories.find((c) => c.category === 'Space')).toMatchObject({ status: 'AVAILABLE', utility: { min: 85, max: 85 } });
    const sum = t.categories.reduce((s, c) => s + (c.weightedContribution?.min ?? 0), 0);
    expect(Math.abs(sum - t.score!.min)).toBeLessThan(0.2);
  });

  it('saturating curves: 750 L is not proportionally better than 500 L', () => {
    const u = (l: number) => technicalCapability(cand('X', [['cap.boot_l', l]])).categories.find((c) => c.category === 'Space')!.utility!.min;
    expect(u(500) - u(400)).toBeGreaterThan(u(750) - u(650) + 5);
  });

  it('age, mileage and asking price never change Technical Capability', () => {
    const facts: Parameters<typeof cand>[1] = [['cap.boot_l', 550], ['perf.accel_0_100_s', 8]];
    const a = cand('X3 40,000 km', facts, { id: '00000000-0000-4000-8000-0000000aa001', powertrainType: 'ICE' });
    const b = { ...a, label: 'X3 150,000 km' };
    a.economic = iceEconomic(a.id, 6, ctx, undefined, { purchase: { participant: 'USED', usedAskingPrice: { amount_minor: 3_000_000, currency: 'EUR', status: 'USER_PROVIDED' } } });
    b.economic = iceEconomic(a.id, 6, ctx, undefined, { purchase: { participant: 'USED', usedAskingPrice: { amount_minor: 1_500_000, currency: 'EUR', status: 'USER_PROVIDED' } } });
    expect(technicalCapability(b)).toEqual(technicalCapability(a));
  });

  it('non-WLTP consumption and non-system power receive no utility (warned)', () => {
    const t = technicalCapability(cand('X', [['nrg.fuel_combined_l100', 5.2, { test_cycle: 'NEDC' }], ['perf.power_max_kw', 96, { measurement_basis: { power_basis: 'ICE_ONLY' } }]], { powertrainType: 'HEV' }));
    expect(t.score).toBeUndefined();
    expect(t.warnings).toEqual(expect.arrayContaining([expect.stringMatching(/NEDC cycle/), expect.stringMatching(/power basis ICE_ONLY/)]));
  });

  it('technical leader is separate from economic fit and best-for-you (all three can differ)', () => {
    const A = ice('A fast', 7.5, [['perf.accel_0_100_s', 5], ['cap.boot_l', 450]]);
    const B = ice('B frugal', 4.5, [['perf.accel_0_100_s', 11], ['cap.boot_l', 450]]);
    const r = run([A, B], { horizonYears: 5, comparison: { annualKm: 18_000 }, priorities: { COST: 'HIGH', PERFORMANCE: 'LOW' } });
    expect(r.technicalLeader).toMatchObject({ status: 'LEADER', candidateId: A.id });
    expect(r.economicFit.leaderId).toBe(B.id);
    expect(r.alphaBestForYou.candidateId).toBe(B.id);
    expect(r.technicalLeader.reasons[0]).toMatch(/^Technical Capability: A fast ahead of B frugal mainly because of: 0–100 km\/h/);
  });
});

describe('economic fit edge cases', () => {
  it('running cost unavailable for one vehicle → UNKNOWN, no economic winner', () => {
    const A = ice('A', 6);
    const B = cand('B', [], { powertrainType: 'ICE' });
    B.economic = iceEconomic(B.id, 6, ctx, undefined, { fuelConsumptionL100: undefined });
    const r = run([A, B], { horizonYears: 5 });
    expect(r.economicFit.status).toBe('UNKNOWN');
    expect(r.economicFit.leaderId).toBeUndefined();
  });

  it('ownership is reported as a known-cost view, never as a full TCO', () => {
    const A = ice('A', 6);
    A.economic = iceEconomic(A.id, 6, ctx, undefined, { purchase: { participant: 'NEW', listPrice: { amount_minor: 2_500_000, currency: 'EUR', status: 'KNOWN' } } });
    const r = run([A], { horizonYears: 5 });
    expect(r.economicFit.candidates[0]!.ownership).toMatchObject({ view: 'KNOWN_COST_VIEW', missing: ['MAINTENANCE', 'RESIDUAL'] });
  });
});

describe('reproducibility and invariance', () => {
  it('same input → same result and hash; order of candidates does not matter', () => {
    const A = ice('A', 6.1, [['cap.boot_l', 500]]);
    const B = ice('B', 4.8, [['cap.boot_l', 420]]);
    const C = ice('C', 5.5, [['cap.boot_l', 380]]);
    const s = { horizonYears: 5, comparison: { annualKm: 18_000 }, priorities: { COST: 'HIGH' as const } };
    const r1 = run([A, B, C], s);
    expect(run([C, A, B], s)).toEqual(r1);
    expect(run([structuredClone(A), structuredClone(B), structuredClone(C)], structuredClone(s))).toEqual(r1);
    expect(r1.methodologyVersion).toBe(METHODOLOGY_VERSION);
    expect([r1.engineVersion, r1.decisionRulesVersion]).toEqual(['0.1.0', 'alpha-decision-v1']);
    expect(run([A, B, C], { ...s, priorities: { COST: 'LOW' } }).scenarioHash).not.toBe(r1.scenarioHash);
  });

  it('refuses comparison results that do not cover the candidates (no silent recomputation)', () => {
    const A = ice('A', 6);
    const B = ice('B', 5);
    const C = ice('C', 5);
    expect(() => decide({ candidates: [A, B, C], comparison: compareCandidates([A, B]), scenario: { horizonYears: 5 } })).toThrow(/missing/);
  });

  it('no Preference Fit / Personal Fit / winner fields exist', () => {
    const r = run([ice('A', 6), ice('B', 5)], { horizonYears: 5 });
    expect(JSON.stringify(r)).not.toMatch(/preferenceFit|personalFit|PersonalFit|PreferenceFit|"winner"|overallScore|brandScore|designScore/);
  });
});
