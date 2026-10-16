import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { GOR3A_SPEC, flattenGor3a, type Gor3aEngine, type Gor3aMakeFile } from '@vscar/data-connectors';
import { matchGor3a, validateOpenDatasetMatch, type MatchCandidate, type OpenDatasetMatch, type RdwEvidence } from '../src/index.ts';

/** Step D1.4 — matching con datasets abiertos: identidad técnica intacta, niveles L1/L2, falsos positivos, RDW, derechos. */

const d14 = (f: string) => JSON.parse(readFileSync(fileURLToPath(new URL(`../../../docs/data/d14/${f}`, import.meta.url)), 'utf8'));

const engine = (o: Partial<Gor3aEngine> = {}): Gor3aEngine => ({
  label: '1.5L TSI 6MT FWD (150 HP)',
  fuelType: 'Gasoline',
  cylinders: 4,
  displacementCc: 1498,
  powerHp: 150,
  torqueNm: 250,
  transmission: '6-speed manual',
  drivetrain: 'Front Wheel Drive',
  zeroToHundredKmhS: 8.3,
  topSpeedKmh: 216,
  fuelEconomyCombinedL100: null,
  lengthMm: 4258,
  widthMm: 1799,
  heightMm: 1492,
  wheelbaseMm: 2620,
  curbWeightKg: 1240,
  specs: { [GOR3A_SPEC.power]: '110.3 KW @ 5000 RPM150 HP @ 5000 RPM', [GOR3A_SPEC.cargo]: '13.4 cuFT (380 L)' },
  ...o,
});
const gen = (name: string, ys: number, ye: number | null, engines: Gor3aEngine[]) => ({ name, yearStart: ys, yearEnd: ye, bodyType: null, engines });
const dataset = (gens: ReturnType<typeof gen>[], model = 'Golf'): Gor3aMakeFile => ({ group: 'volkswagen', makes: [{ name: 'Volkswagen', models: [{ name: model, yearStart: 1974, yearEnd: null, generations: gens }] }] });
const cand: MatchCandidate = { rank: 1, familyId: 'vw-golf', technicalKey: 'E1*2007/46*0623*35|GAC4DACAX0|FM6FM6AJ015N7CPON1ML1BVR2NA', registrationYears: [2018], productClass: 'ICE_OR_MHEV', fuel: 'petrol', powerKw: 110, displacementCc: 1498 };
const rdw: RdwEvidence = { drivetrain: 'FWD', doors: 5, length: { min: 4258, max: 4356 }, wheelbase: 2620 };
const run = (gens: ReturnType<typeof gen>[], r: RdwEvidence = rdw, c: MatchCandidate = cand, tx?: 'manual' | 'automatic' | 'single_speed') => matchGor3a(c, flattenGor3a([dataset(gens)]), r, tx);

describe('identity levels and statuses', () => {
  it('a fully compatible single generation is STRONG at engine level (L2), never homologation (L3)', () => {
    const m = run([gen('Golf 5 Doors (2017)', 2017, 2019, [engine()])]);
    expect(m).toMatchObject({ status: 'STRONG_COMPATIBLE_MATCH', level: 'ENGINE_CONFIGURATION', identityVerified: false, reusableInVscar: false, valuesStored: false });
    expect(validateOpenDatasetMatch(m)).toEqual([]);
  });

  it('technical identity is preserved: the key is copied, never replaced by dataset names', () => {
    const m = run([gen('Golf 5 Doors (2017)', 2017, 2019, [engine()])]);
    expect(m.technicalKey).toBe(cand.technicalKey);
    expect(JSON.stringify(m)).not.toMatch(/TSI/);
  });

  it('EXACT_DOCUMENTED_LINK is impossible without a homologation link', () => {
    const m = { ...run([gen('Golf 5 Doors (2017)', 2017, 2019, [engine()])]), status: 'EXACT_DOCUMENTED_LINK' as const };
    expect(validateOpenDatasetMatch(m)[0]).toMatch(/homologation link/);
    expect(validateOpenDatasetMatch({ ...m, level: 'HOMOLOGATION' })).toContain('S14 has no homologation identifiers: level HOMOLOGATION is impossible');
  });

  it('family absent from the dataset → NOT_FOUND (no substitute model)', () => {
    const m = matchGor3a({ ...cand, familyId: 'byd-seal' }, flattenGor3a([dataset([gen('Seal (2023)', 2023, null, [engine()])], 'Seal')]), rdw, undefined);
    expect(m.status).toBe('NOT_FOUND');
  });

  it('generation found but the engine is not in the dataset → NOT_FOUND at L1', () => {
    expect(run([gen('Golf 5 Doors (2017)', 2017, 2019, [engine({ specs: { [GOR3A_SPEC.power]: '96 KW' } })])])).toMatchObject({ status: 'NOT_FOUND', level: 'MODEL_GENERATION' });
  });
});

describe('generations and years', () => {
  it('two compatible generations (facelift / transition) → AMBIGUOUS, none chosen', () => {
    const m = run([gen('Golf 5 Doors (2012)', 2012, 2017, [engine()]), gen('Golf 5 Doors (2017)', 2017, 2019, [engine()])], rdw, { ...cand, registrationYears: [2017] });
    expect(m.status).toBe('AMBIGUOUS');
    expect(m.compatibleGenerations).toHaveLength(2);
  });

  it('a generation that does not cover every registration year is only WEAK (year ∈ interval is not proof)', () => {
    const m = run([gen('Golf 5 Doors (2019)', 2019, 2024, [engine()])], rdw, { ...cand, registrationYears: [2017, 2020] });
    expect(m.status).toBe('WEAK_COMPATIBLE_MATCH');
    expect(m.basis[1]).toMatch(/does not cover/);
  });

  it('an RDW approval extension older than the generation start downgrades to WEAK', () => {
    const m = run([gen('Golf 5 Doors (2019)', 2019, 2024, [engine()])], { ...rdw, approvalFrom: '2016-03-01' }, { ...cand, registrationYears: [2019] });
    expect(m.status).toBe('WEAK_COMPATIBLE_MATCH');
  });

  it('the generation start year is never turned into a model year', () => {
    const m = run([gen('Golf 5 Doors (2017)', 2017, 2019, [engine()])]);
    expect(Object.keys(m)).not.toContain('modelYear');
    expect(m.fields.generation).toEqual({ found: true, distinct: 1 });
  });
});

describe('false positives are rejected by hard facts', () => {
  it('3 doors vs RDW 5 → REJECTED; 5 vs RDW 4 (tailgate counting) is not a contradiction', () => {
    expect(run([gen('Golf 3 Doors (2017)', 2017, 2019, [engine()])]).status).toBe('REJECTED');
    expect(run([gen('Golf 5 Doors (2017)', 2017, 2019, [engine()])], { ...rdw, doors: 4 }).status).toBe('STRONG_COMPATIBLE_MATCH');
  });

  it('AWD row vs RDW FWD → REJECTED', () => {
    const m = run([gen('Golf 5 Doors (2017)', 2017, 2019, [engine({ drivetrain: 'All Wheel Drive' })])]);
    expect(m.status).toBe('REJECTED');
    expect(m.rejectedRowReasons.drivetrain).toBe(1);
  });

  it('body: an estate (longer than the RDW envelope) cannot match a hatchback key', () => {
    expect(run([gen('Golf Variant (2017)', 2017, 2019, [engine({ lengthMm: 4567 })])]).status).toBe('REJECTED');
  });

  it('transmission evidence: manual row vs automatic evidence rejected; CVT vs automatic is not a contradiction', () => {
    expect(run([gen('Golf 5 Doors (2017)', 2017, 2019, [engine()])], rdw, cand, 'automatic').status).toBe('REJECTED');
    expect(run([gen('Golf 5 Doors (2017)', 2017, 2019, [engine({ transmission: 'CVT' })])], rdw, cand, 'automatic').status).toBe('STRONG_COMPATIBLE_MATCH');
    expect(run([gen('Golf 5 Doors (2017)', 2017, 2019, [engine({ transmission: 'CVT' })])], rdw, cand, 'manual').status).toBe('REJECTED');
  });

  it('power: a row with HP only (no kW) is unverifiable → WEAK, never converted', () => {
    expect(run([gen('Golf 5 Doors (2017)', 2017, 2019, [engine({ specs: {} })])]).status).toBe('WEAK_COMPATIBLE_MATCH');
  });

  it('hybrid: system power is not compared with the EEA ICE-only power', () => {
    const hev = { ...cand, productClass: 'HEV_OR_MHEV', powerKw: 72, displacementCc: 1798 };
    const m = run([gen('Golf 5 Doors (2017)', 2017, 2019, [engine({ fuelType: 'Hybrid Gasoline', displacementCc: 1798, specs: { [GOR3A_SPEC.systemPower]: '103 kw (140 hp)' } })])], rdw, hev);
    expect(m.status).toBe('WEAK_COMPATIBLE_MATCH');
  });

  it('without an RDW length envelope a match cannot be STRONG', () => {
    expect(run([gen('Golf 5 Doors (2017)', 2017, 2019, [engine()])], {}).status).toBe('WEAK_COMPATIBLE_MATCH');
  });
});

describe('RDW cross-check and new fields', () => {
  it('conflicts with RDW are recorded, not corrected', () => {
    const m = run([gen('Golf 5 Doors (2017)', 2017, 2019, [engine({ widthMm: 2050 })])], { ...rdw, width: { min: 1799, max: 1799 } });
    expect(m.status).toBe('STRONG_COMPATIBLE_MATCH');
    expect(m.rdwCrossCheck.find((x) => x.field === 'width')).toEqual({ field: 'width', compared: 1, agree: 0, disagree: 1 });
  });

  it('boot and 0–100 are reported as found (distinct count), never as values', () => {
    const m = run([gen('Golf 5 Doors (2017)', 2017, 2019, [engine()])]);
    expect(m.fields.boot).toEqual({ found: true, distinct: 1 });
    expect(m.fields.accel_0_100).toEqual({ found: true, distinct: 1 });
    expect(JSON.stringify(m)).not.toMatch(/\b380\b|8\.3/);
  });

  it('deterministic output', () => {
    const g = [gen('Golf 5 Doors (2012)', 2012, 2017, [engine()]), gen('Golf 5 Doors (2017)', 2017, 2019, [engine(), engine({ transmission: '7-speed automatic (DSG)' })])];
    expect(JSON.stringify(run(g))).toBe(JSON.stringify(run(g)));
  });
});

describe('D1.4 artifacts (rights isolation, provenance, coverage)', () => {
  const m = d14('matching-100.json') as { valuesStored: false; summary20: Record<string, unknown>; matches: (OpenDatasetMatch & { pilot: boolean })[] };

  it('100 candidates evaluated, the same 20 pilot candidates, every match valid', () => {
    expect(m.matches).toHaveLength(100);
    expect(m.matches.filter((x) => x.pilot).map((x) => x.rank)).toEqual([2, 4, 5, 6, 7, 8, 9, 20, 22, 24, 26, 27, 28, 48, 53, 56, 57, 73, 81, 86]);
    expect(m.matches.flatMap((x) => validateOpenDatasetMatch(x))).toEqual([]);
  });

  it('nothing is verified or reusable; no dataset values in versioned artifacts', () => {
    expect(m.valuesStored).toBe(false);
    expect(m.matches.every((x) => !x.identityVerified && !x.reusableInVscar && !x.valuesStored && x.level !== 'HOMOLOGATION')).toBe(true);
    const text = readFileSync(fileURLToPath(new URL('../../../docs/data/d14/matching-100.json', import.meta.url)), 'utf8');
    expect(text).not.toMatch(/"(boot_l|accel_s|kw|lengthMm|zeroToHundredKmhS|specs|engine)"/);
    const d2 = d14('d2-readiness.json') as { previewImportable: boolean; boot: { reusable: boolean } }[];
    expect(d2.every((x) => !x.previewImportable && !x.boot.reusable)).toBe(true);
  });

  it('provenance: manifests with SHA-256 for S14 (pinned release) and S15 (sample + licence evidence)', () => {
    const mf = d14('acquisition-manifests.json') as { sourceId: string; sha256: string; requestUrl?: string; redistributable: boolean }[];
    expect(mf.filter((x) => x.sourceId === 'S14')).toHaveLength(5);
    expect(mf.filter((x) => x.sourceId === 'S15')).toHaveLength(3);
    expect(mf.every((x) => /^[0-9a-f]{64}$/.test(x.sha256) && !x.redistributable)).toBe(true);
    expect(mf.some((x) => x.requestUrl?.includes('/releases/download/v1.0.2/'))).toBe(true);
  });

  it('gor3a: actual counts and exact JSON/CSV/SQLite parity are recorded', () => {
    const inv = d14('gor3a-inventory.json');
    expect(inv.actual).toEqual({ makeGroups: 164, makes: 164, models: 2649, generations: 7217, engines: 30535 });
    expect(inv.parity.enginesEqual).toBe(true);
  });
});
