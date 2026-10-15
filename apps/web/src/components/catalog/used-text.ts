import type { UsedFacts } from '@/domain/used-params';
import { fill, type UsedLabels } from './labels';

/**
 * Resumen legible de los hechos declarados de una unidad usada (revisión del selector, hueco de la home y hero).
 * Solo formato: el idioma decide la puntuación y los nombres de mes; el MERCADO decide las unidades (EUR, km).
 */
export interface UsedFactLine {
  key: 'price' | 'km' | 'reg' | 'warranty' | 'service' | 'state' | 'soh' | 'damage';
  label: string;
  value: string;
  provided: boolean;
}

export function usedFactLines(f: UsedFacts, labels: UsedLabels, formatLocale: string, opts: { sohApplies: boolean; only?: UsedFactLine['key'][] }): UsedFactLine[] {
  const L = labels.form;
  const none = labels.review.notProvided;
  const money = new Intl.NumberFormat(formatLocale, { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 });
  const num = new Intl.NumberFormat(formatLocale, { maximumFractionDigits: 0 });
  const reg = f.reg
    ? f.reg.month
      ? new Intl.DateTimeFormat(formatLocale, { month: 'long', year: 'numeric', timeZone: 'UTC' }).format(new Date(Date.UTC(f.reg.year, f.reg.month - 1, 1)))
      : String(f.reg.year)
    : undefined;
  const months = (n: number) => fill(n === 1 ? labels.review.monthsOne : labels.review.monthsOther, { count: num.format(n) });
  const lines: UsedFactLine[] = [
    { key: 'price', label: L.price, value: f.price !== undefined ? money.format(f.price) : none, provided: f.price !== undefined },
    { key: 'km', label: L.km, value: f.km !== undefined ? `${num.format(f.km)} km` : none, provided: f.km !== undefined },
    { key: 'reg', label: L.reg, value: reg ? reg.charAt(0).toUpperCase() + reg.slice(1) : none, provided: !!reg },
    { key: 'warranty', label: L.warranty, value: f.warranty !== undefined ? months(f.warranty) : L.warrantyUnknown, provided: f.warranty !== undefined },
    { key: 'service', label: L.service, value: L.serviceOptions[f.service ?? 'unknown'], provided: !!f.service },
    { key: 'state', label: L.state, value: L.stateOptions[f.state ?? 'unknown'], provided: !!f.state },
    ...(opts.sohApplies ? [{ key: 'soh' as const, label: L.soh, value: f.soh !== undefined ? `${num.format(f.soh)} %` : L.sohUnknown, provided: f.soh !== undefined }] : []),
    { key: 'damage', label: L.damage, value: L.damageOptions[f.damage ?? 'unknown'], provided: !!f.damage },
  ];
  return opts.only ? lines.filter((l) => opts.only!.includes(l.key)) : lines;
}
