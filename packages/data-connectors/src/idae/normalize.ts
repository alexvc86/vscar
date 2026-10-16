import { createReadStream } from 'node:fs';
import { readCsvRows } from '../acquisition/csv.ts';
import { ColumnProfiler, type ColumnProfile } from '../acquisition/profile.ts';
import { IDAE_POWERTRAIN, checkIdaeHeader, type IdaeColumn, type IdaeSchemaCheck } from './fields.ts';

/**
 * Normalización IDAE → `IdaeRecord`. Reglas:
 * - 0 o vacío en un campo de medida = "no informado" (nunca 0). Negativos = inválidos (issue).
 * - Fechas dd/mm/aaaa → ISO; fechas imposibles o posteriores a la edición = issue (el valor original se conserva).
 * - Los valores de columnas UNMAPPED se conservan solo como evidencia interna (`unmapped`), nunca como SpecKey.
 * - Cada registro guarda la línea física del fichero y el SHA-256 del bruto: trazabilidad hasta la fila original.
 */
export type IdaeScope = 'MAINLAND' | 'CANARIAS' | 'COMMERCIAL';

export interface IdaeRecord {
  sourceRecordId: string;
  line: number;
  makeRaw: string;
  make: string;
  scope: IdaeScope;
  model: string;
  version: string;
  segment: string;
  motorizacion: string;
  powertrain?: 'ICE' | 'HEV' | 'PHEV' | 'BEV' | 'FCEV' | 'EREV';
  fuel?: 'petrol' | 'diesel' | 'lpg' | 'cng' | 'hydrogen';
  category: string;
  dates: { alta?: string; actualizacion?: string; comercializacion?: string };
  /** Pistas extraídas del texto de versión: no son SpecValues. */
  hints: { kw: number[]; cv: number[]; modelYearTag?: string; codeCandidate?: { variant: string; version: string } };
  values: {
    gvwKg?: number;
    fuelWltpMin?: number;
    fuelWltpMax?: number;
    electricRangeKm?: number;
    electricKwh100?: number;
  };
  /** Columnas no mapeadas (solo evidencia interna; derechos de IDAE sin verificar → nunca se publican). */
  unmapped: { consumoNedc?: number; emisionesNedc?: number; consumoMixtoWltp?: number; co2Min?: number; co2Max?: number };
  observations?: string;
  issues: string[];
}

/** Alias de distribuidor → marca. Lo no listado conserva el texto original. */
export const IDAE_MAKE_ALIASES: Readonly<Record<string, { make: string; scope: IdaeScope }>> = {
  'Volkswagen Turismos': { make: 'Volkswagen', scope: 'MAINLAND' },
  'Volkswagen Canarias': { make: 'Volkswagen', scope: 'CANARIAS' },
  'Volkswagen Vehículos Comerciales': { make: 'Volkswagen', scope: 'COMMERCIAL' },
  'Volkswagen Comerciales Canarias': { make: 'Volkswagen', scope: 'COMMERCIAL' },
  'Toyota Canarias': { make: 'Toyota', scope: 'CANARIAS' },
  'Hyundai Canarias': { make: 'Hyundai', scope: 'CANARIAS' },
  'Kia Canarias': { make: 'Kia', scope: 'CANARIAS' },
  'Skoda Canarias': { make: 'SKODA', scope: 'CANARIAS' },
  'Audi Canarias': { make: 'Audi', scope: 'CANARIAS' },
  'BMW i': { make: 'BMW', scope: 'MAINLAND' },
  TESLA: { make: 'Tesla', scope: 'MAINLAND' },
  SKODA: { make: 'SKODA', scope: 'MAINLAND' },
};

const DMY = /^(\d{2})\/(\d{2})\/(\d{4})$/;
/** Límite de plausibilidad de consumo de combustible de un turismo M1 (L/100 km). */
export const FUEL_MAX_L100 = 30;

export function parseIdaeDate(raw: string, maxYear: number): { iso?: string; issue?: string } {
  if (raw === '') return {};
  const m = DMY.exec(raw.trim());
  if (!m) return { issue: `unparseable date "${raw}"` };
  const [, d, mo, y] = m;
  const day = Number(d), month = Number(mo), year = Number(y);
  const dt = new Date(Date.UTC(year, month - 1, day));
  if (dt.getUTCFullYear() !== year || dt.getUTCMonth() !== month - 1 || dt.getUTCDate() !== day) return { issue: `impossible date "${raw}"` };
  if (year > maxYear || year < 1990) return { issue: `out-of-range date "${raw}"` };
  return { iso: `${y}-${mo}-${d}` };
}

/** Número positivo o "no informado". 0/vacío → undefined; negativo/ilegible → issue. */
export function measure(raw: string | undefined, field: string, issues: string[]): number | undefined {
  if (raw === undefined || raw.trim() === '') return undefined;
  const n = Number(raw.trim().replace(',', '.'));
  if (!Number.isFinite(n)) {
    issues.push(`measure_not_a_number: ${field} "${raw}"`);
    return undefined;
  }
  if (n < 0) {
    issues.push(`measure_negative: ${field} ${n}`);
    return undefined;
  }
  return n === 0 ? undefined : n;
}

const KW = /(\d+(?:[.,]\d+)?)\s*kw\b/gi;
const CV = /(\d+(?:[.,]\d+)?)\s*(?:cv|ps)\b/gi;
const MY = /\((?:MY|NG)\s?(\d{2}(?:\.\d)?)\)/i;
/** "(SE2R1C/2NTE5F002NL1)": candidato a Va/Ve. Solo es evidencia si coincide con la EEA carácter a carácter. */
const CODE = /\(?\b([A-Z0-9]{4,12})\/([A-Z0-9]{8,30})\b\)?/;

export function extractHints(version: string): IdaeRecord['hints'] {
  const nums = (re: RegExp) => [...version.matchAll(re)].map((m) => Number(m[1]!.replace(',', '.'))).filter((n) => n > 0);
  const my = MY.exec(version);
  const code = CODE.exec(version);
  // Un código debe mezclar letras y cifras en ambas partes (descarta "D0/D1", "110/112").
  const codeOk = code && /[A-Z]/.test(code[1]!) && /\d/.test(code[1]!) && /[A-Z]/.test(code[2]!) && /\d/.test(code[2]!);
  return {
    kw: [...new Set(nums(KW))],
    cv: [...new Set(nums(CV))],
    ...(my ? { modelYearTag: `MY${my[1]}` } : {}),
    ...(codeOk ? { codeCandidate: { variant: code![1]!, version: code![2]! } } : {}),
  };
}

export function normalizeIdaeRow(
  get: (c: IdaeColumn) => string,
  ctx: { line: number; fileSha256: string; editionYear: number },
): IdaeRecord {
  const issues: string[] = [];
  const makeRaw = get('Marca').trim();
  const alias = IDAE_MAKE_ALIASES[makeRaw];
  const motorizacion = get('Motorizacion').trim();
  const pt = IDAE_POWERTRAIN[motorizacion];
  if (!pt) issues.push(`unknown_motorizacion: "${motorizacion}"`);

  const dates: IdaeRecord['dates'] = {};
  for (const [col, key] of [
    ['Fecha_alta', 'alta'],
    ['Fecha_actualizacion', 'actualizacion'],
    ['Fecha_comercializacion', 'comercializacion'],
  ] as const) {
    const r = parseIdaeDate(get(col), ctx.editionYear);
    if (r.iso) dates[key] = r.iso;
    if (r.issue) issues.push(`${col.toLowerCase()}_invalid: ${r.issue}`);
  }

  const version = get('Vehiculo').trim();
  if (version === '' || version === '0') issues.push('vehiculo_empty: no commercial version text');
  const m = (c: IdaeColumn) => measure(get(c), c, issues);
  let fuelMin = m('Consumo_Mixto_WLTP_Min');
  let fuelMax = m('Consumo_Mixto_WLTP_Max');
  // Rango imposible o fuera de plausibilidad (p. ej. CO₂ en la columna de consumo): se descarta y se cuenta, nunca se corrige.
  if (fuelMin !== undefined && fuelMax !== undefined && fuelMin > fuelMax) {
    issues.push(`fuel_wltp_min_gt_max: ${fuelMin} > ${fuelMax}`);
    fuelMin = fuelMax = undefined;
  }
  if ((fuelMin ?? 0) > FUEL_MAX_L100 || (fuelMax ?? 0) > FUEL_MAX_L100) {
    issues.push(`fuel_wltp_implausible: ${fuelMin}–${fuelMax} L/100 km`);
    fuelMin = fuelMax = undefined;
  }
  const values: IdaeRecord['values'] = {};
  const gvw = m('MTMA');
  if (gvw !== undefined) values.gvwKg = gvw;
  if (fuelMin !== undefined) values.fuelWltpMin = fuelMin;
  if (fuelMax !== undefined) values.fuelWltpMax = fuelMax;
  const range = m('Autonomia_electrica');
  const kwh = m('Consumo_Electrico');
  if (range !== undefined) values.electricRangeKm = range;
  if (kwh !== undefined) values.electricKwh100 = kwh;

  const unmapped: IdaeRecord['unmapped'] = {};
  const u = (c: IdaeColumn, k: keyof IdaeRecord['unmapped']) => {
    const v = measure(get(c), c, []);
    if (v !== undefined) unmapped[k] = v;
  };
  u('Consumo_NEDC', 'consumoNedc');
  u('Emisiones_NEDC', 'emisionesNedc');
  u('Consumo_Mixto_WLTP', 'consumoMixtoWltp');
  u('Emisionies_CO2_Mixto_WLTP_Min', 'co2Min');
  u('Emisionies_CO2_Mixto_WLTP_Max', 'co2Max');

  const obs = get('Observaciones').trim();
  return {
    sourceRecordId: `S02:${ctx.fileSha256.slice(0, 12)}:L${ctx.line}`,
    line: ctx.line,
    makeRaw,
    make: alias?.make ?? makeRaw,
    scope: alias?.scope ?? (/canarias/i.test(makeRaw) ? 'CANARIAS' : /comercial|trucks/i.test(makeRaw) ? 'COMMERCIAL' : 'MAINLAND'),
    model: get('Modelo').trim(),
    version,
    segment: get('Segmento').trim(),
    motorizacion,
    ...(pt ? { powertrain: pt.powertrain } : {}),
    ...(pt?.fuel ? { fuel: pt.fuel } : {}),
    category: get('Categoria').trim(),
    dates,
    hints: extractHints(version),
    values,
    unmapped,
    ...(obs !== '' && obs !== '0' ? { observations: obs } : {}),
    issues,
  };
}

export interface IdaeReadResult {
  schema: IdaeSchemaCheck;
  profile: ColumnProfile[];
  totalRows: number;
  records: IdaeRecord[];
  /** Filas descartadas por filtro (categoría ≠ M1, etc.), contadas, nunca corregidas. */
  filteredOut: Record<string, number>;
  issueCounts: Record<string, number>;
  widthErrors: number;
}

/**
 * Lee el CSV en streaming: perfil de TODAS las filas (inventario de columnas) y registros normalizados solo de las
 * que pasan `keep` (por defecto, categoría M1). Falla si la cabecera no es compatible (schema drift).
 */
export async function readIdaeCsv(params: {
  path: string;
  fileSha256: string;
  editionYear: number;
  keep?: (r: IdaeRecord) => boolean;
  source?: AsyncIterable<string | Buffer>;
}): Promise<IdaeReadResult> {
  const keep = params.keep ?? ((r) => r.category === 'M1');
  let header: string[] | undefined;
  let schema: IdaeSchemaCheck | undefined;
  let profiler: ColumnProfiler | undefined;
  let index = new Map<string, number>();
  const records: IdaeRecord[] = [];
  const filteredOut: Record<string, number> = {};
  const issueCounts: Record<string, number> = {};
  let totalRows = 0;
  let widthErrors = 0;

  for await (const row of readCsvRows(params.source ?? createReadStream(params.path))) {
    if (!header) {
      header = row.fields.map((h) => h.trim());
      schema = checkIdaeHeader(header);
      if (!schema.compatible) throw new Error(`IDAE schema drift: missing columns ${schema.missing.join(', ')}`);
      index = new Map(header.map((h, i) => [h, i]));
      profiler = new ColumnProfiler(header);
      continue;
    }
    if (row.fields.length === 1 && row.fields[0] === '') continue;
    totalRows++;
    if (row.fields.length !== header.length) widthErrors++;
    profiler!.add(row.fields);
    const record = normalizeIdaeRow((c) => row.fields[index.get(c)!] ?? '', { line: row.line, fileSha256: params.fileSha256, editionYear: params.editionYear });
    for (const issue of record.issues) {
      const kind = issue.split(':')[0]!;
      issueCounts[kind] = (issueCounts[kind] ?? 0) + 1;
    }
    if (keep(record)) records.push(record);
    else {
      const k = `category ${record.category || '(empty)'}`;
      filteredOut[k] = (filteredOut[k] ?? 0) + 1;
    }
  }
  if (!header || !schema || !profiler) throw new Error('IDAE CSV: empty file');
  return { schema, profile: profiler.result(), totalRows, records, filteredOut, issueCounts, widthErrors };
}
