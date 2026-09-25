import { ECONOMICS_RULES, SENSITIVITY_RANGES } from '@vscar/methodology';
import type { EnergyContext } from '@vscar/market-context';
import type { FuelProduct } from '@vscar/vehicle-schema';
import { EconomicScenario, EconomicVehicleInput, type EconomicResult, type EconomicScenarioIn, type EconomicVehicleInputIn, type VehicleEconomicOverrides } from './contracts.ts';
import { computeEconomics } from './engine.ts';
import type { Range } from './money.ts';

/**
 * Sensibilidad determinista (una variable cada vez, sin Monte Carlo). Para cada variable se recalcula el
 * resultado en los extremos de su rango plausible (methodology) y se informa el coste de uso anual y el
 * coste de propiedad al horizonte del escenario.
 */
export type SensitivityVariable =
  | 'annual_km'
  | 'fuel_price'
  | 'electricity_price'
  | 'home_charging_share'
  | 'horizon'
  | 'purchase_price'
  | 'maintenance'
  | 'residual';

export interface SensitivityPoint {
  input: number;
  runningAnnual_minor?: Range;
  runningHorizon_minor?: Range;
  ownershipHorizon_minor?: Range;
}

export interface SensitivityEntry {
  variable: SensitivityVariable;
  base: number;
  low: SensitivityPoint;
  high: SensitivityPoint;
  /** NO_EFFECT: la variable no cambia el resultado en v0.1 (p. ej. % de carga en casa con un único precio). */
  effect: 'CHANGES' | 'NO_EFFECT';
}

export function economicSensitivity(
  vehicleIn: EconomicVehicleInputIn,
  context: EnergyContext,
  scenarioIn: EconomicScenarioIn,
  overrides: VehicleEconomicOverrides = {},
): { base: EconomicResult; entries: SensitivityEntry[]; skipped: { variable: SensitivityVariable; reason: string }[] } {
  const vehicle = EconomicVehicleInput.parse(vehicleIn);
  const scenario = EconomicScenario.parse(scenarioIn);
  const base = computeEconomics(vehicle, context, scenario, overrides);
  const ranges = SENSITIVITY_RANGES[vehicle.market];
  const H = scenario.horizonYears;
  const entries: SensitivityEntry[] = [];
  const skipped: { variable: SensitivityVariable; reason: string }[] = [];

  const measure = (r: EconomicResult, years = H): Omit<SensitivityPoint, 'input'> => ({
    ...(r.runningCost.annual_minor ? { runningAnnual_minor: r.runningCost.annual_minor } : {}),
    ...(r.runningCost.horizons.find((h) => h.years === years) ? { runningHorizon_minor: r.runningCost.horizons.find((h) => h.years === years)!.total_minor } : {}),
    ...(r.ownershipCost.horizons.find((h) => h.years === years) ? { ownershipHorizon_minor: r.ownershipCost.horizons.find((h) => h.years === years)!.total_minor } : {}),
  });
  const same = (a: Omit<SensitivityPoint, 'input'>, b: Omit<SensitivityPoint, 'input'>) => JSON.stringify(a) === JSON.stringify(b);
  const entry = (variable: SensitivityVariable, baseValue: number, lowIn: number, highIn: number, run: (x: number) => EconomicResult, years = (_x: number) => H) => {
    const lo = measure(run(lowIn), years(lowIn));
    const hi = measure(run(highIn), years(highIn));
    entries.push({ variable, base: baseValue, low: { input: lowIn, ...lo }, high: { input: highIn, ...hi }, effect: same(lo, hi) ? 'NO_EFFECT' : 'CHANGES' });
  };
  const withScenario = (patch: Partial<EconomicScenario>) => computeEconomics(vehicle, context, { ...scenario, ...patch }, overrides);
  const withOverrides = (patch: VehicleEconomicOverrides) => computeEconomics(vehicle, context, scenario, { ...overrides, ...patch });

  const km = ranges['annual_distance']!;
  entry('annual_km', scenario.annualKm, km.min, km.max, (x) => withScenario({ annualKm: x }));

  const fuelUsed = base.provenance.energyPrices.find((p) => p.energy === 'FUEL');
  if (fuelUsed) {
    const fp = ranges['fuel_price']!;
    entry('fuel_price', fuelUsed.value, fp.min, fp.max, (x) =>
      withScenario({ energy: { ...scenario.energy, fuelPriceOverrides: { ...scenario.energy.fuelPriceOverrides, [fuelUsed.product as FuelProduct]: x } } }),
    );
  } else skipped.push({ variable: 'fuel_price', reason: 'no fuel price used by this vehicle' });

  const elecUsed = base.provenance.energyPrices.find((p) => p.energy === 'ELECTRICITY');
  if (elecUsed) {
    const ep = ranges['electricity_home_price']!;
    entry('electricity_price', elecUsed.value, ep.min, ep.max, (x) => withScenario({ energy: { ...scenario.energy, electricityPriceOverride: x } }));
    const hs = ranges['home_charging_share']!;
    entry('home_charging_share', scenario.energy.homeChargingShare ?? 1, hs.min, hs.max, (x) => withScenario({ energy: { ...scenario.energy, homeChargingShare: x } }));
  } else {
    skipped.push({ variable: 'electricity_price', reason: 'no electricity price used by this vehicle' });
    skipped.push({ variable: 'home_charging_share', reason: 'no electricity used by this vehicle' });
  }

  const years = ranges['ownership_years']!;
  entry('horizon', H, years.min, years.max, (x) => withScenario({ horizonYears: x }), (x) => x);

  const rel = ECONOMICS_RULES.sensitivity;
  const purchase = base.ownershipCost.purchase?.amount_minor;
  if (purchase !== undefined) {
    const at = (k: number) => ({ amount_minor: Math.round(purchase * k), currency: 'EUR' as const });
    entry('purchase_price', purchase, Math.round(purchase * (1 - rel.purchase_price_rel)), Math.round(purchase * (1 + rel.purchase_price_rel)), (x) => withOverrides({ purchasePriceOverride: { ...at(1), amount_minor: x } }));
  } else skipped.push({ variable: 'purchase_price', reason: 'no purchase price' });

  const maint = base.breakdown.find((l) => l.component === 'MAINTENANCE')?.amount_minor.min;
  if (maint !== undefined) {
    entry('maintenance', maint, Math.round(maint * (1 - rel.maintenance_rel)), Math.round(maint * (1 + rel.maintenance_rel)), (x) => withOverrides({ maintenanceAnnualOverride: { amount_minor: x, currency: 'EUR' } }));
  } else skipped.push({ variable: 'maintenance', reason: 'no maintenance estimate' });

  const residual = base.breakdown.find((l) => l.component === 'RESIDUAL' && l.detail.endsWith(`after ${H} years`))?.amount_minor.min;
  if (residual !== undefined) {
    const r = -residual;
    entry('residual', r, Math.round(r * (1 - rel.residual_rel)), Math.round(r * (1 + rel.residual_rel)), (x) =>
      withOverrides({ residualOverrides: [...(overrides.residualOverrides ?? []).filter((o) => o.years !== H), { years: H, amount_minor: x, currency: 'EUR' }] }),
    );
  } else skipped.push({ variable: 'residual', reason: `no residual value for ${H} years` });

  return { base, entries, skipped };
}
