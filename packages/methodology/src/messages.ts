/**
 * Decision Message Contract (Step 7a.1). Toda explicación que un engine entrega a la UI es un `Message`:
 *   - `messageKey`: semántica estable (la UI la traduce con su catálogo).
 *   - `params`: DATOS primitivos (números crudos, rangos como `xMin`/`xMax`, códigos de unidad, enums, ids,
 *     nombres propios de vehículo). Nunca frases, nunca números formateados, nunca nombres localizados.
 *   - `details`: mensajes subordinados (p. ej. por qué la confianza de datos es baja).
 *   - `text`: respaldo en inglés para debug, logs, CLI y protección ante traducción ausente. NO es la fuente
 *     de la UI.
 * Los engines son puros y agnósticos de locale: no importan i18n ni formatean números.
 */
export type MessageParamValue = string | number | boolean;
export type MessageParams = Readonly<Record<string, MessageParamValue | undefined>>;

export interface Message {
  messageKey: string;
  params: MessageParams;
  /** Respaldo inglés (debug / missing translation). No es el contrato. */
  text: string;
  details?: readonly Message[];
}

export type MessageTemplates = Readonly<Record<string, (p: MessageParams) => string>>;

/**
 * Crea el constructor de mensajes de un engine a partir de sus plantillas inglesas de respaldo.
 * Una clave sin plantilla es un error de programación (lanza).
 */
export function createMessageFactory(templates: MessageTemplates) {
  return function message(messageKey: string, params: MessageParams = {}, details?: readonly Message[]): Message {
    const tpl = templates[messageKey];
    if (!tpl) throw new Error(`unknown message key ${messageKey}`);
    const clean = Object.fromEntries(Object.entries(params).filter(([, v]) => v !== undefined)) as MessageParams;
    return { messageKey, params: clean, text: tpl(clean), ...(details && details.length ? { details } : {}) };
  };
}

// ------------------------------------------------------------------------------------------ fallback helpers

/** Formato inglés SOLO para el texto de respaldo (`text`). La UI formatea con su locale. */
export const fallbackNumber = (x: unknown, digits = 2) => Number(x).toLocaleString('en-US', { maximumFractionDigits: digits });
export const fallbackRange = (p: MessageParams, base: string, digits = 2) => {
  const lo = p[`${base}Min`];
  const hi = p[`${base}Max`];
  if (lo === undefined) return String(p[base] ?? '?');
  return lo === hi || hi === undefined ? fallbackNumber(lo, digits) : `${fallbackNumber(lo, digits)}–${fallbackNumber(hi, digits)}`;
};
export const fallbackEur = (minor: unknown) => `€${(Number(minor) / 100).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
export const fallbackEurRange = (p: MessageParams, base = 'amount') =>
  p[`${base}MinMinor`] === p[`${base}MaxMinor`] ? fallbackEur(p[`${base}MinMinor`]) : `${fallbackEur(p[`${base}MinMinor`])}–${fallbackEur(p[`${base}MaxMinor`])}`;

/** Etiquetas inglesas de criterios de requisito (solo respaldo). */
export const CRITERION_FALLBACK: Readonly<Record<string, { label: string; unit: string; op: 'min' | 'max' }>> = {
  minSeats: { label: 'seat count', unit: 'seats', op: 'min' },
  minBootL: { label: 'boot volume', unit: 'L', op: 'min' },
  minTowingKg: { label: 'towing capacity', unit: 'kg', op: 'min' },
  maxLengthMm: { label: 'length', unit: 'mm', op: 'max' },
  maxWidthMm: { label: 'width (without mirrors)', unit: 'mm', op: 'max' },
  maxHeightMm: { label: 'height', unit: 'mm', op: 'max' },
  minElectricRangeKm: { label: 'electric range', unit: 'km', op: 'min' },
  maxPurchasePriceEur: { label: 'purchase price', unit: 'EUR', op: 'max' },
  // Step 8a: requisitos de la unidad usada (solo aplican a sujetos USED_INSTANCE).
  maxMileageKm: { label: 'mileage', unit: 'km', op: 'max' },
  maxAgeYears: { label: 'age', unit: 'years', op: 'max' },
  minBatteryHealthPct: { label: 'battery health', unit: '%', op: 'min' },
  minWarrantyRemainingMonths: { label: 'remaining warranty', unit: 'months', op: 'min' },
  // Step 8b: requisito categórico (bandera); los mensajes llevan `flag: true`.
  mustHaveFullServiceHistory: { label: 'full service history', unit: '', op: 'min' },
};

export const capitalize = (x: string) => (x ? x[0]!.toUpperCase() + x.slice(1) : x);

/** Verifica el contrato de params: solo primitivos y ningún número formateado como texto. */
export function isStructuredParamValue(v: unknown): boolean {
  if (typeof v === 'number') return Number.isFinite(v);
  if (typeof v === 'boolean') return true;
  if (typeof v !== 'string') return false;
  // Sin cifras con separador de miles/decimal localizado, sin símbolos de moneda, sin frases largas.
  return !/\d[.,]\d{3}\b|€|\$|£/.test(v) && v.split(/\s+/).length <= 6;
}
