/**
 * Step D1.6 — plan de la capa de CURACIÓN TÉCNICA (offline, sin MySQL, determinista). No modifica artefactos D1–D1.5.
 *
 *   node packages/curation/scripts/d16-build.ts
 *
 * Entradas: candidatas D1, RDW bruto (D1.1, SHA-256 verificado), agregados Traficom (D1.3), identidad comercial y
 * solapamientos (D1.2), propuesta de primer lote (D1.5). Solo fuentes oficiales con clave exacta (S01, S11, S13).
 * Salidas:
 *   data/curation/d16/plan-first-18.json   plan importable (lo consume `packages/db/scripts/technical-import.ts`; fuera de Git)
 *   docs/data/d16/first-18-plan.json        resumen sin valores (versionado)
 *   docs/data/d16/expansion-92.json         manifiesto de ampliación (versionado; nada se importa)
 */
import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { RDW_DATASETS, groupRdwRows, mapRdwVersions, matchRdw, readRawPayload, traficomKey, verifyFileManifest, type AcquisitionManifest, type RdwDatasetName, type TraficomAggregate } from '@vscar/data-connectors';
import type { HomologationPowertrain } from '@vscar/vehicle-schema';
import { CommercialIdentityArtifact, CurationCandidate, TECHNICAL_SOURCES, buildTechnicalPlan, type TechnicalPlanResult } from '../src/index.ts';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');
const DATA = join(ROOT, 'data');
const OUT = join(ROOT, 'docs', 'data', 'd16');
const PLAN_DIR = join(DATA, 'curation', 'd16');
const json = async <T,>(p: string) => JSON.parse(await readFile(join(ROOT, p), 'utf8')) as T;

const shortlist = (await readFile(join(ROOT, 'docs/data/d1/curation_candidates.jsonl'), 'utf8')).trim().split('\n').map((l) => CurationCandidate.parse(JSON.parse(l)));
const proposal = await json<{ candidates: Array<{ rank: number; pilot: boolean }> }>('docs/data/d15/first-batch-proposal.json');
const FIRST_18 = [5, 6, 8, 9, 20, 24, 26, 27, 28, 7, 48, 56, 86, 4, 53, 57, 73, 81];
const proposedPilot = proposal.candidates.filter((c) => c.pilot).map((c) => c.rank);
if (JSON.stringify([...proposedPilot].sort((a, b) => a - b)) !== JSON.stringify([...FIRST_18].sort((a, b) => a - b))) throw new Error('first-batch proposal changed: expected exactly the 18 approved candidates');

/* RDW (D1.1): bruto verificado por SHA-256. */
const d11m = await json<AcquisitionManifest[]>('docs/data/d11/acquisition-manifests.json');
const datasetName = (id: string) => (Object.entries(RDW_DATASETS).find(([, d]) => d.id === id)?.[0] ?? id) as RdwDatasetName;
/* Igual que D1.1: los 10 pilotos usan su adquisición piloto (más recursos RDW); el resto, la de expansión. */
const PILOT_RANKS = new Set([3, 1, 2, 4, 76, 77, 55, 8, 73, 81]);
const rdwRows: Partial<Record<RdwDatasetName, unknown[]>> = {};
const pilotRows: Partial<Record<RdwDatasetName, unknown[]>> = {};
for (const m of d11m.filter((x) => x.sourceId === 'S11')) {
  if (!(await verifyFileManifest(m, join(DATA, m.storedPath)))) throw new Error(`raw changed: ${m.storedPath}`);
  const payload = JSON.parse(await readRawPayload(join(DATA, m.storedPath))) as { dataset: { source_table: string }; results: unknown[] };
  const name = datasetName(payload.dataset.source_table);
  const target = m.resourceTitle.includes('pilot-10') ? pilotRows : rdwRows;
  if (name in RDW_DATASETS) (target[name] ??= []).push(...payload.results);
}
const rdwRetrievedAt = d11m.filter((m) => m.sourceId === 'S11').map((m) => m.retrievedAt).sort()[0]!.slice(0, 10);
const rdwGroups = groupRdwRows(rdwRows);
const pilotGroups = groupRdwRows(pilotRows);

const traficom = await json<{ aggregates: TraficomAggregate[] }>('docs/data/d13/traficom-aggregates.json');
const tAgg = new Map(traficom.aggregates.map((a) => [a.key, a]));
const commercial = CommercialIdentityArtifact.parse(await json('docs/data/d12/commercial-identity-v1.json'));
const overlap = await json<{ overlaps: Array<{ rank: number; overlaps: Array<{ kind: string }> }> }>('docs/data/d12/catalog-overlap-v1.json');

const plans = new Map<number, TechnicalPlanResult>();
for (const c of shortlist) {
  const t = c.technicalIdentity;
  const match = matchRdw({ tan: t.typeApprovalNumber, variant: t.variant, version: t.version }, (PILOT_RANKS.has(c.rank!) ? pilotGroups : rdwGroups).versions);
  const observations = match.level === 'EXACT' ? mapRdwVersions(match.versions, t.homologationPowertrain as HomologationPowertrain).observations : [];
  const agg = tAgg.get(traficomKey(t.typeApprovalNumber, t.variant, t.version));
  const ce = commercial.entries.find((e) => e.rank === c.rank);
  plans.set(
    c.rank!,
    buildTechnicalPlan({
      candidate: c,
      rdw: { level: match.level, observations, retrievedAt: rdwRetrievedAt },
      ...(agg ? { traficom: agg } : {}),
      traficomRetrievedAt: '2026-10-16',
      ...(ce ? { commercial: ce } : {}),
      catalogOverlap: overlap.overlaps.find((o) => o.rank === c.rank)?.overlaps.map((o) => o.kind) ?? [],
    }),
  );
}

/* Primer lote: exactamente los 18 aprobados. */
const first = FIRST_18.map((rank) => ({ rank, plan: plans.get(rank)! }));
const notEligible = first.filter((x) => !x.plan.eligible);
const items = first.filter((x) => x.plan.eligible).map((x) => x.plan.item!);
const planDoc = { batchKey: 'd16-first-18', step: 'D1.6', candidates: FIRST_18, sources: TECHNICAL_SOURCES, items };
const planText = `${JSON.stringify(planDoc, null, 1)}\n`;
await mkdir(PLAN_DIR, { recursive: true });
await writeFile(join(PLAN_DIR, 'plan-first-18.json'), planText);

const sum = (r: number, p: TechnicalPlanResult) => {
  const it = p.item;
  const by = (code: string) => it?.observations.filter((o) => o.source_code === code).length ?? 0;
  return {
    rank: r,
    candidateId: shortlist.find((c) => c.rank === r)!.candidateId,
    technicalKey: p.technicalKey,
    eligible: p.eligible,
    ...(p.exclusion ? { exclusion: p.exclusion } : {}),
    ...(it
      ? {
          vehicleId: it.vehicle.id,
          label: `${it.vehicle.brand} ${it.vehicle.model} · matriculado ${it.vehicle.registration_period.first_observed_year}${it.vehicle.registration_period.last_observed_year !== it.vehicle.registration_period.first_observed_year ? `–${it.vehicle.registration_period.last_observed_year}` : ''} (${it.vehicle.product_class})`,
          curationStatus: it.vehicle.curation_status,
          commercialIdentity: it.vehicle.commercial_identity_status,
          observations: { S01: by('S01'), S11: by('S11'), total: it.observations.length, usable: it.observations.filter((o) => o.quality_status === 'USABLE').length, inConflict: it.observations.filter((o) => o.conflict_status === 'IN_CONFLICT').length },
          attributes: it.attributes.map((a) => `${a.kind}:${a.attribute}:${a.status}:${a.source_code}`),
          rights: Object.fromEntries([...new Set(it.observations.map((o) => o.source_code).concat(it.attributes.map((a) => a.source_code)))].sort().map((s) => [s, [...it.observations.filter((o) => o.source_code === s).map((o) => o.rights_status), ...it.attributes.filter((a) => a.source_code === s).map((a) => a.rights_status)][0]])),
          blockers: it.vehicle.blockers,
        }
      : {}),
    criticalCompleteness: Math.round(p.criticalCompleteness * 1000) / 1000,
    missingCritical: p.missingCritical,
    invalidSourceValues: p.invalid,
  };
};
await mkdir(OUT, { recursive: true });
await writeFile(
  join(OUT, 'first-18-plan.json'),
  `${JSON.stringify({ batchKey: planDoc.batchKey, planSha256: createHash('sha256').update(planText).digest('hex'), eligible: items.length, notEligible: notEligible.map((x) => ({ rank: x.rank, reason: x.plan.exclusion })), candidates: first.map((x) => sum(x.rank, x.plan)) }, null, 2)}\n`,
);

/* Ampliación: manifiesto de las 100 (las 92 propuestas en D1.5 + el resto), sin importar nada. */
const expansion = shortlist.map((c) => {
  const p = plans.get(c.rank!)!;
  const t = c.technicalIdentity;
  const it = p.item;
  return {
    rank: c.rank,
    candidateId: c.candidateId,
    fullTan: t.typeApprovalNumber,
    variant: t.variant,
    version: t.version,
    inFirst18: FIRST_18.includes(c.rank!),
    existingCatalogOverlap: overlap.overlaps.find((o) => o.rank === c.rank)?.overlaps.map((o) => o.kind) ?? [],
    rights: it ? Object.fromEntries(it.vehicle.source_codes.map((s) => [s, it.observations.find((o) => o.source_code === s)?.rights_status ?? it.attributes.find((a) => a.source_code === s)?.rights_status])) : {},
    criticalCompleteness: Math.round(p.criticalCompleteness * 1000) / 1000,
    missingCritical: p.missingCritical,
    conflicts: it ? it.observations.filter((o) => o.conflict_status === 'IN_CONFLICT').length : 0,
    curationEligibility: p.eligible ? 'ELIGIBLE' : 'NOT_ELIGIBLE',
    ...(p.exclusion ? { reason: p.exclusion } : {}),
  };
});
const eligible = expansion.filter((e) => e.curationEligibility === 'ELIGIBLE');
await writeFile(
  join(OUT, 'expansion-92.json'),
  `${JSON.stringify({ note: 'Assessment only — nothing imported beyond the first 18.', candidates: expansion.length, eligible: eligible.length, eligibleOutsideFirst18: eligible.filter((e) => !e.inFirst18).length, notEligible: expansion.filter((e) => e.curationEligibility === 'NOT_ELIGIBLE').map((e) => ({ rank: e.rank, reason: e.reason })), items: expansion }, null, 2)}\n`,
);
console.log(JSON.stringify({ firstBatchEligible: items.length, notEligible: notEligible.map((x) => x.rank), observations: items.reduce((s, i) => s + i.observations.length, 0), attributes: items.reduce((s, i) => s + i.attributes.length, 0), invalid: first.reduce((s, x) => s + x.plan.invalid.length, 0), expansionEligible: eligible.length }));

/*
 * Step D1.6a — manifiesto de las 100 candidatas y lotes de las 74 pendientes (NO se importa nada).
 * Orden:
 * 1. riesgo: sin conflictos ni solapamiento < con conflictos < solapamiento parcial con el catálogo;
 * 2. completitud crítica descendente, luego rank;
 * 3. dentro de cada nivel, reparto rotatorio por clase de tren motriz (diversidad ICE/HEV/PHEV/BEV);
 * 4. trozos de 15 (el último, el resto).
 * Las 8 no elegibles se listan con su causa exacta y no se sustituyen.
 */
const D16A_DOCS = join(ROOT, 'docs', 'data', 'd16a');
const D16A_PLANS = join(DATA, 'curation', 'd16a');
const BATCH_SIZE = 15;
const BATCH_NAMES = ['A', 'B', 'C', 'D', 'E', 'F'];
const pending = shortlist.filter((c) => plans.get(c.rank!)!.eligible && !FIRST_18.includes(c.rank!));
const riskTier = (c: CurationCandidate) => {
  const it = plans.get(c.rank!)!.item!;
  if ((overlap.overlaps.find((o) => o.rank === c.rank)?.overlaps ?? []).length) return 2;
  return it.observations.some((o) => o.conflict_status === 'IN_CONFLICT') ? 1 : 0;
};
const ordered: CurationCandidate[] = [];
for (const tier of [0, 1, 2]) {
  const inTier = pending.filter((c) => riskTier(c) === tier).sort((a, b) => plans.get(b.rank!)!.criticalCompleteness - plans.get(a.rank!)!.criticalCompleteness || a.rank! - b.rank!);
  const byClass = new Map<string, CurationCandidate[]>();
  for (const c of inTier) byClass.set(plans.get(c.rank!)!.item!.vehicle.product_class, [...(byClass.get(plans.get(c.rank!)!.item!.vehicle.product_class) ?? []), c]);
  const classes = [...byClass.keys()].sort();
  while ([...byClass.values()].some((q) => q.length)) for (const k of classes) if (byClass.get(k)!.length) ordered.push(byClass.get(k)!.shift()!);
}
const batchOf = new Map(ordered.map((c, i) => [c.rank!, BATCH_NAMES[Math.floor(i / BATCH_SIZE)]!]));
const firstStatus = new Map(FIRST_18.map((r) => [r, 'CURATED (D1.6, vscar_dev)']));
const manifest = shortlist.map((c) => {
  const p = plans.get(c.rank!)!;
  const it = p.item;
  const t = c.technicalIdentity;
  const by = (code: string) => it?.observations.filter((o) => o.source_code === code).length ?? 0;
  const ov = overlap.overlaps.find((o) => o.rank === c.rank)?.overlaps.map((o) => o.kind) ?? [];
  const status = firstStatus.get(c.rank!) ?? (p.eligible ? 'PENDING_IMPORT' : 'EXCLUDED');
  return {
    rank: c.rank,
    candidateId: c.candidateId,
    fullTan: t.typeApprovalNumber,
    variant: t.variant,
    version: t.version,
    technicalKey: p.technicalKey,
    model: it ? `${it.vehicle.brand} ${it.vehicle.model}` : c.commercialIdentity.family,
    powertrain: it?.vehicle.product_class ?? c.powertrain.productClass,
    currentStatus: status,
    sourceEvidence: it ? { S01: by('S01'), S11: by('S11'), S13Attributes: it.attributes.filter((a) => a.source_code === 'S13').length, attributes: it.attributes.length } : null,
    openConflicts: it ? it.observations.filter((o) => o.conflict_status === 'IN_CONFLICT').map((o) => `${o.source_code}:${o.value.spec_key}`) : [],
    catalogOverlap: ov,
    rightsState: it ? Object.fromEntries(it.vehicle.source_codes.map((s) => [s, it.observations.find((o) => o.source_code === s)?.rights_status ?? it.attributes.find((a) => a.source_code === s)?.rights_status])) : {},
    criticalCompleteness: Math.round(p.criticalCompleteness * 1000) / 1000,
    proposedBatch: status === 'PENDING_IMPORT' ? batchOf.get(c.rank!)! : null,
    importEligibility: status === 'PENDING_IMPORT' ? (ov.length ? 'ELIGIBLE_REVIEW_OVERLAP' : it!.observations.some((o) => o.conflict_status === 'IN_CONFLICT') ? 'ELIGIBLE_CONFLICTS_PRESERVED' : 'ELIGIBLE') : status === 'EXCLUDED' ? 'NOT_ELIGIBLE' : 'ALREADY_CURATED',
    blockers: [...(p.exclusion ? [p.exclusion] : []), ...(it?.vehicle.blockers ?? [])],
  };
});
await mkdir(D16A_DOCS, { recursive: true });
await mkdir(D16A_PLANS, { recursive: true });
const batches = [...new Set(ordered.map((c) => batchOf.get(c.rank!)!))].map((name) => {
  const ranks = ordered.filter((c) => batchOf.get(c.rank!) === name).map((c) => c.rank!);
  const doc = { batchKey: `d16a-batch-${name}`, step: 'D1.6a', candidates: ranks, sources: TECHNICAL_SOURCES, items: ranks.map((r) => plans.get(r)!.item!) };
  const text = `${JSON.stringify(doc, null, 1)}\n`;
  return { name, ranks, doc, text };
});
for (const b of batches) await writeFile(join(D16A_PLANS, `plan-batch-${b.name}.json`), b.text);
const count = (xs: typeof manifest, f: (m: (typeof manifest)[number]) => boolean) => xs.filter(f).length;
await writeFile(
  join(D16A_DOCS, 'next-74-manifest.json'),
  `${JSON.stringify(
    {
      note: 'Step D1.6a — classification of the 100 D1 candidates and proposed batches for the 74 pending. Nothing is imported by this file.',
      ordering: 'risk tier (clean < conflicts < partial catalogue overlap), then critical completeness desc, then rank; round-robin by product class inside each tier; chunks of 15',
      candidates: manifest.length,
      eligible: count(manifest, (m) => m.importEligibility !== 'NOT_ELIGIBLE'),
      alreadyCurated: count(manifest, (m) => m.importEligibility === 'ALREADY_CURATED'),
      pending: count(manifest, (m) => m.currentStatus === 'PENDING_IMPORT'),
      excluded: manifest.filter((m) => m.currentStatus === 'EXCLUDED').map((m) => ({ rank: m.rank, reason: m.blockers[0] })),
      batches: batches.map((b) => ({
        batchKey: b.doc.batchKey,
        planSha256: createHash('sha256').update(b.text).digest('hex'),
        size: b.ranks.length,
        ranks: b.ranks,
        byPowertrain: Object.fromEntries([...new Set(b.doc.items.map((i) => i.vehicle.product_class))].sort().map((k) => [k, b.doc.items.filter((i) => i.vehicle.product_class === k).length])),
        observations: b.doc.items.reduce((s, i) => s + i.observations.length, 0),
        attributes: b.doc.items.reduce((s, i) => s + i.attributes.length, 0),
        conflictingValues: b.doc.items.reduce((s, i) => s + i.observations.filter((o) => o.conflict_status === 'IN_CONFLICT').length, 0),
      })),
      items: manifest,
    },
    null,
    2,
  )}\n`,
);
console.log(JSON.stringify({ d16a: { pending: ordered.length, batches: batches.map((b) => `${b.name}:${b.ranks.length}`) } }));
