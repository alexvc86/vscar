import { comparisonCandidateFromBundle } from '@vscar/comparison-engine';
import { createDecisionPipeline, recommend, type AlphaRecommendationResult, type DecisionInput, type PipelineVehicle } from '@vscar/decision-engine';
import { economicVehicleInputFromBundle } from '@vscar/economics-engine';
import { resolveEnergyContext, type EnergyContext } from '@vscar/market-context';
import { DatasetBundle, EnergyPriceObservation } from '@vscar/vehicle-schema';
import dataset from '@/data/dataset-core.snapshot.json';
import energy from '@/data/energy-observations.snapshot.json';
import { MARKETS, type MarketCode } from '@/i18n/locales';
import type { ComparisonDefinition } from './comparisons.ts';
import { toEngineScenarios, type Scenario } from './scenario.ts';

/**
 * Decisión REAL: snapshot controlado → `createDecisionPipeline` (Economics → Comparison → Decision → 6c).
 * El mismo módulo corre en el servidor (RSC, resultado inicial), en el cliente (chunk diferido, recálculo)
 * y en el Web Worker (robustez). Mismo escenario → misma decisión en los tres.
 */
let bundleCache: DatasetBundle | undefined;
const bundle = () => (bundleCache ??= DatasetBundle.parse(dataset.bundle));

const contextCache = new Map<string, EnergyContext>();
export function energyContextFor(market: MarketCode): EnergyContext {
  const m = MARKETS[market];
  const key = `${m.engineMarket}|${m.energyRegion}|${m.energyDate}`;
  let ctx = contextCache.get(key);
  if (!ctx) {
    const observations = energy.observations.map((o) => EnergyPriceObservation.parse(o));
    ctx = resolveEnergyContext({ market: m.engineMarket as 'ES', region: m.energyRegion, date: m.energyDate }, observations);
    contextCache.set(key, ctx);
  }
  return ctx;
}

export const VEHICLE_IDS = dataset.ids as Record<'byd' | 'model3', string>;

const vehiclesCache = new Map<string, PipelineVehicle[]>();
function vehiclesFor(def: ComparisonDefinition): PipelineVehicle[] {
  let v = vehiclesCache.get(def.slug);
  if (!v) {
    v = def.vehicles.map((x) => {
      const id = VEHICLE_IDS[x.key];
      return {
        candidate: comparisonCandidateFromBundle(bundle(), id, { label: x.name, ...(x.at ? { at: x.at } : {}) }),
        economicInput: economicVehicleInputFromBundle(bundle(), id, x.at ? { at: x.at } : {}),
      };
    });
    vehiclesCache.set(def.slug, v);
  }
  return v;
}

function pipelineFor(def: ComparisonDefinition, scenario: Scenario) {
  const { economicScenario, decisionScenario } = toEngineScenarios(scenario);
  return createDecisionPipeline({ vehicles: vehiclesFor(def), energyContext: energyContextFor(def.market), economicScenario, decisionScenario });
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
export function computeDecision(def: ComparisonDefinition, scenario: Scenario, opts: { robustness: boolean }): DecisionRun {
  const t0 = performance.now();
  const pipeline = pipelineFor(def, scenario);
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

/** Robustez completa (0,1–0,7 s): SOLO desde el Web Worker (ADR-011 §6). */
export function computeRobustness(def: ComparisonDefinition, scenario: Scenario): RobustnessRun {
  const t0 = performance.now();
  const pipeline = pipelineFor(def, scenario);
  const r = recommend(pipeline.input(), { probe: pipeline.probe });
  return { resultRobustness: r.resultRobustness, recommendationConfidence: r.recommendationConfidence, scenarioHash: r.scenarioHash, ms: performance.now() - t0 };
}
