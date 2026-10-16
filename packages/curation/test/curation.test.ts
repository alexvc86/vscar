import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { SOURCE_RIGHTS } from '@vscar/quality';
import { verifyFileManifest, type AcquisitionManifest, type EeaTechnicalGroup, type IdaeRecord } from '@vscar/data-connectors';
import {
  CurationCandidate,
  FAMILIES,
  assessIdentity,
  buildCandidates,
  bucketOf,
  curationStatus,
  d1Coverage,
  familyOfEeaRow,
  familyOfIdaeRecord,
  rightsDecision,
  selectPilot,
  selectShortlist,
} from '../src/index.ts';

/** Step D1 — curación: fixtures SINTÉTICOS (identificadores inventados, marcados con TEST/ZZ). */

const fam = (id: string) => FAMILIES.find((f) => f.id === id)!;

let seq = 0;
function group(o: Partial<EeaTechnicalGroup> & { co2?: number; nedc?: number; e?: number; fc?: number; z?: number; zr?: number; ep?: number; ec?: number }): EeaTechnicalGroup {
  const year = o.year ?? 2022;
  const tan = o.tan ?? 'E1*2007/46*9999*01';
  const d: EeaTechnicalGroup['distributions'] = {};
  const reg = o.registrations ?? 1000;
  if (o.co2 !== undefined) d['Ewltp (g/km)'] = [[o.co2, reg]];
  if (o.nedc !== undefined) d['Enedc (g/km)'] = [[o.nedc, reg]];
  if (o.e !== undefined) d['E (g/km)'] = [[o.e, reg]];
  if (o.fc !== undefined) d.Fc = [[o.fc, reg]];
  if (o.z !== undefined) d['Z (Wh/km)'] = [[o.z, reg]];
  if (o.zr !== undefined) d.Zr = [[o.zr, reg]];
  if (o.ep !== undefined) d['Ep (KW)'] = [[o.ep, reg]];
  if (o.ec !== undefined) d['Ec (cm3)'] = [[o.ec, reg]];
  return {
    key: `ES|${year}|${tan}|${o.variant ?? 'VA'}|${o.version ?? `VE${++seq}`}`,
    memberState: 'ES',
    year,
    status: 'F',
    tan,
    tanRaw: [tan],
    tanBase: tan.split('*').slice(0, 3).join('*'),
    types: o.types ?? ['ZZ'],
    variant: o.variant ?? 'VA',
    version: o.version ?? `VE${seq}`,
    make: o.make ?? 'VOLKSWAGEN',
    commercialNames: o.commercialNames ?? ['GOLF'],
    fuelTypes: o.fuelTypes ?? ['PETROL'],
    fuelModes: o.fuelModes ?? ['M'],
    homologationPowertrain: o.homologationPowertrain ?? 'ICE',
    fuel: 'fuel' in o ? o.fuel : 'petrol',
    registrations: reg,
    sourceRows: reg,
    registrationPeriod: { from: `${year}-01-10`, to: `${year}-11-20` },
    distributions: d,
    massKg: { min: 1300, max: 1320 },
    wheelbaseMm: { min: 2620, max: 2620 },
    conflicts: o.conflicts ?? [],
  };
}

function idae(input: Omit<Partial<IdaeRecord>, 'fuel'> & { kw?: number; code?: [string, string]; fuel?: [number, number] }): IdaeRecord {
  const { kw, code, fuel, ...o } = input;
  return {
    sourceRecordId: `S02:aaaaaaaaaaaa:L${++seq}`,
    line: seq,
    makeRaw: 'Volkswagen Turismos',
    make: 'Volkswagen',
    scope: 'MAINLAND',
    model: o.model ?? 'Golf',
    version: o.version ?? 'TEST VERSION',
    segment: 'Medios',
    motorizacion: 'Gasolina',
    powertrain: o.powertrain ?? 'ICE',
    ...(o.powertrain === 'BEV' ? {} : { fuel: 'petrol' as const }),
    category: 'M1',
    dates: { alta: '2022-03-01', actualizacion: '2022-03-01' },
    hints: { kw: kw !== undefined ? [kw] : [], cv: [], ...(code ? { codeCandidate: { variant: code[0], version: code[1] } } : {}) },
    values: { ...(fuel ? { fuelWltpMin: fuel[0], fuelWltpMax: fuel[1] } : {}), ...(o.values ?? {}) },
    unmapped: {},
    issues: [],
    ...o,
  } as IdaeRecord;
}

const build = (groups: EeaTechnicalGroup[], recs: IdaeRecord[] = [], curated = new Map<string, string>()) =>
  buildCandidates({ groups, idae: recs, rawSha256: { S01: ['1'.repeat(64)], S02: ['2'.repeat(64)] }, curatedExact: curated }).candidates;

describe('families: official names are matched by explicit rules, never by similarity', () => {
  it('EEA commercial names', () => {
    expect(familyOfEeaRow(fam('vw-golf'), 'GOLF VARIANT', '')).toBe(true);
    expect(familyOfEeaRow(fam('vw-golf'), 'GOLF SPORTSVAN', '')).toBe(false);
    expect(familyOfEeaRow(fam('peugeot-208'), 'NUEVO 208 5P ALLURE PURETECH 100', '')).toBe(true);
    expect(familyOfEeaRow(fam('peugeot-208'), 'N2008 ALLURE PURETECH 100', '')).toBe(false);
    expect(familyOfEeaRow(fam('byd-seal'), 'BYD SEAL', '')).toBe(true);
    expect(familyOfEeaRow(fam('byd-seal'), 'BYD SEAL U DM-I', '')).toBe(false);
    expect(familyOfEeaRow(fam('byd-seal'), 'BYD SEAL 6 DM-I TOURING', '')).toBe(false);
    expect(familyOfEeaRow(fam('mercedes-a'), 'A 200 D', '')).toBe(true);
    expect(familyOfEeaRow(fam('mercedes-a'), 'GLA 200 D', '')).toBe(false);
    expect(familyOfEeaRow(fam('bmw-3'), '320D', '')).toBe(true);
    expect(familyOfEeaRow(fam('bmw-3'), 'X3 XDRIVE20D', '')).toBe(false);
  });
  it('Tesla: empty or generic Cn → identified by Type, never by guess', () => {
    expect(familyOfEeaRow(fam('tesla-model-3'), '', '3')).toBe(true);
    expect(familyOfEeaRow(fam('tesla-model-3'), 'MODEL', '2')).toBe(false); // Model S/X
    expect(familyOfEeaRow(fam('tesla-model-y'), 'MODEL Y', '')).toBe(true);
  });
  it('IDAE models (mainland distributor makes)', () => {
    expect(familyOfIdaeRecord(fam('toyota-yaris'), 'Toyota', 'YARIS')).toBe(true);
    expect(familyOfIdaeRecord(fam('toyota-yaris'), 'Toyota', 'YARIS CROSS')).toBe(false);
  });
});

describe('identity (EXACT / PARTIAL / AMBIGUOUS / UNCONFIRMED / CONFLICTED)', () => {
  it('EXACT only with an official identifier: IDAE code equal to Va/Ve character by character', () => {
    const g = group({ make: 'BYD', commercialNames: ['BYD SEAL'], homologationPowertrain: 'BEV', fuel: undefined, fuelTypes: ['ELECTRIC'], fuelModes: ['E'], variant: 'ZZ1C', version: 'ZZTEST001', ep: 230, z: 165, zr: 520, co2: 0 });
    const [c] = build([g], [idae({ make: 'BYD', model: 'SEAL', powertrain: 'BEV', code: ['ZZ1C', 'ZZTEST001'], version: 'Design (ZZ1C/ZZTEST001)' })]);
    expect(c!.identityStatus).toBe('EXACT');
    expect(c!.identityEvidence.join(' ')).toMatch(/character by character/);
  });

  it('an official code that identifies a sibling version makes that version the representative (evidence never transferred)', () => {
    const big = group({ make: 'BYD', commercialNames: ['BYD SEAL'], homologationPowertrain: 'BEV', fuel: undefined, fuelTypes: ['ELECTRIC'], fuelModes: ['E'], variant: 'ZZ2C', version: 'ZZBIG', ep: 160, registrations: 900 });
    const small = { ...big, key: 'k2', version: 'ZZSMALL', registrations: 20, sourceRows: 20 };
    const [c] = build([big, small], [idae({ make: 'BYD', model: 'SEAL', powertrain: 'BEV', code: ['ZZ2C', 'ZZSMALL'] })]);
    expect(c!.technicalIdentity.version).toBe('ZZSMALL');
    expect(c!.identityStatus).toBe('EXACT');
  });

  it('PARTIAL: an official code confirms Va but not this Ve', () => {
    const g = group({ make: 'BYD', commercialNames: ['BYD SEAL'], homologationPowertrain: 'BEV', fuel: undefined, fuelTypes: ['ELECTRIC'], fuelModes: ['E'], variant: 'ZZ3C', version: 'ZZV1', ep: 230 });
    const [c] = build([g], [idae({ make: 'BYD', model: 'SEAL', powertrain: 'BEV', code: ['ZZ3C', 'ZZOTHERVERSION9'] })]);
    expect(c!.identityStatus).toBe('PARTIAL');
  });

  it('value match (family + powertrain + fuel + power + period + consumption) is UNCONFIRMED by rule — never EXACT', () => {
    const [c] = build([group({ ep: 110, ec: 1498, fc: 6.0, co2: 136 })], [idae({ kw: 110, fuel: [5.8, 6.3] })]);
    expect(c!.identityStatus).toBe('UNCONFIRMED');
    expect(c!.identityEvidence.join(' ')).toMatch(/value-based link only/);
  });

  it('AMBIGUOUS: two technical groups of the family share every compared value (cannot tell which is the commercial version)', () => {
    const a = group({ variant: 'VA1', ep: 110, ec: 1498, fc: 6.0 });
    const b = group({ variant: 'VA2', ep: 110, ec: 1498, fc: 6.0 });
    const cs = build([a, b], [idae({ kw: 110, fuel: [5.8, 6.3] })]);
    expect(cs.map((c) => c.identityStatus)).toEqual(['AMBIGUOUS', 'AMBIGUOUS']);
  });

  it('a value link that fails the consumption cross-check is rejected (UNCONFIRMED), not presented as a source conflict', () => {
    const [c] = build([group({ ep: 110, ec: 1498, fc: 8.9 })], [idae({ kw: 110, fuel: [5.8, 6.3] })]);
    expect(c!.identityStatus).toBe('UNCONFIRMED');
    expect(c!.identityEvidence.join(' ')).toMatch(/value link rejected/);
    expect(c!.sourceRefs.map((s) => s.sourceId)).toEqual(['S01']);
  });

  it('CONFLICTED: inconsistent identity facts inside one version are preserved for review', () => {
    const [c] = build([group({ ep: 110, conflicts: ['fuel modes B/M'] })]);
    expect(c!.identityStatus).toBe('CONFLICTED');
    expect(c!.qualitySummary.conflicts).toContain('fuel modes B/M');
  });

  it('curated EXACT identities of the existing catalogue are recognised (and never re-curated in the pilot)', () => {
    const g = group({ tan: 'E1*2007/46*0623*35', variant: 'GAC4DACAX0', version: 'FM6TEST', ep: 96, ec: 1498, nedc: 113, co2: 135 });
    const [c] = build([g], [], new Map([['E1*2007/46*0623*35|GAC4DACAX0|FM6TEST', 'golf-2018 (Step 4c)']]));
    expect(c!.identityStatus).toBe('EXACT');
    expect(assessIdentity).toBeTypeOf('function');
  });
});

describe('deduplication, cycles and history', () => {
  it('the same TAN/Va/Ve over several years is ONE technical identity; registrations add up per year', () => {
    const y1 = group({ year: 2022, variant: 'V', version: 'X', ep: 110, co2: 130, registrations: 300 });
    const y2 = { ...group({ year: 2024, variant: 'V', version: 'X', ep: 110, co2: 130, registrations: 200 }) };
    const [c] = build([y1, y2]);
    expect(c!.registrationsEs).toEqual({ total: 500, byYear: { 2022: 300, 2024: 200 } });
    expect(c!.modelYear.eeaYears).toEqual([2022, 2024]);
  });

  it('NEDC-only and WLTP homologations never share a candidate (ADR-007: Golf 2018 *33 vs *35)', () => {
    const nedc = group({ tan: 'E1*2007/46*0623*33', year: 2018, variant: 'GAC', version: 'A', ep: 96, ec: 1498, nedc: 113 });
    const wltp = group({ tan: 'E1*2007/46*0623*35', year: 2018, variant: 'GAC', version: 'B', ep: 96, ec: 1498, nedc: 113, co2: 135 });
    expect(build([nedc, wltp])).toHaveLength(2);
  });

  it('historical rows (2016) take NEDC CO₂ from `E (g/km)`; cycles are never mixed or converted', () => {
    const [c] = build([group({ year: 2016, ep: 81, ec: 1197, e: 119 })]);
    const co2 = c!.specValues.filter((v) => v.specKey === 'emi.co2_combined_gkm');
    expect(co2).toEqual([expect.objectContaining({ externalField: 'E (g/km)', value: 119, testCycle: 'NEDC' })]);
    expect(c!.modelYear.period).toBe('2015–2018');
  });

  it('NEDC reported with WLTP is NEDC-correlated (inferred), WLTP stays WLTP', () => {
    const [c] = build([group({ year: 2018, ep: 96, ec: 1498, nedc: 113, co2: 135 })]);
    const co2 = c!.specValues.filter((v) => v.specKey === 'emi.co2_combined_gkm');
    expect(co2.find((v) => v.externalField === 'Ewltp (g/km)')).toMatchObject({ testCycle: 'WLTP', value: 135 });
    expect(co2.find((v) => v.externalField === 'Enedc (g/km)')).toMatchObject({ testCycle: 'UNDECLARED', testCycleInferred: 'NEDC_CORRELATED' });
  });
});

describe('BEV / PHEV and missing data', () => {
  it('BEV: Wh/km → kWh/100 km, range kept with range_type UNSPECIFIED; Range is PARTIAL, Economy needs a price', () => {
    const [c] = build([group({ make: 'BYD', commercialNames: ['BYD SEAL'], homologationPowertrain: 'BEV', fuel: undefined, fuelTypes: ['ELECTRIC'], fuelModes: ['E'], ep: 230, z: 165, zr: 520, co2: 0 })]);
    expect(c!.specValues.find((v) => v.specKey === 'nrg.electric_combined_kwh100')).toMatchObject({ value: 16.5, unit: 'kWh/100 km' });
    expect(c!.specValues.find((v) => v.specKey === 'rng.electric_combined_km')).toMatchObject({ value: 520, measurementBasis: { range_type: 'UNSPECIFIED' } });
    expect(c!.qualitySummary.categories).toMatchObject({ Range: 'PARTIAL_FROM_D1', Economy: 'NEEDS_S08', Charging: 'NEEDS_S08' });
    expect(c!.qualitySummary.missingCritical).toContain('price');
  });

  it('PHEV: EEA fuel consumption is never the charge-sustaining value (cost basis stays missing)', () => {
    const [c] = build([group({ homologationPowertrain: 'OVC_HEV', fuelTypes: ['PETROL/ELECTRIC'], fuelModes: ['P'], ep: 110, ec: 1395, fc: 1.1, z: 160, zr: 60, co2: 25 })]);
    expect(c!.specValues.some((v) => v.specKey === 'nrg.fuel_combined_l100')).toBe(false);
    expect(c!.specValues.find((v) => v.specKey === 'nrg.phev_weighted_fuel_l100')?.notes).toMatch(/never used for cost/);
    expect(c!.qualitySummary.missingCritical).toContain('nrg.fuel_charge_sustaining_l100');
  });

  it('missing data is never zero: absent fields produce no SpecValue', () => {
    const [c] = build([group({ ep: 110 })]);
    expect(c!.specValues.map((v) => v.specKey).sort()).toEqual(['dim.mass_kg', 'dim.wheelbase_mm', 'perf.power_max_kw']);
  });

  it('coverage uses the existing critical keys (no new formula)', () => {
    const ice = d1Coverage('ICE', new Set(['nrg.fuel_combined_l100', 'emi.co2_combined_gkm']), new Set());
    expect(ice.categories.Charging).toBe('NOT_APPLICABLE');
    expect(ice.categories.Economy).toBe('NEEDS_S08');
    expect(ice.missingCritical).toEqual(expect.arrayContaining(['price', 'seats', 'cap.boot_l', 'pt.fuel_tank_l', 'emi.dgt_label_es']));
    expect(ice.criticalCompleteness).toBeGreaterThan(0);
    expect(ice.criticalCompleteness).toBeLessThan(0.5);
  });
});

describe('rights and publication gate', () => {
  it('reads the existing rights registry without changing it', () => {
    expect(rightsDecision('S01')).toBe('CONDITIONAL');
    expect(rightsDecision('S02')).toBe('PENDING_REVIEW');
    expect(rightsDecision('S08')).toBe('PENDING_REVIEW');
    expect(rightsDecision('NOPE')).toBe('PROHIBITED');
    expect(rightsDecision('C01')).toBe('PROHIBITED');
    // Sin cambios unilaterales de derechos en D1.
    expect(SOURCE_RIGHTS.S02).toEqual({ store: 'PENDING', republish: 'PENDING', commercial: 'PENDING', derive: 'PENDING' });
  });

  it('data readiness and publication readiness are separate; PUBLIC eligibility is never granted by D1', () => {
    const [c] = build([group({ ep: 110, ec: 1498, fc: 6.0 })], [idae({ kw: 110, fuel: [5.8, 6.3] })]);
    expect(c!.rightsSummary).toMatchObject({ publicEligible: false, humanApproval: 'PENDING', bySource: { S01: 'CONDITIONAL', S02: 'PENDING_REVIEW', S08: 'PENDING_REVIEW' } });
    expect(c!.blockers.identity.length).toBeGreaterThan(0);
    expect(c!.blockers.data.length).toBeGreaterThan(0);
    expect(c!.blockers.rights).toEqual(['S02 PENDING_REVIEW', 'S08 PENDING_REVIEW']);
  });

  it('final status order: blocked → identity → data → rights → ready', () => {
    const ok = { S01: 'CONDITIONAL' } as const;
    expect(curationStatus({ identity: 'EXACT', missingCritical: [], rights: ok }).status).toBe('READY_FOR_CURATED_IMPORT');
    expect(curationStatus({ identity: 'EXACT', missingCritical: [], rights: { ...ok, S08: 'PENDING_REVIEW' } }).status).toBe('NEEDS_RIGHTS_REVIEW');
    expect(curationStatus({ identity: 'EXACT', missingCritical: ['price'], rights: ok }).status).toBe('NEEDS_DATA_COMPLETION');
    expect(curationStatus({ identity: 'UNCONFIRMED', missingCritical: ['price'], rights: ok }).status).toBe('NEEDS_IDENTITY_REVIEW');
    expect(curationStatus({ identity: 'EXACT', missingCritical: [], rights: { S09: 'PROHIBITED' } }).status).toBe('BLOCKED');
  });

  it('IDAE values and version texts never leave the build (only row references and field presence)', () => {
    const [c] = build([group({ ep: 110, ec: 1498, fc: 6.0 })], [idae({ kw: 110, fuel: [5.8, 6.3], version: 'SECRET TRIM NAME 110 kW' })]);
    const json = JSON.stringify(c);
    expect(json).not.toContain('SECRET TRIM NAME');
    expect(json).not.toContain('6.3');
    expect(c!.idaeFieldsPresent).toEqual(['nrg.fuel_combined_l100']);
    expect(c!.sourceRefs.find((s) => s.sourceId === 'S02')!.records[0]).toMatch(/^S02:[0-9a-f]{12}:L\d+$/);
  });
});

describe('selection: shortlist and pilot', () => {
  const pool = (n: number) =>
    Array.from({ length: n }, (_, i) =>
      group({ variant: `V${i}`, version: `X${i}`, tan: `E1*2007/46*${String(1000 + i)}*01`, ep: 50 + i, ec: 1000 + i, fc: 5 + i / 100, registrations: 1000 + i * 10, year: [2016, 2020, 2022, 2025][i % 4]! }),
    );

  it('never fabricates candidates: with fewer real candidates than the target, the shortlist is shorter', () => {
    const cs = build(pool(12));
    expect(selectShortlist(cs, { total: 100, minRegistrations: 100, perFamilyCap: 50 })).toHaveLength(12);
  });

  it('respects the family cap and keeps at least one candidate per family', () => {
    const golf = build(pool(10));
    const seat = build([group({ make: 'SEAT', commercialNames: ['LEON'], variant: 'S1', ep: 81, registrations: 150 })]);
    const s = selectShortlist([...golf, ...seat], { total: 6, minRegistrations: 100, perFamilyCap: 5 });
    expect(s.filter((c) => c.familyId === 'vw-golf')).toHaveLength(5);
    expect(s.some((c) => c.familyId === 'seat-leon')).toBe(true);
  });

  it('pilot: at most 2 per family, never an existing catalogue variant, all powertrains when available', () => {
    const cs = build(pool(8)).map((c, i) => (i === 0 ? { ...c, existingCatalogOverlap: 'existing-slug' } : c));
    const p = selectPilot(cs);
    expect(p.length).toBeLessThanOrEqual(2);
    expect(p.some((c) => c.existingCatalogOverlap)).toBe(false);
    expect(new Set(p.map(bucketOf))).toEqual(new Set(['ICE']));
  });

  it('is deterministic: the same inputs give byte-identical candidates', () => {
    const a = JSON.stringify(build(pool(20)));
    const b = JSON.stringify(build(pool(20)));
    expect(a).toBe(b);
  });

  it('every candidate validates against the intermediate format', () => {
    for (const c of build(pool(6))) expect(CurationCandidate.safeParse(c).success).toBe(true);
  });
});

/* Opt-in: verifica los artefactos reales generados por los scripts (requiere `data/` local). */
const ROOT = fileURLToPath(new URL('../../../', import.meta.url));
describe.skipIf(process.env.VSCAR_D1_LOCAL !== '1')('D1 artefacts on disk (VSCAR_D1_LOCAL=1)', () => {
  it('raw files match their manifests; the shortlist is schema-valid and contains no IDAE values', async () => {
    const manifests = JSON.parse(readFileSync(join(ROOT, 'docs/data/d1/acquisition-manifests.json'), 'utf8')) as AcquisitionManifest[];
    for (const m of manifests) expect(await verifyFileManifest(m, join(ROOT, 'data', m.storedPath)), m.storedPath).toBe(true);
    const lines = readFileSync(join(ROOT, 'docs/data/d1/curation_candidates.jsonl'), 'utf8').trim().split('\n');
    expect(lines.length).toBe(100);
    for (const l of lines) expect(CurationCandidate.safeParse(JSON.parse(l)).success).toBe(true);
    expect(existsSync(join(ROOT, 'data/curation/curation_candidates.all.jsonl'))).toBe(true);
  });
});
