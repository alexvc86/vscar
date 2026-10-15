import { z } from 'zod';

/**
 * Step 8b — Nuevo / Usado por participante y hechos de la unidad usada en la URL (contrato `u=1`).
 *
 * La URL sigue siendo la fuente de verdad (Plan §34): la ruta identifica el par de ReferenceVariants; el ESCENARIO
 * (`km`, `trips`…) y los HECHOS DE LA UNIDAD (`a_*`, `b_*`) son bloques separados que nunca se mezclan.
 *
 *   u=1                     versión del contrato (presente si algún lado es usado)
 *   a=used | b=used         condición del lado (ausente = nuevo)
 *   {lado}_price            precio pedido en EUR enteros (askingPrice; nunca valor de mercado)
 *   {lado}_km               kilometraje (vacío ≠ 0)
 *   {lado}_reg              primera matriculación YYYY o YYYY-MM (≠ año modelo)
 *   {lado}_warranty         garantía restante declarada, meses (0 = vencida confirmada; ausente = no lo sé)
 *   {lado}_service          full | partial | none (ausente = no lo sé)
 *   {lado}_state            ok | issues (ausente = sin verificar)
 *   {lado}_soh              salud de batería % (solo BEV/PHEV/EREV; el servidor la ignora si no aplica)
 *   {lado}_damage           none | declared (ausente = no lo sé)
 *   eval                    fecha de evaluación YYYY-MM-DD (los hechos se declararon ese día)
 *
 * Nunca: VIN, matrícula, datos personales, vendedor, URL del anuncio ni texto libre. Un parámetro inválido se
 * descarta (y se informa); nunca produce un 500.
 */
export const USED_URL_VERSION = '1';
export const SIDES = ['a', 'b'] as const;
export type Side = (typeof SIDES)[number];

/** Límites técnicos de entrada (documentados en USED_INPUT_UX_V0_1). */
export const USED_LIMITS = {
  price: { min: 100, max: 2_000_000 },
  km: { min: 0, max: 1_500_000 },
  regYear: { min: 1990 },
  warranty: { min: 0, max: 120 },
  soh: { min: 1, max: 100 },
} as const;

export const SERVICE_VALUES = ['full', 'partial', 'none'] as const;
export const STATE_VALUES = ['ok', 'issues'] as const;
export const DAMAGE_VALUES = ['none', 'declared'] as const;

const intIn = (r: { min: number; max?: number }) => {
  const base = z.number().int().min(r.min);
  return r.max === undefined ? base : base.max(r.max);
};

export const UsedFacts = z
  .object({
    price: intIn(USED_LIMITS.price).optional(),
    km: intIn(USED_LIMITS.km).optional(),
    reg: z.object({ year: z.number().int().min(USED_LIMITS.regYear.min), month: z.number().int().min(1).max(12).optional() }).strict().optional(),
    warranty: intIn(USED_LIMITS.warranty).optional(),
    service: z.enum(SERVICE_VALUES).optional(),
    state: z.enum(STATE_VALUES).optional(),
    soh: intIn(USED_LIMITS.soh).optional(),
    damage: z.enum(DAMAGE_VALUES).optional(),
  })
  .strict();
export type UsedFacts = z.infer<typeof UsedFacts>;

export const FACT_KEYS = ['price', 'km', 'reg', 'warranty', 'service', 'state', 'soh', 'damage'] as const satisfies readonly (keyof UsedFacts)[];
export type FactKey = (typeof FACT_KEYS)[number];

export type SideCondition = { condition: 'new' } | { condition: 'used'; facts: UsedFacts };
export interface PairConditions {
  a: SideCondition;
  b: SideCondition;
  /** Solo con algún usado. */
  evaluationDate?: string;
}

export const NEW: SideCondition = { condition: 'new' };
export const ALL_NEW: PairConditions = { a: NEW, b: NEW };

const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;
const REG = /^(\d{4})(?:-(\d{2}))?$/;
const INT = /^\d{1,9}$/;

type ParamsLike = URLSearchParams | Record<string, string | string[] | undefined>;
function read(params: ParamsLike, key: string): string | undefined {
  if (params instanceof URLSearchParams) return params.get(key) ?? undefined;
  const v = params[key];
  return Array.isArray(v) ? v[0] : v;
}

export const hasUsed = (p: PairConditions) => p.a.condition === 'used' || p.b.condition === 'used';

/** Fecha válida (calendario real) y no posterior a `today`. */
function validDate(s: string | undefined, today: string): s is string {
  if (!s) return false;
  const m = ISO_DATE.exec(s);
  if (!m) return false;
  const d = new Date(`${s}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === s && s <= today;
}

/** Un hecho de la URL → valor validado (o `undefined` si es inválido). */
function parseFact(key: FactKey, raw: string, evaluationDate: string): UsedFacts[FactKey] | undefined {
  const v = raw.trim();
  if (key === 'reg') {
    const m = REG.exec(v);
    if (!m) return undefined;
    const year = Number(m[1]);
    const month = m[2] ? Number(m[2]) : undefined;
    const r = UsedFacts.shape.reg.safeParse({ year, ...(month !== undefined ? { month } : {}) });
    if (!r.success) return undefined;
    // Nunca posterior a la fecha de evaluación (matriculación futura = dato incoherente).
    const evY = Number(evaluationDate.slice(0, 4));
    const evM = Number(evaluationDate.slice(5, 7));
    if (year > evY || (year === evY && month !== undefined && month > evM)) return undefined;
    return r.data;
  }
  if (key === 'service' || key === 'state' || key === 'damage') {
    const r = UsedFacts.shape[key].safeParse(v);
    return r.success ? r.data : undefined;
  }
  if (!INT.test(v)) return undefined;
  const r = UsedFacts.shape[key].safeParse(Number(v));
  return r.success ? r.data : undefined;
}

/**
 * URL → condición de cada lado + hechos de la unidad. `today` = fecha del mercado (la pasa el llamador: el dominio
 * no lee el reloj). Sin `eval` válida con algún usado → `today`. Determinista para una URL y un `today` dados.
 */
export function parsePairConditions(params: ParamsLike, today: string): { pair: PairConditions; invalid: string[] } {
  const invalid: string[] = [];
  const version = read(params, 'u');
  const versionOk = version === undefined || version === USED_URL_VERSION;
  if (!versionOk) invalid.push('u');
  const rawEval = read(params, 'eval');
  const evaluationDate = validDate(rawEval, today) ? rawEval : today;
  if (rawEval !== undefined && evaluationDate !== rawEval) invalid.push('eval');

  const side = (s: Side): SideCondition => {
    const cond = read(params, s);
    const used = versionOk && cond === 'used';
    if (cond !== undefined && cond !== 'used' && cond !== 'new') invalid.push(s);
    const facts: Record<string, unknown> = {};
    for (const key of FACT_KEYS) {
      const raw = read(params, `${s}_${key}`);
      if (raw === undefined || raw === '') continue;
      // Hechos de un lado que no es usado: no aplican → se ignoran (y se informa).
      if (!used) {
        invalid.push(`${s}_${key}`);
        continue;
      }
      const value = parseFact(key, raw, evaluationDate);
      if (value === undefined) invalid.push(`${s}_${key}`);
      else facts[key] = value;
    }
    return used ? { condition: 'used', facts: UsedFacts.parse(facts) } : NEW;
  };
  const pair: PairConditions = { a: side('a'), b: side('b') };
  return { pair: hasUsed(pair) ? { ...pair, evaluationDate } : pair, invalid };
}

const factString = (key: FactKey, f: UsedFacts): string | undefined => {
  const v = f[key];
  if (v === undefined) return undefined;
  if (key === 'reg') {
    const r = v as NonNullable<UsedFacts['reg']>;
    return r.month ? `${r.year}-${String(r.month).padStart(2, '0')}` : String(r.year);
  }
  return String(v);
};

/** Bloque usado → pares clave/valor en orden fijo (determinista). Vacío si los dos lados son nuevos. */
export function usedEntries(p: PairConditions): [string, string][] {
  if (!hasUsed(p)) return [];
  const out: [string, string][] = [['u', USED_URL_VERSION]];
  for (const s of SIDES) {
    const c = p[s];
    if (c.condition !== 'used') continue;
    out.push([s, 'used']);
    for (const key of FACT_KEYS) {
      const v = factString(key, c.facts);
      if (v !== undefined) out.push([`${s}_${key}`, v]);
    }
  }
  if (p.evaluationDate) out.push(['eval', p.evaluationDate]);
  return out;
}

/** Query del bloque usado sin `?` ("" si no hay usados). */
export function serializePairConditions(p: PairConditions): string {
  return new URLSearchParams(usedEntries(p)).toString();
}

/** Une la query del escenario (`?km=…` o "") con el bloque usado. El escenario va primero. */
export function joinQuery(scenarioQuery: string, p: PairConditions): string {
  const used = serializePairConditions(p);
  if (!used) return scenarioQuery;
  return scenarioQuery ? `${scenarioQuery}&${used}` : `?${used}`;
}

/** ¿Pertenece esta clave al bloque usado? (para conservarlo al cambiar solo el escenario). */
export const isUsedParam = (key: string) => key === 'u' || key === 'eval' || key === 'a' || key === 'b' || /^[ab]_[a-z]+$/.test(key);

/** Bloque usado de una query arbitraria, tal cual (sin `?`), para reanexarlo tras cambiar el escenario. */
export function usedSearchOf(search: string): string {
  const q = new URLSearchParams(search);
  const kept = [...q.entries()].filter(([k]) => isUsedParam(k));
  return new URLSearchParams(kept).toString();
}

/** Query de escenario (`?…` o "") + el bloque usado de la URL actual (cambio de escenario sin perder la unidad). */
export function appendUsedSearch(scenarioQuery: string, currentSearch: string): string {
  const used = usedSearchOf(currentSearch);
  if (!used) return scenarioQuery;
  return scenarioQuery ? `${scenarioQuery}&${used}` : `?${used}`;
}

/** Query actual con los lados intercambiados (escenario intacto; hechos y condición siguen a su vehículo). */
export function swapSearch(search: string, today: string): string {
  const q = new URLSearchParams(search);
  const { pair } = parsePairConditions(q, today);
  const scenario = [...q.entries()].filter(([k]) => !isUsedParam(k));
  const head = new URLSearchParams(scenario).toString();
  return joinQuery(head ? `?${head}` : '', swapPair(pair));
}

/** Intercambio A/B: la condición y TODOS los hechos viajan con su vehículo. */
export function swapPair(p: PairConditions): PairConditions {
  return { a: p.b, b: p.a, ...(p.evaluationDate ? { evaluationDate: p.evaluationDate } : {}) };
}

/**
 * Cambio de vehículo en un lado: los hechos de la unidad ANTERIOR nunca se reutilizan. El otro lado y la fecha de
 * evaluación se conservan; si ya no queda ningún usado, el bloque desaparece.
 */
export function withSide(p: PairConditions, side: Side, next: SideCondition, today: string): PairConditions {
  const pair: PairConditions = { a: side === 'a' ? next : p.a, b: side === 'b' ? next : p.b };
  return hasUsed(pair) ? { ...pair, evaluationDate: p.evaluationDate ?? today } : pair;
}

/** Clave estable del bloque usado (cachés del servidor y `key` de React). */
export function pairConditionsKey(p: PairConditions): string {
  return serializePairConditions(p) || 'new';
}

const PLUGIN = new Set(['BEV', 'PHEV', 'EREV']);
/** ¿Aplica la salud de batería a este powertrain? (misma regla que `used-adjustment-v1`). */
export const sohApplies = (powertrain: string) => PLUGIN.has(powertrain);

/** Fecha de hoy en la zona horaria del mercado (YYYY-MM-DD). Solo para llamadores con reloj (servidor / UI). */
export function todayIn(timeZone: string, now: Date = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(now);
}
