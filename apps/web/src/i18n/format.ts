import type { MarketConfig } from './locales.ts';

/**
 * Formato localizado. El locale de formato sale del par idioma × mercado (`AppLocale.formatLocale`);
 * la moneda y las unidades salen del MERCADO, nunca del idioma (ES en inglés sigue en km y €).
 * Los rangos se formatean como intervalo (`formatRange`): nunca punto medio.
 */
export type Range = { min: number; max: number };

type NF = Intl.NumberFormat;
type NumberOpts = Omit<Intl.NumberFormatOptions, 'useGrouping'> & { useGrouping?: boolean | 'always' | 'auto' | 'min2' };

export interface Format {
  locale: string;
  number(n: number, digits?: number): string;
  numberRange(r: Range, digits?: number): string;
  /** Importe en unidades menores (céntimos). */
  moneyMinor(minor: number, digits?: number): string;
  moneyMinorRange(r: Range, digits?: number): string;
  /** Importe en unidades mayores (€/kWh, €/100 km…). */
  money(major: number, digits?: number): string;
  moneyRange(r: Range, digits?: number): string;
  percent(fraction: number): string;
  date(iso: string): string;
  /** Valor con unidad técnica del engine (`km`, `kW`, `kWh/100 km`, `EUR_MINOR`…). */
  value(v: number | string | boolean | undefined, unit: string | null | undefined, digits?: number): string | undefined;
  valueRange(r: { min: number | string | boolean; max: number | string | boolean } | undefined, unit: string | null | undefined, digits?: number): string | undefined;
}

const cache = new Map<string, NF>();
function nf(locale: string, opts: NumberOpts): NF {
  const key = `${locale}|${JSON.stringify(opts)}`;
  let f = cache.get(key);
  if (!f) {
    f = new Intl.NumberFormat(locale, opts as unknown as Intl.NumberFormatOptions) as NF;
    cache.set(key, f);
  }
  return f;
}

const DASH = '–';

/** Intervalo con raya (–) sin espacios en todos los idiomas: «3,22–3,58» / «3.22–3.58». */
function fmtRange(f: NF, r: Range): string {
  const lo = Math.min(r.min, r.max);
  const hi = Math.max(r.min, r.max);
  return lo === hi ? f.format(lo) : `${f.format(lo)}${DASH}${f.format(hi)}`;
}

/**
 * Intervalo monetario respetando la posición del símbolo del locale:
 * es-ES «23,96–123,68 €» (símbolo al final, una vez) · en-GB «€23.96–€123.68» (símbolo delante de cada cifra).
 */
function fmtMoneyRange(cur: NF, num: NF, r: Range): string {
  const lo = Math.min(r.min, r.max);
  const hi = Math.max(r.min, r.max);
  if (lo === hi) return cur.format(lo);
  const parts = cur.formatToParts(1);
  const currencyIdx = parts.findIndex((p) => p.type === 'currency');
  const integerIdx = parts.findIndex((p) => p.type === 'integer');
  if (currencyIdx > integerIdx) {
    const suffix = parts.slice(parts.findIndex((p, i) => i > integerIdx && (p.type === 'literal' || p.type === 'currency'))).map((p) => p.value).join('');
    return `${num.format(lo)}${DASH}${num.format(hi)}${suffix}`;
  }
  return `${cur.format(lo)}${DASH}${cur.format(hi)}`;
}

/** Decimales por defecto según la magnitud (cifras de consumo con 1, autonomía y kW enteros). */
function defaultDigits(unit: string | null | undefined): number {
  if (!unit) return 1;
  if (/kwh\/100|l\/100/i.test(unit)) return 1;
  if (unit === 's') return 1;
  return 0;
}

export function createFormat(locale: string, market: Pick<MarketConfig, 'currency' | 'timeZone'>, labels: { yes: string; no: string }): Format {
  const num = (digits: number) => nf(locale, { maximumFractionDigits: digits, minimumFractionDigits: 0, useGrouping: 'always' });
  const fixed = (digits: number) => nf(locale, { maximumFractionDigits: digits, minimumFractionDigits: digits, useGrouping: 'always' });
  const cur = (digits: number) => nf(locale, { style: 'currency', currency: market.currency, maximumFractionDigits: digits, minimumFractionDigits: digits, useGrouping: 'always' });

  const self: Format = {
    locale,
    number: (n, digits = 0) => num(digits).format(n),
    numberRange: (r, digits = 0) => fmtRange(num(digits), r),
    moneyMinor: (minor, digits = 2) => cur(digits).format(minor / 100),
    moneyMinorRange: (r, digits = 2) => fmtMoneyRange(cur(digits), fixed(digits), { min: r.min / 100, max: r.max / 100 }),
    money: (major, digits = 2) => cur(digits).format(major),
    moneyRange: (r, digits = 2) => fmtMoneyRange(cur(digits), fixed(digits), r),
    percent: (fraction) => nf(locale, { style: 'percent', maximumFractionDigits: 0 }).format(fraction),
    date: (iso) => new Intl.DateTimeFormat(locale, { dateStyle: 'long', timeZone: market.timeZone }).format(new Date(`${iso}T12:00:00Z`)),
    value(v, unit, digits) {
      if (v === undefined) return undefined;
      if (typeof v === 'boolean') return v ? labels.yes : labels.no;
      if (typeof v === 'string') return v;
      return self.valueRange({ min: v, max: v }, unit, digits);
    },
    valueRange(r, unit, digits) {
      if (!r) return undefined;
      if (typeof r.min !== 'number' || typeof r.max !== 'number') return self.value(r.min, unit, digits);
      const range = { min: r.min, max: r.max };
      if (unit === 'EUR_MINOR') return self.moneyMinorRange(range, digits ?? 0);
      if (unit === 'EUR_PER_100KM') return `${self.moneyRange(range, digits ?? 2)}/100 km`;
      const d = digits ?? defaultDigits(unit);
      const n = fmtRange(num(d), range);
      return unit ? `${n} ${unit}` : n;
    },
  };
  return self;
}
