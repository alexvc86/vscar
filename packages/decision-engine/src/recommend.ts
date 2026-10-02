import type { AlphaDecisionResult, DecisionInput } from './contracts.ts';
import { decide } from './decide.ts';
import type { Message } from './messages.ts';
import { recommendationConfidence, type RecommendationConfidence, type UsedInformationConfidenceInput } from './recommendation-confidence.ts';
import { resultRobustness, type ResultRobustness, type RobustnessProbe } from './robustness.ts';
import { buildWhyNot, type VerificationItem, type WhyNotItem, type WhyNotResult } from './why-not.ts';

/**
 * Step 6c: envuelve `AlphaDecisionResult` (sin duplicar sus bloques) con Why Not, tradeoffs, verificación,
 * robustez y confianza de la recomendación.
 */
export interface AlphaRecommendationResult extends AlphaDecisionResult {
  whyNotByCandidate: Record<string, WhyNotResult>;
  tradeoffsForSelected: WhyNotItem[];
  requiresVerification: VerificationItem[];
  notices: Message[];
  resultRobustness: ResultRobustness;
  recommendationConfidence: RecommendationConfidence;
  /** NOT_APPLICABLE mientras no exista Used Adjustment / instancia usada. */
  usedInformationConfidence: UsedInformationConfidenceInput;
}

export function recommend(input: DecisionInput, opts: { probe?: RobustnessProbe; usedInformationConfidence?: UsedInformationConfidenceInput } = {}): AlphaRecommendationResult {
  const decision = decide(input);
  const why = buildWhyNot(input, decision);
  const robustness = resultRobustness(decision, opts.probe);
  const used = opts.usedInformationConfidence ?? 'NOT_APPLICABLE';
  return { ...decision, ...why, resultRobustness: robustness, recommendationConfidence: recommendationConfidence(decision, robustness, used), usedInformationConfidence: used };
}
