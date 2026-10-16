import { z } from 'zod';
import type { HomologationPowertrain } from '@vscar/vehicle-schema';
import { fuelTypeOf, homologationPowertrainOf, normalizeTan } from './normalize.ts';
import type { ResolvedEeaDataset } from './resolver.ts';

/**
 * Step D1 — encuesta EEA para curación (no es un import: no genera SpecValues ni escribe en MySQL).
 *
 * Schema drift verificado en discodata el 2026-10-16 (ver EEA_IDAE_SCHEMA_MAPPING_V0_1):
 * - Granularidad: 2010–2017 filas agregadas por versión (`R` > 1); desde 2018 una fila por matriculación (`R` = 1,
 *   ~1 M filas/año solo en ES) → la agregación SIEMPRE se hace en servidor.
 * - CO₂: 2010–2016 en `E (g/km)` (NEDC); `Enedc (g/km)` y `Ewltp (g/km)` desde 2017–2018. El adapter de Step 4b/4c
 *   no lee `E (g/km)` → propuesta de mapeo v3 para D2 (aquí solo se lee para la encuesta).
 * - `Cn` sin marca hasta 2021 ("GOLF") y con marca desde 2022–2024 ("TOYOTA COROLLA") → filtro por "contiene".
 * - `Ft` en mayúsculas o minúsculas según el año; `Ech` y `RLFI` solo desde 2023; `T` (Type) en todas las tablas.
 */

/** Columnas de la encuesta (whitelist). `T` y `E (g/km)` no están en la consulta del adapter v0.2. */
export const EEA_SURVEY_GROUP_COLUMNS = [
  'MS',
  'Year',
  'Status',
  'TAN',
  'T',
  'Va',
  'Ve',
  'Mk',
  'Cn',
  'Ft',
  'Fm',
  'Ec (cm3)',
  'Ep (KW)',
  'E (g/km)',
  'Enedc (g/km)',
  'Ewltp (g/km)',
  'Z (Wh/km)',
  'Zr',
  'Fc',
] as const;

/** Columnas de rango (MIN/MAX en servidor): varían por equipamiento dentro de una versión. */
export const EEA_SURVEY_RANGE_COLUMNS = ['M (kg)', 'Mt', 'W (mm)'] as const;

/** Columnas del inventario por tabla (Step D1 §8). */
export const EEA_INVENTORY_COLUMNS = [
  'MS', 'Mp', 'VFN', 'Mh', 'Man', 'MMS', 'TAN', 'T', 'Va', 'Ve', 'Mk', 'Cn', 'Ct', 'Cr', 'M (kg)', 'Mt', 'Enedc (g/km)', 'Ewltp (g/km)',
  'W (mm)', 'At1 (mm)', 'At2 (mm)', 'Ft', 'Fm', 'Ec (cm3)', 'Ep (KW)', 'Z (Wh/km)', 'IT', 'Ernedc (g/km)', 'Erwltp (g/km)', 'De', 'Vf', 'R',
  'Year', 'Status', 'Version_file', 'E (g/km)', 'Er (g/km)', 'Zr', 'Dr', 'Fc', 'Ech', 'RLFI',
] as const;
export const EEA_NUMERIC_INVENTORY = new Set<string>([
  'M (kg)', 'Mt', 'Enedc (g/km)', 'Ewltp (g/km)', 'W (mm)', 'At1 (mm)', 'At2 (mm)', 'Ec (cm3)', 'Ep (KW)', 'Z (Wh/km)', 'Ernedc (g/km)',
  'Erwltp (g/km)', 'De', 'Vf', 'R', 'Year', 'E (g/km)', 'Er (g/km)', 'Zr', 'Fc',
]);
/** Columnas que no existen antes de la tabla 2023 (verificado con `SELECT TOP 1 *`). */
export const EEA_COLUMNS_SINCE_2023 = new Set<string>(['Ech', 'RLFI']);

const lit = (s: string) => `'${s.replace(/'/g, "''")}'`;
const col = (c: string) => (/^[A-Za-z_]+$/.test(c) ? c : `[${c}]`);
const TABLE_RE = /^\[CO2Emission\]\.\[latest\]\.\[co2cars(_\d{4}[FP]v\d+)?\]$/;
const SAFE_TEXT = /^[\p{L}\p{N} .\-/*_+&]{1,40}$/u;

function checkDataset(dataset: Pick<ResolvedEeaDataset, 'year' | 'table' | 'status_filter'>) {
  if (!TABLE_RE.test(dataset.table)) throw new Error(`unsupported EEA table ${dataset.table}`);
  if (!Number.isInteger(dataset.year) || dataset.year < 2010 || dataset.year > 2100) throw new Error('invalid year');
}

function safeText(name: string, value: string): string {
  if (!SAFE_TEXT.test(value)) throw new Error(`unsafe ${name} filter value`);
  return value.toUpperCase();
}

export interface EeaSurveyFilters {
  memberState: string;
  /** Marcas exactas (`Mk`), p. ej. ['CUPRA', 'SEAT']. */
  makes: readonly string[];
  /** `Cn LIKE '%x%'` (OR). Vacío = toda la marca. */
  commercialNameContains: readonly string[];
}

export function buildEeaSurveyQuery(filters: EeaSurveyFilters, dataset: Pick<ResolvedEeaDataset, 'year' | 'table' | 'status_filter'>): string {
  checkDataset(dataset);
  if (!/^[A-Z]{2}$/.test(filters.memberState)) throw new Error('invalid member state');
  if (filters.makes.length === 0 || filters.makes.length > 5) throw new Error('makes: 1..5 required');
  if (filters.commercialNameContains.length > 8) throw new Error('commercialNameContains: at most 8');
  const where = [`Year=${dataset.year}`, `MS=${lit(filters.memberState)}`, `Mk IN (${filters.makes.map((m) => lit(safeText('make', m))).join(',')})`];
  if (dataset.status_filter) where.push(`Status=${lit(dataset.status_filter)}`);
  if (filters.commercialNameContains.length > 0) {
    where.push(`(${filters.commercialNameContains.map((c) => `Cn LIKE ${lit(`%${safeText('commercial name', c)}%`)}`).join(' OR ')})`);
  }
  const groups = EEA_SURVEY_GROUP_COLUMNS.map(col).join(', ');
  const ranges = EEA_SURVEY_RANGE_COLUMNS.map((c) => `MIN(${col(c)}) AS ${col(`${c}_min`)}, MAX(${col(c)}) AS ${col(`${c}_max`)}`).join(', ');
  return `SELECT ${groups}, SUM(CAST(R AS BIGINT)) AS R, COUNT(*) AS source_rows, ${ranges}, MIN(Dr) AS Dr_min, MAX(Dr) AS Dr_max FROM ${dataset.table} WHERE ${where.join(' AND ')} GROUP BY ${groups} ORDER BY TAN, Va, Ve`;
}

/** Inventario de columnas de una tabla para un Estado miembro: nulos, ceros y cardinalidad de identificadores. */
export function buildEeaInventoryQuery(memberState: string, dataset: Pick<ResolvedEeaDataset, 'year' | 'table' | 'status_filter'>): string {
  checkDataset(dataset);
  if (!/^[A-Z]{2}$/.test(memberState)) throw new Error('invalid member state');
  const cols = EEA_INVENTORY_COLUMNS.filter((c) => dataset.year >= 2023 || !EEA_COLUMNS_SINCE_2023.has(c));
  const parts = ['COUNT(*) AS [rows]', 'SUM(CAST(R AS BIGINT)) AS [registrations]'];
  cols.forEach((c, i) => {
    const empty = EEA_NUMERIC_INVENTORY.has(c) ? `${col(c)} IS NULL` : `(${col(c)} IS NULL OR LTRIM(RTRIM(CAST(${col(c)} AS NVARCHAR(200))))='')`;
    parts.push(`SUM(CASE WHEN ${empty} THEN 1 ELSE 0 END) AS [n${i}]`);
    if (EEA_NUMERIC_INVENTORY.has(c)) parts.push(`SUM(CASE WHEN ${col(c)}=0 THEN 1 ELSE 0 END) AS [z${i}]`, `MIN(${col(c)}) AS [lo${i}]`, `MAX(${col(c)}) AS [hi${i}]`);
  });
  for (const c of ['TAN', 'T', 'Va', 'Ve', 'Cn', 'Ft', 'Fm', 'VFN']) parts.push(`COUNT(DISTINCT ${col(c)}) AS [d_${c}]`);
  const where = [`Year=${dataset.year}`, `MS=${lit(memberState)}`];
  if (dataset.status_filter) where.push(`Status=${lit(dataset.status_filter)}`);
  return `SELECT ${parts.join(', ')} FROM ${dataset.table} WHERE ${where.join(' AND ')}`;
}

export interface EeaInventoryRow {
  sourceField: string;
  present: boolean;
  nullRate?: number;
  zeroRate?: number;
  min?: number;
  max?: number;
  distinct?: number;
}

/** Interpreta la fila única del inventario. */
export function parseEeaInventory(memberState: string, dataset: Pick<ResolvedEeaDataset, 'year'>, row: Record<string, unknown>): { rows: number; registrations: number; columns: EeaInventoryRow[] } {
  const rows = Number(row.rows ?? 0);
  const cols = EEA_INVENTORY_COLUMNS.filter((c) => dataset.year >= 2023 || !EEA_COLUMNS_SINCE_2023.has(c));
  const columns: EeaInventoryRow[] = EEA_INVENTORY_COLUMNS.map((c) => {
    const i = cols.indexOf(c as (typeof cols)[number]);
    if (i < 0) return { sourceField: c, present: false };
    const n = Number(row[`n${i}`] ?? 0);
    const out: EeaInventoryRow = { sourceField: c, present: true, nullRate: rows ? n / rows : 0 };
    if (EEA_NUMERIC_INVENTORY.has(c)) {
      out.zeroRate = rows ? Number(row[`z${i}`] ?? 0) / rows : 0;
      if (row[`lo${i}`] !== null && row[`lo${i}`] !== undefined) out.min = Number(row[`lo${i}`]);
      if (row[`hi${i}`] !== null && row[`hi${i}`] !== undefined) out.max = Number(row[`hi${i}`]);
    }
    const d = row[`d_${c}`];
    if (d !== undefined) out.distinct = Number(d);
    return out;
  });
  void memberState;
  return { rows, registrations: Number(row.registrations ?? 0), columns };
}

const num = z.number().nullable().optional();
const str = z.string().nullable().optional();
export const EeaSurveyRow = z
  .object({
    MS: str, Year: num, Status: str, TAN: str, T: str, Va: str, Ve: str, Mk: str, Cn: str, Ft: str, Fm: str,
    'Ec (cm3)': num, 'Ep (KW)': num, 'E (g/km)': num, 'Enedc (g/km)': num, 'Ewltp (g/km)': num, 'Z (Wh/km)': num, Zr: num, Fc: num,
    R: num, source_rows: num,
    'M (kg)_min': num, 'M (kg)_max': num, Mt_min: num, Mt_max: num, 'W (mm)_min': num, 'W (mm)_max': num,
    Dr_min: str, Dr_max: str,
  })
  .passthrough();
export type EeaSurveyRow = z.infer<typeof EeaSurveyRow>;

export type SurveyValueField = 'Ec (cm3)' | 'Ep (KW)' | 'E (g/km)' | 'Enedc (g/km)' | 'Ewltp (g/km)' | 'Z (Wh/km)' | 'Zr' | 'Fc';
export const SURVEY_VALUE_FIELDS: readonly SurveyValueField[] = ['Ec (cm3)', 'Ep (KW)', 'E (g/km)', 'Enedc (g/km)', 'Ewltp (g/km)', 'Z (Wh/km)', 'Zr', 'Fc'];

/**
 * Grupo técnico EEA: una homologación (TAN normalizado + Va + Ve) en un año y Estado miembro.
 * Varias matriculaciones → un grupo (nunca una variant por matriculación). Los valores que varían dentro del grupo
 * se conservan como distribución (valor → matriculaciones), nunca se promedian.
 */
export interface EeaTechnicalGroup {
  key: string;
  memberState: string;
  year: number;
  status: 'F' | 'P';
  tan: string;
  tanRaw: string[];
  /** TAN sin el número de extensión (p. ej. "E1*2007/46*0623"): agrupa revisiones de la misma homologación. */
  tanBase: string;
  types: string[];
  variant: string;
  version: string;
  make: string;
  commercialNames: string[];
  fuelTypes: string[];
  fuelModes: string[];
  homologationPowertrain: HomologationPowertrain;
  fuel?: string;
  registrations: number;
  sourceRows: number;
  registrationPeriod?: { from: string; to: string };
  distributions: Partial<Record<SurveyValueField, Array<[number, number]>>>;
  massKg?: { min: number; max: number };
  testMassKg?: { min: number; max: number };
  wheelbaseMm?: { min: number; max: number };
  /** Discrepancias dentro del grupo que deben ir al motor de conflictos (no se resuelven aquí). */
  conflicts: string[];
}

const up = (s: string | null | undefined) => (s ?? '').trim().toUpperCase();
export const tanBaseOf = (tan: string) => {
  const parts = normalizeTan(tan).split('*');
  return parts.length >= 4 ? parts.slice(0, 3).join('*') : normalizeTan(tan);
};

const widen = (r: { min: number; max: number } | undefined, lo: number | null | undefined, hi: number | null | undefined) => {
  if (lo === null || lo === undefined || hi === null || hi === undefined) return r;
  return r ? { min: Math.min(r.min, lo), max: Math.max(r.max, hi) } : { min: lo, max: hi };
};

/** Tolerancias para señalar (no resolver) incoherencias dentro de una misma versión. */
const INTRA_GROUP_SPREAD: Partial<Record<SurveyValueField, number>> = { 'Ec (cm3)': 5, 'Ep (KW)': 2 };

export function groupEeaSurveyRows(rawRows: readonly unknown[]): { groups: EeaTechnicalGroup[]; issues: string[]; missingIdentifiers: number; missingIdentifierRegistrations: number } {
  const issues: string[] = [];
  let missingIdentifiers = 0;
  let missingIdentifierRegistrations = 0;
  const byKey = new Map<string, EeaSurveyRow[]>();
  rawRows.forEach((r, i) => {
    const p = EeaSurveyRow.safeParse(r);
    if (!p.success) {
      issues.push(`row ${i}: ${p.error.issues[0]?.message ?? 'invalid'}`);
      return;
    }
    const row = p.data;
    if (!row.TAN || !row.Va || !row.Ve || !row.MS || !row.Year) {
      missingIdentifiers++;
      missingIdentifierRegistrations += row.R ?? 0;
      return;
    }
    const key = [up(row.MS), row.Year, normalizeTan(row.TAN), up(row.Va), up(row.Ve)].join('|');
    byKey.set(key, [...(byKey.get(key) ?? []), row]);
  });

  const groups: EeaTechnicalGroup[] = [];
  for (const [key, all] of [...byKey.entries()].sort(([a], [b]) => (a < b ? -1 : 1))) {
    const finals = all.filter((r) => up(r.Status) === 'F');
    const status: 'F' | 'P' = finals.length > 0 ? 'F' : 'P';
    const rows = status === 'F' ? finals : all;
    const dist: Partial<Record<SurveyValueField, Map<number, number>>> = {};
    let registrations = 0;
    let sourceRows = 0;
    let mass: EeaTechnicalGroup['massKg'];
    let testMass: EeaTechnicalGroup['testMassKg'];
    let wheelbase: EeaTechnicalGroup['wheelbaseMm'];
    let from: string | undefined;
    let to: string | undefined;
    for (const r of rows) {
      const n = r.R ?? 0;
      registrations += n;
      sourceRows += r.source_rows ?? 0;
      for (const f of SURVEY_VALUE_FIELDS) {
        const v = r[f];
        if (v === null || v === undefined) continue;
        const m = (dist[f] ??= new Map());
        m.set(v, (m.get(v) ?? 0) + n);
      }
      mass = widen(mass, r['M (kg)_min'], r['M (kg)_max']);
      testMass = widen(testMass, r.Mt_min, r.Mt_max);
      wheelbase = widen(wheelbase, r['W (mm)_min'], r['W (mm)_max']);
      if (r.Dr_min && (!from || r.Dr_min < from)) from = r.Dr_min;
      if (r.Dr_max && (!to || r.Dr_max > to)) to = r.Dr_max;
    }
    const fuelModes = [...new Set(rows.map((r) => up(r.Fm)).filter(Boolean))].sort();
    const fuelTypes = [...new Set(rows.map((r) => up(r.Ft)).filter(Boolean))].sort();
    const conflicts: string[] = [];
    if (fuelModes.length > 1) conflicts.push(`fuel modes ${fuelModes.join('/')}`);
    if (fuelTypes.length > 1) conflicts.push(`fuel types ${fuelTypes.join('/')}`);
    for (const [f, tol] of Object.entries(INTRA_GROUP_SPREAD) as Array<[SurveyValueField, number]>) {
      const vals = [...(dist[f]?.keys() ?? [])];
      if (vals.length > 1 && Math.max(...vals) - Math.min(...vals) > tol) conflicts.push(`${f} spread ${Math.min(...vals)}–${Math.max(...vals)}`);
    }
    const first = rows[0]!;
    const tan = normalizeTan(first.TAN!);
    groups.push({
      key,
      memberState: up(first.MS),
      year: first.Year!,
      status,
      tan,
      tanRaw: [...new Set(rows.map((r) => r.TAN!))].sort(),
      tanBase: tanBaseOf(tan),
      types: [...new Set(rows.map((r) => up(r.T)).filter(Boolean))].sort(),
      variant: up(first.Va),
      version: up(first.Ve),
      make: up(first.Mk),
      commercialNames: [...new Set(rows.map((r) => up(r.Cn)).filter(Boolean))].sort(),
      fuelTypes,
      fuelModes,
      homologationPowertrain: homologationPowertrainOf({ fuel_modes: fuelModes, fuel_types: fuelTypes }),
      ...(fuelTypeOf({ fuel_types: fuelTypes }) ? { fuel: fuelTypeOf({ fuel_types: fuelTypes })! } : {}),
      registrations,
      sourceRows,
      ...(from && to ? { registrationPeriod: { from, to } } : {}),
      distributions: Object.fromEntries(Object.entries(dist).map(([f, m]) => [f, [...m.entries()].sort(([a], [b]) => a - b)])),
      ...(mass ? { massKg: mass } : {}),
      ...(testMass ? { testMassKg: testMass } : {}),
      ...(wheelbase ? { wheelbaseMm: wheelbase } : {}),
      conflicts,
    });
  }
  return { groups, issues, missingIdentifiers, missingIdentifierRegistrations };
}

/** CO₂ del grupo con su ciclo, sin mezclar ciclos (NEDC de `E`/`Enedc`, WLTP de `Ewltp`). */
export function co2ByCycle(g: Pick<EeaTechnicalGroup, 'distributions'>): { nedc?: { min: number; max: number; field: SurveyValueField }; wltp?: { min: number; max: number } } {
  const range = (f: SurveyValueField) => {
    const d = g.distributions[f];
    return d && d.length ? { min: d[0]![0], max: d[d.length - 1]![0] } : undefined;
  };
  const nedcField: SurveyValueField | undefined = g.distributions['Enedc (g/km)']?.length ? 'Enedc (g/km)' : g.distributions['E (g/km)']?.length ? 'E (g/km)' : undefined;
  const nedc = nedcField ? range(nedcField) : undefined;
  const wltp = range('Ewltp (g/km)');
  return { ...(nedc && nedcField ? { nedc: { ...nedc, field: nedcField } } : {}), ...(wltp ? { wltp } : {}) };
}
