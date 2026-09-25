import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { BYD_SEAL_IDS, GOLF_2018_IDS, GOLF_CURRENT_IDS, LEON_EHYBRID_IDS, MODEL3_2021_IDS, X3_2018_IDS, loadCase } from '@vscar/fixtures';
import { detectConflicts } from '@vscar/quality';
import { UsedVehicleInstance } from '@vscar/vehicle-schema';
import { computeEconomics, economicVehicleInputFromBundle } from '../src/index.ts';
import { ctx, warnCodes } from './helpers.ts';

/** Los seis casos reales (Dataset Core v0.1) con las referencias de mercado reales de 4e/4f (Madrid). */
const CONTEXT = ctx({ petrol: 1.975, diesel: 1.974, electricity: 0.194264 });
const S = { annualKm: 15_000, horizonYears: 5 };

describe('economics on the six real fixture cases', () => {
  it('Golf 2018: no publishable consumption → Economy unavailable (never estimated)', () => {
    const b = loadCase('golf2018TwoHomologations');
    for (const id of [GOLF_2018_IDS.rvA, GOLF_2018_IDS.rvB]) {
      const r = computeEconomics(economicVehicleInputFromBundle(b, id), CONTEXT, S);
      expect(r.runningCost.status).toBe('UNAVAILABLE');
      expect(warnCodes(r)).toContain('CONSUMPTION_UNAVAILABLE');
    }
  });

  it('BMW X3 2018: the 5.0–5.4 NEDC range propagates to every cost; used unit priced by its asking price', () => {
    const b = loadCase('bmwX3Range');
    const used = UsedVehicleInstance.parse({ id: '00000000-0000-4000-8000-0000000a0001', reference_variant_id: X3_2018_IDS.variant, registration_year: 2018, mileage_km: 112_000, asking_price_minor: 2_250_000, currency: 'EUR' });
    const input = economicVehicleInputFromBundle(b, X3_2018_IDS.variant, { usedInstance: used });
    const r = computeEconomics(input, CONTEXT, S);
    expect(r.energy.costPer100km).toEqual({ min: 9.87, max: 10.6596 }); // 5.0 / 5.4 × 1.974
    expect(r.runningCost.annual_minor).toEqual({ min: 148050, max: 159894 });
    expect(r.runningCost.horizons.find((h) => h.years === 5)!.total_minor).toEqual({ min: 740250, max: 799470 });
    expect(warnCodes(r)).toEqual(expect.arrayContaining(['CONSUMPTION_RANGE', 'CYCLE_NOT_WLTP']));
    expect(r.ownershipCost.purchase).toEqual({ amount_minor: 2_250_000, basis: 'USER_PROVIDED', source: 'USED_ASKING' });
    expect(r.confidence.level).not.toBe('HIGH');
  });

  it('BYD SEAL: BEV from official consumption + reference electricity; unspecified charging losses → range', () => {
    const b = loadCase('bydSealBatteryUnspecified');
    const r = computeEconomics(economicVehicleInputFromBundle(b, BYD_SEAL_IDS.variant), CONTEXT, S);
    expect(r.energy.costPer100km).toEqual({ min: 3.2248, max: 3.5831 }); // 16.6 × 0.194264 … ÷ 0.9
    expect(r.runningCost.status).toBe('AVAILABLE');
    expect(warnCodes(r)).toEqual(expect.arrayContaining(['CHARGING_LOSS_BASIS_UNSPECIFIED', 'ELECTRICITY_REFERENCE_EXCLUDES_TAX', 'PRICE_TAXES_UNKNOWN']));
    expect(r.ownershipCost.purchase).toEqual({ amount_minor: 4_949_000, basis: 'KNOWN', source: 'LIST' });
  });

  it('SEAT León e-HYBRID: the DE charge-sustaining value is not usable → no automatic PHEV cost, even with an electric share', () => {
    const b = loadCase('seatLeonEhybridCrossMarket');
    const input = economicVehicleInputFromBundle(b, LEON_EHYBRID_IDS.variant, { at: '2026-09-24' });
    expect(input.chargeSustainingL100).toBeUndefined();
    const r = computeEconomics(input, CONTEXT, { ...S, phevElectricShare: 0.5 });
    expect(r.runningCost.status).toBe('UNAVAILABLE');
    expect(warnCodes(r)).toEqual(expect.arrayContaining(['PHEV_CS_UNAVAILABLE', 'PHEV_WEIGHTED_CONSUMPTION_IGNORED', 'VALUE_EXCLUDED']));
    expect(r.warnings.find((w) => w.code === 'VALUE_EXCLUDED')!.detail).toMatch(/nrg\.fuel_charge_sustaining_l100 .*\(DE\) not used/);
  });

  it('Tesla Model 3 2021: incomplete charging data does not block energy cost', () => {
    const b = loadCase('teslaModel3IntraYear');
    const r = computeEconomics(economicVehicleInputFromBundle(b, MODEL3_2021_IDS.srp, { at: '2021-06-01' }), CONTEXT, S);
    expect(r.energy.costPer100km).toEqual({ min: 2.7585, max: 3.0651 }); // 14.2 × 0.194264 … ÷ 0.9
    expect(r.ownershipCost.purchase!.amount_minor).toBe(4_599_000); // tarifa vigente el 2021-06-01
  });

  it('Golf eTSI: consumption available; no value in an unresolved conflict (IDAE vs VW) is used automatically', () => {
    const b = loadCase('golfCurrentOfficialConflict');
    const r = computeEconomics(economicVehicleInputFromBundle(b, GOLF_CURRENT_IDS.variant, { at: '2026-09-24' }), CONTEXT, S);
    expect(r.energy.costPer100km).toEqual({ min: 10.27, max: 10.27 }); // 5.2 × 1.975
    const conflicted = new Set(detectConflicts(b.spec_values).flatMap((c) => c.value_ids));
    expect(conflicted.size).toBeGreaterThan(0);
    expect(r.provenance.vehicleValueIds.some((id) => conflicted.has(id))).toBe(false);
  });
});

describe('economics-engine — architecture boundary', () => {
  const srcDir = fileURLToPath(new URL('../src/', import.meta.url));
  const code = readdirSync(srcDir)
    .map((f) => readFileSync(`${srcDir}${f}`, 'utf8'))
    .join('\n')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/^\s*\/\/.*$/gm, '');
  it('imports only pure packages (no db, adapters, worker or node I/O)', () => {
    const imports = [...code.matchAll(/from '([^']+)'/g)].map((m) => m[1]!);
    const allowed = ['@vscar/vehicle-schema', '@vscar/methodology', '@vscar/market-context', '@vscar/quality', 'zod'];
    for (const i of imports) expect(i.startsWith('./') || allowed.includes(i), i).toBe(true);
    expect(code).not.toMatch(/fetch\(|node:|mysql|drizzle|data-connectors|@vscar\/db|@vscar\/worker/);
  });
  it('declares only pure dependencies', () => {
    const pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8')) as { dependencies: Record<string, string> };
    expect(Object.keys(pkg.dependencies).sort()).toEqual(['@vscar/market-context', '@vscar/methodology', '@vscar/quality', '@vscar/vehicle-schema', 'zod']);
  });
});
