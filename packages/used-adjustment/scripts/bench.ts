/**
 * Benchmark controlado del Used Adjustment (Step D1.6a). Ejecutar SOLO, fuera de la suite paralela:
 *   node packages/used-adjustment/scripts/bench.ts [rondas=5] [muestras=5000]
 * Informa p50/p95/p99 de cada ronda y sale con código 1 si la MEDIANA de los p95 supera el presupuesto.
 */
import { USED_ADJUSTMENT_P95_BUDGET_MS, measureRound } from '../test/perf.ts';

const rounds = Number(process.argv[2] ?? 5);
const samples = Number(process.argv[3] ?? 5000);
const results = Array.from({ length: rounds }, () => measureRound(samples));
for (const [i, r] of results.entries()) console.log(`round ${i + 1}: p50 ${r.p50.toFixed(3)} ms · p95 ${r.p95.toFixed(3)} ms · p99 ${r.p99.toFixed(3)} ms`);
const p95s = results.map((r) => r.p95).sort((a, b) => a - b);
const median = p95s[Math.floor(p95s.length / 2)]!;
console.log(`median p95 ${median.toFixed(3)} ms (budget < ${USED_ADJUSTMENT_P95_BUDGET_MS} ms) → ${median < USED_ADJUSTMENT_P95_BUDGET_MS ? 'PASS' : 'FAIL'}`);
process.exitCode = median < USED_ADJUSTMENT_P95_BUDGET_MS ? 0 : 1;
