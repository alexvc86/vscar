/**
 * Mensajes deterministas i18n-ready (sin IA). El engine devuelve `messageKey` + `params` (datos estructurados);
 * `text` es solo un respaldo en inglés renderizado con las mismas plantillas. El frontend traduce por clave.
 */
export type MessageParams = Readonly<Record<string, string | number | boolean | undefined>>;

export interface Message {
  messageKey: string;
  params: MessageParams;
  /** Respaldo en inglés (no es el contrato: el contrato es messageKey + params). */
  text: string;
}

const eur = (minor: unknown) => `€${(Number(minor) / 100).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const eurRange = (p: MessageParams, a = 'amountMinMinor', b = 'amountMaxMinor') => (p[a] === p[b] ? eur(p[a]) : `${eur(p[a])}–${eur(p[b])}`);
const num = (x: unknown) => Number(x).toLocaleString('en-US', { maximumFractionDigits: 3 });
const rng = (p: MessageParams, a = 'deltaMin', b = 'deltaMax') => (p[a] === p[b] ? num(p[a]) : `${num(p[a])}–${num(p[b])}`);

const VARIABLE: Record<string, string> = {
  annual_km: 'annual mileage',
  fuel_price: 'the fuel price',
  electricity_price: 'the electricity price',
  home_charging_share: 'the home-charging share',
  horizon_years: 'the ownership horizon',
};
const UNIT: Record<string, string> = { annual_km: ' km/year', fuel_price: ' €/L', electricity_price: ' €/kWh', home_charging_share: '', horizon_years: ' years' };

export const MESSAGE_TEMPLATES: Readonly<Record<string, (p: MessageParams) => string>> = {
  // Why Not / tradeoffs
  'decision.why_not.deal_breaker': (p) => `Does not meet a mandatory requirement: ${p.reason}`,
  'decision.why_not.compromise': (p) => `Below your preferred target: ${p.reason}`,
  'decision.why_not.running_cost': (p) => `Costs about ${eurRange(p)} more per year to run${p.annualKm ? ` at ${num(p.annualKm)} km/year` : ''} than ${p.other}`,
  'decision.why_not.economics_not_comparable': (p) => `Running costs of ${p.subject} and ${p.other} use different test cycles, so VScar does not rank them economically`,
  'decision.why_not.metric_behind': (p) => `${p.label}: ${p.subject} ${p.valueSubject} vs ${p.other} ${p.valueOther}${p.unit ? ` ${p.unit}` : ''} (${String(p.level).toLowerCase()} difference${p.forYou ? ` for you: ${String(p.forYou).toLowerCase()}` : ''})`,
  'decision.why_not.metric_different': (p) => `${p.label}: ${p.subject} ${p.valueSubject} vs ${p.other} ${p.valueOther}${p.unit ? ` ${p.unit}` : ''} (${rng(p)} ${p.unit ?? ''} difference — not better or worse in itself)`,
  'decision.why_not.none': (p) => `No meaningful disadvantage against ${p.other} in this scenario`,
  'decision.no_full_match': () => 'None fully meets your requirements',
  'decision.closest_option': (p) => `Closest option (not a recommendation): ${p.subject} — fails ${p.failed} requirement(s)`,
  // Verify before deciding
  'decision.verify.requirement': (p) => `${p.what} is not confirmed. Verify that it ${p.op === 'max' ? 'does not exceed' : 'reaches at least'} ${num(p.required)} ${p.unit}`,
  'decision.verify.desired': (p) => `${p.what} could not be checked against your preferred ${num(p.required)} ${p.unit}`,
  // Robustness
  'decision.robustness.switch': (p) => `The result changes if ${VARIABLE[String(p.variable)] ?? p.variable} ${p.direction === 'BELOW' ? 'falls below' : 'rises above'} ${num(p.switchValue)}${UNIT[String(p.variable)] ?? ''}`,
  'decision.robustness.priority_switch': (p) => `The result changes if your ${String(p.priority).toLowerCase()} priority is ${String(p.level).toLowerCase()}`,
  'decision.robustness.stable': () => 'The result remains stable across the tested scenario range',
  'decision.robustness.tie': () => 'The vehicles are a practical tie for your needs: there is no single result to be robust',
  'decision.robustness.range_dependent': () => 'The result depends on configuration ranges',
  'decision.robustness.no_recommendation': () => 'There is no recommendation to test (no vehicle fully meets the requirements)',
  'decision.robustness.unknown': () => 'Robustness could not be tested (no scenario evaluator provided)',
  // Confidence
  'decision.confidence.data': (p) => `Input data confidence is ${String(p.level).toLowerCase()}${p.detail ? ` (${p.detail})` : ''}`,
  'decision.confidence.unconfirmed_requirement': (p) => `${p.what} is not confirmed for the suggested vehicle`,
  'decision.confidence.desired_unknown': (p) => `${p.count} preferred target(s) could not be checked`,
  'decision.confidence.economics_not_comparable': () => 'Running costs are not comparable (different test cycles or scenarios)',
  'decision.confidence.economics_unknown': () => 'Running cost is unavailable for at least one vehicle',
  'decision.confidence.economics_comparable': () => 'Running costs are comparable for all vehicles',
  'decision.confidence.robustness': (p) => `Result robustness is ${String(p.level).toLowerCase()}${p.detail ? `: ${p.detail}` : ''}`,
  'decision.confidence.used_information': (p) => `Used-vehicle information confidence is ${String(p.level).toLowerCase()}`,
  'decision.confidence.cap': (p) => `Confidence capped at ${String(p.level).toLowerCase()}: ${String(p.reason).toLowerCase().replace(/_/g, ' ')}`,
  'decision.confidence.all_unconfirmed': () => 'Every remaining vehicle has unconfirmed mandatory requirements',
};

export function message(messageKey: string, params: MessageParams = {}): Message {
  const tpl = MESSAGE_TEMPLATES[messageKey];
  if (!tpl) throw new Error(`unknown message key ${messageKey}`);
  const clean = Object.fromEntries(Object.entries(params).filter(([, v]) => v !== undefined));
  return { messageKey, params: clean, text: tpl(clean) };
}
