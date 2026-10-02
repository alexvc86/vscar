import { RECOMMENDATION_CONFIDENCE_RULES, minConfidence, type ConfidenceLevel } from '@vscar/methodology';
import type { AlphaDecisionResult } from './contracts.ts';
import { message, type Message } from './messages.ts';
import type { ResultRobustness } from './robustness.ts';

/**
 * Recommendation Confidence (Step 6c): cuánto fiarse de la recomendación. Combina señales EXISTENTES
 * (confianza de datos de la decisión —que ya integra comparación, economía, mapping, conflictos, rangos—,
 * requisitos sin confirmar, comparabilidad económica, robustez y, cuando exista, información de la unidad usada).
 * No es el Alpha Fit (un coche puede encajar mucho con confianza baja) ni trata derechos de publicación.
 */
export interface RecommendationConfidence {
  level: ConfidenceLevel;
  /** Secundario: el nivel y los motivos son el contrato público. */
  score: number;
  reasons: Message[];
  rulesVersion: string;
}

export type UsedInformationConfidenceInput = ConfidenceLevel | 'NOT_APPLICABLE';

const R = RECOMMENDATION_CONFIDENCE_RULES;
const CRIT: Record<string, string> = {
  minSeats: 'Seat count',
  minBootL: 'Boot volume',
  minTowingKg: 'Towing capacity',
  maxLengthMm: 'Length',
  maxWidthMm: 'Width',
  maxHeightMm: 'Height',
  minElectricRangeKm: 'Electric range',
  maxPurchasePriceEur: 'Purchase price',
};

export function recommendationConfidence(decision: AlphaDecisionResult, robustness: ResultRobustness, usedInformation: UsedInformationConfidenceInput = 'NOT_APPLICABLE'): RecommendationConfidence {
  const reasons: Message[] = [];
  let score = 100;
  const caps: ConfidenceLevel[] = ['HIGH'];
  const P = R.penalties;
  const bfy = decision.alphaBestForYou;
  const selected = bfy.candidateId ? [bfy.candidateId] : bfy.tiedIds ?? [];
  const pf = new Map(decision.practicalFit.map((p) => [p.candidateId, p]));

  const dc = decision.dataConfidence.level;
  if (P.data_confidence[dc]) {
    score -= P.data_confidence[dc]!;
    reasons.push(message('decision.confidence.data', { level: dc, detail: decision.dataConfidence.reasons.slice(0, 2).join('; ') || undefined }));
  }
  for (const id of selected) {
    for (const u of pf.get(id)?.mandatoryUnknowns ?? []) {
      score -= P.selected_unconfirmed_per_requirement;
      reasons.push(message('decision.confidence.unconfirmed_requirement', { what: CRIT[u.criterion] ?? u.criterion, candidateId: id }));
    }
    const desiredUnknown = (pf.get(id)?.unknowns.length ?? 0) - (pf.get(id)?.mandatoryUnknowns.length ?? 0);
    if (desiredUnknown > 0) {
      score -= Math.min(P.desired_unknown_max, desiredUnknown * P.desired_unknown_per_item);
      reasons.push(message('decision.confidence.desired_unknown', { count: desiredUnknown, candidateId: id }));
    }
  }
  const eligible = decision.practicalFit.filter((p) => p.status !== 'FAIL');
  if (eligible.length && eligible.every((p) => p.status === 'UNCONFIRMED')) {
    caps.push(R.caps.ALL_UNCONFIRMED!);
    reasons.push(message('decision.confidence.all_unconfirmed'));
  }
  const ef = decision.economicFit.status;
  if (ef === 'NOT_COMPARABLE') {
    score -= P.economic_not_comparable;
    reasons.push(message('decision.confidence.economics_not_comparable'));
  } else if (ef === 'UNKNOWN') {
    score -= P.economic_unknown;
    reasons.push(message('decision.confidence.economics_unknown'));
  } else reasons.push(message('decision.confidence.economics_comparable'));

  if (P.robustness[robustness.level] && !['TIE', 'RANGE_DEPENDENT', 'NO_RECOMMENDATION'].includes(robustness.status)) {
    score -= P.robustness[robustness.level]!;
    reasons.push(message('decision.confidence.robustness', { level: robustness.level, detail: robustness.messages[0]?.text }));
  }
  if (usedInformation !== 'NOT_APPLICABLE' && P.used_information[usedInformation]) {
    score -= P.used_information[usedInformation]!;
    reasons.push(message('decision.confidence.used_information', { level: usedInformation }));
  }
  const cap = R.caps[bfy.status];
  if (cap) {
    caps.push(cap);
    reasons.push(message('decision.confidence.cap', { level: cap, reason: bfy.status }));
  }
  score = Math.max(0, score);
  const byScore: ConfidenceLevel = score >= R.thresholds.high ? 'HIGH' : score >= R.thresholds.medium ? 'MEDIUM' : 'LOW';
  return { level: minConfidence(byScore, ...caps), score, reasons, rulesVersion: R.version };
}
