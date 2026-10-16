/**
 * Step D1.1 — construcción offline (sin red, sin MySQL, determinista).
 *
 *   node packages/curation/scripts/d11-build.ts
 *
 * Lee los brutos descritos en docs/data/d11/acquisition-manifests.json (verificando SHA-256), y escribe:
 *   docs/data/d11/pilot-results.json   10 candidatos: identidad, campos, conflictos, cobertura antes/después, derechos
 *   docs/data/d11/quality-catalog.json  evaluación con @vscar/quality real de las variants del catálogo (Golf 2018 ×2)
 *   docs/data/d11/expansion.json        100 candidatos: búsqueda RDW (Basis + Energiebron) y GIAVEH
 */
import { readFile, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { GOLF_2018_IDS, SOURCES, loadAllCases } from '@vscar/fixtures';
import { detectConflicts, evaluateEligibility, vehicleCompleteness } from '@vscar/quality';
import { dgtLabel } from '@vscar/methodology';
import { SpecValue, type HomologationPowertrain } from '@vscar/vehicle-schema';
import {
  groupRdwRows,
  indexGiaveh,
  giavehLookup,
  mapRdwVersions,
  matchRdw,
  readGiavehCsv,
  readRawPayload,
  verifyFileManifest,
  type AcquisitionManifest,
  type RdwDatasetName,
  RDW_DATASETS,
} from '@vscar/data-connectors';
import { CurationCandidate, d1Coverage, enrichCandidate, productPowertrain, rdwSpecValues } from '../src/index.ts';

const PILOT_RANKS = [3, 1, 2, 4, 76, 77, 55, 8, 73, 81] as const;
const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');
const DATA = join(ROOT, 'data');
const OUT = join(ROOT, 'docs', 'data', 'd11');
const started = Date.now();
let peakRss = 0;
const sampler = setInterval(() => (peakRss = Math.max(peakRss, process.memoryUsage().rss)), 100);

const manifests: AcquisitionManifest[] = JSON.parse(await readFile(join(OUT, 'acquisition-manifests.json'), 'utf8'));
for (const m of manifests) if (!(await verifyFileManifest(m, join(DATA, m.storedPath)))) throw new Error(`raw changed: ${m.storedPath}`);
const retrievedAt = manifests.filter((m) => m.sourceId === 'S11').map((m) => m.retrievedAt).sort()[0]!.slice(0, 10);

const datasetName = (id: string) => (Object.entries(RDW_DATASETS).find(([, d]) => d.id === id)?.[0] ?? id) as RdwDatasetName;
const pilotRows: Partial<Record<RdwDatasetName, unknown[]>> = {};
const expansionRows: Partial<Record<RdwDatasetName, unknown[]>> = {};
let rdwRows = 0;
let rdwBytes = 0;
for (const m of manifests.filter((x) => x.sourceId === 'S11')) {
  const payload = JSON.parse(await readRawPayload(join(DATA, m.storedPath))) as { dataset: { source_table: string }; results: unknown[] };
  rdwRows += payload.results.length;
  rdwBytes += m.fileSize;
  const name = datasetName(payload.dataset.source_table);
  if (!(name in RDW_DATASETS)) continue;
  const target = m.resourceTitle.includes('pilot-10') ? pilotRows : expansionRows;
  (target[name] ??= []).push(...payload.results);
}

const shortlist = (await readFile(join(ROOT, 'docs/data/d1/curation_candidates.jsonl'), 'utf8')).trim().split('\n').map((l) => CurationCandidate.parse(JSON.parse(l)));
const giavehManifest = manifests.find((m) => m.sourceId === 'S12' && m.storedPath.endsWith('.csv'))!;
const giaveh = await readGiavehCsv({ path: join(DATA, giavehManifest.storedPath) });
const gIndex = indexGiaveh(giaveh.records);

/* ───────── Piloto ───────── */
const pilotGroups = groupRdwRows(pilotRows);
const pilot = PILOT_RANKS.map((rank) => {
  const c = shortlist.find((x) => x.rank === rank)!;
  const t = c.technicalIdentity;
  const match = matchRdw({ tan: t.typeApprovalNumber, variant: t.variant, version: t.version }, pilotGroups.versions);
  const mapping = mapRdwVersions(match.versions, t.homologationPowertrain as HomologationPowertrain);
  const label = `${c.commercialIdentity.family} #${rank} (${c.powertrain.productClass}, ${c.modelYear.eeaYears.join('/')})`;
  const result = enrichCandidate({ candidate: c, label, match, mapping, giavehIndex: gIndex });
  return { rank, key: `${t.typeApprovalNumber} | ${t.variant} | ${t.version}`, match: { level: match.level, notes: match.notes, nearMisses: match.nearMisses, revisions: match.versions.map((v) => ({ revision: v.revision, validFrom: v.validFrom, validTo: v.validTo })) }, observations: mapping.observations, result };
});

/* ───────── Calidad real sobre variants del catálogo (Golf 2018 *33 / *35) ───────── */
const catalog = loadAllCases();
const qualityCatalog = [GOLF_2018_IDS.rvA, GOLF_2018_IDS.rvB].map((id) => {
  const v = catalog.variants.find((x) => x.id === id)!;
  const h = catalog.homologations.find((x) => x.id === v.homologation_id)!;
  const base = catalog.spec_values.filter((s) => s.variant_id === id);
  const prices = catalog.prices.filter((p) => p.variant_id === id);
  const p = pilot.find((x) => x.key.startsWith(`${h.type_approval_number!.toUpperCase()} | ${h.variant_code} | ${h.version_code}`));
  const obs = p && p.match.level === 'EXACT' ? p.observations : [];
  const { values: rdw, invalid } = rdwSpecValues(obs, v, retrievedAt);
  const seats = obs.find((o) => o.key === 'seats')?.value as number | undefined;
  const euro = obs.find((o) => o.key === 'emissions_standard_family')?.value as 'EURO_6' | undefined;
  const label = dgtLabel({ homologation_powertrain: h.homologation_powertrain, ...(v.technical.fuel_type ? { fuel_type: v.technical.fuel_type } : {}), emissions_standard_family: euro ?? h.emissions_standard_family });
  const dgt = label.label
    ? [SpecValue.parse({ id: `${id.slice(0, 24)}d6d6d6d6d6d6`, variant_id: id, spec_key: 'emi.dgt_label_es', value: label.label, unit: null, source_id: SOURCES.dgt.id, source_url: label.rule_source_url, source_market: 'ES', reference_market: 'ES', source_authority: 'CALCULATED', mapping_confidence: 'EXACT', homologation_match: 'NOT_APPLICABLE', retrieved_at: retrievedAt, status: 'DRAFT', transformation: 'derived', transformation_version: 1, notes: `rule_version=${label.rule_version}; ${label.reason}; Euro family from RDW uitlaatemissieniveau (S11)` })]
    : [];
  const variantAfter = seats !== undefined ? { ...v, technical: { ...v.technical, seats } } : v;
  const evalCats = (vv: typeof v, vals: SpecValue[]) => Object.fromEntries(Object.entries(evaluateEligibility({ variant: vv, homologation: { ...h, ...(euro && vv !== v ? { emissions_standard_family: euro } : {}) }, values: vals, prices })).map(([k, x]) => [k, { status: x.status, missing: x.missing, partial: x.partial_reasons }]));
  const after = [...base, ...rdw, ...dgt];
  return {
    variant: v.slug,
    homologation: `${h.type_approval_number} | ${h.variant_code} | ${h.version_code}`,
    rdwSpecValues: rdw.length,
    invalidRdwValues: invalid,
    before: { completeness: vehicleCompleteness(v, base), categories: evalCats(v, base) },
    after: { completeness: vehicleCompleteness(variantAfter, after), categories: evalCats(variantAfter, after) },
    conflicts: detectConflicts(after).map((c) => ({ spec_key: c.spec_key, values: c.value_ids.length, requiresHumanReview: c.requires_human_review, proposed: c.proposed_value_id ?? null, rationale: c.rationale })),
    dgt: label,
    seatsFromRdw: seats ?? null,
  };
});

/* ───────── Expansión (100) ───────── */
const expGroups = groupRdwRows(expansionRows);
const expansion = shortlist.map((c) => {
  const t = c.technicalIdentity;
  const match = matchRdw({ tan: t.typeApprovalNumber, variant: t.variant, version: t.version }, expGroups.versions);
  const mapping = mapRdwVersions(match.versions, t.homologationPowertrain as HomologationPowertrain);
  const obs = mapping.observations;
  const pt = productPowertrain(c.powertrain.productClass);
  const before = new Set([...c.specValues.map((v) => v.specKey), ...c.idaeFieldsPresent.map((f) => f.split(' ')[0]!)]);
  const after = new Set(before);
  for (const o of obs) if (o.target === 'spec') after.add(o.key);
  if (obs.some((o) => o.key === 'seats')) after.add('seats');
  const euro = obs.find((o) => o.key === 'emissions_standard_family')?.value as 'EURO_6' | undefined;
  const range = c.specValues.find((v) => v.specKey === 'rng.electric_combined_km');
  const dgt = dgtLabel({ homologation_powertrain: t.homologationPowertrain as HomologationPowertrain, ...(t.fuel ? { fuel_type: t.fuel } : {}), emissions_standard_family: euro ?? 'UNKNOWN', ...(range ? { electric_range_km: { min: range.value ?? range.min!, max: range.value ?? range.max! } } : {}) });
  // Atribución: la etiqueta solo se acredita a RDW si sin su norma Euro la regla no decide.
  const dgtEeaOnly = dgtLabel({ homologation_powertrain: t.homologationPowertrain as HomologationPowertrain, ...(t.fuel ? { fuel_type: t.fuel } : {}), emissions_standard_family: 'UNKNOWN', ...(range ? { electric_range_km: { min: range.value ?? range.min!, max: range.value ?? range.max! } } : {}) });
  const eeaRule = new Set(before);
  if (dgtEeaOnly.label) eeaRule.add('emi.dgt_label_es');
  if (dgt.label) after.add('emi.dgt_label_es');
  const cb = d1Coverage(pt, before, new Set());
  const ce = d1Coverage(pt, eeaRule, new Set());
  const ca = d1Coverage(pt, after, new Set());
  const g = giavehLookup(gIndex, t.typeApprovalNumber, t.types);
  return {
    rank: c.rank,
    family: c.familyId,
    productClass: c.powertrain.productClass,
    period: c.modelYear.period,
    identity: c.identityStatus,
    rdw: match.level,
    giaveh: g.status,
    criticalBefore: cb.criticalCompleteness,
    criticalAfterEeaRule: ce.criticalCompleteness,
    criticalAfter: ca.criticalCompleteness,
    dgtSource: dgtEeaOnly.label ? 'EEA+RULE' : dgt.label ? 'EEA+RDW+RULE' : 'NONE',
    missingAfter: ca.missingCritical,
    addedKeys: [...after].filter((k) => !before.has(k)).sort(),
    phevChargeSustaining: obs.some((o) => o.key === 'nrg.fuel_charge_sustaining_l100'),
  };
});

clearInterval(sampler);
const run = { ms: Date.now() - started, peakRssMb: Math.round(peakRss / 1e6), rdwRowsRead: rdwRows, rdwBytes, giavehRows: giaveh.rows, giavehBytes: giavehManifest.fileSize, groupingIssues: [...pilotGroups.issues, ...expGroups.issues].length };
await writeFile(join(OUT, 'pilot-results.json'), `${JSON.stringify(pilot, null, 2)}\n`);
await writeFile(join(OUT, 'quality-catalog.json'), `${JSON.stringify(qualityCatalog, null, 2)}\n`);
await writeFile(join(OUT, 'expansion.json'), `${JSON.stringify(expansion, null, 2)}\n`);
await writeFile(join(OUT, 'build-run.json'), `${JSON.stringify(run, null, 2)}\n`);
console.log(JSON.stringify(run));
