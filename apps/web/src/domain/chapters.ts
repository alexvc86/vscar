import type { ChapterView, Level, MetricView } from './view-model.ts';

/**
 * Capítulos dinámicos (Step 6d §3.1 → Step 7c §27–31). La UI NO decide qué es importante: cada capítulo opcional
 * existe solo si el Decision Engine lo hace relevante (contribuciones, Meaningful For You, Practical Fit, Economic
 * Fit, Why Not/tradeoffs). Fijos: VS, resultado, qué cambia el resultado, confianza y detalle (+ metodología dentro).
 *
 *   Selección por PRIORIDAD (§30): motivos → encaje práctico (requisitos) → económico → técnico → tradeoffs
 *   Orden en la PÁGINA (§27): VS → resultado → motivos → económico → técnico → práctico → tradeoffs → cambio →
 *                             confianza → detalle
 *   Tope: 9 capítulos (6–9); nunca un capítulo vacío.
 * Step 8b: con alguna unidad usada se añade el capítulo `used` (información de la unidad, señales y verificación),
 *   fuera del tope, y el económico pasa a ser obligatorio (la diferencia de compra y el coste conocido son la
 *   pregunta central nuevo vs usado). Sin usados, los capítulos son exactamente los de antes.
 */
export const MAX_CHAPTERS = 9;
const MAX_REASONS = 2;

const RANK: Record<string, number> = { TIE: 0, SLIGHT: 1, MEANINGFUL: 2, CLEAR: 3 };
const PRACTICAL_RELEVANT = new Set(['FAIL', 'PASS_WITH_COMPROMISES', 'UNCONFIRMED']);

export interface ChapterInput {
  /** Métricas protagonistas (contribuciones del engine o, en empate, diferencias relevantes poco relevantes para ti). */
  keyMetrics: readonly MetricView[];
  /** Todas las métricas técnicas (sin Economía) orientadas a la página. */
  technicalMetrics: readonly MetricView[];
  economicStatus: string;
  practicalStatus: readonly [string, string];
  hasTradeoffs: boolean;
  /** Step 8b: hay al menos una unidad usada. */
  hasUsed?: boolean;
}

const slugOf = (metric: string) => metric.replace(/[^a-z0-9]+/gi, '-');

/** Diferencias técnicas que el engine califica de relevantes (≥ MEANINGFUL) y que no son ya un capítulo de motivo. */
export function relevantTechnicalMetrics(technical: readonly MetricView[], keyMetrics: readonly MetricView[]): MetricView[] {
  const shown = new Set(keyMetrics.map((m) => m.metric));
  return technical
    .filter((m) => !shown.has(m.metric) && m.a && m.b && m.outcome !== 'NOT_COMPARABLE' && (RANK[m.meaningful as Level] ?? 0) >= RANK.MEANINGFUL!)
    .sort((x, y) => (RANK[y.meaningful as Level] ?? 0) - (RANK[x.meaningful as Level] ?? 0) || (RANK[y.forYou as Level] ?? 0) - (RANK[x.forYou as Level] ?? 0) || x.metric.localeCompare(y.metric));
}

export function buildComparisonChapters(input: ChapterInput): ChapterView[] {
  const reasons = input.keyMetrics.slice(0, MAX_REASONS);
  const hasEconomyReason = reasons.some((m) => m.category === 'Economy');

  // Candidatos opcionales en orden de PRIORIDAD (§30).
  const optional: { kind: ChapterView['kind']; when: boolean }[] = [
    // Requisitos: un deal breaker, una concesión o un requisito sin confirmar cambian la decisión.
    { kind: 'practical', when: input.practicalStatus.some((s) => PRACTICAL_RELEVANT.has(s)) || input.practicalStatus[0] !== input.practicalStatus[1] },
    // Económico: líder comparable (si no es ya un motivo) o ciclos incomparables, que hay que explicar.
    { kind: 'economics', when: (input.economicStatus === 'LEADER' && !hasEconomyReason) || input.economicStatus === 'NOT_COMPARABLE' || !!input.hasUsed },
    { kind: 'technical', when: relevantTechnicalMetrics(input.technicalMetrics, reasons).length > 0 },
    { kind: 'tradeoffs', when: input.hasTradeoffs },
  ];

  const fixed = 2 + reasons.length + 3; // vs, result, motivos, change, confidence, details
  const chosen = new Set<ChapterView['kind']>();
  for (const o of optional) if (o.when && fixed + chosen.size < MAX_CHAPTERS) chosen.add(o.kind);

  const chapters: ChapterView[] = [{ id: 'vs', kind: 'vs' }, { id: 'result', kind: 'result' }];
  for (const m of reasons) chapters.push({ id: `reason-${slugOf(m.metric)}`, kind: 'reason', metric: m.metric });
  for (const kind of ['economics', 'technical', 'practical'] as const) if (chosen.has(kind)) chapters.push({ id: kind, kind });
  if (input.hasUsed) chapters.push({ id: 'used', kind: 'used' });
  if (chosen.has('tradeoffs')) chapters.push({ id: 'tradeoffs', kind: 'tradeoffs' });
  chapters.push({ id: 'change', kind: 'change' }, { id: 'confidence', kind: 'confidence' }, { id: 'details', kind: 'details' });
  return chapters;
}
