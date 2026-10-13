import type { ComparisonCategory, ComparisonResult, DealBreakerCheck, MetricComparison } from '@vscar/comparison-engine';
import { WHY_NOT_RULES } from '@vscar/methodology';
import type { AlphaDecisionResult, DecisionInput, Range } from './contracts.ts';
import { checkParams, message, type Message } from './messages.ts';

/**
 * Why Not / tradeoffs / verificación (Step 6c). Consume `ComparisonResult` (6a) y `AlphaDecisionResult` (6b):
 * no recalcula nada. UNKNOWN nunca se convierte en una desventaja confirmada; DIFFERENT nunca es "peor";
 * una economía NOT_COMPARABLE nunca produce "más caro".
 */
export type WhyNotType =
  | 'DEAL_BREAKER'
  | 'PRACTICAL_COMPROMISE'
  | 'REQUIRES_VERIFICATION'
  | 'ECONOMIC'
  | 'RANGE'
  | 'CHARGING'
  | 'SPACE'
  | 'PERFORMANCE'
  | 'SAFETY'
  | 'WARRANTY'
  | 'TECHNOLOGY'
  | 'ECO'
  | 'DATA_UNCERTAINTY';

/** BLOCKING (requisito incumplido) > COMPROMISE > VERIFY > MAJOR (CLEAR) > MODERATE (MEANINGFUL) > MINOR (SLIGHT) > INFO. */
export type WhyNotSeverity = 'BLOCKING' | 'COMPROMISE' | 'VERIFY' | 'MAJOR' | 'MODERATE' | 'MINOR' | 'INFO';

export interface WhyNotItem extends Message {
  type: WhyNotType;
  severity: WhyNotSeverity;
  /** Sobre qué es el motivo: el vehículo de referencia o la unidad usada concreta (Used Adjustment: futuro). */
  subject: 'REFERENCE_VARIANT' | 'USED_INSTANCE';
  metric?: string;
  /** Delta del candidato frente al otro (unidad de la métrica; céntimos en economía). Rangos conservados. */
  delta?: Range;
  level?: string;
  againstId?: string;
  provenance?: { value_ids?: string[]; source_ids?: string[] };
  sourceResult: 'DEAL_BREAKERS' | 'PRACTICAL_FIT' | 'COMPARISON' | 'ECONOMIC_FIT';
}

export interface WhyNotResult {
  candidateId: string;
  kind: 'WHY_NOT' | 'TRADEOFFS' | 'VERIFY_BEFORE_DECIDING';
  items: WhyNotItem[];
  /** true si solo hay diferencias menores (SLIGHT) o ninguna. */
  onlyMinor: boolean;
}

export interface VerificationItem extends Message {
  candidateId: string;
  criterion: string;
  mandatory: boolean;
}

const SEVERITY_RANK: Record<WhyNotSeverity, number> = { BLOCKING: 0, COMPROMISE: 1, VERIFY: 2, MAJOR: 3, MODERATE: 4, MINOR: 6, INFO: 7 };
const LEVEL_RANK = ['TIE', 'SLIGHT', 'MEANINGFUL', 'CLEAR'];
const TYPE_OF: Record<ComparisonCategory, WhyNotType> = {
  Performance: 'PERFORMANCE',
  Range: 'RANGE',
  Charging: 'CHARGING',
  Size: 'SPACE',
  Practicality: 'SPACE',
  Safety: 'SAFETY',
  Warranty: 'WARRANTY',
  Eco: 'ECO',
  Technology: 'TECHNOLOGY',
  Economy: 'ECO',
};

const order = (a: WhyNotItem, b: WhyNotItem) =>
  SEVERITY_RANK[a.severity] - SEVERITY_RANK[b.severity] ||
  // Economía antes que técnica dentro del mismo nivel; luego orden estable por tipo/métrica/clave.
  (a.type === 'ECONOMIC' ? 0 : 1) - (b.type === 'ECONOMIC' ? 0 : 1) ||
  a.type.localeCompare(b.type) ||
  (a.metric ?? '').localeCompare(b.metric ?? '') ||
  a.messageKey.localeCompare(b.messageKey) ||
  (a.againstId ?? '').localeCompare(b.againstId ?? '');

function pairOf(pairs: readonly ComparisonResult[], x: string, y: string) {
  return pairs.find((p) => (p.candidateAId === x && p.candidateBId === y) || (p.candidateAId === y && p.candidateBId === x))!;
}
/** Métrica vista desde `x` (AHEAD = x mejor; delta = x − y). */
function view(r: ComparisonResult, x: string, m: MetricComparison): MetricComparison {
  if (r.candidateAId === x) return m;
  const flip: Record<string, MetricComparison['outcome']> = { AHEAD: 'BEHIND', BEHIND: 'AHEAD' };
  return { ...m, outcome: flip[m.outcome] ?? m.outcome, a: m.b, b: m.a, ...(m.delta ? { delta: { min: -m.delta.max || 0, max: -m.delta.min || 0 } } : {}) } as MetricComparison;
}
const severityOf = (level?: string): WhyNotSeverity => (level === 'CLEAR' ? 'MAJOR' : level === 'MEANINGFUL' ? 'MODERATE' : 'MINOR');
/** Valor de la métrica como DATOS: rango numérico `xMin`/`xMax` o código (`x`). Nunca texto formateado. */
const valueOf = (base: string, v?: { min: unknown; max: unknown }): Record<string, string | number | boolean> =>
  !v ? {} : typeof v.min === 'number' && typeof v.max === 'number' ? { [`${base}Min`]: v.min, [`${base}Max`]: v.max } : { [base]: typeof v.min === 'boolean' ? v.min : String(v.min) };

function requirementItems(id: string, checks: readonly DealBreakerCheck[], type: 'DEAL_BREAKER' | 'PRACTICAL_COMPROMISE'): WhyNotItem[] {
  return checks.map((c) => ({
    ...message(type === 'DEAL_BREAKER' ? 'decision.why_not.deal_breaker' : 'decision.why_not.compromise', checkParams(c)),
    type,
    severity: type === 'DEAL_BREAKER' ? 'BLOCKING' : 'COMPROMISE',
    subject: 'REFERENCE_VARIANT',
    ...(c.provenance?.value_id ? { provenance: { value_ids: [c.provenance.value_id], ...(c.provenance.source_id ? { source_ids: [c.provenance.source_id] } : {}) } } : {}),
    sourceResult: type === 'DEAL_BREAKER' ? 'DEAL_BREAKERS' : 'PRACTICAL_FIT',
    metric: c.provenance?.spec_key ?? c.criterion,
  }));
}

function verificationItem(candidateId: string, c: DealBreakerCheck, mandatory: boolean): VerificationItem {
  const op = c.criterion.startsWith('max') ? 'max' : 'min';
  return { ...message(mandatory ? 'decision.verify.requirement' : 'decision.verify.desired', { ...checkParams(c), op }), candidateId, criterion: c.criterion, mandatory };
}

/** Desventajas de `x` frente a `y` según la comparación (solo resultados confirmados: BEHIND). */
function disadvantages(x: string, y: string, r: ComparisonResult, labels: Map<string, string>, includeDifferent: boolean, annualKm?: number): WhyNotItem[] {
  const out: WhyNotItem[] = [];
  const subject = labels.get(x)!;
  const other = labels.get(y)!;
  if (r.economicComparison.status === 'NOT_COMPARABLE' && r.economicComparison.metrics.length) {
    const rm = r.economicComparison.reasonMessage;
    // Ciclos vistos desde x (el sujeto): el mensaje de la comparación los da desde A.
    const flip = rm?.messageKey === 'comparison.economic.cycles_not_comparable' && r.candidateAId !== x;
    out.push({
      // Con ciclos, los params ya dicen el motivo; si no, el motivo de la comparación va como detalle.
      ...message('decision.why_not.economics_not_comparable', { subject, other, ...(rm?.params.cycleA ? { cycleSubject: String(flip ? rm.params.cycleB : rm.params.cycleA), cycleOther: String(flip ? rm.params.cycleA : rm.params.cycleB) } : {}) }, rm && !rm.params.cycleA ? [rm] : undefined),
      type: 'DATA_UNCERTAINTY',
      severity: 'INFO',
      subject: 'REFERENCE_VARIANT',
      againstId: y,
      sourceResult: 'COMPARISON',
    });
  }
  for (const raw of [...r.economicComparison.metrics, ...r.technicalComparisons]) {
    // Economía: solo el coste anual (los acumulados son el mismo hecho repetido).
    if (raw.category === 'Economy' && raw.metric.startsWith('economic.') && raw.metric !== 'economic.running_annual') continue;
    if (r.economicComparison.status !== 'COMPARED' && raw.metric.startsWith('economic.')) continue;
    const m = view(r, x, raw);
    const level = (m.meaningfulForYou?.level ?? m.meaningful) as string | undefined;
    const prov = { value_ids: [m.a?.value_id, m.b?.value_id].filter((v): v is string => !!v) };
    if (m.outcome === 'BEHIND') {
      const economic = m.metric === 'economic.running_annual';
      const msg = economic
        ? message('decision.why_not.running_cost', { amountMinMinor: m.delta!.min, amountMaxMinor: m.delta!.max, currency: 'EUR', annualKm, other })
        : message('decision.why_not.metric_behind', {
            metric: m.metric,
            subject,
            other,
            ...valueOf('value', m.a),
            ...valueOf('otherValue', m.b),
            unit: m.a?.unit ?? undefined,
            level: m.meaningful,
            forYou: m.meaningfulForYou && m.meaningfulForYou.level !== m.meaningful ? m.meaningfulForYou.level : undefined,
            deltaMin: m.delta?.min,
            deltaMax: m.delta?.max,
          });
      out.push({ ...msg, type: economic ? 'ECONOMIC' : TYPE_OF[m.category], severity: severityOf(level), subject: 'REFERENCE_VARIANT', metric: m.metric, ...(m.delta ? { delta: m.delta } : {}), ...(level ? { level } : {}), againstId: y, ...(prov.value_ids.length ? { provenance: prov } : {}), sourceResult: 'COMPARISON' });
    } else if (includeDifferent && m.outcome === 'DIFFERENT' && m.delta && LEVEL_RANK.indexOf(m.meaningful ?? '') >= LEVEL_RANK.indexOf(WHY_NOT_RULES.min_level)) {
      out.push({
        ...message('decision.why_not.metric_different', { metric: m.metric, subject, other, ...valueOf('value', m.a), ...valueOf('otherValue', m.b), unit: m.a?.unit ?? undefined, deltaMin: m.delta.min, deltaMax: m.delta.max }),
        type: TYPE_OF[m.category],
        severity: 'INFO',
        subject: 'REFERENCE_VARIANT',
        metric: m.metric,
        delta: m.delta,
        againstId: y,
        sourceResult: 'COMPARISON',
      });
    }
  }
  return out;
}

/** Recorta: lo relevante primero; SLIGHT solo si no hay nada más (y marcado como menor). Nunca rellena. */
function select(items: WhyNotItem[], max: number): { items: WhyNotItem[]; onlyMinor: boolean } {
  const dedup = [...new Map([...items].sort(order).map((i) => [`${i.type}|${i.metric ?? i.messageKey}|${i.messageKey}`, i])).values()].sort(order);
  const relevant = dedup.filter((i) => i.severity !== 'MINOR');
  const major = relevant.filter((i) => i.severity !== 'INFO');
  if (major.length || !WHY_NOT_RULES.allow_minor_fallback) return { items: [...major, ...relevant.filter((i) => i.severity === 'INFO')].slice(0, max), onlyMinor: false };
  return { items: [...relevant, ...dedup.filter((i) => i.severity === 'MINOR')].slice(0, max), onlyMinor: true };
}

export function buildWhyNot(input: DecisionInput, decision: AlphaDecisionResult) {
  const labels = new Map(input.candidates.map((c) => [c.id, c.label]));
  const pf = new Map(decision.practicalFit.map((p) => [p.candidateId, p]));
  const bfy = decision.alphaBestForYou;
  const annualKm = input.scenario.comparison?.annualKm;
  const selected = bfy.status === 'BEST_FOR_YOU' ? [bfy.candidateId!] : bfy.status === 'PRACTICAL_TIE' || bfy.status === 'RANGE_DEPENDENT' ? [...(bfy.tiedIds ?? [])] : [];
  const eligible = decision.practicalFit.filter((p) => p.status !== 'FAIL').map((p) => p.candidateId);
  const whyNotByCandidate: Record<string, WhyNotResult> = {};

  for (const id of decision.candidates) {
    const p = pf.get(id)!;
    const items: WhyNotItem[] = [...requirementItems(id, p.failed, 'DEAL_BREAKER'), ...requirementItems(id, p.compromises, 'PRACTICAL_COMPROMISE')];
    for (const u of p.mandatoryUnknowns) {
      const v = verificationItem(id, u, true);
      items.push({ messageKey: v.messageKey, params: v.params, text: v.text, type: 'REQUIRES_VERIFICATION', severity: 'VERIFY', subject: 'REFERENCE_VARIANT', metric: u.provenance?.spec_key ?? u.criterion, sourceResult: 'PRACTICAL_FIT' });
    }
    const isSelected = selected.includes(id);
    // Contra quién: el no elegido frente a los elegidos; el elegido frente a los demás elegibles (lo que sacrifica).
    const against = isSelected ? eligible.filter((y) => y !== id) : selected.length ? selected : eligible.filter((y) => y !== id);
    for (const y of against) items.push(...disadvantages(id, y, pairOf(input.comparison.pairs, id, y), labels, isSelected, annualKm));
    const { items: chosen, onlyMinor } = select(items, isSelected ? WHY_NOT_RULES.max_items_tradeoffs : WHY_NOT_RULES.max_items_why_not);
    const onlyVerify = chosen.length > 0 && chosen.every((i) => i.severity === 'VERIFY');
    whyNotByCandidate[id] = { candidateId: id, kind: isSelected ? 'TRADEOFFS' : onlyVerify ? 'VERIFY_BEFORE_DECIDING' : 'WHY_NOT', items: chosen, onlyMinor };
  }

  const requiresVerification: VerificationItem[] = decision.practicalFit.flatMap((p) => [
    ...p.mandatoryUnknowns.map((u) => verificationItem(p.candidateId, u, true)),
    ...p.unknowns.filter((u) => !p.mandatoryUnknowns.includes(u)).map((u) => verificationItem(p.candidateId, u, false)),
  ]);
  const notices: Message[] = [];
  if (bfy.status === 'NO_FULL_MATCH') {
    notices.push(message('decision.no_full_match'));
    if (bfy.closestCandidate) notices.push(message('decision.closest_option', { subject: labels.get(bfy.closestCandidate.candidateId), candidateId: bfy.closestCandidate.candidateId, failed: bfy.closestCandidate.failedChecks.length }));
  }
  const tradeoffsForSelected = bfy.status === 'BEST_FOR_YOU' ? whyNotByCandidate[bfy.candidateId!]!.items : [];
  return { whyNotByCandidate, tradeoffsForSelected, requiresVerification, notices };
}
