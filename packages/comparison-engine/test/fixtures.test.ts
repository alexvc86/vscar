import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { computeEconomics, economicVehicleInputFromBundle } from '@vscar/economics-engine';
import { BYD_SEAL_IDS, GOLF_2018_IDS, GOLF_CURRENT_IDS, LEON_EHYBRID_IDS, MODEL3_2021_IDS, X3_2018_IDS, loadAllCases } from '@vscar/fixtures';
import { detectConflicts } from '@vscar/quality';
import { UsedVehicleInstance } from '@vscar/vehicle-schema';
import { compareVehicles, comparisonCandidateFromBundle, type ComparisonScenarioIn } from '../src/index.ts';
import { fuelCtx, metric } from './helpers.ts';

/** Los seis casos reales (Dataset Core v0.1) con EconomicResult real del Step 5 (Madrid, referencias reales). */
const bundle = loadAllCases();
const CTX = fuelCtx(1.975);
const ECON = { annualKm: 15_000, horizonYears: 5 };
const SCEN: ComparisonScenarioIn = { annualKm: 15_000, dailyDistanceKm: 35, homeChargingAvailable: true, longTripsPerYear: 1 };

function candidate(id: string, label: string, at?: string, used?: boolean) {
  const usedInstance = used ? UsedVehicleInstance.parse({ id: '00000000-0000-4000-8000-0000000a0001', reference_variant_id: id, asking_price_minor: 2_250_000, currency: 'EUR' }) : undefined;
  const economic = computeEconomics(economicVehicleInputFromBundle(bundle, id, { ...(at ? { at } : {}), ...(usedInstance ? { usedInstance } : {}) }), CTX, ECON);
  return comparisonCandidateFromBundle(bundle, id, { ...(at ? { at } : {}), economic, label });
}

describe('comparison on the six real fixture cases', () => {
  it('Golf 2018: Economy unavailable → economic comparison UNKNOWN, never an economic tie', () => {
    const r = compareVehicles(candidate(GOLF_2018_IDS.rvA, 'Golf 2018'), candidate(GOLF_CURRENT_IDS.variant, 'Golf eTSI', '2026-09-24'), SCEN);
    expect(r.economicComparison.status).toBe('UNKNOWN');
    expect(r.economicComparison.reason).toMatch(/running cost unavailable for Golf 2018/);
    const economy = r.categorySummaries.find((s) => s.category === 'Economy')!;
    expect(economy.advantage).not.toBe('PRACTICAL_TIE');
    expect(economy.unknowns.some((u) => u.startsWith('Golf 2018: Economy not available'))).toBe(true);
  });

  it('X3 2018 (NEDC 5.0–5.4) vs Golf eTSI (WLTP 5.2): cycles differ → consumption and costs NOT_COMPARABLE, values visible', () => {
    const r = compareVehicles(candidate(X3_2018_IDS.variant, 'BMW X3 2018', undefined, true), candidate(GOLF_CURRENT_IDS.variant, 'Golf eTSI', '2026-09-24'), SCEN);
    expect(metric(r, 'nrg.fuel_combined_l100')).toMatchObject({ outcome: 'NOT_COMPARABLE', reason: 'NOT_DIRECTLY_COMPARABLE: NEDC vs WLTP', a: { min: 5, max: 5.4, test_cycle: 'NEDC' } });
    expect(r.economicComparison.status).toBe('NOT_COMPARABLE');
    const annual = r.economicComparison.metrics.find((m) => m.metric === 'economic.running_annual')!;
    expect(annual).toMatchObject({ outcome: 'NOT_COMPARABLE', a: { min: 148050, max: 159894 } });
    expect(annual.explanation).toBeUndefined();
  });

  it('BYD SEAL vs Model 3 2021: EV comparison — 570 vs 448 km CLEAR (slight for this commuter); running cost compared without charging data', () => {
    const r = compareVehicles(candidate(BYD_SEAL_IDS.variant, 'BYD SEAL'), candidate(MODEL3_2021_IDS.srp, 'Model 3', '2021-06-01'), SCEN);
    const range = metric(r, 'rng.electric_combined_km');
    expect(range).toMatchObject({ outcome: 'AHEAD', meaningful: 'CLEAR', delta: { min: 122, max: 122 } });
    expect(range.meaningfulForYou!.level).toBe('SLIGHT');
    expect(r.economicComparison.status).toBe('COMPARED');
    const per100 = r.economicComparison.metrics.find((m) => m.metric === 'economic.cost_per_100km')!;
    // BYD 3.2248–3.5831 vs Model 3 2.7585–3.0651 €/100 km (ambos en rango por pérdidas de carga no declaradas).
    expect(per100.a).toMatchObject({ min: 3.2248, max: 3.5831 });
    expect(per100.b).toMatchObject({ min: 2.7585, max: 3.0651 });
    expect(['BEHIND', 'RANGE_DEPENDENT']).toContain(per100.outcome);
    expect(r.categorySummaries.find((s) => s.category === 'Range')!.advantage).toBe('A');
  });

  it('León e-HYBRID: PHEV economics unavailable (no usable charge-sustaining value); weighted WLTP never fills the gap', () => {
    const r = compareVehicles(candidate(LEON_EHYBRID_IDS.variant, 'León e-HYBRID', '2026-09-24'), candidate(GOLF_CURRENT_IDS.variant, 'Golf eTSI', '2026-09-24'), SCEN);
    expect(r.economicComparison.status).toBe('UNKNOWN');
    expect(metric(r, 'nrg.fuel_charge_sustaining_l100').outcome).toBe('UNKNOWN');
    expect(r.warnings.some((w) => /nrg\.fuel_charge_sustaining_l100 \(DE\) not used/.test(w))).toBe(true);
  });

  it('Golf eTSI: values in unresolved conflict never feed the comparison', () => {
    const c = candidate(GOLF_CURRENT_IDS.variant, 'Golf eTSI', '2026-09-24');
    const conflicted = new Set(detectConflicts(bundle.spec_values.filter((v) => v.variant_id === GOLF_CURRENT_IDS.variant)).flatMap((x) => x.value_ids));
    expect(conflicted.size).toBeGreaterThan(0);
    expect(Object.values(c.facts).flat().some((v) => conflicted.has(v.id))).toBe(false);
    expect(c.exclusions.some((e) => /unresolved conflict/.test(e))).toBe(true);
    const r = compareVehicles(c, candidate(X3_2018_IDS.variant, 'BMW X3 2018'), SCEN);
    expect(r.dataConfidence.level).not.toBe('HIGH');
    expect(r.dataConfidence.reasons).toContain('values in unresolved conflict were excluded');
  });
});

describe('comparison-engine — architecture boundary', () => {
  const srcDir = fileURLToPath(new URL('../src/', import.meta.url));
  const code = readdirSync(srcDir)
    .map((f) => readFileSync(`${srcDir}${f}`, 'utf8'))
    .join('\n')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/^\s*\/\/.*$/gm, '');
  it('imports only pure packages (no db, adapters, worker, market data I/O)', () => {
    const allowed = ['@vscar/vehicle-schema', '@vscar/methodology', '@vscar/quality', '@vscar/economics-engine', 'zod'];
    for (const i of [...code.matchAll(/from '([^']+)'/g)].map((m) => m[1]!)) expect(i.startsWith('./') || allowed.includes(i), i).toBe(true);
    expect(code).not.toMatch(/fetch\(|node:|mysql|drizzle|data-connectors|@vscar\/db|@vscar\/worker/);
  });
  it('never recalculates economics (only consumes EconomicResult; deltas/break-even from the Economics Engine)', () => {
    expect(code).not.toMatch(/computeEconomics|economicSensitivity|economicVehicleInputFromBundle/);
    expect(code).toMatch(/economicDelta\(/);
    expect(code).toMatch(/breakEven\(/);
  });
  it('declares only pure dependencies; no winner/score fields in the contracts', () => {
    const pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8')) as { dependencies: Record<string, string> };
    expect(Object.keys(pkg.dependencies).sort()).toEqual(['@vscar/economics-engine', '@vscar/methodology', '@vscar/quality', '@vscar/vehicle-schema', 'zod']);
    expect(code).not.toMatch(/\b(winner|overallScore|recommendedVehicle|personalFit)\b/);
  });
});
