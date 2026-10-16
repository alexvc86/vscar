/**
 * Step D1.3 — construcción offline (sin red, sin MySQL, determinista). No modifica artefactos D1–D1.2.
 *
 *   node packages/curation/scripts/d13-build.ts
 *
 * Flujo A (fuente autorizada): Traficom (S13, CC BY 4.0) — ZIP oficial verificado por SHA-256, agregado SOLO por las 100
 * claves técnicas exactas (TAN completo + Va + Ve); nunca se leen campos de vehículo individual.
 * Flujo B (coches.net, km77, JATO): sin adquisición; solo el artefacto de referencias `d13/catalog-references-v1.json`
 * (URL + presencia de campos + estado de correspondencia), validado aquí.
 *
 * Salidas en docs/data/d13/: acquisition-manifests.json · traficom-aggregates.json · catalog-references-validation.json ·
 * d2-readiness.json · build-run.json
 */
import { readFile, writeFile } from 'node:fs/promises';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { TRAFICOM_DATASET, aggregateTraficom, buildFileManifest, listZipEntries, openZipEntry, traficomBody, traficomKey, traficomTransmission, type AcquisitionManifest } from '@vscar/data-connectors';
import { CatalogReferenceArtifact, CommercialIdentityArtifact, CurationCandidate, validateCatalogReference } from '../src/index.ts';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');
const DATA = join(ROOT, 'data');
const OUT = join(ROOT, 'docs', 'data', 'd13');
const rel = (p: string) => relative(DATA, p).split('\\').join('/');
const started = Date.now();
let peakRss = 0;
const sampler = setInterval(() => (peakRss = Math.max(peakRss, process.memoryUsage().rss)), 200);

/* Flujo A — manifiestos (el ZIP y su documentación se descargaron una vez, `data/raw/traficom/`). */
const zip = join(DATA, 'raw', 'traficom', '2026-07-30', 'Ajoneuvorekisteri.zip');
const docs = ['Ajoneuvotiedot_avoin_data_luokitukset_24.03.2026.xlsx', 'Aineistokuvaus.pdf'].map((f) => join(DATA, 'raw', 'traficom', 'docs', f));
const manifests: AcquisitionManifest[] = [];
const common = { sourceId: 'S13', licenseReference: `${TRAFICOM_DATASET.license} — ${TRAFICOM_DATASET.license_url} — ${TRAFICOM_DATASET.catalog_url} (CKAN license_id cc-by-4.0)`, rightsStatusAtRetrieval: 'PENDING_REVIEW' as const, redistributable: true };
manifests.push(await buildFileManifest({ ...common, absolutePath: zip, resourceTitle: `${TRAFICOM_DATASET.name} — TieliikenneAvoinData_30_06_2026.csv (zip)`, resourceUrl: TRAFICOM_DATASET.catalog_url, requestUrl: TRAFICOM_DATASET.download_url, retrievedAt: '2026-10-16T19:57:00.000Z', storedPath: rel(zip), contentType: 'application/x-zip-compressed', sourceLastModified: 'Thu, 30 Jul 2026 10:49:55 GMT', schemaVersion: 'traficom-avoin-data-2026-06-30', recordCount: 0, notes: 'one CSV entry (961,331,037 B, ISO-8859-1, ";"); per-vehicle rows — VScar keeps only aggregates by exact key' }));
for (const d of docs) manifests.push(await buildFileManifest({ ...common, absolutePath: d, resourceTitle: `Traficom open data documentation — ${d.split(/[\\/]/).pop()}`, resourceUrl: 'https://tieto.traficom.fi/en/open-data', retrievedAt: '2026-10-16T20:02:00.000Z', storedPath: rel(d), contentType: d.endsWith('.pdf') ? 'application/pdf' : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', schemaVersion: 'traficom-docs', recordCount: 0 }));

/* Agregación Traficom de las 100 claves. */
const shortlist = (await readFile(join(ROOT, 'docs/data/d1/curation_candidates.jsonl'), 'utf8')).trim().split('\n').map((l) => CurationCandidate.parse(JSON.parse(l)));
const keyOf = (c: CurationCandidate) => traficomKey(c.technicalIdentity.typeApprovalNumber, c.technicalIdentity.variant, c.technicalIdentity.version);
const keys = new Set(shortlist.map(keyOf));
const [entry] = await listZipEntries(zip);
const t0 = Date.now();
const agg = await aggregateTraficom(await openZipEntry(zip, entry!), keys);
const traficomMs = Date.now() - t0;
manifests[0]!.recordCount = agg.rows;
const aggregates = [...agg.aggregates.values()].sort((a, b) => a.key.localeCompare(b.key));

/* Flujo B — referencias de catálogos (sin valores). */
const refs = CatalogReferenceArtifact.parse(JSON.parse(await readFile(join(OUT, 'catalog-references-v1.json'), 'utf8')));
const refValidation = refs.references.map((r) => ({ rank: r.rank, site: r.site, url: r.url, status: r.matchStatus, issues: validateCatalogReference(r) }));

/* D2 (20): estado D1.3, sin cambiar criterios. */
const d12 = CommercialIdentityArtifact.parse(JSON.parse(await readFile(join(ROOT, 'docs/data/d12/commercial-identity-v1.json'), 'utf8')));
const d12batch = JSON.parse(await readFile(join(ROOT, 'docs/data/d12/d2-batch-readiness.json'), 'utf8')) as Array<{ rank: number; technicalCorroboration: string; commercialIdentity: string; criticalCompleteness: { afterRdw: number }; conflictStatus: string; catalogOverlap: Array<{ kind: string }> }>;
const readiness = shortlist
  .filter((c) => c.pilot)
  .map((c) => {
    const b = d12batch.find((x) => x.rank === c.rank)!;
    const cur = d12.entries.find((e) => e.rank === c.rank);
    const a = agg.aggregates.get(keyOf(c));
    const tx = c.powertrain.productClass === 'BEV' ? { value: 'single_speed' as const, reason: 'BEV: RDW 1 gear (D1.1)' } : traficomTransmission(a);
    const body = c.familyId === 'byd-seal' ? { value: 'sedan' as const, reason: 'RDW EU body code AA (D1.1)' } : traficomBody(a);
    const catalog = refs.references.filter((r) => r.rank === c.rank);
    const blockers = {
      identity: ['generation_code: no reusable evidence', 'model_year: no reusable evidence', ...(cur?.commercialTrim ? [] : ['trim: not evidenced by a reusable source']), ...(tx.value ? [] : [`transmission: ${tx.reason}`]), ...(body.value ? [] : [`body_type: ${body.reason}`])],
      data: ['cap.boot_l', 'perf.accel_0_100_s', 'price', 'war.years'],
      rights: ['S11 RDW approval pending', 'S13 Traficom registration pending', 'S08 (manufacturer) data rights'],
    };
    const status = b.catalogOverlap.some((o) => o.kind.startsWith('PROBABLE_DUPLICATE') || o.kind === 'DUPLICATE') ? 'DUPLICATE' : b.conflictStatus !== 'NONE' ? 'CONFLICTED' : 'IDENTITY_PENDING';
    return {
      rank: c.rank,
      label: `${c.commercialIdentity.family} ${c.modelYear.eeaYears.join('/')} (${c.powertrain.productClass})`,
      technical: b.technicalCorroboration === 'EXACT' ? 'EXACT (EEA+RDW)' : 'EXACT (EEA only)',
      traficom: a ? { vehicles: a.vehicles, firstRegistration: a.firstRegistration ?? null } : null,
      commercial: b.commercialIdentity,
      transmission: tx,
      body,
      catalogReferences: catalog.map((r) => ({ site: r.site, status: r.matchStatus })),
      criticalCompleteness: b.criticalCompleteness.afterRdw,
      status,
      blockers,
      previewImportable: false,
      publicPotential: false,
    };
  });

clearInterval(sampler);
const run = { ms: Date.now() - started, traficomMs, peakRssMb: Math.round(peakRss / 1e6), traficomRows: agg.rows, traficomMatchedVehicles: agg.matched, keysWithVehicles: aggregates.length, keysRequested: keys.size };
await writeFile(join(OUT, 'acquisition-manifests.json'), `${JSON.stringify(manifests, null, 2)}\n`);
await writeFile(join(OUT, 'traficom-aggregates.json'), `${JSON.stringify({ attribution: TRAFICOM_DATASET.attribution, license: TRAFICOM_DATASET.license_url, note: 'aggregates per exact technical key only; Finnish market — commercial names are not Spanish commercial identity', aggregates }, null, 2)}\n`);
await writeFile(join(OUT, 'catalog-references-validation.json'), `${JSON.stringify(refValidation, null, 2)}\n`);
await writeFile(join(OUT, 'd2-readiness.json'), `${JSON.stringify(readiness, null, 2)}\n`);
await writeFile(join(OUT, 'build-run.json'), `${JSON.stringify(run, null, 2)}\n`);
console.log(JSON.stringify(run));
if (refValidation.some((v) => v.issues.length)) {
  console.error(JSON.stringify(refValidation.filter((v) => v.issues.length), null, 2));
  process.exitCode = 1;
}
