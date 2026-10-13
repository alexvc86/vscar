import { CRITERION_FALLBACK, createMessageFactory, fallbackEurRange, fallbackNumber, fallbackRange, type Message, type MessageParams } from '@vscar/methodology';

/**
 * Mensajes del Comparison Engine (Step 7a.1): `messageKey` + `params` (datos). `text` es solo respaldo inglés.
 * Convenciones de params: rangos `xMin`/`xMax`, `unit` = código de unidad del dato (km, kWh/100 km, EUR_MINOR…),
 * `metric` = SpecKey/metric id, `criterion` = requisito, `a`/`b` = nombres propios de los vehículos.
 */
const METRIC_FALLBACK: Readonly<Record<string, string>> = {};
/** Registra la etiqueta inglesa de una métrica (solo para el texto de respaldo). */
export function registerMetricLabel(metric: string, label: string) {
  (METRIC_FALLBACK as Record<string, string>)[metric] = label;
}
export const metricFallbackLabel = (metric: unknown) => METRIC_FALLBACK[String(metric)] ?? String(metric);

const crit = (p: MessageParams) => CRITERION_FALLBACK[String(p.criterion)] ?? { label: String(p.criterion), unit: String(p.unit ?? ''), op: 'min' as const };
const unitOf = (p: MessageParams) => (p.unit === 'EUR_MINOR' || p.unit === 'EUR' ? '€' : p.unit ? String(p.unit) : '');
const val = (p: MessageParams, base: string) => fallbackRange(p, base);
const vals = (p: MessageParams) => {
  if (p.unit === 'EUR_MINOR') return `${p.a} ${fallbackEurRange({ amountMinMinor: p.valueAMin, amountMaxMinor: p.valueAMax })} vs ${p.b} ${fallbackEurRange({ amountMinMinor: p.valueBMin, amountMaxMinor: p.valueBMax })}`;
  return `${p.a} ${val(p, 'valueA')} vs ${p.b} ${val(p, 'valueB')}${unitOf(p) ? ` ${unitOf(p)}` : ''}`;
};
const lower = (x: unknown) => String(x).toLowerCase().replace(/_/g, '-');
const who = (p: MessageParams) => [p.missingA ? p.a : undefined, p.missingB ? p.b : undefined].filter(Boolean).join(' and ');

export const COMPARISON_MESSAGE_TEMPLATES: Readonly<Record<string, (p: MessageParams) => string>> = {
  // Requisitos (deal breakers / deseados)
  'comparison.requirement.pass': (p) => `${crit(p).label} ${fallbackRange(p, 'observed')} ${crit(p).unit} meets ${crit(p).op === 'max' ? '≤' : '≥'} ${fallbackNumber(p.required)} ${crit(p).unit}`,
  'comparison.requirement.fail': (p) => `${crit(p).label} ${fallbackRange(p, 'observed')} ${crit(p).unit} does not meet ${crit(p).op === 'max' ? '≤' : '≥'} ${fallbackNumber(p.required)} ${crit(p).unit}`,
  'comparison.requirement.range_dependent': (p) => `${crit(p).label} ${fallbackRange(p, 'observed')} ${crit(p).unit}: depends on configuration (required ${crit(p).op === 'max' ? '≤' : '≥'} ${fallbackNumber(p.required)})`,
  'comparison.requirement.no_data': (p) => `${crit(p).label}: no usable data`,
  'comparison.requirement.no_plugin_range': (p) => `${p.powertrain} has no plug-in electric range`,
  // Métricas
  'comparison.metric.directional': (p) => {
    const head = `${metricFallbackLabel(p.metric)}: ${vals(p)}`;
    const tail =
      p.outcome === 'AHEAD' ? `${p.a} ahead (${lower(p.level)} difference)` : p.outcome === 'BEHIND' ? `${p.b} ahead (${lower(p.level)} difference)` : p.outcome === 'PRACTICAL_TIE' ? 'practical tie' : p.outcome === 'RANGE_DEPENDENT' ? 'the difference depends on configuration' : 'different (no better/worse direction)';
    return `${head} — ${tail}${p.forYouLevel ? `; for this scenario the practical impact is ${lower(p.forYouLevel)}` : ''}`;
  },
  'comparison.metric.descriptive': (p) => (p.outcome === 'PRACTICAL_TIE' ? `${metricFallbackLabel(p.metric)}: both ${p.valueA}` : `${metricFallbackLabel(p.metric)}: ${p.a} ${p.valueA} · ${p.b} ${p.valueB}`),
  'comparison.metric.described': (p) => `${metricFallbackLabel(p.metric)}: ${vals(p)}`,
  'comparison.metric.ncap_not_comparable': (p) => `NCAP: ${p.a} ${p.starsA ?? '?'}★ ${p.authorityA} ${p.yearA ?? ''} · ${p.b} ${p.starsB ?? '?'}★ ${p.authorityB} ${p.yearB ?? ''} — not directly comparable`,
  // Motivos de UNKNOWN / NOT_COMPARABLE
  'comparison.reason.no_usable': (p) => `no usable ${p.metric} for ${who(p)}`,
  'comparison.reason.value_unknown': () => 'value unknown',
  'comparison.reason.non_numeric': () => 'non-numeric values',
  'comparison.reason.no_threshold': () => 'no meaningful-difference threshold in methodology: described only',
  'comparison.reason.not_comparable': (p) =>
    p.code === 'CYCLE_MISMATCH' ? `NOT_DIRECTLY_COMPARABLE: ${p.cycleA} vs ${p.cycleB}` : p.code === 'CYCLE_UNDECLARED' ? 'NOT_DIRECTLY_COMPARABLE: test cycle not declared' : `NOT_DIRECTLY_COMPARABLE: ${lower(p.code)}${p.field ? ` (${p.field})` : ''}`,
  'comparison.reason.no_safety_rating': (p) => `no safety rating for ${who(p)}`,
  'comparison.reason.ncap_protocols': (p) => `different protocols: ${p.authorityA} ${p.yearA ?? ''} (${p.protocolA ?? 'protocol unknown'}) vs ${p.authorityB} ${p.yearB ?? ''} (${p.protocolB ?? 'protocol unknown'})`,
  'comparison.reason.field_missing': (p) => `${metricFallbackLabel(p.metric)} missing`,
  // Meaningful For You (reglas for-you-v1)
  'comparison.meaningful_for_you.range_low_relevance': () => 'range: daily use far below every car range, charging at home, few long trips',
  'comparison.meaningful_for_you.range_full_relevance': () => 'range: frequent long trips keep full relevance',
  'comparison.meaningful_for_you.cargo_large_family': () => 'cargo: large family',
  'comparison.meaningful_for_you.cargo_single_driver': () => 'cargo: single driver without long trips',
  'comparison.meaningful_for_you.performance_low_priority': () => 'performance: low priority',
  'comparison.meaningful_for_you.performance_high_priority': () => 'performance: high priority',
  'comparison.meaningful_for_you.consumption_high_mileage': () => 'consumption: high annual mileage',
  'comparison.meaningful_for_you.consumption_low_mileage': () => 'consumption: low annual mileage',
  // Economía de la comparación
  'comparison.economic.no_result': (p) => `no economic result for ${who(p)}`,
  'comparison.economic.running_unavailable': (p) => `running cost unavailable for ${who(p)} (never treated as a tie)`,
  'comparison.economic.different_scenarios': () => 'economic results were computed with different scenarios or methodology versions',
  'comparison.economic.cycles_not_comparable': (p) => `energy costs derived from different test cycles (${p.a}: ${p.cycleA}, ${p.b}: ${p.cycleB}) — not directly comparable`,
  // Confianza de datos de la comparación
  'comparison.confidence.categories_not_available': (p) => `${p.notAvailable}/${p.total} categories not available for at least one vehicle`,
  'comparison.confidence.partial_category': (p) => `partial category: ${p.category}`,
  'comparison.confidence.coarse_mapping': (p) => `${p.count} compared value(s) mapped only at powertrain/generation level or inferred`,
  'comparison.confidence.conflicts_excluded': () => 'values in unresolved conflict were excluded',
  'comparison.confidence.range_dependent': (p) => `${p.count}/${p.total} comparisons depend on configuration ranges`,
  'comparison.confidence.economic_confidence': (p) => `economic confidence ${p.level}`,
  'comparison.confidence.economic_status': (p) => `economic comparison ${lower(p.status)}`,
};

/** Params REQUERIDOS por clave (contrato verificado por test). */
export const COMPARISON_MESSAGE_PARAM_SCHEMA: Readonly<Record<string, readonly string[]>> = {
  'comparison.requirement.pass': ['criterion', 'required', 'unit', 'observedMin', 'observedMax'],
  'comparison.requirement.fail': ['criterion', 'required', 'unit', 'observedMin', 'observedMax'],
  'comparison.requirement.range_dependent': ['criterion', 'required', 'unit', 'observedMin', 'observedMax'],
  'comparison.requirement.no_data': ['criterion', 'required', 'unit'],
  'comparison.requirement.no_plugin_range': ['criterion', 'required', 'powertrain'],
  'comparison.metric.directional': ['metric', 'outcome', 'a', 'b'],
  'comparison.metric.descriptive': ['metric', 'outcome', 'a', 'b', 'valueA', 'valueB'],
  'comparison.metric.described': ['metric', 'a', 'b'],
  'comparison.metric.ncap_not_comparable': ['a', 'b', 'authorityA', 'authorityB'],
  'comparison.reason.no_usable': ['metric', 'a', 'b', 'missingA', 'missingB'],
  'comparison.reason.value_unknown': ['metric'],
  'comparison.reason.non_numeric': ['metric'],
  'comparison.reason.no_threshold': ['metric'],
  'comparison.reason.not_comparable': ['metric', 'code'],
  'comparison.reason.no_safety_rating': ['a', 'b', 'missingA', 'missingB'],
  'comparison.reason.ncap_protocols': ['authorityA', 'authorityB'],
  'comparison.reason.field_missing': ['metric'],
  'comparison.meaningful_for_you.range_low_relevance': ['metric', 'dailyKm', 'smallestRangeKm', 'longTripsPerYear'],
  'comparison.meaningful_for_you.range_full_relevance': ['metric', 'longTripsPerYear'],
  'comparison.meaningful_for_you.cargo_large_family': ['metric', 'familySize'],
  'comparison.meaningful_for_you.cargo_single_driver': ['metric'],
  'comparison.meaningful_for_you.performance_low_priority': ['metric'],
  'comparison.meaningful_for_you.performance_high_priority': ['metric'],
  'comparison.meaningful_for_you.consumption_high_mileage': ['metric', 'annualKm'],
  'comparison.meaningful_for_you.consumption_low_mileage': ['metric', 'annualKm'],
  'comparison.economic.no_result': ['a', 'b', 'missingA', 'missingB'],
  'comparison.economic.running_unavailable': ['a', 'b', 'missingA', 'missingB'],
  'comparison.economic.different_scenarios': [],
  'comparison.economic.cycles_not_comparable': ['a', 'b', 'cycleA', 'cycleB'],
  'comparison.confidence.categories_not_available': ['notAvailable', 'total'],
  'comparison.confidence.partial_category': ['category'],
  'comparison.confidence.coarse_mapping': ['count'],
  'comparison.confidence.conflicts_excluded': [],
  'comparison.confidence.range_dependent': ['count', 'total'],
  'comparison.confidence.economic_confidence': ['level'],
  'comparison.confidence.economic_status': ['status'],
};

export const cmessage = createMessageFactory(COMPARISON_MESSAGE_TEMPLATES);

/** Valor numérico o rango como params `xMin`/`xMax`; texto/booleano como `x` (código de dato). */
export function valueParams(base: string, v: { min: unknown; max: unknown } | undefined): Record<string, string | number | boolean> {
  if (!v) return {};
  if (typeof v.min === 'number' && typeof v.max === 'number') return { [`${base}Min`]: v.min, [`${base}Max`]: v.max };
  return { [base]: typeof v.min === 'boolean' ? v.min : String(v.min) };
}

export type { Message };
