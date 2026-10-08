import 'server-only';
import type { ComparisonDefinition } from './comparisons.ts';
import { computeDecision } from './decision.ts';
import { scenarioKey, type Scenario } from './scenario.ts';
import { buildDecisionView, type DecisionView } from './view-model.ts';

/**
 * Resultado INICIAL en el servidor (ADR-011 §6): decisión completa con robustez, en el HTML.
 * Caché LRU en memoria por (comparación, escenario): el mismo escenario no recalcula (0,1–0,7 s la robustez).
 */
const MAX = 200;
const cache = new Map<string, { view: DecisionView; ms: number }>();

export function serverDecisionView(def: ComparisonDefinition, scenario: Scenario): { view: DecisionView; ms: number; cached: boolean } {
  const key = `${def.slug}|${scenarioKey(scenario)}`;
  const hit = cache.get(key);
  if (hit) {
    cache.delete(key);
    cache.set(key, hit);
    return { ...hit, cached: true };
  }
  const run = computeDecision(def, scenario, { robustness: true });
  const entry = { view: buildDecisionView(def, run.input, run.result, true), ms: run.ms };
  cache.set(key, entry);
  if (cache.size > MAX) cache.delete(cache.keys().next().value!);
  return { ...entry, cached: false };
}
