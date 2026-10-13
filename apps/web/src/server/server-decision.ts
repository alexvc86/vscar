import 'server-only';
import type { ComparisonData } from '@/domain/comparison-data';
import { computeDecision } from '@/domain/decision';
import { scenarioKey, type Scenario } from '@/domain/scenario';
import { buildDecisionView, type DecisionView } from '@/domain/view-model';

/**
 * Resultado INICIAL en el servidor (ADR-011 §6): decisión completa con robustez, en el HTML.
 * Caché LRU en memoria por (datos de la comparación — par, mercado, canal, snapshot — y escenario): el mismo
 * escenario no recalcula (0,1–0,7 s la robustez).
 */
const MAX = 200;
const cache = new Map<string, { view: DecisionView; ms: number }>();

export function serverDecisionView(data: ComparisonData, scenario: Scenario): { view: DecisionView; ms: number; cached: boolean } {
  const key = `${data.key}|${scenarioKey(scenario)}`;
  const hit = cache.get(key);
  if (hit) {
    cache.delete(key);
    cache.set(key, hit);
    return { ...hit, cached: true };
  }
  const run = computeDecision(data, scenario, { robustness: true });
  const entry = { view: buildDecisionView(data, run.input, run.result, true), ms: run.ms };
  cache.set(key, entry);
  if (cache.size > MAX) cache.delete(cache.keys().next().value!);
  return { ...entry, cached: false };
}
