/// <reference lib="webworker" />
import { computeRobustness } from '@/domain/decision';
import { Scenario } from '@/domain/scenario';
import type { RobustnessRequest, RobustnessResponse } from './robustness-protocol';

/**
 * Robustez completa fuera del hilo principal (ADR-011 §6): 0,1–0,7 s de re-evaluaciones del pipeline.
 * Devuelve `ResultRobustness` + la `RecommendationConfidence` que depende de ella.
 */
const scope = self as unknown as DedicatedWorkerGlobalScope;
/** Marca estable del chunk del worker (la usa el informe de bundle para localizarlo). */
const WORKER = 'vscar-robustness-worker';

scope.onmessage = (event: MessageEvent<RobustnessRequest>) => {
  const { id, data, scenario } = event.data;
  let response: RobustnessResponse;
  try {
    response = { ok: true, id, ...computeRobustness(data, Scenario.parse(scenario)) };
  } catch (e) {
    response = { ok: false, id, error: `${WORKER}: ${e instanceof Error ? e.message : String(e)}` };
  }
  scope.postMessage(response);
};
