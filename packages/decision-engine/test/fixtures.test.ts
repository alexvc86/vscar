import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { comparisonCandidateFromBundle } from '@vscar/comparison-engine';
import { computeEconomics, economicVehicleInputFromBundle } from '@vscar/economics-engine';
import { BYD_SEAL_IDS, GOLF_2018_IDS, GOLF_CURRENT_IDS, LEON_EHYBRID_IDS, MODEL3_2021_IDS, X3_2018_IDS, loadAllCases } from '@vscar/fixtures';
import { detectConflicts } from '@vscar/quality';
import { UsedVehicleInstance } from '@vscar/vehicle-schema';
import type { DecisionScenarioIn } from '../src/index.ts';
import { fuelCtx, run } from './helpers.ts';

/** Seis casos reales (Dataset Core v0.1): Step 5 → Step 6a → Step 6b con referencias de mercado reales (Madrid). */
const bundle = loadAllCases();
const CTX = fuelCtx(1.975);
const ECON = { annualKm: 15_000, horizonYears: 5 };

function candidate(id: string, label: string, at?: string, used?: boolean) {
  const usedInstance = used ? UsedVehicleInstance.parse({ id: '00000000-0000-4000-8000-0000000a0001', reference_variant_id: id, asking_price_minor: 2_250_000, currency: 'EUR' }) : undefined;
  const economic = computeEconomics(economicVehicleInputFromBundle(bundle, id, { ...(at ? { at } : {}), ...(usedInstance ? { usedInstance } : {}) }), CTX, ECON);
  return comparisonCandidateFromBundle(bundle, id, { ...(at ? { at } : {}), economic, label });
}
const COMMUTER: DecisionScenarioIn = { horizonYears: 5, comparison: { annualKm: 15_000, dailyDistanceKm: 35, homeChargingAvailable: true, longTripsPerYear: 1 } };
const TRAVELLER: DecisionScenarioIn = { horizonYears: 5, comparison: { annualKm: 15_000, dailyDistanceKm: 80, homeChargingAvailable: false, longTripsPerYear: 10 } };

describe('alpha decision on the real fixture cases', () => {
  it('BYD SEAL vs Model 3 2021: technical capability, economic fit with ranges; range CLEAR but slight for a commuter; no Preference Fit', () => {
    const byd = candidate(BYD_SEAL_IDS.variant, 'BYD SEAL');
    const tesla = candidate(MODEL3_2021_IDS.srp, 'Model 3', '2021-06-01');
    const commuter = run([byd, tesla], COMMUTER);
    const tcByd = commuter.technicalCapability.find((t) => t.candidateId === byd.id)!;
    expect(tcByd.categories.find((c) => c.category === 'Range')).toMatchObject({ status: 'AVAILABLE' });
    expect(tcByd.score).toBeDefined();
    expect(commuter.economicFit.candidates.every((c) => c.status === 'AVAILABLE')).toBe(true);
    expect(commuter.economicFit.candidates.find((c) => c.candidateId === byd.id)!.runningCost_minor!.min).toBeLessThan(commuter.economicFit.candidates.find((c) => c.candidateId === byd.id)!.runningCost_minor!.max);
    const rangeFit = (r: ReturnType<typeof run>) => r.alphaBestForYou.alphaFit.find((x) => x.candidateId === byd.id)!.components.find((c) => c.component === 'RANGE_FIT')!;
    const traveller = run([byd, tesla], TRAVELLER);
    expect(rangeFit(commuter).weight).toBeLessThan(rangeFit(traveller).weight);
    // Ningún +122 km "SLIGHT para ti" aparece como motivo principal si hay motivos relevantes.
    for (const c of commuter.topContributions) if (c.metric === 'rng.electric_combined_km') expect(['MEANINGFUL', 'CLEAR']).toContain(c.level);
    expect(JSON.stringify(commuter)).not.toMatch(/preferenceFit|personalFit/i);
    // Best For You depende del escenario: empate práctico para el commuter; BYD por autonomía para quien viaja mucho.
    expect(commuter.alphaBestForYou.status).toBe('PRACTICAL_TIE');
    expect(traveller.alphaBestForYou).toMatchObject({ status: 'BEST_FOR_YOU', candidateId: byd.id });
    expect(traveller.topContributions[0]).toMatchObject({ component: 'RANGE_FIT', metric: 'rng.electric_combined_km', level: 'CLEAR' });
    expect(traveller.topContributions[0]!.text).toMatch(/frequent long trips: range matters more$/);
  });

  it('León e-HYBRID: no usable charge-sustaining value → Economic Fit UNKNOWN; weighted WLTP never used', () => {
    const r = run([candidate(LEON_EHYBRID_IDS.variant, 'León e-HYBRID', '2026-09-24'), candidate(GOLF_CURRENT_IDS.variant, 'Golf eTSI', '2026-09-24')], COMMUTER);
    expect(r.economicFit.status).toBe('UNKNOWN');
    expect(r.economicFit.candidates.find((c) => c.candidateId === LEON_EHYBRID_IDS.variant)!.status).toBe('UNAVAILABLE');
    const leonCost = r.alphaBestForYou.alphaFit.find((x) => x.candidateId === LEON_EHYBRID_IDS.variant)!.components.find((c) => c.component === 'COST');
    expect(leonCost).toBeUndefined();
  });

  it('Golf 2018: Economy unavailable is excluded (coverage), never scored as 0 consumption', () => {
    const r = run([candidate(GOLF_2018_IDS.rvA, 'Golf 2018'), candidate(GOLF_CURRENT_IDS.variant, 'Golf eTSI', '2026-09-24')], COMMUTER);
    const t = r.technicalCapability.find((x) => x.candidateId === GOLF_2018_IDS.rvA)!;
    expect(t.categories.find((c) => c.category === 'Efficiency')!.status).toBe('NOT_AVAILABLE');
    expect(t.coverage).toBeLessThan(1);
    expect(t.categories.find((c) => c.category === 'Efficiency')!.reasons[0]).toMatch(/never counted as 0/);
  });

  it('Golf eTSI: values in unresolved conflict are not used by the decision either', () => {
    const c = candidate(GOLF_CURRENT_IDS.variant, 'Golf eTSI', '2026-09-24');
    const conflicted = new Set(detectConflicts(bundle.spec_values.filter((v) => v.variant_id === GOLF_CURRENT_IDS.variant)).flatMap((x) => x.value_ids));
    const r = run([c, candidate(BYD_SEAL_IDS.variant, 'BYD SEAL')], COMMUTER);
    const used = [...r.technicalCapability, ...r.alphaBestForYou.alphaFit.map((a) => ({ categories: [{ metrics: a.components.flatMap((x) => x.metrics) }] }))].flatMap((t) => t.categories.flatMap((x) => x.metrics.map((m) => m.value_id)));
    expect(used.some((id) => id && conflicted.has(id))).toBe(false);
  });

  it('golden 54 — X3 (NEDC) vs Golf eTSI (WLTP): two €/year figures, but no economic winner', () => {
    const r = run([candidate(X3_2018_IDS.variant, 'BMW X3 2018', undefined, true), candidate(GOLF_CURRENT_IDS.variant, 'Golf eTSI', '2026-09-24')], COMMUTER);
    expect(r.economicFit.status).toBe('NOT_COMPARABLE');
    expect(r.economicFit.leaderId).toBeUndefined();
    expect(r.economicFit.candidates.every((c) => c.runningCost_minor)).toBe(true);
    expect(r.economicFit.reasons[0]).toMatch(/different test cycles/);
    // El componente COST del X3 (consumo NEDC) no se calcula.
    expect(r.alphaBestForYou.alphaFit.find((x) => x.candidateId === X3_2018_IDS.variant)!.components.some((c) => c.component === 'COST')).toBe(false);
  });
});

describe('decision-engine — architecture boundary', () => {
  const srcDir = fileURLToPath(new URL('../src/', import.meta.url));
  const strip = (t: string) => t.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
  // pipeline.ts es el único orquestador: REUTILIZA Economics/Comparison para re-evaluar escenarios (robustez).
  const pipeline = strip(readFileSync(`${srcDir}pipeline.ts`, 'utf8'));
  const code = readdirSync(srcDir)
    .filter((f) => f !== 'pipeline.ts')
    .map((f) => readFileSync(`${srcDir}${f}`, 'utf8'))
    .join('\n')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/^\s*\/\/.*$/gm, '');
  it('imports only pure packages', () => {
    const allowed = ['@vscar/vehicle-schema', '@vscar/methodology', '@vscar/quality', '@vscar/economics-engine', '@vscar/comparison-engine', '@vscar/market-context', 'zod'];
    for (const i of [...(code + pipeline).matchAll(/from '([^']+)'/g)].map((m) => m[1]!)) expect(i.startsWith('./') || allowed.includes(i), i).toBe(true);
    expect(code + pipeline).not.toMatch(/fetch\(|node:|mysql|drizzle|data-connectors|@vscar\/db|@vscar\/worker/);
  });
  it('never recalculates comparison or economics (only the pipeline orchestrates the existing engines)', () => {
    expect(code).not.toMatch(/computeEconomics|compareVehicles|compareCandidates\(|compareValues|breakEven\(/);
    expect(pipeline).not.toMatch(/compareValues|compareIntervals|breakEven\(|economicDelta|evaluateUtility/);
  });
  it('no Preference Fit, Personal Fit, brand/design scores or age penalties', () => {
    expect(code).not.toMatch(/PreferenceFit|preferenceFit|PersonalFit|personalFit|brandScore|designScore|premiumScore|desirability|registration_year|mileage_km|model_year/);
  });
});
