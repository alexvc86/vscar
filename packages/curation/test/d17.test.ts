import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { SOURCE_RIGHTS, sourcePublication } from '@vscar/quality';

/**
 * Step D1.7 — artefactos reproducibles de la ampliación 18 → 92 (`docs/data/d17/`, generados contra `vscar_dev`).
 * Se comprueban sus invariantes: secuencia de lotes, idempotencia, catálogo seleccionable intacto, ausencia de valores con
 * derechos pendientes y clasificación D1.8 coherente. No hay valores en estos artefactos.
 */
const root = (p: string) => fileURLToPath(new URL(`../../../${p}`, import.meta.url));
const json = <T,>(p: string) => JSON.parse(readFileSync(root(p), 'utf8')) as T;
const BATCHES = ['A', 'B', 'C', 'D', 'E'] as const;
const SIZE: Record<string, number> = { A: 15, B: 15, C: 15, D: 15, E: 14 };
const EXCLUDED = [1, 2, 3, 13, 21, 22, 50, 55];

type Checkpoint = { label: string; migrations: { pending: number }; selectableCatalog: { sha256: string; referenceVariantsByStatus: Record<string, number> }; counts: { vehicles: number; inConflict: number; byRights: Record<string, number> }; integrity: Record<string, number>; ok: boolean };
const checkpoints = ['0-initial', '1-after-batch-A', '2-after-batch-B', '3-after-batch-C', '4-after-batch-D', '5-after-batch-E'].map((n) => json<Checkpoint>(`docs/data/d17/checkpoint-${n}.json`));

describe('D1.7 — batches executed in order, idempotent, selectable catalogue untouched', () => {
  it('checkpoints: 18 → 33 → 48 → 63 → 78 → 92, migrations up to date, integrity clean', () => {
    expect(checkpoints.map((c) => c.counts.vehicles)).toEqual([18, 33, 48, 63, 78, 92]);
    for (const c of checkpoints) {
      expect(c.ok, c.label).toBe(true);
      expect(c.migrations.pending).toBe(0);
      for (const [k, v] of Object.entries(c.integrity)) expect(v, `${c.label} ${k}`).toBe(k === 'checkConstraints' ? 10 : 0);
    }
  });

  it('the selectable catalogue SHA-256 is identical before and after every batch (9 PREVIEW fixtures, 0 published)', () => {
    expect(new Set(checkpoints.map((c) => c.selectableCatalog.sha256)).size).toBe(1);
    for (const c of checkpoints) expect(c.selectableCatalog.referenceVariantsByStatus).toEqual({ test_fixture: 9 });
  });

  it('each batch inserted exactly its planned vehicles once; the re-run skipped all of them', () => {
    for (const b of BATCHES) {
      const r = json<{ run1: { status: string; counts: Record<string, number> }; run2: { status: string; counts: Record<string, number> }; idempotent: boolean; existingCatalog: { unchanged: boolean } }>(`docs/data/d17/import-report-batch-${b}.json`);
      expect(r.run1.status).toBe('COMPLETED');
      expect(r.run1.counts).toMatchObject({ planned: SIZE[b], inserted: SIZE[b], updated: 0, failed: 0, skippedUnchanged: 0 });
      expect(r.run2.counts).toMatchObject({ imported: 0, updated: 0, failed: 0, skippedUnchanged: SIZE[b] });
      expect(r.idempotent && r.existingCatalog.unchanged).toBe(true);
    }
  });

  it('pre-import validation: 74 valid, unique ids and keys, plans identical to the D1.6a manifest; #88 is a relation, not a duplicate', () => {
    const v = json<{ pendingCandidates: number; uniqueCandidateIds: number; uniqueTechnicalKeys: number; allValid: boolean; allPlansMatchManifest: boolean; excludedStillExcluded: boolean; relations: { rank: number; relations: string[] }[] }>('docs/data/d17/validation-74.json');
    expect([v.pendingCandidates, v.uniqueCandidateIds, v.uniqueTechnicalKeys]).toEqual([74, 74, 74]);
    expect(v.allValid && v.allPlansMatchManifest && v.excludedStillExcluded).toBe(true);
    expect(v.relations.map((r) => r.rank)).toEqual([88]);
    expect(v.relations[0]!.relations[0]).toMatch(/not a technical duplicate/);
  });
});

describe('D1.7 — final technical catalogue', () => {
  const audit = json<{ summary: { vehicles: number; observations: number; conflictingValues: number; usableByRights: Record<string, number>; checks: Record<string, boolean>; allChecksPass: boolean }; vehicles: { candidateRank: number; technicalAttributes: string[] }[]; conflicts: { values: { source: string; rights: string; value: unknown }[] }[] }>('docs/data/d17/audit-after-batch-E.json');

  it('92 vehicles, every audit check passes, the 8 excluded candidates are absent', () => {
    expect(audit.summary.vehicles).toBe(92);
    expect(audit.summary.allChecksPass).toBe(true);
    const ranks = audit.vehicles.map((v) => v.candidateRank);
    expect(new Set(ranks).size).toBe(92);
    for (const r of EXCLUDED) expect(ranks).not.toContain(r);
  });

  it('conflicts preserved (24 values) and no value from a PENDING-rights source is stored in the artefacts', () => {
    expect(audit.summary.conflictingValues).toBe(24);
    for (const f of readdirSync(root('docs/data/d17')).filter((x) => x.startsWith('audit-'))) {
      const a = json<typeof audit>(`docs/data/d17/${f}`);
      for (const c of a.conflicts) for (const v of c.values) if (v.rights === 'PENDING') expect(v.value, f).toBeNull();
      for (const v of a.vehicles) for (const t of v.technicalAttributes) if (/PENDING\)$/.test(t)) expect(t, f).toMatch(/=<redacted> /);
    }
  });

  it('no rights were approved: 0 APPROVED observations; S11/S13 still PENDING (PREVIEW_ONLY) and S01 conditional in the Rights Engine', () => {
    expect(audit.summary.usableByRights.APPROVED).toBe(0);
    for (const code of ['S11', 'S13']) {
      expect([SOURCE_RIGHTS[code]!.store, SOURCE_RIGHTS[code]!.republish, SOURCE_RIGHTS[code]!.commercial, SOURCE_RIGHTS[code]!.derive], code).toEqual(['PENDING', 'PENDING', 'PENDING', 'PENDING']);
      expect(sourcePublication(code)).toBe('PREVIEW_ONLY');
    }
    expect(sourcePublication('S01')).toBe('PUBLISHABLE');
  });

  const cov = json<{ catalog: { totalVehicles: number; fullTanIdentities: number; byProductClass: Record<string, number> }; funnel: { field: string; FOUND: number; RIGHTS_APPROVED: number; SELECTABLE_ELIGIBLE: number; TECHNICALLY_USABLE: number }[]; readiness: Record<string, number>; demoCandidates: { rank: number; technicalCategories: string[]; status: string }[]; vehicles: { rank: number; status: string; importantConflictKeys: string[] }[] }>('docs/data/d17/technical-catalog-coverage.json');

  it('coverage: nothing invented (generation, model year, boot, 0–100, usable battery, charging, tank: 0 found), nothing selectable-eligible yet', () => {
    expect(cov.catalog.totalVehicles).toBe(92);
    expect(cov.catalog.fullTanIdentities).toBe(92);
    expect(Object.values(cov.catalog.byProductClass).reduce((s, n) => s + n, 0)).toBe(92);
    const found = (f: string) => cov.funnel.find((x) => x.field === f)!.FOUND;
    for (const f of ['Generación confirmada', 'Maletero', '0–100 km/h', 'Batería útil', 'Carga AC', 'Carga DC', 'Depósito']) expect(found(f), f).toBe(0);
    for (const f of cov.funnel) {
      expect(f.RIGHTS_APPROVED, f.field).toBe(0);
      expect(f.SELECTABLE_ELIGIBLE, f.field).toBe(0);
      expect(f.TECHNICALLY_USABLE).toBeLessThanOrEqual(f.FOUND);
    }
  });

  it('D1.8 readiness: every vehicle classified once; demo candidates have an activatable category and no important conflict', () => {
    expect(Object.values(cov.readiness).reduce((s, n) => s + n, 0)).toBe(92);
    expect(cov.vehicles.filter((v) => v.importantConflictKeys.length).every((v) => v.status === 'CONFLICTED')).toBe(true);
    expect(cov.vehicles.find((v) => v.rank === 88)!.status).toBe('NEEDS_IDENTITY');
    expect(cov.demoCandidates.length).toBeGreaterThanOrEqual(10);
    expect(cov.demoCandidates.length).toBeLessThanOrEqual(20);
    for (const d of cov.demoCandidates) {
      expect(d.technicalCategories.length).toBeGreaterThan(0);
      expect(d.status).not.toBe('CONFLICTED');
      expect(d.rank).not.toBe(88);
    }
  });
});
