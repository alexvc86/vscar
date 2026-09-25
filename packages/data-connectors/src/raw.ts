import { createHash } from 'node:crypto';
import { access, mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { gunzipSync, gzipSync } from 'node:zlib';

/**
 * Raw ingest (Plan §33.1): cada descarga se guarda tal cual en filesystem, append-only:
 * `<rawDir>/<source>/<year>/<status>/<sha256>.json`. En el VPS `rawDir` = C:\vscar\data\raw (nunca en Git).
 * El hash se calcula sobre el contenido (consulta + resultados + dataset), no sobre la hora de descarga:
 * el mismo payload vuelve a caer en el mismo fichero y no se duplica ni se sobrescribe.
 * Payloads grandes (MITECO: ~12 MB/día) se guardan comprimidos (`.json.gz`); el hash es siempre del JSON sin comprimir.
 */
export interface RawDatasetMetadata {
  dataset_year: number;
  /** FINAL/PROVISIONAL: datasets versionados (EEA). SNAPSHOT: foto diaria de una fuente viva (MITECO). */
  dataset_status: 'FINAL' | 'PROVISIONAL' | 'SNAPSHOT';
  source_table: string;
  registry_version: string;
}

export interface RawIngestRecord extends RawDatasetMetadata {
  id: string;
  source_code: string;
  /** Hash SHA-256 de la consulta (identidad lógica de la petición). */
  query_hash: string;
  /** Alias corto de `query_hash` (compatibilidad con la tabla raw_ingest v0.1). */
  external_id: string;
  original_filename: string;
  file_path: string;
  payload_hash: string;
  retrieved_at: string;
  row_count: number;
  adapter_version: string;
  transformation_version: number;
  import_status: 'FETCHED' | 'NORMALIZED' | 'IMPORTED' | 'FAILED';
  /** `true` si el payload ya existía en disco (misma respuesta de la fuente). */
  deduplicated: boolean;
  request: { query: string; request_urls: string[] };
}

export const sha256 = (s: string) => createHash('sha256').update(s).digest('hex');

export function uuidFromHash(hex: string): string {
  const variant = ((parseInt(hex.slice(16, 18), 16) & 0x3f) | 0x80).toString(16).padStart(2, '0');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-5${hex.slice(13, 16)}-${variant}${hex.slice(18, 20)}-${hex.slice(20, 32)}`;
}

const exists = (p: string) => access(p).then(() => true, () => false);

export async function writeRawIngest(params: {
  rawDir: string;
  sourceCode: string;
  sourceFolder: string;
  dataset: RawDatasetMetadata;
  query: string;
  requestUrls: string[];
  rows: unknown[];
  retrievedAt: string;
  adapterVersion: string;
  transformationVersion: number;
  /** Campos de la respuesta fuera de las filas (p. ej. fecha y nota de MITECO). Se conservan en el bruto. */
  responseMeta?: Record<string, unknown>;
  compress?: boolean;
}): Promise<RawIngestRecord> {
  // Contenido canónico: sin fecha de descarga (va a los metadatos de raw_ingest).
  const payload = JSON.stringify(
    { source: params.sourceCode, dataset: params.dataset, query: params.query, response_meta: params.responseMeta, results: params.rows },
    null,
    2,
  );
  const payload_hash = sha256(payload);
  const query_hash = sha256(params.query);
  const status = params.dataset.dataset_status.toLowerCase();
  const dir = join(params.rawDir, params.sourceFolder, String(params.dataset.dataset_year), status);
  const original_filename = `${payload_hash}.json${params.compress ? '.gz' : ''}`;
  const file_path = join(dir, original_filename);

  await mkdir(dir, { recursive: true });
  const deduplicated = await exists(file_path);
  if (!deduplicated) {
    // Escritura atómica: fichero temporal + rename; nunca se sobrescribe un bruto existente.
    const tmp = `${file_path}.${process.pid}.tmp`;
    await writeFile(tmp, params.compress ? gzipSync(payload) : payload, params.compress ? { flag: 'wx' } : { encoding: 'utf8', flag: 'wx' });
    await rename(tmp, file_path);
  }
  return {
    id: uuidFromHash(payload_hash),
    source_code: params.sourceCode,
    query_hash,
    external_id: query_hash.slice(0, 16),
    original_filename,
    file_path,
    payload_hash,
    retrieved_at: params.retrievedAt,
    row_count: params.rows.length,
    adapter_version: params.adapterVersion,
    transformation_version: params.transformationVersion,
    import_status: 'FETCHED',
    deduplicated,
    request: { query: params.query, request_urls: params.requestUrls },
    ...params.dataset,
  };
}

/** Verifica que el fichero bruto no ha cambiado desde la ingestión (auditoría). */
export async function verifyRawIngest(record: Pick<RawIngestRecord, 'file_path' | 'payload_hash'>): Promise<boolean> {
  return sha256(await readRawPayload(record.file_path)) === record.payload_hash;
}

/** Lee el JSON bruto (descomprime `.json.gz`). */
export async function readRawPayload(filePath: string): Promise<string> {
  const buf = await readFile(filePath);
  return (filePath.endsWith('.gz') ? gunzipSync(buf) : buf).toString('utf8');
}
