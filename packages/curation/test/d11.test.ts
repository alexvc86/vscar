import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { GOLF_2018_IDS, loadAllCases } from '@vscar/fixtures';
import { detectConflicts, evaluateEligibility, vehicleCompleteness } from '@vscar/quality';
import { groupRdwRows, mapRdwVersions, matchRdw, type EeaTechnicalGroup, type RdwDatasetName } from '@vscar/data-connectors';
import { buildCandidates, enrichCandidate, rdwSpecValues } from '../src/index.ts';

/** Step D1.1 — enriquecimiento con RDW (muestra real CC0) sobre candidatos EEA sintéticos con claves reales. */

const sample = JSON.parse(readFileSync(fileURLToPath(new URL('../../data-connectors/test/fixtures/rdw/pilot-sample.json', import.meta.url)), 'utf8')) as Record<string, unknown[]>;
const { versions } = groupRdwRows(Object.fromEntries(Object.entries(sample).filter(([k]) => k !== 'withdrawals')) as Partial<Record<RdwDatasetName, unknown[]>>);

function group(o: Partial<EeaTechnicalGroup> & { tan: string; variant: string; version: string; d: EeaTechnicalGroup['distributions'] }): EeaTechnicalGroup {
  return {
    key: `ES|${o.year ?? 2018}|${o.tan}|${o.variant}|${o.version}`,
    memberState: 'ES',
    year: o.year ?? 2018,
    status: 'F',
    tanRaw: [o.tan],
    tanBase: o.tan.split('*').slice(0, 3).join('*'),
    types: o.types ?? ['AU'],
    make: o.make ?? 'VOLKSWAGEN',
    commercialNames: o.commercialNames ?? ['GOLF'],
    fuelTypes: o.fuelTypes ?? ['PETROL'],
    fuelModes: o.fuelModes ?? ['M'],
    homologationPowertrain: o.homologationPowertrain ?? 'ICE',
    ...('fuel' in o ? (o.fuel ? { fuel: o.fuel } : {}) : { fuel: 'petrol' }),
    registrations: 500,
    sourceRows: 500,
    distributions: o.d,
    massKg: o.massKg ?? { min: 1301, max: 1301 },
    conflicts: [],
    ...o,
  } as EeaTechnicalGroup;
}
const candidate = (g: EeaTechnicalGroup) => buildCandidates({ groups: [g], idae: [], rawSha256: { S01: ['1'.repeat(64)], S02: [] } }).candidates[0]!;
const enrich = (g: EeaTechnicalGroup) => {
  const c = candidate(g);
  const match = matchRdw({ tan: c.technicalIdentity.typeApprovalNumber, variant: c.technicalIdentity.variant, version: c.technicalIdentity.version }, versions);
  return enrichCandidate({ candidate: c, label: 'test', match, mapping: mapRdwVersions(match.versions, g.homologationPowertrain), giavehIndex: new Map() });
};

const golf33 = group({ tan: 'E1*2007/46*0623*33', variant: 'GAC4DACAX0', version: 'FM6FM6AJ015N7MVON1ML79VR2N', d: { 'Ep (KW)': [[96, 500]], 'Ec (cm3)': [[1498, 500]], 'Enedc (g/km)': [[113, 500]] } });
const seal = group({ tan: 'E13*2018/858*00639*03', variant: 'SE2R1C', version: '2NTE5F002NL1', year: 2025, make: 'BYD', commercialNames: ['BYD SEAL'], fuel: undefined, fuelTypes: ['ELECTRIC'], fuelModes: ['E'], homologationPowertrain: 'BEV', massKg: { min: 2130, max: 2130 }, d: { 'Ep (KW)': [[230, 500]], 'Z (Wh/km)': [[166, 500]], Zr: [[570, 500]], 'Ewltp (g/km)': [[0, 500]] } });

describe('enrichment of a D1 candidate', () => {
  it('ICE with an exact RDW match: new dimensions/seats, corroboration, DGT label credited to RDW (Euro family needed)', () => {
    const r = enrich(golf33);
    expect(r.technicalMatch).toBe('EXACT');
    expect(r.fieldsAdded).toEqual(expect.arrayContaining(['dim.length_mm', 'dim.width_mm', 'dim.height_mm', 'seats']));
    expect(r.corroborated).toEqual(expect.arrayContaining(['dim.mass_kg', 'perf.power_max_kw', 'pt.displacement_cc']));
    expect(r.conflicts).toEqual([]);
    expect(r.dgt).toMatchObject({ after: 'C', source: 'EEA+RDW+RULE' });
    expect(r.coverageAfter.criticalCompleteness).toBeGreaterThan(r.coverageBefore.criticalCompleteness);
    expect(r.coverageAfterEeaRule.criticalCompleteness).toBe(r.coverageBefore.criticalCompleteness);
  });

  it('commercial identity does not change with RDW (model-level name only)', () => {
    const r = enrich(golf33);
    expect(r.identityAfter).toBe(r.identityBefore);
    expect(r.publicEligible).toBe(false);
  });

  it('BEV: EEA vs RDW disagreements for the same exact homologation are preserved (no value chosen)', () => {
    const r = enrich(seal);
    expect(r.conflicts.map((c) => c.key).sort()).toEqual(['nrg.electric_combined_kwh100', 'rng.electric_combined_km']);
    expect(r.conflicts.find((c) => c.key === 'rng.electric_combined_km')).toMatchObject({ eea: '570', rdw: '583' });
    expect(r.corroborated).not.toContain('rng.electric_combined_km');
  });

  it('BEV: the DGT label comes from EEA + the existing rule, not from RDW (attribution)', () => {
    const r = enrich(seal);
    expect(r.dgt).toMatchObject({ afterEeaRule: '0', source: 'EEA+RULE' });
    expect(r.coverageAfterEeaRule.criticalCompleteness).toBeGreaterThan(r.coverageBefore.criticalCompleteness);
  });

  it('no exact match (other TAN extension) → nothing is added', () => {
    const leon = group({ tan: 'E9*2007/46*3167*27', variant: 'SFDTTCX0', version: 'FD7SFD7GC0024BIVL1BAD16', year: 2024, make: 'SEAT', commercialNames: ['SEAT LEON SP'], d: { 'Ep (KW)': [[110, 500]] } });
    const r = enrich(leon);
    expect(r.technicalMatch).toBe('TAN_EXTENSION_MISMATCH');
    expect(r.fieldsAdded).toEqual([]);
    expect(r.coverageAfter).toEqual(r.coverageBefore);
    expect(r.rejected[0]).toMatch(/TAN_EXTENSION_MISMATCH/);
  });

  it('rights: EEA fields reusable (CONDITIONAL), every RDW field pending human approval', () => {
    const r = enrich(golf33);
    expect(r.rights.bySource).toMatchObject({ S01: 'CONDITIONAL', S11: 'PENDING_REVIEW (CC0 evidence)' });
    expect(r.rights.pendingFields).toEqual(expect.arrayContaining(['dim.length_mm', 'seats']));
  });
});

describe('quality before/after with the real @vscar/quality engine (Golf 2018 *33 of the catalogue)', () => {
  const b = loadAllCases();
  const v = b.variants.find((x) => x.id === GOLF_2018_IDS.rvA)!;
  const h = b.homologations.find((x) => x.id === v.homologation_id)!;
  const base = b.spec_values.filter((s) => s.variant_id === v.id);
  const obs = mapRdwVersions(matchRdw({ tan: h.type_approval_number!, variant: h.variant_code!, version: h.version_code! }, versions).versions, 'ICE').observations;
  const { values, invalid } = rdwSpecValues(obs, v, '2026-10-16');

  it('RDW observations become valid cross-market SpecValues (NL → ES, EXACT homologation)', () => {
    expect(invalid).toEqual([]);
    expect(values.length).toBeGreaterThan(8);
    for (const s of values) expect(s).toMatchObject({ source_market: 'NL', reference_market: 'ES', homologation_match: 'EXACT', source_authority: 'OFFICIAL_AUTHORITY' });
  });

  it('completeness rises with the same formula; dimensions no longer missing; boot still missing (not in RDW)', () => {
    const before = vehicleCompleteness(v, base);
    const after = vehicleCompleteness({ ...v, technical: { ...v.technical, seats: 5 } }, [...base, ...values]);
    expect(after.completeness).toBeGreaterThan(before.completeness);
    expect(before.missing_critical).toContain('dim.length_mm');
    expect(after.missing_critical).not.toContain('dim.length_mm');
    expect(after.missing_critical).toContain('cap.boot_l');
    const cats = evaluateEligibility({ variant: { ...v, technical: { ...v.technical, seats: 5 } }, homologation: h, values: [...base, ...values], prices: [] });
    expect(cats.Size.missing).toEqual(['missing cap.boot_l']);
    expect(cats.Practicality.missing).toEqual(['missing cap.boot_l']);
  });

  it('RDW mass agrees with the curated EEA mass: no conflict is created', () => {
    expect(detectConflicts([...base, ...values]).filter((c) => c.spec_key === 'dim.mass_kg')).toEqual([]);
  });
});
