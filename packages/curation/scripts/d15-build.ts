/**
 * Step D1.5 — integración multi-fuente (offline, sin MySQL, determinista). No modifica artefactos D1–D1.4.
 *
 *   node packages/curation/scripts/d15-build.ts
 *
 * Entradas (fuera de Git, `data/raw/`, SHA-256 fijados):
 *   S15 opendatabay/full/Car_Dataset_1945-2020.csv (aportado por el usuario en docs/, copiado aquí) ·
 *   S16 autoseeker/user-supplied/models.csv (= autoseeker.eu/data/models.csv) · S17 openev/v1.24.0 · S18 vehiclesdb/v2026.10.4 ·
 *   S19 kilowatt/32d7dc5 · RDW (D1.1) · Traficom (D1.3) · EEA (D1).
 * Salidas versionadas (docs/data/d15/): perfiles, coincidencias, matriz de campos y preparación — **sin valores de terceros**.
 * Valores para revisión humana → data/research/d15/ (fuera de Git).
 */
import { createReadStream } from 'node:fs';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  OPEN_CATALOG_SOURCES,
  RDW_DATASETS,
  buildFileManifest,
  groupRdwRows,
  mapRdwVersions,
  matchRdw,
  odbDrive,
  odbGeneration,
  odbPowerKw,
  odbTransmission,
  parseKilowatt,
  parseOpenEv,
  parseVehiclesDb,
  psToKw,
  readAutoseekerCsv,
  readOdbCsv,
  readRawPayload,
  traficomKey,
  traficomTransmission,
  verifyFileManifest,
  type AcquisitionManifest,
  type AutoseekerRecord,
  type KwRecord,
  type OdbRecord,
  type OevRecord,
  type RdwDatasetName,
  type TraficomAggregate,
} from '@vscar/data-connectors';
import type { HomologationPowertrain } from '@vscar/vehicle-schema';
import {
  CurationCandidate,
  FAMILY_SOURCE_NAMES,
  FIELD_RULES,
  assessField,
  d1Coverage,
  matchAutoseeker,
  matchKilowatt,
  matchOdb,
  matchOpenEv,
  productPowertrain,
  readinessTier,
  rightsDecision,
  vehiclesDbTaxonomy,
  type FieldEvidence,
  type FieldKey,
  type MatchCandidate,
  type RdwEvidence,
  type SourceMatch,
  type TransmissionEvidence,
} from '../src/index.ts';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');
const DATA = join(ROOT, 'data');
const RAW = join(DATA, 'raw');
const OUT = join(ROOT, 'docs', 'data', 'd15');
const RESEARCH = join(DATA, 'research', 'd15');
const rel = (p: string) => relative(DATA, p).split('\\').join('/');
const started = Date.now();
let peakRss = 0;
const sampler = setInterval(() => (peakRss = Math.max(peakRss, process.memoryUsage().rss)), 200);

/* ───────── Manifiestos (SHA-256 fijados para los ficheros principales) ───────── */
const P = {
  odb: join(RAW, 'opendatabay', 'full', 'Car_Dataset_1945-2020.csv'),
  as: join(RAW, 'autoseeker', 'user-supplied', 'models.csv'),
  asPublished: join(RAW, 'autoseeker', 'evidence', 'models-published-2026-10-16.csv'),
  asPage: join(RAW, 'autoseeker', 'evidence', 'autoseeker-data-page.html'),
  oev: join(RAW, 'openev', 'v1.24.0', 'open-ev-data-v1.24.0.json'),
  vdb: join(RAW, 'vehiclesdb', 'v2026.10.4', 'vehicles.json'),
  kw: join(RAW, 'kilowatt', '32d7dc5', 'ev-data.json'),
};
const EXPECTED: Record<string, string> = {
  [P.odb]: 'e42187340d40483e770c8847eec8f1aeccfc7e6bd32f66e9f4aa45a5dba7da7a',
  [P.as]: '1775cf1337ed2476f6929c11035abf3fdc637e7d678856854dd0f0346b3ecdb1',
  [P.asPublished]: '1775cf1337ed2476f6929c11035abf3fdc637e7d678856854dd0f0346b3ecdb1',
  [P.oev]: '38c4f579c8fb4edf27921faa79d9eb27069f522d088578e95637fa9dfe4ef786',
};
type M = Parameters<typeof buildFileManifest>[0];
const spec: (Omit<M, 'storedPath'> & { absolutePath: string })[] = [
  { absolutePath: P.odb, sourceId: 'S15', resourceTitle: 'Car_Dataset_1945-2020.csv (Opendatabay / Kaggle jahaidulislam) — full file supplied by the user (docs/)', resourceUrl: OPEN_CATALOG_SOURCES.S15.url, retrievedAt: '2026-10-16T21:01:00.000Z', contentType: 'text/csv', licenseReference: OPEN_CATALOG_SOURCES.S15.license, rightsStatusAtRetrieval: 'RESTRICTED', redistributable: false, schemaVersion: 'odb-78col', recordCount: 0, notes: 'same size as the Kaggle file (24,866,141 B); provenance of the original data not declared' },
  { absolutePath: P.as, sourceId: 'S16', resourceTitle: 'autoseeker.eu models.csv — copy supplied by the user (docs/)', resourceUrl: OPEN_CATALOG_SOURCES.S16.url, requestUrl: 'https://autoseeker.eu/data/models.csv', retrievedAt: '2026-10-16T21:04:00.000Z', contentType: 'text/csv', licenseReference: 'CC BY 4.0 — https://autoseeker.eu/en/data/ ("credit autoseeker.eu"; values "indicative"; last generated 2026-07-18; no versioning)', rightsStatusAtRetrieval: 'PENDING_REVIEW', redistributable: false, schemaVersion: 'autoseeker-20col', recordCount: 0 },
  { absolutePath: P.asPublished, sourceId: 'S16', resourceTitle: 'autoseeker.eu models.csv — published endpoint (byte-identical to the user copy)', resourceUrl: OPEN_CATALOG_SOURCES.S16.url, requestUrl: 'https://autoseeker.eu/data/models.csv', retrievedAt: '2026-10-16T21:20:00.000Z', contentType: 'text/csv', licenseReference: 'CC BY 4.0', rightsStatusAtRetrieval: 'PENDING_REVIEW', redistributable: false, schemaVersion: 'autoseeker-20col', recordCount: 0 },
  { absolutePath: P.asPage, sourceId: 'S16', resourceTitle: 'autoseeker.eu open-data page (licence evidence)', resourceUrl: OPEN_CATALOG_SOURCES.S16.url, retrievedAt: '2026-10-16T21:19:00.000Z', contentType: 'text/html', licenseReference: 'CC BY 4.0', rightsStatusAtRetrieval: 'PENDING_REVIEW', redistributable: false, schemaVersion: 'evidence', recordCount: 0 },
  ...['open-ev-data-v1.24.0.json', 'open-ev-data-v1.24.0.csv', 'repo_LICENCE', 'repo_README.md', 'repo_schema.json'].map((f) => ({ absolutePath: join(RAW, 'openev', 'v1.24.0', f), sourceId: 'S17', resourceTitle: `OpenEV Data v1.24.0 — ${f}`, resourceUrl: OPEN_CATALOG_SOURCES.S17.url, requestUrl: f.startsWith('repo_') ? `https://raw.githubusercontent.com/open-ev-data/open-ev-data-dataset/8edb266da3b2c4424dd031e248468ba5d445da5d/${f.slice(5)}` : `https://github.com/open-ev-data/open-ev-data-dataset/releases/download/v1.24.0/${f}`, retrievedAt: '2026-10-16T21:10:00.000Z', contentType: f.endsWith('.json') ? 'application/json' : f.endsWith('.csv') ? 'text/csv' : 'text/plain', licenseReference: 'CDLA-Permissive-2.0 (repo LICENCE @ 8edb266)', rightsStatusAtRetrieval: 'PENDING_REVIEW' as const, redistributable: false, schemaVersion: 'openev-1.0.0', recordCount: 0 })),
  ...['vehicles.json', 'vehicles.csv', 'manifest.json', 'ATTRIBUTION.md', 'repo_LICENSE', 'repo_README.md', 'repo_SOURCES.md', 'repo_SCHEMA.md', 'repo_NAMING.md'].map((f) => ({ absolutePath: join(RAW, 'vehiclesdb', 'v2026.10.4', f), sourceId: 'S18', resourceTitle: `VehiclesDB v2026.10.4 — ${f}`, resourceUrl: OPEN_CATALOG_SOURCES.S18.url, requestUrl: f.startsWith('repo_') ? `https://raw.githubusercontent.com/vehiclesdb/vehiclesdb/d0e40c9661e36931089db1213ac383d2d7ba5a7a/${f.slice(5)}` : `https://github.com/vehiclesdb/vehiclesdb/releases/download/v2026.10.4/${f}`, retrievedAt: '2026-10-16T21:10:00.000Z', contentType: f.endsWith('.json') ? 'application/json' : f.endsWith('.csv') ? 'text/csv' : 'text/markdown', licenseReference: 'CC BY 4.0 (+ upstream register notices, ATTRIBUTION.md)', rightsStatusAtRetrieval: 'PENDING_REVIEW' as const, redistributable: false, schemaVersion: 'vehiclesdb-2', recordCount: 0 })),
  ...['ev-data.json', 'repo_LICENSE', 'repo_README.md'].map((f) => ({ absolutePath: join(RAW, 'kilowatt', '32d7dc5', f), sourceId: 'S19', resourceTitle: `Kilowatt Open EV Data (archived) @ 32d7dc5 — ${f}`, resourceUrl: OPEN_CATALOG_SOURCES.S19.url, requestUrl: `https://raw.githubusercontent.com/KilowattApp/open-ev-data/32d7dc59e7b8b7391572ca1e132a1517be9a3b5e/${f === 'ev-data.json' ? 'data/ev-data.json' : f.slice(5)}`, retrievedAt: '2026-10-16T21:10:00.000Z', contentType: f.endsWith('.json') ? 'application/json' : 'text/plain', licenseReference: 'MIT with attribution requirement (repo LICENSE)', rightsStatusAtRetrieval: 'PENDING_REVIEW' as const, redistributable: false, schemaVersion: 'kilowatt-v1', recordCount: 0 })),
];
const manifests: AcquisitionManifest[] = [];
for (const s of spec) manifests.push(await buildFileManifest({ ...s, storedPath: rel(s.absolutePath) }));
for (const m of manifests) {
  const exp = EXPECTED[join(DATA, m.storedPath)];
  if (exp && exp !== m.sha256) throw new Error(`input changed: ${m.storedPath}`);
}

/* ───────── Lectura ───────── */
const odb = (await readOdbCsv(createReadStream(P.odb))).records;
const as = await readAutoseekerCsv(createReadStream(P.as));
const oevParsed = parseOpenEv(JSON.parse(await readFile(P.oev, 'utf8')));
const oev = oevParsed.records;
const vdb = parseVehiclesDb(JSON.parse(await readFile(P.vdb, 'utf8')));
const kw = parseKilowatt(JSON.parse(await readFile(P.kw, 'utf8')));
manifests[0]!.recordCount = odb.length;
manifests[1]!.recordCount = as.length;
manifests[2]!.recordCount = as.length;
manifests.find((m) => m.originalFilename === 'open-ev-data-v1.24.0.json')!.recordCount = oev.length;
manifests.find((m) => m.originalFilename === 'vehicles.json')!.recordCount = vdb.models.length;
manifests.find((m) => m.originalFilename === 'ev-data.json')!.recordCount = kw.records.length;

/* ───────── Perfiles (sin valores) ───────── */
const pct = (n: number, d: number) => Math.round((n / d) * 1000) / 10;
const nullRate = (rows: readonly OdbRecord[], c: keyof OdbRecord['raw']) => pct(rows.filter((r) => !r.raw[c].trim()).length, rows.length);
const odbGenParsed = odb.map((r) => odbGeneration(r.generation));
const profiles = {
  S15: {
    rows: odb.length,
    columns: 78,
    makes: new Set(odb.map((r) => r.make)).size,
    models: new Set(odb.map((r) => `${r.make}|${r.model}`)).size,
    generations: new Set(odb.map((r) => `${r.make}|${r.model}|${r.generation}`)).size,
    series: new Set(odb.map((r) => `${r.make}|${r.model}|${r.generation}|${r.series}`)).size,
    duplicateRowsExceptId: odb.length - new Set(odb.map((r) => JSON.stringify({ ...r.raw, id_trim: '' }))).size,
    yearRange: [Math.min(...odb.filter((r) => r.yearFrom).map((r) => r.yearFrom!)), Math.max(...odb.filter((r) => r.yearTo).map((r) => r.yearTo!))],
    yearToZeroOrEmpty: odb.filter((r) => r.yearTo === undefined).length,
    rowsFrom2010: odb.filter((r) => (r.yearTo ?? 9999) >= 2010).length,
    generationLabels: { ordinal: odbGenParsed.filter((g) => g.ordinal !== undefined).length, withRestyling: odbGenParsed.filter((g) => g.restyling > 0).length, codeOnly: odbGenParsed.filter((g) => g.ordinal === undefined && g.code).length },
    powerBasis: { kwColumn: odb.filter((r) => odbPowerKw(r.raw).basis === 'KW').length, psConverted: odb.filter((r) => odbPowerKw(r.raw).basis === 'PS_CONVERTED').length, none: odb.filter((r) => !odbPowerKw(r.raw).basis).length },
    nullRatePct: Object.fromEntries((['Body_type', 'number_of_seats', 'length_mm', 'minimum_trunk_capacity_l', 'max_trunk_capacity_l', 'acceleration_0_100_km/h_s', 'max_speed_km_per_h', 'engine_hp', 'max_power_kw', 'maximum_torque_n_m', 'capacity_cm3', 'transmission', 'drive_wheels', 'fuel_tank_capacity_l', 'mixed_fuel_consumption_per_100_km_l', 'CO2_emissions_g/km', 'emission_standards', 'battery_capacity_KW_per_h', 'electric_range_km', 'charging_time_h', 'country_of_origin'] as const).map((c) => [c, nullRate(odb, c)])),
    granularity: { dimensionsBootSeats: 'SERIES (generation + body): identical across the engine/gearbox rows of a series', engineFields: 'POWERTRAIN (row = engine + gearbox; `Trim` is not a commercial trim)' },
  },
  S16: {
    rows: as.length,
    columns: 20,
    makes: new Set(as.map((r) => r.make)).size,
    nonEmpty: Object.fromEntries((['powerPs', 'wltpRangeKm', 'batteryKwh', 'dcKw', 'towingKg', 'bootL', 'wltpL100', 'wltpKwh100', 'co2'] as const).map((k) => [k, as.filter((r) => r.values[k] !== undefined).length])),
    granularity: as.reduce<Record<string, number>>((m, r) => ((m[r.granularity] = (m[r.granularity] ?? 0) + 1), m), {}),
    multiFuelRows: as.filter((r) => r.fuels.length > 1).length,
    status: as.reduce<Record<string, number>>((m, r) => ((m[r.status] = (m[r.status] ?? 0) + 1), m), {}),
    unmappedBody: [...new Set(as.filter((r) => !r.body).map((r) => r.raw.carrosserie))],
    note: 'one representative row per model/generation (NL-oriented "orderable" snapshot); battery basis (gross/usable) not declared; trekgewicht 0 treated as absent',
  },
  S17: {
    version: 'v1.24.0',
    records: oev.length,
    parseIssues: oevParsed.issues.length,
    makes: new Set(oev.map((r) => r.make)).size,
    withGross: oev.filter((r) => r.batteryGrossKwh !== undefined).length,
    withNet: oev.filter((r) => r.batteryNetKwh !== undefined).length,
    grossEqualsNet: oev.filter((r) => r.batteryGrossKwh !== undefined && r.batteryGrossKwh === r.batteryNetKwh).length,
    withAc: oev.filter((r) => r.acKw !== undefined).length,
    withDc: oev.filter((r) => r.dcKw !== undefined).length,
    withWltpRange: oev.filter((r) => r.wltpRangeKm !== undefined).length,
    withAccel: oev.filter((r) => r.accel0100 !== undefined).length,
    withCargo: oev.filter((r) => r.cargoL !== undefined).length,
    europeanMarket: oev.filter((r) => r.markets.some((m) => ['DE', 'FR', 'IT', 'PT', 'ES', 'GB', 'NL'].includes(m))).length,
    marketEs: oev.filter((r) => r.markets.includes('ES')).length,
    esPrice: oev.filter((r) => r.hasEsPrice).length,
    batteryWarranty: oev.filter((r) => r.batteryWarranty).length,
    sourceDomainOnly: oev.filter((r) => r.sourceQuality === 'DOMAIN_ONLY').length,
  },
  S18: { version: vdb.version, license: vdb.license, models: vdb.models.length, cars: vdb.models.filter((m) => m.kind === 'car').length, carsAvailableEs: vdb.models.filter((m) => m.kind === 'car' && m.availability.includes('es')).length, makes: new Set(vdb.models.map((m) => m.make)).size },
  S19: { archived: true, lastDataUpdate: kw.updatedAt, records: kw.records.length, withUsable: kw.records.filter((r) => r.usableKwh !== undefined).length, withDc: kw.records.filter((r) => r.dcKw !== undefined).length, yearsFrom2024: kw.records.filter((r) => (r.year ?? 0) >= 2024).length, perRecordSources: 0 },
};

/* ───────── Evidencia oficial (RDW D1.1, Traficom D1.3, EEA D1) ───────── */
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
const tAgg = new Map((JSON.parse(await readFile(join(ROOT, 'docs/data/d13/traficom-aggregates.json'), 'utf8')) as { aggregates: TraficomAggregate[] }).aggregates.map((a) => [a.key, a]));
const d13 = JSON.parse(await readFile(join(ROOT, 'docs/data/d13/d2-readiness.json'), 'utf8')) as Array<{ rank: number; status: string; body: { value?: string } }>;
const d12x = JSON.parse(await readFile(join(ROOT, 'docs/data/d12/expansion-100.json'), 'utf8')) as Array<{ rank: number; technical: string; commercial: string; conflicts: number }>;
const d12overlap = JSON.parse(await readFile(join(ROOT, 'docs/data/d12/catalog-overlap-v1.json'), 'utf8')) as { overlaps: Array<{ rank: number; overlaps: Array<{ kind: string }> }> };
const d11x = JSON.parse(await readFile(join(ROOT, 'docs/data/d11/expansion.json'), 'utf8')) as Array<{ rank: number; criticalAfter: number; addedKeys: string[]; rdw: string }>;
const shortlist = (await readFile(join(ROOT, 'docs/data/d1/curation_candidates.jsonl'), 'utf8')).trim().split('\n').map((l) => CurationCandidate.parse(JSON.parse(l)));
/* Duplicados (D1.2): DUPLICATE (misma clave completa en el catálogo) o PROBABLE_DUPLICATE_TAN_INCOMPLETE → reconciliar, no insertar. */
const duplicateRanks = new Set<number>(d12overlap.overlaps.filter((o) => o.overlaps.some((k) => k.kind === 'DUPLICATE' || k.kind.startsWith('PROBABLE_DUPLICATE'))).map((o) => o.rank));
for (const x of d13) if (x.status === 'DUPLICATE') duplicateRanks.add(x.rank);
const range = (o: { value?: unknown; min?: number; max?: number } | undefined) => (o === undefined ? undefined : typeof o.value === 'number' ? { min: o.value, max: o.value } : o.min !== undefined && o.max !== undefined ? { min: o.min, max: o.max } : undefined);

const rightsOk = (code: string) => ['VERIFIED_PUBLIC_USE', 'CONDITIONAL'].includes(rightsDecision(code));
const byId = <T,>(xs: readonly T[], id: (x: T) => string) => new Map(xs.map((x) => [id(x), x]));
const odbById = byId(odb, (r) => r.id);
const asById = byId(as, (r) => r.slug);
const oevById = byId(oev, (r) => r.id);
const kwById = byId(kw.records, (r) => r.id);
const num = (s: string | undefined) => (s && s.trim() && Number.isFinite(Number(s)) ? Number(s) : undefined);
const defined = <T,>(xs: (T | undefined)[]) => xs.filter((x): x is T => x !== undefined && x !== null && (x as unknown) !== '');

/** Valores por campo de los registros coincidentes (en memoria; solo van a data/research). */
function externalValues(m: SourceMatch): Partial<Record<FieldKey, (number | string)[]>> & { _batteryBasisUnknown?: number[] } {
  const v: Partial<Record<FieldKey, (number | string)[]>> & { _batteryBasisUnknown?: number[] } = {};
  if (m.source === 'S15') {
    const rows = m.recordIds.map((id) => odbById.get(id)!);
    Object.assign(v, {
      generation: rows.map((r) => r.generation),
      body: defined(rows.map((r) => r.raw.Body_type || undefined)),
      transmission: defined(rows.map((r) => odbTransmission(r.raw.transmission))),
      seats: defined(rows.map((r) => num(r.raw.number_of_seats))),
      boot: defined(rows.map((r) => num(r.raw.minimum_trunk_capacity_l))),
      length: defined(rows.map((r) => num(r.raw.length_mm))),
      width: defined(rows.map((r) => num(r.raw.width_mm))),
      height: defined(rows.map((r) => num(r.raw.height_mm))),
      power: defined(rows.map((r) => (odbPowerKw(r.raw).kw !== undefined ? Math.round(odbPowerKw(r.raw).kw! * 10) / 10 : undefined))),
      torque: defined(rows.map((r) => num(r.raw.maximum_torque_n_m))),
      accel_0_100: defined(rows.map((r) => num(r.raw['acceleration_0_100_km/h_s']))),
      top_speed: defined(rows.map((r) => num(r.raw.max_speed_km_per_h))),
      drivetrain: defined(rows.map((r) => odbDrive(r.raw.drive_wheels))),
      fuel_tank: defined(rows.map((r) => num(r.raw.fuel_tank_capacity_l))),
    });
  } else if (m.source === 'S16') {
    const rows = m.recordIds.map((id) => asById.get(id)!) as AutoseekerRecord[];
    Object.assign(v, {
      generation: rows.map((r) => r.generation),
      body: defined(rows.map((r) => r.body)),
      seats: defined(rows.map((r) => r.values.seats)),
      boot: defined(rows.map((r) => r.values.bootL)),
      power: defined(rows.map((r) => (r.values.powerPs !== undefined ? Math.round(psToKw(r.values.powerPs) * 10) / 10 : undefined))),
      dc_charging: defined(rows.map((r) => r.values.dcKw)),
      electric_range: defined(rows.map((r) => r.values.wltpRangeKm)),
    });
    v._batteryBasisUnknown = defined(rows.map((r) => r.values.batteryKwh));
  } else if (m.source === 'S17') {
    const rows = m.recordIds.map((id) => oevById.get(id)!) as OevRecord[];
    Object.assign(v, {
      power: defined(rows.map((r) => r.systemPowerKw)),
      accel_0_100: defined(rows.map((r) => r.accel0100)),
      drivetrain: defined(rows.map((r) => r.drivetrain)),
      battery_gross: defined(rows.map((r) => r.batteryGrossKwh)),
      battery_usable: defined(rows.map((r) => r.batteryNetKwh)),
      ac_charging: defined(rows.map((r) => r.acKw)),
      dc_charging: defined(rows.map((r) => r.dcKw)),
      electric_range: defined(rows.map((r) => r.wltpRangeKm)),
      boot: defined(rows.map((r) => r.cargoL)),
    });
  } else {
    const rows = m.recordIds.map((id) => kwById.get(id)!) as KwRecord[];
    Object.assign(v, { battery_usable: defined(rows.map((r) => r.usableKwh)), ac_charging: defined(rows.map((r) => r.acKw)), dc_charging: defined(rows.map((r) => r.dcKw)) });
  }
  return v;
}

/* ───────── Por candidata ───────── */
const FIELDS = Object.keys(FIELD_RULES) as FieldKey[];
const research: unknown[] = [];
const results = shortlist.map((c) => {
  const t = c.technicalIdentity;
  const match = matchRdw({ tan: t.typeApprovalNumber, variant: t.variant, version: t.version }, rdwGroups.versions);
  const obs = match.level === 'EXACT' ? mapRdwVersions(match.versions, t.homologationPowertrain as HomologationPowertrain).observations : [];
  const o = (k: string) => obs.find((x) => x.key === k) as { value?: unknown; min?: number; max?: number } | undefined;
  const n = (k: string) => (typeof o(k)?.value === 'number' ? (o(k)!.value as number) : undefined);
  const rdw: RdwEvidence = {
    ...(['FWD', 'RWD', 'AWD'].includes(String(o('drivetrain')?.value)) ? { drivetrain: o('drivetrain')!.value as 'FWD' } : {}),
    ...(n('doors') !== undefined ? { doors: n('doors')! } : {}),
    ...(range(o('dim.length_mm')) ? { length: range(o('dim.length_mm'))! } : {}),
    ...(range(o('dim.width_mm')) ? { width: range(o('dim.width_mm'))! } : {}),
    ...(range(o('dim.height_mm')) ? { height: range(o('dim.height_mm'))! } : {}),
    ...(n('dim.wheelbase_mm') !== undefined ? { wheelbase: n('dim.wheelbase_mm')! } : {}),
    ...(n('perf.top_speed_kmh') !== undefined ? { topSpeed: n('perf.top_speed_kmh')! } : {}),
    ...(match.level === 'EXACT' && match.versions.some((v) => v.validFrom) ? { approvalFrom: match.versions.map((v) => v.validFrom!).filter(Boolean).sort()[0]! } : {}),
  };
  const traf = traficomTransmission(tAgg.get(traficomKey(t.typeApprovalNumber, t.variant, t.version)));
  const tx: TransmissionEvidence = c.powertrain.productClass === 'BEV' ? 'single_speed' : traf.value;
  const mc: MatchCandidate = { rank: c.rank!, familyId: c.familyId, technicalKey: `${t.typeApprovalNumber}|${t.variant}|${t.version}`, registrationYears: c.modelYear.eeaYears, productClass: c.powertrain.productClass, ...(t.fuel ? { fuel: t.fuel } : {}), ...(t.enginePowerKw !== undefined ? { powerKw: t.enginePowerKw } : {}), ...(t.engineCapacityCc !== undefined ? { displacementCc: t.engineCapacityCc } : {}) };
  const names = FAMILY_SOURCE_NAMES[c.familyId];
  const matches = [matchOdb(mc, names, odb, rdw, tx), matchAutoseeker(mc, names, as), matchOpenEv(mc, names, oev, rdw), matchKilowatt(mc, names, kw.records, rdw)];
  const taxonomy = vehiclesDbTaxonomy(names, vdb.models);

  /* Evidencia oficial por campo (clave exacta). */
  const eea = (k: string) => c.specValues.filter((s) => s.specKey === k).flatMap((s) => (s.value !== undefined ? [s.value] : s.min !== undefined && s.max !== undefined ? [s.min, s.max] : []));
  const off: Partial<Record<FieldKey, FieldEvidence[]>> = {};
  const addOff = (f: FieldKey, e: Omit<FieldEvidence, 'granularity' | 'officialExactKey'>) => (off[f] ??= []).push({ ...e, granularity: 'TECHNICAL_VARIANT', officialExactKey: true });
  if (eea('perf.power_max_kw').length) addOff('power', { source: 'S01', values: [...new Set(eea('perf.power_max_kw'))] });
  if (eea('rng.electric_combined_km').length) addOff('electric_range', { source: 'S01', values: [...new Set(eea('rng.electric_combined_km'))] });
  for (const [f, k] of [['length', 'length'], ['width', 'width'], ['height', 'height']] as const) if (rdw[k]) addOff(f, { source: 'S11', values: [rdw[k]!.min], envelope: rdw[k]! });
  if (n('seats') !== undefined) addOff('seats', { source: 'S11', values: [n('seats')!] });
  if (rdw.topSpeed !== undefined) addOff('top_speed', { source: 'S11', values: [rdw.topSpeed] });
  if (rdw.drivetrain) addOff('drivetrain', { source: 'S11', values: [rdw.drivetrain] });
  if (c.powertrain.productClass === 'BEV' && match.level === 'EXACT') addOff('transmission', { source: 'S11', values: ['single_speed'] });
  else if (traf.value) addOff('transmission', { source: 'S13', values: [traf.value] });
  const d13b = d13.find((x) => x.rank === c.rank)?.body.value;
  if (d13b) addOff('body', { source: c.familyId === 'byd-seal' ? 'S11' : 'S13', values: [d13b] });

  const ext = matches.map((m) => ({ m, v: externalValues(m) }));
  const preserved = (d12x.find((x) => x.rank === c.rank)?.conflicts ?? 0) > 0;
  const fields = FIELDS.map((f) => {
    const evidence: FieldEvidence[] = [...(off[f] ?? [])];
    for (const { m, v } of ext) {
      const vals = v[f] ?? [];
      if (vals.length) evidence.push({ source: m.source, values: vals, status: m.status, granularity: m.granularity });
      if (f === 'battery_usable' && v._batteryBasisUnknown?.length) evidence.push({ source: m.source, values: v._batteryBasisUnknown, status: m.status, granularity: m.granularity, notApplicableReason: 'battery basis (gross/usable) not declared' });
    }
    return assessField(f, evidence, rightsOk, preserved && f === 'electric_range');
  });
  research.push({ rank: c.rank, values: Object.fromEntries(ext.map(({ m, v }) => [m.source, { status: m.status, granularity: m.granularity, ids: m.recordIds, values: v }])) });

  /* Completitud crítica (misma función que D1/D1.1). */
  const pt = productPowertrain(c.powertrain.productClass);
  const d11 = d11x.find((x) => x.rank === c.rank)!;
  const base = new Set([...c.specValues.map((v) => v.specKey), ...c.idaeFieldsPresent.map((f) => f.split(' ')[0]!), ...d11.addedKeys]);
  const crit = (f: FieldKey) => FIELD_RULES[f].critical;
  const usableNew = new Set([...base, ...fields.filter((x) => x.usable && crit(x.field)).map((x) => crit(x.field)!)]);
  const informational = new Set([...base, ...fields.filter((x) => x.matched && crit(x.field)).map((x) => crit(x.field)!)]);
  const before = d1Coverage(pt, base, new Set()).criticalCompleteness;
  const afterUsable = d1Coverage(pt, usableNew, new Set());
  const afterInfo = d1Coverage(pt, informational, new Set()).criticalCompleteness;
  const x12 = d12x.find((x) => x.rank === c.rank)!;
  const tier = readinessTier({
    technicalExact: x12.technical.startsWith('EXACT'),
    rdwExact: d11.rdw === 'EXACT',
    duplicate: duplicateRanks.has(c.rank!),
    generationVerified: false,
    modelYearVerified: false,
    commercialExact: x12.commercial === 'EXACT',
    criticalComplete: afterUsable.missingCritical.length === 0,
    rightsPublishable: false,
  });
  return {
    rank: c.rank,
    candidateId: c.candidateId,
    pilot: c.pilot,
    label: `${c.commercialIdentity.family} ${c.modelYear.eeaYears.join('/')} (${c.powertrain.productClass})`,
    technicalKey: mc.technicalKey,
    technicalIdentity: x12.technical,
    rdw: d11.rdw,
    commercialIdentity: x12.commercial,
    matches,
    taxonomy,
    fields,
    criticalCompleteness: { before, afterUsable: afterUsable.criticalCompleteness, informationalIfResearchWereUsable: afterInfo, missingAfter: afterUsable.missingCritical },
    openConflicts: fields.flatMap((f) => f.conflicts.map((k) => ({ field: f.field, ...k }))),
    readiness: tier,
    valuesStored: false as const,
  };
});

/* ───────── Resúmenes ───────── */
const summarize = (rs: typeof results) => {
  const by = (src: string) => Object.fromEntries(['STRONG_COMPATIBLE_MATCH', 'WEAK_COMPATIBLE_MATCH', 'AMBIGUOUS', 'REJECTED', 'NOT_FOUND', 'EXACT_DOCUMENTED_LINK'].map((s) => [s, rs.filter((r) => r.matches.find((m) => m.source === src)!.status === s).length]));
  const f = (k: FieldKey) => ({ found: rs.filter((r) => r.fields.find((x) => x.field === k)!.found).length, matched: rs.filter((r) => r.fields.find((x) => x.field === k)!.matched).length, identityVerified: rs.filter((r) => r.fields.find((x) => x.field === k)!.identityVerified).length, rightsApproved: rs.filter((r) => r.fields.find((x) => x.field === k)!.rightsApproved).length, usable: rs.filter((r) => r.fields.find((x) => x.field === k)!.usable).length });
  const avg = (g: (r: (typeof rs)[number]) => number) => Math.round((rs.reduce((s, r) => s + g(r), 0) / rs.length) * 1000) / 10;
  return {
    candidates: rs.length,
    matching: { S15: by('S15'), S16: by('S16'), S17: by('S17'), S19: by('S19') },
    taxonomyFound: rs.filter((r) => r.taxonomy.found).length,
    taxonomyAvailableEs: rs.filter((r) => r.taxonomy.availableEs).length,
    fields: Object.fromEntries(FIELDS.map((k) => [k, f(k)])),
    criticalCompletenessPct: { before: avg((r) => r.criticalCompleteness.before), afterUsable: avg((r) => r.criticalCompleteness.afterUsable), informationalIfResearchWereUsable: avg((r) => r.criticalCompleteness.informationalIfResearchWereUsable) },
    conflicts: { candidatesWithConflicts: rs.filter((r) => r.openConflicts.length).length, externalVsExternal: rs.reduce((s, r) => s + r.openConflicts.filter((c) => c.kind === 'EXTERNAL_VS_EXTERNAL').length, 0), officialVsExternal: rs.reduce((s, r) => s + r.openConflicts.filter((c) => c.kind === 'OFFICIAL_VS_EXTERNAL').length, 0), preservedOfficial: rs.reduce((s, r) => s + r.openConflicts.filter((c) => c.kind === 'PRESERVED_OFFICIAL').length, 0) },
    generationVerified: 0,
    modelYearVerified: 0,
    commercialExact: rs.filter((r) => r.commercialIdentity === 'EXACT').length,
    tiers: rs.reduce<Record<string, number>>((m, r) => ((m[r.readiness.tier] = (m[r.readiness.tier] ?? 0) + 1), m), {}),
    previewReady: rs.filter((r) => r.readiness.previewReady).length,
    publicReady: rs.filter((r) => r.readiness.publicReady).length,
  };
};
const pilot = results.filter((r) => r.pilot);
const firstBatch = results
  .filter((r) => r.readiness.curatedTechnicalEligible)
  .sort((a, b) => Number(b.pilot) - Number(a.pilot) || b.criticalCompleteness.afterUsable - a.criticalCompleteness.afterUsable || a.rank! - b.rank!)
  .map((r) => ({
    rank: r.rank,
    candidateId: r.candidateId,
    pilot: r.pilot,
    label: r.label,
    technicalIdentity: `${r.technicalKey} — ${r.technicalIdentity}`,
    commercialIdentity: r.commercialIdentity,
    usableFields: r.fields.filter((f) => f.usable).map((f) => f.field),
    verifiedFieldsRightsPending: r.fields.filter((f) => f.identityVerified && !f.rightsApproved).map((f) => f.field),
    criticalCompleteness: r.criticalCompleteness.afterUsable,
    rights: 'S01 conditional (CC BY); S11/S13 pending human approval; S15 denied; S16–S19 pending',
    openConflicts: r.openConflicts.length,
    missingBlockers: r.readiness.blockers,
    previewReady: r.readiness.previewReady,
    publicReady: r.readiness.publicReady,
  }));

clearInterval(sampler);
await mkdir(OUT, { recursive: true });
await mkdir(RESEARCH, { recursive: true });
const write = (f: string, v: unknown) => writeFile(join(OUT, f), `${JSON.stringify(v, null, 2)}\n`);
await write('acquisition-manifests.json', manifests);
await write('source-profiles.json', profiles);
await write('matching-100.json', { rules: 'docs/data/D1_5_MULTI_SOURCE_MATCHING.md §2–3', valuesStored: false, summary100: summarize(results), summary20: summarize(pilot), candidates: results });
await write('d2-readiness.json', { summary20: summarize(pilot), curatedTechnicalProposed: firstBatch.filter((x) => x.pilot), approvedImportableUnderCurrentRules: [] });
await write('first-batch-proposal.json', { note: 'ADR-019 split NOT approved: this is the list that WOULD enter the curated technical dataset. Selectable (PREVIEW/PUBLIC): 0.', candidates: firstBatch });
await writeFile(join(RESEARCH, 'matched-values.json'), `${JSON.stringify({ warning: 'RESEARCH ONLY — third-party values, rights pending/denied, identity not verified. Do not import, publish or commit.', candidates: research }, null, 1)}\n`);
const run = { ms: Date.now() - started, peakRssMb: Math.round(peakRss / 1e6), odbRows: odb.length, autoseekerRows: as.length, openevRecords: oev.length, vehiclesdbModels: vdb.models.length, kilowattRecords: kw.records.length, candidates: results.length };
await write('build-run.json', run);
console.log(JSON.stringify(run));
