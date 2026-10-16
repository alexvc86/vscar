/**
 * Step D1 — adquisición reproducible (no es un import productivo: no escribe en MySQL).
 *
 *   node packages/curation/scripts/d1-acquire.ts [--skip-idae] [--skip-eea] [--only-years=2016,2024]
 *
 * Source → Raw (append-only, SHA-256) → Manifest. Brutos en `<repo>/data/raw/**` (fuera de Git);
 * manifiestos y estadísticas de ejecución en `docs/data/d1/` (en Git).
 * EEA: solo consultas agregadas en servidor, acotadas por Estado miembro (ES), año, marca y nombre comercial.
 */
import { copyFile, mkdir, readFile, stat, writeFile } from 'node:fs/promises';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  EEA_DATASET,
  IDAE_DATASET,
  IDAE_SCHEMA_VERSION,
  buildEeaInventoryQuery,
  buildEeaSurveyQuery,
  buildFileManifest,
  eeaRequestUrl,
  fetchEea,
  readIdaeCsv,
  resolveEeaDataset,
  writeRawIngest,
  type AcquisitionManifest,
} from '@vscar/data-connectors';
import { FAMILIES, SURVEY_YEARS } from '../src/families.ts';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');
const DATA = join(ROOT, 'data');
const RAW = join(DATA, 'raw');
const OUT = join(ROOT, 'docs', 'data', 'd1');
const IDAE_EDITION = '202609';
const args = new Set(process.argv.slice(2));
const onlyYears = process.argv.find((a) => a.startsWith('--only-years='))?.split('=')[1]?.split(',').map(Number);

let peakRss = 0;
const sampler = setInterval(() => (peakRss = Math.max(peakRss, process.memoryUsage().rss)), 200);
const started = Date.now();
const log = (event: string, data: Record<string, unknown> = {}) => console.log(JSON.stringify({ t: new Date().toISOString(), event, ...data }));

const manifests: AcquisitionManifest[] = [];
const runStats: Record<string, unknown>[] = [];
const rel = (p: string) => relative(DATA, p).split('\\').join('/');

async function exists(p: string) {
  return stat(p).then(() => true, () => false);
}

async function acquireIdae() {
  const filename = `idae-historico-${IDAE_EDITION}.csv`;
  const url = IDAE_DATASET.download_url_pattern.replace('{YYYYMM}', IDAE_EDITION);
  const dir = join(RAW, 'idae', IDAE_EDITION);
  const target = join(dir, filename);
  await mkdir(dir, { recursive: true });
  let lastModified: string | undefined;
  let contentType = 'text/csv';
  const retrievedAt = new Date().toISOString();
  if (!(await exists(target))) {
    const legacy = join(DATA, 'd1-download', filename);
    if (await exists(legacy)) {
      await copyFile(legacy, target);
      log('idae.reuse_first_download', { from: rel(legacy) });
    } else {
      const res = await fetch(url, { headers: { 'User-Agent': 'VScar-D1-acquisition (data workstream)' }, signal: AbortSignal.timeout(120_000) });
      if (!res.ok) throw new Error(`IDAE HTTP ${res.status}`);
      lastModified = res.headers.get('last-modified') ?? undefined;
      contentType = res.headers.get('content-type') ?? contentType;
      await writeFile(target, Buffer.from(await res.arrayBuffer()), { flag: 'wx' });
    }
  }
  const head = await fetch(url, { method: 'HEAD', signal: AbortSignal.timeout(60_000) }).catch(() => undefined);
  lastModified ??= head?.headers.get('last-modified') ?? undefined;
  const t0 = Date.now();
  const first = await buildFileManifest({
    absolutePath: target,
    sourceId: 'S02',
    resourceTitle: IDAE_DATASET.name,
    resourceUrl: IDAE_DATASET.landing_url,
    requestUrl: url,
    retrievedAt,
    storedPath: rel(target),
    contentType,
    ...(lastModified ? { sourceLastModified: lastModified } : {}),
    licenseReference: `${IDAE_DATASET.legal_notice_url} (no licence declared on coches.idae.es; legal notice restricts to private use)`,
    rightsStatusAtRetrieval: 'PENDING_REVIEW',
    redistributable: false,
    schemaVersion: IDAE_SCHEMA_VERSION,
    recordCount: 0,
  });
  const read = await readIdaeCsv({ path: target, fileSha256: first.sha256, editionYear: 2026, keep: () => false });
  const manifest = { ...first, recordCount: read.totalRows, notes: `header ${read.schema.schemaVersion}; ${read.widthErrors} rows with wrong width` };
  manifests.push(manifest);
  runStats.push({ step: 'idae', file: manifest.storedPath, bytes: manifest.fileSize, rows: read.totalRows, ms: Date.now() - t0 });
  log('idae.done', { rows: read.totalRows, sha256: manifest.sha256, schema: read.schema.schemaVersion });
}

async function eeaQuery(kind: 'inventory' | 'survey', label: string, year: number, statusPref: 'FINAL_ONLY' | 'PROVISIONAL_ONLY', sql: string) {
  const dataset = resolveEeaDataset(year, statusPref);
  const t0 = Date.now();
  const fetched = await fetchEea(sql, { pageSize: 5000, maxPages: 40, timeoutMs: 300_000 });
  const raw = await writeRawIngest({
    rawDir: RAW,
    sourceCode: EEA_DATASET.source_code,
    sourceFolder: kind === 'inventory' ? 'eea-d1-inventory' : 'eea-d1-survey',
    dataset: { dataset_year: dataset.year, dataset_status: dataset.status, source_table: dataset.table, registry_version: dataset.registry_version },
    query: sql,
    requestUrls: fetched.request_urls,
    rows: fetched.rows,
    retrievedAt: new Date().toISOString(),
    adapterVersion: 'd1-survey-1',
    transformationVersion: 0,
  });
  const manifest = await buildFileManifest({
    absolutePath: raw.file_path,
    sourceId: 'S01',
    resourceTitle: `EEA CO2 passenger cars ${dataset.year} ${dataset.status} — ${kind} ${label} (ES, server-side aggregation)`,
    resourceUrl: EEA_DATASET.metadata_url,
    requestUrl: eeaRequestUrl(sql, 1, 5000),
    retrievedAt: raw.retrieved_at,
    storedPath: rel(raw.file_path),
    contentType: 'application/json',
    licenseReference: `${EEA_DATASET.license} — ${EEA_DATASET.attribution} — ${EEA_DATASET.metadata_url}`,
    rightsStatusAtRetrieval: 'CONDITIONAL',
    redistributable: true,
    schemaVersion: `discodata:${dataset.table}`,
    recordCount: fetched.rows.length,
    notes: `query_hash ${raw.query_hash.slice(0, 16)}; ${raw.deduplicated ? 'deduplicated (same payload already on disk)' : 'new payload'}`,
  });
  manifests.push(manifest);
  const sourceRows = fetched.rows.reduce<number>((s, r) => s + Number((r as Record<string, unknown>).source_rows ?? (r as Record<string, unknown>).rows ?? 0), 0);
  runStats.push({ step: `eea.${kind}`, label, year, table: dataset.table, rows: fetched.rows.length, sourceRows, pages: fetched.request_urls.length, bytes: manifest.fileSize, ms: Date.now() - t0 });
  log(`eea.${kind}`, { label, year, rows: fetched.rows.length, sourceRows, ms: Date.now() - t0 });
}

async function acquireEea() {
  const years = SURVEY_YEARS.filter((y) => !onlyYears || onlyYears.includes(y.year));
  const inventoryYears = [...(onlyYears ? [] : [2012]), ...years.map((y) => y.year)];
  for (const year of inventoryYears) {
    const pref = year === 2025 ? 'PROVISIONAL_ONLY' : 'FINAL_ONLY';
    await eeaQuery('inventory', 'ES', year, pref, buildEeaInventoryQuery('ES', resolveEeaDataset(year, pref)));
  }
  // Una consulta por marca y año (las familias de la misma marca comparten consulta).
  const byMake = new Map<string, { makes: readonly string[]; contains: Set<string>; all: boolean }>();
  for (const f of FAMILIES) {
    const key = [...f.eeaMakes].sort().join('+');
    const e = byMake.get(key) ?? { makes: f.eeaMakes, contains: new Set<string>(), all: false };
    if (f.eeaCnContains.length === 0) e.all = true;
    f.eeaCnContains.forEach((c) => e.contains.add(c));
    byMake.set(key, e);
  }
  const jobs: Array<() => Promise<void>> = [];
  for (const { year } of years) {
    const pref = year === 2025 ? 'PROVISIONAL_ONLY' : 'FINAL_ONLY';
    for (const [key, e] of byMake) {
      const sql = buildEeaSurveyQuery({ memberState: 'ES', makes: e.makes, commercialNameContains: e.all ? [] : [...e.contains].sort() }, resolveEeaDataset(year, pref));
      jobs.push(() => eeaQuery('survey', key, year, pref, sql));
    }
  }
  const failures: string[] = [];
  const workers = Array.from({ length: 2 }, async () => {
    for (let job = jobs.shift(); job; job = jobs.shift()) {
      try {
        await job();
      } catch (e) {
        failures.push(e instanceof Error ? e.message : String(e));
        log('eea.failure', { error: failures.at(-1) });
      }
    }
  });
  await Promise.all(workers);
  if (failures.length) runStats.push({ step: 'eea.failures', failures });
}

await mkdir(OUT, { recursive: true });
if (!args.has('--skip-idae')) await acquireIdae();
if (!args.has('--skip-eea')) await acquireEea();
clearInterval(sampler);

const manifestPath = join(OUT, 'acquisition-manifests.json');
const previous: AcquisitionManifest[] = (await exists(manifestPath)) ? JSON.parse(await readFile(manifestPath, 'utf8')) : [];
const merged = new Map(previous.map((m) => [`${m.sourceId}:${m.sha256}`, m]));
for (const m of manifests) merged.set(`${m.sourceId}:${m.sha256}`, merged.get(`${m.sourceId}:${m.sha256}`) ?? m);
await writeFile(manifestPath, `${JSON.stringify([...merged.values()].sort((a, b) => a.storedPath.localeCompare(b.storedPath)), null, 2)}\n`);
await writeFile(
  join(OUT, `acquisition-run-${new Date().toISOString().slice(0, 10)}.json`),
  `${JSON.stringify({ startedAt: new Date(started).toISOString(), ms: Date.now() - started, peakRssMb: Math.round(peakRss / 1e6), node: process.version, steps: runStats }, null, 2)}\n`,
);
log('done', { ms: Date.now() - started, peakRssMb: Math.round(peakRss / 1e6), manifests: manifests.length });
