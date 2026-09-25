import { z } from 'zod';
import { ENERGY_MARKET_RULES, METHODOLOGY_VERSION, energyFreshness, type Freshness } from '@vscar/methodology';
import { FUEL_PRODUCTS, type EnergyPriceObservation, type EnergyProduct, type FuelProduct, type PriceScopeType } from '@vscar/vehicle-schema';
import { energyZonesForRegion, isKnownRegion, type EnergyZones } from './zones.ts';

/**
 * Energy Market Context v0.1 (Step 4g). Convierte observaciones normalizadas (`EnergyPriceObservation`) en
 * precios de REFERENCIA para un mercado/región/fecha. Solo hechos observados, con fecha y procedencia.
 * No calcula costes de vehículo (€/100 km, coste anual, TCO…): eso es Economics.
 */
export const EnergyContextRequest = z
  .object({
    market: z.literal('ES'),
    /** ISO 3166-2 (`ES-MD`). Sin región → zonas por defecto del mercado (declarado). */
    region: z.string().regex(/^[A-Z]{2}-[A-Z]{2}$/).optional(),
    /** Fecha (local del mercado) para la que se pide el contexto. */
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    fuelProducts: z.array(z.enum(FUEL_PRODUCTS as [FuelProduct, ...FuelProduct[]])).min(1).optional(),
  })
  .strict();
export type EnergyContextRequest = z.infer<typeof EnergyContextRequest>;

/** Lo necesario para "How we calculated this" (no se muestra por defecto). */
export interface ReferencePriceProvenance {
  observation_id: string;
  source_id: string;
  source_url: string;
  derived_from_authority: string;
  scope_type: PriceScopeType;
  scope_code: string;
  statistic: 'MEDIAN' | 'MEAN';
  aggregation_method: string;
  price_basis: string;
  taxes: string;
  sample_size: number;
  provisional: boolean;
  raw_ingest_id: string;
  retrieved_at: string;
  label: string;
}

export interface ReferencePrice {
  value: number;
  unit: 'EUR_PER_L' | 'EUR_PER_KWH';
  /** Fecha del dato usado (puede ser anterior a la pedida). */
  observationDate: string;
  ageDays: number;
  freshness: Freshness;
  provenance: ReferencePriceProvenance;
}

export interface MissingReference {
  product: EnergyProduct;
  reason: 'NO_OBSERVATION' | 'OLDER_THAN_LOOKBACK';
  /** Última fecha vista fuera de ventana (si la hay). */
  latestSeen?: string;
}

export interface EnergyContext {
  market: 'ES';
  region?: string;
  /** Fecha pedida. Cada precio lleva su propia `observationDate`. */
  date: string;
  zones: EnergyZones & { resolution: 'REGION' | 'MARKET_DEFAULT' };
  fuelPricesEurPerL: Partial<Record<FuelProduct, number>>;
  electricityPriceEurPerKwh?: number;
  fuel: Partial<Record<FuelProduct, ReferencePrice>>;
  electricity?: ReferencePrice;
  missing: MissingReference[];
  rules: { methodology_version: string; energy_market_rules: string };
}

const DEFAULT_FUELS: FuelProduct[] = ['PETROL_95_E5', 'DIESEL_A'];
const dayNumber = (iso: string) => Date.parse(`${iso}T00:00:00Z`) / 86_400_000;

/** Selección determinista: fecha más reciente ≤ pedida; empate → recuperado más tarde → mayor versión → id. */
function pick(candidates: readonly EnergyPriceObservation[]): EnergyPriceObservation | undefined {
  return [...candidates].sort(
    (a, b) =>
      b.price_date.localeCompare(a.price_date) ||
      b.retrieved_at.localeCompare(a.retrieved_at) ||
      b.transformation_version - a.transformation_version ||
      a.id.localeCompare(b.id),
  )[0];
}

/**
 * Resuelve el contexto de energía a partir de observaciones ya cargadas (función pura).
 * Solo se usan agregados del ámbito que fija la metodología (TAX_ZONE para carburantes, TARIFF_ZONE para
 * electricidad): una importación parcial de MITECO (solo provincias) nunca se toma como precio de zona.
 */
export function resolveEnergyContext(input: EnergyContextRequest, observations: readonly EnergyPriceObservation[], rules = ENERGY_MARKET_RULES): EnergyContext {
  const req = EnergyContextRequest.parse(input);
  if (req.region && !isKnownRegion(req.market, req.region)) throw new Error(`unknown region ${req.region} for market ${req.market}`);
  const marketRules = rules.markets[req.market];
  const zones = req.region ? energyZonesForRegion(req.region) : marketRules.default_zones;
  const missing: MissingReference[] = [];

  const resolve = (product: EnergyProduct, rule: (typeof marketRules)['fuel'] | (typeof marketRules)['electricity'], zone: string): ReferencePrice | undefined => {
    const inScope = observations.filter(
      (o) =>
        o.market_code === req.market &&
        o.energy_product === product &&
        o.scope_type === rule.scope_type &&
        o.scope_code === zone &&
        o.statistic === rule.statistic &&
        o.price_basis === rule.price_basis &&
        o.price_date <= req.date,
    );
    const age = (o: EnergyPriceObservation) => dayNumber(req.date) - dayNumber(o.price_date);
    const chosen = pick(inScope.filter((o) => age(o) <= rules.max_lookback_days));
    if (!chosen) {
      const older = pick(inScope);
      missing.push({ product, reason: older ? 'OLDER_THAN_LOOKBACK' : 'NO_OBSERVATION', ...(older ? { latestSeen: older.price_date } : {}) });
      return undefined;
    }
    const ageDays = age(chosen);
    return {
      value: chosen.value,
      unit: chosen.unit,
      observationDate: chosen.price_date,
      ageDays,
      freshness: energyFreshness(ageDays, rules),
      provenance: {
        observation_id: chosen.id,
        source_id: chosen.source_id,
        source_url: chosen.source_url,
        derived_from_authority: chosen.derived_from_authority,
        scope_type: chosen.scope_type,
        scope_code: chosen.scope_code,
        statistic: chosen.statistic,
        aggregation_method: chosen.aggregation_method,
        price_basis: chosen.price_basis,
        taxes: chosen.taxes,
        sample_size: chosen.distribution.n,
        provisional: chosen.provisional,
        raw_ingest_id: chosen.raw_ingest_id,
        retrieved_at: chosen.retrieved_at,
        label: rule.label,
      },
    };
  };

  const fuel: Partial<Record<FuelProduct, ReferencePrice>> = {};
  for (const product of req.fuelProducts ?? DEFAULT_FUELS) {
    const p = resolve(product, marketRules.fuel, zones.fuel);
    if (p) fuel[product] = p;
  }
  const electricity = resolve('ELECTRICITY', marketRules.electricity, zones.electricity);

  return {
    market: req.market,
    ...(req.region ? { region: req.region } : {}),
    date: req.date,
    zones: { ...zones, resolution: req.region ? 'REGION' : 'MARKET_DEFAULT' },
    fuelPricesEurPerL: Object.fromEntries(Object.entries(fuel).map(([k, v]) => [k, v.value])),
    ...(electricity ? { electricityPriceEurPerKwh: electricity.value, electricity } : {}),
    fuel,
    missing,
    rules: { methodology_version: METHODOLOGY_VERSION, energy_market_rules: rules.version },
  };
}

/**
 * Puerto de lectura (lo implementa `@vscar/db` `createMarketDataRepository`; aquí solo la forma).
 * market-context no importa la base de datos ni los adapters.
 */
export interface EnergyPriceReader {
  loadEnergyPrices(q: {
    market_code: string;
    scope_type: PriceScopeType;
    scope_code: string;
    products?: readonly EnergyProduct[];
    from?: string;
    to?: string;
  }): Promise<EnergyPriceObservation[]>;
}

/** Carga solo lo necesario (ámbito y ventana de la metodología) y resuelve. */
export async function loadEnergyContext(reader: EnergyPriceReader, input: EnergyContextRequest, rules = ENERGY_MARKET_RULES): Promise<EnergyContext> {
  const req = EnergyContextRequest.parse(input);
  if (req.region && !isKnownRegion(req.market, req.region)) throw new Error(`unknown region ${req.region} for market ${req.market}`);
  const m = rules.markets[req.market];
  const zones = req.region ? energyZonesForRegion(req.region) : m.default_zones;
  const from = new Date(Date.parse(`${req.date}T00:00:00Z`) - rules.max_lookback_days * 86_400_000).toISOString().slice(0, 10);
  const [fuel, electricity] = await Promise.all([
    reader.loadEnergyPrices({ market_code: req.market, scope_type: m.fuel.scope_type, scope_code: zones.fuel, products: req.fuelProducts ?? DEFAULT_FUELS, from, to: req.date }),
    reader.loadEnergyPrices({ market_code: req.market, scope_type: m.electricity.scope_type, scope_code: zones.electricity, products: ['ELECTRICITY'], from, to: req.date }),
  ]);
  return resolveEnergyContext(req, [...fuel, ...electricity], rules);
}
