import { z } from 'zod';
import { IsoDate, MarketCode, SourceAuthority, Uuid } from './enums.ts';

/**
 * Datos de mercado de energía normalizados (Step 4e/4f). Contrato único entre adapters (productores),
 * `@vscar/db` (persistencia) y `@vscar/market-context` (consumidor). Los engines nunca ven la fuente:
 * reciben estos valores ya agregados, con procedencia.
 *
 * Solo hechos observados. Supuestos (p. ej. % de carga en casa, tarifa del usuario) viven en
 * `@vscar/methodology` o en el escenario, nunca aquí.
 */

/** Productos de energía con precio de mercado. */
export const EnergyProduct = z.enum([
  'PETROL_95_E5',
  'PETROL_95_E10',
  'PETROL_98_E5',
  'DIESEL_A',
  'DIESEL_A_PREMIUM',
  'LPG',
  /** Electricidad de referencia (Step 4f). El tipo de precio lo fija `price_basis`. */
  'ELECTRICITY',
]);
export type EnergyProduct = z.infer<typeof EnergyProduct>;
export const FUEL_PRODUCTS = EnergyProduct.options.filter((p) => p !== 'ELECTRICITY') as Exclude<EnergyProduct, 'ELECTRICITY'>[];
export type FuelProduct = Exclude<EnergyProduct, 'ELECTRICITY'>;

/**
 * Qué representa el precio.
 * - `RETAIL_PUMP_PRICE`: precio de venta al público en surtidor (MITECO), impuestos incluidos.
 * - `PVPC_ENERGY_TERM`: término de energía del PVPC 2.0TD (ESIOS). Es una **referencia** regulada, no el precio
 *   del usuario: excluye impuestos (RD 216/2014 art. 7.6) y el término de potencia; muchos hogares están en mercado libre.
 */
export const EnergyPriceBasis = z.enum(['RETAIL_PUMP_PRICE', 'PVPC_ENERGY_TERM']);
export type EnergyPriceBasis = z.infer<typeof EnergyPriceBasis>;

/**
 * Ámbito geográfico del agregado.
 * - `TAX_ZONE`: zonas con régimen fiscal propio para carburantes (ES: Península+Baleares, Canarias, Ceuta, Melilla).
 *   Nunca se mezclan en un agregado: la fiscalidad cambia el precio en ~0,3–0,5 €/L.
 * - `TARIFF_ZONE`: zonas del PVPC (ES: Península+Canarias+Baleares `PCB`, Ceuta+Melilla `CYM`). No coinciden con TAX_ZONE.
 * - `REGION`: ISO 3166-2 (p. ej. `ES-CL`).
 * - `PROVINCE`: código INE de provincia (2 dígitos).
 */
export const PriceScopeType = z.enum(['TAX_ZONE', 'TARIFF_ZONE', 'REGION', 'PROVINCE']);
export type PriceScopeType = z.infer<typeof PriceScopeType>;

export const EsTaxZone = z.enum(['PENINSULA_BALEARES', 'CANARIAS', 'CEUTA', 'MELILLA']);
export type EsTaxZone = z.infer<typeof EsTaxZone>;
export const EsTariffZone = z.enum(['PENINSULA_CANARIAS_BALEARES', 'CEUTA_MELILLA']);
export type EsTariffZone = z.infer<typeof EsTariffZone>;

export const EnergyPriceUnit = z.enum(['EUR_PER_L', 'EUR_PER_KWH']);
export const TaxInclusion = z.enum(['INCLUDED', 'EXCLUDED', 'UNKNOWN']);

/** Cómo se obtiene el valor a partir de las observaciones de la fuente. */
export const AggregationMethod = z.enum([
  /** Mediana sin ponderar de los precios de las estaciones (la fuente no publica volúmenes vendidos). */
  'UNWEIGHTED_STATION_MEDIAN',
  /** Media aritmética de los precios horarios del día local (sin perfil de consumo). */
  'HOURLY_ARITHMETIC_MEAN',
]);

export const PriceDistribution = z.object({
  /** Observaciones que entran en el agregado (estaciones u horas). */
  n: z.number().int().positive(),
  /** Solo para medianas. */
  p25: z.number().finite().optional(),
  p75: z.number().finite().optional(),
  min: z.number().finite(),
  max: z.number().finite(),
  /** Excluidas por no ser de venta al público (p. ej. venta restringida a socios). */
  excluded_restricted: z.number().int().nonnegative(),
  /** Excluidas por precio fuera de los límites de parseo (nunca se corrigen). */
  excluded_implausible: z.number().int().nonnegative(),
});

export const EnergyPriceObservation = z
  .object({
    id: Uuid,
    market_code: MarketCode,
    energy_product: EnergyProduct,
    price_basis: EnergyPriceBasis,
    scope_type: PriceScopeType,
    scope_code: z.string().min(1).max(32),
    /** Día al que se refiere el precio (fecha local de la fuente). */
    price_date: IsoDate,
    /** Marca temporal de la fuente, hora local sin zona (`YYYY-MM-DDTHH:mm:ss`) + `source_timezone`. */
    observed_at: z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$/),
    source_timezone: z.string().min(1),
    statistic: z.enum(['MEDIAN', 'MEAN']),
    value: z.number().positive(),
    unit: EnergyPriceUnit,
    currency: z.string().regex(/^[A-Z]{3}$/),
    taxes: TaxInclusion,
    aggregation_method: AggregationMethod,
    distribution: PriceDistribution,
    /** El agregado es un cálculo (CALCULATED) sobre datos de una autoridad (`derived_from_authority`). */
    source_authority: z.literal(SourceAuthority.enum.CALCULATED),
    derived_from_authority: SourceAuthority,
    source_id: Uuid,
    source_url: z.string().url(),
    /** El publicador califica los datos como provisionales. */
    provisional: z.boolean(),
    retrieved_at: IsoDate,
    raw_ingest_id: Uuid,
    external_field: z.string().min(1),
    adapter_version: z.string().min(1),
    transformation_version: z.number().int().positive(),
  })
  .superRefine((o, ctx) => {
    const issue = (message: string) => ctx.addIssue({ code: 'custom', message });
    const d = o.distribution;
    const electricity = o.energy_product === 'ELECTRICITY';
    if (electricity !== (o.unit === 'EUR_PER_KWH')) issue('ELECTRICITY is priced in EUR_PER_KWH and fuels in EUR_PER_L');
    if (electricity !== (o.price_basis === 'PVPC_ENERGY_TERM')) issue('price_basis does not match the product');
    if (electricity !== (o.scope_type === 'TARIFF_ZONE')) issue('electricity uses TARIFF_ZONE scopes; fuels never do');
    if (!(d.min <= o.value && o.value <= d.max)) issue('distribution must satisfy min ≤ value ≤ max');
    if (o.statistic === 'MEDIAN') {
      if (d.p25 === undefined || d.p75 === undefined || !(d.min <= d.p25 && d.p25 <= o.value && o.value <= d.p75 && d.p75 <= d.max)) {
        issue('a median needs min ≤ p25 ≤ median ≤ p75 ≤ max');
      }
    }
    if (o.observed_at.slice(0, 10) !== o.price_date) issue('observed_at must fall on price_date (source local time)');
  });
export type EnergyPriceObservation = z.infer<typeof EnergyPriceObservation>;
