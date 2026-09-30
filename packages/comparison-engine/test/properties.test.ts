import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { compareCandidates, compareVehicles, type CategoryAdvantage, type ComparisonOutcome, type ComparisonResult } from '../src/index.ts';
import { cand, type FactSpec } from './helpers.ts';

/** Invariantes de la comparación (fast-check) sobre candidatos aleatorios. */
/** [clave, mín, máx, decimales] — las claves enteras del catálogo exigen enteros. */
const NUMERIC: [string, number, number, number][] = [
  ['perf.accel_0_100_s', 3, 12, 1],
  ['rng.electric_combined_km', 200, 700, 0],
  ['chg.dc_max_kw', 50, 350, 1],
  ['cap.boot_l', 250, 700, 0],
  ['dim.length_mm', 3800, 5000, 0],
  ['nrg.fuel_combined_l100', 3.5, 9, 1],
  ['war.years', 2, 8, 0],
];
const valueArb = (lo: number, hi: number, dec: number) => {
  const r = (x: number) => Math.round(x * 10 ** dec) / 10 ** dec;
  return fc.oneof(
    fc.double({ min: lo, max: hi, noNaN: true }).map(r),
    fc.tuple(fc.double({ min: lo, max: hi, noNaN: true }), fc.double({ min: 0, max: (hi - lo) / 5, noNaN: true })).map(([x, w]) => [r(x), r(x + w)] as [number, number]),
  );
};
const factsArb: fc.Arbitrary<FactSpec[]> = fc
  .tuple(...NUMERIC.map(([k, lo, hi, dec]) => fc.option(fc.tuple(fc.constant(k), valueArb(lo, hi, dec), fc.constantFrom<Record<string, unknown>>({}, {}, { test_cycle: 'NEDC' })), { nil: undefined })))
  .map((xs) => xs.filter((x): x is [string, number | [number, number], Record<string, unknown>] => !!x).map(([k, v, e]) => [k, v, NUMERIC.some(([n]) => n === k) && (k.startsWith('nrg.') || k.startsWith('rng.')) ? e : {}] as FactSpec));
const candArb = fc.tuple(factsArb, fc.option(fc.integer({ min: 2, max: 7 }), { nil: undefined })).map(([facts, seats]) => cand('X', facts, seats === undefined ? {} : { seats }));
const scenarioArb = fc.record({ dailyDistanceKm: fc.integer({ min: 5, max: 200 }), homeChargingAvailable: fc.boolean(), longTripsPerYear: fc.integer({ min: 0, max: 12 }), passengers: fc.integer({ min: 1, max: 6 }) });

const FLIP: Record<ComparisonOutcome, ComparisonOutcome> = {
  AHEAD: 'BEHIND',
  BEHIND: 'AHEAD',
  PRACTICAL_TIE: 'PRACTICAL_TIE',
  RANGE_DEPENDENT: 'RANGE_DEPENDENT',
  DIFFERENT: 'DIFFERENT',
  NOT_COMPARABLE: 'NOT_COMPARABLE',
  UNKNOWN: 'UNKNOWN',
};
const FLIP_ADV: Record<CategoryAdvantage, CategoryAdvantage> = { A: 'B', B: 'A', MIXED: 'MIXED', PRACTICAL_TIE: 'PRACTICAL_TIE', RANGE_DEPENDENT: 'RANGE_DEPENDENT', DESCRIPTIVE_ONLY: 'DESCRIPTIVE_ONLY', NOT_COMPARABLE: 'NOT_COMPARABLE', UNKNOWN: 'UNKNOWN' };
const negZ = (x: number) => (x === 0 ? 0 : -x);

describe('comparison invariants (property-based)', () => {
  it('compare(A,B) is the exact inverse of compare(B,A): outcomes flip, deltas negate, classes stay', () => {
    fc.assert(
      fc.property(candArb, candArb, scenarioArb, (A0, B0, s) => {
        const A = { ...A0, label: 'A' };
        const B = { ...B0, label: 'B' };
        const ab = compareVehicles(A, B, s);
        const ba = compareVehicles(B, A, s);
        ab.technicalComparisons.forEach((m, i) => {
          const r = ba.technicalComparisons[i]!;
          expect(r.metric).toBe(m.metric);
          expect(r.outcome).toBe(FLIP[m.outcome]);
          expect(r.meaningful).toBe(m.meaningful);
          expect(r.meaningfulForYou?.level).toBe(m.meaningfulForYou?.level);
          if (m.delta) expect(r.delta).toEqual({ min: negZ(m.delta.max), max: negZ(m.delta.min) });
        });
        ab.categorySummaries.forEach((c, i) => {
          expect(ba.categorySummaries[i]!.advantage).toBe(FLIP_ADV[c.advantage]);
          expect(ba.categorySummaries[i]!.status).toBe(c.status);
        });
        expect(ba.dealBreakersA).toEqual(ab.dealBreakersB);
        expect(ba.scenarioHash).toBe(ab.scenarioHash);
      }),
    );
  });

  it('same inputs → identical result (determinism)', () => {
    fc.assert(
      fc.property(candArb, candArb, scenarioArb, (A, B, s) => {
        expect(compareVehicles(structuredClone(A), structuredClone(B), structuredClone(s))).toEqual(compareVehicles(A, B, s));
      }),
    );
  });

  it('candidate order never changes intrinsic results; adding C never alters A vs B', () => {
    fc.assert(
      fc.property(candArb, candArb, candArb, scenarioArb, (A, B, C, s) => {
        const key = (p: ComparisonResult) => [p.candidateAId, p.candidateBId].join('|');
        const forward = compareCandidates([A, B, C], s);
        const backward = compareCandidates([C, B, A], s);
        expect(backward).toEqual(forward);
        const pair = compareCandidates([B, A], s).pairs[0]!;
        expect(forward.pairs.find((p) => key(p) === key(pair))).toEqual(pair);
      }),
    );
  });

  it('UNKNOWN never becomes a tie: missing data on either side is always UNKNOWN', () => {
    fc.assert(
      fc.property(candArb, candArb, (A, B) => {
        const r = compareVehicles(A, B);
        for (const m of r.technicalComparisons) {
          const missing = m.metric === 'seats' ? A.seats === undefined || B.seats === undefined : !A.facts[m.metric]?.length || !B.facts[m.metric]?.length;
          if (missing && !m.metric.startsWith('saf.')) expect(m.outcome).toBe('UNKNOWN');
        }
      }),
    );
  });
});
