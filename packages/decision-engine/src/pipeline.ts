import { compareCandidates, type ComparisonCandidate } from '@vscar/comparison-engine';
import { computeEconomics, type EconomicResult, type EconomicScenarioIn, type EconomicVehicleInputIn, type VehicleEconomicOverrides } from '@vscar/economics-engine';
import type { EnergyContext } from '@vscar/market-context';
import { ROBUSTNESS_RULES, SENSITIVITY_RANGES } from '@vscar/methodology';
import type { FuelProduct } from '@vscar/vehicle-schema';
import type { DecisionInput, DecisionScenarioIn, SimplePriorities } from './contracts.ts';
import { decide } from './decide.ts';
import { recommend } from './recommend.ts';
import type { UsedInformationConfidenceInput } from './recommendation-confidence.ts';
import type { ProbeVariable, RobustnessProbe, RobustnessVariable } from './robustness.ts';

/**
 * Orquestador puro de la cadena completa (Step 5 → 6a → 6b → 6c) para un escenario y sus variaciones.
 * No contiene lógica económica ni de comparación: REUTILIZA `computeEconomics`, `compareCandidates` y `decide`.
 * Es el único módulo del paquete que llama a esos engines (la robustez necesita re-evaluar el escenario).
 */
export interface PipelineVehicle {
  /** Hechos ya filtrados por quality (sin `economic`: se calcula aquí con el Economics Engine). */
  candidate: ComparisonCandidate;
  economicInput: EconomicVehicleInputIn;
  overrides?: VehicleEconomicOverrides;
}

export interface PipelineInput {
  vehicles: readonly PipelineVehicle[];
  energyContext: EnergyContext;
  /** `annualKm` y `horizonYears` deben coincidir con los del escenario de decisión (se sincronizan). */
  economicScenario: EconomicScenarioIn;
  decisionScenario: DecisionScenarioIn;
}

export interface ScenarioVariation {
  annualKm?: number;
  horizonYears?: number;
  /** €/L del producto de referencia principal; los demás carburantes se escalan en la misma proporción. */
  fuelPrice?: number;
  electricityPrice?: number;
  homeChargingShare?: number;
  priorities?: SimplePriorities;
}

export function createDecisionPipeline(p: PipelineInput) {
  const state: { fuelBase?: { product: string; current: number; prices: Record<string, number> } } = {};
  const build = (v: ScenarioVariation = {}): DecisionInput => {
    const base = p.economicScenario;
    const energy = { ...(base.energy ?? {}) };
    if (v.homeChargingShare !== undefined) energy.homeChargingShare = v.homeChargingShare;
    if (v.electricityPrice !== undefined) energy.electricityPriceOverride = v.electricityPrice;
    const fuelBase = state.fuelBase;
    if (v.fuelPrice !== undefined && fuelBase) {
      const k = v.fuelPrice / fuelBase.current;
      energy.fuelPriceOverrides = Object.fromEntries(Object.entries(fuelBase.prices).map(([prod, price]) => [prod, price * k])) as Partial<Record<FuelProduct, number>>;
    }
    const econScenario: EconomicScenarioIn = { ...base, energy, ...(v.annualKm !== undefined ? { annualKm: Math.round(v.annualKm) } : {}), ...(v.horizonYears !== undefined ? { horizonYears: v.horizonYears } : {}) };
    const ds = p.decisionScenario;
    const decisionScenario: DecisionScenarioIn = {
      ...ds,
      horizonYears: econScenario.horizonYears,
      comparison: { ...(ds.comparison ?? {}), annualKm: econScenario.annualKm, ...(v.homeChargingShare !== undefined ? { homeChargingShare: v.homeChargingShare } : {}) },
      ...(v.priorities ? { priorities: v.priorities } : {}),
    };
    const candidates = p.vehicles.map((x) => ({ ...x.candidate, economic: computeEconomics(x.economicInput, p.energyContext, econScenario, x.overrides) }));
    return { candidates, comparison: compareCandidates(candidates, decisionScenario.comparison ?? {}), scenario: decisionScenario };
  };

  // Precios efectivos de la referencia (o del override del usuario) usados en el escenario base.
  const baseInput = build();
  const used = baseInput.candidates.flatMap((c) => (c.economic as EconomicResult | undefined)?.provenance.energyPrices ?? []);
  const fuelPrices = Object.fromEntries([...new Map(used.filter((e) => e.energy === 'FUEL').map((e) => [e.product, e.value])).entries()].sort(([a], [b]) => a.localeCompare(b)));
  const primary = Object.keys(fuelPrices)[0];
  if (primary) state.fuelBase = { product: primary, current: fuelPrices[primary]!, prices: fuelPrices };
  const elec = used.find((e) => e.energy === 'ELECTRICITY')?.value;
  const anyRunning = baseInput.candidates.some((c) => c.economic?.runningCost.status === 'AVAILABLE');

  const ranges = SENSITIVITY_RANGES.ES;
  const spec = (variable: RobustnessVariable, current: number | undefined, applicable: boolean, reason?: string): ProbeVariable => {
    const r = ranges[ROBUSTNESS_RULES.variables[variable].range_key]!;
    const c = current ?? r.min;
    return { variable, current: c, min: Math.min(r.min, c), max: Math.max(r.max, c), applicable: applicable && current !== undefined, ...(reason ? { reason } : {}) };
  };
  const s = p.economicScenario;
  const variables: ProbeVariable[] = [
    spec('annual_km', s.annualKm, anyRunning, 'no running cost available'),
    spec('fuel_price', state.fuelBase?.current, !!state.fuelBase, 'no vehicle uses fuel'),
    spec('electricity_price', elec, elec !== undefined, 'no vehicle uses electricity'),
    spec('home_charging_share', s.energy?.homeChargingShare ?? (elec !== undefined ? 1 : undefined), elec !== undefined, 'no vehicle uses electricity'),
    spec('horizon_years', s.horizonYears, anyRunning, 'no running cost available'),
  ];
  const key: Record<RobustnessVariable, keyof ScenarioVariation> = { annual_km: 'annualKm', fuel_price: 'fuelPrice', electricity_price: 'electricityPrice', home_charging_share: 'homeChargingShare', horizon_years: 'horizonYears' };
  const probe: RobustnessProbe = {
    variables,
    evaluate: (variable, value) => decide(build({ [key[variable]]: value })),
    evaluatePriorities: (priorities) => decide(build({ priorities })),
  };

  return {
    input: build,
    probe,
    decide: (v?: ScenarioVariation) => decide(build(v)),
    recommend: (opts: { usedInformationConfidence?: UsedInformationConfidenceInput; robustness?: boolean } = {}) =>
      recommend(baseInput, { ...(opts.robustness === false ? {} : { probe }), ...(opts.usedInformationConfidence ? { usedInformationConfidence: opts.usedInformationConfidence } : {}) }),
  };
}
