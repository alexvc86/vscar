import { EnergyPriceObservation } from '@vscar/vehicle-schema';
import type { AdapterLogger, FetchLike } from '../eea/client.ts';
import { sha256, uuidFromHash, writeRawIngest, type RawIngestRecord } from '../raw.ts';
import { MitecoRequestError, fetchMiteco, mitecoDateParam, mitecoHistoryUrl } from './client.ts';
import { MITECO_ADAPTER_VERSION, MITECO_DATASET, MITECO_PRODUCT_FIELDS, MITECO_TRANSFORMATION_VERSION } from './fields.ts';
import { aggregateMitecoPrices, normalizeMitecoStations, type MitecoNormalizationIssue } from './normalize.ts';

/**
 * MITECO adapter v0.1 (Step 4e): histórico diario → raw ingest (.json.gz) → estaciones normalizadas →
 * agregados por ámbito → `EnergyPriceObservation` validadas. No escribe en la base de datos.
 */
export interface MitecoImportOptions {
  /** Día (`YYYY-MM-DD`, hora peninsular) cuyos precios en vigor a las 0:00 se importan. */
  date: string;
  /**
   * Solo estas provincias (INE). Un subconjunto nunca produce agregados TAX_ZONE ni REGION
   * (serían parciales): solo PROVINCE. Sin filtro = nacional (producción).
   */
  provinces?: readonly string[];
  sourceId: string;
  rawDir: string;
  retrievedAt: string;
  fetchImpl?: FetchLike;
  timeoutMs?: number;
  baseUrl?: string;
  logger?: AdapterLogger;
}

export interface MitecoImportResult {
  raw: RawIngestRecord;
  observed_at: string;
  stations_total: number;
  stations_public: number;
  observations: EnergyPriceObservation[];
  normalization_issues: MitecoNormalizationIssue[];
  invalid: string[];
}

/** Día más reciente publicado en el histórico: ayer en Europe/Madrid. */
export function mitecoLatestAvailableDate(now: Date = new Date()): string {
  const today = new Intl.DateTimeFormat('en-CA', { timeZone: MITECO_DATASET.source_timezone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(now);
  const d = new Date(`${today}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() - 1);
  return d.toISOString().slice(0, 10);
}

function logicalQuery(date: string, provinces?: readonly string[]): string {
  mitecoDateParam(date);
  const p = provinces?.length ? [...new Set(provinces)].sort().join(',') : 'ALL';
  return `EstacionesTerrestresHist date=${date} provinces=${p}`;
}

/** Clave de idempotencia de la cola: miteco:<date>:<scope>:t<transformation_version>. */
export function mitecoImportKey(date: string, provinces?: readonly string[]): string {
  return `miteco:${date}:${sha256(logicalQuery(date, provinces)).slice(0, 16)}:t${MITECO_TRANSFORMATION_VERSION}`;
}

export async function runMitecoImport(opts: MitecoImportOptions): Promise<MitecoImportResult> {
  const query = logicalQuery(opts.date, opts.provinces);
  const provinces = opts.provinces?.length ? [...new Set(opts.provinces)].sort() : undefined;
  const urls = provinces ? provinces.map((p) => mitecoHistoryUrl(opts.date, p, opts.baseUrl)) : [mitecoHistoryUrl(opts.date, undefined, opts.baseUrl)];
  opts.logger?.('miteco.import.start', { date: opts.date, provinces: provinces ?? 'ALL' });

  const responses = [];
  for (const url of urls) {
    responses.push(
      await fetchMiteco(url, {
        ...(opts.fetchImpl ? { fetchImpl: opts.fetchImpl } : {}),
        ...(opts.timeoutMs ? { timeoutMs: opts.timeoutMs } : {}),
        ...(opts.logger ? { logger: opts.logger } : {}),
      }),
    );
  }
  const fechas = new Set(responses.map((r) => r.Fecha));
  if (fechas.size !== 1) throw new MitecoRequestError(`MITECO: responses for different timestamps ${JSON.stringify([...fechas])}`);
  const fecha = responses[0]!.Fecha!;
  const stations = responses.flatMap((r) => r.ListaEESSPrecio);

  const raw = await writeRawIngest({
    rawDir: opts.rawDir,
    sourceCode: MITECO_DATASET.source_code,
    sourceFolder: 'miteco',
    dataset: { dataset_year: Number(opts.date.slice(0, 4)), dataset_status: 'SNAPSHOT', source_table: `EstacionesTerrestresHist/${mitecoDateParam(opts.date)}`, registry_version: MITECO_ADAPTER_VERSION },
    query,
    requestUrls: urls,
    rows: stations,
    responseMeta: { Fecha: fecha, Nota: responses[0]!.Nota ?? null, ResultadoConsulta: 'OK', responses: responses.length },
    retrievedAt: opts.retrievedAt,
    adapterVersion: MITECO_ADAPTER_VERSION,
    transformationVersion: MITECO_TRANSFORMATION_VERSION,
    compress: true,
  });

  const snapshot = normalizeMitecoStations(fecha, stations);
  if (snapshot.observed_at.slice(0, 10) !== opts.date) {
    throw new MitecoRequestError(`MITECO: requested ${opts.date} but the source returned ${snapshot.observed_at}`);
  }
  const aggregates = aggregateMitecoPrices(snapshot.prices, snapshot.excluded).filter((a) => !provinces || a.scope_type === 'PROVINCE');

  const observations: EnergyPriceObservation[] = [];
  const invalid: string[] = [];
  for (const a of aggregates) {
    const parsed = EnergyPriceObservation.safeParse({
      id: uuidFromHash(sha256(`${raw.payload_hash}:${a.product}:${a.scope_type}:${a.scope_code}:MEDIAN:${MITECO_TRANSFORMATION_VERSION}`)),
      market_code: 'ES',
      energy_product: a.product,
      price_basis: 'RETAIL_PUMP_PRICE',
      scope_type: a.scope_type,
      scope_code: a.scope_code,
      price_date: opts.date,
      observed_at: snapshot.observed_at,
      source_timezone: MITECO_DATASET.source_timezone,
      statistic: 'MEDIAN',
      value: a.median,
      unit: 'EUR_PER_L',
      currency: 'EUR',
      taxes: 'INCLUDED',
      aggregation_method: 'UNWEIGHTED_STATION_MEDIAN',
      distribution: { n: a.n, p25: a.p25, p75: a.p75, min: a.min, max: a.max, excluded_restricted: a.excluded_restricted, excluded_implausible: a.excluded_implausible },
      source_authority: 'CALCULATED',
      derived_from_authority: 'OFFICIAL_AUTHORITY',
      source_id: opts.sourceId,
      source_url: urls[0],
      provisional: true,
      retrieved_at: opts.retrievedAt,
      raw_ingest_id: raw.id,
      external_field: MITECO_PRODUCT_FIELDS[a.product],
      adapter_version: MITECO_ADAPTER_VERSION,
      transformation_version: MITECO_TRANSFORMATION_VERSION,
    });
    if (parsed.success) observations.push(parsed.data);
    else invalid.push(`${a.product} ${a.scope_type}:${a.scope_code}: ${parsed.error.issues.map((i) => i.message).join('; ')}`);
  }

  opts.logger?.('miteco.import.done', {
    stations: stations.length,
    observations: observations.length,
    issues: snapshot.issues.length,
    invalid: invalid.length,
    deduplicated: raw.deduplicated,
  });
  return {
    raw: { ...raw, import_status: 'NORMALIZED' },
    observed_at: snapshot.observed_at,
    stations_total: snapshot.stations_total,
    stations_public: snapshot.stations_public,
    observations,
    normalization_issues: snapshot.issues,
    invalid,
  };
}
