import { eeaRequestUrl } from './query.ts';

export type FetchLike = (url: string, init?: { signal?: AbortSignal; headers?: Record<string, string> }) => Promise<{ ok: boolean; status: number; json(): Promise<unknown> }>;

/** Logger mínimo inyectable (el worker escribe JSON lines en logs/eea). Nunca recibe secretos. */
export type AdapterLogger = (event: string, data: Record<string, unknown>) => void;

export interface EeaFetchResult {
  query: string;
  request_urls: string[];
  rows: unknown[];
}

export interface EeaFetchOptions {
  fetchImpl?: FetchLike;
  pageSize?: number;
  maxPages?: number;
  timeoutMs?: number;
  baseUrl?: string;
  logger?: AdapterLogger;
}

/** Error de red/timeout/HTTP 5xx: reintentable por la cola. */
export class RetryableSourceError extends Error {
  readonly retryable = true;
}

/**
 * Cliente paginado de discodata con timeout por página y límite de páginas.
 * `fetchImpl` inyectable para tests deterministas con respuestas grabadas.
 */
export async function fetchEea(query: string, opts: EeaFetchOptions = {}): Promise<EeaFetchResult> {
  const { fetchImpl = globalThis.fetch as unknown as FetchLike, pageSize = 500, maxPages = 20, timeoutMs = 60_000, baseUrl, logger } = opts;
  const rows: unknown[] = [];
  const request_urls: string[] = [];
  for (let page = 1; page <= maxPages; page++) {
    const url = eeaRequestUrl(query, page, pageSize, baseUrl);
    request_urls.push(url);
    const started = Date.now();
    let res: Awaited<ReturnType<FetchLike>>;
    try {
      res = await fetchImpl(url, { signal: AbortSignal.timeout(timeoutMs) });
    } catch (e) {
      logger?.('eea.fetch.error', { page, error: e instanceof Error ? e.message : String(e) });
      throw new RetryableSourceError(`EEA discodata request failed: ${e instanceof Error ? e.message : String(e)}`);
    }
    if (!res.ok) {
      logger?.('eea.fetch.http_error', { page, status: res.status });
      if (res.status >= 500 || res.status === 429) throw new RetryableSourceError(`EEA discodata HTTP ${res.status}`);
      throw new Error(`EEA discodata HTTP ${res.status}`);
    }
    const body = (await res.json()) as { results?: unknown[]; errors?: unknown[] };
    if (body.errors) throw new Error(`EEA discodata error: ${JSON.stringify(body.errors)}`);
    if (!Array.isArray(body.results)) throw new Error('EEA discodata: unexpected response shape (no results array)');
    rows.push(...body.results);
    logger?.('eea.fetch.page', { page, rows: body.results.length, ms: Date.now() - started });
    if (body.results.length < pageSize) return { query, request_urls, rows };
  }
  throw new Error(`EEA discodata: more than ${maxPages} pages; narrow the query`);
}
