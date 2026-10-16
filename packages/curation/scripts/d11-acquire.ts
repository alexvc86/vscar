/**
 * Step D1.1 — adquisición RDW (S11) + GIAVEH (S12). Sin MySQL, sin matrículas.
 *
 *   node packages/curation/scripts/d11-acquire.ts
 *
 * RDW: una consulta SoQL por conjunto TGK con los pares (Va, Ve) del piloto (≤ 25 pares por consulta) y, para estimar
 * la expansión, consultas acotadas de Basis + Energiebron por los 100 candidatos (lotes de 25). Respuestas en
 * `data/raw/rdw/**` (append-only, SHA-256), manifiestos en `docs/data/d11/`.
 * GIAVEH: el CSV oficial ya descargado (`data/raw/giaveh/2023-08-31/`) se registra con manifiesto; dos llamadas
 * a la API para documentar su contenido (sin bucles: la API declara 429).
 */
import { readFile, stat, writeFile, mkdir } from 'node:fs/promises';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  GIAVEH_DATASET,
  RDW_DATASETS,
  RDW_SOURCE,
  RDW_WITHDRAWALS,
  buildFileManifest,
  buildRdwQuery,
  buildRdwWithdrawalQuery,
  fetchRdw,
  rdwRequestUrl,
  readGiavehCsv,
  sha256,
  writeRawIngest,
  type AcquisitionManifest,
  type RdwDatasetName,
} from '@vscar/data-connectors';
import { CurationCandidate } from '../src/index.ts';

export const PILOT_RANKS = [3, 1, 2, 4, 76, 77, 55, 8, 73, 81] as const;

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');
const DATA = join(ROOT, 'data');
const RAW = join(DATA, 'raw');
const OUT = join(ROOT, 'docs', 'data', 'd11');
const rel = (p: string) => relative(DATA, p).split('\\').join('/');
const log = (event: string, data: Record<string, unknown> = {}) => console.log(JSON.stringify({ t: new Date().toISOString(), event, ...data }));
let peakRss = 0;
const sampler = setInterval(() => (peakRss = Math.max(peakRss, process.memoryUsage().rss)), 200);
const started = Date.now();

const shortlist = (await readFile(join(ROOT, 'docs/data/d1/curation_candidates.jsonl'), 'utf8')).trim().split('\n').map((l) => CurationCandidate.parse(JSON.parse(l)));
const pilot = PILOT_RANKS.map((r) => shortlist.find((c) => c.rank === r)!);
const manifests: AcquisitionManifest[] = [];
const steps: Record<string, unknown>[] = [];

async function rdw(label: string, datasetId: string, params: Record<string, string>) {
  const t0 = Date.now();
  const res = await fetchRdw(datasetId, params, { pageSize: 1000, maxPages: 30, logger: (e, d) => log(e, d) });
  const raw = await writeRawIngest({
    rawDir: RAW,
    sourceCode: RDW_SOURCE.source_code,
    sourceFolder: 'rdw',
    dataset: { dataset_year: 2026, dataset_status: 'SNAPSHOT', source_table: datasetId, registry_version: 'rdw-tgk-2026-10-16' },
    query: JSON.stringify(params),
    requestUrls: res.request_urls,
    rows: res.rows,
    retrievedAt: new Date().toISOString(),
    adapterVersion: 'rdw-0.1.0',
    transformationVersion: 1,
  });
  manifests.push(
    await buildFileManifest({
      absolutePath: raw.file_path,
      sourceId: 'S11',
      resourceTitle: `RDW ${datasetId} — ${label}`,
      resourceUrl: `https://opendata.rdw.nl/d/${datasetId}`,
      requestUrl: rdwRequestUrl(datasetId, params, 1000, 0),
      retrievedAt: raw.retrieved_at,
      storedPath: rel(raw.file_path),
      contentType: 'application/json',
      licenseReference: `${RDW_SOURCE.license} — ${RDW_SOURCE.license_url} — opendata.rdw.nl/api/views/${datasetId}.json (license "Public Domain")`,
      rightsStatusAtRetrieval: 'PENDING_REVIEW',
      redistributable: true,
      schemaVersion: `socrata:${datasetId}`,
      recordCount: res.rows.length,
      notes: `query_hash ${sha256(JSON.stringify(params)).slice(0, 16)}; rate-limited ${res.rateLimited}×`,
    }),
  );
  steps.push({ step: 'rdw', label, datasetId, rows: res.rows.length, pages: res.request_urls.length, rateLimited: res.rateLimited, ms: Date.now() - t0 });
  log('rdw.done', { label, datasetId, rows: res.rows.length, ms: Date.now() - t0 });
}

const keysOf = (cs: readonly CurationCandidate[]) => cs.map((c) => ({ variant: c.technicalIdentity.variant, version: c.technicalIdentity.version }));

// 1) Piloto: todos los conjuntos TGK.
for (const name of Object.keys(RDW_DATASETS) as RdwDatasetName[]) await rdw(`pilot-10 ${name}`, RDW_DATASETS[name].id, buildRdwQuery(name, keysOf(pilot)));
await rdw('pilot-10 withdrawals', RDW_WITHDRAWALS.id, buildRdwWithdrawalQuery([...new Set(pilot.map((c) => c.technicalIdentity.typeApprovalNumber))]));

// 2) Expansión: Basis + Energiebron de los 100 (lotes de 25 pares).
for (let i = 0; i < shortlist.length; i += 25) {
  const batch = shortlist.slice(i, i + 25);
  for (const name of ['basis', 'energiebron'] as const) await rdw(`expansion ${i + 1}-${i + batch.length} ${name}`, RDW_DATASETS[name].id, buildRdwQuery(name, keysOf(batch)));
}

// 3) GIAVEH: CSV oficial + una llamada a la API (documentación del contenido).
const giavehCsv = join(RAW, 'giaveh', '2023-08-31', 'Consulta Fichas Reducidas.csv');
const giaveh = await readGiavehCsv({ path: giavehCsv });
manifests.push(
  await buildFileManifest({
    absolutePath: giavehCsv,
    sourceId: 'S12',
    resourceTitle: GIAVEH_DATASET.name,
    resourceUrl: GIAVEH_DATASET.catalog_url,
    requestUrl: GIAVEH_DATASET.csv_url,
    retrievedAt: (await stat(giavehCsv)).mtime.toISOString(),
    storedPath: rel(giavehCsv),
    contentType: 'text/csv',
    sourceLastModified: 'Thu, 31 Aug 2023 01:02:43 GMT',
    licenseReference: `${GIAVEH_DATASET.license_url} (art. 8 Ley 37/2007: no alterar, no desnaturalizar, citar fuente y fecha)`,
    rightsStatusAtRetrieval: 'PENDING_REVIEW',
    redistributable: false,
    schemaVersion: 'giaveh-fichas-reducidas-csv-5col',
    recordCount: giaveh.rows,
    notes: 'columns: Num F.R., Contraseña, Tipo, Fabricante, Marcas — no Va/Ve, no technical data; Fabricante not persisted (natural persons)',
  }),
);
// Dos sondas: por contraseña (con `*`: el servicio devuelve 500) y por marca (paginada, 3 registros).
for (const [apiUrl, probe] of [
  [`https://web.serviciosmin.gob.es/datosabiertosapi/GIAVEH/GetFichasReducidas?contrasenaHomologacion=${encodeURIComponent('e1*2007/46*0623*35')}`, 'by contrasena (Golf e1*2007/46*0623*35)'],
  ['https://web.serviciosmin.gob.es/datosabiertosapi/GIAVEH/GetFichasReducidas?marca=VOLKSWAGEN&numeroPagina=1&registrosPorPagina=3', 'by marca (3 records, page 1)'],
] as const) try {
  const r = await fetch(apiUrl, { signal: AbortSignal.timeout(60_000), headers: { Accept: 'application/json' } });
  const body = await r.text();
  const dir = join(RAW, 'giaveh', 'api');
  await mkdir(dir, { recursive: true });
  const file = join(dir, `${sha256(body)}.json`);
  await writeFile(file, body);
  manifests.push(await buildFileManifest({ absolutePath: file, sourceId: 'S12', resourceTitle: `GIAVEH API GetFichasReducidas — probe ${probe}`, resourceUrl: GIAVEH_DATASET.api_url, requestUrl: apiUrl, retrievedAt: new Date().toISOString(), storedPath: rel(file), contentType: r.headers.get('content-type') ?? 'application/json', licenseReference: GIAVEH_DATASET.license_url, rightsStatusAtRetrieval: 'PENDING_REVIEW', redistributable: false, schemaVersion: 'giaveh-api-FichaReducida', recordCount: 0, notes: `HTTP ${r.status}` }));
  steps.push({ step: 'giaveh.api', probe, status: r.status, bytes: body.length });
} catch (e) {
  steps.push({ step: 'giaveh.api', probe, error: e instanceof Error ? e.message : String(e) });
}

clearInterval(sampler);
await mkdir(OUT, { recursive: true });
await writeFile(join(OUT, 'acquisition-manifests.json'), `${JSON.stringify(manifests.sort((a, b) => a.storedPath.localeCompare(b.storedPath)), null, 2)}\n`);
await writeFile(join(OUT, 'acquisition-run.json'), `${JSON.stringify({ ms: Date.now() - started, peakRssMb: Math.round(peakRss / 1e6), node: process.version, steps }, null, 2)}\n`);
log('done', { ms: Date.now() - started, manifests: manifests.length, peakRssMb: Math.round(peakRss / 1e6) });
