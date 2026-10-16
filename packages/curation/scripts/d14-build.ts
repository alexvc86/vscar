/**
 * Step D1.4 — construcción offline (sin red, sin MySQL, determinista). No modifica artefactos D1–D1.3.
 *
 *   node packages/curation/scripts/d14-build.ts
 *
 * Entradas (fuera de Git, descargadas una vez con `d14-acquire.ts` y verificadas por SHA-256):
 *   data/raw/gor3a/v1.0.2/{vehicle-data-json.zip, vehicle-data-csv.zip, vehicles.sqlite, repo_README.md, repo_LICENSE-DATA}
 *   data/raw/opendatabay/2026-10-16/{sample_101_Car_Dataset_1945-2020.csv, resource-page.html, general-ai-training-license.html}
 * Salidas versionadas (docs/data/d14/) **sin valores del dataset** (derechos sin acreditar): presencia, recuentos, estados, ids.
 * Valores para revisión humana → data/research/d14/ (fuera de Git; zona de investigación aislada).
 */
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { createReadStream } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  GOR3A_DATASET,
  GOR3A_SPEC,
  buildFileManifest,
  countGor3a,
  flattenGor3a,
  gor3aBodyFromName,
  gor3aCsvParity,
  gor3aKw,
  gor3aLitres,
  gor3aSeconds,
  gor3aTransmission,
  groupRdwRows,
  listZipEntries,
  mapRdwVersions,
  matchRdw,
  openZipEntry,
  readCsvRows,
  readGor3aJsonZip,
  readRawPayload,
  traficomKey,
  traficomTransmission,
  verifyFileManifest,
  RDW_DATASETS,
  type AcquisitionManifest,
  type RdwDatasetName,
  type TraficomAggregate,
} from '@vscar/data-connectors';
import type { HomologationPowertrain } from '@vscar/vehicle-schema';
import { CurationCandidate, matchGor3a, validateOpenDatasetMatch, type MatchCandidate, type OpenDatasetMatch, type RdwEvidence, type TransmissionEvidence } from '../src/index.ts';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');
const DATA = join(ROOT, 'data');
const OUT = join(ROOT, 'docs', 'data', 'd14');
const RESEARCH = join(DATA, 'research', 'd14');
const rel = (p: string) => relative(DATA, p).split('\\').join('/');
const started = Date.now();
let peakRss = 0;
const sampler = setInterval(() => (peakRss = Math.max(peakRss, process.memoryUsage().rss)), 200);

/* ───────── Manifiestos (recursos descargados una vez; recalculados y comparados con los esperados) ───────── */
const G = join(DATA, 'raw', 'gor3a', 'v1.0.2');
const O = join(DATA, 'raw', 'opendatabay', '2026-10-16');
const gCommon = { sourceId: 'S14', licenseReference: `${GOR3A_DATASET.data_license} (data, repo LICENSE-DATA) · ${GOR3A_DATASET.code_license} (code) — ${GOR3A_DATASET.data_license_url} — upstream ${GOR3A_DATASET.upstream} (rights not evidenced)`, rightsStatusAtRetrieval: 'PENDING_REVIEW' as const, redistributable: false, sourceLastModified: '2026-09-25T22:49:49Z' };
const relUrl = (f: string) => `https://github.com/gor3a/vehicle-makes-models/releases/download/${GOR3A_DATASET.release}/${f}`;
const rawUrl = (f: string) => `https://raw.githubusercontent.com/gor3a/vehicle-makes-models/${GOR3A_DATASET.commit}/${f}`;
const manifests: AcquisitionManifest[] = [];
for (const [f, ct, title] of [
  ['vehicle-data-json.zip', 'application/zip', 'per-make tier-3 JSON (166 entries incl. all.json)'],
  ['vehicle-data-csv.zip', 'application/zip', 'engines.csv + makes-models.csv'],
  ['vehicles.sqlite', 'application/vnd.sqlite3', 'normalized SQLite (makes, models, generations, engines, engine_specs)'],
] as const)
  manifests.push(await buildFileManifest({ ...gCommon, absolutePath: join(G, f), resourceTitle: `${GOR3A_DATASET.name} ${GOR3A_DATASET.release} — ${title}`, resourceUrl: GOR3A_DATASET.release_url, requestUrl: relUrl(f), retrievedAt: '2026-10-16T20:32:00.000Z', storedPath: rel(join(G, f)), contentType: ct, schemaVersion: `gor3a-tier3@${GOR3A_DATASET.commit.slice(0, 7)}`, recordCount: 0 }));
for (const f of ['README.md', 'LICENSE-DATA'])
  manifests.push(await buildFileManifest({ ...gCommon, absolutePath: join(G, `repo_${f}`), originalFilename: f, resourceTitle: `${GOR3A_DATASET.name} — ${f} @ ${GOR3A_DATASET.commit.slice(0, 7)} (licence/provenance evidence)`, resourceUrl: GOR3A_DATASET.repository, requestUrl: rawUrl(f), retrievedAt: '2026-10-16T20:32:00.000Z', storedPath: rel(join(G, `repo_${f}`)), contentType: 'text/markdown', schemaVersion: 'evidence', recordCount: 0 }));
const oCommon = { sourceId: 'S15', licenseReference: 'page text "CC0: Public Domain" vs JSON-LD license → Opendatabay "General AI Training and Fine-Tuning Data License" (internal, non-commercial); Kaggle original jahaidulislam/car-specification-dataset-1945-2020 declares CC0, no provenance', rightsStatusAtRetrieval: 'RESTRICTED' as const, redistributable: false };
manifests.push(await buildFileManifest({ ...oCommon, absolutePath: join(O, 'sample_101_Car_Dataset_1945-2020.csv'), resourceTitle: 'Opendatabay — Automotive Specifications Year Make Model Dataset — public sample (sampleLink)', resourceUrl: 'https://www.opendatabay.com/data/ai-ml/77731fb5-141f-4ebe-9ee7-1c06b133d99e', requestUrl: 'https://storage.googleapis.com/opendatabay_public/77731fb5-141f-4ebe-9ee7-1c06b133d99e/sample_101_Car_Dataset_1945-2020.csv', retrievedAt: '2026-10-16T20:41:00.000Z', storedPath: rel(join(O, 'sample_101_Car_Dataset_1945-2020.csv')), contentType: 'text/csv', schemaVersion: 'odb-car-1945-2020-78col', recordCount: 0, notes: 'full CSV (Car_Dataset_1945-2020.csv) is in a private bucket behind an account: not downloaded' }));
for (const [f, url, t] of [
  ['resource-page.html', 'https://www.opendatabay.com/data/ai-ml/77731fb5-141f-4ebe-9ee7-1c06b133d99e', 'resource page (licence/provenance evidence)'],
  ['general-ai-training-license.html', 'https://docs.opendatabay.com/ai-training-and-model-development-licenses/general-ai-training-and-fine-tuning-data-license', 'licence linked from the JSON-LD of the resource'],
] as const)
  manifests.push(await buildFileManifest({ ...oCommon, absolutePath: join(O, f), resourceTitle: `Opendatabay — ${t}`, resourceUrl: url, requestUrl: url, retrievedAt: '2026-10-16T20:41:00.000Z', storedPath: rel(join(O, f)), contentType: 'text/html', schemaVersion: 'evidence', recordCount: 0 }));

/* Huellas esperadas de la release fijada: si cambian, la build falla (reproducibilidad). */
const EXPECTED: Record<string, string> = {
  'vehicle-data-json.zip': '76e524ef5b26c733d2ec911df706f0dec0dcc28f4032f261f0ecf139ba10db8e',
  'vehicle-data-csv.zip': '0265e47303cc08cb1b95b075f37d67e8ef7fb67c5dfcd2adbaafaad5acfb98b4',
  'vehicles.sqlite': '4f7e8aa7655238451c720487aecda506c36491fb1451b1d45cb56719c102d170',
};
for (const m of manifests) if (EXPECTED[m.originalFilename] && EXPECTED[m.originalFilename] !== m.sha256) throw new Error(`gor3a asset changed: ${m.originalFilename}`);

/* ───────── gor3a: lectura, recuentos reales, paridad JSON/CSV/SQLite ───────── */
const t0 = Date.now();
const { files, issues: schemaIssues } = await readGor3aJsonZip(join(G, 'vehicle-data-json.zip'));
if (schemaIssues.length) throw new Error(`gor3a schema drift: ${schemaIssues.slice(0, 3).join('; ')}`);
const counts = countGor3a(files);
const rows = flattenGor3a(files);
const csvZip = join(G, 'vehicle-data-csv.zip');
const csvEntry = (await listZipEntries(csvZip)).find((e) => e.name === 'csv/engines.csv')!;
const csvParity = await gor3aCsvParity(await openZipEntry(csvZip, csvEntry), rows);
let sqlite: Record<string, number> | { unavailable: string };
try {
  const { DatabaseSync } = await import('node:sqlite');
  const db = new DatabaseSync(join(G, 'vehicles.sqlite'), { readOnly: true });
  sqlite = Object.fromEntries(['makes', 'models', 'generations', 'engines', 'engine_specs'].map((t) => [t, Number((db.prepare(`select count(*) n from ${t}`).get() as { n: number }).n)]));
  db.close();
} catch (e) {
  sqlite = { unavailable: String(e) };
}
manifests[0]!.recordCount = counts.engines;
manifests[1]!.recordCount = csvParity.csvRows;
if ('engines' in sqlite) manifests[2]!.recordCount = sqlite.engines!;
const parity = { json: counts, csvEngines: csvParity, sqlite, enginesEqual: counts.engines === csvParity.csvRows && 'engines' in sqlite && sqlite.engines === counts.engines && csvParity.onlyInCsv === 0 && csvParity.onlyInJson === 0 };
const readMs = Date.now() - t0;

/* Inventario de campos (tipados + specs clave). */
const pct = (n: number) => Math.round((n / rows.length) * 1000) / 10;
const typed: [keyof (typeof rows)[number]['engine'], string, string, string, string][] = [
  ['fuelType', 'string', '—', 'pt.fuel / powertrain class', 'HIGH (closed list)'],
  ['cylinders', 'number', '—', 'pt.cylinders', 'MEDIUM'],
  ['displacementCc', 'number', 'cm³', 'pt.displacement_cc', 'HIGH'],
  ['powerHp', 'number', '"HP" (often metric PS)', '— (not used: unit ambiguous)', 'LOW'],
  ['torqueNm', 'number', 'N·m', 'perf.torque_nm', 'MEDIUM'],
  ['transmission', 'string', 'free text', 'transmission (manual/automatic/single_speed; CVT unmapped)', 'MEDIUM'],
  ['drivetrain', 'string', 'FWD/RWD/AWD', 'drivetrain', 'HIGH'],
  ['zeroToHundredKmhS', 'number', 's (0–62 mph / 0–100 km/h)', 'perf.accel_0_100_s', 'MEDIUM (method unknown)'],
  ['topSpeedKmh', 'number', 'km/h', 'perf.top_speed_kmh', 'MEDIUM'],
  ['fuelEconomyCombinedL100', 'number', 'L/100 km (cycle mixed NEDC/WLTP)', '— (cycle not separable in typed column)', 'LOW'],
  ['lengthMm', 'number', 'mm', 'dim.length_mm', 'MEDIUM (per generation)'],
  ['widthMm', 'number', 'mm', 'dim.width_mm', 'MEDIUM (mirrors?)'],
  ['heightMm', 'number', 'mm', 'dim.height_mm', 'MEDIUM'],
  ['wheelbaseMm', 'number', 'mm', 'dim.wheelbase_mm', 'MEDIUM'],
  ['curbWeightKg', 'number', 'kg (unladen, definition not stated)', '— (≠ EU running order)', 'LOW'],
];
const inventoryTyped = typed.map(([f, type, unit, specKey, confidence]) => {
  const vals = rows.map((r) => r.engine[f] as unknown);
  const nulls = vals.filter((v) => v === null).length;
  return { field: f, type, unit, nullRatePct: pct(nulls), distinct: new Set(vals.filter((v) => v !== null).map(String)).size, specKeyMapping: specKey, identityBasis: 'dataset engine row (L2 at best)', rights: 'ODbL declared · upstream unverified → research only', confidence };
});
const specCount = (k: string, parse?: (v: string) => number | undefined) => {
  const present = rows.filter((r) => r.engine.specs[k] !== undefined);
  return { key: k, presentPct: pct(present.length), parsedPct: parse ? pct(present.filter((r) => parse(r.engine.specs[k]!) !== undefined).length) : null };
};
const inventorySpecs = [
  specCount(GOR3A_SPEC.cargo, gor3aLitres),
  specCount(GOR3A_SPEC.accel, gor3aSeconds),
  specCount(GOR3A_SPEC.power, gor3aKw),
  specCount(GOR3A_SPEC.motorPower, gor3aKw),
  specCount(GOR3A_SPEC.systemPower, gor3aKw),
  specCount(GOR3A_SPEC.batteryNominal),
  specCount(GOR3A_SPEC.batteryMax),
  specCount(GOR3A_SPEC.chargeNormal),
  specCount(GOR3A_SPEC.chargeQuick),
  specCount('FUEL ECONOMY (NEDC) / Combined'),
  specCount('FUEL ECONOMY (WLTP) / Combined'),
  specCount('POWER SYSTEM SPECS / Range'),
];
const specKeys = [...new Set(rows.flatMap((r) => Object.keys(r.engine.specs)))].sort();

/* Cobertura temporal y representación de generaciones. */
const gens = new Map<string, { make: string; model: string; name: string; ys: number | null; ye: number | null }>();
for (const r of rows) gens.set(r.generationId, { make: r.make, model: r.model, name: r.generation, ys: r.genYearStart, ye: r.genYearEnd });
for (const f of files) f.makes.forEach((mk, i) => mk.models.forEach((mo, j) => mo.generations.forEach((g, k) => gens.set(`${f.group}/${i}/${j}/${k}`, { make: mk.name, model: mo.name, name: g.name, ys: g.yearStart, ye: g.yearEnd }))));
const bucket = (y: number | null) => (y === null ? 'unknown' : y < 2010 ? '<2010' : y < 2015 ? '2010–2014' : y < 2020 ? '2015–2019' : y < 2024 ? '2020–2023' : '2024+');
const byStart: Record<string, number> = {};
for (const g of gens.values()) byStart[bucket(g.ys)] = (byStart[bucket(g.ys)] ?? 0) + 1;
const genList = [...gens.values()];
const nameHas = (re: RegExp) => genList.filter((g) => re.test(g.name)).length;
const dupKey = new Map<string, number>();
for (const g of genList) dupKey.set(`${g.make}|${g.model}|${g.name}`, (dupKey.get(`${g.make}|${g.model}|${g.name}`) ?? 0) + 1);
const generationRepresentation = {
  generations: genList.length,
  byStartYear: byStart,
  openEnded: genList.filter((g) => g.ye === null).length,
  bodyTypeFieldNull: files.every((f) => f.makes.every((m) => m.models.every((mo) => mo.generations.every((g) => g.bodyType === null)))),
  namesWithFacelift: nameHas(/facelift/i),
  namesWithRomanOrMk: nameHas(/\b(mk ?\d|[IVX]{2,}|gen(eration)? ?\d)\b/),
  namesWithDoorsOrBody: genList.filter((g) => Object.keys(gor3aBodyFromName(g.model, g.name)).length > 0).length,
  duplicateNamesWithinModel: [...dupKey.values()].filter((n) => n > 1).length,
  golf: genList
    .filter((g) => g.make === 'Volkswagen' && g.model === 'Golf' && (g.ys ?? 0) >= 2008)
    .map((g) => ({ name: g.name, yearStart: g.ys, yearEnd: g.ye }))
    .sort((a, b) => (a.yearStart ?? 0) - (b.yearStart ?? 0) || a.name.localeCompare(b.name)),
  countries: Object.entries(files.flatMap((f) => f.makes.map((m) => m.country ?? 'not stated')).reduce<Record<string, number>>((a, c) => ((a[c] = (a[c] ?? 0) + 1), a), {})).sort((a, b) => b[1] - a[1]),
};

/* ───────── OpenDataBay: solo la muestra pública (sin valores en el artefacto) ───────── */
const sample: string[][] = [];
for await (const r of readCsvRows(createReadStream(join(O, 'sample_101_Car_Dataset_1945-2020.csv')))) sample.push(r.fields);
const [oHeader, ...oRows] = sample;
const odb = {
  sampleRows: oRows.length,
  columns: oHeader!.length,
  columnNames: oHeader,
  makesInSample: [...new Set(oRows.map((r) => r[oHeader!.indexOf('Make')]))].sort(),
  requestedMakesPresent: Object.fromEntries(['Volkswagen', 'Toyota', 'BMW', 'BYD'].map((m) => [m, oRows.some((r) => r[oHeader!.indexOf('Make')] === m)])),
  yearRange: [Math.min(...oRows.map((r) => Number(r[oHeader!.indexOf('Year_from')]))), Math.max(...oRows.map((r) => Number(r[oHeader!.indexOf('Year_to')] || 0)))],
  nullRatePct: Object.fromEntries(oHeader!.map((h, i) => [h, Math.round((oRows.filter((r) => !(r[i] ?? '').trim()).length / oRows.length) * 1000) / 10])),
  duplicateRows: oRows.length - new Set(oRows.map((r) => r.slice(1).join('|'))).size,
  accelerationColumn: 'acceleration_0_100_km/h_s (page text says 0–60 mph; values look rounded to whole seconds in the sample)',
};

/* ───────── Evidencia oficial por candidata (RDW D1.1, Traficom D1.3) ───────── */
const d11m: AcquisitionManifest[] = JSON.parse(await readFile(join(ROOT, 'docs/data/d11/acquisition-manifests.json'), 'utf8'));
const datasetName = (id: string) => (Object.entries(RDW_DATASETS).find(([, d]) => d.id === id)?.[0] ?? id) as RdwDatasetName;
const rdwRows: Partial<Record<RdwDatasetName, unknown[]>> = {};
for (const m of d11m.filter((x) => x.sourceId === 'S11' && !x.resourceTitle.includes('pilot-10'))) {
  if (!(await verifyFileManifest(m, join(DATA, m.storedPath)))) throw new Error(`raw changed: ${m.storedPath}`);
  const payload = JSON.parse(await readRawPayload(join(DATA, m.storedPath))) as { dataset: { source_table: string }; results: unknown[] };
  const name = datasetName(payload.dataset.source_table);
  if (name in RDW_DATASETS) (rdwRows[name] ??= []).push(...payload.results);
}
const rdwGroups = groupRdwRows(rdwRows);
const traficom = JSON.parse(await readFile(join(ROOT, 'docs/data/d13/traficom-aggregates.json'), 'utf8')) as { aggregates: TraficomAggregate[] };
const tAgg = new Map(traficom.aggregates.map((a) => [a.key, a]));
const d13 = JSON.parse(await readFile(join(ROOT, 'docs/data/d13/d2-readiness.json'), 'utf8')) as Array<{ rank: number; status: string; transmission: { value?: string }; body: { value?: string } }>;
const d12 = JSON.parse(await readFile(join(ROOT, 'docs/data/d12/d2-batch-readiness.json'), 'utf8')) as Array<{ rank: number; commercialIdentity: string }>;

const shortlist = (await readFile(join(ROOT, 'docs/data/d1/curation_candidates.jsonl'), 'utf8')).trim().split('\n').map((l) => CurationCandidate.parse(JSON.parse(l)));
const range = (o: { value?: unknown; min?: number; max?: number } | undefined) => (o === undefined ? undefined : typeof o.value === 'number' ? { min: o.value, max: o.value } : o.min !== undefined && o.max !== undefined ? { min: o.min, max: o.max } : undefined);
const evidence = shortlist.map((c) => {
  const t = c.technicalIdentity;
  const match = matchRdw({ tan: t.typeApprovalNumber, variant: t.variant, version: t.version }, rdwGroups.versions);
  const obs = match.level === 'EXACT' ? mapRdwVersions(match.versions, t.homologationPowertrain as HomologationPowertrain).observations : [];
  const o = (k: string) => obs.find((x) => x.key === k) as { value?: unknown; min?: number; max?: number } | undefined;
  const num = (k: string) => (typeof o(k)?.value === 'number' ? (o(k)!.value as number) : undefined);
  const rdw: RdwEvidence = {
    ...(['FWD', 'RWD', 'AWD'].includes(String(o('drivetrain')?.value)) ? { drivetrain: o('drivetrain')!.value as 'FWD' } : {}),
    ...(num('doors') !== undefined ? { doors: num('doors')! } : {}),
    ...(range(o('dim.length_mm')) ? { length: range(o('dim.length_mm'))! } : {}),
    ...(range(o('dim.width_mm')) ? { width: range(o('dim.width_mm'))! } : {}),
    ...(range(o('dim.height_mm')) ? { height: range(o('dim.height_mm'))! } : {}),
    ...(num('dim.wheelbase_mm') !== undefined ? { wheelbase: num('dim.wheelbase_mm')! } : {}),
    ...(num('perf.top_speed_kmh') !== undefined ? { topSpeed: num('perf.top_speed_kmh')! } : {}),
    ...(num('dim.mass_kg') !== undefined ? { massRunningOrder: num('dim.mass_kg')! } : {}),
    ...(match.level === 'EXACT' && match.versions.some((v) => v.validFrom) ? { approvalFrom: match.versions.map((v) => v.validFrom!).filter(Boolean).sort()[0]! } : {}),
  };
  const tx: TransmissionEvidence = c.powertrain.productClass === 'BEV' ? 'single_speed' : traficomTransmission(tAgg.get(traficomKey(t.typeApprovalNumber, t.variant, t.version))).value;
  const mc: MatchCandidate = {
    rank: c.rank!,
    familyId: c.familyId,
    technicalKey: `${t.typeApprovalNumber}|${t.variant}|${t.version}`,
    registrationYears: c.modelYear.eeaYears,
    productClass: c.powertrain.productClass,
    ...(t.fuel ? { fuel: t.fuel } : {}),
    ...(t.enginePowerKw !== undefined ? { powerKw: t.enginePowerKw } : {}),
    ...(t.engineCapacityCc !== undefined ? { displacementCc: t.engineCapacityCc } : {}),
  };
  return { c, mc, rdw, rdwLevel: match.level, tx };
});

/* ───────── Matching (100) ───────── */
const results: OpenDatasetMatch[] = evidence.map((x) => matchGor3a(x.mc, rows, x.rdw, x.tx));
const invalid = results.map((r) => ({ rank: r.rank, issues: validateOpenDatasetMatch(r) })).filter((x) => x.issues.length);
for (const [i, r] of results.entries()) if (r.technicalKey !== evidence[i]!.mc.technicalKey) throw new Error('technical key mutated');

const label = (c: CurationCandidate) => `${c.commercialIdentity.family} ${c.modelYear.eeaYears.join('/')} (${c.powertrain.productClass})`;
const summary = (rs: OpenDatasetMatch[]) => ({
  candidates: rs.length,
  byStatus: Object.fromEntries(['EXACT_DOCUMENTED_LINK', 'STRONG_COMPATIBLE_MATCH', 'WEAK_COMPATIBLE_MATCH', 'AMBIGUOUS', 'REJECTED', 'NOT_FOUND'].map((s) => [s, rs.filter((r) => r.status === s).length])),
  generationCandidates: rs.filter((r) => r.level !== 'NONE').length,
  singleGenerationCandidate: rs.filter((r) => r.compatibleGenerations.length === 1).length,
  engineMatches: rs.filter((r) => r.level === 'ENGINE_CONFIGURATION').length,
  bodyFound: rs.filter((r) => r.fields.body.found).length,
  bootFound: rs.filter((r) => r.fields.boot.found).length,
  bootSingleValue: rs.filter((r) => r.fields.boot.distinct === 1).length,
  accelFound: rs.filter((r) => r.fields.accel_0_100.found).length,
  accelSingleValue: rs.filter((r) => r.fields.accel_0_100.distinct === 1).length,
  transmissionFound: rs.filter((r) => r.fields.transmission.found).length,
  batteryFound: rs.filter((r) => r.fields.battery.found).length,
  chargingFound: rs.filter((r) => r.fields.charging.found).length,
  ambiguous: rs.filter((r) => r.status === 'AMBIGUOUS').length,
  notFound: rs.filter((r) => r.status === 'NOT_FOUND').length,
  rejected: rs.filter((r) => r.status === 'REJECTED').length,
  identityVerified: 0,
  reusableInVscar: 0,
});
const pilot = evidence.filter((x) => x.c.pilot).map((x) => x.c.rank!);
const matching = results.map((r, i) => ({ ...r, label: label(evidence[i]!.c), pilot: evidence[i]!.c.pilot, rdwLevel: evidence[i]!.rdwLevel, transmissionEvidence: evidence[i]!.tx ?? null, rdwEvidenceFields: Object.keys(evidence[i]!.rdw).sort() }));

/* RDW cross-check agregado (solo filas compatibles en motor, antes del filtro dimensional). */
const xc: Record<string, { compared: number; agree: number; disagree: number; candidates: number }> = {};
for (const r of results) for (const d of r.rdwCrossCheck) {
  const a = (xc[d.field] ??= { compared: 0, agree: 0, disagree: 0, candidates: 0 });
  a.compared += d.compared;
  a.agree += d.agree;
  a.disagree += d.disagree;
  a.candidates++;
}

/* D2 (20): sin importación; estado D1.3 + aporte D1.4 (sin cambiar criterios). */
const d2 = matching
  .filter((m) => m.pilot)
  .map((m) => {
    const b = d13.find((x) => x.rank === m.rank)!;
    return {
      rank: m.rank,
      label: m.label,
      d13Status: b.status,
      d14Status: b.status,
      gor3a: m.status,
      generation: { before: 'none', foundInSource: m.compatibleGenerations.length, identityVerified: false, reusable: false },
      commercialIdentity: d12.find((x) => x.rank === m.rank)!.commercialIdentity,
      transmission: { before: b.transmission.value ?? null, foundInSource: m.fields.transmission.found, reusable: false },
      body: { before: b.body.value ?? null, foundInSource: m.fields.body.found, reusable: false },
      boot: { foundInSource: m.fields.boot.found, singleValue: m.fields.boot.distinct === 1, identityVerified: false, reusable: false },
      accel_0_100: { foundInSource: m.fields.accel_0_100.found, singleValue: m.fields.accel_0_100.distinct === 1, identityVerified: false, reusable: false },
      blockers: ['generation_code/model_year: no verified source (dataset generations are year-labelled, inferred by interval)', 'S14 rights: ODbL declared, upstream autoevolution rights not evidenced (legal review)', 'S11/S13 approval pending', 'price and warranty: no source'],
      previewImportable: false,
      publicPotential: false,
    };
  });

/* Valores para revisión humana — zona de investigación fuera de Git (nunca en docs/ ni en la BD). */
await mkdir(RESEARCH, { recursive: true });
const rowById = new Map(rows.map((r) => [r.id, r]));
await writeFile(
  join(RESEARCH, 'gor3a-matched-values.json'),
  `${JSON.stringify(
    {
      warning: 'RESEARCH ONLY — ODbL declared, upstream rights not evidenced, identity not verified. Do not import, publish or commit.',
      attribution: GOR3A_DATASET.attribution,
      matches: results.map((r) => ({
        rank: r.rank,
        status: r.status,
        rows: r.compatibleRowIds.map((id) => {
          const x = rowById.get(id)!;
          const e = x.engine;
          return { id, generation: x.generation, years: [x.genYearStart, x.genYearEnd], label: e.label, fuel: e.fuelType, kw: gor3aKw(e.specs[GOR3A_SPEC.power] ?? e.specs[GOR3A_SPEC.motorPower] ?? ''), transmission: e.transmission, gearbox: gor3aTransmission(e.transmission).kind ?? null, drive: e.drivetrain, boot_l: gor3aLitres(e.specs[GOR3A_SPEC.cargo] ?? '') ?? null, accel_s: e.zeroToHundredKmhS, length: e.lengthMm, width: e.widthMm, height: e.heightMm, wheelbase: e.wheelbaseMm, top: e.topSpeedKmh };
        }),
      })),
    },
    null,
    1,
  )}\n`,
);

clearInterval(sampler);
await mkdir(OUT, { recursive: true });
const write = (f: string, v: unknown) => writeFile(join(OUT, f), `${JSON.stringify(v, null, 2)}\n`);
await write('acquisition-manifests.json', manifests);
await write('gor3a-inventory.json', { dataset: GOR3A_DATASET, declared: { makes: 164, models: 2621, generations: 7169, engines: 30390, source: 'README @ v1.0.2 (figures from v1.0.1)' }, actual: counts, parity, specKeys: specKeys.length, inventoryTyped, inventorySpecs, generationRepresentation });
await write('opendatabay-inventory.json', odb);
await write('matching-100.json', { rules: 'docs/data/D1_4_TWENTY_VARIANT_MATCHING.md §2', valuesStored: false, summary100: summary(results), summary20: summary(results.filter((r) => pilot.includes(r.rank))), rdwCrossCheck: xc, invalid, matches: matching });
await write('d2-readiness.json', d2);
const run = { ms: Date.now() - started, readMs, peakRssMb: Math.round(peakRss / 1e6), gor3aEngines: rows.length, candidates: results.length, invalid: invalid.length };
await write('build-run.json', run);
console.log(JSON.stringify(run));
if (invalid.length) process.exitCode = 1;
