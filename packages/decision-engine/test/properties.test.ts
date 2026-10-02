import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { UTILITY_CURVES, evaluateUtility } from '@vscar/methodology';
import { fitComponents, technicalCapability } from '../src/index.ts';
import { cand, fuelCtx, iceEconomic, run, type FactSpec } from './helpers.ts';

/** Invariantes del Alpha Decision Engine (fast-check). */
const ctx = fuelCtx(1.65);
const int = (lo: number, hi: number) => fc.integer({ min: lo, max: hi });
const dec = (lo: number, hi: number) => fc.integer({ min: lo * 10, max: hi * 10 }).map((x) => x / 10);
const factsArb: fc.Arbitrary<FactSpec[]> = fc
  .record({ boot: fc.option(int(250, 750)), accel: fc.option(dec(4, 13)), range: fc.option(int(150, 650)) }, { requiredKeys: [] })
  .map((f) => [
    ...(f.boot != null ? ([['cap.boot_l', f.boot]] as FactSpec[]) : []),
    ...(f.accel != null ? ([['perf.accel_0_100_s', f.accel]] as FactSpec[]) : []),
    ...(f.range != null ? ([['rng.electric_combined_km', f.range]] as FactSpec[]) : []),
  ]);
const candArb = fc.tuple(factsArb, int(4, 7), fc.option(dec(3.5, 9))).map(([facts, seats, l100]) => {
  const c = cand('X', facts, { seats, powertrainType: 'BEV' });
  if (l100 != null) c.economic = iceEconomic(c.id, l100, ctx);
  return c;
});
const prio = fc.constantFrom('HIGH' as const, 'MEDIUM' as const, 'LOW' as const);
const scenarioArb = fc.record({
  horizonYears: fc.constantFrom(1, 3, 5, 8),
  comparison: fc.record({ annualKm: fc.constant(18_000), dailyDistanceKm: int(10, 120), homeChargingAvailable: fc.boolean(), longTripsPerYear: int(0, 10), requirements: fc.record({ minSeats: fc.option(int(4, 7), { nil: undefined }) }, { requiredKeys: [] }) }),
  priorities: fc.record({ COST: prio, SPACE: prio, PERFORMANCE: prio }),
});
const strip = <T extends { requirements: { minSeats?: number | undefined } }>(c: T) => ({ ...c, requirements: c.requirements.minSeats === undefined ? {} : { minSeats: c.requirements.minSeats } });

describe('alpha decision invariants (property-based)', () => {
  it('utility curves are monotone (higher-is-better up, lower-is-better down)', () => {
    fc.assert(
      fc.property(fc.constantFrom(...(Object.keys(UTILITY_CURVES) as (keyof typeof UTILITY_CURVES)[])), fc.double({ min: 0, max: 1000, noNaN: true }), fc.double({ min: 0, max: 1000, noNaN: true }), (k, x, y) => {
        const pts = UTILITY_CURVES[k]!.points;
        const increasing = pts[pts.length - 1]![1] >= pts[0]![1];
        const [lo, hi] = x <= y ? [x, y] : [y, x];
        const d = evaluateUtility(UTILITY_CURVES[k]!, hi) - evaluateUtility(UTILITY_CURVES[k]!, lo);
        expect(increasing ? d >= -1e-9 : d <= 1e-9).toBe(true);
      }),
    );
  });

  it('same input → same result; candidate order does not change anything', () => {
    fc.assert(
      fc.property(fc.array(candArb, { minLength: 2, maxLength: 4 }), scenarioArb, (cs, s0) => {
        const s = { ...s0, comparison: strip(s0.comparison) };
        const r = run(cs, s);
        expect(run([...cs].reverse(), s)).toEqual(r);
      }),
      { numRuns: 40 },
    );
  });

  it('candidate-set independence: Technical Capability, Practical Fit and Alpha Fit of A do not change when C is added', () => {
    fc.assert(
      fc.property(candArb, candArb, candArb, scenarioArb, (A, B, C, s0) => {
        const s = { ...s0, comparison: strip(s0.comparison) };
        const two = run([A, B], s);
        const three = run([A, B, C], s);
        const pick = <T extends { candidateId: string }>(xs: T[]) => xs.find((x) => x.candidateId === A.id);
        expect(pick(three.technicalCapability)).toEqual(pick(two.technicalCapability));
        expect(pick(three.practicalFit)).toEqual(pick(two.practicalFit));
        expect(pick(three.alphaBestForYou.alphaFit)).toEqual(pick(two.alphaBestForYou.alphaFit));
        expect(technicalCapability(A)).toEqual(pick(two.technicalCapability));
      }),
      { numRuns: 40 },
    );
  });

  it('a Practical Fit FAIL never wins and UNKNOWN never becomes PASS', () => {
    fc.assert(
      fc.property(fc.array(candArb, { minLength: 2, maxLength: 4 }), scenarioArb, (cs, s0) => {
        const s = { ...s0, comparison: strip(s0.comparison) };
        const r = run(cs, s);
        const failed = new Set(r.practicalFit.filter((p) => p.status === 'FAIL').map((p) => p.candidateId));
        if (r.alphaBestForYou.candidateId) expect(failed.has(r.alphaBestForYou.candidateId)).toBe(false);
        for (const id of r.alphaBestForYou.tiedIds ?? []) expect(failed.has(id)).toBe(false);
        for (const p of r.practicalFit) if (p.mandatoryUnknowns.length) expect(p.status).not.toBe('PASS');
        if (failed.size === cs.length) expect(r.alphaBestForYou.status).toBe('NO_FULL_MATCH');
      }),
      { numRuns: 40 },
    );
  });

  it('raising a priority never reduces the contribution share of its own component', () => {
    fc.assert(
      fc.property(candArb, scenarioArb, fc.constantFrom('COST' as const, 'SPACE' as const, 'PERFORMANCE' as const), (c, s, p) => {
        const share = (level: 'LOW' | 'MEDIUM' | 'HIGH') => {
          const comps = fitComponents(c, { ...s.comparison, requirements: {} }, { ...s.priorities, [p]: level });
          const target = comps.find((x) => x.component === p);
          const W = comps.reduce((sum, x) => sum + x.weight * (x.utility?.min ?? 0), 0);
          return target && W > 0 ? (target.weight * target.utility!.min) / W : 0;
        };
        expect(share('MEDIUM')).toBeGreaterThanOrEqual(share('LOW') - 1e-12);
        expect(share('HIGH')).toBeGreaterThanOrEqual(share('MEDIUM') - 1e-12);
      }),
    );
  });

  it('a trivial difference stays trivial regardless of priority (PRACTICAL_TIE metrics never decide)', () => {
    fc.assert(
      fc.property(dec(5, 11), fc.integer({ min: 0, max: 3 }), prio, (accel, step, level) => {
        const A = cand('A', [['perf.accel_0_100_s', accel]]);
        const B = cand('B', [['perf.accel_0_100_s', Math.round((accel + step / 10) * 10) / 10]]); // ≤ 0.3 s < umbral 0.4 s
        const r = run([A, B], { horizonYears: 5, priorities: { PERFORMANCE: level } });
        expect(r.alphaBestForYou.status).toBe('PRACTICAL_TIE');
      }),
    );
  });
});
