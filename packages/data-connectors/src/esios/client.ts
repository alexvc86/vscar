import { RetryableSourceError, type AdapterLogger, type FetchLike } from '../eea/client.ts';
import { isValidIsoDate } from '../time.ts';
import { ESIOS_DATASET } from './fields.ts';

/** Error que no se arregla reintentando (parámetros, formato no soportado, forma inesperada). */
export class EsiosRequestError extends Error {
  readonly retryable = false;
}

/** El día pedido aún no está publicado. No se reintenta: se encola cuando exista (misma convención que MITECO). */
export class EsiosNotAvailableError extends Error {
  readonly retryable = false;
  readonly code = 'NOT_AVAILABLE_YET';
}

export type EsiosPvpcRow = Record<string, string>;

/** URL del fichero PVPC de un día. Nunca contiene el token. */
export function esiosPvpcUrl(isoDate: string, baseUrl: string = ESIOS_DATASET.base_url): string {
  if (!isValidIsoDate(isoDate)) throw new EsiosRequestError(`invalid date: ${JSON.stringify(isoDate)}`);
  return `${baseUrl}/archives/${ESIOS_DATASET.archive_id}/download_json?locale=es&date=${isoDate}`;
}

/** Elimina cualquier aparición del secreto (defensa en profundidad para mensajes de terceros). */
const scrub = (text: string, token?: string) => (token ? text.split(token).join('[REDACTED]') : text);

export async function fetchEsiosPvpc(
  url: string,
  opts: { fetchImpl?: FetchLike; timeoutMs?: number; logger?: AdapterLogger; token?: string } = {},
): Promise<EsiosPvpcRow[]> {
  const { fetchImpl = globalThis.fetch as unknown as FetchLike, timeoutMs = 60_000, logger, token } = opts;
  const headers: Record<string, string> = { Accept: 'application/json' };
  // El archivo 70 es público; si hay token personal se envía como cabecera (nunca en la URL).
  if (token) headers['x-api-key'] = token;
  const started = Date.now();
  let res: Awaited<ReturnType<FetchLike>>;
  try {
    res = await fetchImpl(url, { signal: AbortSignal.timeout(timeoutMs), headers });
  } catch (e) {
    const msg = scrub(e instanceof Error ? e.message : String(e), token);
    logger?.('esios.fetch.error', { url, error: msg });
    throw new RetryableSourceError(`ESIOS request failed: ${msg}`);
  }
  if (!res.ok) {
    logger?.('esios.fetch.http_error', { url, status: res.status });
    if (res.status >= 500 || res.status === 429) throw new RetryableSourceError(`ESIOS HTTP ${res.status}`);
    throw new EsiosRequestError(`ESIOS HTTP ${res.status}`);
  }
  const body = (await res.json()) as { PVPC?: unknown; message?: unknown };
  if (!Array.isArray(body.PVPC)) {
    if (typeof body.message === 'string' && /no values/i.test(body.message)) {
      logger?.('esios.fetch.not_available', { url });
      throw new EsiosNotAvailableError(`NOT_AVAILABLE_YET: ESIOS has no PVPC file for this date (${scrub(body.message, token)})`);
    }
    throw new EsiosRequestError('ESIOS: unexpected response shape (no PVPC array)');
  }
  logger?.('esios.fetch.done', { url, rows: body.PVPC.length, ms: Date.now() - started });
  return body.PVPC as EsiosPvpcRow[];
}
