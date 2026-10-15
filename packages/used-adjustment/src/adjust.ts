import { METHODOLOGY_VERSION, USED_ADJUSTMENT_RULES as R, decisionRelevance, methodologyFingerprint, usedInformationConfidence, type Message, type MessageParams } from '@vscar/methodology';
import { USED_INFORMATION_FIELDS, UsedVehicleInstance, type UsedFactBasis, type UsedInformationField, type UsedNumericFact, type UsedSubjectFacts } from '@vscar/vehicle-schema';
import { calculateVehicleAge } from './age.ts';
import type {
  OwnershipSignal,
  OwnershipSignalCode,
  ReferenceContext,
  SignalNature,
  Traced,
  UsedAdjustmentInput,
  UsedAdjustmentResult,
  UsedEconomicAdjustments,
  UsedInformationConfidence,
  UsedReason,
  UsedRuleCode,
  UsedSourceField,
  UsedVehicleInstanceSummary,
  UsedVerificationRequirement,
  UsedWarning,
  VehicleAge,
  VerificationCheck,
} from './contracts.ts';
import { MISSING_KEY, umessage } from './messages.ts';

/**
 * Used Adjustment v0.1 (Step 8a). Puro y determinista: misma ReferenceVariant + misma instancia + misma
 * metodología + misma fecha de evaluación → mismo resultado. Nunca muta la variante ni sus specs; nunca
 * produce puntuaciones, probabilidades, valores de mercado, depreciación, costes de reparación ni autonomía
 * degradada. Lo desconocido es INFORMATION_GAP (≠ malo); lo que no aplica es NOT_APPLICABLE (≠ desconocido).
 */
export const USED_ADJUSTMENT_ENGINE_VERSION = '0.1.0';

const MARKET_CURRENCY = { ES: 'EUR' } as const;
const PLUGIN: ReadonlySet<string> = new Set(R.battery_health.applies_to);
const NATURE_RANK: Record<SignalNature, number> = { ATTENTION: 0, INFORMATION_GAP: 1, NOTE: 2 };

const known = (min: number, max = min, basis: UsedFactBasis = 'USER_PROVIDED'): UsedNumericFact => ({ state: 'KNOWN', min, max, basis });
const UNKNOWN: UsedNumericFact = { state: 'UNKNOWN' };
const NOT_APPLICABLE: UsedNumericFact = { state: 'NOT_APPLICABLE' };

function traced<T extends Message>(m: T, ruleCode: UsedRuleCode, sourceFields: readonly UsedSourceField[]): T & Traced {
  return { ...m, ruleCode, sourceFields };
}

/** Campo de información → campos de origen de la instancia. */
const FIELD_SOURCE: Readonly<Record<UsedInformationField, readonly UsedSourceField[]>> = {
  asking_price: ['asking_price_minor', 'currency'],
  mileage: ['mileage_km'],
  registration_year: ['registration_date', 'registration_year'],
  service_history: ['service_history'],
  accident_history: ['accident_history'],
  owners: ['owners'],
  warranty_remaining: ['warranty_remaining_months'],
  inspection_status: ['inspection_status'],
  condition: ['condition'],
  battery_health: ['battery_health_pct'],
};

const ageSource = (age: VehicleAge): UsedSourceField[] => (age.source === 'REGISTRATION_DATE' ? ['registration_date'] : age.source === 'REGISTRATION_YEAR' ? ['registration_year'] : []);

/** Garantía restante: declarada (USER_PROVIDED) > calculada desde la original (CALCULATED, catálogo §16) > UNKNOWN. */
function warrantyRemaining(u: UsedVehicleInstance, ref: ReferenceContext, age: VehicleAge, mileage: UsedNumericFact): { fact: UsedNumericFact; sourceFields: UsedSourceField[] } {
  if (u.warranty_remaining_months !== 'unknown') return { fact: known(u.warranty_remaining_months), sourceFields: ['warranty_remaining_months'] };
  const ow = ref.originalWarranty;
  if (R.warranty.calculate_from_original && ow?.years !== undefined && age.months.state === 'KNOWN') {
    const total = ow.years * 12;
    let min = Math.max(0, total - age.months.max);
    let max = Math.max(0, total - age.months.min);
    const sourceFields: UsedSourceField[] = ['reference:war.years', ...ageSource(age)];
    // Superado el límite de km de la garantía original: expirada con certeza.
    if (ow.km !== undefined && mileage.state === 'KNOWN' && mileage.min >= ow.km) {
      min = 0;
      max = 0;
      sourceFields.push('reference:war.km', 'mileage_km');
    }
    return { fact: known(min, max, 'CALCULATED'), sourceFields };
  }
  return { fact: UNKNOWN, sourceFields: ['warranty_remaining_months'] };
}

function summarize(u: UsedVehicleInstance, ref: ReferenceContext, evaluationDate: string, age: VehicleAge, f: UsedSubjectFacts, priceUsable: boolean): UsedVehicleInstanceSummary {
  const issues = u.inspection_status === 'expired' || (R.condition.issues as readonly string[]).includes(u.condition);
  const good = !issues && ((R.condition.good as readonly string[]).includes(u.condition) || u.inspection_status === 'valid');
  return {
    usedInstanceId: u.id,
    referenceVariantId: ref.referenceVariantId,
    evaluationDate,
    ...(u.observed_at ? { observedAt: u.observed_at } : {}),
    age,
    ...(u.registration_year_assumed !== undefined ? { registrationYearAssumed: u.registration_year_assumed } : {}),
    mileageKm: f.mileageKm,
    askingPrice: priceUsable ? { state: 'KNOWN', amount_minor: u.asking_price_minor!, currency: 'EUR' } : { state: 'UNKNOWN' },
    warrantyRemainingMonths: f.warrantyRemainingMonths,
    batteryHealthPct: f.batteryHealthPct,
    serviceHistory: u.service_history === 'unknown' ? 'UNKNOWN' : (u.service_history.toUpperCase() as 'FULL' | 'PARTIAL' | 'NONE'),
    accidentHistory: u.accident_history === 'none_declared' ? 'KNOWN_NONE' : u.accident_history === 'declared' ? 'KNOWN_DAMAGE' : 'UNKNOWN',
    condition: issues ? 'KNOWN_ISSUES' : good ? 'KNOWN_GOOD' : 'UNKNOWN',
    inspectionStatus: u.inspection_status === 'unknown' ? 'UNKNOWN' : u.inspection_status === 'valid' ? 'VALID' : 'EXPIRED',
    owners: u.owners === 'unknown' ? 'UNKNOWN' : u.owners,
  };
}

interface Analysis {
  u: UsedVehicleInstance;
  ref: ReferenceContext;
  evaluationDate: string;
  age: VehicleAge;
  facts: UsedSubjectFacts;
  warrantySource: UsedSourceField[];
  summary: UsedVehicleInstanceSummary;
  priceUsable: boolean;
  currencyMismatch: boolean;
  warnings: UsedWarning[];
}

function analyse(input: UsedAdjustmentInput): Analysis {
  const u = UsedVehicleInstance.parse(input.instance);
  const ref = input.reference;
  // §5: una instancia usada apunta EXACTAMENTE a una ReferenceVariant.
  if (u.reference_variant_id !== ref.referenceVariantId) throw new Error(`used instance ${u.id} points to reference variant ${u.reference_variant_id}, not ${ref.referenceVariantId}`);
  const evaluationDate = input.evaluationDate;
  const warnings: UsedWarning[] = [];
  const warn = (key: string, params: MessageParams, code: UsedRuleCode, fields: UsedSourceField[]) => warnings.push(traced(umessage(key, params), code, fields));

  const age = calculateVehicleAge({ ...(u.registration_date ? { registrationDate: u.registration_date } : {}), ...(u.registration_year !== undefined ? { registrationYear: u.registration_year } : {}) }, evaluationDate);
  if (age.invalid) warn('used.warning.registration_after_evaluation', { registration: u.registration_date ?? String(u.registration_year), evaluationDate }, 'USED_REGISTRATION_AFTER_EVALUATION', ageSource(age));
  if (u.registration_year_assumed !== undefined) warn('used.warning.assumed_registration_not_used', { registrationYearAssumed: u.registration_year_assumed }, 'USED_ASSUMED_REGISTRATION_NOT_USED', ['registration_year_assumed']);
  if (u.observed_at && u.observed_at > evaluationDate) warn('used.warning.observed_after_evaluation', { observedAt: u.observed_at, evaluationDate }, 'USED_OBSERVED_AFTER_EVALUATION', ['observed_at']);

  const marketCurrency = MARKET_CURRENCY[ref.market];
  const currencyMismatch = u.asking_price_minor !== undefined && u.currency !== marketCurrency;
  const priceUsable = u.asking_price_minor !== undefined && !currencyMismatch;
  if (currencyMismatch) warn('used.warning.currency_mismatch', { currency: u.currency, marketCurrency }, 'USED_PRICE_CURRENCY_MISMATCH', ['asking_price_minor', 'currency']);

  const plugin = PLUGIN.has(ref.powertrainType);
  if (!plugin && u.battery_health_pct !== 'unknown') warn('used.warning.battery_health_not_applicable', { powertrain: ref.powertrainType }, 'USED_BATTERY_HEALTH_NOT_APPLICABLE', ['battery_health_pct']);

  const mileageKm = u.mileage_km !== undefined ? known(u.mileage_km) : UNKNOWN;
  const warranty = warrantyRemaining(u, ref, age, mileageKm);
  const facts: UsedSubjectFacts = {
    ageMonths: age.months,
    mileageKm,
    batteryHealthPct: !plugin ? NOT_APPLICABLE : u.battery_health_pct !== 'unknown' ? known(u.battery_health_pct) : UNKNOWN,
    warrantyRemainingMonths: warranty.fact,
  };
  return { u, ref, evaluationDate, age, facts, warrantySource: warranty.sourceFields, summary: summarize(u, ref, evaluationDate, age, facts, priceUsable), priceUsable, currencyMismatch, warnings };
}

const ageYears = (age: VehicleAge) => (age.months.state === 'KNOWN' ? { min: age.months.min / 12, max: age.months.max / 12 } : undefined);

function informationConfidence(a: Analysis, requiresVerification: boolean): UsedInformationConfidence {
  // Un precio en otra moneda o una matriculación posterior a la evaluación no son utilizables: no cuentan como conocidos.
  const forInfo: UsedVehicleInstance = {
    ...a.u,
    ...(a.priceUsable ? {} : { asking_price_minor: undefined, currency: undefined }),
    ...(a.age.invalid ? { registration_date: undefined, registration_year: undefined } : {}),
  };
  const ages = ageYears(a.age);
  const ctx = { powertrain: a.ref.powertrainType, ...(ages ? { age_years: ages } : {}) };
  const info = usedInformationConfidence(forInfo, ctx);
  const relevance = (f: UsedInformationField) => decisionRelevance(f, ctx);
  const reasons: UsedReason[] = [];
  for (const f of info.critical_missing) reasons.push(traced(umessage(MISSING_KEY[f]!, { field: f, critical: true, relevance: relevance(f) }), 'USED_INFO_CRITICAL_UNKNOWN', FIELD_SOURCE[f]));
  for (const c of info.caps) reasons.push(traced(umessage('used.information_confidence.capped', { field: c.field, level: c.cap, powertrain: a.ref.powertrainType }), 'USED_INFO_POWERTRAIN_CAP', FIELD_SOURCE[c.field]));
  const rest = info.missing.filter((f) => !info.critical_missing.includes(f) && !info.caps.some((c) => c.field === f)).sort((x, y) => relevance(y) - relevance(x) || x.localeCompare(y));
  for (const f of rest) reasons.push(traced(umessage(MISSING_KEY[f]!, { field: f, critical: false, relevance: relevance(f) }), 'USED_INFO_FIELD_UNKNOWN', FIELD_SOURCE[f]));
  if (!info.missing.length) reasons.push(traced(umessage('used.information_confidence.complete'), 'USED_INFO_COMPLETE', []));
  const fields = USED_INFORMATION_FIELDS.map((field) => ({
    field,
    state: info.not_applicable.includes(field) ? ('NOT_APPLICABLE' as const) : info.missing.includes(field) ? ('UNKNOWN' as const) : ('KNOWN' as const),
    relevance: relevance(field),
  }));
  const relevant = fields.filter((f) => f.state !== 'NOT_APPLICABLE');
  return {
    level: info.level,
    reasons,
    requiresVerification,
    summary: umessage('used.information_confidence.summary', { level: info.level, knownCount: relevant.filter((f) => f.state === 'KNOWN').length, relevantCount: relevant.length, notApplicableCount: fields.length - relevant.length }),
    informationCompleteness: info.information_completeness,
    score: info.score,
    fields,
    rulesVersion: R.version,
  };
}

function signalsAndChecks(a: Analysis): { signals: OwnershipSignal[]; checks: UsedVerificationRequirement[] } {
  const signals: OwnershipSignal[] = [];
  const checks: UsedVerificationRequirement[] = [];
  const signal = (code: OwnershipSignalCode, nature: SignalNature, basis: OwnershipSignal['basis'], key: string, params: MessageParams, rule: UsedRuleCode, fields: readonly UsedSourceField[]) =>
    signals.push({ ...traced(umessage(key, params), rule, fields), signal: code, nature, basis });
  const verify = (check: VerificationCheck, key: string, params: MessageParams, rule: UsedRuleCode, fields: readonly UsedSourceField[]) => checks.push({ ...traced(umessage(key, params), rule, fields), check });
  const { u, ref, facts, age } = a;

  // Precio pedido (único precio de compra de un usado; nunca se busca ni se estima)
  if (!a.priceUsable) {
    const rule = a.currencyMismatch ? 'USED_PRICE_CURRENCY_MISMATCH' : 'USED_PRICE_ASKING_MISSING';
    signal('ASKING_PRICE_MISSING', 'INFORMATION_GAP', 'UNKNOWN', 'used.ownership.asking_price_missing', {}, rule, ['asking_price_minor', 'currency']);
    verify('ASKING_PRICE', 'used.verification.provide_asking_price', {}, rule, ['asking_price_minor', 'currency']);
  }

  // Kilometraje relativo a la edad (umbral en metodología versionada; nunca valor absoluto aislado)
  const m = facts.mileageKm;
  if (m.state === 'UNKNOWN') {
    signal('MILEAGE_UNKNOWN', 'INFORMATION_GAP', 'UNKNOWN', 'used.ownership.mileage_unknown', {}, 'USED_MILEAGE_UNKNOWN', ['mileage_km']);
    verify('MILEAGE', 'used.verification.check_mileage', {}, 'USED_MILEAGE_UNKNOWN', ['mileage_km']);
  } else if (m.state === 'KNOWN' && age.months.state === 'KNOWN' && age.months.min >= R.mileage_for_age.min_age_months) {
    const reference = R.mileage_for_age.reference_annual_km[ref.market];
    if (reference !== undefined) {
      const annualKmMin = Math.round(m.min / (age.months.max / 12));
      const annualKmMax = Math.round(m.max / (age.months.min / 12));
      const params = { mileageKm: m.min, ageMonthsMin: age.months.min, ageMonthsMax: age.months.max, annualKmMin, annualKmMax, referenceAnnualKm: reference };
      const fields: UsedSourceField[] = ['mileage_km', ...ageSource(age)];
      const high = reference * R.mileage_for_age.high_above_factor;
      const low = reference * R.mileage_for_age.low_below_factor;
      if (annualKmMin > high) signal('HIGH_MILEAGE_FOR_AGE', 'ATTENTION', 'USER_PROVIDED', 'used.ownership.high_mileage_for_age', { ...params, thresholdAnnualKm: high }, 'USED_MILEAGE_HIGH_FOR_AGE', fields);
      else if (annualKmMax < low) signal('LOW_MILEAGE_FOR_AGE', 'NOTE', 'USER_PROVIDED', 'used.ownership.low_mileage_for_age', { ...params, thresholdAnnualKm: low }, 'USED_MILEAGE_LOW_FOR_AGE', fields);
    }
  }

  // Garantía restante (sin precio monetario del riesgo)
  const w = facts.warrantyRemainingMonths;
  const ages = ageYears(age);
  const warrantyRelevant = decisionRelevance('warranty_remaining', { powertrain: ref.powertrainType, ...(ages ? { age_years: ages } : {}) }) >= 1.5;
  if (w.state === 'KNOWN') {
    const basis = w.basis;
    if (w.max === 0) signal('NO_REMAINING_WARRANTY', 'ATTENTION', basis, 'used.ownership.no_remaining_warranty', { basis }, 'USED_WARRANTY_NONE_REMAINING', a.warrantySource);
    else if (w.max < R.warranty.limited_below_months)
      signal('LIMITED_WARRANTY', 'ATTENTION', basis, 'used.ownership.limited_warranty', { warrantyRemainingMonthsMin: w.min, warrantyRemainingMonthsMax: w.max, limitMonths: R.warranty.limited_below_months, basis }, 'USED_WARRANTY_LIMITED', a.warrantySource);
    if (basis === 'CALCULATED' && w.max > 0) verify('WARRANTY', 'used.verification.check_warranty', { basis, warrantyRemainingMonthsMin: w.min, warrantyRemainingMonthsMax: w.max }, 'USED_WARRANTY_CALCULATED', a.warrantySource);
  } else if (warrantyRelevant) verify('WARRANTY', 'used.verification.check_warranty', { basis: 'UNKNOWN' }, 'USED_WARRANTY_UNKNOWN', ['warranty_remaining_months']);

  // Historial de mantenimiento: señal cualitativa, nunca probabilidad de avería
  if (u.service_history === 'unknown') {
    signal('SERVICE_HISTORY_UNKNOWN', 'INFORMATION_GAP', 'UNKNOWN', 'used.ownership.service_history_unknown', {}, 'USED_SERVICE_HISTORY_UNKNOWN', ['service_history']);
    verify('SERVICE_HISTORY', 'used.verification.check_service_history', { history: 'UNKNOWN' }, 'USED_SERVICE_HISTORY_UNKNOWN', ['service_history']);
  } else if (u.service_history !== 'full') {
    const status = u.service_history.toUpperCase();
    signal('SERVICE_HISTORY_INCOMPLETE', 'ATTENTION', 'USER_PROVIDED', 'used.ownership.service_history_incomplete', { history: status }, 'USED_SERVICE_HISTORY_INCOMPLETE', ['service_history']);
    verify('SERVICE_HISTORY', 'used.verification.check_service_history', { history: status }, 'USED_SERVICE_HISTORY_INCOMPLETE', ['service_history']);
  }

  // Salud de batería (solo BEV/PHEV/EREV): observación explícita, nunca autonomía derivada
  const b = facts.batteryHealthPct;
  if (b.state === 'UNKNOWN') {
    signal('BATTERY_HEALTH_UNKNOWN', 'INFORMATION_GAP', 'UNKNOWN', 'used.ownership.battery_health_unknown', { powertrain: ref.powertrainType }, 'USED_BATTERY_HEALTH_UNKNOWN', ['battery_health_pct']);
    verify('BATTERY_HEALTH', 'used.verification.check_battery_health', { cause: 'UNKNOWN' }, 'USED_BATTERY_HEALTH_UNKNOWN', ['battery_health_pct']);
  } else if (b.state === 'KNOWN') {
    const variant = ref.batteryWarrantedMinSohPct;
    const thresholdPct = variant?.pct ?? R.battery_health.low_below_pct_default;
    const fields: UsedSourceField[] = variant ? ['battery_health_pct', 'reference:bat.warranty_soh_pct'] : ['battery_health_pct'];
    if (b.min < thresholdPct) {
      signal('BATTERY_HEALTH_LOW', 'ATTENTION', 'USER_PROVIDED', 'used.ownership.battery_health_low', { batteryHealthPct: b.min, thresholdPct, thresholdBasis: variant ? 'VARIANT_WARRANTY' : 'METHODOLOGY_DEFAULT' }, 'USED_BATTERY_HEALTH_LOW', fields);
      verify('BATTERY_HEALTH', 'used.verification.check_battery_health', { cause: 'LOW', batteryHealthPct: b.min }, 'USED_BATTERY_HEALTH_LOW', fields);
    } else signal('BATTERY_HEALTH_REPORTED', 'NOTE', 'USER_PROVIDED', 'used.ownership.battery_health_reported', { batteryHealthPct: b.min }, 'USED_BATTERY_HEALTH_REPORTED', ['battery_health_pct']);
  }

  // Daño declarado: señal + verificación, nunca coste de reparación
  if (u.accident_history === 'declared') {
    signal('ACCIDENT_DAMAGE_DECLARED', 'ATTENTION', 'USER_PROVIDED', 'used.ownership.accident_damage_declared', {}, 'USED_ACCIDENT_DAMAGE_DECLARED', ['accident_history']);
    verify('DAMAGE_REPAIR', 'used.verification.check_damage_repair', {}, 'USED_ACCIDENT_DAMAGE_DECLARED', ['accident_history']);
  }

  // Estado / ITV (simple: KNOWN_GOOD / KNOWN_ISSUES / UNKNOWN)
  const cond = a.summary.condition;
  if (cond === 'KNOWN_ISSUES') {
    signal('CONDITION_ISSUES_DECLARED', 'ATTENTION', 'USER_PROVIDED', 'used.ownership.condition_issues_declared', { condition: u.condition.toUpperCase(), inspectionStatus: a.summary.inspectionStatus }, 'USED_CONDITION_ISSUES_DECLARED', ['condition', 'inspection_status']);
    verify('CONDITION', 'used.verification.check_condition', { cause: 'ISSUES' }, 'USED_CONDITION_ISSUES_DECLARED', ['condition', 'inspection_status']);
  } else if (cond === 'UNKNOWN') {
    signal('CONDITION_UNCONFIRMED', 'INFORMATION_GAP', 'UNKNOWN', 'used.ownership.condition_unconfirmed', {}, 'USED_CONDITION_UNCONFIRMED', ['condition', 'inspection_status']);
    verify('CONDITION', 'used.verification.check_condition', { cause: 'UNCONFIRMED' }, 'USED_CONDITION_UNCONFIRMED', ['condition', 'inspection_status']);
  }

  // Orden estable: lo que conviene mirar → lo desconocido → notas.
  return { signals: signals.map((s, i) => ({ s, i })).sort((x, y) => NATURE_RANK[x.s.nature] - NATURE_RANK[y.s.nature] || x.i - y.i).map(({ s }) => s), checks };
}

function economicAdjustments(a: Analysis): UsedEconomicAdjustments {
  const purchase: UsedEconomicAdjustments['purchase'] = a.priceUsable
    ? {
        ...traced(umessage('used.economic.asking_price_used', { amountMinMinor: a.u.asking_price_minor!, amountMaxMinor: a.u.asking_price_minor!, currency: 'EUR' }), 'USED_PRICE_ASKING_OVERRIDE', ['asking_price_minor', 'currency']),
        status: 'AVAILABLE',
        effectivePurchasePrice: { amount_minor: a.u.asking_price_minor!, currency: 'EUR', basis: 'USER_PROVIDED' },
      }
    : { ...traced(umessage('used.economic.asking_price_missing'), a.currencyMismatch ? 'USED_PRICE_CURRENCY_MISMATCH' : 'USED_PRICE_ASKING_MISSING', ['asking_price_minor', 'currency']), status: 'UNAVAILABLE' };
  return { participant: 'USED', purchase, notModelled: R.not_modelled };
}

/**
 * ReferenceVariant + UsedVehicleInstance → UsedAdjustmentResult. Sin I/O, sin reloj, sin mutaciones.
 * Lanza si la instancia no apunta a la variante indicada o si la fecha de evaluación no es YYYY-MM-DD.
 */
export function adjustUsedVehicle(input: UsedAdjustmentInput): UsedAdjustmentResult {
  const a = analyse(input);
  const { signals, checks } = signalsAndChecks(a);
  const info = informationConfidence(a, checks.length > 0);
  const econ = economicAdjustments(a);
  const keys = [econ.purchase, ...signals, info.summary, ...info.reasons, ...checks, ...a.warnings].map((m) => m.messageKey);
  return {
    subject: { kind: 'USED_INSTANCE', subjectId: a.u.id, referenceVariantId: a.ref.referenceVariantId, usedInstanceId: a.u.id, usedFacts: a.facts },
    instance: a.summary,
    economicAdjustments: econ,
    practicalSignals: a.facts,
    ownershipSignals: signals,
    informationConfidence: info,
    verificationRequirements: checks,
    warnings: a.warnings,
    messageContract: { namespace: 'used', keys: [...new Set(keys)].sort() },
    methodologyVersion: METHODOLOGY_VERSION,
    rulesVersion: R.version,
    engineVersion: USED_ADJUSTMENT_ENGINE_VERSION,
    adjustmentHash: methodologyFingerprint({ engine: USED_ADJUSTMENT_ENGINE_VERSION, methodology: METHODOLOGY_VERSION, rules: R.version, reference: a.ref, instance: a.u, evaluationDate: a.evaluationDate }),
  };
}

/** Solo la Used Information Confidence (cuánto se sabe de la unidad). */
export function evaluateUsedInformationConfidence(input: UsedAdjustmentInput): UsedInformationConfidence {
  const a = analyse(input);
  return informationConfidence(a, signalsAndChecks(a).checks.length > 0);
}

/** Solo las Ownership Signals (hechos observables de la unidad, separados de Technical Capability). */
export function buildUsedOwnershipSignals(input: UsedAdjustmentInput): OwnershipSignal[] {
  return signalsAndChecks(analyse(input)).signals;
}
