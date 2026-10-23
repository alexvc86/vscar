/**
 * Step D1.7 — validación de SOLO LECTURA de los lotes D1.6a antes de importarlos.
 *
 *   node --env-file=.env packages/db/scripts/technical-validate-plan.ts [--out docs/data/d17/validation-74.json]
 *
 * Por lote y por candidata:
 * - el plan coincide byte a byte con el manifiesto D1.6a (SHA-256) y con sus candidatas;
 * - identidad técnica EXACT con TAN completo (extensión incluida) + Va + Ve, y clave = columnas;
 * - correspondencia con las 100 candidatas D1 (id, rank, TAN, Va, Ve), ids únicos y ninguna de las 8 excluidas;
 * - corroboración RDW (observaciones S11 que citan la clave exacta) y procedencia en cada fila;
 * - derechos: S01 CONDITIONAL, S11/S13 PENDING, nunca APPROVED ni DENIED;
 * - solo S01/S11/S13 y hosts oficiales; nada de S14–S19 ni de investigación;
 * - sin generación ni año-modelo;
 * - conflictos iguales al manifiesto;
 * - contra MySQL: clave no curada aún y relación con las homologaciones del catálogo (EXACT = duplicado; base TAN+Va = relación a reconciliar).
 */
import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';
import type { RowDataPacket } from 'mysql2/promise';
import { FULL_TAN, technicalKeyOf } from '@vscar/vehicle-schema';
import { createDb, type TechnicalImportPlanItem } from '../src/index.ts';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');
const { values: args } = parseArgs({ options: { out: { type: 'string', default: 'docs/data/d17/validation-74.json' } } });
const url = process.env.DATABASE_URL;
if (!url) throw new Error('DATABASE_URL is not set (see .env.example)');

type Manifest = { excluded: { rank: number }[]; batches: { batchKey: string; planSha256: string; ranks: number[]; conflictingValues: number }[]; items: { rank: number; candidateId: string; technicalKey: string; currentStatus: string; openConflicts: string[]; catalogOverlap: string[] }[] };
const manifest = JSON.parse(await readFile(join(ROOT, 'docs/data/d16a/next-74-manifest.json'), 'utf8')) as Manifest;
const candidates = (await readFile(join(ROOT, 'docs/data/d1/curation_candidates.jsonl'), 'utf8')).trim().split('\n').map((l) => JSON.parse(l) as { candidateId: string; rank: number; technicalIdentity: { typeApprovalNumber: string; variant: string; version: string } });
const OFFICIAL_HOSTS = new Set(['discodata.eea.europa.eu', 'opendata.rdw.nl']);
const ALLOWED_SOURCES = new Set(['S01', 'S11', 'S13']);
const EXPECTED_RIGHTS: Record<string, string> = { S01: 'CONDITIONAL', S11: 'PENDING', S13: 'PENDING' };
const norm = (s: string | null | undefined) => (s ?? '').trim().toUpperCase();
const baseTan = (tan: string) => norm(tan).split('*').slice(0, 3).join('*');

const handle = createDb(url);
try {
  const q = async (sql: string) => (await handle.pool.query<RowDataPacket[]>(sql))[0];
  const curatedKeys = new Set((await q('SELECT technical_key FROM curated_technical_vehicles')).map((r) => norm(String(r.technical_key))));
  const curatedCandidateIds = new Set((await q('SELECT d1_candidate_id FROM curated_technical_vehicles WHERE d1_candidate_id IS NOT NULL')).map((r) => String(r.d1_candidate_id)));
  const catalog = await q('SELECT h.type_approval_number AS tan, h.variant_code AS va, h.version_code AS ve, h.identification_confidence AS conf, v.canonical_key AS ck, v.slug AS slug FROM homologations h JOIN reference_variants v ON v.homologation_id = h.id');
  const excluded = new Set(manifest.excluded.map((e) => e.rank));
  const seenIds = new Set<string>();
  const batches = [];
  for (const b of manifest.batches) {
    const path = join(ROOT, 'data/curation/d16a', `plan-${b.batchKey.replace('d16a-', '')}.json`);
    const text = await readFile(path, 'utf8');
    const plan = JSON.parse(text) as { batchKey: string; candidates: number[]; items: TechnicalImportPlanItem[] };
    const shaOk = createHash('sha256').update(text).digest('hex') === b.planSha256;
    const entries = plan.items.map((it, i) => {
      const v = it.vehicle;
      const id = v.technical_identity;
      const rank = v.d1_rank!;
      const key = norm(v.technical_key);
      const cand = candidates.find((c) => c.candidateId === v.d1_candidate_id);
      const m = manifest.items.find((x) => x.rank === rank);
      const problems: string[] = [];
      const relations: string[] = [];
      if (plan.candidates[i] !== rank || b.ranks[i] !== rank) problems.push('order/rank differs from manifest');
      if (id.confidence !== 'EXACT') problems.push('identity not EXACT');
      if (!FULL_TAN.test(id.type_approval_number)) problems.push('TAN incomplete (no extension)');
      if (!id.variant_code || !id.version_code) problems.push('variant or version missing');
      if (key !== norm(technicalKeyOf(id))) problems.push('technical key differs from TAN|Va|Ve columns');
      if (!cand || cand.rank !== rank || norm(`${cand.technicalIdentity.typeApprovalNumber}|${cand.technicalIdentity.variant}|${cand.technicalIdentity.version}`) !== key) problems.push('does not match the D1 candidate');
      if (!m || m.currentStatus !== 'PENDING_IMPORT' || m.technicalKey.toUpperCase() !== key) problems.push('not a pending manifest entry');
      if (excluded.has(rank)) problems.push('excluded candidate');
      if (seenIds.has(v.d1_candidate_id!)) problems.push('candidate id repeated');
      seenIds.add(v.d1_candidate_id!);
      const s11 = it.observations.filter((o) => o.source_code === 'S11');
      if (!s11.length || s11.some((o) => !norm(o.source_record).includes(key))) problems.push('RDW corroboration missing for the exact key');
      for (const o of it.observations) {
        if (!ALLOWED_SOURCES.has(o.source_code)) problems.push(`source ${o.source_code} not allowed`);
        if (o.rights_status !== EXPECTED_RIGHTS[o.source_code]) problems.push(`${o.source_code} rights ${o.rights_status}`);
        if (!o.source_record || !OFFICIAL_HOSTS.has(new URL(o.value.source_url).host)) problems.push(`provenance missing/unofficial for ${o.value.spec_key}`);
        if (o.identity_match !== 'EXACT_TAN_VA_VE') problems.push('observation identity not exact');
      }
      for (const a of it.attributes) {
        if (!ALLOWED_SOURCES.has(a.source_code)) problems.push(`attribute source ${a.source_code} not allowed`);
        if (a.rights_status !== EXPECTED_RIGHTS[a.source_code]) problems.push(`attribute ${a.source_code} rights ${a.rights_status}`);
        if (a.attribute === 'generation' || a.attribute === 'model_year') problems.push(`fabricated ${a.attribute}`);
        if (a.kind === 'TECHNICAL' && !norm(a.source_record).includes(key)) problems.push(`attribute ${a.attribute} cites another key`);
      }
      const conflicts = it.observations.filter((o) => o.conflict_status === 'IN_CONFLICT').length;
      if (conflicts !== (m?.openConflicts.length ?? -1)) problems.push('conflicts differ from manifest');
      if (curatedKeys.has(key)) problems.push('already curated (duplicate of the curated layer)');
      if (curatedCandidateIds.has(v.d1_candidate_id!)) problems.push('candidate already curated');
      for (const h of catalog) {
        const exact = h.tan && h.va && h.ve && norm(String(h.tan)) === norm(id.type_approval_number) && norm(String(h.va)) === norm(id.variant_code) && norm(String(h.ve)) === norm(id.version_code);
        if (exact) problems.push(`EXACT duplicate of selectable variant ${h.slug}`);
        else if (h.tan && h.va && baseTan(String(h.tan)) === baseTan(id.type_approval_number) && norm(String(h.va)) === norm(id.variant_code))
          relations.push(`same base TAN ${baseTan(String(h.tan))} + Va ${norm(String(h.va))} as selectable variant ${h.slug} (catalogue identity ${h.conf}: ${h.tan}${h.ve ? `|${h.ve}` : ' without extension/version'}) — not a technical duplicate; reconcile before any promotion`);
      }
      return { rank, candidateId: v.d1_candidate_id, technicalKey: v.technical_key, label: `${v.brand} ${v.model}`, observations: it.observations.length, attributes: it.attributes.length, conflicts, relations, problems: [...new Set(problems)], valid: problems.length === 0 };
    });
    batches.push({ batchKey: b.batchKey, planSha256Ok: shaOk, size: entries.length, valid: entries.filter((e) => e.valid).length, conflicts: entries.reduce((s, e) => s + e.conflicts, 0), withRelations: entries.filter((e) => e.relations.length).map((e) => e.rank), entries });
  }
  const all = batches.flatMap((b) => b.entries);
  const report = {
    step: 'D1.7',
    database: new URL(url).pathname.replace(/^\//, ''),
    pendingCandidates: all.length,
    uniqueCandidateIds: new Set(all.map((e) => e.candidateId)).size,
    uniqueTechnicalKeys: new Set(all.map((e) => norm(e.technicalKey))).size,
    excludedStillExcluded: [...excluded].every((r) => !all.some((e) => e.rank === r)),
    allPlansMatchManifest: batches.every((b) => b.planSha256Ok),
    allValid: all.every((e) => e.valid) && batches.every((b) => b.planSha256Ok),
    batches: batches.map(({ entries, ...b }) => ({ ...b, invalid: entries.filter((e) => !e.valid).map((e) => ({ rank: e.rank, problems: e.problems })) })),
    relations: all.filter((e) => e.relations.length).map((e) => ({ rank: e.rank, technicalKey: e.technicalKey, relations: e.relations })),
    entries: all,
  };
  await mkdir(dirname(join(ROOT, args.out!)), { recursive: true });
  await writeFile(join(ROOT, args.out!), `${JSON.stringify(report, null, 2)}\n`);
  const { entries: _e, ...summary } = report;
  console.log(JSON.stringify(summary, null, 2));
  if (!report.allValid) process.exitCode = 1;
} finally {
  await handle.close();
}
