/**
 * Step D1.2 — construcción offline (sin red, sin MySQL, determinista). No modifica artefactos D1/D1.1.
 *
 *   node packages/curation/scripts/d12-build.ts
 *
 * Entradas: brutos D1 (EEA, IDAE), D1.1 (RDW), D1.2 (RDW handelsbenaming); `docs/data/d12/commercial-identity-v1.json`
 * (curación manual versionada). Salidas en docs/data/d12/:
 *   commercial-evidence.json   evidencia automática de los 100 (denominaciones EEA, códigos IDAE por referencia)
 *   commercial-identity-validation.json  resultado del validador anti-invención sobre la curación
 *   d2-batch-readiness.json    clasificación de las 20 candidatas D2
 *   catalog-overlap-v1.json    corrección versionada: solapamientos con el catálogo (incl. DC-08)
 *   expansion-100.json         impacto sobre los 100
 */
import { readFile, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadAllCases } from '@vscar/fixtures';
import { normalizeTan, readIdaeCsv, readRawPayload, verifyFileManifest, type AcquisitionManifest } from '@vscar/data-connectors';
import {
  CommercialIdentityArtifact,
  CurationCandidate,
  catalogOverlap,
  summarizeCommercialEvidence,
  validateCommercialEntry,
  type CommercialEvidenceRef,
  type IdentityStatus,
} from '../src/index.ts';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');
const DATA = join(ROOT, 'data');
const OUT = join(ROOT, 'docs', 'data', 'd12');
const started = Date.now();

const manifests = async (p: string) => JSON.parse(await readFile(join(ROOT, p), 'utf8')) as AcquisitionManifest[];
const d1m = await manifests('docs/data/d1/acquisition-manifests.json');
const d12m = await manifests('docs/data/d12/acquisition-manifests.json');
for (const m of [...d1m, ...d12m]) if (!(await verifyFileManifest(m, join(DATA, m.storedPath)))) throw new Error(`raw changed: ${m.storedPath}`);

const shortlist = (await readFile(join(ROOT, 'docs/data/d1/curation_candidates.jsonl'), 'utf8')).trim().split('\n').map((l) => CurationCandidate.parse(JSON.parse(l)));
const keyOf = (t: { typeApprovalNumber: string; variant: string; version: string }) => `${t.typeApprovalNumber}|${t.variant}|${t.version}`;
const wanted = new Set(shortlist.map((c) => keyOf(c.technicalIdentity)));

// Denominaciones EEA por clave exacta (todas las filas, todos los años encuestados).
const designations = new Map<string, Map<string, number>>();
const designationRecords = new Map<string, Map<string, { record: string; registrations: number }[]>>();
for (const m of d1m.filter((x) => x.storedPath.includes('eea-d1-survey'))) {
  const p = JSON.parse(await readRawPayload(join(DATA, m.storedPath))) as { dataset: { dataset_year: number; dataset_status: string }; results: Record<string, unknown>[] };
  for (const r of p.results) {
    if (!r.TAN || !r.Va || !r.Ve) continue;
    const k = `${normalizeTan(String(r.TAN))}|${String(r.Va).toUpperCase()}|${String(r.Ve).toUpperCase()}`;
    if (!wanted.has(k)) continue;
    const name = String(r.Cn ?? '').trim();
    const n = Number(r.R ?? 0);
    const dm = designations.get(k) ?? new Map<string, number>();
    dm.set(name, (dm.get(name) ?? 0) + n);
    designations.set(k, dm);
    const rec = `${p.dataset.dataset_year}${p.dataset.dataset_status === 'FINAL' ? 'F' : 'P'}:${k}`;
    const rm = designationRecords.get(k) ?? new Map();
    rm.set(name, [...(rm.get(name) ?? []), { record: rec, registrations: n }]);
    designationRecords.set(k, rm);
  }
}

const im = d1m.find((m) => m.sourceId === 'S02')!;
const idae = await readIdaeCsv({ path: join(DATA, im.storedPath), fileSha256: im.sha256, editionYear: 2026 });
const idaeByLine = new Map(idae.records.map((r) => [r.line, r]));

// RDW handelsbenaming (D1.2) → nombres permitidos por clave exacta.
const hm = d12m.find((m) => m.resourceTitle.includes('d2-20 handelsbenaming'))!;
const hrows = JSON.parse(await readRawPayload(join(DATA, hm.storedPath))).results as Record<string, string>[];
const rdwNames = new Map<string, string[]>();
for (const r of hrows) {
  const k = `${normalizeTan(r.typegoedkeuringsnummer!)}|${(r.codevariantgk ?? '').toUpperCase()}|${(r.codeuitvoeringtgk ?? '').toUpperCase()}`;
  rdwNames.set(k, [...new Set([...(rdwNames.get(k) ?? []), r.handelsbenamingfabrikant!.trim()])].sort());
}

/* 1) Evidencia automática (100). Para IDAE solo referencias de línea (derechos S02 pendientes). */
const evidence = shortlist.map((c) => {
  const k = keyOf(c.technicalIdentity);
  const s = summarizeCommercialEvidence(c, designations.get(k) ?? new Map(), idae.records);
  return { rank: c.rank, candidateId: c.candidateId, familyId: c.familyId, key: k, pilot: c.pilot, ...s, rdwPermittedNames: rdwNames.get(k)?.length ?? null };
});

/* 2) Curación versionada + validador anti-invención. */
const artifact = CommercialIdentityArtifact.parse(JSON.parse(await readFile(join(OUT, 'commercial-identity-v1.json'), 'utf8')));
const resolveText = (ref: CommercialEvidenceRef): string | undefined => {
  if (ref.text) return ref.text;
  if (ref.sourceId === 'S02') {
    const m = /^S02:[0-9a-f]{12}:L(\d+)$/.exec(ref.record);
    const r = m ? idaeByLine.get(Number(m[1])) : undefined;
    return r ? `${r.model} ${r.version}` : undefined;
  }
  return undefined;
};
// Las evidencias EEA citadas deben existir en el bruto con esa cuota.
const eeaIssues = (ref: CommercialEvidenceRef, key: string): string[] => {
  if (ref.sourceId !== 'S01') return [];
  const dm = designations.get(key);
  const n = dm?.get(ref.text ?? '');
  if (n === undefined) return [`S01 designation "${ref.text}" not found for ${key}`];
  const total = [...dm!.values()].reduce((a, b) => a + b, 0);
  const share = n / total;
  return Math.abs(share - (ref.share ?? share)) > 0.005 || (ref.registrations !== undefined && ref.registrations !== n) ? [`S01 share/registrations mismatch for "${ref.text}": raw ${n} (${share.toFixed(3)})`] : [];
};
const validation = artifact.entries.map((e) => ({ rank: e.rank, key: e.technicalIdentityKey, identity: e.identityConfidence, issues: [...validateCommercialEntry(e, resolveText), ...e.evidence.flatMap((r) => eeaIssues(r, e.technicalIdentityKey))] }));
const invalid = validation.filter((v) => v.issues.length);

/* 3) Solapamiento con el catálogo (estrategia canónica). */
const catalog = loadAllCases();
const catRefs = catalog.homologations.map((h) => ({ variantSlug: catalog.variants.find((v) => v.homologation_id === h.id)?.slug ?? h.id, ...(h.type_approval_number ? { tan: h.type_approval_number } : {}), ...(h.variant_code ? { variant: h.variant_code } : {}), ...(h.version_code ? { version: h.version_code } : {}) }));
const overlap = shortlist
  .map((c) => ({ rank: c.rank, candidateId: c.candidateId, key: keyOf(c.technicalIdentity), d1ExistingCatalogOverlap: c.existingCatalogOverlap ?? null, overlaps: catalogOverlap({ tan: c.technicalIdentity.typeApprovalNumber, variant: c.technicalIdentity.variant, version: c.technicalIdentity.version }, catRefs) }))
  .filter((o) => o.overlaps.length || o.d1ExistingCatalogOverlap);

/* 4) Lote D2 (20). */
const d11 = JSON.parse(await readFile(join(ROOT, 'docs/data/d11/expansion.json'), 'utf8')) as Array<{ rank: number; rdw: string; criticalBefore: number; criticalAfter: number; missingAfter: string[]; dgtSource: string }>;
const d11pilot = JSON.parse(await readFile(join(ROOT, 'docs/data/d11/pilot-results.json'), 'utf8')) as Array<{ rank: number; result: { conflicts: Array<{ key: string }> }; observations: Array<{ key: string; value?: unknown }> }>;
const curatedByRank = new Map(artifact.entries.map((e) => [e.rank, e]));
const S08_KEYS = new Set(['cap.boot_l', 'perf.accel_0_100_s', 'price', 'war.years', 'pt.fuel_tank_l', 'chg.ac_max_kw', 'chg.dc_max_kw', 'perf.power_max_kw', 'nrg.fuel_charge_sustaining_l100']);
const batch = shortlist
  .filter((c) => c.pilot)
  .map((c) => {
    const k = keyOf(c.technicalIdentity);
    const x = d11.find((e) => e.rank === c.rank)!;
    const cur = curatedByRank.get(c.rank!);
    const commercial: IdentityStatus = cur?.identityConfidence ?? 'UNCONFIRMED';
    const technical: IdentityStatus = c.identityStatus === 'CONFLICTED' ? 'CONFLICTED' : 'EXACT';
    const conflicts = d11pilot.find((p) => p.rank === c.rank)?.result.conflicts.map((x) => x.key) ?? (c.familyId === 'byd-seal' ? ['nrg.electric_combined_kwh100', 'rng.electric_combined_km'] : []);
    const ov = overlap.find((o) => o.rank === c.rank)?.overlaps ?? [];
    // Campos obligatorios del schema ReferenceVariant (Catalog v0.2 §2.1/§2.4) que exigen evidencia.
    const schemaBlockers = [
      'commercial.generation_code (sin fuente oficial abierta)',
      'commercial.model_year (sin fuente oficial: la EEA da año de matriculación)',
      ...(cur?.commercialTrim ? [] : ['commercial.trim_name (acabado no evidenciado)']),
      ...(cur?.commercialBody || ['byd-seal'].includes(c.familyId) ? [] : ['commercial.body_type (código UE AB/AC/AF ambiguo)']),
      ...(c.powertrain.productClass === 'BEV' || cur?.commercialTransmission ? [] : ['technical.transmission (código RDW sin glosario)']),
    ];
    const data = x.missingAfter.filter((m) => S08_KEYS.has(m) || m.startsWith('dim.') || m === 'seats' || m === 'emi.dgt_label_es');
    const rights = ['S08 (datos que faltan: ❓/restringido)', ...(x.rdw === 'EXACT' ? ['S11 RDW ❓ (expediente listo para aprobación)'] : []), ...(cur?.evidenceRights === 'PENDING_REVIEW' ? ['S02 IDAE ❓ (evidencia del acabado)'] : [])];
    const status = ov.some((o) => o.kind === 'DUPLICATE' || o.kind === 'PROBABLE_DUPLICATE_TAN_INCOMPLETE')
      ? 'BLOCKED'
      : commercial !== 'EXACT' || schemaBlockers.length
        ? 'NEEDS_IDENTITY_REVIEW'
        : data.length
          ? 'NEEDS_DATA_COMPLETION'
          : 'NEEDS_RIGHTS_REVIEW';
    return {
      rank: c.rank,
      candidateId: c.candidateId,
      label: `${c.commercialIdentity.family} ${c.modelYear.eeaYears.join('/')} (${c.powertrain.productClass})`,
      key: k,
      technicalIdentity: technical,
      technicalCorroboration: x.rdw,
      commercialIdentity: commercial,
      commercialFields: cur ? { model: cur.commercialModel ?? null, engine: cur.commercialEngine ?? null, transmission: cur.commercialTransmission ?? null, body: cur.commercialBody ?? null, trim: cur.commercialTrim ?? null, trimSet: cur.commercialTrimSet ?? null } : null,
      criticalCompleteness: { d1: x.criticalBefore, afterRdw: x.criticalAfter },
      conflictStatus: conflicts.length ? `OPEN: ${conflicts.join(', ')}` : 'NONE',
      catalogOverlap: ov,
      blockers: { identity: schemaBlockers.concat(commercial === 'EXACT' ? [] : [`commercial identity ${commercial}`]), data, rights, duplicate: ov.map((o) => `${o.kind} ${o.variantSlug}`) },
      curationReadiness: status,
      previewImportableUnderCurrentRules: false,
      publicationReadiness: 'NOT_ELIGIBLE',
    };
  });

/* 5) Impacto sobre los 100. */
const expansion = shortlist.map((c) => {
  const e = evidence.find((x) => x.rank === c.rank)!;
  const x = d11.find((y) => y.rank === c.rank)!;
  const cur = curatedByRank.get(c.rank!);
  return { rank: c.rank, family: c.familyId, technical: x.rdw === 'EXACT' ? 'EXACT (EEA+RDW)' : 'EXACT (EEA only)', commercial: cur?.identityConfidence ?? e.indicative, commercialSource: cur ? 'CURATED_D1_2' : `AUTO:${e.level}`, criticalAfterRdw: x.criticalAfter, conflicts: c.familyId === 'byd-seal' ? 2 : 0, previewReady: false, publicReady: false };
});

await writeFile(join(OUT, 'commercial-evidence.json'), `${JSON.stringify(evidence, null, 2)}\n`);
await writeFile(join(OUT, 'commercial-identity-validation.json'), `${JSON.stringify({ entries: validation.length, invalid: invalid.length, validation }, null, 2)}\n`);
await writeFile(join(OUT, 'catalog-overlap-v1.json'), `${JSON.stringify({ correctionVersion: 1, step: 'D1.2', supersedes: 'docs/data/d1/curation_candidates.jsonl field existingCatalogOverlap (not modified)', rule: 'canonical key = full TAN (with extension) + Va + Ve; partial matches never merge', overlaps: overlap }, null, 2)}\n`);
await writeFile(join(OUT, 'd2-batch-readiness.json'), `${JSON.stringify(batch, null, 2)}\n`);
await writeFile(join(OUT, 'expansion-100.json'), `${JSON.stringify(expansion, null, 2)}\n`);
console.log(JSON.stringify({ ms: Date.now() - started, curated: artifact.entries.length, invalid: invalid.length, overlaps: overlap.length }));
if (invalid.length) {
  console.error(JSON.stringify(invalid, null, 2));
  process.exitCode = 1;
}
