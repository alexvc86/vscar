/**
 * Step D1 — construcción offline de candidatos (sin red, sin MySQL). Determinista: mismos brutos → mismos ficheros.
 *
 *   node packages/curation/scripts/d1-build.ts
 *
 * Lee los brutos descritos en docs/data/d1/acquisition-manifests.json (verificando su SHA-256), y escribe:
 *   docs/data/d1/curation_candidates.jsonl      lista priorizada (≥ 100 si existen) — Git
 *   docs/data/d1/eea-column-inventory.json      inventario EEA por año (ES) — Git
 *   docs/data/d1/idae-column-inventory.json     inventario IDAE — Git
 *   docs/data/d1/d1-stats.json                  cobertura, identidad, distribución — Git
 *   data/curation/curation_candidates.all.jsonl todos los clústeres (fuera de Git por tamaño)
 */
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadAllCases } from '@vscar/fixtures';
import {
  co2ByCycle,
  groupEeaSurveyRows,
  parseEeaInventory,
  readIdaeCsv,
  readRawPayload,
  verifyFileManifest,
  type AcquisitionManifest,
  type EeaTechnicalGroup,
} from '@vscar/data-connectors';
import { FAMILIES, buildCandidates, bucketOf, selectPilot, selectShortlist, type CurationCandidate } from '../src/index.ts';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');
const DATA = join(ROOT, 'data');
const OUT = join(ROOT, 'docs', 'data', 'd1');
const started = Date.now();
let peakRss = 0;
const sampler = setInterval(() => (peakRss = Math.max(peakRss, process.memoryUsage().rss)), 100);

const manifests: AcquisitionManifest[] = JSON.parse(await readFile(join(OUT, 'acquisition-manifests.json'), 'utf8'));
for (const m of manifests) {
  if (!(await verifyFileManifest(m, join(DATA, m.storedPath)))) throw new Error(`raw file changed since acquisition: ${m.storedPath}`);
}

/* EEA: inventario y encuesta */
const inventory: Record<string, unknown>[] = [];
const groups: EeaTechnicalGroup[] = [];
let eeaSourceRows = 0;
let eeaAggregatedRows = 0;
let eeaRegistrations = 0;
let missingIds = 0;
let missingIdRegistrations = 0;
let bytes = 0;
for (const m of manifests.filter((x) => x.sourceId === 'S01')) {
  bytes += m.fileSize;
  const payload = JSON.parse(await readRawPayload(join(DATA, m.storedPath))) as { dataset: { dataset_year: number; dataset_status: string; source_table: string }; results: Record<string, unknown>[] };
  if (m.storedPath.includes('eea-d1-inventory')) {
    const parsed = parseEeaInventory('ES', { year: payload.dataset.dataset_year }, payload.results[0]!);
    inventory.push({ year: payload.dataset.dataset_year, status: payload.dataset.dataset_status, table: payload.dataset.source_table, rows: parsed.rows, registrations: parsed.registrations, columns: parsed.columns });
  } else {
    const g = groupEeaSurveyRows(payload.results);
    groups.push(...g.groups);
    eeaAggregatedRows += payload.results.length;
    eeaSourceRows += payload.results.reduce((s, r) => s + Number(r.source_rows ?? 0), 0);
    eeaRegistrations += payload.results.reduce((s, r) => s + Number(r.R ?? 0), 0);
    missingIds += g.missingIdentifiers;
    missingIdRegistrations += g.missingIdentifierRegistrations;
  }
}

/* IDAE */
const idaeManifest = manifests.find((m) => m.sourceId === 'S02')!;
bytes += idaeManifest.fileSize;
const idae = await readIdaeCsv({ path: join(DATA, idaeManifest.storedPath), fileSha256: idaeManifest.sha256, editionYear: 2026 });

/* Catálogo existente (9 variants PREVIEW): solo se señala el solapamiento, nunca se modifica. */
const catalog = loadAllCases();
const up = (s?: string) => (s ?? '').trim().toUpperCase().replace(/\s+/g, '');
const curatedExact = new Map<string, string>();
const existing = new Map<string, string>();
for (const h of catalog.homologations) {
  const v = catalog.variants.find((x) => x.homologation_id === h.id);
  if (!h.type_approval_number || !h.variant_code) continue;
  existing.set(`${up(h.type_approval_number)}|${up(h.variant_code)}`, v?.slug ?? h.id);
  if (h.identification_confidence === 'EXACT' && h.version_code) curatedExact.set(`${up(h.type_approval_number)}|${up(h.variant_code)}|${up(h.version_code)}`, `${v?.slug ?? h.id} (Step 4c)`);
}

const { clusters, candidates } = buildCandidates({
  groups,
  idae: idae.records,
  rawSha256: { S01: [...new Set(manifests.filter((m) => m.storedPath.includes('eea-d1-survey')).map((m) => m.sha256))].sort(), S02: [idaeManifest.sha256] },
  curatedExact,
  existingCatalog: existing,
});
const shortlist = selectShortlist(candidates);
const pilot = new Set(selectPilot(shortlist).map((c) => c.candidateId));
const rankOf = new Map(shortlist.map((c, i) => [c.candidateId, i + 1]));
const finalOf = (c: CurationCandidate): CurationCandidate => ({ ...c, shortlisted: rankOf.has(c.candidateId), pilot: pilot.has(c.candidateId), ...(rankOf.has(c.candidateId) ? { rank: rankOf.get(c.candidateId)! } : {}) });
const finalAll = candidates.map(finalOf);
const finalShort = shortlist.map(finalOf);

/* Contraste de semántica IDAE vs EEA (pares enlazados por valores o código) */
const semantics = { pairs: 0, emisionesNedc_matches_eeaWltp: 0, emisionesNedc_matches_eeaNedc: 0, co2MinMax_matches_eeaNedc: 0, co2MinMax_matches_eeaWltp: 0, fuelRange_contains_eeaFc: 0, fuelRange_pairs: 0 };
const byGroupKey = new Map(groups.map((g) => [`${g.year}${g.status}:${g.tan}|${g.variant}|${g.version}`, g]));
for (const c of finalAll) {
  const idaeRefs = new Set(c.sourceRefs.find((s) => s.sourceId === 'S02')?.records ?? []);
  if (!idaeRefs.size) continue;
  const g = byGroupKey.get(c.sourceRefs[0]!.records[0]!);
  if (!g) continue;
  const co2 = co2ByCycle(g);
  for (const r of idae.records.filter((x) => idaeRefs.has(x.sourceRecordId))) {
    semantics.pairs++;
    const within = (v: number | undefined, rg?: { min: number; max: number }) => v !== undefined && rg !== undefined && v >= rg.min - 3 && v <= rg.max + 3;
    if (within(r.unmapped.emisionesNedc, co2.wltp)) semantics.emisionesNedc_matches_eeaWltp++;
    if (within(r.unmapped.emisionesNedc, co2.nedc)) semantics.emisionesNedc_matches_eeaNedc++;
    if (within(r.unmapped.co2Min, co2.nedc) && within(r.unmapped.co2Max, co2.nedc)) semantics.co2MinMax_matches_eeaNedc++;
    if (within(r.unmapped.co2Min, co2.wltp) && within(r.unmapped.co2Max, co2.wltp)) semantics.co2MinMax_matches_eeaWltp++;
    const fc = (g.distributions.Fc ?? []).map(([v]) => v);
    if (fc.length && r.values.fuelWltpMin !== undefined && r.values.fuelWltpMax !== undefined) {
      semantics.fuelRange_pairs++;
      if (fc.every((v) => v >= r.values.fuelWltpMin! - 0.05 && v <= r.values.fuelWltpMax! + 0.05)) semantics.fuelRange_contains_eeaFc++;
    }
  }
}

/* Estadísticas */
const count = <T,>(xs: readonly T[], k: (x: T) => string) => xs.reduce<Record<string, number>>((m, x) => ((m[k(x)] = (m[k(x)] ?? 0) + 1), m), {});
const indicators = (xs: readonly CurationCandidate[]) => ({
  candidates: xs.length,
  identity: count(xs, (c) => c.identityStatus),
  curationStatus: count(xs, (c) => c.curationStatus),
  powertrainBucket: count(xs, bucketOf),
  productClass: count(xs, (c) => c.powertrain.productClass),
  period: count(xs, (c) => c.modelYear.period),
  families: Object.keys(count(xs, (c) => c.familyId)).length,
  withRunningCostEnergyKey: xs.filter((c) => c.specValues.some((v) => ['nrg.fuel_combined_l100', 'nrg.electric_combined_kwh100'].includes(v.specKey)) || c.idaeFieldsPresent.some((f) => f.startsWith('nrg.fuel_combined') || f.startsWith('nrg.electric'))).length,
  withPriceData: 0,
  withDimensionsBoot: 0,
  bevWithRange: xs.filter((c) => bucketOf(c) === 'BEV' && (c.specValues.some((v) => v.specKey === 'rng.electric_combined_km') || c.idaeFieldsPresent.includes('rng.electric_combined_km'))).length,
  bev: xs.filter((c) => bucketOf(c) === 'BEV').length,
  phevWithChargeSustaining: 0,
  phev: xs.filter((c) => bucketOf(c) === 'PHEV').length,
  idaeLinked: xs.filter((c) => c.sourceRefs.some((s) => s.sourceId === 'S02')).length,
  criticalComplete: xs.filter((c) => c.qualitySummary.missingCritical.length === 0).length,
  meanCriticalCompleteness: Math.round((xs.reduce((s, c) => s + c.qualitySummary.criticalCompleteness, 0) / Math.max(1, xs.length)) * 1000) / 1000,
  previewEligibleAfterD1Only: xs.filter((c) => c.rightsSummary.previewEligible).length,
  publicEligible: xs.filter((c) => c.rightsSummary.publicEligible).length,
  pendingRights: xs.filter((c) => c.blockers.rights.length > 0).length,
  overlapsExistingCatalog: xs.filter((c) => c.existingCatalogOverlap).length,
  historicalUpTo2018: xs.filter((c) => c.modelYear.period === '2015–2018').length,
});
const familiesWithCandidates = new Set(finalShort.map((c) => c.familyId));
const stats = {
  generatedFrom: { manifests: manifests.length, idaeSha256: idaeManifest.sha256 },
  acquisition: {
    filesVerified: manifests.length,
    bytes,
    eeaAggregatedRows,
    eeaSourceRowsExamined: eeaSourceRows,
    eeaRegistrationsExamined: eeaRegistrations,
    eeaRowsWithoutIdentifiers: missingIds,
    eeaRegistrationsWithoutIdentifiers: missingIdRegistrations,
    idaeRows: idae.totalRows,
    idaeM1Rows: idae.records.length,
    idaeMainlandM1Rows: idae.records.filter((r) => r.scope === 'MAINLAND').length,
    idaeFilteredOut: idae.filteredOut,
    idaeIssueCounts: idae.issueCounts,
    idaeWidthErrors: idae.widthErrors,
  },
  technicalGroups: groups.length,
  technicalIdentities: new Set(groups.map((g) => `${g.tan}|${g.variant}|${g.version}`)).size,
  clusters: clusters.length,
  all: indicators(finalAll),
  shortlist: indicators(finalShort),
  pilot: indicators(finalShort.filter((c) => c.pilot)),
  familiesWithoutCandidates: FAMILIES.filter((f) => !familiesWithCandidates.has(f.id)).map((f) => f.id),
  perFamily: Object.fromEntries(FAMILIES.map((f) => [f.id, { clusters: finalAll.filter((c) => c.familyId === f.id).length, shortlisted: finalShort.filter((c) => c.familyId === f.id).length, registrations: finalAll.filter((c) => c.familyId === f.id).reduce((s, c) => s + c.registrationsEs.total, 0) }])),
  idaeSemanticsCrossCheck: semantics,
};

await mkdir(join(DATA, 'curation'), { recursive: true });
const jsonl = (xs: readonly CurationCandidate[]) => xs.map((c) => JSON.stringify(c)).join('\n') + '\n';
await writeFile(join(OUT, 'curation_candidates.jsonl'), jsonl(finalShort));
await writeFile(join(DATA, 'curation', 'curation_candidates.all.jsonl'), jsonl(finalAll));
await writeFile(join(OUT, 'eea-column-inventory.json'), `${JSON.stringify(inventory.sort((a, b) => Number(a.year) - Number(b.year)), null, 2)}\n`);
await writeFile(join(OUT, 'idae-column-inventory.json'), `${JSON.stringify({ schema: idae.schema, totalRows: idae.totalRows, columns: idae.profile }, null, 2)}\n`);
await writeFile(join(OUT, 'd1-stats.json'), `${JSON.stringify(stats, null, 2)}\n`);
clearInterval(sampler);
await writeFile(join(OUT, 'build-run.json'), `${JSON.stringify({ ms: Date.now() - started, peakRssMb: Math.round(peakRss / 1e6), node: process.version }, null, 2)}\n`);
console.log(JSON.stringify({ ms: Date.now() - started, peakRssMb: Math.round(peakRss / 1e6), clusters: clusters.length, shortlist: finalShort.length, pilot: pilot.size }));
