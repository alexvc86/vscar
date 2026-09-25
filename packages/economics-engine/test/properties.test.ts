import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { computeEconomics, economicDelta, neg, type EconomicVehicleInputIn } from '../src/index.ts';
import { bev, ctx, ice, phev } from './helpers.ts';

/** Invariantes del Economics Engine (fast-check). Precios vía overrides del escenario para recorrer todo el espacio. */
const CONTEXT = ctx({ petrol: 1.65, diesel: 1.55, electricity: 0.19 });

const consumption = fc.tuple(fc.double({ min: 2, max: 15, noNaN: true }), fc.double({ min: 0, max: 1.5, noNaN: true })).map(([a, w]) => [a, a + w] as [number, number]);
const vehicleArb: fc.Arbitrary<EconomicVehicleInputIn> = fc.oneof(
  consumption.map((c) => ice(c)),
  fc.tuple(fc.double({ min: 10, max: 30, noNaN: true }), fc.constantFrom('INCLUDED', 'EXCLUDED', 'UNSPECIFIED' as const)).map(([k, b]) => bev(k, b)),
  consumption.map((c) => phev({ chargeSustainingL100: { min: c[0], max: c[1], test_cycle: 'WLTP' } })),
);
const km = fc.integer({ min: 1_000, max: 100_000 });
const fuelPrice = fc.double({ min: 0.8, max: 3, noNaN: true });
const elecPrice = fc.double({ min: 0.03, max: 0.8, noNaN: true });
const share = fc.double({ min: 0, max: 1, noNaN: true });

const scenario = (annualKm: number, fp: number, ep: number, s: number, horizonYears = 5) => ({
  annualKm,
  horizonYears,
  phevElectricShare: s,
  energy: { fuelPriceOverrides: { PETROL_95_E5: fp }, electricityPriceOverride: ep },
});
const annual = (v: EconomicVehicleInputIn, sc: ReturnType<typeof scenario>) => computeEconomics(v, CONTEXT, sc).runningCost.annual_minor!;
const component = (v: EconomicVehicleInputIn, sc: ReturnType<typeof scenario>, c: 'FUEL' | 'ELECTRICITY') =>
  computeEconomics(v, CONTEXT, sc).breakdown.find((l) => l.component === c)?.amount_minor;

describe('economics invariants (property-based)', () => {
  it('annual_km ↑ → energy cost never goes down', () => {
    fc.assert(
      fc.property(vehicleArb, km, km, fuelPrice, elecPrice, share, (v, k1, k2, fp, ep, s) => {
        const [lo, hi] = k1 <= k2 ? [k1, k2] : [k2, k1];
        const a = annual(v, scenario(lo, fp, ep, s));
        const b = annual(v, scenario(hi, fp, ep, s));
        expect(b.min).toBeGreaterThanOrEqual(a.min);
        expect(b.max).toBeGreaterThanOrEqual(a.max);
      }),
    );
  });

  it('fuel price ↑ → ICE/PHEV fuel cost never goes down', () => {
    fc.assert(
      fc.property(fc.oneof(consumption.map((c) => ice(c)), consumption.map((c) => phev({ chargeSustainingL100: { min: c[0], max: c[1] } }))), km, fuelPrice, fuelPrice, fc.double({ min: 0, max: 0.99, noNaN: true }), (v, k, p1, p2, s) => {
        const [lo, hi] = p1 <= p2 ? [p1, p2] : [p2, p1];
        const a = component(v, scenario(k, lo, 0.2, s), 'FUEL')!;
        const b = component(v, scenario(k, hi, 0.2, s), 'FUEL')!;
        expect(b.min).toBeGreaterThanOrEqual(a.min);
        expect(b.max).toBeGreaterThanOrEqual(a.max);
      }),
    );
  });

  it('electricity price ↑ → BEV/PHEV electric cost never goes down', () => {
    fc.assert(
      fc.property(fc.oneof(fc.double({ min: 10, max: 30, noNaN: true }).map((k) => bev(k, 'UNSPECIFIED')), fc.constant(phev())), km, elecPrice, elecPrice, fc.double({ min: 0.01, max: 1, noNaN: true }), (v, k, p1, p2, s) => {
        const [lo, hi] = p1 <= p2 ? [p1, p2] : [p2, p1];
        const a = component(v, scenario(k, 1.6, lo, s), 'ELECTRICITY')!;
        const b = component(v, scenario(k, 1.6, hi, s), 'ELECTRICITY')!;
        expect(b.min).toBeGreaterThanOrEqual(a.min);
        expect(b.max).toBeGreaterThanOrEqual(a.max);
      }),
    );
  });

  it('horizon ↑ → cumulative running cost never goes down', () => {
    fc.assert(
      fc.property(vehicleArb, km, fc.integer({ min: 1, max: 30 }), fc.integer({ min: 1, max: 30 }), (v, k, h1, h2) => {
        const [lo, hi] = h1 <= h2 ? [h1, h2] : [h2, h1];
        const r = computeEconomics(v, CONTEXT, scenario(k, 1.6, 0.2, 0.5, hi));
        const at = (y: number) => r.runningCost.horizons.find((h) => h.years === y)?.total_minor ?? { min: r.runningCost.annual_minor!.min * y, max: r.runningCost.annual_minor!.max * y };
        expect(at(hi).min).toBeGreaterThanOrEqual(at(lo).min);
        const horizons = r.runningCost.horizons;
        for (let i = 1; i < horizons.length; i++) expect(horizons[i]!.total_minor.min).toBeGreaterThanOrEqual(horizons[i - 1]!.total_minor.min);
      }),
    );
  });

  it('determinism: same input → same output (incl. scenarioHash); min ≤ max always', () => {
    fc.assert(
      fc.property(vehicleArb, km, fuelPrice, elecPrice, share, (v, k, fp, ep, s) => {
        const a = computeEconomics(v, CONTEXT, scenario(k, fp, ep, s));
        const b = computeEconomics(structuredClone(v), structuredClone(CONTEXT), scenario(k, fp, ep, s));
        expect(b).toEqual(a);
        for (const h of a.runningCost.horizons) expect(h.total_minor.min).toBeLessThanOrEqual(h.total_minor.max);
      }),
    );
  });

  it('candidate permutation → identical individual results', () => {
    fc.assert(
      fc.property(fc.array(vehicleArb, { minLength: 2, maxLength: 5 }), km, (vs, k) => {
        const sc = scenario(k, 1.6, 0.2, 0.5);
        const byId = (xs: EconomicVehicleInputIn[]) => Object.fromEntries(xs.map((v) => [v.id, computeEconomics(v, CONTEXT, sc)]));
        expect(byId([...vs].reverse())).toEqual(byId(vs));
      }),
    );
  });

  it('delta(A,B) = −delta(B,A)', () => {
    fc.assert(
      fc.property(vehicleArb, vehicleArb, km, (va, vb, k) => {
        const sc = scenario(k, 1.6, 0.2, 0.5);
        const a = computeEconomics(va, CONTEXT, sc);
        const b = computeEconomics(vb, CONTEXT, sc);
        const ab = economicDelta(a, b);
        const ba = economicDelta(b, a);
        expect(ba.runningAnnual_minor).toEqual(neg(ab.runningAnnual_minor!));
        ab.running.forEach((h, i) => expect(ba.running[i]!.delta_minor).toEqual(neg(h.delta_minor)));
      }),
    );
  });
});
