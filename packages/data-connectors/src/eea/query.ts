import { EEA_DATASET, EEA_GROUP_COLUMNS } from './fields.ts';
import type { ResolvedEeaDataset } from './resolver.ts';

/**
 * Consulta agregada segura para discodata (SQL Server). Solo filtros tipados y columnas en whitelist;
 * los literales se escapan y los identificadores nunca vienen del llamante. Agrega en servidor por
 * homologación (TAN/Va/Ve) y valores técnicos, sumando matriculaciones (R) y acotando fechas (Dr).
 */
export interface EeaFilters {
  memberState: string;
  make: string;
  /** Prefijo del nombre comercial (LIKE 'X%'). */
  commercialNamePrefix?: string;
  commercialNames?: string[];
  engineCapacityCm3?: number;
  enginePowerKw?: number;
  fuelMode?: string;
  typeApprovalNumberPrefix?: string;
}

const lit = (s: string) => `'${s.replace(/'/g, "''")}'`;
const col = (c: string) => (/^[A-Za-z]+$/.test(c) ? c : `[${c}]`);
const TABLE_RE = /^\[CO2Emission\]\.\[latest\]\.\[co2cars(_\d{4}[FP]v\d+)?\]$/;
const SAFE_TEXT = /^[\p{L}\p{N} .\-/*_+&]{1,64}$/u;

function safeInt(name: string, value: unknown): number {
  const n = typeof value === 'number' ? value : Number.NaN;
  if (!Number.isInteger(n) || n < 0 || n > 100_000) throw new Error(`invalid ${name} filter value`);
  return n;
}

function safeText(name: string, value: string): string {
  if (!SAFE_TEXT.test(value)) throw new Error(`unsafe ${name} filter value`);
  return value;
}

export function buildEeaQuery(filters: EeaFilters, dataset: Pick<ResolvedEeaDataset, 'year' | 'table' | 'status_filter'>): string {
  if (!TABLE_RE.test(dataset.table)) throw new Error(`unsupported EEA table ${dataset.table}`);
  if (!Number.isInteger(dataset.year) || dataset.year < 2010 || dataset.year > 2100) throw new Error('invalid year');
  if (!/^[A-Z]{2}$/.test(filters.memberState)) throw new Error('invalid member state');

  const where = [`Year=${dataset.year}`, `MS=${lit(filters.memberState)}`, `Mk=${lit(safeText('make', filters.make).toUpperCase())}`];
  if (dataset.status_filter) where.push(`Status=${lit(dataset.status_filter)}`);
  if (filters.commercialNamePrefix) where.push(`Cn LIKE ${lit(`${safeText('commercial name', filters.commercialNamePrefix).toUpperCase()}%`)}`);
  if (filters.commercialNames?.length) where.push(`Cn IN (${filters.commercialNames.map((c) => lit(safeText('commercial name', c).toUpperCase())).join(',')})`);
  if (filters.engineCapacityCm3 !== undefined) where.push(`[Ec (cm3)]=${safeInt('engine capacity', filters.engineCapacityCm3)}`);
  if (filters.enginePowerKw !== undefined) where.push(`[Ep (KW)]=${safeInt('engine power', filters.enginePowerKw)}`);
  if (filters.fuelMode) {
    if (!/^[A-Z]$/i.test(filters.fuelMode)) throw new Error('invalid fuel mode');
    where.push(`Fm=${lit(filters.fuelMode.toUpperCase())}`);
  }
  if (filters.typeApprovalNumberPrefix) where.push(`TAN LIKE ${lit(`${safeText('TAN', filters.typeApprovalNumberPrefix)}%`)}`);

  const cols = EEA_GROUP_COLUMNS.map(col).join(', ');
  return `SELECT ${cols}, SUM(R) AS R, MIN(Dr) AS Dr_min, MAX(Dr) AS Dr_max FROM ${dataset.table} WHERE ${where.join(' AND ')} GROUP BY ${cols} ORDER BY TAN, Va, Ve, Status`;
}

export function eeaRequestUrl(query: string, page: number, pageSize: number, baseUrl: string = EEA_DATASET.endpoint): string {
  const u = new URL(baseUrl);
  u.searchParams.set('query', query);
  u.searchParams.set('p', String(page));
  u.searchParams.set('nrOfHits', String(pageSize));
  return u.toString();
}
