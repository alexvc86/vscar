import { minConfidence } from '@vscar/methodology';
import type { UsedAdjustmentResult } from '@vscar/used-adjustment';
import { subjectOf, type DecisionSubject } from '@vscar/vehicle-schema';
import type { AlphaDecisionResult, DecisionInput } from './contracts.ts';
import { decide } from './decide.ts';
import type { Message } from './messages.ts';
import { recommendationConfidence, type RecommendationConfidence, type UsedInformationConfidenceInput } from './recommendation-confidence.ts';
import { resultRobustness, type ResultRobustness, type RobustnessProbe } from './robustness.ts';
import { buildWhyNot, type VerificationItem, type WhyNotItem, type WhyNotResult } from './why-not.ts';

/**
 * Step 6c: envuelve `AlphaDecisionResult` (sin duplicar sus bloques) con Why Not, tradeoffs, verificación,
 * robustez y confianza de la recomendación. Step 8a: con sujetos usados, añade sus ajustes (señales,
 * verificación, información) sin cambiar nada de un resultado new/new.
 */
export interface AlphaRecommendationResult extends AlphaDecisionResult {
  whyNotByCandidate: Record<string, WhyNotResult>;
  tradeoffsForSelected: WhyNotItem[];
  requiresVerification: VerificationItem[];
  notices: Message[];
  resultRobustness: ResultRobustness;
  recommendationConfidence: RecommendationConfidence;
  /** Información de la(s) unidad(es) usada(s) recomendada(s); NOT_APPLICABLE si lo recomendado no es un usado. */
  usedInformationConfidence: UsedInformationConfidenceInput;
  /** Step 8a (solo si hay sujetos usados): qué es cada candidato (ReferenceVariant o unidad usada). */
  subjects?: DecisionSubject[];
  /** Step 8a (solo si hay sujetos usados): ajuste de cada unidad usada, por `subjectId`. */
  usedAdjustments?: Record<string, UsedAdjustmentResult>;
}

/**
 * Nivel de información de usado que afecta a ESTA recomendación: el de las unidades usadas recomendadas (o
 * empatadas); sin recomendación, el de todas. Una unidad usada no recomendada no limita la confianza en otra.
 */
export function usedInformationForRecommendation(decision: AlphaDecisionResult, adjustments: readonly UsedAdjustmentResult[]): UsedInformationConfidenceInput {
  const bfy = decision.alphaBestForYou;
  const selected = bfy.candidateId ? [bfy.candidateId] : bfy.tiedIds?.length ? bfy.tiedIds : decision.candidates;
  const levels = adjustments.filter((a) => selected.includes(a.subject.subjectId)).map((a) => a.informationConfidence.level);
  return levels.length ? minConfidence(...levels) : 'NOT_APPLICABLE';
}

export function recommend(
  input: DecisionInput,
  opts: { probe?: RobustnessProbe; usedInformationConfidence?: UsedInformationConfidenceInput; usedAdjustments?: readonly UsedAdjustmentResult[] } = {},
): AlphaRecommendationResult {
  const decision = decide(input);
  // Orden por sujeto (como `decide`): el resultado no depende del orden de entrada (simetría A/B).
  const adjustments = (opts.usedAdjustments ?? []).filter((a) => decision.candidates.includes(a.subject.subjectId)).sort((a, b) => a.subject.subjectId.localeCompare(b.subject.subjectId));
  const why = buildWhyNot(input, decision, adjustments);
  const robustness = resultRobustness(decision, opts.probe);
  const used = opts.usedInformationConfidence ?? usedInformationForRecommendation(decision, adjustments);
  return {
    ...decision,
    ...why,
    resultRobustness: robustness,
    recommendationConfidence: recommendationConfidence(decision, robustness, used),
    usedInformationConfidence: used,
    ...(adjustments.length
      ? {
          subjects: [...new Map(input.candidates.map((c) => [c.id, c])).values()].sort((a, b) => a.id.localeCompare(b.id)).map(subjectOf),
          usedAdjustments: Object.fromEntries(adjustments.map((a) => [a.subject.subjectId, a])),
        }
      : {}),
  };
}
