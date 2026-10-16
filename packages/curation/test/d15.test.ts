import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { METHODOLOGY_VERSION } from '@vscar/methodology';
import type { AutoseekerRecord, KwRecord, OdbRecord, OevRecord, VdbModel } from '@vscar/data-connectors';
import { ODB_HEADER } from '@vscar/data-connectors';
import { FAMILY_SOURCE_NAMES, assessField, matchAutoseeker, matchKilowatt, matchOdb, matchOpenEv, readinessTier, vehiclesDbTaxonomy, type FieldEvidence, type MatchCandidate, type RdwEvidence } from '../src/index.ts';

/** Step D1.5 — matching multi-fuente, granularidad, disponibilidad ≠ elegibilidad, conflictos, derechos. */

const d15 = (f: string) => JSON.parse(readFileSync(fileURLToPath(new URL(`../../../docs/data/d15/${f}`, import.meta.url)), 'utf8'));

const cand: MatchCandidate = { rank: 9, familyId: 'kia-sportage', technicalKey: 'E11*2007/46*3144*01|X|Y', registrationYears: [2016, 2018], productClass: 'ICE_OR_MHEV', fuel: 'diesel', powerKw: 85, displacementCc: 1685 };
const rdw: RdwEvidence = { drivetrain: 'FWD', doors: 5, length: { min: 4480, max: 4480 }, wheelbase: 2670 };
const odbRow = (o: Partial<Record<(typeof ODB_HEADER)[number], string>> = {}, id = '1'): OdbRecord => {
  const raw = Object.fromEntries(ODB_HEADER.map((h) => [h, ''])) as OdbRecord['raw'];
  Object.assign(raw, { id_trim: id, Make: 'Kia', Modle: 'Sportage', Generation: '4 generation', Year_from: '2015', Year_to: '2018', Series: 'Crossover', Trim: '1.7 CRDi MT', engine_type: 'Diesel', engine_hp: '115.6', capacity_cm3: '1685', drive_wheels: 'Front wheel drive', transmission: 'Manual', length_mm: '4480', wheelbase_mm: '2670', minimum_trunk_capacity_l: '491', ...o });
  return { id, make: raw.Make, model: raw.Modle, generation: raw.Generation, yearFrom: Number(raw.Year_from), ...(Number(raw.Year_to) ? { yearTo: Number(raw.Year_to) } : {}), series: raw.Series, trim: raw.Trim, raw };
};
const names = FAMILY_SOURCE_NAMES['kia-sportage'];

describe('S15 matching (engine/gearbox rows)', () => {
  it('compatible fuel/kW(PS)/cc/drive/length in one generation → STRONG at POWERTRAIN, never homologation', () => {
    const m = matchOdb(cand, names, [odbRow()], rdw, 'manual');
    expect(m).toMatchObject({ status: 'STRONG_COMPATIBLE_MATCH', granularity: 'POWERTRAIN', recordIds: ['1'] });
  });

  it('false positive: same engine but AWD vs RDW FWD → REJECTED', () => {
    expect(matchOdb(cand, names, [odbRow({ drive_wheels: 'All wheel drive (AWD)' })], rdw, undefined).status).toBe('REJECTED');
  });

  it('dataset ends in 2020: later registrations → NOT_FOUND (no extrapolation)', () => {
    expect(matchOdb({ ...cand, registrationYears: [2024] }, names, [odbRow()], rdw, undefined).status).toBe('NOT_FOUND');
  });

  it('generation + restyling both compatible → AMBIGUOUS', () => {
    const rows = [odbRow({}, '1'), odbRow({ Generation: '4 generation [redesign]', Year_from: '2018', Year_to: '2021' }, '2')];
    expect(matchOdb(cand, names, rows, rdw, undefined).status).toBe('AMBIGUOUS');
  });

  it('hybrids: source power basis unknown → not compared (no false rejection)', () => {
    const hev = { ...cand, productClass: 'HEV_OR_MHEV', fuel: 'petrol', powerKw: 68 };
    const m = matchOdb(hev, names, [odbRow({ engine_type: 'Hybrid', engine_hp: '116' })], rdw, undefined);
    expect(m.status).not.toBe('REJECTED');
  });
});

const asRow = (o: Partial<AutoseekerRecord> = {}): AutoseekerRecord => ({ slug: 'kia-sportage-2024', make: 'Kia', model: 'Sportage', generation: 'NQ5 1.6 T-GDi (2021+)', status: 'orderable', yearFrom: 2021, fuels: ['petrol'], unknownFuels: [], body: 'suv', granularity: 'POWERTRAIN', values: { powerPs: 150, bootL: 591 }, raw: {} as AutoseekerRecord['raw'], ...o });
const c22: MatchCandidate = { ...cand, registrationYears: [2022], fuel: 'petrol', powerKw: 110, displacementCc: 1598 };

describe('S16 matching (granularity)', () => {
  it('single powertrain row with matching power → STRONG at POWERTRAIN', () => {
    expect(matchAutoseeker(c22, names, [asRow()])).toMatchObject({ status: 'STRONG_COMPATIBLE_MATCH', granularity: 'POWERTRAIN' });
  });

  it('a multi-fuel row stays AMBIGUOUS at MODEL level (its figures describe one unspecified powertrain)', () => {
    expect(matchAutoseeker(c22, names, [asRow({ fuels: ['petrol', 'diesel', 'phev'], granularity: 'MODEL' })])).toMatchObject({ status: 'AMBIGUOUS', granularity: 'MODEL' });
  });

  it('a listed powertrain with another power → REJECTED (values are not this variant)', () => {
    expect(matchAutoseeker({ ...c22, powerKw: 85 }, names, [asRow()]).status).toBe('REJECTED');
  });

  it('hybrid key: system vs ICE power not comparable → WEAK with MODEL-level values', () => {
    expect(matchAutoseeker({ ...c22, productClass: 'HEV_OR_MHEV' }, names, [asRow({ fuels: ['hev'], values: { powerPs: 230 } })])).toMatchObject({ status: 'WEAK_COMPATIBLE_MATCH', granularity: 'MODEL' });
  });

  it('only a later generation listed → NOT_FOUND', () => {
    expect(matchAutoseeker(cand, names, [asRow()]).status).toBe('NOT_FOUND');
  });
});

const oev = (o: Partial<OevRecord> = {}): OevRecord => ({ id: 'byd:seal:2024:p', make: 'BYD', model: 'Seal', year: 2024, trim: 'Premium', drivetrain: 'RWD', systemPowerKw: 230, batteryGrossKwh: 82.56, batteryNetKwh: 82.56, acKw: 11, dcKw: 150, markets: ['DE'], hasEsPrice: false, batteryWarranty: false, sourceQuality: 'DOMAIN_ONLY', ...o });
const bev: MatchCandidate = { rank: 2, familyId: 'byd-seal', technicalKey: 'E13*2018/858*00639*03|SE2R1C|2NTE5F002NL1', registrationYears: [2025], productClass: 'BEV', powerKw: 230 };

describe('S17 / S19 EV matching', () => {
  it('BEV-only: a petrol key is NOT_FOUND', () => {
    expect(matchOpenEv(cand, FAMILY_SOURCE_NAMES['byd-seal'], [oev()], rdw).status).toBe('NOT_FOUND');
  });

  it('drivetrain contradiction rejects; two compatible trims → AMBIGUOUS', () => {
    expect(matchOpenEv(bev, FAMILY_SOURCE_NAMES['byd-seal'], [oev({ drivetrain: 'AWD' })], { drivetrain: 'RWD' }).status).toBe('REJECTED');
    expect(matchOpenEv(bev, FAMILY_SOURCE_NAMES['byd-seal'], [oev(), oev({ id: 'b', trim: 'Design' })], { drivetrain: 'RWD' }).status).toBe('AMBIGUOUS');
    expect(matchOpenEv(bev, FAMILY_SOURCE_NAMES['byd-seal'], [oev()], { drivetrain: 'RWD' }).status).toBe('STRONG_COMPATIBLE_MATCH');
  });

  it('Kilowatt: several variants without power → AMBIGUOUS', () => {
    const k = (id: string, variant: string): KwRecord => ({ id, brand: 'BYD', model: 'Seal', variant, year: 2024, usableKwh: 82.5 });
    expect(matchKilowatt(bev, FAMILY_SOURCE_NAMES['byd-seal'], [k('a', 'RWD Design'), k('b', 'Premium')], { drivetrain: 'RWD' }).status).toBe('AMBIGUOUS');
  });

  it('VehiclesDB only confirms nomenclature and ES availability', () => {
    const models: VdbModel[] = [{ make: 'BYD', model: 'Seal', kind: 'car', aliases: [], formerIds: [], availability: ['es'] }];
    expect(vehiclesDbTaxonomy(FAMILY_SOURCE_NAMES['byd-seal'], models)).toEqual({ found: true, availableEs: true, canonical: ['BYD Seal'], aliases: [] });
  });
});

describe('field assessment: availability ≠ eligibility', () => {
  const approved = (s: string) => s === 'S01';
  const ext = (source: string, values: number[], o: Partial<FieldEvidence> = {}): FieldEvidence => ({ source, values, status: 'STRONG_COMPATIBLE_MATCH', granularity: 'POWERTRAIN', ...o });

  it('two unofficial sources agreeing do NOT verify the value', () => {
    const a = assessField('boot', [ext('S16', [400]), ext('S17', [400], { granularity: 'COMMERCIAL_TRIM' })], approved);
    expect(a).toMatchObject({ found: true, matched: true, identityVerified: false, usable: false, conflicts: [] });
  });

  it('unofficial sources disagreeing → conflict preserved, no average', () => {
    const a = assessField('dc_charging', [ext('S17', [150], { granularity: 'COMMERCIAL_TRIM' }), ext('S19', [115], { granularity: 'COMMERCIAL_TRIM' })], approved);
    expect(a.conflicts).toEqual([{ between: ['S17', 'S19'], kind: 'EXTERNAL_VS_EXTERNAL' }]);
  });

  it('official EEA value with approved rights is usable; an external contradiction blocks it', () => {
    const off: FieldEvidence = { source: 'S01', values: [570], granularity: 'TECHNICAL_VARIANT', officialExactKey: true };
    expect(assessField('electric_range', [off], approved).usable).toBe(true);
    const c = assessField('electric_range', [off, ext('S17', [520], { granularity: 'COMMERCIAL_TRIM' })], approved);
    expect(c.usable).toBe(false);
    expect(c.conflicts[0]!.kind).toBe('OFFICIAL_VS_EXTERNAL');
  });

  it('preserved official conflict (BYD SEAL) keeps the field unusable', () => {
    const off: FieldEvidence = { source: 'S01', values: [570], granularity: 'TECHNICAL_VARIANT', officialExactKey: true };
    expect(assessField('electric_range', [off], approved, true)).toMatchObject({ usable: false, conflicts: [{ kind: 'PRESERVED_OFFICIAL' }] });
  });

  it('RDW envelope: inside is consistent, outside is a conflict; S11 rights pending → not usable', () => {
    const rdwEnv: FieldEvidence = { source: 'S11', values: [4258], envelope: { min: 4258, max: 4356 }, granularity: 'TECHNICAL_VARIANT', officialExactKey: true };
    const inside = assessField('length', [rdwEnv, ext('S15', [4300])], approved);
    expect(inside).toMatchObject({ identityVerified: true, rightsApproved: false, usable: false, conflicts: [] });
    expect(assessField('length', [rdwEnv, ext('S15', [4567])], approved).conflicts).toHaveLength(1);
  });

  it('granularity: a MODEL-level boot or AC value is not applicable to the variant', () => {
    expect(assessField('boot', [ext('S16', [865], { granularity: 'MODEL', status: 'AMBIGUOUS' })], approved).matched).toBe(false);
    expect(assessField('ac_charging', [ext('S16', [11], { granularity: 'POWERTRAIN' })], approved).sources[0]!.reason).toMatch(/granularity/);
  });

  it('battery with undeclared basis (gross/usable) is never applicable', () => {
    const a = assessField('battery_usable', [ext('S16', [82.5], { notApplicableReason: 'battery basis (gross/usable) not declared' })], approved);
    expect(a).toMatchObject({ found: true, matched: false });
  });
});

describe('tiers: curated technical ≠ selectable', () => {
  const base = { technicalExact: true, rdwExact: true, duplicate: false, generationVerified: false, modelYearVerified: false, commercialExact: false, criticalComplete: false, rightsPublishable: false };
  it('exact technical identity → curated technical (proposal) but not selectable', () => {
    expect(readinessTier(base)).toMatchObject({ tier: 'CURATED_TECHNICAL_PROPOSED', previewReady: false, publicReady: false });
  });
  it('duplicate → research only (reconcile, do not insert)', () => {
    expect(readinessTier({ ...base, duplicate: true }).tier).toBe('RESEARCH');
  });
  it('PUBLIC needs everything including rights', () => {
    expect(readinessTier({ ...base, generationVerified: true, modelYearVerified: true, commercialExact: true, criticalComplete: true }).tier).toBe('SELECTABLE_PREVIEW');
    expect(readinessTier({ ...base, generationVerified: true, modelYearVerified: true, commercialExact: true, criticalComplete: true, rightsPublishable: true }).tier).toBe('SELECTABLE_PUBLIC');
  });
});

describe('D1.5 artifacts', () => {
  const m = d15('matching-100.json');

  it('same 20 pilot candidates; 100 evaluated; methodology unchanged', () => {
    expect(m.candidates).toHaveLength(100);
    expect(m.candidates.filter((c: { pilot: boolean }) => c.pilot).map((c: { rank: number }) => c.rank)).toEqual([2, 4, 5, 6, 7, 8, 9, 20, 22, 24, 26, 27, 28, 48, 53, 56, 57, 73, 81, 86]);
    expect(METHODOLOGY_VERSION).toBe('2026.7');
  });

  it('rights isolation: no third-party values in versioned artifacts; nothing selectable', () => {
    const text = readFileSync(fileURLToPath(new URL('../../../docs/data/d15/matching-100.json', import.meta.url)), 'utf8');
    expect(text).not.toMatch(/"values"|"_batteryBasisUnknown"|"raw"/);
    expect(m.summary100.previewReady).toBe(0);
    expect(m.summary100.publicReady).toBe(0);
    expect(m.summary100.generationVerified).toBe(0);
    expect(d15('d2-readiness.json').approvedImportableUnderCurrentRules).toEqual([]);
  });

  it('technical identity preserved: every candidate keeps its EEA key; no match reaches homologation', () => {
    for (const c of m.candidates) {
      expect(c.technicalKey).toMatch(/\*.*\|/);
      for (const x of c.matches) expect(x.status).not.toBe('EXACT_DOCUMENTED_LINK');
    }
  });

  it('provenance: manifests with SHA-256; S15 restricted, S16 published copy identical to the user copy', () => {
    const mf = d15('acquisition-manifests.json') as { sourceId: string; sha256: string; rightsStatusAtRetrieval: string; redistributable: boolean }[];
    expect(mf.every((x) => /^[0-9a-f]{64}$/.test(x.sha256) && !x.redistributable)).toBe(true);
    expect(mf.find((x) => x.sourceId === 'S15')!.rightsStatusAtRetrieval).toBe('RESTRICTED');
    const s16 = mf.filter((x) => x.sourceId === 'S16' && x.sha256.startsWith('1775cf13'));
    expect(s16).toHaveLength(2);
  });

  it('conflicts preserved: BYD SEAL keeps its open official conflict', () => {
    const seal = m.candidates.filter((c: { rank: number }) => [2, 4].includes(c.rank));
    for (const c of seal) expect(c.openConflicts.some((k: { kind: string }) => k.kind === 'PRESERVED_OFFICIAL')).toBe(true);
  });
});
