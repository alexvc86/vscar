import type { FuelProduct, EsTaxZone, PriceScopeType } from '@vscar/vehicle-schema';
import { MITECO_PRICE_BOUNDS_EUR_PER_L, MITECO_PRODUCT_FIELDS, MITECO_REGIONS } from './fields.ts';

/**
 * Normalización MITECO: estaciones → precios por producto → agregados por ámbito.
 * Nada se corrige: lo que no se puede usar se excluye y se cuenta (el bruto conserva todo).
 */
interface StationGeo {
  station_id: string;
  province: string;
  region_iso: string;
  tax_zone: EsTaxZone;
}

export interface StationPrice extends StationGeo {
  product: FuelProduct;
  price: number;
}

/** Precio presente en la fuente pero fuera del agregado (se cuenta en su ámbito). */
export interface ExcludedPrice extends StationGeo {
  product: FuelProduct;
  reason: 'RESTRICTED' | 'IMPLAUSIBLE';
}

export interface MitecoNormalizationIssue {
  kind: 'UNKNOWN_REGION' | 'UNKNOWN_SALE_TYPE' | 'DUPLICATE_STATION' | 'UNPARSEABLE_PRICE' | 'IMPLAUSIBLE_PRICE';
  station_id: string;
  detail: string;
}

export interface NormalizedMitecoSnapshot {
  /** Hora local de la fuente, `YYYY-MM-DDTHH:mm:ss`. */
  observed_at: string;
  stations_total: number;
  stations_public: number;
  prices: StationPrice[];
  excluded: ExcludedPrice[];
  issues: MitecoNormalizationIssue[];
}

/** "20/09/2026 0:00:00" → "2026-09-20T00:00:00". */
export function parseMitecoTimestamp(fecha: string): string {
  const m = /^(\d{2})\/(\d{2})\/(\d{4}) (\d{1,2}):(\d{2}):(\d{2})$/.exec(fecha.trim());
  if (!m) throw new Error(`MITECO: unexpected Fecha format ${JSON.stringify(fecha)}`);
  return `${m[3]}-${m[2]}-${m[1]}T${m[4]!.padStart(2, '0')}:${m[5]}:${m[6]}`;
}

/** "1,529" → 1.529 · "" → null (no vende) · otro → NaN. */
export function parseMitecoPrice(raw: string | undefined): number | null {
  if (raw === undefined || raw.trim() === '') return null;
  return /^\d+(,\d+)?$/.test(raw.trim()) ? Number(raw.trim().replace(',', '.')) : Number.NaN;
}

const PRODUCTS = Object.keys(MITECO_PRODUCT_FIELDS) as FuelProduct[];

export function normalizeMitecoStations(fecha: string, stations: readonly Record<string, string>[]): NormalizedMitecoSnapshot {
  const excluded: ExcludedPrice[] = [];
  const issues: MitecoNormalizationIssue[] = [];
  const prices: StationPrice[] = [];
  const seen = new Set<string>();
  let publicCount = 0;

  for (const s of stations) {
    const station_id = String(s['IDEESS'] ?? '');
    if (seen.has(station_id)) {
      issues.push({ kind: 'DUPLICATE_STATION', station_id, detail: 'station listed twice; first occurrence kept' });
      continue;
    }
    seen.add(station_id);
    const region = MITECO_REGIONS[String(s['IDCCAA'] ?? '')];
    if (!region) {
      issues.push({ kind: 'UNKNOWN_REGION', station_id, detail: `IDCCAA ${JSON.stringify(s['IDCCAA'])}` });
      continue;
    }
    const saleType = String(s['Tipo Venta'] ?? '');
    const isPublic = saleType === 'P';
    if (!isPublic && saleType !== 'R') issues.push({ kind: 'UNKNOWN_SALE_TYPE', station_id, detail: `Tipo Venta ${JSON.stringify(saleType)} treated as not public` });
    if (isPublic) publicCount++;
    const geo: StationGeo = { station_id, province: String(s['IDProvincia'] ?? ''), region_iso: region.iso, tax_zone: region.tax_zone };

    for (const product of PRODUCTS) {
      const price = parseMitecoPrice(s[MITECO_PRODUCT_FIELDS[product]]);
      if (price === null) continue;
      if (!isPublic) {
        excluded.push({ ...geo, product, reason: 'RESTRICTED' });
        continue;
      }
      if (Number.isNaN(price)) {
        excluded.push({ ...geo, product, reason: 'IMPLAUSIBLE' });
        issues.push({ kind: 'UNPARSEABLE_PRICE', station_id, detail: `${product}: ${JSON.stringify(s[MITECO_PRODUCT_FIELDS[product]])}` });
        continue;
      }
      if (price < MITECO_PRICE_BOUNDS_EUR_PER_L.min || price > MITECO_PRICE_BOUNDS_EUR_PER_L.max) {
        excluded.push({ ...geo, product, reason: 'IMPLAUSIBLE' });
        issues.push({ kind: 'IMPLAUSIBLE_PRICE', station_id, detail: `${product}: ${price} EUR/L outside parse bounds` });
        continue;
      }
      prices.push({ ...geo, product, price });
    }
  }
  return { observed_at: parseMitecoTimestamp(fecha), stations_total: stations.length, stations_public: publicCount, prices, excluded, issues };
}

/** Percentil con interpolación lineal (tipo 7) sobre una lista ordenada. */
export function percentile(sorted: readonly number[], q: number): number {
  if (sorted.length === 0) throw new Error('percentile of empty list');
  const h = (sorted.length - 1) * q;
  const lo = Math.floor(h);
  const hi = Math.ceil(h);
  return sorted[lo]! + (h - lo) * (sorted[hi]! - sorted[lo]!);
}

/** Precisión de la fuente: milésimas de euro. */
const round3 = (x: number) => Math.round(x * 1000) / 1000;

export interface PriceAggregate {
  product: FuelProduct;
  scope_type: PriceScopeType;
  scope_code: string;
  median: number;
  p25: number;
  p75: number;
  min: number;
  max: number;
  n: number;
  excluded_restricted: number;
  excluded_implausible: number;
}

const scopesOf = (g: StationGeo): [PriceScopeType, string][] => [
  ['TAX_ZONE', g.tax_zone],
  ['REGION', g.region_iso],
  ...(/^\d{2}$/.test(g.province) ? ([['PROVINCE', g.province]] as [PriceScopeType, string][]) : []),
];

/**
 * Agregados por (producto × ámbito). Los ámbitos nunca cruzan zonas fiscales: una REGION o PROVINCE
 * pertenece a una sola zona, y cada TAX_ZONE se agrega por separado (no existe un "ES" mezclado).
 */
export function aggregateMitecoPrices(prices: readonly StationPrice[], excluded: readonly ExcludedPrice[] = []): PriceAggregate[] {
  type Group = { product: FuelProduct; scope_type: PriceScopeType; scope_code: string; values: number[]; restricted: number; implausible: number };
  const groups = new Map<string, Group>();
  const group = (product: FuelProduct, scope_type: PriceScopeType, scope_code: string): Group => {
    const key = `${product}|${scope_type}|${scope_code}`;
    let g = groups.get(key);
    if (!g) groups.set(key, (g = { product, scope_type, scope_code, values: [], restricted: 0, implausible: 0 }));
    return g;
  };
  for (const p of prices) for (const [t, c] of scopesOf(p)) group(p.product, t, c).values.push(p.price);
  for (const e of excluded) {
    for (const [t, c] of scopesOf(e)) {
      const g = group(e.product, t, c);
      if (e.reason === 'RESTRICTED') g.restricted++;
      else g.implausible++;
    }
  }
  return [...groups.values()]
    .filter((g) => g.values.length > 0)
    .map((g) => {
      const v = [...g.values].sort((a, b) => a - b);
      return {
        product: g.product,
        scope_type: g.scope_type,
        scope_code: g.scope_code,
        median: round3(percentile(v, 0.5)),
        p25: round3(percentile(v, 0.25)),
        p75: round3(percentile(v, 0.75)),
        min: v[0]!,
        max: v[v.length - 1]!,
        n: v.length,
        excluded_restricted: g.restricted,
        excluded_implausible: g.implausible,
      };
    })
    .sort((a, b) => `${a.product}|${a.scope_type}|${a.scope_code}`.localeCompare(`${b.product}|${b.scope_type}|${b.scope_code}`));
}
