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
  return createDecisionPipeline({ vehicles: data.vehicles.map((v) => v.pipeline), energyContext: data.energy, economicScenario, decisionScenario });
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
  const result = opts.robustness ? recommend(input, { probe: pipeline.probe }) : recommend(input);
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
  const r = recommend(pipeline.input(), { probe: pipeline.probe });
  return { resultRobustness: r.resultRobustness, recommendationConfidence: r.recommendationConfidence, scenarioHash: r.scenarioHash, ms: performance.now() - t0 };
}
