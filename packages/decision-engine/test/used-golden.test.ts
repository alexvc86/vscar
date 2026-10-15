import fc from 'fast-check';
import { comparisonCandidateFromBundle, type ComparisonCandidate } from '@vscar/comparison-engine';
import { economicVehicleInputFromBundle, type EconomicVehicleInputIn } from '@vscar/economics-engine';
import { BYD_SEAL_IDS, GOLF_CURRENT_IDS, MODEL3_2021_IDS, USED_BEV_COMPLETE, USED_EVALUATION_DATE, USED_ICE_HIGH_MILEAGE, X3_2018_IDS, loadAllCases } from '@vscar/fixtures';
import type { UsedVehicleInstanceInput } from '@vscar/vehicle-schema';
import { describe, expect, it } from 'vitest';
import { createDecisionPipeline, type DecisionScenarioIn, type PipelineVehicle } from '../src/index.ts';
import { cand, fuelCtx } from './helpers.ts';

/**
 * Step 8a — casos dorados de negocio con usados. Un solo camino: createDecisionPipeline (Used Adjustment →
 * Economics → Comparison → Decision). La ReferenceVariant es la verdad técnica; el usado solo aporta hechos.
 */
const EVAL = USED_EVALUATION_DATE;
const SYN = fuelCtx(1.65);
const REF_ICE = '00000000-0000-4000-8000-0000000c0001';
const REF_BEV = '00000000-0000-4000-8000-0000000c0002';
const usedId = (n: number) => `00000000-0000-4000-8000-0000000d${String(n).padStart(4, '0')}`;

/** Una ReferenceVariant = UN objeto de hechos (como en el catálogo): nuevo y usados la comparten. */
const refCandidate = (id: string, label: string, powertrainType: 'ICE' | 'BEV'): ComparisonCandidate =>
  cand(label, [['cap.boot_l', 380], ['perf.accel_0_100_s', 9.2], ['war.years', 3]], { id, powertrainType, seats: 5 });
const GOLF_REF = refCandidate(REF_ICE, 'Golf', 'ICE');
const EV_REF = refCandidate(REF_BEV, 'EV', 'BEV');
const listPrice = (eur: number) => ({ amount_minor: eur * 100, currency: 'EUR' as const, status: 'KNOWN' as const, incl_taxes: 'YES' as const });
const iceInput = (id: string, eur: number): EconomicVehicleInputIn => ({ id, market: 'ES', powertrainType: 'ICE', fuelType: 'petrol', fuelConsumptionL100: { min: 5.5, max: 5.5, test_cycle: 'WLTP', mapping_confidence: 'EXACT' }, purchase: { participant: 'NEW', listPrice: listPrice(eur) } });
const bevInput = (id: string, eur: number): EconomicVehicleInputIn => ({ id, market: 'ES', powertrainType: 'BEV', electricConsumptionKwh100: { min: 16, max: 16, test_cycle: 'WLTP', mapping_confidence: 'EXACT', charging_loss_basis: 'UNSPECIFIED' }, purchase: { participant: 'NEW', listPrice: listPrice(eur) } });

const newGolf = (): PipelineVehicle => ({ candidate: GOLF_REF, economicInput: iceInput(REF_ICE, 40_000) });
const usedGolf = (n: number, over: Partial<UsedVehicleInstanceInput> = {}): PipelineVehicle => ({
  ...newGolf(),
  usedInstance: { id: usedId(n), reference_variant_id: REF_ICE, asking_price_minor: 2_800_000, currency: 'EUR', mileage_km: 45_000, registration_date: '2023-06-01', service_history: 'full', accident_history: 'none_declared', owners: 1, warranty_remaining_months: 'unknown', inspection_status: 'valid', condition: 'good', ...over },
});

function run(vehicles: PipelineVehicle[], ds: Omit<DecisionScenarioIn, 'horizonYears'> = {}, energy = SYN) {
  const p = createDecisionPipeline({ vehicles, energyContext: energy, economicScenario: { annualKm: 15_000, horizonYears: 5 }, decisionScenario: { horizonYears: 5, ...ds, comparison: { annualKm: 15_000, ...(ds.comparison ?? {}) } }, evaluationDate: EVAL });
  return { p, input: p.input(), result: p.recommend() };
}
const tech = (r: ReturnType<typeof run>['result'], id: string) => {
  const { candidateId: _c, ...rest } = r.technicalCapability.find((t) => t.candidateId === id)!;
  return rest;
};
const econ = (x: ReturnType<typeof run>['input'], id: string) => x.candidates.find((c) => c.id === id)!.economic!;

describe('new vs used, same ReferenceVariant (40,000 € new vs 28,000 € used)', () => {
  const { input, result } = run([newGolf(), usedGolf(1)]);
  const U = usedId(1);

  it('two subjects with their own identity over ONE ReferenceVariant', () => {
    expect(result.candidates).toEqual([REF_ICE, U].sort());
    expect(result.subjects).toEqual(
      expect.arrayContaining([
        { kind: 'REFERENCE_VARIANT', subjectId: REF_ICE, referenceVariantId: REF_ICE },
        expect.objectContaining({ kind: 'USED_INSTANCE', subjectId: U, referenceVariantId: REF_ICE, usedInstanceId: U }),
      ]),
    );
  });
  it('technical capability is identical (no spec invented or degraded)', () => {
    expect(tech(result, U)).toEqual(tech(result, REF_ICE));
    const pair = input.comparison.pairs[0]!;
    expect(pair.technicalComparisons.filter((m) => m.outcome === 'AHEAD' || m.outcome === 'BEHIND')).toEqual([]);
    expect(input.candidates.find((c) => c.id === U)!.facts).toBe(input.candidates.find((c) => c.id === REF_ICE)!.facts);
  });
  it('the economic difference comes only from the asking price', () => {
    const n = econ(input, REF_ICE);
    const u = econ(input, U);
    expect(n.ownershipCost.purchase).toEqual({ amount_minor: 4_000_000, basis: 'KNOWN', source: 'LIST' });
    expect(u.ownershipCost.purchase).toEqual({ amount_minor: 2_800_000, basis: 'USER_PROVIDED', source: 'USED_ASKING' });
    expect(u.runningCost).toEqual(n.runningCost);
    expect(u.energy).toEqual(n.energy);
    const h = (e: typeof n) => e.ownershipCost.horizons.find((x) => x.years === 5)!.total_minor;
    expect({ min: h(n).min - h(u).min, max: h(n).max - h(u).max }).toEqual({ min: 1_200_000, max: 1_200_000 });
    const be = input.comparison.pairs[0]!.economicComparison.breakEven!;
    expect(be).toMatchObject({ premiumId: REF_ICE, baselineId: U, result: { status: 'NO_BREAK_EVEN', extraPurchase_minor: { min: 1_200_000, max: 1_200_000 } } });
  });
  it('Economic Fit keeps its running-cost contract (tie); the purchase difference is in the known-cost view', () => {
    expect(result.economicFit.status).toBe('PRACTICAL_TIE');
    const own = (id: string) => result.economicFit.candidates.find((c) => c.candidateId === id)!.ownership!.total_minor.min;
    expect(own(REF_ICE) - own(U)).toBe(1_200_000);
  });
  it('used signals only on the used subject', () => {
    expect(result.whyNotByCandidate[REF_ICE]!.items.filter((i) => i.subject === 'USED_INSTANCE')).toEqual([]);
    expect(Object.keys(result.usedAdjustments!)).toEqual([U]);
    expect(result.requiresVerification.filter((v) => v.candidateId === REF_ICE)).toEqual([]);
  });
  it('order symmetry: used vs new ≡ new vs used', () => {
    const swapped = run([usedGolf(1), newGolf()]).result;
    expect(JSON.stringify(swapped)).toBe(JSON.stringify(result));
  });
});

describe('used vs used, different mileage', () => {
  const A = usedId(11);
  const B = usedId(12);
  const low = () => usedGolf(11, { mileage_km: 30_000, registration_date: '2022-10-01' });
  const high = () => usedGolf(12, { mileage_km: 180_000, registration_date: '2022-10-01' });

  it('same technical capability; mileage only shapes ownership signals', () => {
    const { result } = run([low(), high()]);
    expect(tech(result, A)).toEqual(tech(result, B));
    expect(result.usedAdjustments![B]!.ownershipSignals.map((s) => s.signal)).toContain('HIGH_MILEAGE_FOR_AGE');
    expect(result.usedAdjustments![A]!.ownershipSignals.map((s) => s.signal)).not.toContain('HIGH_MILEAGE_FOR_AGE');
    // Información igual de completa: el VALOR del kilometraje no cambia la confianza de información.
    expect(result.usedAdjustments![A]!.informationConfidence.level).toBe(result.usedAdjustments![B]!.informationConfidence.level);
    expect(result.whyNotByCandidate[B]!.items.some((i) => i.type === 'USED_OWNERSHIP' && i.metric === 'HIGH_MILEAGE_FOR_AGE' && i.ruleCode === 'USED_MILEAGE_HIGH_FOR_AGE')).toBe(true);
  });
  it('max mileage deal breaker: 180,000 km FAIL (unit), 30,000 km PASS → only eligible', () => {
    const { result } = run([low(), high()], { comparison: { requirements: { maxMileageKm: 100_000 } } });
    expect(result.practicalFit.find((p) => p.candidateId === B)!.status).toBe('FAIL');
    expect(result.alphaBestForYou).toMatchObject({ status: 'BEST_FOR_YOU', candidateId: A });
    const blocking = result.whyNotByCandidate[B]!.items.find((i) => i.type === 'DEAL_BREAKER')!;
    expect(blocking).toMatchObject({ subject: 'USED_INSTANCE', params: { criterion: 'maxMileageKm', required: 100_000, observedMin: 180_000 } });
  });
  it('symmetric', () => {
    expect(JSON.stringify(run([high(), low()]).result)).toBe(JSON.stringify(run([low(), high()]).result));
  });
});

describe('used deal breakers: UNCONFIRMED, never PASS, never on a new car', () => {
  it('unknown mileage + max mileage → UNCONFIRMED, verified once', () => {
    const U = usedId(21);
    const { input, result } = run([newGolf(), usedGolf(21, { mileage_km: undefined })], { comparison: { requirements: { maxMileageKm: 100_000 } } });
    expect(input.comparison.dealBreakers[U]!.unknownChecks.map((c) => c.message.messageKey)).toEqual(['comparison.requirement.used_unknown']);
    expect(result.practicalFit.find((p) => p.candidateId === U)!.status).toBe('UNCONFIRMED');
    const v = result.requiresVerification.filter((x) => x.candidateId === U);
    expect(v.filter((x) => x.criterion === 'maxMileageKm')).toEqual([expect.objectContaining({ messageKey: 'decision.verify.requirement', mandatory: true, subject: 'USED_INSTANCE' })]);
    expect(v.filter((x) => x.criterion === 'MILEAGE')).toEqual([]);
  });
  it('used-unit requirements do not apply to the new subject', () => {
    const { input } = run([newGolf(), usedGolf(22)], { comparison: { requirements: { maxMileageKm: 100_000, maxAgeYears: 5, minWarrantyRemainingMonths: 12 } } });
    expect(input.comparison.dealBreakers[REF_ICE]!.checks).toEqual([]);
    expect(input.comparison.dealBreakers[usedId(22)]!.checks.map((c) => [c.criterion, c.status])).toEqual([
      ['maxMileageKm', 'PASS'],
      ['maxAgeYears', 'PASS'],
      // Garantía calculada desde la original (3 años − 40 meses = 0): FAIL cierto.
      ['minWarrantyRemainingMonths', 'FAIL'],
    ]);
  });
  it('calculated warranty above the requirement is UNKNOWN (conditions to confirm), never PASS', () => {
    const { input } = run([usedGolf(23, { registration_date: '2026-01-10' })], { comparison: { requirements: { minWarrantyRemainingMonths: 12 } } });
    const c = input.comparison.dealBreakers[usedId(23)]!.checks[0]!;
    expect(c).toMatchObject({ status: 'UNKNOWN', observedValue: { min: 27, max: 27, unit: 'months' }, message: { messageKey: 'comparison.requirement.calculated_unconfirmed' } });
  });
});

describe('Step 8b — must have full service history', () => {
  const req = { comparison: { requirements: { mustHaveFullServiceHistory: true as const } } };
  it('FULL passes, PARTIAL fails, unknown is UNCONFIRMED (verified once); the new car is unaffected', () => {
    const full = run([newGolf(), usedGolf(71)], req).result;
    expect(full.practicalFit.find((p) => p.candidateId === usedId(71))!.status).toBe('PASS');
    const partial = run([newGolf(), usedGolf(72, { service_history: 'partial' })], req).result;
    expect(partial.practicalFit.find((p) => p.candidateId === usedId(72))!.status).toBe('FAIL');
    expect(partial.alphaBestForYou).toMatchObject({ status: 'BEST_FOR_YOU', candidateId: REF_ICE });
    expect(partial.whyNotByCandidate[usedId(72)]!.items[0]).toMatchObject({ type: 'DEAL_BREAKER', subject: 'USED_INSTANCE', params: { criterion: 'mustHaveFullServiceHistory', flag: true } });
    const unknown = run([newGolf(), usedGolf(73, { service_history: 'unknown' })], req).result;
    expect(unknown.practicalFit.find((p) => p.candidateId === usedId(73))!.status).toBe('UNCONFIRMED');
    const v = unknown.requiresVerification.filter((x) => x.candidateId === usedId(73));
    expect(v.filter((x) => x.criterion === 'mustHaveFullServiceHistory')).toHaveLength(1);
    expect(v.filter((x) => x.criterion === 'SERVICE_HISTORY')).toEqual([]);
    expect(full.practicalFit.find((p) => p.candidateId === REF_ICE)!.status).toBe('PASS');
  });
});

describe('BEV battery health known vs unknown (real Model 3 reference)', () => {
  const bundle = loadAllCases();
  const m3 = (used?: UsedVehicleInstanceInput): PipelineVehicle => ({
    candidate: comparisonCandidateFromBundle(bundle, MODEL3_2021_IDS.srp, { label: 'Tesla Model 3', at: '2021-06-01' }),
    economicInput: economicVehicleInputFromBundle(bundle, MODEL3_2021_IDS.srp, { at: '2021-06-01' }),
    ...(used ? { usedInstance: used } : {}),
  });
  const byd = (): PipelineVehicle => ({ candidate: comparisonCandidateFromBundle(bundle, BYD_SEAL_IDS.variant, { label: 'BYD SEAL' }), economicInput: economicVehicleInputFromBundle(bundle, BYD_SEAL_IDS.variant) });
  const REAL = fuelCtx(1.975);
  const req = { comparison: { requirements: { minBatteryHealthPct: 85 } } };
  const known = run([byd(), m3(USED_BEV_COMPLETE)], req, REAL);
  const unknown = run([byd(), m3({ ...USED_BEV_COMPLETE, battery_health_pct: 'unknown' })], req, REAL);
  const reference = run([byd(), m3()], {}, REAL);
  const U = USED_BEV_COMPLETE.id;

  it('the used Model 3 keeps the reference technical capability', () => {
    expect(tech(known.result, U)).toEqual(tech(reference.result, MODEL3_2021_IDS.srp));
    expect(tech(unknown.result, U)).toEqual(tech(reference.result, MODEL3_2021_IDS.srp));
  });
  it('known SOH 91 % passes ≥ 85 %; unknown SOH is UNCONFIRMED and lowers information confidence', () => {
    expect(known.input.comparison.dealBreakers[U]!.checks[0]).toMatchObject({ criterion: 'minBatteryHealthPct', status: 'PASS', observedValue: { min: 91, max: 91, unit: '%' } });
    expect(unknown.result.practicalFit.find((p) => p.candidateId === U)!.status).toBe('UNCONFIRMED');
    expect(known.result.usedAdjustments![U]!.informationConfidence.level).toBe('HIGH');
    expect(unknown.result.usedAdjustments![U]!.informationConfidence.level).toBe('MEDIUM');
  });
  it('the reference warranty is read from usable facts (war.years = 4)', () => {
    expect(known.result.usedAdjustments![U]!.instance.warrantyRemainingMonths).toEqual({ state: 'KNOWN', min: 0, max: 0, basis: 'USER_PROVIDED' });
    const calc = run([m3({ ...USED_BEV_COMPLETE, warranty_remaining_months: 'unknown', registration_date: '2023-06-15' })], {}, REAL).result.usedAdjustments![U]!;
    // 4 años (48 meses) − 39 meses completos (2023-06-15 → 2026-10-14) = 9 meses.
    expect(calc.instance.warrantyRemainingMonths).toMatchObject({ basis: 'CALCULATED', min: 9, max: 9 });
  });
});

describe('ICE: battery health N/A never penalizes (real X3 reference)', () => {
  it('a battery requirement does not apply to a used ICE', () => {
    const bundle = loadAllCases();
    const x3: PipelineVehicle = {
      candidate: comparisonCandidateFromBundle(bundle, X3_2018_IDS.variant, { label: 'BMW X3 2018' }),
      economicInput: economicVehicleInputFromBundle(bundle, X3_2018_IDS.variant),
      usedInstance: USED_ICE_HIGH_MILEAGE,
    };
    const golf: PipelineVehicle = { candidate: comparisonCandidateFromBundle(bundle, GOLF_CURRENT_IDS.variant, { label: 'Golf eTSI', at: '2026-09-24' }), economicInput: economicVehicleInputFromBundle(bundle, GOLF_CURRENT_IDS.variant, { at: '2026-09-24' }) };
    const { input, result } = run([x3, golf], { comparison: { requirements: { minBatteryHealthPct: 80 } } }, fuelCtx(1.975, 1.974));
    const U = USED_ICE_HIGH_MILEAGE.id;
    expect(input.comparison.dealBreakers[U]!.checks).toEqual([]);
    expect(result.usedAdjustments![U]!.informationConfidence.level).toBe('HIGH');
    expect(result.usedAdjustments![U]!.ownershipSignals.map((s) => s.signal)).toEqual(['HIGH_MILEAGE_FOR_AGE', 'NO_REMAINING_WARRANTY', 'SERVICE_HISTORY_INCOMPLETE']);
  });
});

describe('unknown service history: same car, less information', () => {
  it('identical technical and economics; information confidence lower; recommendation confidence never higher', () => {
    const full = run([newGolf(), usedGolf(31)]);
    const unknown = run([newGolf(), usedGolf(31, { service_history: 'unknown' })]);
    const U = usedId(31);
    expect(tech(unknown.result, U)).toEqual(tech(full.result, U));
    expect(econ(unknown.input, U).ownershipCost).toEqual(econ(full.input, U).ownershipCost);
    expect(unknown.result.usedAdjustments![U]!.informationConfidence.score).toBeLessThan(full.result.usedAdjustments![U]!.informationConfidence.score);
    expect(unknown.result.recommendationConfidence.score).toBeLessThanOrEqual(full.result.recommendationConfidence.score);
  });
});

describe('the final criterion: economically attractive, but verify before deciding', () => {
  const newBev = (): PipelineVehicle => ({ candidate: EV_REF, economicInput: bevInput(REF_BEV, 40_000) });
  const usedBev = (over: Partial<UsedVehicleInstanceInput> = {}): PipelineVehicle => ({
    ...newBev(),
    usedInstance: { id: usedId(41), reference_variant_id: REF_BEV, asking_price_minor: 2_800_000, currency: 'EUR', mileage_km: 48_000, registration_date: '2022-09-01', ...over },
  });
  const budget = { comparison: { requirements: { maxPurchasePriceEur: 30_000 } } };
  const U = usedId(41);

  it('fits the budget thanks to its asking price; service history unknown and battery health to verify; confidence limited', () => {
    const { result } = run([newBev(), usedBev()], budget);
    expect(result.practicalFit.find((p) => p.candidateId === REF_BEV)!.status).toBe('FAIL');
    expect(result.alphaBestForYou).toMatchObject({ status: 'BEST_FOR_YOU', candidateId: U });
    const own = (id: string) => result.economicFit.candidates.find((c) => c.candidateId === id)!.ownership!.total_minor.min;
    expect(own(REF_BEV) - own(U)).toBe(1_200_000);
    const checks = result.requiresVerification.filter((v) => v.candidateId === U).map((v) => [v.messageKey, v.criterion]);
    expect(checks).toEqual(expect.arrayContaining([['used.verification.check_service_history', 'SERVICE_HISTORY'], ['used.verification.check_battery_health', 'BATTERY_HEALTH']]));
    expect(result.tradeoffsForSelected.every((i) => i.subject === 'USED_INSTANCE' || i.subject === 'REFERENCE_VARIANT')).toBe(true);
    expect(result.usedInformationConfidence).toBe('LOW');
    expect(result.recommendationConfidence.reasons.map((r) => r.messageKey)).toContain('decision.confidence.used_information');
    // Nada de cifras inventadas: ni probabilidad, ni valor de mercado, ni autonomía degradada.
    const outputs = Object.values(result.usedAdjustments!).map(({ economicAdjustments: { notModelled: _n, ...e }, ...rest }) => ({ ...rest, e }));
    expect(JSON.stringify(outputs)).not.toMatch(/probabilit|reliabilit|marketValue|estimatedRange|repairCost|degradat/i);
  });
  it('knowing the service history and SOH raises the recommendation confidence, not the fit', () => {
    const poor = run([newBev(), usedBev()], budget).result;
    const rich = run([newBev(), usedBev({ service_history: 'full', battery_health_pct: 92, accident_history: 'none_declared', owners: 1, warranty_remaining_months: 'unknown', inspection_status: 'valid', condition: 'good' })], budget).result;
    expect(rich.alphaBestForYou.candidateId).toBe(poor.alphaBestForYou.candidateId);
    expect(rich.alphaBestForYou.alphaFit).toEqual(poor.alphaBestForYou.alphaFit);
    expect(rich.recommendationConfidence.score).toBeGreaterThan(poor.recommendationConfidence.score);
  });
});

describe('invariants (property-based)', () => {
  it('price, mileage, age, history, condition and SOH never change technical capability; a lower asking price never raises the known cost', () => {
    const reference = tech(run([newGolf()]).result, REF_ICE);
    fc.assert(
      fc.property(
        fc.integer({ min: 500_000, max: 6_000_000 }),
        fc.integer({ min: 0, max: 400_000 }),
        fc.integer({ min: 2012, max: 2026 }),
        fc.constantFrom('full', 'partial', 'none', 'unknown'),
        fc.constantFrom('excellent', 'good', 'fair', 'poor', 'unknown'),
        (price, km, year, service, condition) => {
          const v = usedGolf(51, { asking_price_minor: price, mileage_km: km, registration_date: undefined, registration_year: year, service_history: service as 'full', condition: condition as 'good' });
          const a = run([v]);
          expect(tech(a.result, usedId(51))).toEqual(reference);
          const cheaper = run([usedGolf(51, { asking_price_minor: price - 100_000, mileage_km: km, registration_date: undefined, registration_year: year })]);
          const total = (x: typeof a) => econ(x.input, usedId(51)).ownershipCost.horizons.find((h) => h.years === 5)!.total_minor.max;
          expect(total(cheaper)).toBeLessThanOrEqual(total(a));
        },
      ),
      { numRuns: 25 },
    );
  });
  it('guards: a used vehicle needs an explicit evaluation date; subjects need distinct identities', () => {
    expect(() => createDecisionPipeline({ vehicles: [usedGolf(61)], energyContext: SYN, economicScenario: { annualKm: 15_000, horizonYears: 5 }, decisionScenario: { horizonYears: 5 } })).toThrow(/evaluationDate/);
    expect(() => run([usedGolf(62), usedGolf(62)])).toThrow(/duplicate decision subject/);
  });
});
