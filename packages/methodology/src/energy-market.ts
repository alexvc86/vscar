import type { EnergyPriceBasis, EsTariffZone, EsTaxZone, PriceScopeType } from '@vscar/vehicle-schema';

/**
 * Reglas de uso de datos de mercado de energía (methodology 2026.2, `energy-market-v1`).
 * Deciden QUÉ dato de referencia se usa y cuándo deja de ser usable; no calculan costes de vehículo.
 */
export type Freshness = 'CURRENT' | 'RECENT' | 'STALE';

/** Origen del precio que usará Economics, en orden de prioridad. */
export const ENERGY_PRICE_PRECEDENCE = ['USER_OVERRIDE', 'MARKET_REFERENCE', 'METHODOLOGY_FALLBACK'] as const;
export type EnergyPriceOrigin = (typeof ENERGY_PRICE_PRECEDENCE)[number] | 'UNAVAILABLE';

interface ReferenceRule {
  scope_type: PriceScopeType;
  statistic: 'MEDIAN' | 'MEAN';
  price_basis: EnergyPriceBasis;
  /** Cómo se presenta: una referencia, nunca "tu precio". */
  label: string;
}

export const ENERGY_MARKET_RULES = {
  version: 'energy-market-v1',
  /** Antigüedad (días naturales) del dato respecto a la fecha pedida. */
  freshness: { current_max_age_days: 2, recent_max_age_days: 7 },
  /** Más antiguo que esto no se usa (ni como STALE): la referencia queda no disponible. */
  max_lookback_days: 14,
  precedence: ENERGY_PRICE_PRECEDENCE,
  markets: {
    ES: {
      fuel: { scope_type: 'TAX_ZONE', statistic: 'MEDIAN', price_basis: 'RETAIL_PUMP_PRICE', label: 'reference fuel price (median of public stations)' } satisfies ReferenceRule,
      electricity: {
        scope_type: 'TARIFF_ZONE',
        statistic: 'MEAN',
        price_basis: 'PVPC_ENERGY_TERM',
        label: 'reference electricity price (PVPC energy term, daily average; excludes taxes and power term)',
      } satisfies ReferenceRule,
      /** Sin región conocida se usa la zona del mercado continental, y se declara (`MARKET_DEFAULT`). */
      default_zones: { fuel: 'PENINSULA_BALEARES' as EsTaxZone, electricity: 'PENINSULA_CANARIAS_BALEARES' as EsTariffZone },
      /**
       * Fallback metodológico (ESTIMATED) cuando no hay referencia de mercado usable. Vacío en 2026.2: no hay
       * todavía una fuente que justifique valores por defecto → sin dato, el precio queda UNAVAILABLE (nunca inventado).
       */
      fallback_prices: {} as Partial<Record<string, { value: number; unit: 'EUR_PER_L' | 'EUR_PER_KWH'; source: string }>>,
    },
  },
} as const;

export function energyFreshness(ageDays: number, rules = ENERGY_MARKET_RULES): Freshness {
  if (ageDays <= rules.freshness.current_max_age_days) return 'CURRENT';
  if (ageDays <= rules.freshness.recent_max_age_days) return 'RECENT';
  return 'STALE';
}
