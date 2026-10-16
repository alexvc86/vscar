import { compareCandidates } from '@vscar/comparison-engine';
import { createDecisionPipeline, decide, recommend } from '@vscar/decision-engine';
import { computeEconomics } from '@vscar/economics-engine';
import { adjustUsedVehicle, referenceContextFromCandidate } from '@vscar/used-adjustment';
import { describe, expect, it } from 'vitest';
import { pairSlug } from '../src/domain/catalog.ts';
import { DEFAULT_SCENARIO, toEngineScenarios } from '../src/domain/scenario.ts';
import { buildDecisionView } from '../src/domain/view-model.ts';
import { loadComparisonData } from '../src/server/comparison-loader.ts';
import { memoryCatalog } from './support/catalog.ts';

/**
 * Step 8c — desglose del coste del SSR por etapa (engines en proceso; catálogo en memoria con el mismo contrato que
 * MySQL). Solo con `VSCAR_PERF=1` (imprime p50/p95 de 30 iteraciones); la lectura de MySQL se mide en el servidor real
 * con `VSCAR_TIMINGS=1`.
 */
const GOLF = 'volkswagen-golf-style-1-5-etsi-150-dsg';
const run = process.env.VSCAR_PERF === '1';
const stats = (xs: number[]) => {
  const s = [...xs].sort((a, b) => a - b);
  const p = (q: number) => +s[Math.min(s.length - 1, Math.ceil(q * s.length) - 1)]!.toFixed(2);
  return { p50: p(0.5), p95: p(0.95) };
};

describe.skipIf(!run)('SSR breakdown (Golf new vs used)', () => {
  it('per stage', async () => {
    const t: Record<string, number[]> = { lookup: [], subject: [], usedAdjustment: [], economics: [], comparison: [], decision: [], view: [], robustness: [], total: [] };
    const conditions = { a: { condition: 'new' as const }, b: { condition: 'used' as const, facts: { price: 28_000, km: 84_000, reg: { year: 2019 }, service: 'partial' as const } }, evaluationDate: '2026-10-15' };
    for (let i = 0; i < 30; i++) {
      const catalog = memoryCatalog(); // sin caché del loader entre iteraciones
      const t0 = performance.now();
      const load = await loadComparisonData('ES', pairSlug(GOLF, GOLF), catalog, conditions);
      const t1 = performance.now();
      if (load.kind !== 'ok') throw new Error('load');
      const data = load.data;
      const { economicScenario, decisionScenario } = toEngineScenarios(DEFAULT_SCENARIO);
      const v = data.vehicles[1].pipeline;
      const t2 = performance.now();
      const adj = adjustUsedVehicle({ reference: referenceContextFromCandidate(v.candidate), instance: v.usedInstance!, evaluationDate: data.evaluationDate! });
      const t3 = performance.now();
      const econ = data.vehicles.map((x) => computeEconomics(x.pipeline.economicInput, data.energy, economicScenario));
      const t4 = performance.now();
      const pipeline = createDecisionPipeline({ vehicles: data.vehicles.map((x) => x.pipeline), energyContext: data.energy, economicScenario, decisionScenario, evaluationDate: data.evaluationDate! });
      const input = pipeline.input();
      const t5 = performance.now();
      compareCandidates(input.candidates, decisionScenario.comparison ?? {});
      const t6 = performance.now();
      decide(input);
      const t7 = performance.now();
      const result = recommend(input, { usedAdjustments: pipeline.usedAdjustments });
      buildDecisionView(data, input, result, false);
      const t8 = performance.now();
      recommend(input, { probe: pipeline.probe, usedAdjustments: pipeline.usedAdjustments });
      const t9 = performance.now();
      t.lookup!.push(t1 - t0);
      t.subject!.push(t5 - t4 - (t6 - t5)); // preparación de sujetos + economía + comparación del pipeline, sin la comparación aislada
      t.usedAdjustment!.push(t3 - t2);
      t.economics!.push(t4 - t3);
      t.comparison!.push(t6 - t5);
      t.decision!.push(t7 - t6);
      t.view!.push(t8 - t7);
      t.robustness!.push(t9 - t8);
      t.total!.push(t1 - t0 + (t9 - t4));
      expect(adj.subject.kind).toBe('USED_INSTANCE');
      expect(econ).toHaveLength(2);
    }
    console.info(`[ssr-breakdown] ${JSON.stringify(Object.fromEntries(Object.entries(t).map(([k, v]) => [k, stats(v)])))}`);
  });
});
