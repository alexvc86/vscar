import type { Message } from '@vscar/decision-engine';
import type { Format } from './format.ts';

/**
 * Adaptador DecisionMessage → next-intl. El contrato es `messageKey + params` (Step 6c): aquí solo se
 * TRADUCE y se FORMATEA; no se generan razones nuevas. Si falta la clave o algún parámetro necesario,
 * se usa el respaldo inglés del engine (`text`), nunca una cadena vacía ni la clave cruda.
 */
export interface Translator {
  (key: string, values?: Record<string, string | number | Date>): string;
  has(key: string): boolean;
}

/** Reglas Meaningful For You (methodology `for-you-v1`, texto inglés estable) → claves de UI. */
const FOR_YOU_RULE_KEYS: Record<string, string> = {
  'range: daily use far below every car range, charging at home, few long trips': 'range_low_relevance',
  'range: frequent long trips keep full relevance': 'range_full_relevance',
  'cargo: large family': 'cargo_family',
  'cargo: single driver without long trips': 'cargo_single',
  'performance: low priority': 'performance_low',
  'performance: high priority': 'performance_high',
  'consumption: high annual mileage': 'consumption_high_km',
  'consumption: low annual mileage': 'consumption_low_km',
};

export function forYouRuleText(t: Translator, rule: string): string {
  const k = FOR_YOU_RULE_KEYS[rule];
  return k && t.has(`metricLayers.rules.${k}`) ? t(`metricLayers.rules.${k}`) : rule;
}

export function metricLabel(t: Translator, metric: string, fallback?: string): string {
  const key = `technical.metrics.${metric.replace(/\./g, '_')}`;
  return t.has(key) ? t(key) : (fallback ?? metric);
}

const ROBUSTNESS_UNIT: Record<string, (f: Format, v: number, t: Translator) => string> = {
  annual_km: (f, v, t) => t('units.kmPerYear', { value: f.number(v) }),
  fuel_price: (f, v) => `${f.money(v, 3)}/L`,
  electricity_price: (f, v) => `${f.money(v, 3)}/kWh`,
  home_charging_share: (f, v) => f.percent(v),
  horizon_years: (f, v, t) => t('scenario.unitsYear', { value: v }),
};

const lower = (t: Translator, ns: string, v: unknown) => {
  const key = `${ns}.${String(v)}`;
  return t.has(key) ? t(key) : String(v).toLowerCase().replace(/_/g, ' ');
};

/** Prepara los parámetros ya formateados para la plantilla ICU de cada clave. `undefined` = usar respaldo. */
function paramsFor(m: Message & { metric?: string }, t: Translator, f: Format, english: boolean): Record<string, string | number> | undefined {
  const p = m.params;
  const s = (k: string) => (p[k] === undefined ? '' : String(p[k]));
  const label = () => (m.metric ? metricLabel(t, m.metric, s('label')) : s('label'));
  const valueText = (k: string) => {
    const raw = p[k];
    const n = typeof raw === 'number' ? raw : Number(raw);
    return Number.isFinite(n) && String(raw).trim() !== '' ? f.number(n, 1) : s(k);
  };
  switch (m.messageKey) {
    case 'decision.why_not.running_cost':
      return {
        amount: f.moneyMinorRange({ min: Number(p.amountMinMinor), max: Number(p.amountMaxMinor) }),
        hasKm: p.annualKm ? 'yes' : 'no',
        annualKm: p.annualKm ? t('units.kmPerYear', { value: f.number(Number(p.annualKm)) }) : '',
        other: s('other'),
      };
    case 'decision.why_not.metric_behind':
      return {
        label: label(),
        subject: s('subject'),
        other: s('other'),
        valueSubject: valueText('valueSubject'),
        valueOther: valueText('valueOther'),
        unit: s('unit'),
        level: lower(t, 'metricLayers.level', p.level),
        hasForYou: p.forYou ? 'yes' : 'no',
        forYou: p.forYou ? lower(t, 'metricLayers.level', p.forYou) : '',
      };
    case 'decision.why_not.metric_different':
      return { label: label(), subject: s('subject'), other: s('other'), valueSubject: valueText('valueSubject'), valueOther: valueText('valueOther'), unit: s('unit'), delta: f.numberRange({ min: Number(p.deltaMin), max: Number(p.deltaMax) }, 1) };
    case 'decision.robustness.switch': {
      const unit = ROBUSTNESS_UNIT[s('variable')];
      const v = Number(p.switchValue);
      return { variable: s('variable'), direction: s('direction'), value: unit ? unit(f, v, t) : f.number(v, 3) };
    }
    case 'decision.robustness.priority_switch':
      return { priority: lower(t, 'engine.priority', p.priority), level: lower(t, 'engine.level', p.level) };
    case 'decision.confidence.data':
      // `detail` es texto libre en inglés del engine: solo se muestra en inglés (hueco documentado).
      return { level: lower(t, 'engine.level', p.level), hasDetail: english && p.detail ? 'yes' : 'no', detail: english ? s('detail') : '' };
    case 'decision.confidence.robustness':
    case 'decision.confidence.used_information':
      return { level: lower(t, 'engine.level', p.level) };
    case 'decision.confidence.cap':
      return { level: lower(t, 'engine.level', p.level), reason: lower(t, 'engine.capReason', p.reason) };
    case 'decision.confidence.desired_unknown':
      return { count: Number(p.count) };
    case 'decision.closest_option':
      return { subject: s('subject'), failed: Number(p.failed) };
    case 'decision.verify.requirement':
    case 'decision.verify.desired':
      // `what` llega en inglés: fuera del inglés se usa el respaldo completo (no se mezcla idioma en la frase).
      if (!english) return undefined;
      return { what: s('what'), op: s('op'), required: f.number(Number(p.required)), unit: s('unit') };
    case 'decision.why_not.deal_breaker':
    case 'decision.why_not.compromise':
    case 'decision.confidence.unconfirmed_requirement':
      if (!english) return undefined;
      return Object.fromEntries(Object.entries(p).map(([k, v]) => [k, String(v)]));
    default:
      return Object.fromEntries(Object.entries(p).map(([k, v]) => [k, typeof v === 'number' ? v : String(v)]));
  }
}

export function renderEngineMessage(m: Message & { metric?: string }, t: Translator, f: Format, language: string): string {
  const key = `engine.${m.messageKey}`;
  if (!t.has(key)) return m.text;
  const params = paramsFor(m, t, f, language === 'en');
  if (!params) return m.text;
  try {
    return t(key, params);
  } catch {
    return m.text;
  }
}
