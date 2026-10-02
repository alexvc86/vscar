import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { compareCandidates, type ComparisonResult } from '@vscar/comparison-engine';
import { recommend, resultRobustness, type DecisionScenarioIn } from '../src/index.ts';
import { cand, fuelCtx, iceEconomic, type FactSpec } from './helpers.ts';

/** Invariantes de Step 6c (fast-check). */
const ctx = fuelCtx(1.65);
const int = (lo: number, hi: number) => fc.integer({ min: lo, max: hi });
const candArb = fc
  .tuple(fc.option(int(250, 700)), fc.option(fc.integer({ min: 50, max: 120 }).map((x) => x / 10)), int(4, 7), fc.option(fc.integer({ min: 40, max: 90 }).map((x) => x / 10)), fc.boolean())
  .map(([boot, accel, seats, l100, nedc]) => {
    const facts: FactSpec[] = [...(boot != null ? ([['cap.boot_l', boot]] as FactSpec[]) : []), ...(accel != null ? ([['perf.accel_0_100_s', accel]] as FactSpec[]) : [])];
    const c = cand('X', facts, { seats, powertrainType: 'ICE' });
    if (l100 != null) c.economic = iceEconomic(c.id, l100, ctx, undefined, nedc ? { fuelConsumptionL100: { min: l100, max: l100, test_cycle: 'NEDC', mapping_confidence: 'EXACT' } } : {});
    return c;
  });
const prio = fc.constantFrom('HIGH' as const, 'MEDIUM' as const, 'LOW' as const);
const scenarioArb = fc.record({
  horizonYears: fc.constant(5),
  comparison: fc.record({ annualKm: fc.constant(18_000), requirements: fc.record({ minSeats: fc.option(int(4, 7), { nil: undefined }), minBootL: fc.option(int(300, 600), { nil: undefined }) }, { requiredKeys: [] }) }),
  priorities: fc.record({ COST: prio, SPACE: prio, PERFORMANCE: prio }),
});
const clean = (s: { comparison: { requirements: Record<string, number | undefined> } } & Record<string, unknown>): DecisionScenarioIn =>
  ({ ...s, comparison: { ...s.comparison, requirements: Object.fromEntries(Object.entries(s.comparison.requirements).filter(([, v]) => v !== undefined)) } }) as DecisionScenarioIn;
const rec = (cs: ReturnType<typeof cand>[], s: DecisionScenarioIn) => recommend({ candidates: cs, comparison: compareCandidates(cs, s.comparison ?? {}), scenario: s });
const pairOf = (pairs: readonly ComparisonResult[], x: string, y: string) => pairs.find((p) => [p.candidateAId, p.candidateBId].sort().join() === [x, y].sort().join())!;

describe('step 6c invariants (property-based)', () => {
  it('same inputs → same outputs; candidate permutation does not change Why Not', () => {
    fc.assert(
      fc.property(fc.array(candArb, { minLength: 2, maxLength: 4 }), scenarioArb, (cs, s0) => {
        const s = clean(s0);
        const r = rec(cs, s);
        expect(rec([...cs].reverse(), s)).toEqual(r);
      }),
      { numRuns: 40 },
    );
  });

  it('confidence never increases when a critical unknown (mandatory requirement without data) is added', () => {
    fc.assert(
      fc.property(fc.array(candArb, { minLength: 2, maxLength: 3 }), scenarioArb, (cs, s0) => {
        const s = clean(s0);
        const withUnknown = clean({ ...s0, comparison: { ...s0.comparison, requirements: { ...s0.comparison.requirements, minTowingKg: 1500 } } });
        const a = rec(cs, s).recommendationConfidence;
        const b = rec(cs, withUnknown).recommendationConfidence;
        expect(b.score).toBeLessThanOrEqual(a.score);
        expect(['LOW', 'MEDIUM', 'HIGH'].indexOf(b.level)).toBeLessThanOrEqual(['LOW', 'MEDIUM', 'HIGH'].indexOf(a.level));
      }),
      { numRuns: 40 },
    );
  });

  it('robustness is never HIGH for a PRACTICAL_TIE (or RANGE_DEPENDENT / no recommendation)', () => {
    fc.assert(
      fc.property(fc.array(candArb, { minLength: 2, maxLength: 3 }), scenarioArb, (cs, s0) => {
        const r = rec(cs, clean(s0));
        const rob = resultRobustness(r, { variables: [], evaluate: () => r, evaluatePriorities: () => r });
        if (r.alphaBestForYou.status !== 'BEST_FOR_YOU') expect(rob.level).not.toBe('HIGH');
        if (r.alphaBestForYou.status === 'PRACTICAL_TIE') {
          expect(rob.status).toBe('TIE');
          expect(r.recommendationConfidence.level).toBe('LOW');
        }
      }),
      { numRuns: 40 },
    );
  });

  it('a FAIL reason always outranks any other disadvantage; UNKNOWN never becomes a confirmed disadvantage', () => {
    fc.assert(
      fc.property(fc.array(candArb, { minLength: 2, maxLength: 4 }), scenarioArb, (cs, s0) => {
        const s = clean(s0);
        const comparison = compareCandidates(cs, s.comparison ?? {});
        const r = recommend({ candidates: cs, comparison, scenario: s });
        for (const p of r.practicalFit) {
          const items = r.whyNotByCandidate[p.candidateId]!.items;
          if (p.status === 'FAIL') expect(items[0]!.type).toBe('DEAL_BREAKER');
          for (const i of items) {
            if (i.sourceResult !== 'COMPARISON' || !i.metric || !i.againstId) continue;
            const pair = pairOf(comparison.pairs, p.candidateId, i.againstId);
            const m = [...pair.technicalComparisons, ...pair.economicComparison.metrics].find((x) => x.metric === i.metric)!;
            expect(['UNKNOWN', 'NOT_COMPARABLE', 'RANGE_DEPENDENT', 'PRACTICAL_TIE']).not.toContain(m.outcome);
          }
        }
      }),
      { numRuns: 40 },
    );
  });

  it('economic NOT_COMPARABLE never yields a cheaper/more-expensive reason', () => {
    fc.assert(
      fc.property(fc.array(candArb, { minLength: 2, maxLength: 4 }), scenarioArb, (cs, s0) => {
        const s = clean(s0);
        const comparison = compareCandidates(cs, s.comparison ?? {});
        const r = recommend({ candidates: cs, comparison, scenario: s });
        for (const [id, w] of Object.entries(r.whyNotByCandidate)) {
          for (const i of w.items.filter((x) => x.messageKey === 'decision.why_not.running_cost')) {
            expect(pairOf(comparison.pairs, id, i.againstId!).economicComparison.status).toBe('COMPARED');
          }
        }
      }),
      { numRuns: 40 },
    );
  });
});
