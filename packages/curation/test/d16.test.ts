import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import type { RdwObservation, TraficomAggregate } from '@vscar/data-connectors';
import { traficomKey } from '@vscar/data-connectors';
import { CommercialIdentityArtifact, CurationCandidate, buildTechnicalPlan, curatedRights, curatedVehicleId, type TechnicalPlanInput } from '../src/index.ts';

/** Step D1.6 — plan de la capa de curación técnica: identidad exacta, fuentes oficiales, sin inventar, determinista. */

const root = (p: string) => fileURLToPath(new URL(`../../../${p}`, import.meta.url));
const json = <T,>(p: string) => JSON.parse(readFileSync(root(p), 'utf8')) as T;
const shortlist = readFileSync(root('docs/data/d1/curation_candidates.jsonl'), 'utf8').trim().split('\n').map((l) => CurationCandidate.parse(JSON.parse(l)));
const pilot = json<Array<{ rank: number; match: { level: string }; observations: RdwObservation[] }>>('docs/data/d11/pilot-results.json');
const traficom = new Map(json<{ aggregates: TraficomAggregate[] }>('docs/data/d13/traficom-aggregates.json').aggregates.map((a) => [a.key, a]));
const commercial = CommercialIdentityArtifact.parse(json('docs/data/d12/commercial-identity-v1.json'));
const overlap = json<{ overlaps: Array<{ rank: number; overlaps: Array<{ kind: string }> }> }>('docs/data/d12/catalog-overlap-v1.json');

const input = (rank: number, o: Partial<TechnicalPlanInput> = {}): TechnicalPlanInput => {
  const c = shortlist.find((x) => x.rank === rank)!;
  const p = pilot.find((x) => x.rank === rank);
  const t = c.technicalIdentity;
  const agg = traficom.get(traficomKey(t.typeApprovalNumber, t.variant, t.version));
  const ce = commercial.entries.find((e) => e.rank === rank);
  return {
    candidate: c,
    rdw: { level: p?.match.level ?? 'NOT_FOUND', observations: p?.observations ?? [], retrievedAt: '2026-10-16' },
    ...(agg ? { traficom: agg } : {}),
    traficomRetrievedAt: '2026-10-16',
    ...(ce ? { commercial: ce } : {}),
    catalogOverlap: overlap.overlaps.find((x) => x.rank === rank)?.overlaps.map((x) => x.kind) ?? [],
    ...o,
  };
};

describe('eligibility (exact technical identity only)', () => {
  it('#4 BYD SEAL (EEA + RDW exact) is curated with official observations', () => {
    const r = buildTechnicalPlan(input(4));
    expect(r.eligible).toBe(true);
    expect(r.item!.vehicle).toMatchObject({ technical_key: 'E13*2018/858*00639*00|SE2D1C|1NXE5E001NL1', curation_status: 'CURATED', commercial_identity_status: 'EXACT' });
    expect(r.item!.observations.some((o) => o.source_code === 'S01')).toBe(true);
    expect(r.item!.observations.some((o) => o.source_code === 'S11')).toBe(true);
  });

  it('#2 is a probable duplicate of a catalogue variant → not curated as new', () => {
    const r = buildTechnicalPlan(input(2));
    expect(r.eligible).toBe(false);
    expect(r.exclusion).toMatch(/PROBABLE_DUPLICATE/);
  });

  it('without RDW corroboration of the exact key → not curated', () => {
    const r = buildTechnicalPlan(input(4, { rdw: { level: 'TAN_EXTENSION_MISMATCH', observations: [], retrievedAt: '2026-10-16' } }));
    expect(r).toMatchObject({ eligible: false, exclusion: expect.stringMatching(/RDW does not corroborate/) });
  });
});

describe('no fabricated commercial data', () => {
  it('no generation or model year rows are ever produced; blockers say so', () => {
    for (const rank of [4, 8, 73, 81]) {
      const it = buildTechnicalPlan(input(rank)).item!;
      expect(it.attributes.filter((a) => a.attribute === 'generation' || a.attribute === 'model_year')).toEqual([]);
      expect(it.vehicle.blockers).toEqual(expect.arrayContaining(['generation not verified (no source)', 'model_year not verified (no source)']));
      expect(it.vehicle.registration_period.first_observed_year).toBeLessThanOrEqual(it.vehicle.registration_period.last_observed_year!);
    }
  });

  it('trim only when D1.2 curated it EXACT (BYD SEAL from IDAE, rights pending); PARTIAL identities get none', () => {
    const byd = buildTechnicalPlan(input(4)).item!;
    expect(byd.attributes.find((a) => a.attribute === 'trim')).toMatchObject({ value: 'Excellence AWD', status: 'EXACT', source_code: 'S02', rights_status: 'PENDING' });
    const tucson = buildTechnicalPlan(input(8)).item!;
    expect(tucson.attributes.find((a) => a.attribute === 'trim')).toBeUndefined();
    expect(tucson.vehicle.commercial_identity_status).toBe('PARTIAL');
  });
});

describe('provenance, rights and quality per field', () => {
  it('rights come from the registry and are never approved here (S01 conditional, S11/S13 pending)', () => {
    expect(curatedRights('S01')).toBe('CONDITIONAL');
    expect(curatedRights('S11')).toBe('PENDING');
    expect(curatedRights('S13')).toBe('PENDING');
    expect(curatedRights('S15')).toBe('DENIED');
    const it = buildTechnicalPlan(input(8)).item!;
    for (const o of it.observations) expect(o.rights_status).toBe(o.source_code === 'S01' ? 'CONDITIONAL' : 'PENDING');
  });

  it('every observation keeps SpecKey, unit, source, record, transformation and exact identity match', () => {
    const it = buildTechnicalPlan(input(73)).item!;
    for (const o of it.observations) {
      expect(o.identity_match).toBe('EXACT_TAN_VA_VE');
      expect(o.source_record.length).toBeGreaterThan(3);
      expect(o.value.transformation_version).toBe(1);
      expect(o.value.variant_id).toBe(it.vehicle.id);
    }
  });

  it('conflicts are preserved (BYD SEAL EEA vs RDW): all values kept, none averaged, none usable', () => {
    const it = buildTechnicalPlan(input(4)).item!;
    const inConflict = it.observations.filter((o) => o.conflict_status === 'IN_CONFLICT');
    expect(inConflict.length).toBeGreaterThanOrEqual(2);
    expect(new Set(inConflict.map((o) => o.source_code))).toEqual(new Set(['S01', 'S11']));
    expect(inConflict.every((o) => o.quality_status === 'NOT_USABLE' && o.conflict_group)).toBe(true);
  });

  it('research sources (S14–S19) never appear in the technical layer', () => {
    for (const rank of [4, 8, 73, 81]) {
      const it = buildTechnicalPlan(input(rank)).item!;
      const codes = new Set([...it.observations.map((o) => o.source_code), ...it.attributes.map((a) => a.source_code)]);
      for (const c of ['S14', 'S15', 'S16', 'S17', 'S18', 'S19']) expect(codes.has(c)).toBe(false);
    }
  });

  it('transmission evidence: Traficom code only when unambiguous; BEV without an observed gear count gets none', () => {
    const tucson = buildTechnicalPlan(input(8)).item!;
    expect(tucson.attributes.find((a) => a.attribute === 'transmission')).toMatchObject({ value: 'manual', source_code: 'S13' });
    const rav4 = buildTechnicalPlan(input(73)).item!;
    expect(rav4.attributes.find((a) => a.attribute === 'transmission')).toBeUndefined();
  });
});

describe('determinism and artifacts', () => {
  it('same inputs → identical plan and ids', () => {
    expect(JSON.stringify(buildTechnicalPlan(input(81)))).toBe(JSON.stringify(buildTechnicalPlan(input(81))));
    expect(buildTechnicalPlan(input(81)).item!.vehicle.id).toBe(curatedVehicleId('E4*2007/46*1293*26|' + shortlist.find((c) => c.rank === 81)!.technicalIdentity.variant + '|' + shortlist.find((c) => c.rank === 81)!.technicalIdentity.version));
  });

  it('first batch = exactly the 18 approved candidates, all eligible; expansion assessed on 100 (92 eligible)', () => {
    const plan = json<{ eligible: number; candidates: Array<{ rank: number; eligible: boolean }> }>('docs/data/d16/first-18-plan.json');
    expect(plan.candidates.map((c) => c.rank)).toEqual([5, 6, 8, 9, 20, 24, 26, 27, 28, 7, 48, 56, 86, 4, 53, 57, 73, 81]);
    expect(plan.eligible).toBe(18);
    const exp = json<{ candidates: number; eligible: number; notEligible: Array<{ rank: number }> }>('docs/data/d16/expansion-92.json');
    expect(exp).toMatchObject({ candidates: 100, eligible: 92 });
    expect(exp.notEligible.map((x) => x.rank)).toEqual(expect.arrayContaining([2, 22]));
  });
});

describe('Step D1.6a — manifest of the 100 and batches of the 74 (nothing imported)', () => {
  type Row = { rank: number; fullTan: string; variant: string; version: string; technicalKey: string; currentStatus: string; proposedBatch: string | null; importEligibility: string; openConflicts: string[]; catalogOverlap: string[]; blockers: string[] };
  const m = json<{ candidates: number; eligible: number; alreadyCurated: number; pending: number; excluded: { rank: number; reason: string }[]; batches: { batchKey: string; size: number; ranks: number[] }[]; items: Row[] }>('docs/data/d16a/next-74-manifest.json');
  const FIRST_18 = [5, 6, 8, 9, 20, 24, 26, 27, 28, 7, 48, 56, 86, 4, 53, 57, 73, 81];

  it('100 classified: 92 eligible = 18 curated + 74 pending; 8 excluded with their exact cause, never replaced', () => {
    expect([m.candidates, m.eligible, m.alreadyCurated, m.pending]).toEqual([100, 92, 18, 74]);
    expect(m.excluded.map((e) => e.rank)).toEqual([1, 2, 3, 13, 21, 22, 50, 55]);
    expect(m.excluded.find((e) => e.rank === 2)!.reason).toMatch(/PROBABLE_DUPLICATE_TAN_INCOMPLETE/);
    expect(m.excluded.find((e) => e.rank === 21)!.reason).toMatch(/\(NONE\)/);
    for (const r of [13, 22, 50, 55]) expect(m.excluded.find((e) => e.rank === r)!.reason).toMatch(/TAN_EXTENSION_MISMATCH/);
    expect(m.items.filter((i) => i.importEligibility === 'ALREADY_CURATED').map((i) => i.rank).sort((a, b) => a - b)).toEqual([...FIRST_18].sort((a, b) => a - b));
  });

  it('batches cover exactly the 74 pending, once each, ≤ 15 per batch; no excluded or curated candidate in any batch', () => {
    const inBatches = m.batches.flatMap((b) => b.ranks);
    expect(inBatches).toHaveLength(74);
    expect(new Set(inBatches).size).toBe(74);
    expect(m.batches.every((b) => b.size === b.ranks.length && b.size <= 15)).toBe(true);
    for (const r of [...FIRST_18, ...m.excluded.map((e) => e.rank)]) expect(inBatches).not.toContain(r);
  });

  it('every pending candidate has a complete technical key (full TAN with extension + Va + Ve)', () => {
    for (const i of m.items.filter((x) => x.currentStatus === 'PENDING_IMPORT')) {
      expect(i.fullTan).toMatch(/^E\d{1,2}\*\d{4}\/\d{1,4}\*\d{1,5}\*\d{1,3}$/i);
      expect(i.variant.length && i.version.length).toBeTruthy();
      expect(i.technicalKey.toUpperCase()).toBe(`${i.fullTan}|${i.variant}|${i.version}`.toUpperCase());
    }
  });

  it('risky candidates (conflicts, partial catalogue overlap) are flagged and scheduled last', () => {
    const last = m.batches.at(-1)!.ranks;
    for (const i of m.items.filter((x) => x.currentStatus === 'PENDING_IMPORT' && (x.openConflicts.length || x.catalogOverlap.length))) {
      expect(last).toContain(i.rank);
      expect(i.importEligibility).not.toBe('ELIGIBLE');
    }
  });
});
