import type { MetricComparison } from '@vscar/comparison-engine';
import type { AlphaRecommendationResult } from '@vscar/decision-engine';
import { IDS, LABELS } from './pipeline.ts';

/** Vista mínima del resultado REAL para la UI del lab (sin decidir nada aquí). */
export interface ResultView {
  status: 'PRACTICAL_TIE' | 'SELECTED' | 'OTHER';
  rawStatus: string;
  selectedId?: string;
  selectedLabel?: string;
  headline: string;
  reasons: string[];
  confidence: { level: string; reasons: string[] };
}

export function resultView(r: AlphaRecommendationResult): ResultView {
  const b = r.alphaBestForYou;
  const status = b.status === 'PRACTICAL_TIE' ? 'PRACTICAL_TIE' : b.status === 'BEST_FOR_YOU' ? 'SELECTED' : 'OTHER';
  const reasons = status === 'SELECTED' ? r.topContributions.slice(0, 3).map((c) => c.text) : [b.explanation];
  return {
    status,
    rawStatus: b.status,
    ...(b.candidateId ? { selectedId: b.candidateId, selectedLabel: LABELS[b.candidateId] ?? b.candidateId } : {}),
    headline: status === 'SELECTED' ? 'Best for your needs' : status === 'PRACTICAL_TIE' ? 'Practical tie' : b.status.replace(/_/g, ' ').toLowerCase(),
    reasons,
    confidence: { level: r.recommendationConfidence.level, reasons: r.recommendationConfidence.reasons.slice(0, 3).map((m) => m.text) },
  };
}

/** Las tres capas de la cifra (raw → Meaningful Difference → Meaningful For You), tal como las da el 6a. */
export interface MetricLayers {
  rawText: string;
  a: number;
  b: number;
  unit: string;
  meaningful: string;
  forYou?: string;
  forYouRules: string[];
}

export function rangeLayers(m: MetricComparison | undefined): MetricLayers | undefined {
  if (!m || !m.delta || typeof m.a?.min !== 'number' || typeof m.b?.min !== 'number') return undefined;
  const d = m.delta.min === m.delta.max ? m.delta.min : NaN;
  return {
    rawText: Number.isNaN(d) ? `${m.delta.min}–${m.delta.max}` : `${d > 0 ? '+' : ''}${d}`,
    a: m.a.min,
    b: m.b.min,
    unit: m.a.unit ?? '',
    meaningful: String(m.meaningful ?? 'UNKNOWN'),
    ...(m.meaningfulForYou ? { forYou: m.meaningfulForYou.level } : {}),
    forYouRules: m.meaningfulForYou?.rules ?? [],
  };
}

export const CANDIDATES = [
  { id: IDS.byd, label: 'BYD SEAL', year: 2026, side: 'a' as const },
  { id: IDS.model3, label: 'Tesla Model 3', year: 2021, side: 'b' as const },
];
