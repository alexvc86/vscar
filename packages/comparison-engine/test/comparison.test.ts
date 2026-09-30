import { describe, expect, it } from 'vitest';
import { METHODOLOGY_VERSION } from '@vscar/methodology';
import { SafetyRating } from '@vscar/vehicle-schema';
import { compareCandidates, compareVehicles, evaluateDealBreakers, type ComparisonScenarioIn } from '../src/index.ts';
import { cand, fuelCtx, iceEconomic, metric, uuid } from './helpers.ts';

const EV_COMMUTER: ComparisonScenarioIn = { dailyDistanceKm: 35, homeChargingAvailable: true, longTripsPerYear: 1 };

describe('golden 1 — economics (consumes EconomicResult, no recalculation)', () => {
  it('6.1 vs 4.8 L/100 km, 18,000 km, 1.65 €/L → B cheaper by 386.10 €/year, 1,158.30 €/3y, 1,930.50 €/5y; symmetric', () => {
    const ctx = fuelCtx(1.65);
    const A = cand('Car A', [], { powertrainType: 'ICE' });
    const B = cand('Car B', [], { powertrainType: 'ICE' });
    A.economic = iceEconomic(A.id, 6.1, ctx);
    B.economic = iceEconomic(B.id, 4.8, ctx);
    const ab = compareVehicles(A, B, { annualKm: 18_000 });
    const e = (id: string) => ab.economicComparison.metrics.find((m) => m.metric === id)!;
    expect(ab.economicComparison.status).toBe('COMPARED');
    expect(e('economic.running_annual')).toMatchObject({ outcome: 'BEHIND', delta: { min: 38610, max: 38610 }, meaningful: 'CLEAR' });
    expect(e('economic.running_3y').delta).toEqual({ min: 115830, max: 115830 });
    expect(e('economic.running_5y').delta).toEqual({ min: 193050, max: 193050 });
    expect(e('economic.cost_per_100km')).toMatchObject({ outcome: 'BEHIND', delta: { min: 2.145, max: 2.145 } });
    expect(e('economic.running_annual').explanation).toBe(
      'annual running cost: Car A 1,811.70 € vs Car B 1,425.60 € — Car B costs about 386.10 € less per year (18,000 km/year) (clear difference)',
    );
    const ba = compareVehicles(B, A, { annualKm: 18_000 });
    const r = (id: string) => ba.economicComparison.metrics.find((m) => m.metric === id)!;
    expect(r('economic.running_annual')).toMatchObject({ outcome: 'AHEAD', delta: { min: -38610, max: -38610 } });
    expect(r('economic.running_5y').delta).toEqual({ min: -193050, max: -193050 });
  });
});

describe('golden 2/3 — meaningful difference and meaningful for you', () => {
  it('0–100 km/h 6.8 s vs 7.0 s → PRACTICAL_TIE (methodology threshold 0.4 s)', () => {
    const r = compareVehicles(cand('A', [['perf.accel_0_100_s', 6.8]]), cand('B', [['perf.accel_0_100_s', 7.0]]));
    expect(metric(r, 'perf.accel_0_100_s')).toMatchObject({ outcome: 'PRACTICAL_TIE', meaningful: 'TIE' });
  });

  it('electric range 570 vs 448 km → CLEAR; for a 35 km/day home-charging commuter the impact is SLIGHT', () => {
    const byd = cand('BYD SEAL', [['rng.electric_combined_km', 570]]);
    const tesla = cand('Model 3', [['rng.electric_combined_km', 448]]);
    const general = metric(compareVehicles(byd, tesla), 'rng.electric_combined_km');
    expect(general).toMatchObject({ outcome: 'AHEAD', meaningful: 'CLEAR', delta: { min: 122, max: 122 } });
    const commuter = metric(compareVehicles(byd, tesla, EV_COMMUTER), 'rng.electric_combined_km');
    expect(commuter.meaningful).toBe('CLEAR');
    expect(commuter.meaningfulForYou!.level).toBe('SLIGHT');
    expect(commuter.explanation).toMatch(/^electric range: BYD SEAL 570 vs Model 3 448 km — BYD SEAL ahead \(clear difference\); for this scenario the practical impact is slight/);
    const traveller = metric(compareVehicles(byd, tesla, { dailyDistanceKm: 60, longTripsPerYear: 10 }), 'rng.electric_combined_km');
    expect(traveller.meaningfulForYou!.level).toBe('CLEAR');
  });

  it('category summary: Range AHEAD for A, CLEAR, practical impact SLIGHT — no winner, no score', () => {
    const r = compareVehicles(cand('BYD SEAL', [['rng.electric_combined_km', 570]]), cand('Model 3', [['rng.electric_combined_km', 448]]), EV_COMMUTER);
    expect(r.categorySummaries.find((s) => s.category === 'Range')).toMatchObject({ advantage: 'A', meaningfulLevel: 'CLEAR', meaningfulForYouLevel: 'SLIGHT' });
    for (const forbidden of ['winner', 'overallScore', 'recommendedVehicle', 'personalFit', 'score']) expect(Object.keys(r)).not.toContain(forbidden);
    expect(JSON.stringify(r)).not.toMatch(/"winner"|"overallScore"|"recommendedVehicle"|"personalFit"/);
  });
});

describe('golden 4/5 — deal breakers first; UNKNOWN is never PASS', () => {
  it('boot ≥ 500 L: A 520 PASS, B 380 FAIL', () => {
    const A = cand('A', [['cap.boot_l', 520]]);
    const B = cand('B', [['cap.boot_l', 380]]);
    const r = compareVehicles(A, B, { requirements: { minBootL: 500 } });
    expect(r.dealBreakersA.status).toBe('PASS');
    expect(r.dealBreakersB).toMatchObject({ status: 'FAIL', failedChecks: [{ criterion: 'minBootL', status: 'FAIL', requiredValue: 500, observedValue: { min: 380, max: 380, unit: 'L' } }] });
    expect(r.dealBreakersB.failedChecks[0]!.reason).toBe('boot 380 L does not meet ≥ 500 L (VDA)');
  });

  it('a FAIL is not reverted by advantages elsewhere', () => {
    const A = cand('A', [['cap.boot_l', 380], ['rng.electric_combined_km', 600], ['perf.accel_0_100_s', 4.0]]);
    const B = cand('B', [['cap.boot_l', 520], ['rng.electric_combined_km', 400], ['perf.accel_0_100_s', 8.0]]);
    const r = compareVehicles(A, B, { requirements: { minBootL: 500 } });
    expect(r.categorySummaries.filter((s) => s.advantage === 'A').length).toBeGreaterThan(0);
    expect(r.dealBreakersA.status).toBe('FAIL');
  });

  it('towing ≥ 1500 kg with missing data → UNKNOWN (not PASS); a range crossing the limit → UNKNOWN', () => {
    const r = evaluateDealBreakers(cand('A', []), { requirements: { minTowingKg: 1500 } });
    expect(r).toMatchObject({ status: 'UNKNOWN', unknownChecks: [{ criterion: 'minTowingKg', status: 'UNKNOWN' }] });
    const range = evaluateDealBreakers(cand('B', [['cap.boot_l', [480, 520]]]), { requirements: { minBootL: 500 } });
    expect(range.status).toBe('UNKNOWN');
    expect(range.checks[0]!.reason).toMatch(/depends on configuration/);
    expect(evaluateDealBreakers(cand('C', [], { powertrainType: 'ICE' }), { requirements: { minElectricRangeKm: 50 } }).status).toBe('FAIL');
    expect(evaluateDealBreakers(cand('D', [], { seats: 5 }), { requirements: { minSeats: 7 } }).status).toBe('FAIL');
    expect(evaluateDealBreakers(cand('E', []), {}).status).toBe('PASS');
  });
});

describe('ranges, bases, cycles and missing data', () => {
  it('a range overlapping the other value → RANGE_DEPENDENT (no midpoint)', () => {
    const r = compareVehicles(cand('A', [['nrg.fuel_combined_l100', [5.0, 5.8]]]), cand('Other', [['nrg.fuel_combined_l100', 5.4]]));
    expect(metric(r, 'nrg.fuel_combined_l100')).toMatchObject({ outcome: 'RANGE_DEPENDENT', meaningful: 'RANGE_DEPENDENT', delta: { min: -0.4, max: 0.4 } });
    // Un rango entero dentro del umbral de empate sigue siendo empate (5.0–5.4 vs 5.2: |Δ| ≤ 0.2 < 0.3 L).
    const tie = compareVehicles(cand('X3', [['nrg.fuel_combined_l100', [5.0, 5.4]]]), cand('Other', [['nrg.fuel_combined_l100', 5.2]]));
    expect(metric(tie, 'nrg.fuel_combined_l100')).toMatchObject({ outcome: 'PRACTICAL_TIE', delta: { min: -0.2, max: 0.2 } });
  });

  it('different test cycles → NOT_COMPARABLE, never a tie', () => {
    const r = compareVehicles(cand('A', [['nrg.fuel_combined_l100', 5.0, { test_cycle: 'NEDC' }]]), cand('B', [['nrg.fuel_combined_l100', 5.0]]));
    expect(metric(r, 'nrg.fuel_combined_l100')).toMatchObject({ outcome: 'NOT_COMPARABLE', reason: 'NOT_DIRECTLY_COMPARABLE: NEDC vs WLTP' });
  });

  it('power SYSTEM vs ICE_ONLY → NOT_COMPARABLE', () => {
    const r = compareVehicles(cand('A', [['perf.power_max_kw', 150]]), cand('B', [['perf.power_max_kw', 110, { measurement_basis: { power_basis: 'ICE_ONLY' } }]]));
    expect(metric(r, 'perf.power_max_kw').outcome).toBe('NOT_COMPARABLE');
  });

  it('DC time 10→80 vs 30→80 → NOT_COMPARABLE; with a matching window available, that pair is used', () => {
    const A = cand('A', [['chg.dc_time_min', 26]]);
    const B = cand('B', [['chg.dc_time_min', 20, { measurement_basis: { soc_from_pct: 30 } }]]);
    expect(metric(compareVehicles(A, B), 'chg.dc_time_min')).toMatchObject({ outcome: 'NOT_COMPARABLE', reason: 'NOT_DIRECTLY_COMPARABLE: soc_from_pct 10 vs 30' });
    const B2 = cand('B', [['chg.dc_time_min', 20, { measurement_basis: { soc_from_pct: 30 } }], ['chg.dc_time_min', 37]]);
    expect(metric(compareVehicles(A, B2), 'chg.dc_time_min')).toMatchObject({ outcome: 'AHEAD', delta: { min: -11, max: -11 }, meaningful: 'CLEAR' });
  });

  it('missing on either side → UNKNOWN, never a tie; unavailable category → UNKNOWN summary', () => {
    const r = compareVehicles(cand('A', [['cap.boot_l', 400]]), cand('B', []));
    expect(metric(r, 'cap.boot_l')).toMatchObject({ outcome: 'UNKNOWN', reason: 'no usable cap.boot_l for B' });
    const B = cand('B', [['cap.boot_l', 400]]);
    B.eligibility = { ...B.eligibility, Size: { status: 'NOT_AVAILABLE', missing: ['missing dim.length_mm'], partial_reasons: [], value_ids: [] } };
    const s = compareVehicles(cand('A', [['cap.boot_l', 500]]), B).categorySummaries.find((x) => x.category === 'Size')!;
    expect(s).toMatchObject({ status: 'NOT_AVAILABLE', advantage: 'UNKNOWN' });
    expect(s.unknowns).toContain('B: Size not available (missing dim.length_mm)');
  });

  it('size has no better direction: shorter/longer is DIFFERENT (described), not AHEAD', () => {
    const r = compareVehicles(cand('A', [['dim.length_mm', 4500]]), cand('B', [['dim.length_mm', 4800]]));
    expect(metric(r, 'dim.length_mm')).toMatchObject({ outcome: 'DIFFERENT', meaningful: 'CLEAR', delta: { min: -300, max: -300 } });
    expect(r.categorySummaries.find((x) => x.category === 'Size')!.advantage).toBe('DESCRIPTIVE_ONLY');
  });
});

describe('safety, eco, technology, warranty', () => {
  const rating = (variantId: string, year: number, protocol: string, stars: number, status: 'VALID' | 'EXPIRED' = 'VALID') =>
    SafetyRating.parse({ id: uuid(), variant_id: variantId, authority: 'EuroNCAP', rating_status: status, stars, adult_pct: 88, protocol_version: protocol, tested_year: year, mapping_confidence: 'EXACT', source_id: '00000000-0000-4000-8000-00000000c005', source_url: 'https://www.euroncap.com/x' });

  it('Euro NCAP 2017 vs 2025 → NOT_COMPARABLE, with EXPIRED visible; same protocol → compared', () => {
    const A = cand('A', []);
    const B = cand('B', []);
    A.safetyRatings = [rating(A.id, 2017, '2017', 5, 'EXPIRED')];
    B.safetyRatings = [rating(B.id, 2025, '2023-2025', 5)];
    const m = metric(compareVehicles(A, B), 'saf.ncap_stars');
    expect(m.outcome).toBe('NOT_COMPARABLE');
    expect(m.explanation).toMatch(/EXPIRED/);
    B.safetyRatings = [rating(B.id, 2017, '2017', 4)];
    expect(metric(compareVehicles(A, B), 'saf.ncap_stars')).toMatchObject({ outcome: 'AHEAD', meaningful: 'CLEAR' });
  });

  it('DGT label and equipment are described (A has / B lacks), never scored', () => {
    const r = compareVehicles(cand('A', [['emi.dgt_label_es', '0'], ['tech.apple_carplay', 'standard_wireless']]), cand('B', [['emi.dgt_label_es', 'C'], ['tech.apple_carplay', 'not_available']]));
    expect(metric(r, 'emi.dgt_label_es')).toMatchObject({ outcome: 'DIFFERENT', explanation: 'DGT environmental label: A 0 · B C' });
    expect(metric(r, 'tech.apple_carplay')).toMatchObject({ outcome: 'DIFFERENT', explanation: 'Apple CarPlay: A standard_wireless · B not_available' });
    expect(r.categorySummaries.find((s) => s.category === 'Technology')!.advantage).toBe('DESCRIPTIVE_ONLY');
  });

  it('warranty compared with methodology thresholds', () => {
    const r = compareVehicles(cand('A', [['war.years', 7], ['war.km', 150_000]]), cand('B', [['war.years', 3], ['war.km', 100_000]]));
    expect(metric(r, 'war.years')).toMatchObject({ outcome: 'AHEAD', meaningful: 'CLEAR' });
    expect(r.categorySummaries.find((s) => s.category === 'Warranty')!.advantage).toBe('A');
  });
});

describe('economics edge cases', () => {
  it('economics unavailable for one side → UNKNOWN (never an economic tie)', () => {
    const ctx = fuelCtx();
    const A = cand('A', [], { powertrainType: 'ICE' });
    const B = cand('B', [], { powertrainType: 'ICE' });
    A.economic = iceEconomic(A.id, 6.1, ctx);
    B.economic = iceEconomic(B.id, 6.1, ctx, undefined, { fuelConsumptionL100: undefined });
    const r = compareVehicles(A, B);
    expect(r.economicComparison).toMatchObject({ status: 'UNKNOWN', metrics: [] });
    expect(r.economicComparison.reason).toMatch(/running cost unavailable for B/);
    expect(r.categorySummaries.find((s) => s.category === 'Economy')!.advantage).not.toBe('PRACTICAL_TIE');
  });

  it('different economic scenarios → NOT_COMPARABLE', () => {
    const ctx = fuelCtx();
    const A = cand('A', [], { powertrainType: 'ICE' });
    const B = cand('B', [], { powertrainType: 'ICE' });
    A.economic = iceEconomic(A.id, 6.1, ctx);
    B.economic = iceEconomic(B.id, 4.8, ctx, { annualKm: 10_000, horizonYears: 5 });
    expect(compareVehicles(A, B).economicComparison.status).toBe('NOT_COMPARABLE');
  });

  it('shows the Economics Engine break-even (premium = more expensive to buy), not a recalculation', () => {
    const ctx = fuelCtx(1.6);
    const A = cand('A', [], { powertrainType: 'ICE' });
    const B = cand('B', [], { powertrainType: 'ICE' });
    const price = (eur: number) => ({ purchase: { participant: 'NEW' as const, listPrice: { amount_minor: eur * 100, currency: 'EUR' as const, status: 'KNOWN' as const } } });
    A.economic = iceEconomic(A.id, 4.0, ctx, { annualKm: 20_000, horizonYears: 5 }, price(30_000));
    B.economic = iceEconomic(B.id, 6.5, ctx, { annualKm: 20_000, horizonYears: 5 }, price(26_000));
    const be = compareVehicles(B, A).economicComparison.breakEven!;
    expect(be).toMatchObject({ premiumId: A.id, baselineId: B.id, result: { status: 'BREAK_EVEN', years: { min: 5, max: 5 } } });
  });
});

describe('reproducibility, multi-candidate, confidence', () => {
  it('same inputs → same result and scenarioHash; the hash does not depend on A/B order', () => {
    const A = cand('A', [['cap.boot_l', 500]]);
    const B = cand('B', [['cap.boot_l', 420]]);
    const r1 = compareVehicles(A, B, EV_COMMUTER);
    const r2 = compareVehicles(structuredClone(A), structuredClone(B), structuredClone(EV_COMMUTER));
    expect(r2).toEqual(r1);
    expect(compareVehicles(B, A, EV_COMMUTER).scenarioHash).toBe(r1.scenarioHash);
    expect(compareVehicles(A, B, { ...EV_COMMUTER, dailyDistanceKm: 36 }).scenarioHash).not.toBe(r1.scenarioHash);
    expect(r1.methodologyVersion).toBe(METHODOLOGY_VERSION);
  });

  it('compareCandidates: all pairs, independent of input order; adding C does not change A vs B', () => {
    const A = cand('A', [['cap.boot_l', 500]]);
    const B = cand('B', [['cap.boot_l', 420]]);
    const C = cand('C', [['cap.boot_l', 300]]);
    const two = compareCandidates([B, A]);
    const three = compareCandidates([C, A, B]);
    expect(two.pairs).toHaveLength(1);
    expect(three.pairs).toHaveLength(3);
    const ab = (p: { candidateAId: string; candidateBId: string }) => [p.candidateAId, p.candidateBId].sort().join() === [A.id, B.id].sort().join();
    expect(three.pairs.find(ab)).toEqual(two.pairs.find(ab));
    expect(compareCandidates([A, B, C])).toEqual(three);
    expect(Object.keys(three)).toEqual(['dealBreakers', 'pairs']);
  });

  it('data confidence combines existing signals (partial categories, coarse mapping, ranges)', () => {
    const A = cand('A', [['cap.boot_l', 500]]);
    const B = cand('B', [['cap.boot_l', 420, { mapping_confidence: 'POWERTRAIN_LEVEL' }]]);
    expect(compareVehicles(A, cand('B', [['cap.boot_l', 420]])).dataConfidence.level).toBe('HIGH');
    const r = compareVehicles(A, B);
    expect(r.dataConfidence.level).toBe('MEDIUM');
    expect(r.dataConfidence.reasons[0]).toMatch(/powertrain\/generation level/);
  });
});
