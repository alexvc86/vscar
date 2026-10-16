import { RetryableSourceError, type AdapterLogger } from '../eea/client.ts';
import { RDW_DATASETS, RDW_SOURCE, RDW_WITHDRAWALS, type RdwDatasetName } from './fields.ts';

/**
 * Cliente Socrata (SoQL) para los conjuntos TGK de RDW. Sin token de aplicación (cuota compartida pública):
 * paginación determinista (`$order` por la clave completa), tamaño de página acotado y 429 → espera `Retry-After`
 * (o backoff fijo) un número limitado de veces; nunca se sortea el límite.
 */
export type RdwFetchLike = (url: string, init?: { signal?: AbortSignal; headers?: Record<string, string> }) => Promise<{
  ok: boolean;
  status: number;
  headers?: { get(name: string): string | null };
  json(): Promise<unknown>;
}>;

export interface RdwVersionKey {
  /** TAN tal como lo publica la EEA o RDW (se normaliza al comparar). */
  tan: string;
  variant: string;
  version: string;
}

/** Códigos de homologación: letras, cifras y los separadores observados en EEA/RDW. */
const CODE = /^[A-Za-z0-9*()/.\- ]{1,40}$/;
const lit = (s: string) => `'${s.replace(/'/g, "''")}'`;

function safeCode(name: string, value: string): string {
  if (!CODE.test(value)) throw new Error(`unsafe RDW ${name} value`);
  return value;
}

/**
 * SoQL para todas las revisiones y TAN de unos pares (Va, Ve). Se piden TODAS las extensiones de TAN de esos pares
 * para poder distinguir EXACT de "misma Va/Ve con otra extensión" — la decisión se toma después, nunca en la consulta.
 */
export function buildRdwQuery(dataset: RdwDatasetName, keys: readonly Pick<RdwVersionKey, 'variant' | 'version'>[]): Record<string, string> {
  const ds = RDW_DATASETS[dataset];
  if (keys.length === 0 || keys.length > 25) throw new Error('RDW query: 1..25 (variant, version) pairs');
  const pairs = keys.map((k) => `(${ds.variantField}=${lit(safeCode('variant', k.variant))} AND codeuitvoeringtgk=${lit(safeCode('version', k.version))})`);
  return {
    $select: ds.fields.join(','),
    $where: pairs.join(' OR '),
    $order: [...new Set(['typegoedkeuringsnummer', ds.variantField, 'codeuitvoeringtgk', 'volgnummerrevisieuitvoering', ...ds.fields.filter((f) => f.startsWith('volgnummer'))])].join(','),
  };
}

export function buildRdwWithdrawalQuery(tans: readonly string[]): Record<string, string> {
  if (tans.length === 0 || tans.length > 50) throw new Error('RDW withdrawal query: 1..50 TAN');
  return {
    $select: RDW_WITHDRAWALS.fields.join(','),
    $where: `upper(typegoedkeuringsnummer) IN (${tans.map((t) => lit(safeCode('TAN', t).toUpperCase())).join(',')})`,
    $order: 'typegoedkeuringsnummer,volgnummerintrekkingtgk',
  };
}

export function rdwRequestUrl(datasetId: string, params: Record<string, string>, limit: number, offset: number, base: string = RDW_SOURCE.api_base): string {
  if (!/^[a-z0-9]{4}-[a-z0-9]{4}$/.test(datasetId)) throw new Error('invalid RDW dataset id');
  const u = new URL(`${datasetId}.json`, base);
  for (const [k, v] of Object.entries(params)) u.searchParams.set(k, v);
  u.searchParams.set('$limit', String(limit));
  u.searchParams.set('$offset', String(offset));
  return u.toString();
}

export interface RdwFetchOptions {
  fetchImpl?: RdwFetchLike;
  pageSize?: number;
  maxPages?: number;
  timeoutMs?: number;
  /** Reintentos ante 429 (cuota). Por defecto 3; después, error reintentable para la cola. */
  maxRateLimitRetries?: number;
  /** Espera por defecto si no hay `Retry-After` (ms). */
  rateLimitWaitMs?: number;
  sleep?: (ms: number) => Promise<void>;
  logger?: AdapterLogger;
  baseUrl?: string;
}

export interface RdwFetchResult {
  datasetId: string;
  params: Record<string, string>;
  request_urls: string[];
  rows: unknown[];
  rateLimited: number;
}

export async function fetchRdw(datasetId: string, params: Record<string, string>, opts: RdwFetchOptions = {}): Promise<RdwFetchResult> {
  const {
    fetchImpl = globalThis.fetch as unknown as RdwFetchLike,
    pageSize = 1000,
    maxPages = 20,
    timeoutMs = 60_000,
    maxRateLimitRetries = 3,
    rateLimitWaitMs = 10_000,
    sleep = (ms) => new Promise((r) => setTimeout(r, ms)),
    logger,
    baseUrl,
  } = opts;
  const rows: unknown[] = [];
  const request_urls: string[] = [];
  let rateLimited = 0;
  for (let page = 0; page < maxPages; page++) {
    const url = rdwRequestUrl(datasetId, params, pageSize, page * pageSize, baseUrl);
    request_urls.push(url);
    let res: Awaited<ReturnType<RdwFetchLike>> | undefined;
    for (let attempt = 0; ; attempt++) {
      try {
        res = await fetchImpl(url, { signal: AbortSignal.timeout(timeoutMs), headers: { Accept: 'application/json' } });
      } catch (e) {
        throw new RetryableSourceError(`RDW request failed: ${e instanceof Error ? e.message : String(e)}`);
      }
      if (res.status !== 429) break;
      rateLimited++;
      if (attempt >= maxRateLimitRetries) throw new RetryableSourceError(`RDW rate limit (429) persisted after ${maxRateLimitRetries} retries`);
      const retryAfter = Number(res.headers?.get('retry-after'));
      const wait = Number.isFinite(retryAfter) && retryAfter > 0 ? retryAfter * 1000 : rateLimitWaitMs;
      logger?.('rdw.rate_limited', { datasetId, page, wait });
      await sleep(wait);
    }
    if (!res.ok) {
      if (res.status >= 500) throw new RetryableSourceError(`RDW HTTP ${res.status}`);
      throw new Error(`RDW HTTP ${res.status}`);
    }
    const body = await res.json();
    if (!Array.isArray(body)) throw new Error(`RDW: unexpected response shape (${JSON.stringify(body).slice(0, 200)})`);
    rows.push(...body);
    logger?.('rdw.page', { datasetId, page, rows: body.length });
    if (body.length < pageSize) return { datasetId, params, request_urls, rows, rateLimited };
  }
  throw new Error(`RDW: more than ${maxPages} pages for ${datasetId}; narrow the query`);
}
