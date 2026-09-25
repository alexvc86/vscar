import { z } from 'zod';
import { EnergyScenario } from '@vscar/market-context';
import { ChargingLossBasis, FuelType, MappingConfidence, PowertrainType, SourceAuthority, TestCycle, Uuid } from '@vscar/vehicle-schema';
import type { Range } from './money.ts';

/**
 * Contratos del Economics Engine v0.1. Separación estricta:
 * - `EconomicVehicleInput`: hechos del vehículo (solo lo que Economics necesita, no el bundle);
 * - `EnergyContext` (market-context): precios de referencia observados;
 * - `EconomicScenario`: supuestos compartidos del usuario (km, horizonte, overrides de energía);
 * - `VehicleEconomicOverrides`: datos del usuario sobre UNA unidad (precio pagado, mantenimiento, residual).
 */

/** Consumo: punto (min = max) o rango homologado (nunca se colapsa). */
export const Quantity = z
  .object({
    min: z.number().positive(),
    max: z.number().positive(),
    value_id: Uuid.optional(),
    source_id: Uuid.optional(),
    source_authority: SourceAuthority.optional(),
    mapping_confidence: MappingConfidence.optional(),
    test_cycle: TestCycle.optional(),
    test_cycle_inferred: TestCycle.optional(),
  })
  .strict()
  .refine((q) => q.min <= q.max, 'min must be ≤ max');
export type Quantity = z.infer<typeof Quantity>;

export const ElectricQuantity = z
  .object({
    min: z.number().positive(),
    max: z.number().positive(),
    value_id: Uuid.optional(),
    source_id: Uuid.optional(),
    source_authority: SourceAuthority.optional(),
    mapping_confidence: MappingConfidence.optional(),
    test_cycle: TestCycle.optional(),
    test_cycle_inferred: TestCycle.optional(),
    /** ¿El consumo incluye las pérdidas de carga? Decide si se aplica la eficiencia de carga. */
    charging_loss_basis: ChargingLossBasis,
  })
  .strict()
  .refine((q) => q.min <= q.max, 'min must be ≤ max');
export type ElectricQuantity = z.infer<typeof ElectricQuantity>;

/** Cómo se conoce un importe. `KNOWN` = publicado por una fuente (lista oficial, referencia de mercado). */
export const AmountStatus = z.enum(['KNOWN', 'USER_PROVIDED', 'ESTIMATED']);
export type AmountStatus = z.infer<typeof AmountStatus>;

export const MoneyInput = z
  .object({
    amount_minor: z.number().int().nonnegative(),
    currency: z.literal('EUR'),
    status: AmountStatus,
    source_id: Uuid.optional(),
    record_id: Uuid.optional(),
    incl_taxes: z.enum(['YES', 'NO', 'UNKNOWN']).optional(),
    label: z.string().max(120).optional(),
  })
  .strict();
export type MoneyInput = z.infer<typeof MoneyInput>;

export const ResidualInput = z
  .object({ years: z.number().int().min(1).max(30), amount_minor: z.number().int().nonnegative(), currency: z.literal('EUR'), status: z.enum(['USER_PROVIDED', 'ESTIMATED']), label: z.string().max(120).optional() })
  .strict();
export type ResidualInput = z.infer<typeof ResidualInput>;

export const EconomicVehicleInput = z
  .object({
    id: Uuid,
    market: z.literal('ES'),
    powertrainType: PowertrainType,
    fuelType: FuelType.optional(),
    /** ICE / MHEV / HEV: consumo combinado. */
    fuelConsumptionL100: Quantity.optional(),
    /** PHEV: consumo con batería descargada (charge-sustaining). El ponderado WLTP nunca entra aquí. */
    chargeSustainingL100: Quantity.optional(),
    /** BEV / PHEV. */
    electricConsumptionKwh100: ElectricQuantity.optional(),
    purchase: z
      .object({
        participant: z.enum(['NEW', 'USED']),
        /** Precio de lista (vigente si NEW; original si histórico). */
        listPrice: MoneyInput.optional(),
        /** Precio pedido por una unidad usada (USER_PROVIDED). */
        usedAskingPrice: MoneyInput.optional(),
      })
      .strict(),
    /** Estimación anual de mantenimiento con fuente/metodología (ESTIMATED). Sin ella: no disponible. */
    maintenanceAnnualEstimate: MoneyInput.optional(),
    /** Valor residual estimado al final de N años. Sin él, la propiedad es una vista de costes conocidos. */
    residualEstimates: z.array(ResidualInput).max(30).default([]),
    /** Motivos por los que un dato del vehículo no se usa (p. ej. PHEV ponderado, valor en conflicto). */
    exclusions: z.array(z.string()).default([]),
  })
  .strict();
export type EconomicVehicleInput = z.infer<typeof EconomicVehicleInput>;
export type EconomicVehicleInputIn = z.input<typeof EconomicVehicleInput>;

export const EconomicScenario = z
  .object({
    annualKm: z.number().int().min(1).max(200_000),
    horizonYears: z.number().int().min(1).max(30),
    /** Aceptado para el futuro (consumo urbano/carretera); v0.1 usa el combinado y lo declara. */
    cityShare: z.number().min(0).max(1).optional(),
    /** Overrides de energía y % de carga en casa (market-context). */
    energy: EnergyScenario.default({}),
    /** Override del usuario de la eficiencia de carga (si no: metodología, ESTIMATED). */
    chargingEfficiency: z.number().min(0.5).max(1).optional(),
    /** PHEV: fracción de km en modo eléctrico (supuesto del usuario; no se deduce del WLTP). */
    phevElectricShare: z.number().min(0).max(1).optional(),
  })
  .strict();
export type EconomicScenario = z.infer<typeof EconomicScenario>;
export type EconomicScenarioIn = z.input<typeof EconomicScenario>;

export const VehicleEconomicOverrides = z
  .object({
    purchasePriceOverride: z.object({ amount_minor: z.number().int().nonnegative(), currency: z.literal('EUR') }).strict().optional(),
    maintenanceAnnualOverride: z.object({ amount_minor: z.number().int().nonnegative(), currency: z.literal('EUR') }).strict().optional(),
    residualOverrides: z.array(z.object({ years: z.number().int().min(1).max(30), amount_minor: z.number().int().nonnegative(), currency: z.literal('EUR') }).strict()).max(30).optional(),
    phevElectricShare: z.number().min(0).max(1).optional(),
  })
  .strict();
export type VehicleEconomicOverrides = z.infer<typeof VehicleEconomicOverrides>;

// ---------------------------------------------------------------------------------------------- resultado

export type AvailabilityStatus = 'AVAILABLE' | 'PARTIAL' | 'UNAVAILABLE';
/** Procedencia de una línea de coste (§11). */
export type CostBasis = 'KNOWN' | 'USER_PROVIDED' | 'ESTIMATED' | 'CALCULATED';
export type CostComponent = 'FUEL' | 'ELECTRICITY' | 'PURCHASE' | 'MAINTENANCE' | 'RESIDUAL';

export type EconomicWarning =
  | 'ENERGY_PRICE_UNAVAILABLE'
  | 'CONSUMPTION_UNAVAILABLE'
  | 'CONSUMPTION_RANGE'
  | 'CYCLE_NOT_WLTP'
  | 'CYCLE_UNDECLARED'
  | 'PHEV_CS_UNAVAILABLE'
  | 'PHEV_ELECTRIC_SHARE_REQUIRED'
  | 'PHEV_WEIGHTED_CONSUMPTION_IGNORED'
  | 'CHARGING_LOSS_BASIS_UNSPECIFIED'
  | 'CHARGING_EFFICIENCY_ESTIMATED'
  | 'ELECTRICITY_REFERENCE_EXCLUDES_TAX'
  | 'HOME_CHARGING_SHARE_NOT_APPLIED'
  | 'CITY_SHARE_NOT_APPLIED'
  | 'STALE_MARKET_DATA'
  | 'RECENT_MARKET_DATA'
  | 'ENERGY_PRICE_ESTIMATED'
  | 'FUEL_TYPE_UNSUPPORTED'
  | 'POWERTRAIN_NOT_SUPPORTED'
  | 'VALUE_EXCLUDED'
  | 'PURCHASE_PRICE_NOT_AVAILABLE'
  | 'PRICE_TAXES_UNKNOWN'
  | 'MAINTENANCE_ESTIMATED'
  | 'MAINTENANCE_NOT_AVAILABLE'
  | 'RESIDUAL_NOT_AVAILABLE'
  | 'RESIDUAL_ABOVE_PURCHASE_PRICE';

export interface WarningEntry {
  code: EconomicWarning;
  detail: string;
}

export interface EnergyPriceUsed {
  energy: 'FUEL' | 'ELECTRICITY';
  product: string;
  value: number;
  unit: 'EUR_PER_L' | 'EUR_PER_KWH';
  origin: 'USER_OVERRIDE' | 'MARKET_REFERENCE' | 'METHODOLOGY_FALLBACK';
  status: 'USER_PROVIDED' | 'CALCULATED' | 'ESTIMATED';
  observationDate?: string;
  freshness?: string;
  /** Para la capa de publicación: la fuente decide si el valor puede publicarse (p. ej. S04 bloqueado). */
  source_id?: string;
  observation_id?: string;
  price_basis?: string;
  taxes?: string;
}

export interface CostLine {
  component: CostComponent;
  /** `ANNUAL` se repite cada año; `ONE_OFF` al inicio; `END_OF_HORIZON` al final (residual, restando). */
  timing: 'ANNUAL' | 'ONE_OFF' | 'END_OF_HORIZON';
  amount_minor: Range;
  basis: CostBasis;
  detail: string;
}

export interface HorizonCost {
  years: number;
  total_minor: Range;
}

export interface OwnershipHorizon {
  years: number;
  /** COMPLETE = compra + uso + mantenimiento − residual. KNOWN_COST_VIEW = lo disponible, nunca llamado TCO. */
  view: 'COMPLETE' | 'KNOWN_COST_VIEW';
  total_minor: Range;
  included: CostComponent[];
  missing: CostComponent[];
}

export interface Assumption {
  key: string;
  value: number | string | boolean;
  status: 'USER_PROVIDED' | 'ESTIMATED' | 'METHODOLOGY';
  note?: string;
}

export interface EconomicResult {
  vehicleId: string;
  methodologyVersion: string;
  economicsRulesVersion: string;
  roundingPolicy: string;
  scenarioHash: string;
  currency: 'EUR';
  energy: {
    status: AvailabilityStatus;
    costPer100km?: Range;
    litresPerYear?: Range;
    kwhPerYear?: Range;
    annual_minor?: Range;
  };
  runningCost: {
    status: AvailabilityStatus;
    annual_minor?: Range;
    horizons: HorizonCost[];
  };
  ownershipCost: {
    status: AvailabilityStatus;
    purchase?: { amount_minor: number; basis: CostBasis; source: 'OVERRIDE' | 'USED_ASKING' | 'LIST' };
    horizons: OwnershipHorizon[];
  };
  breakdown: CostLine[];
  confidence: { level: 'HIGH' | 'MEDIUM' | 'LOW'; score: number; reasons: string[] };
  warnings: WarningEntry[];
  assumptions: Assumption[];
  provenance: {
    energyPrices: EnergyPriceUsed[];
    vehicleValueIds: string[];
    /** Fuentes que intervienen en el resultado: la capa de publicación aplica sus derechos (DATA_RIGHTS_MATRIX). */
    sources: { source_id: string; role: string }[];
  };
}
