import { SpecValue, type Homologation, type ReferenceVariant } from '@vscar/vehicle-schema';
import { sha256, uuidFromHash, writeRawIngest, type RawIngestRecord } from '../raw.ts';
import { fetchEea, type AdapterLogger, type FetchLike } from './client.ts';
import { EEA_DATASET } from './fields.ts';
import { EEA_ADAPTER_VERSION, EEA_MAPPING_VERSION, toCandidateSpecValues } from './map.ts';
import { matchObservations, type HomologationMatchResult } from './match.ts';
import { homologationPowertrainOf, normalizeEeaRows, type EeaObservation, type NormalizationIssue } from './normalize.ts';
import { buildEeaQuery, eeaRequestUrl, type EeaFilters } from './query.ts';
import { resolveEeaDataset, type ResolvedEeaDataset, type StatusPreference } from './resolver.ts';

/**
 * EEA adapter v0.2 — pipeline hasta candidatos DRAFT (Plan §33.2):
 * Source → Raw ingest → Validation → Normalization → (matching) → candidatos para Conflict detection / revisión humana.
 * No escribe en la base de datos: la persistencia es de @vscar/db.
 */
export interface EeaImportTarget {
  variant: ReferenceVariant;
  homologation: Homologation;
}

export interface EeaTargetResult {
  variant_id: string;
  match: HomologationMatchResult;
  candidates: SpecValue[];
  issues: string[];
}

export interface EeaImportResult {
  dataset: ResolvedEeaDataset;
  raw: RawIngestRecord;
  observations: EeaObservation[];
  normalization_issues: NormalizationIssue[];
  targets: EeaTargetResult[];
}

export interface EeaImportOptions {
  year: number;
  statusPreference?: StatusPreference;
  filters: EeaFilters;
  targets: readonly EeaImportTarget[];
  /** Id de la fuente S01 en el registro de fuentes. */
  sourceId: string;
  rawDir: string;
  retrievedAt: string;
  fetchImpl?: FetchLike;
  pageSize?: number;
  timeoutMs?: number;
  baseUrl?: string;
  logger?: AdapterLogger;
}

/** Clave lógica de un import (idempotencia de la cola): eea:<year>:<status>:<query_hash>. */
export function eeaImportKey(year: number, statusPreference: StatusPreference, filters: EeaFilters): string {
  const dataset = resolveEeaDataset(year, statusPreference);
  return `eea:${year}:${dataset.status}:${sha256(buildEeaQuery(filters, dataset)).slice(0, 32)}`;
}

export async function runEeaImport(opts: EeaImportOptions): Promise<EeaImportResult> {
  const dataset = resolveEeaDataset(opts.year, opts.statusPreference ?? 'FINAL_OR_PROVISIONAL');
  const sql = buildEeaQuery(opts.filters, dataset);
  opts.logger?.('eea.import.start', { year: dataset.year, status: dataset.status, table: dataset.table });

  const fetched = await fetchEea(sql, {
    ...(opts.fetchImpl ? { fetchImpl: opts.fetchImpl } : {}),
    ...(opts.pageSize ? { pageSize: opts.pageSize } : {}),
    ...(opts.timeoutMs ? { timeoutMs: opts.timeoutMs } : {}),
    ...(opts.baseUrl ? { baseUrl: opts.baseUrl } : {}),
    ...(opts.logger ? { logger: opts.logger } : {}),
  });
  const raw = await writeRawIngest({
    rawDir: opts.rawDir,
    sourceCode: EEA_DATASET.source_code,
    sourceFolder: 'eea',
    dataset: { dataset_year: dataset.year, dataset_status: dataset.status, source_table: dataset.table, registry_version: dataset.registry_version },
    query: sql,
    requestUrls: fetched.request_urls,
    rows: fetched.rows,
    retrievedAt: opts.retrievedAt,
    adapterVersion: EEA_ADAPTER_VERSION,
    transformationVersion: EEA_MAPPING_VERSION,
  });

  const { observations, issues } = normalizeEeaRows(fetched.rows);
  // La tabla resuelta es de un solo estado: una observación de otro estado sería una mezcla F+P.
  const wrongStatus = observations.filter((o) => (o.status === 'F') !== (dataset.status === 'FINAL'));
  if (wrongStatus.length > 0) {
    issues.push({ kind: 'PROVISIONAL_ONLY', detail: `${wrongStatus.length} observation(s) with a status different from the resolved dataset (${dataset.status})` });
  }
  const sourceUrl = eeaRequestUrl(sql, 1, opts.pageSize ?? 500, opts.baseUrl);

  const targets = opts.targets.map(({ variant, homologation }): EeaTargetResult => {
    const match = matchObservations(homologation, observations, variant.market_code);
    const targetIssues: string[] = [];
    const observedPowertrain = match.observations.length ? homologationPowertrainOf(mergeModes(match.observations)) : undefined;
    if (observedPowertrain && observedPowertrain !== homologation.homologation_powertrain) {
      targetIssues.push(`homologation_powertrain differs: VScar ${homologation.homologation_powertrain} vs EEA ${observedPowertrain}`);
    }
    const raws = toCandidateSpecValues(
      match,
      {
        variant_id: variant.id,
        reference_market: variant.market_code,
        source_id: opts.sourceId,
        source_url: sourceUrl,
        retrieved_at: opts.retrievedAt,
        homologation_powertrain: homologation.homologation_powertrain,
      },
      (key) => uuidFromHash(sha256(`${raw.payload_hash}:${variant.id}:${key}`)),
    );
    // Validación estricta contra el schema v0.2: un candidato inválido es un issue, nunca se "arregla".
    const candidates: SpecValue[] = [];
    for (const c of raws) {
      const parsed = SpecValue.safeParse({ ...c, raw_ingest_id: raw.id });
      if (parsed.success) candidates.push(parsed.data);
      else targetIssues.push(`invalid candidate ${c.spec_key}: ${parsed.error.issues.map((i) => i.message).join('; ')}`);
    }
    return { variant_id: variant.id, match, candidates, issues: [...(match.level === 'NONE' ? match.notes : []), ...targetIssues] };
  });

  opts.logger?.('eea.import.done', { rows: fetched.rows.length, observations: observations.length, deduplicated: raw.deduplicated });
  return { dataset, raw: { ...raw, import_status: 'NORMALIZED' }, observations, normalization_issues: issues, targets };
}

function mergeModes(obs: readonly EeaObservation[]) {
  return { fuel_modes: [...new Set(obs.flatMap((o) => o.fuel_modes))], fuel_types: [...new Set(obs.flatMap((o) => o.fuel_types))] };
}
