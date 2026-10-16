/**
 * Step D1.2 — adquisición complementaria (sin MySQL, sin matrículas):
 *   1. Metadatos oficiales (licencia, titular, fechas) de cada recurso RDW usado → expediente de derechos S11.
 *   2. Denominación comercial RDW (`x5v3-sewk`) para los 20 candidatos D2 (clave exacta TAN + Va + Ve).
 *
 *   node packages/curation/scripts/d12-acquire.ts
 */
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { RDW_DATASETS, RDW_SOURCE, RDW_WITHDRAWALS, buildFileManifest, buildRdwQuery, fetchRdw, rdwRequestUrl, sha256, writeRawIngest, type AcquisitionManifest } from '@vscar/data-connectors';
import { CurationCandidate } from '../src/index.ts';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');
const DATA = join(ROOT, 'data');
const OUT = join(ROOT, 'docs', 'data', 'd12');
const rel = (p: string) => relative(DATA, p).split('\\').join('/');
const started = Date.now();
const manifests: AcquisitionManifest[] = [];

// 1) Metadatos de licencia por recurso usado (+ glosario).
const ids = [...Object.values(RDW_DATASETS).map((d) => d.id), RDW_WITHDRAWALS.id, 'gska-f75a'];
const metaDir = join(DATA, 'raw', 'rdw-metadata', '2026-10-16');
await mkdir(metaDir, { recursive: true });
const licence: Record<string, unknown>[] = [];
for (const id of ids) {
  const url = `https://opendata.rdw.nl/api/views/${id}.json`;
  const res = await fetch(url, { signal: AbortSignal.timeout(60_000) });
  const body = await res.text();
  const file = join(metaDir, `${id}.${sha256(body).slice(0, 12)}.json`);
  await writeFile(file, body);
  const j = JSON.parse(body) as Record<string, unknown> & { license?: { name?: string; termsLink?: string }; rowsUpdatedAt?: number; owner?: { displayName?: string } };
  licence.push({ id, name: j.name, licenseId: j.licenseId, license: j.license?.name, licenseLink: j.license?.termsLink ?? null, attribution: j.attribution ?? null, attributionLink: j.attributionLink ?? null, owner: j.owner?.displayName ?? null, rowsUpdatedAt: j.rowsUpdatedAt ? new Date(j.rowsUpdatedAt * 1000).toISOString() : null, metadataUrl: url, sha256: sha256(body) });
  manifests.push(await buildFileManifest({ absolutePath: file, sourceId: 'S11', resourceTitle: `RDW metadata ${id} — ${String(j.name)}`, resourceUrl: `https://opendata.rdw.nl/d/${id}`, requestUrl: url, retrievedAt: new Date().toISOString(), storedPath: rel(file), contentType: 'application/json', licenseReference: `metadata license field: ${j.license?.name ?? 'n/a'}`, rightsStatusAtRetrieval: 'PENDING_REVIEW', redistributable: true, schemaVersion: 'socrata:views-metadata', recordCount: 1 }));
}

// 2) Denominación comercial RDW para el lote D2.
const shortlist = (await readFile(join(ROOT, 'docs/data/d1/curation_candidates.jsonl'), 'utf8')).trim().split('\n').map((l) => CurationCandidate.parse(JSON.parse(l)));
const d2 = shortlist.filter((c) => c.pilot);
const params = buildRdwQuery('handelsbenaming', d2.map((c) => ({ variant: c.technicalIdentity.variant, version: c.technicalIdentity.version })));
const res = await fetchRdw(RDW_DATASETS.handelsbenaming.id, params, { pageSize: 1000, maxPages: 30 });
const raw = await writeRawIngest({ rawDir: join(DATA, 'raw'), sourceCode: 'S11', sourceFolder: 'rdw', dataset: { dataset_year: 2026, dataset_status: 'SNAPSHOT', source_table: RDW_DATASETS.handelsbenaming.id, registry_version: 'rdw-tgk-2026-10-16' }, query: JSON.stringify(params), requestUrls: res.request_urls, rows: res.rows, retrievedAt: new Date().toISOString(), adapterVersion: 'rdw-0.1.0', transformationVersion: 1 });
manifests.push(await buildFileManifest({ absolutePath: raw.file_path, sourceId: 'S11', resourceTitle: `RDW ${RDW_DATASETS.handelsbenaming.id} — d2-20 handelsbenaming`, resourceUrl: `https://opendata.rdw.nl/d/${RDW_DATASETS.handelsbenaming.id}`, requestUrl: rdwRequestUrl(RDW_DATASETS.handelsbenaming.id, params, 1000, 0), retrievedAt: raw.retrieved_at, storedPath: rel(raw.file_path), contentType: 'application/json', licenseReference: `${RDW_SOURCE.license} — ${RDW_SOURCE.license_url}`, rightsStatusAtRetrieval: 'PENDING_REVIEW', redistributable: true, schemaVersion: `socrata:${RDW_DATASETS.handelsbenaming.id}`, recordCount: res.rows.length }));

await mkdir(OUT, { recursive: true });
await writeFile(join(OUT, 'rdw-licence-metadata.json'), `${JSON.stringify(licence, null, 2)}\n`);
await writeFile(join(OUT, 'acquisition-manifests.json'), `${JSON.stringify(manifests.sort((a, b) => a.storedPath.localeCompare(b.storedPath)), null, 2)}\n`);
console.log(JSON.stringify({ ms: Date.now() - started, manifests: manifests.length, handelsbenamingRows: res.rows.length, licences: licence.map((l) => `${l.id}:${l.license}`) }));
