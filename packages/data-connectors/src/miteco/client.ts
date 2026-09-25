import { RetryableSourceError, type AdapterLogger, type FetchLike } from '../eea/client.ts';
import { MITECO_DATASET } from './fields.ts';

/** Error de la fuente que no se arregla reintentando (parámetros, fecha no publicada, forma inesperada). */
export class MitecoRequestError extends Error {
  readonly retryable = false;
}

export interface MitecoResponse {
  Fecha: string | null;
  ListaEESSPrecio: Record<string, string>[];
  Nota?: string;
  ResultadoConsulta: string;
}

const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;
const PROVINCE = /^\d{2}$/;

/** `YYYY-MM-DD` → `dd-MM-yyyy`, rechazando fechas imposibles (la URL nunca se construye con texto libre). */
export function mitecoDateParam(isoDate: string): string {
  const m = ISO_DATE.exec(isoDate);
  const d = m ? new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]))) : undefined;
  if (!m || !d || d.toISOString().slice(0, 10) !== isoDate) throw new MitecoRequestError(`invalid date: ${JSON.stringify(isoDate)}`);
  return `${m[3]}-${m[2]}-${m[1]}`;
}

/** URL del histórico diario (nacional o de una provincia INE). */
export function mitecoHistoryUrl(isoDate: string, province?: string, baseUrl: string = MITECO_DATASET.base_url): string {
  const date = mitecoDateParam(isoDate);
  if (province === undefined) return `${baseUrl}/EstacionesTerrestresHist/${date}`;
  if (!PROVINCE.test(province)) throw new MitecoRequestError(`invalid province code: ${JSON.stringify(province)}`);
  return `${baseUrl}/EstacionesTerrestresHist/FiltroProvincia/${date}/${province}`;
}

export async function fetchMiteco(
  url: string,
  opts: { fetchImpl?: FetchLike; timeoutMs?: number; logger?: AdapterLogger } = {},
): Promise<MitecoResponse> {
  const { fetchImpl = globalThis.fetch as unknown as FetchLike, timeoutMs = 120_000, logger } = opts;
  const started = Date.now();
  let res: Awaited<ReturnType<FetchLike>>;
  try {
    res = await fetchImpl(url, { signal: AbortSignal.timeout(timeoutMs) });
  } catch (e) {
    logger?.('miteco.fetch.error', { url, error: e instanceof Error ? e.message : String(e) });
    throw new RetryableSourceError(`MITECO request failed: ${e instanceof Error ? e.message : String(e)}`);
  }
  if (!res.ok) {
    logger?.('miteco.fetch.http_error', { url, status: res.status });
    if (res.status >= 500 || res.status === 429) throw new RetryableSourceError(`MITECO HTTP ${res.status}`);
    throw new MitecoRequestError(`MITECO HTTP ${res.status}`);
  }
  const body = (await res.json()) as Partial<MitecoResponse>;
  if (body.ResultadoConsulta !== 'OK') {
    throw new MitecoRequestError(`MITECO: ${String(body.ResultadoConsulta ?? 'unexpected response shape')}`);
  }
  if (!Array.isArray(body.ListaEESSPrecio) || typeof body.Fecha !== 'string') {
    throw new MitecoRequestError('MITECO: unexpected response shape (no ListaEESSPrecio / Fecha)');
  }
  logger?.('miteco.fetch.done', { url, stations: body.ListaEESSPrecio.length, ms: Date.now() - started });
  return body as MitecoResponse;
}
