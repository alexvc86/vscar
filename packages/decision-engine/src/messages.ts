import { metricFallbackLabel } from '@vscar/comparison-engine';
import { CRITERION_FALLBACK, capitalize, createMessageFactory, fallbackEurRange, fallbackNumber, fallbackRange, type Message, type MessageParams } from '@vscar/methodology';

/**
 * Mensajes deterministas del Decision Engine (Steps 6b–6c, contrato Step 7a.1). El engine devuelve
 * `messageKey` + `params` (DATOS: números crudos, rangos `xMin`/`xMax`, códigos, enums, ids, nombres propios).
 * `text` es solo respaldo inglés (debug / traducción ausente) renderizado con estas plantillas. La UI traduce
 * por clave; nunca reconstruye la semántica.
 */
export type { Message, MessageParams };

const VARIABLE: Record<string, string> = {
  annual_km: 'annual mileage',
  fuel_price: 'the fuel price',
  electricity_price: 'the electricity price',
  home_charging_share: 'the home-charging share',
  horizon_years: 'the ownership horizon',
};
const UNIT: Record<string, string> = { annual_km: ' km/year', fuel_price: ' €/L', electricity_price: ' €/kWh', home_charging_share: '', horizon_years: ' years' };
const crit = (p: MessageParams) => CRITERION_FALLBACK[String(p.criterion)] ?? { label: String(p.criterion), unit: String(p.unit ?? ''), op: 'min' as const };
const lower = (x: unknown) => String(x).toLowerCase().replace(/_/g, '-');
const unitOf = (p: MessageParams) => (p.unit === 'EUR_MINOR' || p.unit === 'EUR' ? '€' : p.unit ? String(p.unit) : '');
const value = (p: MessageParams, base: string) => (p[`${base}Min`] !== undefined ? fallbackRange(p, base) : String(p[base] ?? '?'));
const op = (p: MessageParams) => (crit(p).op === 'max' ? '≤' : '≥');
const observed = (p: MessageParams) => (p.observedMin !== undefined ? `${fallbackRange(p, 'observed')} ${crit(p).unit}` : 'no data');

export const MESSAGE_TEMPLATES: Readonly<Record<string, (p: MessageParams) => string>> = {
  // ---------------------------------------------------------------- 6b · contribuciones (Alpha Best For You)
  'decision.contribution.deal_breaker': (p) => `${p.subject}: ${crit(p).label} ${observed(p)} does not meet ${op(p)} ${fallbackNumber(p.required)} ${crit(p).unit}`,
  'decision.contribution.metric_ahead': (p) => `${metricFallbackLabel(p.metric)}: ${p.subject} ${value(p, 'value')} vs ${p.other} ${value(p, 'otherValue')} ${unitOf(p)} — ${p.subject} ahead (${lower(p.level)} difference)`,
  'decision.contribution.running_cost': (p) => `${p.subject} costs about ${fallbackEurRange(p)} less per year than ${p.other}${p.annualKm ? ` (${fallbackNumber(p.annualKm)} km/year)` : ''}`,
  'decision.contribution.compromise': (p) => `${p.subject}: ${crit(p).label} below your preferred ${fallbackNumber(p.required)} ${crit(p).unit}`,
  'decision.contribution.priority': (p) => `your ${String(p.priority).toLowerCase()} priority is ${String(p.level).toLowerCase()}`,
  'decision.contribution.range_relevance': (p) =>
    p.relevance === 'HIGH' ? 'frequent long trips: range matters more' : p.relevance === 'LOW' ? 'daily use far below the range, home charging, few long trips: range matters less' : 'standard relevance',
  // ---------------------------------------------------------------- 6b · Alpha Best For You
  'decision.best_for_you.selected': (p) => `Best for your needs (Alpha): ${p.subject}.`,
  'decision.best_for_you.only_eligible': (p) => `${p.subject} is the only vehicle that meets your mandatory requirements.`,
  'decision.best_for_you.only_evaluated': (p) => `${p.subject} is the only vehicle evaluated.`,
  'decision.best_for_you.tie': (p) => `The ${p.count} vehicles are a practical tie for your needs — no winner is forced.`,
  'decision.best_for_you.range_dependent': (p) => `Which of the ${p.count} vehicles fits your needs better depends on configuration ranges.`,
  'decision.best_for_you.no_full_match': () => 'None fully meets your requirements.',
  'decision.best_for_you.requirement_failed': (p) => `${p.subject}: ${crit(p).label} ${observed(p)} does not meet ${op(p)} ${fallbackNumber(p.required)} ${crit(p).unit}`,
  'decision.best_for_you.insufficient_data': () => 'Not enough comparable data on space, range, performance or running cost to separate the vehicles.',
  'decision.best_for_you.closest_note': () => 'Informational only: it fails fewer or less severe requirements — not a recommendation.',
  // ---------------------------------------------------------------- 6b · Technical Capability
  'decision.technical.insufficient_data': () => 'Technical Capability needs at least two vehicles with technical data',
  'decision.technical.tie': () => 'Technical capability is practically equal',
  'decision.technical.range_dependent': () => 'Technical capability depends on configuration',
  'decision.technical.metric_ahead': (p) => `Technical Capability: ${p.subject} ahead of ${p.other} on ${metricFallbackLabel(p.metric)} (${p.deltaMin !== undefined ? `${fallbackRange(p, 'delta')} ${unitOf(p)}`.trim() : lower(p.level)})`,
  // ---------------------------------------------------------------- 6b · Economic Fit @ horizon
  'decision.economic.cheaper': (p) => `Economic Fit — ${p.horizonYears} years: ${p.subject} costs about ${fallbackEurRange(p)} less to run than ${p.other}${p.annualKm ? ` at ${fallbackNumber(p.annualKm)} km/year` : ''}`,
  'decision.economic.unavailable': (p) => `Running cost unavailable for ${p.subject}: no economic winner can be declared`,
  'decision.economic.not_comparable_cycles': (p) => `Running costs of ${p.subject} (${p.cycleA}) and ${p.other} (${p.cycleB}) come from different test cycles: not directly comparable`,
  'decision.economic.not_comparable': (p) => `Running costs of ${p.subject} and ${p.other} are not directly comparable`,
  'decision.economic.unknown': () => 'Running cost cannot be compared for at least one pair: no economic winner can be declared',
  'decision.economic.range_dependent': () => 'Which vehicle is cheaper to run depends on configuration and assumptions (cost ranges overlap)',
  'decision.economic.tie': (p) => `Running costs are practically equal over ${p.horizonYears} years`,
  // ---------------------------------------------------------------- 6b · Practical Fit
  'decision.practical.requirement_met': (p) => (p.criterion === 'minSeats' ? `fits your ${fallbackNumber(p.required)}-seat requirement` : `meets your ${crit(p).label} requirement (${op(p)} ${fallbackNumber(p.required)} ${crit(p).unit})`),
  'decision.practical.no_failures': () => 'no mandatory requirement fails',
  'decision.practical.requirement_failed': (p) => `does not meet: ${crit(p).label} ${observed(p)} (${op(p)} ${fallbackNumber(p.required)} ${crit(p).unit})`,
  'decision.practical.compromise': (p) => `${crit(p).label} is ${fallbackNumber(p.gap)} ${crit(p).unit} ${p.direction === 'ABOVE' ? 'above' : 'below'} your preferred ${fallbackNumber(p.required)} ${crit(p).unit}`,
  'decision.practical.unconfirmed': (p) => `cannot confirm ${crit(p).label}: ${p.observedMin !== undefined ? `${observed(p)} depends on configuration` : 'no usable data'} (${op(p)} ${fallbackNumber(p.required)} ${crit(p).unit})`,
  'decision.practical.desired_unknown': (p) => `preferred ${crit(p).label} without data (${op(p)} ${fallbackNumber(p.required)} ${crit(p).unit})`,
  // ---------------------------------------------------------------- 6b · confianza de datos de la decisión
  'decision.data_confidence.pair': (p) => `${p.subject} vs ${p.other}: data confidence ${String(p.level).toLowerCase()}`,
  'decision.data_confidence.economic': (p) => `economic fit ${String(p.status).toLowerCase()}`,
  'decision.data_confidence.technical_coverage': (p) => `${p.subject}: technical data covers ${Math.round(Number(p.coverage) * 100)} % of editorial weight`,
  'decision.data_confidence.requirements_without_data': (p) => `${p.subject}: ${p.count} requirement(s) without verifiable data`,
  // ---------------------------------------------------------------- 6c · Why Not / tradeoffs
  'decision.why_not.deal_breaker': (p) => `Does not meet a mandatory requirement: ${crit(p).label} ${observed(p)} (${op(p)} ${fallbackNumber(p.required)} ${crit(p).unit})`,
  'decision.why_not.compromise': (p) => `Below your preferred target: ${crit(p).label} ${observed(p)} (${op(p)} ${fallbackNumber(p.required)} ${crit(p).unit})`,
  'decision.why_not.running_cost': (p) => `Costs about ${fallbackEurRange(p)} more per year to run${p.annualKm ? ` at ${fallbackNumber(p.annualKm)} km/year` : ''} than ${p.other}`,
  'decision.why_not.economics_not_comparable': (p) => `Running costs of ${p.subject} and ${p.other} use different test cycles, so VScar does not rank them economically`,
  'decision.why_not.metric_behind': (p) =>
    `${metricFallbackLabel(p.metric)}: ${p.subject} ${value(p, 'value')} vs ${p.other} ${value(p, 'otherValue')}${unitOf(p) ? ` ${unitOf(p)}` : ''} (${lower(p.level)} difference${p.forYou ? ` for you: ${lower(p.forYou)}` : ''})`,
  'decision.why_not.metric_different': (p) =>
    `${metricFallbackLabel(p.metric)}: ${p.subject} ${value(p, 'value')} vs ${p.other} ${value(p, 'otherValue')}${unitOf(p) ? ` ${unitOf(p)}` : ''} (${fallbackRange(p, 'delta')} ${unitOf(p)} difference — not better or worse in itself)`,
  'decision.why_not.none': (p) => `No meaningful disadvantage against ${p.other} in this scenario`,
  'decision.no_full_match': () => 'None fully meets your requirements',
  'decision.closest_option': (p) => `Closest option (not a recommendation): ${p.subject} — fails ${p.failed} requirement(s)`,
  // ---------------------------------------------------------------- 6c · Verify before deciding
  'decision.verify.requirement': (p) => `${capitalize(crit(p).label)} is not confirmed. Verify that it ${p.op === 'max' ? 'does not exceed' : 'reaches at least'} ${fallbackNumber(p.required)} ${crit(p).unit}`,
  'decision.verify.desired': (p) => `${capitalize(crit(p).label)} could not be checked against your preferred ${fallbackNumber(p.required)} ${crit(p).unit}`,
  // ---------------------------------------------------------------- 6c · Robustness
  'decision.robustness.switch': (p) => `The result changes if ${VARIABLE[String(p.variable)] ?? p.variable} ${p.direction === 'BELOW' ? 'falls below' : 'rises above'} ${fallbackNumber(p.switchValue, 3)}${UNIT[String(p.variable)] ?? ''}`,
  'decision.robustness.priority_switch': (p) => `The result changes if your ${String(p.priority).toLowerCase()} priority is ${String(p.level).toLowerCase()}`,
  'decision.robustness.stable': () => 'The result remains stable across the tested scenario range',
  'decision.robustness.tie': () => 'The vehicles are a practical tie for your needs: there is no single result to be robust',
  'decision.robustness.range_dependent': () => 'The result depends on configuration ranges',
  'decision.robustness.no_recommendation': () => 'There is no recommendation to test (no vehicle fully meets the requirements)',
  'decision.robustness.unknown': () => 'Robustness could not be tested (no scenario evaluator provided)',
  // ---------------------------------------------------------------- 6c · Recommendation Confidence
  'decision.confidence.data': (p) => `Input data confidence is ${String(p.level).toLowerCase()}`,
  'decision.confidence.unconfirmed_requirement': (p) => `${capitalize(crit(p).label)} is not confirmed for the suggested vehicle`,
  'decision.confidence.desired_unknown': (p) => `${p.count} preferred target(s) could not be checked`,
  'decision.confidence.economics_not_comparable': () => 'Running costs are not comparable (different test cycles or scenarios)',
  'decision.confidence.economics_unknown': () => 'Running cost is unavailable for at least one vehicle',
  'decision.confidence.economics_comparable': () => 'Running costs are comparable for all vehicles',
  'decision.confidence.robustness': (p) => `Result robustness is ${String(p.level).toLowerCase()}`,
  'decision.confidence.used_information': (p) => `Used-vehicle information confidence is ${String(p.level).toLowerCase()}`,
  'decision.confidence.cap': (p) => `Confidence capped at ${String(p.level).toLowerCase()}: ${String(p.reason).toLowerCase().replace(/_/g, ' ')}`,
  'decision.confidence.all_unconfirmed': () => 'Every remaining vehicle has unconfirmed mandatory requirements',
};

/**
 * Params REQUERIDOS por clave (contrato verificado por test). Los opcionales no se listan. Los rangos se
 * declaran por su base (`amount` → `amountMinMinor`/`amountMaxMinor`; `value` → `valueMin`/`valueMax` o `value`).
 */
export const MESSAGE_PARAM_SCHEMA: Readonly<Record<string, readonly string[]>> = {
  'decision.contribution.deal_breaker': ['subject', 'subjectId', 'criterion', 'required', 'unit'],
  'decision.contribution.metric_ahead': ['metric', 'component', 'subject', 'subjectId', 'other', 'otherId', 'level'],
  'decision.contribution.running_cost': ['subject', 'subjectId', 'other', 'otherId', 'amountMinMinor', 'amountMaxMinor', 'currency'],
  'decision.contribution.compromise': ['subject', 'criterion', 'required', 'unit'],
  'decision.contribution.priority': ['priority', 'level'],
  'decision.contribution.range_relevance': ['relevance'],
  'decision.best_for_you.selected': ['subject', 'subjectId'],
  'decision.best_for_you.only_eligible': ['subject', 'subjectId'],
  'decision.best_for_you.only_evaluated': ['subject', 'subjectId'],
  'decision.best_for_you.tie': ['count'],
  'decision.best_for_you.range_dependent': ['count'],
  'decision.best_for_you.no_full_match': [],
  'decision.best_for_you.requirement_failed': ['subject', 'criterion', 'required', 'unit'],
  'decision.best_for_you.insufficient_data': [],
  'decision.best_for_you.closest_note': [],
  'decision.technical.insufficient_data': [],
  'decision.technical.tie': [],
  'decision.technical.range_dependent': [],
  'decision.technical.metric_ahead': ['subject', 'other', 'metric', 'level'],
  'decision.economic.cheaper': ['subject', 'subjectId', 'other', 'otherId', 'amountMinMinor', 'amountMaxMinor', 'currency', 'horizonYears'],
  'decision.economic.unavailable': ['subject', 'subjectId'],
  'decision.economic.not_comparable_cycles': ['subject', 'other', 'cycleA', 'cycleB'],
  'decision.economic.not_comparable': ['subject', 'other'],
  'decision.economic.unknown': [],
  'decision.economic.range_dependent': [],
  'decision.economic.tie': ['horizonYears'],
  'decision.practical.requirement_met': ['criterion', 'required', 'unit'],
  'decision.practical.no_failures': [],
  'decision.practical.requirement_failed': ['criterion', 'required', 'unit'],
  'decision.practical.compromise': ['criterion', 'required', 'gap', 'unit', 'direction'],
  'decision.practical.unconfirmed': ['criterion', 'required', 'unit'],
  'decision.practical.desired_unknown': ['criterion', 'required', 'unit'],
  'decision.data_confidence.pair': ['subject', 'other', 'level'],
  'decision.data_confidence.economic': ['status'],
  'decision.data_confidence.technical_coverage': ['subject', 'coverage'],
  'decision.data_confidence.requirements_without_data': ['subject', 'count'],
  'decision.why_not.deal_breaker': ['criterion', 'required', 'unit'],
  'decision.why_not.compromise': ['criterion', 'required', 'unit'],
  'decision.why_not.running_cost': ['amountMinMinor', 'amountMaxMinor', 'currency', 'other'],
  'decision.why_not.economics_not_comparable': ['subject', 'other'],
  'decision.why_not.metric_behind': ['metric', 'subject', 'other', 'level'],
  'decision.why_not.metric_different': ['metric', 'subject', 'other', 'deltaMin', 'deltaMax'],
  'decision.why_not.none': ['other'],
  'decision.no_full_match': [],
  'decision.closest_option': ['subject', 'failed'],
  'decision.verify.requirement': ['criterion', 'required', 'unit', 'op'],
  'decision.verify.desired': ['criterion', 'required', 'unit', 'op'],
  'decision.robustness.switch': ['variable', 'direction', 'switchValue', 'currentValue'],
  'decision.robustness.priority_switch': ['priority', 'level'],
  'decision.robustness.stable': [],
  'decision.robustness.tie': [],
  'decision.robustness.range_dependent': [],
  'decision.robustness.no_recommendation': [],
  'decision.robustness.unknown': [],
  'decision.confidence.data': ['level'],
  'decision.confidence.unconfirmed_requirement': ['criterion'],
  'decision.confidence.desired_unknown': ['count'],
  'decision.confidence.economics_not_comparable': [],
  'decision.confidence.economics_unknown': [],
  'decision.confidence.economics_comparable': [],
  'decision.confidence.robustness': ['level'],
  'decision.confidence.used_information': ['level'],
  'decision.confidence.cap': ['level', 'reason'],
  'decision.confidence.all_unconfirmed': [],
};

export const message = createMessageFactory(MESSAGE_TEMPLATES);

/** Params de un requisito comprobado (deal breaker / deseado) como DATOS. */
export function checkParams(c: { criterion: string; requiredValue: number; observedValue?: { min: number; max: number; unit: string } }) {
  const unit = c.observedValue?.unit ?? CRITERION_FALLBACK[c.criterion]?.unit ?? '';
  return {
    criterion: c.criterion,
    required: c.requiredValue,
    unit,
    op: c.criterion.startsWith('max') ? 'max' : 'min',
    ...(c.observedValue ? { observedMin: c.observedValue.min, observedMax: c.observedValue.max } : {}),
  };
}
