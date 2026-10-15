import fc from 'fast-check';
import { LEON_EHYBRID_IDS, MODEL3_2021_IDS, USED_BEV_COMPLETE, USED_BEV_LOW_INFO, USED_EVALUATION_DATE, USED_ICE_HIGH_MILEAGE, USED_PHEV_UNKNOWN_HISTORY, X3_2018_IDS } from '@vscar/fixtures';
import { USED_ADJUSTMENT_RULES, isStructuredParamValue, type Message } from '@vscar/methodology';
import type { UsedVehicleInstanceInput } from '@vscar/vehicle-schema';
import { describe, expect, it, vi } from 'vitest';
import {
  adjustUsedVehicle,
  buildUsedOwnershipSignals,
  calculateVehicleAge,
  evaluateUsedInformationConfidence,
  toUsedComparisonCandidate,
  toUsedEconomicInput,
  USED_MESSAGE_PARAM_SCHEMA,
  USED_MESSAGE_TEMPLATES,
  type ReferenceContext,
  type UsedAdjustmentResult,
} from '../src/index.ts';

const EVAL = USED_EVALUATION_DATE;
const BEV: ReferenceContext = { referenceVariantId: MODEL3_2021_IDS.srp, powertrainType: 'BEV', market: 'ES', originalWarranty: { years: 4, valueIds: [] } };
const ICE: ReferenceContext = { referenceVariantId: X3_2018_IDS.variant, powertrainType: 'ICE', market: 'ES', originalWarranty: { years: 3, valueIds: [] } };
const PHEV: ReferenceContext = { referenceVariantId: LEON_EHYBRID_IDS.variant, powertrainType: 'PHEV', market: 'ES', originalWarranty: { years: 3, valueIds: [] } };
const SYN_ID = '00000000-0000-4000-8000-0000000a0101';
const SYN_ICE: ReferenceContext = { referenceVariantId: SYN_ID, powertrainType: 'ICE', market: 'ES' };

const unit = (over: Partial<UsedVehicleInstanceInput> = {}, ref: ReferenceContext = SYN_ICE): UsedVehicleInstanceInput => ({
  id: '00000000-0000-4000-8000-0000000b0001',
  reference_variant_id: ref.referenceVariantId,
  asking_price_minor: 2_000_000,
  currency: 'EUR',
  ...over,
});
const adjust = (instance: UsedVehicleInstanceInput, reference: ReferenceContext = SYN_ICE, evaluationDate = EVAL) => adjustUsedVehicle({ reference, instance, evaluationDate });
const codes = (r: UsedAdjustmentResult) => r.ownershipSignals.map((s) => s.signal);
const checks = (r: UsedAdjustmentResult) => r.verificationRequirements.map((v) => v.check);

/** Todos los `Message` alcanzables de un valor. */
function messages(v: unknown, out: Message[] = []): Message[] {
  if (Array.isArray(v)) v.forEach((x) => messages(x, out));
  else if (v && typeof v === 'object') {
    const o = v as Record<string, unknown>;
    if (typeof o.messageKey === 'string') out.push(o as unknown as Message);
    for (const x of Object.values(o)) messages(x, out);
  }
  return out;
}
function keysDeep(v: unknown, out = new Set<string>()): Set<string> {
  if (Array.isArray(v)) v.forEach((x) => keysDeep(x, out));
  else if (v && typeof v === 'object')
    for (const [k, x] of Object.entries(v)) {
      out.add(k);
      keysDeep(x, out);
    }
  return out;
}

describe('age (explicit evaluation date, never the clock)', () => {
  it('registration date → whole months', () => {
    expect(calculateVehicleAge({ registrationDate: '2021-06-15' }, '2026-10-14')).toEqual({ months: { state: 'KNOWN', min: 63, max: 63, basis: 'CALCULATED' }, source: 'REGISTRATION_DATE' });
    expect(calculateVehicleAge({ registrationDate: '2021-06-14' }, '2026-10-14').months).toMatchObject({ min: 64, max: 64 });
  });
  it('registration year only → honest range, no assumed month', () => {
    expect(calculateVehicleAge({ registrationYear: 2025 }, '2026-10-14')).toEqual({ months: { state: 'KNOWN', min: 9, max: 21, basis: 'CALCULATED' }, source: 'REGISTRATION_YEAR' });
  });
  it('Step 8b — registration month/year → range at the declared precision (never an assumed day)', () => {
    expect(calculateVehicleAge({ registrationYear: 2019, registrationMonth: 3 }, '2026-10-14').months).toEqual({ state: 'KNOWN', min: 90, max: 91, basis: 'CALCULATED' });
    expect(calculateVehicleAge({ registrationYear: 2026, registrationMonth: 11 }, '2026-10-14')).toMatchObject({ months: { state: 'UNKNOWN' }, invalid: 'REGISTRATION_AFTER_EVALUATION' });
    const r = adjust(unit({ registration_year: 2019, registration_month: 3, mileage_km: 84_000 }));
    expect(r.instance.age).toMatchObject({ source: 'REGISTRATION_YEAR', months: { min: 90, max: 91 } });
    expect(r.informationConfidence.fields.find((f) => f.field === 'registration_year')!.state).toBe('KNOWN');
  });
  it('Step 8b — service history becomes a practical fact (unknown ≠ absent)', () => {
    expect(adjust(unit({ service_history: 'partial' })).practicalSignals.serviceHistory).toEqual({ state: 'KNOWN', value: 'PARTIAL', basis: 'USER_PROVIDED' });
    expect(adjust(unit()).practicalSignals.serviceHistory).toEqual({ state: 'UNKNOWN' });
  });
  it('nothing explicit → UNKNOWN (no model year, no assumed year)', () => {
    expect(calculateVehicleAge({}, EVAL)).toEqual({ months: { state: 'UNKNOWN' }, source: 'NONE' });
    const r = adjust(unit({ registration_year_assumed: 2019 }));
    expect(r.instance.age.months.state).toBe('UNKNOWN');
    expect(r.instance.registrationYearAssumed).toBe(2019);
    expect(r.warnings.map((w) => w.ruleCode)).toContain('USED_ASSUMED_REGISTRATION_NOT_USED');
  });
  it('registration after the evaluation date → UNKNOWN + warning, never a negative age', () => {
    const r = adjust(unit({ registration_date: '2027-01-01', mileage_km: 1000 }));
    expect(r.instance.age).toMatchObject({ months: { state: 'UNKNOWN' }, invalid: 'REGISTRATION_AFTER_EVALUATION' });
    expect(r.warnings.map((w) => w.messageKey)).toContain('used.warning.registration_after_evaluation');
    expect(r.informationConfidence.fields.find((f) => f.field === 'registration_year')!.state).toBe('UNKNOWN');
  });
  it('the system clock does not change the result', () => {
    const a = adjust(USED_BEV_COMPLETE, BEV);
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2031-01-01T00:00:00Z'));
    const b = adjust(USED_BEV_COMPLETE, BEV);
    vi.useRealTimers();
    expect(b).toEqual(a);
  });
});

describe('mileage relative to age (threshold from versioned methodology)', () => {
  const R = USED_ADJUSTMENT_RULES.mileage_for_age;
  it('the reference lives in methodology, not in the engine', () => {
    expect(R.reference_annual_km.ES).toBe(15_000);
    expect(USED_ADJUSTMENT_RULES.provisional).toBe(true);
  });
  it('2 years / 90,000 km → HIGH_MILEAGE_FOR_AGE with raw params', () => {
    const r = adjust(unit({ registration_date: '2024-09-01', mileage_km: 90_000 }));
    const s = r.ownershipSignals.find((x) => x.signal === 'HIGH_MILEAGE_FOR_AGE')!;
    expect(s).toMatchObject({ nature: 'ATTENTION', ruleCode: 'USED_MILEAGE_HIGH_FOR_AGE', sourceFields: ['mileage_km', 'registration_date'] });
    expect(s.params).toMatchObject({ mileageKm: 90_000, ageMonthsMin: 25, ageMonthsMax: 25, annualKmMin: 43_200, annualKmMax: 43_200, referenceAnnualKm: 15_000, thresholdAnnualKm: 22_500 });
  });
  it('100,000 km in 10 years ≠ 100,000 km in 2 years', () => {
    expect(codes(adjust(unit({ registration_date: '2016-10-01', mileage_km: 100_000 })))).not.toContain('HIGH_MILEAGE_FOR_AGE');
    expect(codes(adjust(unit({ registration_date: '2024-10-01', mileage_km: 100_000 })))).toContain('HIGH_MILEAGE_FOR_AGE');
  });
  it('low mileage for age is a NOTE, not a judgement', () => {
    const s = adjust(unit({ registration_date: '2023-10-01', mileage_km: 10_000 })).ownershipSignals.find((x) => x.signal === 'LOW_MILEAGE_FOR_AGE')!;
    expect(s.nature).toBe('NOTE');
  });
  it('under 12 months, or an age range that straddles the threshold → no relative signal', () => {
    expect(codes(adjust(unit({ registration_date: '2026-03-01', mileage_km: 40_000 })))).not.toContain('HIGH_MILEAGE_FOR_AGE');
    // Año 2024 → 21–33 meses → 18.182–28.571 km/año: cruza 22.500 → no se afirma nada.
    const r = adjust(unit({ registration_year: 2024, mileage_km: 50_000 }));
    expect(codes(r).filter((c) => c.endsWith('_FOR_AGE'))).toEqual([]);
  });
  it('mileage never changes technical facts or the reference (no mutation)', () => {
    const ref = structuredClone(BEV);
    const inst = structuredClone(USED_BEV_COMPLETE);
    adjust(inst, ref);
    expect(ref).toEqual(BEV);
    expect(inst).toEqual(USED_BEV_COMPLETE);
    expect([...keysDeep(adjust(inst, ref))].filter((k) => /range|consumption|power|boot|wltp/i.test(k))).toEqual([]);
  });
});

describe('powertrain-aware information (N/A ≠ missing)', () => {
  it('ICE: battery health is NOT_APPLICABLE and does not penalize', () => {
    const r = adjust(USED_ICE_HIGH_MILEAGE, ICE);
    expect(r.practicalSignals.batteryHealthPct).toEqual({ state: 'NOT_APPLICABLE' });
    expect(r.informationConfidence.fields.find((f) => f.field === 'battery_health')).toMatchObject({ state: 'NOT_APPLICABLE', relevance: 0 });
    expect(r.informationConfidence.level).toBe('HIGH');
    expect(codes(r).filter((c) => c.startsWith('BATTERY'))).toEqual([]);
  });
  it('ICE with a battery value: ignored with a warning', () => {
    const r = adjust({ ...USED_ICE_HIGH_MILEAGE, battery_health_pct: 80 }, ICE);
    expect(r.practicalSignals.batteryHealthPct.state).toBe('NOT_APPLICABLE');
    expect(r.warnings.map((w) => w.ruleCode)).toContain('USED_BATTERY_HEALTH_NOT_APPLICABLE');
  });
  it('BEV: unknown battery health → INFORMATION_GAP, verification, confidence capped at MEDIUM', () => {
    const complete = adjust(USED_BEV_COMPLETE, BEV);
    const noSoh = adjust({ ...USED_BEV_COMPLETE, battery_health_pct: 'unknown' }, BEV);
    expect(complete.informationConfidence.level).toBe('HIGH');
    expect(noSoh.informationConfidence.level).toBe('MEDIUM');
    expect(noSoh.informationConfidence.reasons[0]).toMatchObject({ messageKey: 'used.information_confidence.capped', ruleCode: 'USED_INFO_POWERTRAIN_CAP' });
    expect(noSoh.ownershipSignals.find((s) => s.signal === 'BATTERY_HEALTH_UNKNOWN')!.nature).toBe('INFORMATION_GAP');
    expect(checks(noSoh)).toContain('BATTERY_HEALTH');
  });
  it('PHEV: unknown battery health matters (relevance 2) but does not cap', () => {
    const r = adjust(USED_PHEV_UNKNOWN_HISTORY, PHEV);
    expect(r.informationConfidence.fields.find((f) => f.field === 'battery_health')).toMatchObject({ state: 'UNKNOWN', relevance: 2 });
    expect(r.informationConfidence.reasons.map((x) => x.ruleCode)).not.toContain('USED_INFO_POWERTRAIN_CAP');
  });
  it('battery health is preserved as an observation, never converted into range', () => {
    const r = adjust(USED_BEV_COMPLETE, BEV);
    expect(r.ownershipSignals.find((s) => s.signal === 'BATTERY_HEALTH_REPORTED')).toMatchObject({ nature: 'NOTE', params: { batteryHealthPct: 91 } });
    expect(USED_ADJUSTMENT_RULES.battery_health.derive_range_from_soh).toBe(false);
  });
  it('low battery health: variant warranted minimum when known, methodology default otherwise', () => {
    const def = adjust({ ...USED_BEV_COMPLETE, battery_health_pct: 65 }, BEV).ownershipSignals.find((s) => s.signal === 'BATTERY_HEALTH_LOW')!;
    expect(def.params).toMatchObject({ batteryHealthPct: 65, thresholdPct: 70, thresholdBasis: 'METHODOLOGY_DEFAULT' });
    const variant = adjust({ ...USED_BEV_COMPLETE, battery_health_pct: 72 }, { ...BEV, batteryWarrantedMinSohPct: { pct: 75 } }).ownershipSignals.find((s) => s.signal === 'BATTERY_HEALTH_LOW')!;
    expect(variant.params).toMatchObject({ thresholdPct: 75, thresholdBasis: 'VARIANT_WARRANTY' });
    expect(variant.sourceFields).toContain('reference:bat.warranty_soh_pct');
  });
});

describe('Used Information Confidence (how much we know, not how good the car is)', () => {
  it('asking price only → LOW, critical reasons first', () => {
    const r = adjust(USED_BEV_LOW_INFO, BEV);
    expect(r.informationConfidence.level).toBe('LOW');
    expect(r.informationConfidence.reasons[0]).toMatchObject({ messageKey: 'used.information_confidence.missing_mileage', params: { field: 'mileage', critical: true }, ruleCode: 'USED_INFO_CRITICAL_UNKNOWN', sourceFields: ['mileage_km'] });
    expect(r.informationConfidence.requiresVerification).toBe(true);
  });
  it('complete relevant data → HIGH, no verification needed', () => {
    const r = adjust(USED_BEV_COMPLETE, BEV);
    expect(r.informationConfidence).toMatchObject({ level: 'HIGH', requiresVerification: false });
    expect(r.informationConfidence.reasons.map((x) => x.messageKey)).toEqual(['used.information_confidence.complete']);
    expect(r.informationConfidence.summary.params).toMatchObject({ level: 'HIGH', knownCount: 10, relevantCount: 10, notApplicableCount: 0 });
  });
  it('unknown ≠ bad: unknowns are INFORMATION_GAP signals, never ATTENTION', () => {
    const r = adjust(USED_BEV_LOW_INFO, BEV);
    expect(r.ownershipSignals.every((s) => s.nature === 'INFORMATION_GAP')).toBe(true);
    expect(r.ownershipSignals.every((s) => s.basis === 'UNKNOWN')).toBe(true);
  });
  it('a high but known mileage does not change information confidence', () => {
    const a = evaluateUsedInformationConfidence({ reference: ICE, instance: { ...USED_ICE_HIGH_MILEAGE, mileage_km: 20_000 }, evaluationDate: EVAL });
    const b = evaluateUsedInformationConfidence({ reference: ICE, instance: { ...USED_ICE_HIGH_MILEAGE, mileage_km: 300_000 }, evaluationDate: EVAL });
    expect(a.level).toBe(b.level);
    expect(a.score).toBe(b.score);
  });
  it('property: unknown → known never lowers the level', () => {
    const rank = { LOW: 0, MEDIUM: 1, HIGH: 2 } as const;
    const knownValue: Partial<UsedVehicleInstanceInput> = {
      mileage_km: 50_000,
      registration_date: '2020-01-01',
      service_history: 'partial',
      accident_history: 'declared',
      owners: 3,
      warranty_remaining_months: 6,
      inspection_status: 'expired',
      condition: 'fair',
      battery_health_pct: 88,
    };
    const fields = Object.keys(knownValue) as (keyof UsedVehicleInstanceInput)[];
    fc.assert(
      fc.property(fc.subarray(fields), fc.constantFrom(...fields), fc.constantFrom('ICE', 'HEV', 'PHEV', 'BEV') as fc.Arbitrary<ReferenceContext['powertrainType']>, (knownSet, extra, pt) => {
        const ref = { ...SYN_ICE, powertrainType: pt };
        const make = (ks: readonly string[]) => unit(Object.fromEntries(ks.map((k) => [k, knownValue[k as keyof UsedVehicleInstanceInput]])));
        const before = evaluateUsedInformationConfidence({ reference: ref, instance: make(knownSet), evaluationDate: EVAL });
        const after = evaluateUsedInformationConfidence({ reference: ref, instance: make([...knownSet, extra]), evaluationDate: EVAL });
        expect(rank[after.level]).toBeGreaterThanOrEqual(rank[before.level]);
        expect(after.informationCompleteness).toBeGreaterThanOrEqual(before.informationCompleteness);
      }),
    );
  });
});

describe('ownership signals and verification requirements', () => {
  it('warranty: declared 0 → NO_REMAINING_WARRANTY (user provided), no verification', () => {
    const r = adjust(USED_BEV_COMPLETE, BEV);
    expect(r.ownershipSignals.find((s) => s.signal === 'NO_REMAINING_WARRANTY')).toMatchObject({ basis: 'USER_PROVIDED', params: { basis: 'USER_PROVIDED' } });
    expect(checks(r)).not.toContain('WARRANTY');
  });
  it('warranty calculated from the original warranty: limited → signal + verify conditions', () => {
    const r = adjust(unit({ registration_date: '2023-03-01', mileage_km: 40_000 }, BEV), BEV);
    expect(r.practicalSignals.warrantyRemainingMonths).toEqual({ state: 'KNOWN', min: 5, max: 5, basis: 'CALCULATED' });
    expect(r.ownershipSignals.find((s) => s.signal === 'LIMITED_WARRANTY')).toMatchObject({ basis: 'CALCULATED', sourceFields: ['reference:war.years', 'registration_date'] });
    expect(r.verificationRequirements.find((v) => v.check === 'WARRANTY')).toMatchObject({ messageKey: 'used.verification.check_warranty', params: { basis: 'CALCULATED', warrantyRemainingMonthsMin: 5 } });
    // No cuenta como dato conocido de la unidad (las condiciones pueden haberla anulado).
    expect(r.informationConfidence.fields.find((f) => f.field === 'warranty_remaining')!.state).toBe('UNKNOWN');
  });
  it('original warranty km limit exceeded → expired with certainty', () => {
    const r = adjust(unit({ registration_date: '2025-01-01', mileage_km: 120_000 }, BEV), { ...BEV, originalWarranty: { years: 4, km: 100_000, valueIds: [] } });
    expect(r.practicalSignals.warrantyRemainingMonths).toMatchObject({ min: 0, max: 0, basis: 'CALCULATED' });
    expect(codes(r)).toContain('NO_REMAINING_WARRANTY');
    expect(checks(r)).not.toContain('WARRANTY');
  });
  it('service history: unknown = gap; partial = attention (qualitative only)', () => {
    expect(adjust(USED_PHEV_UNKNOWN_HISTORY, PHEV).ownershipSignals.find((s) => s.signal === 'SERVICE_HISTORY_UNKNOWN')!.nature).toBe('INFORMATION_GAP');
    const partial = adjust(USED_ICE_HIGH_MILEAGE, ICE).ownershipSignals.find((s) => s.signal === 'SERVICE_HISTORY_INCOMPLETE')!;
    expect(partial).toMatchObject({ nature: 'ATTENTION', params: { history: 'PARTIAL' } });
  });
  it('known damage → signal + verification, never a repair cost', () => {
    const r = adjust(unit({ accident_history: 'declared' }));
    expect(codes(r)).toContain('ACCIDENT_DAMAGE_DECLARED');
    expect(checks(r)).toContain('DAMAGE_REPAIR');
    const amounts = messages(r).filter((m) => Object.keys(m.params).some((k) => /Minor$/.test(k)));
    expect(amounts.map((m) => m.messageKey)).toEqual(['used.economic.asking_price_used']);
  });
  it('condition: fair/poor or expired ITV = KNOWN_ISSUES; unknown = unconfirmed (not bad)', () => {
    expect(adjust(unit({ condition: 'fair' })).instance.condition).toBe('KNOWN_ISSUES');
    expect(adjust(unit({ inspection_status: 'expired', condition: 'good' })).instance.condition).toBe('KNOWN_ISSUES');
    expect(adjust(unit({ inspection_status: 'valid' })).instance.condition).toBe('KNOWN_GOOD');
    const u = adjust(unit());
    expect(u.instance.condition).toBe('UNKNOWN');
    expect(u.ownershipSignals.find((s) => s.signal === 'CONDITION_UNCONFIRMED')!.nature).toBe('INFORMATION_GAP');
  });
  it('signals are ordered: attention → information gaps → notes', () => {
    const order = { ATTENTION: 0, INFORMATION_GAP: 1, NOTE: 2 };
    const natures = adjust({ ...USED_BEV_COMPLETE, service_history: 'unknown', accident_history: 'declared' }, BEV).ownershipSignals.map((s) => order[s.nature]);
    expect(natures).toEqual([...natures].sort());
  });
  it('the public views equal the full adjustment', () => {
    const input = { reference: PHEV, instance: USED_PHEV_UNKNOWN_HISTORY, evaluationDate: EVAL };
    const full = adjustUsedVehicle(input);
    expect(buildUsedOwnershipSignals(input)).toEqual(full.ownershipSignals);
    expect(evaluateUsedInformationConfidence(input)).toEqual(full.informationConfidence);
  });
});

describe('asking price → effective purchase price (no market value, no depreciation)', () => {
  it('asking price is the effective purchase price (user provided)', () => {
    const r = adjust(USED_BEV_COMPLETE, BEV);
    expect(r.economicAdjustments.purchase).toMatchObject({ status: 'AVAILABLE', effectivePurchasePrice: { amount_minor: 2_450_000, currency: 'EUR', basis: 'USER_PROVIDED' }, ruleCode: 'USED_PRICE_ASKING_OVERRIDE' });
    expect(r.economicAdjustments.notModelled).toEqual(expect.arrayContaining(['MARKET_VALUE', 'DEPRECIATION', 'MAINTENANCE_FORECAST', 'FAILURE_PROBABILITY', 'RANGE_DEGRADATION']));
  });
  it('missing or foreign-currency asking price → unavailable (never the original list price)', () => {
    const missing = adjust(unit({ asking_price_minor: undefined, currency: undefined }));
    expect(missing.economicAdjustments.purchase).toMatchObject({ status: 'UNAVAILABLE', ruleCode: 'USED_PRICE_ASKING_MISSING' });
    expect(codes(missing)).toContain('ASKING_PRICE_MISSING');
    const usd = adjust(unit({ currency: 'USD' }));
    expect(usd.economicAdjustments.purchase).toMatchObject({ status: 'UNAVAILABLE', ruleCode: 'USED_PRICE_CURRENCY_MISMATCH' });
    expect(usd.informationConfidence.fields.find((f) => f.field === 'asking_price')!.state).toBe('UNKNOWN');
  });
  it('economic adapter: USED participant + asking price, own subject id, no mutation', () => {
    const r = adjust(USED_BEV_COMPLETE, BEV);
    const input = Object.freeze({ id: BEV.referenceVariantId, market: 'ES' as const, powertrainType: 'BEV' as const, purchase: Object.freeze({ participant: 'NEW' as const, listPrice: { amount_minor: 4_990_000, currency: 'EUR' as const, status: 'KNOWN' as const } }) });
    const out = toUsedEconomicInput(input, r);
    expect(out.id).toBe(USED_BEV_COMPLETE.id);
    expect(out.purchase).toEqual({ participant: 'USED', usedAskingPrice: { amount_minor: 2_450_000, currency: 'EUR', status: 'USER_PROVIDED', label: 'used asking price' } });
    const original = toUsedEconomicInput({ ...input, purchase: { participant: 'USED', listPrice: input.purchase.listPrice } }, r);
    expect(original.purchase.listPrice).toEqual(input.purchase.listPrice);
  });
});

describe('subject identity and ReferenceVariant linkage', () => {
  it('USED_INSTANCE subject points to exactly one ReferenceVariant', () => {
    const r = adjust(USED_BEV_COMPLETE, BEV);
    expect(r.subject).toMatchObject({ kind: 'USED_INSTANCE', subjectId: USED_BEV_COMPLETE.id, usedInstanceId: USED_BEV_COMPLETE.id, referenceVariantId: MODEL3_2021_IDS.srp });
    expect(r.subject.usedFacts).toBe(r.practicalSignals);
    expect(() => adjust(USED_BEV_COMPLETE, ICE)).toThrow(/points to reference variant/);
  });
  it('candidate adapter keeps the reference facts and only changes identity', () => {
    const facts = Object.freeze({ 'cap.boot_l': [] });
    const cand = { id: MODEL3_2021_IDS.srp, label: 'Tesla Model 3', facts };
    const r = adjust(USED_BEV_COMPLETE, BEV);
    const used = toUsedComparisonCandidate(cand, r);
    expect(used).toEqual({ ...cand, id: USED_BEV_COMPLETE.id, subject: r.subject });
    expect(used.facts).toBe(facts);
    expect(cand.id).toBe(MODEL3_2021_IDS.srp);
    expect(() => toUsedComparisonCandidate({ ...cand, id: X3_2018_IDS.variant }, r)).toThrow();
  });
});

describe('message contract (messageKey + params, no formatting, no fallback dependency)', () => {
  const all = [USED_BEV_COMPLETE, USED_BEV_LOW_INFO, USED_PHEV_UNKNOWN_HISTORY].map((u, i) => adjust(u, [BEV, BEV, PHEV][i]!));
  all.push(adjust(USED_ICE_HIGH_MILEAGE, ICE), adjust(unit({ accident_history: 'declared', condition: 'poor', currency: 'USD', registration_year_assumed: 2020, battery_health_pct: 50 })));
  const emitted = all.flatMap((r) => messages(r));
  it('every key has a fallback template and a param schema (and vice versa)', () => {
    expect(Object.keys(USED_MESSAGE_PARAM_SCHEMA).sort()).toEqual(Object.keys(USED_MESSAGE_TEMPLATES).sort());
    for (const k of Object.keys(USED_MESSAGE_TEMPLATES)) expect(k.startsWith('used.')).toBe(true);
  });
  it('emitted messages carry their required params as structured data', () => {
    for (const m of emitted) {
      for (const p of USED_MESSAGE_PARAM_SCHEMA[m.messageKey]!) expect(m.params[p], `${m.messageKey}.${p}`).not.toBeUndefined();
      for (const [k, v] of Object.entries(m.params)) expect(isStructuredParamValue(v), `${m.messageKey}.${k}=${String(v)}`).toBe(true);
      expect(m.text).not.toMatch(/undefined|NaN|\?\s/);
    }
  });
  it('messageContract lists exactly the emitted keys', () => {
    for (const r of all) expect(r.messageContract.keys).toEqual([...new Set(messages(r).map((m) => m.messageKey))].sort());
  });
  it('every traced item names a stable rule code and its source fields', () => {
    for (const r of all) for (const t of [...r.ownershipSignals, ...r.verificationRequirements, ...r.informationConfidence.reasons, ...r.warnings, r.economicAdjustments.purchase]) {
      expect(t.ruleCode).toMatch(/^USED_[A-Z_]+$/);
      expect(Array.isArray(t.sourceFields)).toBe(true);
    }
  });
});

describe('no black box: no used score, probability, market value or degradation', () => {
  it('no forbidden output fields', () => {
    const r = adjust({ ...USED_BEV_COMPLETE, battery_health_pct: 80 }, BEV);
    const forbidden = [...keysDeep(r)].filter((k) => /usedScore|probabilit|reliabilit|marketValue|depreciat|resale|repairCost|maintenanceCost|degradat|estimatedRange|failure/i.test(k));
    expect(forbidden).toEqual([]);
    expect(JSON.stringify(r)).not.toMatch(/"\d{1,3} ?%? ?(reliable|chance)/i);
  });
});

describe('determinism and performance', () => {
  it('same reference + instance + methodology + date → same result and hash', () => {
    const a = adjust(USED_PHEV_UNKNOWN_HISTORY, PHEV);
    const shuffled = Object.fromEntries(Object.entries(USED_PHEV_UNKNOWN_HISTORY).reverse()) as UsedVehicleInstanceInput;
    const b = adjust(shuffled, { ...PHEV });
    expect(b).toEqual(a);
    expect(b.adjustmentHash).toBe(a.adjustmentHash);
    expect(adjust(USED_PHEV_UNKNOWN_HISTORY, PHEV, '2027-10-14').adjustmentHash).not.toBe(a.adjustmentHash);
  });
  it('< 5 ms per typical instance (p95)', () => {
    const cases: [UsedVehicleInstanceInput, ReferenceContext][] = [[USED_BEV_COMPLETE, BEV], [USED_BEV_LOW_INFO, BEV], [USED_ICE_HIGH_MILEAGE, ICE], [USED_PHEV_UNKNOWN_HISTORY, PHEV]];
    for (let i = 0; i < 50; i++) adjust(...cases[i % 4]!);
    const times: number[] = [];
    for (let i = 0; i < 2000; i++) {
      const t = performance.now();
      adjust(...cases[i % 4]!);
      times.push(performance.now() - t);
    }
    times.sort((x, y) => x - y);
    const p50 = times[Math.floor(times.length * 0.5)]!;
    const p95 = times[Math.floor(times.length * 0.95)]!;
    console.info(`used adjustment p50 ${p50.toFixed(3)} ms · p95 ${p95.toFixed(3)} ms`);
    expect(p95).toBeLessThan(5);
  });
});
