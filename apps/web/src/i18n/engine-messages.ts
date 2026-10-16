import type { Message } from '@vscar/decision-engine';
import type { Format } from './format.ts';

/**
 * translateDecisionMessage — ÚNICA utilidad que convierte un mensaje de engine (Decision / Comparison) en
 * texto localizado (Step 7a.1). Responsabilidades:
 *   1. buscar `engine.{messageKey}` en el catálogo del idioma;
 *   2. FORMATEAR los params según convenciones de datos (no interpretar semántica):
 *      `xMin`/`xMax` → rango con la unidad del mensaje · `xMinMinor`/`xMaxMinor` → importe del mercado ·
 *      enums (`metric`, `criterion`, `level`, `priority`, `category`, `status`, `unit`) → etiquetas del catálogo;
 *   3. `details` → entre paréntesis, separados por «; »;
 *   4. respaldo (`text`, inglés) SOLO si la clave no existe en el catálogo.
 * La UI nunca construye frases a partir de tipos de resultado: si falta semántica, falta en el engine.
 */
export interface Translator {
  (key: string, values?: Record<string, string | number | Date>): string;
  has(key: string): boolean;
  raw?(key: string): unknown;
}

/** Argumentos que referencia una plantilla ICU (`{name}`, `{name, select …}`, `{name, plural …}`). */
function templateArgs(raw: unknown): string[] {
  return typeof raw === 'string' ? [...new Set([...raw.matchAll(/\{\s*([A-Za-z][A-Za-z0-9_]*)\s*[,}]/g)].map((m) => m[1]!))] : [];
}

const DIFFERENCE_LEVELS = new Set(['TIE', 'SLIGHT', 'MEANINGFUL', 'CLEAR', 'RANGE_DEPENDENT']);
const CONFIDENCE_LEVELS = new Set(['HIGH', 'MEDIUM', 'LOW']);
/** Params enum → espacio de etiquetas del catálogo. */
const ENUM_NS: Record<string, string> = {
  criterion: 'engine.criterion',
  priority: 'engine.priority',
  category: 'engine.category',
  status: 'engine.status',
  reason: 'engine.capReason',
  component: 'engine.component',
  code: 'engine.notComparableCode',
};
const LEVEL_PARAMS = new Set(['level', 'forYouLevel', 'generalLevel', 'forYou']);
/** Params numéricos que se presentan como distancia en km (dato del mercado ES: km). */
const KM_PARAMS = new Set(['dailyKm', 'smallestRangeKm']);
/** Params de recuento: se pasan como número para el plural ICU. */
const COUNT_PARAMS = new Set(['count', 'total', 'notAvailable', 'failed', 'horizonYears', 'longTripsPerYear', 'minLongTrips', 'maxLongTrips', 'familySize']);

export function metricLabel(t: Translator, metric: string, fallback?: string): string {
  const key = `technical.metrics.${metric.replace(/\./g, '_')}`;
  return t.has(key) ? t(key) : (fallback ?? metric);
}

function enumLabel(t: Translator, ns: string, v: unknown): string {
  const key = `${ns}.${String(v)}`;
  return t.has(key) ? t(key) : String(v);
}

function levelLabel(t: Translator, v: unknown): string {
  const s = String(v);
  if (DIFFERENCE_LEVELS.has(s)) return enumLabel(t, 'metricLayers.level', s);
  if (CONFIDENCE_LEVELS.has(s)) return enumLabel(t, 'engine.level', s);
  return s;
}

/** Unidad de un mensaje → texto de unidad del mercado (las de dinero se formatean aparte). */
function unitLabel(t: Translator, unit: string | undefined): string {
  if (!unit) return '';
  return t.has(`engine.unit.${unit.replace(/[^a-zA-Z0-9]/g, '_')}`) ? t(`engine.unit.${unit.replace(/[^a-zA-Z0-9]/g, '_')}`) : unit;
}

function amount(f: Format, unit: string | undefined, r: { min: number; max: number }, t: Translator): string {
  if (unit === 'EUR_MINOR') return f.moneyMinorRange(r, 0);
  if (unit === 'EUR' || unit === '€') return f.moneyRange(r, 0);
  if (unit === 'EUR_PER_100KM') return `${f.moneyRange(r)}/100 km`;
  const digits = unit && /\/100|^s$/.test(unit) ? 1 : 0;
  const n = f.numberRange(r, digits);
  const u = unitLabel(t, unit);
  return u ? `${n} ${u}` : n;
}

const ROBUSTNESS_UNIT: Record<string, (f: Format, v: number, t: Translator) => string> = {
  annual_km: (f, v, t) => t('units.kmPerYear', { value: f.number(v) }),
  fuel_price: (f, v) => `${f.money(v, 3)}/L`,
  electricity_price: (f, v) => `${f.money(v, 3)}/kWh`,
  home_charging_share: (f, v) => f.percent(v),
  horizon_years: (f, v, t) => t('scenario.unitsYear', { value: v }),
};

/** Params formateados para la plantilla ICU. Solo formato y etiquetas de enums: ninguna frase. */
/** Params con nombres propios de vehículo (Step 8c: se pueden presentar con un alias de UI). */
const NAME_PARAMS = new Set(['subject', 'other', 'a', 'b', 'name']);

export function formatParams(msg: Message, t: Translator, f: Format, aliases?: Readonly<Record<string, string>>): Record<string, string | number> {
  const p = msg.params as Record<string, string | number | boolean | undefined>;
  const out: Record<string, string | number> = {};
  const unit = typeof p.unit === 'string' ? p.unit : undefined;
  const consumed = new Set<string>();

  // Rangos: importes en unidades menores y rangos con la unidad del mensaje.
  for (const k of Object.keys(p)) {
    const minor = /^(.*)MinMinor$/.exec(k);
    if (minor && typeof p[k] === 'number' && typeof p[`${minor[1]}MaxMinor`] === 'number') {
      out[minor[1]!] = f.moneyMinorRange({ min: p[k] as number, max: p[`${minor[1]}MaxMinor`] as number });
      consumed.add(k).add(`${minor[1]}MaxMinor`);
      continue;
    }
    const range = /^(.*)Min$/.exec(k);
    if (range && typeof p[k] === 'number' && typeof p[`${range[1]}Max`] === 'number') {
      out[range[1]!] = amount(f, unit, { min: p[k] as number, max: p[`${range[1]}Max`] as number }, t);
      consumed.add(k).add(`${range[1]}Max`);
    }
  }
  for (const [k, v] of Object.entries(p)) {
    if (v === undefined || consumed.has(k)) continue;
    if (typeof v === 'boolean') out[k] = v ? 'yes' : 'no';
    else if (NAME_PARAMS.has(k) && typeof v === 'string' && aliases?.[v]) out[k] = aliases[v]!;
    else if (k === 'metric') out[k] = metricLabel(t, String(v));
    else if (LEVEL_PARAMS.has(k)) out[k] = levelLabel(t, v);
    else if (ENUM_NS[k]) out[k] = enumLabel(t, ENUM_NS[k], v);
    else if (k === 'unit') out[k] = unitLabel(t, String(v));
    else if ((k === 'required' || k === 'gap') && typeof v === 'number') out[k] = amount(f, unit, { min: v, max: v }, t);
    else if (k === 'annualKm' && typeof v === 'number') out[k] = t('units.kmPerYear', { value: f.number(v) });
    else if (KM_PARAMS.has(k) && typeof v === 'number') out[k] = `${f.number(v)} km`;
    else if (k === 'coverage' && typeof v === 'number') out[k] = f.percent(v);
    // Step 8a: un año es un dato, no una cantidad (sin separador de miles).
    else if (/Year(Assumed)?$/.test(k) && typeof v === 'number') out[k] = String(v);
    else if ((k === 'switchValue' || k === 'currentValue') && typeof v === 'number') {
      const fmt = ROBUSTNESS_UNIT[String(p.variable)];
      out[k] = fmt ? fmt(f, v, t) : f.number(v, 3);
    } else if (COUNT_PARAMS.has(k) && typeof v === 'number') out[k] = v;
    else if (typeof v === 'number') out[k] = f.number(v, 2);
    else out[k] = v;
  }
  // Variables ICU `select` siempre presentes (evitan errores de formato si un opcional falta).
  for (const sel of ['hasKm', 'hasForYou', 'hasAnnual', 'hasGeneral', 'hasObserved', 'hasCycles', 'hasDelta']) out[sel] ??= 'no';
  if (p.annualKm !== undefined) out.hasKm = 'yes';
  if (p.forYou !== undefined || p.forYouLevel !== undefined) out.hasForYou = 'yes';
  if (p.annualMinMinor !== undefined) out.hasAnnual = 'yes';
  if (p.generalLevel !== undefined) out.hasGeneral = 'yes';
  if (p.observedMin !== undefined) out.hasObserved = 'yes';
  if (p.cycleSubject !== undefined || p.cycleA !== undefined) out.hasCycles = 'yes';
  if (p.deltaMin !== undefined) out.hasDelta = 'yes';
  return out;
}

export interface Rendered {
  text: string;
  /** false = se usó el respaldo inglés del engine (clave ausente en el catálogo). */
  fromCatalog: boolean;
}

/**
 * `aliases` (Step 8c): nombre del engine → nombre de presentación (p. ej. "Volkswagen Golf B" → "Volkswagen Golf usado"
 * cuando los dos lados son la misma variant). Solo cambia CÓMO se muestra un nombre propio; nunca la semántica.
 */
export function translateDecisionMessage(msg: Message, t: Translator, f: Format, opts: { inlineDetails?: boolean; aliases?: Readonly<Record<string, string>> } = {}): Rendered {
  const key = `engine.${msg.messageKey}`;
  let text: string;
  let fromCatalog = true;
  if (t.has(key)) {
    try {
      const values = formatParams(msg, t, f, opts.aliases);
      // Un opcional ausente nunca rompe la frase: los argumentos referenciados y no presentes van vacíos.
      for (const a of templateArgs(t.raw?.(key))) values[a] ??= '';
      text = t(key, values);
    } catch {
      text = msg.text;
      fromCatalog = false;
    }
  } else {
    text = msg.text;
    fromCatalog = false;
  }
  if (msg.details?.length && opts.inlineDetails !== false) {
    const inner = msg.details.map((d) => translateDecisionMessage(d, t, f, opts.aliases ? { aliases: opts.aliases } : {}));
    if (inner.some((d) => !d.fromCatalog)) fromCatalog = false;
    text = `${text} (${inner.map((d) => d.text).join('; ')})`;
  }
  return { text, fromCatalog };
}

/** Atajo: solo el texto (con `details` en línea). */
export function renderEngineMessage(msg: Message, t: Translator, f: Format, opts: { inlineDetails?: boolean; aliases?: Readonly<Record<string, string>> } = {}): string {
  return translateDecisionMessage(msg, t, f, opts).text;
}
