/// <reference lib="webworker" />
import { COMPARISONS } from '@/domain/comparisons';
import { computeRobustness } from '@/domain/decision';
import { Scenario } from '@/domain/scenario';
import type { RobustnessRequest, RobustnessResponse } from './robustness-protocol';

/**
 * Robustez completa fuera del hilo principal (ADR-011 §6): 0,1–0,7 s de re-evaluaciones del pipeline.
 * Devuelve `ResultRobustness` + la `RecommendationConfidence` que depende de ella.
 */
const scope = self as unknown as DedicatedWorkerGlobalScope;

scope.onmessage = (event: MessageEvent<RobustnessRequest>) => {
  const { id, slug, scenario } = event.data;
  let response: RobustnessResponse;
  try {
    const def = COMPARISONS[slug];
    if (!def) throw new Error(`unknown comparison ${slug}`);
    response = { ok: true, id, ...computeRobustness(def, Scenario.parse(scenario)) };
  } catch (e) {
    response = { ok: false, id, error: e instanceof Error ? e.message : String(e) };
  }
  scope.postMessage(response);
};
