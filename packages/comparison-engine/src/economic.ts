import { breakEven, economicDelta, type EconomicResult } from '@vscar/economics-engine';
import { DIFFERENCE_THRESHOLDS, compareIntervals } from '@vscar/methodology';
import type { ComparisonCandidate, EconomicComparison, MetricComparison, Range } from './contracts.ts';
import { outcomeOf } from './technical.ts';

/**
 * Comparación económica: CONSUME dos `EconomicResult` (Step 5). No recalcula economía: los deltas salen de
 * `economicDelta` y el break-even de `breakEven` del Economics Engine.
 * Clasificación: coste anual con `running_cost_annual_eur`; acumulados a N años por su equivalente anual
 * (delta / N); €/100 km por su equivalente anual con los km del escenario; propiedad con `price_eur`.
 */
const assumption = (r: EconomicResult, key: string) => r.assumptions.find((a) => a.key === key)?.value;
const eur = (minor: Range): Range => ({ min: minor.min / 100, max: minor.max / 100 });
const pct = (a: Range, b: Range): Range | undefined => (b.min > 0 ? { min: ((a.min - b.max) / b.max) * 100, max: ((a.max - b.min) / b.min) * 100 } : undefined);
const round2 = (r: Range): Range => ({ min: Math.round(r.min * 100) / 100 || 0, max: Math.round(r.max * 100) / 100 || 0 });
const money = (r: Range) => (r.min === r.max ? `${fmtEur(r.min)}` : `${fmtEur(r.min)}–${fmtEur(r.max)}`);
function fmtEur(x: number) {
  return `${x.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`;
}

interface MoneyMetric {
  metric: string;
  label: string;
  /** Importe (unidades menores) o tasa (€/100 km) de A y B. */
  a: Range;
  b: Range;
  unit: 'EUR' | 'EUR_PER_100KM';
  /** Delta a − b del Economics Engine (unidades menores) si es un importe. */
  deltaMinor?: Range;
  /** Delta en € anual equivalente para clasificar. */
  classify: (deltaEurAnnualEquivalentOrAmount: [number, number], ref: [number, number]) => ReturnType<typeof compareIntervals>;
  per: string;
}

function moneyMetric(mm: MoneyMetric, A: ComparisonCandidate, B: ComparisonCandidate, toEur: (r: Range) => Range): MetricComparison {
  const aE = toEur(mm.a);
  const bE = toEur(mm.b);
  const c = mm.classify([aE.min, aE.max], [bE.min, bE.max]);
  const { outcome } = outcomeOf(c, false);
  // Delta real a − b: el del Economics Engine para importes; diferencia de tasas para €/100 km.
  const deltaOut = mm.deltaMinor ?? { min: Math.round((mm.a.min - mm.b.max) * 1e4) / 1e4 || 0, max: Math.round((mm.a.max - mm.b.min) * 1e4) / 1e4 || 0 };
  const shownA = mm.unit === 'EUR' ? money(eur(mm.a)) : `${mm.a.min === mm.a.max ? mm.a.min : `${mm.a.min}–${mm.a.max}`} €/100 km`;
  const shownB = mm.unit === 'EUR' ? money(eur(mm.b)) : `${mm.b.min === mm.b.max ? mm.b.min : `${mm.b.min}–${mm.b.max}`} €/100 km`;
  let explanation: string | undefined;
  if (outcome === 'AHEAD' || outcome === 'BEHIND') {
    const cheaper = outcome === 'AHEAD' ? A.label : B.label;
    // Dirección cierta → el intervalo del delta no cruza cero: magnitud = |delta| ordenado.
    const lo = Math.min(Math.abs(deltaOut.min), Math.abs(deltaOut.max));
    const hi = Math.max(Math.abs(deltaOut.min), Math.abs(deltaOut.max));
    const d = mm.unit === 'EUR' ? money({ min: lo / 100, max: hi / 100 }) : lo === hi ? `${lo.toFixed(2)} €/100 km` : `${lo.toFixed(2)}–${hi.toFixed(2)} €/100 km`;
    explanation = `${mm.label}: ${A.label} ${shownA} vs ${B.label} ${shownB} — ${cheaper} costs about ${d} less${mm.per} (${c.classification.toLowerCase().replace('_', '-')} difference)`;
  } else if (outcome === 'PRACTICAL_TIE') explanation = `${mm.label}: ${A.label} ${shownA} vs ${B.label} ${shownB} — practical tie`;
  else if (outcome === 'RANGE_DEPENDENT') explanation = `${mm.label}: ${A.label} ${shownA} vs ${B.label} ${shownB} — which one is cheaper depends on configuration and assumptions`;
  const p = pct(aE, bE);
  return {
    metric: mm.metric,
    label: mm.label,
    category: 'Economy',
    outcome,
    meaningful: c.classification,
    a: { min: mm.a.min, max: mm.a.max, unit: mm.unit === 'EUR' ? 'EUR_MINOR' : 'EUR_PER_100KM' },
    b: { min: mm.b.min, max: mm.b.max, unit: mm.unit === 'EUR' ? 'EUR_MINOR' : 'EUR_PER_100KM' },
    delta: deltaOut,
    ...(p ? { percentDifference: round2(p) } : {}),
    warnings: [],
    ...(explanation ? { explanation } : {}),
  };
}

export function compareEconomics(A: ComparisonCandidate, B: ComparisonCandidate): EconomicComparison {
  const ea = A.economic;
  const eb = B.economic;
  if (!ea || !eb) return { status: 'UNKNOWN', reason: `no economic result for ${[!ea ? A.label : undefined, !eb ? B.label : undefined].filter(Boolean).join(' and ')}`, metrics: [] };
  const economicConfidence = { a: ea.confidence.level, b: eb.confidence.level };
  const unavailable = [ea.runningCost.status === 'UNAVAILABLE' ? A.label : undefined, eb.runningCost.status === 'UNAVAILABLE' ? B.label : undefined].filter(Boolean);
  if (unavailable.length) return { status: 'UNKNOWN', reason: `running cost unavailable for ${unavailable.join(' and ')} (never treated as a tie)`, metrics: [], economicConfidence };
  // Solo se comparan resultados calculados con el mismo escenario (km y horizonte).
  const km = assumption(ea, 'annual_km');
  if (km !== assumption(eb, 'annual_km') || assumption(ea, 'horizon_years') !== assumption(eb, 'horizon_years') || ea.methodologyVersion !== eb.methodologyVersion) {
    return { status: 'NOT_COMPARABLE', reason: 'economic results were computed with different scenarios or methodology versions', metrics: [], economicConfidence };
  }
  const annualKm = Number(km);
  // Ciclos de los consumos que usó cada resultado (procedencia del Economics Engine → hechos del candidato).
  const cyclesOf = (c: ComparisonCandidate, r: EconomicResult) => {
    const ids = new Set(r.provenance.vehicleValueIds);
    const cycles = Object.entries(c.facts)
      .filter(([k]) => k.startsWith('nrg.'))
      .flatMap(([, vs]) => vs)
      .filter((v) => ids.has(v.id))
      .map((v) => (v.test_cycle === 'UNDECLARED' ? v.test_cycle_inferred ?? 'UNDECLARED' : v.test_cycle));
    return [...new Set(cycles)].sort().join('+');
  };
  const ca = cyclesOf(A, ea);
  const cb = cyclesOf(B, eb);
  const cycleMismatch = ca && cb && ca !== cb ? `energy costs derived from different test cycles (${A.label}: ${ca}, ${B.label}: ${cb}) — not directly comparable` : undefined;
  const d = economicDelta(ea, eb);
  const annualT = DIFFERENCE_THRESHOLDS.running_cost_annual_eur!;
  const priceT = DIFFERENCE_THRESHOLDS.price_eur!;
  const metrics: MetricComparison[] = [];

  const per100a = ea.energy.costPer100km!;
  const per100b = eb.energy.costPer100km!;
  metrics.push(
    moneyMetric(
      {
        metric: 'economic.cost_per_100km',
        label: 'energy cost per 100 km',
        a: per100a,
        b: per100b,
        unit: 'EUR_PER_100KM',
        classify: (x, y) => compareIntervals(annualT, [(x[0] * annualKm) / 100, (x[1] * annualKm) / 100], [(y[0] * annualKm) / 100, (y[1] * annualKm) / 100], false),
        per: ' per 100 km',
      },
      A,
      B,
      (r) => r,
    ),
  );
  metrics.push(
    moneyMetric(
      { metric: 'economic.running_annual', label: 'annual running cost', a: ea.runningCost.annual_minor!, b: eb.runningCost.annual_minor!, unit: 'EUR', deltaMinor: d.runningAnnual_minor!, classify: (x, y) => compareIntervals(annualT, x, y, false), per: ` per year (${annualKm.toLocaleString('en-US')} km/year)` },
      A,
      B,
      eur,
    ),
  );
  for (const years of [3, 5]) {
    const ha = ea.runningCost.horizons.find((h) => h.years === years);
    const hb = eb.runningCost.horizons.find((h) => h.years === years);
    const dh = d.running.find((h) => h.years === years);
    if (!ha || !hb || !dh) continue;
    metrics.push(
      moneyMetric(
        {
          metric: `economic.running_${years}y`,
          label: `running cost over ${years} years`,
          a: ha.total_minor,
          b: hb.total_minor,
          unit: 'EUR',
          deltaMinor: dh.delta_minor,
          classify: (x, y) => compareIntervals(annualT, [x[0] / years, x[1] / years], [y[0] / years, y[1] / years], false),
          per: ` over ${years} years`,
        },
        A,
        B,
        eur,
      ),
    );
  }
  for (const h of d.ownership) {
    const oa = ea.ownershipCost.horizons.find((x) => x.years === h.years)!;
    const ob = eb.ownershipCost.horizons.find((x) => x.years === h.years)!;
    const mc = moneyMetric(
      {
        metric: `economic.ownership_${h.years}y`,
        label: `${oa.view === 'COMPLETE' ? 'ownership cost' : 'known ownership costs (not a TCO)'} over ${h.years} years`,
        a: oa.total_minor,
        b: ob.total_minor,
        unit: 'EUR',
        deltaMinor: h.delta_minor,
        classify: (x, y) => compareIntervals(priceT, x, y, false),
        per: ` over ${h.years} years`,
      },
      A,
      B,
      eur,
    );
    if (oa.missing.length) mc.warnings.push(`missing: ${oa.missing.join(', ')}`);
    metrics.push(mc);
  }

  if (cycleMismatch) {
    // Se muestran valores y deltas, pero ninguna dirección: consumo NEDC y WLTP no son equivalentes.
    for (const mc of metrics) {
      mc.outcome = 'NOT_COMPARABLE';
      mc.reason = cycleMismatch;
      delete mc.explanation;
      mc.warnings.push(cycleMismatch);
    }
  }

  // Break-even del Economics Engine: premium = el más caro de comprar.
  let be: EconomicComparison['breakEven'];
  const pa = ea.ownershipCost.purchase?.amount_minor;
  const pb = eb.ownershipCost.purchase?.amount_minor;
  if (pa !== undefined && pb !== undefined && pa !== pb) {
    const [premium, baseline] = pa > pb ? [ea, eb] : [eb, ea];
    be = cycleMismatch
      ? { premiumId: premium.vehicleId, baselineId: baseline.vehicleId, result: { status: 'UNAVAILABLE', reason: cycleMismatch } }
      : { premiumId: premium.vehicleId, baselineId: baseline.vehicleId, result: breakEven(premium, baseline) };
  }
  return { status: cycleMismatch ? 'NOT_COMPARABLE' : 'COMPARED', ...(cycleMismatch ? { reason: cycleMismatch } : {}), metrics, ...(be ? { breakEven: be } : {}), economicConfidence };
}
