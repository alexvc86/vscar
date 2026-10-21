import type { ComparisonCandidate, ComparisonResult } from '@vscar/comparison-engine';
import { economicDelta } from '@vscar/economics-engine';
import { formatEnUs, minConfidence, type ConfidenceLevel, type Message } from '@vscar/methodology';
import type { EconomicFitResult, EconomicPairOutcome, Range } from './contracts.ts';
import { message } from './messages.ts';
import { metricOutcome } from './pairwise.ts';

/**
 * Economic Fit @ horizon: consume `EconomicResult` (Step 5) y el `ComparisonResult` (Step 6a); no recalcula.
 * La dirección (más barato / empate / depende) es la de la comparación del coste de uso anual, que se clasifica
 * por su equivalente anual y por tanto vale para cualquier horizonte. Si la comparación económica es
 * NOT_COMPARABLE (p. ej. NEDC vs WLTP) se muestran las cifras pero no hay ganador.
 */
const fmtEur = (minor: number) => `${formatEnUs(minor / 100, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`;
const money = (r: Range) => (r.min === r.max ? fmtEur(r.min) : `${fmtEur(r.min)}–${fmtEur(r.max)}`);

export function economicFit(candidates: readonly ComparisonCandidate[], pairs: readonly ComparisonResult[], horizonYears: number, annualKm?: number): EconomicFitResult {
  const warnings: string[] = [];
  const reasons: string[] = [];
  const messages: Message[] = [];
  const rows = candidates.map((c) => {
    const e = c.economic;
    const h = e?.runningCost.horizons.find((x) => x.years === horizonYears);
    const o = e?.ownershipCost.horizons.find((x) => x.years === horizonYears);
    if (e && e.runningCost.status === 'AVAILABLE' && !h) warnings.push(`${c.label}: economic result has no ${horizonYears}-year horizon (computed with another scenario)`);
    return {
      candidateId: c.id,
      status: (h ? 'AVAILABLE' : 'UNAVAILABLE') as 'AVAILABLE' | 'UNAVAILABLE',
      ...(h ? { runningCost_minor: h.total_minor } : {}),
      ...(o ? { ownership: { view: o.view, total_minor: o.total_minor, missing: o.missing } } : {}),
      ...(e ? { confidence: e.confidence.level } : {}),
    };
  });
  const label = new Map(candidates.map((c) => [c.id, c.label]));

  const pairRows: EconomicFitResult['pairs'] = pairs.map((r) => {
    const base = { a: r.candidateAId, b: r.candidateBId };
    const ra = rows.find((x) => x.candidateId === r.candidateAId)!;
    const rb = rows.find((x) => x.candidateId === r.candidateBId)!;
    if (ra.status !== 'AVAILABLE' || rb.status !== 'AVAILABLE') return { ...base, outcome: 'UNKNOWN', reason: 'running cost unavailable for at least one vehicle' };
    if (r.economicComparison.status !== 'COMPARED')
      return {
        ...base,
        outcome: r.economicComparison.status === 'NOT_COMPARABLE' ? 'NOT_COMPARABLE' : 'UNKNOWN',
        reason: r.economicComparison.reason ?? r.economicComparison.status,
        ...(r.economicComparison.reasonMessage ? { reasonMessage: r.economicComparison.reasonMessage } : {}),
      };
    const m = metricOutcome(r, 'economic.running_annual')!;
    const outcome: EconomicPairOutcome =
      m.outcome === 'AHEAD' ? 'A_CHEAPER' : m.outcome === 'BEHIND' ? 'B_CHEAPER' : m.outcome === 'PRACTICAL_TIE' ? 'PRACTICAL_TIE' : m.outcome === 'RANGE_DEPENDENT' ? 'RANGE_DEPENDENT' : 'NOT_COMPARABLE';
    const ea = candidates.find((c) => c.id === r.candidateAId)!.economic!;
    const eb = candidates.find((c) => c.id === r.candidateBId)!.economic!;
    const delta = economicDelta(ea, eb).running.find((x) => x.years === horizonYears)?.delta_minor;
    return { ...base, outcome, ...(delta ? { delta_minor: delta } : {}), ...(m.meaningful ? { meaningful: m.meaningful } : {}) };
  });

  const available = rows.filter((x) => x.status === 'AVAILABLE').map((x) => x.candidateId);
  const beats = (x: string, y: string) => pairRows.some((p) => (p.a === x && p.b === y && p.outcome === 'A_CHEAPER') || (p.a === y && p.b === x && p.outcome === 'B_CHEAPER'));
  const pairOf = (x: string, y: string) => pairRows.find((p) => (p.a === x && p.b === y) || (p.a === y && p.b === x))!;
  let status: EconomicFitResult['status'];
  let leaderId: string | undefined;
  let tiedIds: string[] | undefined;
  if (available.length < 2 || available.length < candidates.length) {
    status = 'UNKNOWN';
    if (available.length < candidates.length) {
      reasons.push(`running cost unavailable for ${rows.filter((x) => x.status !== 'AVAILABLE').map((x) => label.get(x.candidateId)).join(', ')}: no economic winner can be declared`);
      for (const x of rows.filter((y) => y.status !== 'AVAILABLE')) messages.push(message('decision.economic.unavailable', { subject: label.get(x.candidateId), subjectId: x.candidateId }));
    }
  } else {
    const winner = available.find((x) => available.every((y) => y === x || beats(x, y)));
    if (winner) {
      status = 'LEADER';
      leaderId = winner;
      for (const y of available.filter((y) => y !== winner)) {
        const p = pairOf(winner, y);
        const d = p.delta_minor!;
        const abs = { min: Math.min(Math.abs(d.min), Math.abs(d.max)), max: Math.max(Math.abs(d.min), Math.abs(d.max)) };
        reasons.push(`Economic Fit — ${horizonYears} years: ${label.get(winner)} costs about ${money(abs)} less to run than ${label.get(y)}${annualKm ? ` at ${formatEnUs(annualKm)} km/year` : ''}`);
        // Diferencia anual (misma fuente: la métrica de coste anual de la comparación), además del horizonte.
        const r = pairs.find((q) => [q.candidateAId, q.candidateBId].includes(winner) && [q.candidateAId, q.candidateBId].includes(y))!;
        const annual = metricOutcome(r, 'economic.running_annual')?.delta;
        const annualAbs = annual ? { min: Math.min(Math.abs(annual.min), Math.abs(annual.max)), max: Math.max(Math.abs(annual.min), Math.abs(annual.max)) } : undefined;
        messages.push(
          message('decision.economic.cheaper', {
            subject: label.get(winner),
            subjectId: winner,
            other: label.get(y),
            otherId: y,
            amountMinMinor: abs.min,
            amountMaxMinor: abs.max,
            ...(annualAbs ? { annualMinMinor: annualAbs.min, annualMaxMinor: annualAbs.max } : {}),
            currency: 'EUR',
            horizonYears,
            annualKm,
          }),
        );
      }
    } else {
      const undominated = available.filter((x) => !available.some((y) => y !== x && beats(y, x)));
      const top = undominated.length ? undominated : available;
      const topPairs = top.flatMap((x, i) => top.slice(i + 1).map((y) => pairOf(x, y)));
      const involved = [...topPairs, ...pairRows.filter((p) => top.includes(p.a) || top.includes(p.b))];
      tiedIds = [...top].sort();
      if (involved.some((p) => p.outcome === 'NOT_COMPARABLE')) {
        status = 'NOT_COMPARABLE';
        reasons.push(...[...new Set(involved.filter((p) => p.outcome === 'NOT_COMPARABLE').map((p) => p.reason!))]);
        const seen = new Set<string>();
        for (const p of involved.filter((q) => q.outcome === 'NOT_COMPARABLE')) {
          const k = [p.a, p.b].sort().join('|');
          if (seen.has(k)) continue;
          seen.add(k);
          const rp = p.reasonMessage?.params;
          messages.push(
            p.reasonMessage?.messageKey === 'comparison.economic.cycles_not_comparable'
              ? message('decision.economic.not_comparable_cycles', { subject: label.get(p.a), other: label.get(p.b), cycleA: rp!.cycleA, cycleB: rp!.cycleB })
              : message('decision.economic.not_comparable', { subject: label.get(p.a), other: label.get(p.b) }, p.reasonMessage ? [p.reasonMessage] : undefined),
          );
        }
      } else if (involved.some((p) => p.outcome === 'UNKNOWN')) {
        status = 'UNKNOWN';
        const details = [...new Map(involved.filter((p) => p.outcome === 'UNKNOWN' && p.reasonMessage).map((p) => [p.reasonMessage!.text, p.reasonMessage!])).values()];
        messages.push(message('decision.economic.unknown', {}, details));
      }
      else if (topPairs.some((p) => p.outcome === 'RANGE_DEPENDENT')) {
        status = 'RANGE_DEPENDENT';
        reasons.push('which vehicle is cheaper to run depends on configuration and assumptions (cost ranges overlap)');
        messages.push(message('decision.economic.range_dependent'));
      } else {
        status = 'PRACTICAL_TIE';
        reasons.push(`running costs are practically equal over ${horizonYears} years`);
        messages.push(message('decision.economic.tie', { horizonYears }));
      }
    }
  }
  const levels = rows.map((x) => x.confidence).filter((x) => !!x) as ConfidenceLevel[];
  const confidence = status === 'UNKNOWN' || status === 'NOT_COMPARABLE' ? 'LOW' : minConfidence(...levels);
  return { horizonYears, basis: 'RUNNING_COST', candidates: rows, pairs: pairRows, status, ...(leaderId ? { leaderId } : {}), ...(tiedIds ? { tiedIds } : {}), confidence, reasons, messages, warnings };
}
