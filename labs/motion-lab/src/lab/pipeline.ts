import { comparisonCandidateFromBundle, type MetricComparison } from '@vscar/comparison-engine';
import { createDecisionPipeline, recommend, type AlphaRecommendationResult } from '@vscar/decision-engine';
import { economicVehicleInputFromBundle } from '@vscar/economics-engine';
import { resolveEnergyContext } from '@vscar/market-context';
import { DatasetBundle, EnergyPriceObservation } from '@vscar/vehicle-schema';
import dataset from '../data/dataset-core.snapshot.json';
import energy from '../data/energy-observations.snapshot.json';

/**
 * Pipeline REAL del lab: snapshot de los fixtures → engines puros (Economics → Comparison → Decision → 6c).
 * Sin DB, sin API, sin números inventados. El ganador nunca se fija a mano.
 */
const bundle = DatasetBundle.parse(dataset.bundle);
const observations = energy.observations.map((o) => EnergyPriceObservation.parse(o));
export const ENERGY_CONTEXT = resolveEnergyContext({ market: 'ES', region: 'ES-MD', date: '2026-09-24' }, observations);
export const IDS = dataset.ids;
export const LABELS = { [IDS.byd]: 'BYD SEAL', [IDS.model3]: 'Tesla Model 3' } as Record<string, string>;

const VEHICLES = [
  { id: IDS.byd, label: 'BYD SEAL', at: undefined },
  { id: IDS.model3, label: 'Tesla Model 3', at: '2021-06-01' },
].map((v) => ({
  candidate: comparisonCandidateFromBundle(bundle, v.id, { label: v.label, ...(v.at ? { at: v.at } : {}) }),
  economicInput: economicVehicleInputFromBundle(bundle, v.id, v.at ? { at: v.at } : {}),
}));

/** Escenario commuter de Step 6c: 15.000 km/año, 35 km/día, carga en casa. Solo varía `longTripsPerYear`. */
export const COMMUTER = { annualKm: 15_000, dailyDistanceKm: 35, homeChargingAvailable: true } as const;
export const SCENARIO_TIE = 1;
export const SCENARIO_SELECTED = 10;

export interface LabRun {
  result: AlphaRecommendationResult;
  range?: MetricComparison;
  ms: number;
}

function pipelineFor(longTripsPerYear: number) {
  return createDecisionPipeline({
    vehicles: VEHICLES,
    energyContext: ENERGY_CONTEXT,
    economicScenario: { annualKm: COMMUTER.annualKm, horizonYears: 5 },
    decisionScenario: { horizonYears: 5, comparison: { ...COMMUTER, longTripsPerYear } },
  });
}

/** Recalcula (sin robustez: es la ruta interactiva). Devuelve también la métrica real de autonomía vista desde BYD. */
export function runLab(longTripsPerYear: number): LabRun {
  const t0 = performance.now();
  const input = pipelineFor(longTripsPerYear).input();
  const result = recommend(input);
  const ms = performance.now() - t0;
  const pair = input.comparison.pairs[0]!;
  const raw = pair.technicalComparisons.find((m) => m.metric === 'rng.electric_combined_km');
  // Orientación: BYD como "A" para mostrar +122 km.
  const range =
    raw && pair.candidateAId !== IDS.byd
      ? { ...raw, a: raw.b, b: raw.a, ...(raw.delta ? { delta: { min: -raw.delta.max || 0, max: -raw.delta.min || 0 } } : {}), outcome: raw.outcome === 'AHEAD' ? 'BEHIND' : raw.outcome === 'BEHIND' ? 'AHEAD' : raw.outcome }
      : raw;
  return { result, ...(range ? { range: range as MetricComparison } : {}), ms };
}

/** Robustez completa (cara): solo bajo demanda en el lab. */
export function runRobustness(longTripsPerYear: number): { result: AlphaRecommendationResult; ms: number } {
  const t0 = performance.now();
  const result = pipelineFor(longTripsPerYear).recommend();
  return { result, ms: performance.now() - t0 };
}
