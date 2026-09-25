import { ECONOMICS_RULES, METHODOLOGY_VERSION, methodologyFingerprint } from '@vscar/methodology';
import { effectiveEnergyInputs, type EffectivePrice, type EnergyContext } from '@vscar/market-context';
import type { FuelProduct } from '@vscar/vehicle-schema';
import {
  EconomicScenario,
  EconomicVehicleInput,
  VehicleEconomicOverrides,
  type Assumption,
  type CostBasis,
  type CostComponent,
  type CostLine,
  type EconomicResult,
  type EconomicScenarioIn,
  type EconomicVehicleInputIn,
  type EconomicWarning,
  type ElectricQuantity,
  type EnergyPriceUsed,
  type OwnershipHorizon,
  type Quantity,
  type WarningEntry,
} from './contracts.ts';
import { add, isPoint, minorRange, point, rate, roundTo, scale, sum, type Range } from './money.ts';

const R = ECONOMICS_RULES;
const q2r = (q: Quantity | ElectricQuantity): Range => ({ min: q.min, max: q.max });

/** Base de una línea: la más débil de sus entradas (ESTIMATED > USER_PROVIDED > KNOWN). */
function weakest(bases: readonly CostBasis[]): CostBasis {
  if (bases.includes('ESTIMATED')) return 'ESTIMATED';
  if (bases.includes('USER_PROVIDED')) return 'USER_PROVIDED';
  return 'KNOWN';
}
const priceBasis = (p: EffectivePrice): CostBasis => (p.origin === 'USER_OVERRIDE' ? 'USER_PROVIDED' : p.origin === 'METHODOLOGY_FALLBACK' ? 'ESTIMATED' : 'KNOWN');

interface EnergyPart {
  component: 'FUEL' | 'ELECTRICITY';
  /** €/100 km del componente, ya ponderado por la fracción de km (PHEV). */
  per100: Range;
  /** Litros o kWh por año. */
  quantityPerYear: Range;
  bases: CostBasis[];
  detail: string;
}

/**
 * Economics v0.1 para UN vehículo. Puro y determinista: el resultado no depende de otros vehículos.
 * Nunca inventa: sin consumo o sin precio de energía el componente es UNAVAILABLE (nunca 0).
 */
export function computeEconomics(
  vehicleIn: EconomicVehicleInputIn,
  context: EnergyContext,
  scenarioIn: EconomicScenarioIn,
  overridesIn: VehicleEconomicOverrides = {},
): EconomicResult {
  const vehicle = EconomicVehicleInput.parse(vehicleIn);
  const scenario = EconomicScenario.parse(scenarioIn);
  const overrides = VehicleEconomicOverrides.parse(overridesIn);
  const warnings: WarningEntry[] = [];
  const warn = (code: EconomicWarning, detail: string) => {
    if (!warnings.some((w) => w.code === code && w.detail === detail)) warnings.push({ code, detail });
  };
  const assumptions: Assumption[] = [
    { key: 'annual_km', value: scenario.annualKm, status: 'USER_PROVIDED' },
    { key: 'horizon_years', value: scenario.horizonYears, status: 'USER_PROVIDED' },
  ];
  const penalties: string[] = [];
  const penalize = (key: keyof typeof R.confidence.penalties) => {
    if (!penalties.includes(key)) penalties.push(key);
  };
  const energyPrices: EnergyPriceUsed[] = [];
  const vehicleValueIds: string[] = [];
  const sources = new Map<string, string>();

  for (const e of vehicle.exclusions) {
    warn(/weighted/i.test(e) ? 'PHEV_WEIGHTED_CONSUMPTION_IGNORED' : 'VALUE_EXCLUDED', e);
  }
  if (scenario.cityShare !== undefined) warn('CITY_SHARE_NOT_APPLIED', 'v0.1 uses the combined consumption; city share is recorded but not applied');

  // ---------------------------------------------------------------- precios de energía (market-context)
  const inputs = effectiveEnergyInputs(context, scenario.energy);
  const usePrice = (energy: 'FUEL' | 'ELECTRICITY', product: string, p: EffectivePrice | undefined): (EffectivePrice & { value: number }) | undefined => {
    if (!p || p.value === undefined || p.origin === 'UNAVAILABLE') {
      warn('ENERGY_PRICE_UNAVAILABLE', `${energy === 'FUEL' ? product : 'electricity'}: no user price, no usable market reference, no justified fallback`);
      return undefined;
    }
    if (!energyPrices.some((x) => x.product === product)) {
      const ref = p.origin === 'MARKET_REFERENCE' ? p.reference : undefined;
      energyPrices.push({
        energy,
        product,
        value: p.value,
        unit: p.unit,
        origin: p.origin,
        status: p.status as EnergyPriceUsed['status'],
        ...(ref ? { observationDate: ref.observationDate, freshness: ref.freshness, source_id: ref.provenance.source_id, observation_id: ref.provenance.observation_id, price_basis: ref.provenance.price_basis, taxes: ref.provenance.taxes } : {}),
      });
      if (ref) sources.set(ref.provenance.source_id, `${energy === 'FUEL' ? 'fuel' : 'electricity'} reference price`);
      if (p.origin === 'METHODOLOGY_FALLBACK') {
        warn('ENERGY_PRICE_ESTIMATED', `${product}: methodology fallback price`);
        penalize('energy_price_fallback');
      }
      if (ref?.freshness === 'STALE') {
        warn('STALE_MARKET_DATA', `${product}: reference from ${ref.observationDate} (${ref.ageDays} days old)`);
        penalize('market_data_stale');
      } else if (ref?.freshness === 'RECENT') {
        warn('RECENT_MARKET_DATA', `${product}: reference from ${ref.observationDate} (${ref.ageDays} days old)`);
        penalize('market_data_recent');
      }
      if (energy === 'ELECTRICITY' && ref?.provenance.taxes === 'EXCLUDED') {
        warn('ELECTRICITY_REFERENCE_EXCLUDES_TAX', 'reference electricity price (PVPC energy term): excludes electricity tax, VAT and the power term; it is not the user’s tariff');
      }
    }
    return p as EffectivePrice & { value: number };
  };

  const noteConsumption = (key: string, q: Quantity | ElectricQuantity) => {
    if (q.value_id) vehicleValueIds.push(q.value_id);
    if (q.source_id) sources.set(q.source_id, `${key} consumption`);
    if (!isPoint(q2r(q))) {
      warn('CONSUMPTION_RANGE', `${key}: homologated range ${q.min}–${q.max} propagated (no midpoint)`);
      penalize('consumption_range');
    }
    const cycle = q.test_cycle === 'UNDECLARED' ? q.test_cycle_inferred ?? 'UNDECLARED' : q.test_cycle;
    if (q.test_cycle === 'UNDECLARED') {
      warn('CYCLE_UNDECLARED', `${key}: cycle not declared${q.test_cycle_inferred ? ` (inferred ${q.test_cycle_inferred})` : ''}`);
      penalize('cycle_undeclared');
    }
    if (cycle && cycle !== 'WLTP' && cycle !== 'UNDECLARED') {
      warn('CYCLE_NOT_WLTP', `${key}: ${cycle} consumption (typically further from real-world use than WLTP)`);
      penalize('cycle_not_wltp');
    }
    if (q.mapping_confidence === 'POWERTRAIN_LEVEL') penalize('mapping_powertrain_level');
    if (q.mapping_confidence === 'GENERATION_LEVEL') penalize('mapping_generation_level');
  };

  const fuelPart = (q: Quantity | undefined, key: string, kmShare: number): EnergyPart | undefined => {
    const product = vehicle.fuelType ? R.fuel_product_by_fuel_type[vehicle.fuelType] : undefined;
    if (!product) {
      warn('FUEL_TYPE_UNSUPPORTED', `fuel type ${vehicle.fuelType ?? 'unknown'} has no reference product in ${R.version}`);
      return undefined;
    }
    if (!q) {
      warn('CONSUMPTION_UNAVAILABLE', `${key}: no usable value`);
      return undefined;
    }
    noteConsumption(key, q);
    const price = usePrice('FUEL', product, inputs.fuel[product as FuelProduct]);
    if (!price) return undefined;
    const litres = scale(q2r(q), (scenario.annualKm / 100) * kmShare);
    return { component: 'FUEL', per100: scale(scale(q2r(q), price.value), kmShare), quantityPerYear: litres, bases: [priceBasis(price)], detail: `${key} × ${product} ${price.value} €/L` };
  };

  const electricPart = (q: ElectricQuantity | undefined, kmShare: number): EnergyPart | undefined => {
    if (!q) {
      warn('CONSUMPTION_UNAVAILABLE', 'nrg.electric_combined_kwh100: no usable value');
      return undefined;
    }
    noteConsumption('nrg.electric_combined_kwh100', q);
    const price = usePrice('ELECTRICITY', 'ELECTRICITY', inputs.electricity);
    if (!price) return undefined;
    const userEff = scenario.chargingEfficiency;
    const eff = userEff ?? R.charging_efficiency.default;
    const bases: CostBasis[] = [priceBasis(price)];
    let grid: Range;
    if (q.charging_loss_basis === 'INCLUDED') {
      grid = q2r(q);
    } else {
      grid = q.charging_loss_basis === 'EXCLUDED' ? scale(q2r(q), 1 / eff) : { min: q.min, max: q.max / eff };
      if (q.charging_loss_basis === 'UNSPECIFIED') {
        warn('CHARGING_LOSS_BASIS_UNSPECIFIED', `the source does not say whether ${q.min}–${q.max} kWh/100 km includes charging losses: range [as published, ÷ ${eff}]`);
        penalize('charging_loss_unspecified');
      }
      if (userEff === undefined) {
        warn('CHARGING_EFFICIENCY_ESTIMATED', `charging efficiency ${eff} (methodology ${R.version}, ESTIMATED — not a vehicle fact)`);
        bases.push('ESTIMATED');
      } else bases.push('USER_PROVIDED');
      if (!assumptions.some((a) => a.key === 'charging_efficiency')) assumptions.push({ key: 'charging_efficiency', value: eff, status: userEff === undefined ? 'ESTIMATED' : 'USER_PROVIDED' });
    }
    if (scenario.energy.homeChargingShare !== undefined && !assumptions.some((a) => a.key === 'home_charging_share')) {
      assumptions.push({ key: 'home_charging_share', value: scenario.energy.homeChargingShare, status: 'USER_PROVIDED', note: 'recorded; v0.1 has one reference electricity price, so it does not change the cost' });
      warn('HOME_CHARGING_SHARE_NOT_APPLIED', 'v0.1 prices all charging at the single reference electricity price (home/public prices: Later)');
    }
    return { component: 'ELECTRICITY', per100: scale(scale(grid, price.value), kmShare), quantityPerYear: scale(grid, (scenario.annualKm / 100) * kmShare), bases, detail: `grid kWh/100 km × electricity ${price.value} €/kWh` };
  };

  // ---------------------------------------------------------------- energía por tren motriz
  let parts: EnergyPart[] | undefined;
  switch (vehicle.powertrainType) {
    case 'ICE':
    case 'MHEV':
    case 'HEV': {
      const f = fuelPart(vehicle.fuelConsumptionL100, 'nrg.fuel_combined_l100', 1);
      parts = f ? [f] : undefined;
      break;
    }
    case 'BEV': {
      // La autonomía no es necesaria para el coste.
      const e = electricPart(vehicle.electricConsumptionKwh100, 1);
      parts = e ? [e] : undefined;
      break;
    }
    case 'PHEV': {
      const share = overrides.phevElectricShare ?? scenario.phevElectricShare;
      if (share === undefined) {
        warn('PHEV_ELECTRIC_SHARE_REQUIRED', 'PHEV cost needs the share of km driven on electricity (scenario); it is not derived from the WLTP weighted value');
        parts = undefined;
        break;
      }
      assumptions.push({ key: 'phev_electric_share', value: share, status: 'USER_PROVIDED' });
      penalize('phev_electric_share_assumed');
      const e = share > 0 ? electricPart(vehicle.electricConsumptionKwh100, share) : undefined;
      let f: EnergyPart | undefined;
      if (share < 1) {
        if (!vehicle.chargeSustainingL100) {
          warn('PHEV_CS_UNAVAILABLE', 'no usable charge-sustaining consumption: the WLTP weighted value is never used for cost → PHEV running cost unavailable');
        } else f = fuelPart(vehicle.chargeSustainingL100, 'nrg.fuel_charge_sustaining_l100', 1 - share);
      }
      const needed = (share > 0 ? 1 : 0) + (share < 1 ? 1 : 0);
      const got = [e, f].filter((x): x is EnergyPart => !!x);
      parts = got.length === needed ? got : undefined;
      break;
    }
    default:
      warn('POWERTRAIN_NOT_SUPPORTED', `${vehicle.powertrainType} is not supported by ${R.version}`);
      parts = undefined;
  }

  // ---------------------------------------------------------------- uso
  const breakdown: CostLine[] = [];
  const horizons = [...new Set<number>([...R.report_horizons_years, scenario.horizonYears])].sort((a, b) => a - b);
  let annualRunning: Range | undefined;
  let energyBlock: EconomicResult['energy'] = { status: 'UNAVAILABLE' };
  if (parts) {
    const annualParts = parts.map((p) => minorRange(scale(p.per100, scenario.annualKm / 100)));
    parts.forEach((p, i) =>
      breakdown.push({ component: p.component, timing: 'ANNUAL', amount_minor: annualParts[i]!, basis: weakest(p.bases), detail: p.detail }),
    );
    annualRunning = sum(annualParts);
    const fuel = parts.find((p) => p.component === 'FUEL');
    const elec = parts.find((p) => p.component === 'ELECTRICITY');
    energyBlock = {
      status: 'AVAILABLE',
      costPer100km: rate(sum(parts.map((p) => p.per100))),
      ...(fuel ? { litresPerYear: { min: roundTo(fuel.quantityPerYear.min, 3), max: roundTo(fuel.quantityPerYear.max, 3) } } : {}),
      ...(elec ? { kwhPerYear: { min: roundTo(elec.quantityPerYear.min, 3), max: roundTo(elec.quantityPerYear.max, 3) } } : {}),
      annual_minor: annualRunning,
    };
  }

  // ---------------------------------------------------------------- propiedad
  let purchase: EconomicResult['ownershipCost']['purchase'];
  if (overrides.purchasePriceOverride) purchase = { amount_minor: overrides.purchasePriceOverride.amount_minor, basis: 'USER_PROVIDED', source: 'OVERRIDE' };
  else if (vehicle.purchase.participant === 'USED' && vehicle.purchase.usedAskingPrice) purchase = { amount_minor: vehicle.purchase.usedAskingPrice.amount_minor, basis: 'USER_PROVIDED', source: 'USED_ASKING' };
  else if (vehicle.purchase.participant === 'NEW' && vehicle.purchase.listPrice) {
    purchase = { amount_minor: vehicle.purchase.listPrice.amount_minor, basis: vehicle.purchase.listPrice.status === 'KNOWN' ? 'KNOWN' : vehicle.purchase.listPrice.status, source: 'LIST' };
    if (vehicle.purchase.listPrice.incl_taxes === 'UNKNOWN') warn('PRICE_TAXES_UNKNOWN', 'the list price source does not state whether taxes are included');
    if (vehicle.purchase.listPrice.source_id) sources.set(vehicle.purchase.listPrice.source_id, 'purchase price');
  }
  if (!purchase) {
    warn('PURCHASE_PRICE_NOT_AVAILABLE', vehicle.purchase.participant === 'USED' ? 'used vehicle: enter the asking price (the original list price is not the purchase price)' : 'no valid list price');
    penalize('purchase_price_missing');
  } else breakdown.push({ component: 'PURCHASE', timing: 'ONE_OFF', amount_minor: point(purchase.amount_minor), basis: purchase.basis, detail: `purchase price (${purchase.source})` });

  let maintenance: { amount: number; basis: CostBasis } | undefined;
  if (overrides.maintenanceAnnualOverride) maintenance = { amount: overrides.maintenanceAnnualOverride.amount_minor, basis: 'USER_PROVIDED' };
  else if (vehicle.maintenanceAnnualEstimate) {
    maintenance = { amount: vehicle.maintenanceAnnualEstimate.amount_minor, basis: vehicle.maintenanceAnnualEstimate.status === 'USER_PROVIDED' ? 'USER_PROVIDED' : 'ESTIMATED' };
    if (maintenance.basis === 'ESTIMATED') {
      warn('MAINTENANCE_ESTIMATED', vehicle.maintenanceAnnualEstimate.label ?? 'annual maintenance estimate');
      penalize('maintenance_estimated');
    }
  }
  if (!maintenance) {
    warn('MAINTENANCE_NOT_AVAILABLE', 'no maintenance estimate (none defined by methodology; the user can enter one)');
    penalize('maintenance_missing');
  } else breakdown.push({ component: 'MAINTENANCE', timing: 'ANNUAL', amount_minor: point(maintenance.amount), basis: maintenance.basis, detail: 'annual maintenance' });

  const residualFor = (years: number): { amount: number; basis: CostBasis } | undefined => {
    const o = overrides.residualOverrides?.find((r) => r.years === years);
    if (o) return { amount: o.amount_minor, basis: 'USER_PROVIDED' };
    const e = vehicle.residualEstimates.find((r) => r.years === years);
    return e ? { amount: e.amount_minor, basis: e.status } : undefined;
  };

  const ownershipHorizons: OwnershipHorizon[] = [];
  if (annualRunning && purchase) {
    for (const years of horizons) {
      const included: CostComponent[] = ['PURCHASE', ...(parts ?? []).map((p) => p.component)];
      const missing: CostComponent[] = [];
      let total = add(point(purchase.amount_minor), scale(annualRunning, years));
      if (maintenance) {
        total = add(total, point(maintenance.amount * years));
        included.push('MAINTENANCE');
      } else missing.push('MAINTENANCE');
      const residual = residualFor(years);
      if (residual) {
        if (residual.amount > purchase.amount_minor) warn('RESIDUAL_ABOVE_PURCHASE_PRICE', `residual at ${years} years exceeds the purchase price`);
        total = add(total, point(-residual.amount));
        included.push('RESIDUAL');
        breakdown.push({ component: 'RESIDUAL', timing: 'END_OF_HORIZON', amount_minor: point(-residual.amount), basis: residual.basis, detail: `residual value after ${years} years` });
        if (residual.basis === 'ESTIMATED' && years === scenario.horizonYears) penalize('residual_estimated');
      } else missing.push('RESIDUAL');
      ownershipHorizons.push({ years, view: missing.length === 0 ? 'COMPLETE' : 'KNOWN_COST_VIEW', total_minor: total, included, missing });
    }
    if (!residualFor(scenario.horizonYears)) {
      warn('RESIDUAL_NOT_AVAILABLE', `no residual value for ${scenario.horizonYears} years: ownership is a known-cost view, not a total cost of ownership`);
      penalize('residual_missing');
    }
  }
  const ownershipStatus = ownershipHorizons.length === 0 ? 'UNAVAILABLE' : ownershipHorizons.every((h) => h.view === 'COMPLETE') ? 'AVAILABLE' : 'PARTIAL';

  // ---------------------------------------------------------------- confianza
  let score = 100;
  for (const p of penalties) score -= R.confidence.penalties[p as keyof typeof R.confidence.penalties];
  if (!annualRunning) score = Math.min(score, 0);
  score = Math.max(0, score);
  const level = score >= R.confidence.thresholds.high ? 'HIGH' : score >= R.confidence.thresholds.medium ? 'MEDIUM' : 'LOW';

  const result: Omit<EconomicResult, 'scenarioHash'> = {
    vehicleId: vehicle.id,
    methodologyVersion: METHODOLOGY_VERSION,
    economicsRulesVersion: R.version,
    roundingPolicy: R.rounding.version,
    currency: 'EUR',
    energy: energyBlock,
    runningCost: {
      status: annualRunning ? 'AVAILABLE' : 'UNAVAILABLE',
      ...(annualRunning ? { annual_minor: annualRunning } : {}),
      horizons: annualRunning ? horizons.map((years) => ({ years, total_minor: scale(annualRunning!, years) })) : [],
    },
    ownershipCost: { status: ownershipStatus, ...(purchase ? { purchase } : {}), horizons: ownershipHorizons },
    breakdown,
    confidence: { level, score, reasons: annualRunning ? penalties : ['running cost unavailable', ...penalties] },
    warnings,
    assumptions,
    provenance: {
      energyPrices,
      vehicleValueIds: [...new Set(vehicleValueIds)].sort(),
      sources: [...sources.entries()].map(([source_id, role]) => ({ source_id, role })).sort((a, b) => a.source_id.localeCompare(b.source_id) || a.role.localeCompare(b.role)),
    },
  };
  return { ...result, scenarioHash: scenarioHashOf(vehicle, energyPrices, scenario, overrides) };
}

/**
 * Huella reproducible (FNV-1a de methodology sobre JSON canónico) de todo lo que determina el resultado:
 * metodología, hechos del vehículo, precios de energía efectivamente usados, escenario y overrides.
 */
export function scenarioHashOf(vehicle: EconomicVehicleInput, energyPrices: readonly EnergyPriceUsed[], scenario: EconomicScenario, overrides: VehicleEconomicOverrides): string {
  return methodologyFingerprint({ methodology: METHODOLOGY_VERSION, rules: R.version, vehicle, energyPrices, scenario, overrides });
}
