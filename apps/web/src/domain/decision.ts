import { createDecisionPipeline, recommend, type AlphaRecommendationResult, type DecisionInput } from '@vscar/decision-engine';
import type { ComparisonData } from './comparison-data.ts';
import { toEngineScenarios, type Scenario } from './scenario.ts';

/**
 * Decisión REAL: datos de la comparación (resueltos en servidor desde MySQL) → `createDecisionPipeline`
 * (Economics → Comparison → Decision → 6c). El mismo módulo corre en el servidor (RSC, resultado inicial), en el
 * cliente (chunk diferido, recálculo) y en el Web Worker (robustez). Mismos datos + escenario → misma decisión.
 */
function pipelineFor(data: ComparisonData, scenario: Scenario) {
  const { economicScenario, decisionScenario } = toEngineScenarios(scenario);
  // Step 8b: las unidades usadas llevan su `usedInstance` y la fecha de evaluación de los datos (nunca el reloj).
  return createDecisionPipeline({ vehicles: data.vehicles.map((v) => v.pipeline), energyContext: data.energy, economicScenario, decisionScenario, ...(data.evaluationDate ? { evaluationDate: data.evaluationDate } : {}) });
}

export interface DecisionRun {
  result: AlphaRecommendationResult;
  input: DecisionInput;
  ms: number;
}

/**
 * `robustness: false` = ruta interactiva del cliente (barata, 3–25 ms; la robustez llega después del worker).
 * `robustness: true` = render de servidor (RSC) o worker: resultado completo, nunca en un handler de input.
 */
export function computeDecision(data: ComparisonData, scenario: Scenario, opts: { robustness: boolean }): DecisionRun {
  const t0 = performance.now();
  const pipeline = pipelineFor(data, scenario);
  const input = pipeline.input();
  // Ajustes de usado del MISMO pipeline (vacío sin usados: idéntico a la ruta new/new de siempre).
  const used = pipeline.usedAdjustments.length ? { usedAdjustments: pipeline.usedAdjustments } : {};
  const result = opts.robustness ? recommend(input, { probe: pipeline.probe, ...used }) : recommend(input, used);
  return { result, input, ms: performance.now() - t0 };
}

export interface RobustnessRun {
  resultRobustness: AlphaRecommendationResult['resultRobustness'];
  recommendationConfidence: AlphaRecommendationResult['recommendationConfidence'];
  scenarioHash: string;
  ms: number;
}

/** Robustez completa (0,1–0,7 s): SOLO desde el Web Worker o el render de servidor (ADR-011 §6). */
export function computeRobustness(data: ComparisonData, scenario: Scenario): RobustnessRun {
  const t0 = performance.now();
  const pipeline = pipelineFor(data, scenario);
  const r = recommend(pipeline.input(), { probe: pipeline.probe, ...(pipeline.usedAdjustments.length ? { usedAdjustments: pipeline.usedAdjustments } : {}) });
  return { resultRobustness: r.resultRobustness, recommendationConfidence: r.recommendationConfidence, scenarioHash: r.scenarioHash, ms: performance.now() - t0 };
}
