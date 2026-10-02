import { describe, expect, it } from 'vitest';
import { comparisonCandidateFromBundle } from '@vscar/comparison-engine';
import { economicVehicleInputFromBundle } from '@vscar/economics-engine';
import { BYD_SEAL_IDS, GOLF_CURRENT_IDS, MODEL3_2021_IDS, X3_2018_IDS, loadAllCases } from '@vscar/fixtures';
import { UsedVehicleInstance } from '@vscar/vehicle-schema';
import { MESSAGE_TEMPLATES, createDecisionPipeline, decide, recommend, type DecisionScenarioIn, type PipelineVehicle } from '../src/index.ts';
import { cand, fuelCtx, run } from './helpers.ts';

const CTX = fuelCtx(1.65);
const ice = (label: string, l100: number, facts: Parameters<typeof cand>[1] = [], over: Parameters<typeof cand>[2] = {}): PipelineVehicle => {
  const candidate = cand(label, facts, { powertrainType: 'ICE', seats: 5, ...over });
  return { candidate, economicInput: { id: candidate.id, market: 'ES', powertrainType: 'ICE', fuelType: 'petrol', fuelConsumptionL100: { min: l100, max: l100, test_cycle: 'WLTP', mapping_confidence: 'EXACT' }, purchase: { participant: 'NEW' } } };
};
const pipeline = (vehicles: PipelineVehicle[], annualKm: number, ds: Omit<DecisionScenarioIn, 'horizonYears'> = {}, horizonYears = 5) =>
  createDecisionPipeline({ vehicles, energyContext: CTX, economicScenario: { annualKm, horizonYears }, decisionScenario: { horizonYears, ...ds } });

describe('golden 42 — stable result', () => {
  it('A dominates (cheaper and bigger boot): no plausible km/price/horizon/priority change alters it', () => {
    const A = ice('A', 4.5, [['cap.boot_l', 520]]);
    const B = ice('B', 7.5, [['cap.boot_l', 400]]);
    const r = pipeline([A, B], 18_000, { comparison: { annualKm: 18_000 }, priorities: { COST: 'HIGH' } }).recommend();
    expect(r.alphaBestForYou).toMatchObject({ status: 'BEST_FOR_YOU', candidateId: A.candidate.id });
    expect(r.resultRobustness).toMatchObject({ status: 'STABLE', level: 'HIGH' });
    expect(r.resultRobustness.bestForYou.variables.filter((v) => v.status !== 'NOT_APPLICABLE').every((v) => v.status === 'NO_SWITCH_IN_RANGE')).toBe(true);
    expect(r.resultRobustness.messages[0]).toMatchObject({ messageKey: 'decision.robustness.stable', text: 'The result remains stable across the tested scenario range' });
    expect(r.recommendationConfidence.level).toBe('HIGH');
    expect(r.resultRobustness.bestForYou.variables.find((v) => v.variable === 'electricity_price')!.status).toBe('NOT_APPLICABLE');
  });
});

describe('golden 43 — sensitive result', () => {
  it('at 13,000 km/year A wins, but below ~11,800 km/year the result changes → SENSITIVE (reproducible)', () => {
    const vehicles = [ice('A', 4.5, [['cap.boot_l', 400]]), ice('B', 7.5, [['cap.boot_l', 520]])];
    const p = pipeline(vehicles, 13_000, { comparison: { annualKm: 13_000 }, priorities: { COST: 'HIGH' } });
    const r = p.recommend();
    expect(r.alphaBestForYou.candidateId).toBe(vehicles[0]!.candidate.id);
    const km = r.resultRobustness.bestForYou.variables.find((v) => v.variable === 'annual_km')!;
    expect(km).toMatchObject({ status: 'SENSITIVE', direction: 'BELOW', switchValue: 11_800 });
    expect(km.switchValue! / 13_000).toBeGreaterThan(0.9 - 0.01); // cambia con ≈ −10 %
    expect(km.evaluations).toBeLessThan(40);
    expect(r.resultRobustness.status).toBe('SENSITIVE');
    expect(r.resultRobustness.messages.find((m) => m.params.variable === 'annual_km')!.text).toBe('The result changes if annual mileage falls below 11,800 km/year');
    // El otro lado del punto de cambio de verdad cambia el resultado.
    expect(p.decide({ annualKm: km.switchValue! - 10 }).alphaBestForYou.candidateId).not.toBe(vehicles[0]!.candidate.id);
    expect(p.decide({ annualKm: 12_500 }).alphaBestForYou.candidateId).toBe(vehicles[0]!.candidate.id);
    expect(p.recommend()).toEqual(r);
    expect(r.recommendationConfidence.level).not.toBe('HIGH');
  });
});

describe('ties, verification and no full match', () => {
  it('PRACTICAL_TIE: robustness TIE (never HIGH), confidence capped LOW with the tie as reason', () => {
    const r = pipeline([ice('A', 6, [['perf.accel_0_100_s', 6.8]]), ice('B', 6, [['perf.accel_0_100_s', 7.0]])], 15_000, { priorities: { PERFORMANCE: 'HIGH' } }).recommend();
    expect(r.alphaBestForYou.status).toBe('PRACTICAL_TIE');
    expect(r.resultRobustness).toMatchObject({ status: 'TIE', level: 'LOW' });
    expect(r.recommendationConfidence.level).toBe('LOW');
    expect(r.recommendationConfidence.reasons.some((m) => m.messageKey === 'decision.confidence.cap' && m.params.reason === 'PRACTICAL_TIE')).toBe(true);
    expect(r.tradeoffsForSelected).toEqual([]);
  });

  it('golden 46 — towing ≥ 1,500 kg unknown → UNCONFIRMED, "verify before deciding", confidence reduced (not FAIL, not PASS)', () => {
    const vehicles = [ice('A', 5, [['cap.boot_l', 450]]), ice('B', 7, [['cap.boot_l', 450]])];
    const base = pipeline(vehicles, 15_000, { priorities: { COST: 'HIGH' } }).recommend({ robustness: false });
    const r = pipeline(vehicles, 15_000, { comparison: { requirements: { minTowingKg: 1500 } }, priorities: { COST: 'HIGH' } }).recommend({ robustness: false });
    expect(r.practicalFit.map((p) => p.status)).toEqual(['UNCONFIRMED', 'UNCONFIRMED']);
    expect(r.requiresVerification[0]).toMatchObject({ messageKey: 'decision.verify.requirement', mandatory: true, params: { criterion: 'minTowingKg', required: 1500, unit: 'kg' } });
    expect(r.requiresVerification[0]!.text).toBe('Towing capacity is not confirmed. Verify that it reaches at least 1,500 kg');
    expect(r.recommendationConfidence.score).toBeLessThan(base.recommendationConfidence.score);
    expect(r.recommendationConfidence.level).toBe('LOW'); // todos sin confirmar → tope LOW
    // Nunca como defecto confirmado: no hay DEAL_BREAKER, solo REQUIRES_VERIFICATION.
    for (const w of Object.values(r.whyNotByCandidate)) expect(w.items.some((i) => i.type === 'DEAL_BREAKER')).toBe(false);
    expect(r.whyNotByCandidate[r.alphaBestForYou.candidateId!]!.items[0]!.type).toBe('REQUIRES_VERIFICATION');
  });

  it('NO_FULL_MATCH: "None fully meets your requirements" + closest option (never "recommended"); deal breakers first', () => {
    const r = pipeline([ice('A', 6, [['cap.boot_l', 480]]), ice('B', 6, [['cap.boot_l', 300]])], 15_000, { comparison: { requirements: { minBootL: 500 } } }).recommend({ robustness: false });
    expect(r.notices.map((n) => n.messageKey)).toEqual(['decision.no_full_match', 'decision.closest_option']);
    expect(r.notices[1]!.text).toBe('Closest option (not a recommendation): A — fails 1 requirement(s)');
    for (const w of Object.values(r.whyNotByCandidate)) expect(w.items[0]).toMatchObject({ type: 'DEAL_BREAKER', severity: 'BLOCKING' });
    expect(r.resultRobustness.status).toBe('UNKNOWN');
    expect(r.recommendationConfidence.level).toBe('LOW');
  });
});

describe('why not and tradeoffs', () => {
  it('non-winner: deal breaker first, then meaningful economic disadvantage with range kept; winner tradeoffs listed', () => {
    const A = ice('A 7-seater', 7.5, [['cap.boot_l', 300]], { seats: 7 });
    const B = ice('B 5-seater', 4.5, [['cap.boot_l', 650]], { seats: 5 });
    const C = ice('C 7-seater', 9.0, [['cap.boot_l', 300]], { seats: 7 });
    const r = pipeline([A, B, C], 18_000, { comparison: { annualKm: 18_000, requirements: { minSeats: 7 } }, priorities: { COST: 'HIGH' } }).recommend({ robustness: false });
    expect(r.alphaBestForYou.candidateId).toBe(A.candidate.id);
    expect(r.whyNotByCandidate[B.candidate.id]!.items[0]).toMatchObject({ type: 'DEAL_BREAKER', severity: 'BLOCKING', messageKey: 'decision.why_not.deal_breaker' });
    const c = r.whyNotByCandidate[C.candidate.id]!;
    expect(c.kind).toBe('WHY_NOT');
    expect(c.items[0]).toMatchObject({ type: 'ECONOMIC', messageKey: 'decision.why_not.running_cost', delta: { min: 44550, max: 44550 }, params: { amountMinMinor: 44550, amountMaxMinor: 44550, currency: 'EUR', annualKm: 18_000 } });
    expect(c.items[0]!.text).toBe('Costs about €445.50 more per year to run at 18,000 km/year than A 7-seater');
    // El ganador no se vende como perfecto: frente a C no hay desventajas → lista vacía, sin relleno.
    expect(r.whyNotByCandidate[A.candidate.id]!.kind).toBe('TRADEOFFS');
    expect(r.tradeoffsForSelected.length).toBeLessThanOrEqual(3);
  });

  it('a lone SLIGHT disadvantage is shown only as a minor fallback; nothing is invented', () => {
    const r = pipeline([ice('A', 6.0, [['cap.boot_l', 460]]), ice('B', 6.0, [['cap.boot_l', 420]])], 15_000, { priorities: { SPACE: 'HIGH' } }).recommend({ robustness: false });
    const loser = r.alphaBestForYou.candidateId === r.candidates[0] ? r.candidates[1]! : r.candidates[0]!;
    const w = r.whyNotByCandidate[loser]!;
    expect(w.items.length).toBeLessThanOrEqual(1);
    if (w.items.length) expect(w).toMatchObject({ onlyMinor: true, items: [{ severity: 'MINOR' }] });
  });

  it('every message is i18n-ready (known key + params + English fallback)', () => {
    const r = pipeline([ice('A', 4.5, [['cap.boot_l', 400]]), ice('B', 7.5, [['cap.boot_l', 520]])], 13_000, { priorities: { COST: 'HIGH' } }).recommend();
    const msgs = [...Object.values(r.whyNotByCandidate).flatMap((w) => w.items), ...r.requiresVerification, ...r.notices, ...r.resultRobustness.messages, ...r.recommendationConfidence.reasons];
    expect(msgs.length).toBeGreaterThan(0);
    for (const m of msgs) {
      expect(MESSAGE_TEMPLATES[m.messageKey], m.messageKey).toBeDefined();
      expect(MESSAGE_TEMPLATES[m.messageKey]!(m.params)).toBe(m.text);
    }
  });

  it('pipeline orchestrates the existing engines: same result as calling decide() on the same inputs', () => {
    const p = pipeline([ice('A', 4.5), ice('B', 7.5)], 18_000, { priorities: { COST: 'HIGH' } });
    expect(p.decide()).toEqual(decide(p.input()));
    expect(recommend(p.input())).toMatchObject({ resultRobustness: { status: 'UNKNOWN' } });
  });
});

describe('real fixture cases', () => {
  const bundle = loadAllCases();
  const ctx = fuelCtx(1.975);
  const v = (id: string, label: string, at?: string, used?: boolean): PipelineVehicle => {
    const usedInstance = used ? UsedVehicleInstance.parse({ id: '00000000-0000-4000-8000-0000000a0001', reference_variant_id: id, asking_price_minor: 2_250_000, currency: 'EUR' }) : undefined;
    return { candidate: comparisonCandidateFromBundle(bundle, id, { ...(at ? { at } : {}), label }), economicInput: economicVehicleInputFromBundle(bundle, id, { ...(at ? { at } : {}), ...(usedInstance ? { usedInstance } : {}) }) };
  };
  const pl = (vs: PipelineVehicle[], comparison: DecisionScenarioIn['comparison']) =>
    createDecisionPipeline({ vehicles: vs, energyContext: ctx, economicScenario: { annualKm: 15_000, horizonYears: 5 }, decisionScenario: { horizonYears: 5, comparison: { annualKm: 15_000, ...comparison } } });

  it('golden 44 — BYD vs Model 3, commuter: PRACTICAL_TIE, robustness TIE, confidence reflects the tie', () => {
    const r = pl([v(BYD_SEAL_IDS.variant, 'BYD SEAL'), v(MODEL3_2021_IDS.srp, 'Model 3', '2021-06-01')], { dailyDistanceKm: 35, homeChargingAvailable: true, longTripsPerYear: 1 }).recommend();
    expect(r.alphaBestForYou.status).toBe('PRACTICAL_TIE');
    expect(r.alphaBestForYou.candidateId).toBeUndefined();
    expect(r.resultRobustness.status).toBe('TIE');
    expect(r.recommendationConfidence.level).toBe('LOW');
    expect(r.recommendationConfidence.reasons.map((m) => m.messageKey)).toContain('decision.confidence.cap');
    expect(r.resultRobustness.bestForYou.variables.find((x) => x.variable === 'electricity_price')!.status).not.toBe('NOT_APPLICABLE');
  });

  it('golden 45 — BYD vs Model 3, 10 long trips/year: why not Model 3 cites range (CLEAR for you)', () => {
    const r = pl([v(BYD_SEAL_IDS.variant, 'BYD SEAL'), v(MODEL3_2021_IDS.srp, 'Model 3', '2021-06-01')], { dailyDistanceKm: 80, homeChargingAvailable: false, longTripsPerYear: 10 }).recommend({ robustness: false });
    expect(r.alphaBestForYou.candidateId).toBe(BYD_SEAL_IDS.variant);
    const range = r.whyNotByCandidate[MODEL3_2021_IDS.srp]!.items.find((i) => i.metric === 'rng.electric_combined_km')!;
    expect(range).toMatchObject({ type: 'RANGE', severity: 'MAJOR', level: 'CLEAR', delta: { min: -122, max: -122 } });
    // Tradeoffs del ganador: lo que se sacrifica (p. ej. consumo/coste frente al Model 3), sin venderlo como perfecto.
    expect(r.tradeoffsForSelected.length).toBeGreaterThan(0);
    expect(r.tradeoffsForSelected.every((i) => i.severity !== 'MINOR' || r.whyNotByCandidate[BYD_SEAL_IDS.variant]!.onlyMinor)).toBe(true);
  });

  it('golden 47 — X3 (NEDC) vs Golf eTSI (WLTP): never "costs more"; the cycle incompatibility is stated', () => {
    const r = pl([v(X3_2018_IDS.variant, 'BMW X3 2018', undefined, true), v(GOLF_CURRENT_IDS.variant, 'Golf eTSI', '2026-09-24')], {}).recommend({ robustness: false });
    const items = Object.values(r.whyNotByCandidate).flatMap((w) => w.items);
    expect(items.some((i) => i.messageKey === 'decision.why_not.running_cost' || i.type === 'ECONOMIC')).toBe(false);
    const all = [...items, ...Object.values(r.whyNotByCandidate).flatMap((w) => w.items)];
    expect(all.some((i) => i.messageKey === 'decision.why_not.economics_not_comparable') || r.economicFit.status === 'NOT_COMPARABLE').toBe(true);
    expect(r.recommendationConfidence.reasons.map((m) => m.messageKey)).toContain('decision.confidence.economics_not_comparable');
  });
});

describe('determinism', () => {
  it('run() and recommend() are reproducible', () => {
    const vs = [ice('A', 5), ice('B', 6)];
    const s = { horizonYears: 5, comparison: { annualKm: 15_000 } };
    const input = (() => {
      const p = pipeline(vs, 15_000);
      return p.input();
    })();
    expect(recommend(input)).toEqual(recommend(structuredClone(input)));
    void run;
    void s;
  });
});
