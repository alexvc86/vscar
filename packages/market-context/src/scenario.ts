import { z } from 'zod';
import { ENERGY_MARKET_RULES, type EnergyPriceOrigin } from '@vscar/methodology';
import { FUEL_PRODUCTS, type FuelProduct } from '@vscar/vehicle-schema';
import type { EnergyContext, ReferencePrice } from './context.ts';

/**
 * Supuestos del usuario / escenario. NO son datos de mercado: nunca se guardan en `EnergyContext`.
 * Los consumirá Economics junto con el contexto.
 */
const FuelKey = z.enum(FUEL_PRODUCTS as [FuelProduct, ...FuelProduct[]]);
export const EnergyScenario = z
  .object({
    /** Fracción de la energía de un EV/PHEV cargada en casa (0–1). */
    homeChargingShare: z.number().min(0).max(1).optional(),
    fuelPriceOverrides: z.record(FuelKey, z.number().positive().max(10)).optional(),
    electricityPriceOverride: z.number().positive().max(5).optional(),
  })
  .strict();
export type EnergyScenario = z.infer<typeof EnergyScenario>;

export interface EffectivePrice {
  /** Ausente si `origin = UNAVAILABLE` (nunca se inventa). */
  value?: number;
  unit: 'EUR_PER_L' | 'EUR_PER_KWH';
  origin: EnergyPriceOrigin;
  /** Estado de procedencia que verá el usuario. */
  status: 'USER_PROVIDED' | 'CALCULATED' | 'ESTIMATED' | 'UNAVAILABLE';
  reference?: ReferencePrice;
}

export interface EffectiveEnergyInputs {
  fuel: Partial<Record<FuelProduct, EffectivePrice>>;
  electricity: EffectivePrice;
  homeChargingShare?: { value: number; status: 'USER_PROVIDED' };
  precedence: readonly string[];
}

/**
 * Precedencia (preparada para Economics): override del usuario > referencia de mercado > fallback metodológico
 * (ESTIMATED) > no disponible. El contexto de mercado nunca se modifica.
 */
export function effectiveEnergyInputs(context: EnergyContext, scenarioInput: EnergyScenario = {}, rules = ENERGY_MARKET_RULES): EffectiveEnergyInputs {
  const scenario = EnergyScenario.parse(scenarioInput);
  const fallbacks = rules.markets[context.market].fallback_prices;
  const choose = (key: string, unit: EffectivePrice['unit'], override: number | undefined, reference: ReferencePrice | undefined): EffectivePrice => {
    if (override !== undefined) return { value: override, unit, origin: 'USER_OVERRIDE', status: 'USER_PROVIDED', ...(reference ? { reference } : {}) };
    if (reference) return { value: reference.value, unit, origin: 'MARKET_REFERENCE', status: 'CALCULATED', reference };
    const fb = fallbacks[key];
    if (fb && fb.unit === unit) return { value: fb.value, unit, origin: 'METHODOLOGY_FALLBACK', status: 'ESTIMATED' };
    return { unit, origin: 'UNAVAILABLE', status: 'UNAVAILABLE' };
  };
  const products = new Set<FuelProduct>([...(Object.keys(context.fuel) as FuelProduct[]), ...(Object.keys(scenario.fuelPriceOverrides ?? {}) as FuelProduct[])]);
  const fuel: Partial<Record<FuelProduct, EffectivePrice>> = {};
  for (const p of products) fuel[p] = choose(p, 'EUR_PER_L', scenario.fuelPriceOverrides?.[p], context.fuel[p]);
  return {
    fuel,
    electricity: choose('ELECTRICITY', 'EUR_PER_KWH', scenario.electricityPriceOverride, context.electricity),
    ...(scenario.homeChargingShare !== undefined ? { homeChargingShare: { value: scenario.homeChargingShare, status: 'USER_PROVIDED' as const } } : {}),
    precedence: rules.precedence,
  };
}
