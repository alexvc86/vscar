import type { ComparisonResult, ComparisonScenario, MetricComparison } from '@vscar/comparison-engine';
import { DIFFERENCE_THRESHOLDS, compareIntervals, type IntervalComparison } from '@vscar/methodology';
import type { ComponentScore, Range } from './contracts.ts';
import { rangeRelevance, weightedMean } from './utilities.ts';

/**
 * Comparación de dos candidatos sobre el Alpha Fit usando el `ComparisonResult` del Step 6a (no se recalcula):
 * - solo componentes presentes en ambos (scores intrínsecos sobre bases distintas no se comparan);
 * - métrica NOT_COMPARABLE/UNKNOWN en la comparación → fuera del par;
 * - métrica PRACTICAL_TIE → ambos reciben la misma utilidad (media): una diferencia trivial sigue siendo
 *   trivial aunque su prioridad sea HIGH.
 */
export function metricOutcome(r: ComparisonResult, metric: string): MetricComparison | undefined {
  return r.technicalComparisons.find((m) => m.metric === metric) ?? r.economicComparison.metrics.find((m) => m.metric === metric);
}

export interface PairFit {
  x: Range;
  y: Range;
  components: string[];
  cmp?: IntervalComparison;
}

/** Los resultados usados (TIE / NOT_COMPARABLE / UNKNOWN) son simétricos: la orientación del par no importa. */
export function pairAlphaFit(xc: readonly ComponentScore[], yc: readonly ComponentScore[], r: ComparisonResult, scenario: ComparisonScenario): PairFit | undefined {
  const xs: { utility: Range; weight: number }[] = [];
  const ys: { utility: Range; weight: number }[] = [];
  const used: string[] = [];
  for (const cx of xc) {
    const cy = yc.find((c) => c.component === cx.component);
    if (!cy) continue;
    const ux: Range[] = [];
    const uy: Range[] = [];
    for (const mx of cx.metrics) {
      const my = cy.metrics.find((m) => m.metric === mx.metric);
      if (!my) continue;
      const o = metricOutcome(r, mx.metric)?.outcome;
      if (!o || o === 'NOT_COMPARABLE' || o === 'UNKNOWN') continue;
      if (o === 'PRACTICAL_TIE') {
        const avg = { min: (mx.utility.min + my.utility.min) / 2, max: (mx.utility.max + my.utility.max) / 2 };
        ux.push(avg);
        uy.push(avg);
      } else {
        ux.push(mx.utility);
        uy.push(my.utility);
      }
    }
    if (!ux.length) continue;
    // Mismo peso para ambos (simétrico): RANGE_FIT con la relevancia del menor de los dos alcances.
    const weight =
      cx.component === 'RANGE_FIT'
        ? cx.weight === cy.weight
          ? cx.weight
          : rangeRelevance(scenario, Math.min(cx.metrics[0]!.value.min, cy.metrics[0]!.value.min)).multiplier
        : cx.weight;
    const avg = (rs: Range[]) => ({ min: rs.reduce((s, v) => s + v.min, 0) / rs.length, max: rs.reduce((s, v) => s + v.max, 0) / rs.length });
    xs.push({ utility: avg(ux), weight });
    ys.push({ utility: avg(uy), weight });
    used.push(cx.component);
  }
  const x = weightedMean(xs);
  const y = weightedMean(ys);
  if (!x || !y) return undefined;
  return { x, y, components: used, cmp: compareIntervals(DIFFERENCE_THRESHOLDS.alpha_fit!, [x.min, x.max], [y.min, y.max], true) };
}
