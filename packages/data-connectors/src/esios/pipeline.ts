import { EnergyPriceObservation } from '@vscar/vehicle-schema';
import type { AdapterLogger, FetchLike } from '../eea/client.ts';
import { sha256, uuidFromHash, writeRawIngest, type RawIngestRecord } from '../raw.ts';
import { addDays, isValidIsoDate, localDate } from '../time.ts';
import { EsiosNotAvailableError, EsiosRequestError, esiosPvpcUrl, fetchEsiosPvpc } from './client.ts';
import { ESIOS_ADAPTER_VERSION, ESIOS_DATASET, ESIOS_TRANSFORMATION_VERSION } from './fields.ts';
import { normalizePvpcDay, type EsiosNormalizationIssue, type PvpcHour } from './normalize.ts';

/**
 * ESIOS adapter v0.1 (Step 4f): fichero PVPC de un día → raw ingest → horas normalizadas (internas) →
 * media diaria por zona tarifaria → `EnergyPriceObservation` validadas. No escribe en la base de datos.
 */
export interface EsiosImportOptions {
  /** Día local (Europe/Madrid). */
  date: string;
  sourceId: string;
  rawDir: string;
  retrievedAt: string;
  /** Token personal opcional (`ESIOS_TOKEN`). Nunca se registra, ni en la URL, ni en el bruto, ni en errores. */
  token?: string;
  fetchImpl?: FetchLike;
  timeoutMs?: number;
  baseUrl?: string;
  logger?: AdapterLogger;
  now?: Date;
}

export interface EsiosImportResult {
  raw: RawIngestRecord;
  expected_hours: number;
  /** Precios horarios (uso interno; el producto Alpha usa la media diaria). */
  hours: PvpcHour[];
  observations: EnergyPriceObservation[];
  normalization_issues: EsiosNormalizationIssue[];
  invalid: string[];
}

/** Clave de idempotencia de la cola: esios:<date>:pvpc:t<transformation_version>. */
export function esiosImportKey(date: string): string {
  if (!isValidIsoDate(date)) throw new EsiosRequestError(`invalid date: ${JSON.stringify(date)}`);
  return `esios:${date}:pvpc:t${ESIOS_TRANSFORMATION_VERSION}`;
}

/** Último día que puede existir: mañana en Europe/Madrid (el PVPC de D se publica en D-1 por la tarde). */
export function esiosLatestPossibleDate(now: Date = new Date()): string {
  return addDays(localDate(now.getTime()), 1);
}

export async function runEsiosImport(opts: EsiosImportOptions): Promise<EsiosImportResult> {
  const url = esiosPvpcUrl(opts.date, opts.baseUrl);
  if (opts.date < ESIOS_DATASET.first_supported_date) {
    throw new EsiosRequestError(`ESIOS PVPC 2.0TD starts on ${ESIOS_DATASET.first_supported_date}`);
  }
  const latest = esiosLatestPossibleDate(opts.now);
  if (opts.date > latest) throw new EsiosNotAvailableError(`NOT_AVAILABLE_YET: PVPC for ${opts.date} cannot be published before ${addDays(opts.date, -1)} (latest possible: ${latest})`);
  opts.logger?.('esios.import.start', { date: opts.date });

  const rows = await fetchEsiosPvpc(url, {
    ...(opts.fetchImpl ? { fetchImpl: opts.fetchImpl } : {}),
    ...(opts.timeoutMs ? { timeoutMs: opts.timeoutMs } : {}),
    ...(opts.logger ? { logger: opts.logger } : {}),
    ...(opts.token ? { token: opts.token } : {}),
  });

  const raw = await writeRawIngest({
    rawDir: opts.rawDir,
    sourceCode: ESIOS_DATASET.source_code,
    sourceFolder: 'esios',
    dataset: { dataset_year: Number(opts.date.slice(0, 4)), dataset_status: 'SNAPSHOT', source_table: `archives/${ESIOS_DATASET.archive_id}/${opts.date}`, registry_version: ESIOS_ADAPTER_VERSION },
    query: `archives/${ESIOS_DATASET.archive_id} date=${opts.date}`,
    requestUrls: [url],
    rows,
    responseMeta: { archive_id: ESIOS_DATASET.archive_id },
    retrievedAt: opts.retrievedAt,
    adapterVersion: ESIOS_ADAPTER_VERSION,
    transformationVersion: ESIOS_TRANSFORMATION_VERSION,
  });

  const day = normalizePvpcDay(opts.date, rows);
  const observations: EnergyPriceObservation[] = [];
  const invalid: string[] = [];
  for (const s of day.daily) {
    const parsed = EnergyPriceObservation.safeParse({
      id: uuidFromHash(sha256(`${raw.payload_hash}:ELECTRICITY:TARIFF_ZONE:${s.zone}:MEAN:${ESIOS_TRANSFORMATION_VERSION}`)),
      market_code: 'ES',
      energy_product: 'ELECTRICITY',
      price_basis: 'PVPC_ENERGY_TERM',
      scope_type: 'TARIFF_ZONE',
      scope_code: s.zone,
      price_date: opts.date,
      observed_at: `${opts.date}T00:00:00`,
      source_timezone: ESIOS_DATASET.source_timezone,
      statistic: 'MEAN',
      value: s.mean,
      unit: 'EUR_PER_KWH',
      currency: 'EUR',
      taxes: 'EXCLUDED',
      aggregation_method: 'HOURLY_ARITHMETIC_MEAN',
      distribution: { n: s.n, min: s.min, max: s.max, excluded_restricted: 0, excluded_implausible: 0 },
      source_authority: 'CALCULATED',
      derived_from_authority: 'OFFICIAL_AUTHORITY',
      source_id: opts.sourceId,
      source_url: url,
      provisional: false,
      retrieved_at: opts.retrievedAt,
      raw_ingest_id: raw.id,
      external_field: s.external_field,
      adapter_version: ESIOS_ADAPTER_VERSION,
      transformation_version: ESIOS_TRANSFORMATION_VERSION,
    });
    if (parsed.success) observations.push(parsed.data);
    else invalid.push(`${s.zone}: ${parsed.error.issues.map((i) => i.message).join('; ')}`);
  }
  opts.logger?.('esios.import.done', { date: opts.date, hours: rows.length, observations: observations.length, issues: day.issues.length, invalid: invalid.length, deduplicated: raw.deduplicated });
  return { raw: { ...raw, import_status: 'NORMALIZED' }, expected_hours: day.expected_hours, hours: day.hours, observations, normalization_issues: day.issues, invalid };
}
