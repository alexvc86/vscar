import { comparisonCandidateFromBundle, type ComparisonResult, type DealBreakerResult } from '@vscar/comparison-engine';
import { economicVehicleInputFromBundle } from '@vscar/economics-engine';
import { BYD_SEAL_IDS, GOLF_CURRENT_IDS, LEON_EHYBRID_IDS, MODEL3_2021_IDS, X3_2018_IDS, loadAllCases } from '@vscar/fixtures';
import { UsedVehicleInstance } from '@vscar/vehicle-schema';
import { createDecisionPipeline, recommend, type AlphaRecommendationResult, type DecisionScenarioIn, type PipelineVehicle } from '../src/index.ts';
import { cand, fuelCtx } from './helpers.ts';

/**
 * Casos de referencia del contrato de mensajes (Step 7a.1): los 6 del brief + deal breaker, compromiso y
 * prioridad COST, para ejercitar todas las ramas que producen explicaciones. Pipeline real con robustez.
 * Lo comparten el golden de lógica, el test de contrato y los tests de traducción de `apps/web`.
 */
export interface MessageCase {
  result: AlphaRecommendationResult;
  pairs: readonly ComparisonResult[];
  dealBreakers: Readonly<Record<string, DealBreakerResult>>;
}

const bundle = loadAllCases();
const REAL = fuelCtx(1.975);
const SYN = fuelCtx(1.65);

function fixtureVehicle(id: string, label: string, opts: { at?: string; used?: boolean } = {}): PipelineVehicle {
  const usedInstance = opts.used ? UsedVehicleInstance.parse({ id: '00000000-0000-4000-8000-0000000a0001', reference_variant_id: id, asking_price_minor: 2_250_000, currency: 'EUR' }) : undefined;
  return {
    candidate: comparisonCandidateFromBundle(bundle, id, { label, ...(opts.at ? { at: opts.at } : {}) }),
    economicInput: economicVehicleInputFromBundle(bundle, id, { ...(opts.at ? { at: opts.at } : {}), ...(usedInstance ? { usedInstance } : {}) }),
  };
}

const ice = (label: string, l100: number, facts: Parameters<typeof cand>[1] = [], over: Parameters<typeof cand>[2] = {}): PipelineVehicle => {
  const candidate = cand(label, facts, { powertrainType: 'ICE', seats: 5, ...over });
  return { candidate, economicInput: { id: candidate.id, market: 'ES', powertrainType: 'ICE', fuelType: 'petrol', fuelConsumptionL100: { min: l100, max: l100, test_cycle: 'WLTP', mapping_confidence: 'EXACT' }, purchase: { participant: 'NEW' } } };
};

function runCase(vehicles: PipelineVehicle[], ctx: ReturnType<typeof fuelCtx>, annualKm: number, ds: Omit<DecisionScenarioIn, 'horizonYears'>, horizonYears = 5): MessageCase {
  const p = createDecisionPipeline({ vehicles, energyContext: ctx, economicScenario: { annualKm, horizonYears }, decisionScenario: { horizonYears, ...ds } });
  const input = p.input();
  return { result: recommend(input, { probe: p.probe }), pairs: input.comparison.pairs, dealBreakers: input.comparison.dealBreakers };
}

const COMMUTER = { annualKm: 15_000, dailyDistanceKm: 35, homeChargingAvailable: true, homeChargingShare: 1, longTripsPerYear: 1 };

export function buildMessageCases(): Record<string, MessageCase> {
  const byd = () => fixtureVehicle(BYD_SEAL_IDS.variant, 'BYD SEAL');
  const m3 = () => fixtureVehicle(MODEL3_2021_IDS.srp, 'Tesla Model 3', { at: '2021-06-01' });
  return {
    byd_m3_commuter: runCase([byd(), m3()], REAL, 15_000, { comparison: COMMUTER }),
    byd_m3_long_trips: runCase([byd(), m3()], REAL, 15_000, { comparison: { ...COMMUTER, longTripsPerYear: 10 } }),
    x3_nedc_vs_golf_wltp: runCase([fixtureVehicle(X3_2018_IDS.variant, 'BMW X3 2018', { used: true }), fixtureVehicle(GOLF_CURRENT_IDS.variant, 'Golf eTSI', { at: '2026-09-24' })], REAL, 15_000, { comparison: COMMUTER }),
    leon_missing_economics: runCase([fixtureVehicle(LEON_EHYBRID_IDS.variant, 'León e-HYBRID', { at: '2026-09-24' }), fixtureVehicle(GOLF_CURRENT_IDS.variant, 'Golf eTSI', { at: '2026-09-24' })], REAL, 15_000, { comparison: COMMUTER }),
    unconfirmed_towing: runCase([ice('A no towing data', 6, [['cap.boot_l', 520]]), ice('B tows 1800', 6.4, [['cap.boot_l', 480], ['cap.towing_braked_kg', 1800]])], SYN, 18_000, { comparison: { annualKm: 18_000, requirements: { minTowingKg: 1500 } } }),
    no_full_match: runCase([ice('A', 6, [['cap.boot_l', 480]]), ice('B', 6, [['cap.boot_l', 300]])], SYN, 18_000, { comparison: { annualKm: 18_000, requirements: { minBootL: 500 } } }),
    deal_breaker_seats: runCase([ice('A 7-seater', 7.5, [['cap.boot_l', 300], ['perf.accel_0_100_s', 11]], { seats: 7 }), ice('B 5-seater', 4.5, [['cap.boot_l', 650], ['perf.accel_0_100_s', 6]], { seats: 5 })], SYN, 18_000, { comparison: { annualKm: 18_000, requirements: { minSeats: 7 } } }),
    compromise_boot: runCase([ice('A', 6, [['cap.boot_l', 510]]), ice('B', 6.2, [['cap.boot_l', 470]])], SYN, 18_000, { comparison: { annualKm: 18_000, requirements: { minSeats: 5 } }, desired: { minBootL: 550 } }),
    cost_priority: runCase([ice('A', 4.5, [['cap.boot_l', 520]]), ice('B', 7.5, [['cap.boot_l', 400]])], SYN, 18_000, { comparison: { annualKm: 18_000 }, priorities: { COST: 'HIGH' } }),
  };
}

/** Todos los `Message` alcanzables (incluidos `details`) de un valor. */
export function collectMessages(v: unknown, out: { messageKey: string; params: Record<string, unknown>; text: string; details?: unknown[] }[] = []) {
  if (Array.isArray(v)) v.forEach((x) => collectMessages(x, out));
  else if (v && typeof v === 'object') {
    const o = v as Record<string, unknown>;
    if (typeof o.messageKey === 'string') out.push(o as never);
    for (const x of Object.values(o)) collectMessages(x, out);
  }
  return out;
}
