import { mkdtempSync, readFileSync, readdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, relative } from 'node:path';
import { describe, expect, it } from 'vitest';
import { GOLF_2018_IDS, SOURCES, loadAllCases } from '@vscar/fixtures';
import { engineUsability } from '@vscar/quality';
import { Homologation, type SpecValue } from '@vscar/vehicle-schema';
import {
  EEA_SUPPORTED_YEARS,
  buildEeaQuery,
  eeaImportKey,
  matchObservations,
  normalizeEeaRows,
  resolveEeaDataset,
  runEeaImport,
  toCandidateSpecValues,
} from '../src/index.ts';
import { fakeFetch, recorded } from './helpers.ts';

/** Tests obligatorios de Step 4c (identidad + cobertura EEA). */
const all = loadAllCases();
const golfRvA = all.variants.find((v) => v.id === GOLF_2018_IDS.rvA)!;
const golfH33 = all.homologations.find((h) => h.id === golfRvA.homologation_id)!;
let seq = 0;
const makeId = () => `00000000-0000-4000-8000-${String(++seq).padStart(12, '0')}`;
const target = (h: Homologation) => ({
  variant_id: golfRvA.id,
  reference_market: 'ES' as const,
  source_id: SOURCES.eea.id,
  source_url: 'https://discodata.eea.europa.eu/sql',
  retrieved_at: '2026-09-24',
  homologation_powertrain: h.homologation_powertrain,
});

const row = (over: Record<string, unknown>) => ({
  MS: 'ES', Year: 2023, Status: 'F', TAN: 'E1*2007/46*9999*01', Va: 'VA1', Ve: 'VE1', Mk: 'TEST', Cn: 'MODEL', Ft: 'PETROL', Fm: 'M',
  'Ec (cm3)': 1498, 'Ep (KW)': 110, 'M (kg)': 1400, Mt: 1500, 'Ewltp (g/km)': 130, R: 10, Dr_min: '2023-01-10', Dr_max: '2023-06-30',
  ...over,
});
const obsOf = (rows: unknown[]) => normalizeEeaRows(rows).observations;
const homologation = (over: Record<string, unknown>) =>
  Homologation.parse({
    id: '00000000-0000-4000-8000-00000000aa01',
    market_code: 'ES',
    type_approval_number: 'e1*2007/46*9999*01',
    variant_code: 'VA1',
    version_code: 'VE1',
    valid_from: '2023-01-01',
    test_cycle: 'WLTP',
    emissions_standard_family: 'EURO_6',
    homologation_powertrain: 'ICE',
    identification_confidence: 'EXACT',
    source_id: SOURCES.eea.id,
    source_url: 'https://discodata.eea.europa.eu/sql',
    ...over,
  });
const byKey = <T extends { spec_key: string }>(xs: readonly T[], k: string) => xs.filter((x) => x.spec_key === k);

describe('1 · Golf 2018 exact Va/Ve keeps manual and DSG apart', () => {
  const observations = obsOf(recorded('golf-2018-es').results);
  const exact = Homologation.parse({ ...golfH33, version_code: 'FM6FM6AJ015N7MVON1ML79VR2N' });

  it('only the manual FM6 version is used; DSG (FD7, 1344 kg) never enters', () => {
    const match = matchObservations(exact, observations, 'ES');
    expect(match.level).toBe('TAN_VA_VE');
    expect(match.observations.every((o) => o.version_code.startsWith('FM6'))).toBe(true);
    const mass = byKey(toCandidateSpecValues(match, target(exact), makeId), 'dim.mass_kg').find((m) => m.external_field === 'M (kg)')!;
    expect(mass.value).toBe(1301);
  });

  it('same commercial name, different homologation → different ReferenceVariant', () => {
    const golfRvB = all.variants.find((v) => v.id === GOLF_2018_IDS.rvB)!;
    expect(golfRvA.commercial_group_key).toBe(golfRvB.commercial_group_key);
    expect(golfRvA.homologation_id).not.toBe(golfRvB.homologation_id);
    const h35 = all.homologations.find((h) => h.id === golfRvB.homologation_id)!;
    expect(h35.type_approval_number).not.toBe(golfH33.type_approval_number);
  });
});

describe('2 · missing Ve → PARTIAL, never usable by engines', () => {
  it('same market: TAN+Va without Ve is blocked even with a single observed version', () => {
    const obs = obsOf([row({})]);
    const h = homologation({ version_code: undefined, identification_confidence: 'PARTIAL' });
    const match = matchObservations(h, obs, 'ES');
    expect(match).toMatchObject({ level: 'TAN_VA', mapping_confidence: 'UNCONFIRMED' });
    const candidates = toCandidateSpecValues(match, target(h), makeId) as SpecValue[];
    expect(candidates.length).toBeGreaterThan(0);
    expect(candidates.every((c) => !engineUsability(c).usable)).toBe(true);
  });

  it('no TAN/Va at all → no match (no guessing by name, power or year)', () => {
    const match = matchObservations(homologation({ type_approval_number: undefined, variant_code: undefined, version_code: undefined, manufacturer_type_code: 'X', identification_confidence: 'UNCONFIRMED' }), obsOf([row({})]), 'ES');
    expect(match.level).toBe('NONE');
  });
});

describe('3 · Tesla: equal values and trim name never merge homologations', () => {
  const obs = obsOf(recorded('model3-2021-es').results);

  it('E6R and E6CR are distinct variant codes even with identical power/consumption', () => {
    const e6r = obs.filter((o) => o.variant_code === 'E6R');
    const e6cr = obs.filter((o) => o.variant_code === 'E6CR');
    expect(e6r.length).toBeGreaterThan(0);
    expect(e6cr.length).toBeGreaterThan(0);
    const h = homologation({ type_approval_number: e6r[0]!.type_approval_number, variant_code: 'E6R', version_code: e6r[0]!.version_code, homologation_powertrain: 'BEV' });
    const match = matchObservations(h, obs, 'ES');
    expect(match.observations.every((o) => o.variant_code === 'E6R')).toBe(true);
  });
});

describe('4 · León DE → ES only with an EXACT homologation match', () => {
  const es = obsOf(recorded('leon-ehybrid-2022-es').results);
  const de = obsOf(recorded('leon-ehybrid-2022-de').results);
  const shared = es.find((o) => de.some((d) => d.type_approval_number === o.type_approval_number && d.variant_code === o.variant_code && d.version_code === o.version_code))!;
  const h = homologation({ type_approval_number: shared.type_approval_number, variant_code: shared.variant_code, version_code: shared.version_code, homologation_powertrain: 'OVC_HEV' });

  it('EXACT → usable, source_market DE, reference_market ES', () => {
    const c = toCandidateSpecValues(matchObservations(h, de, 'ES'), target(h), makeId) as SpecValue[];
    expect(c.every((x) => x.source_market === 'DE' && x.reference_market === 'ES' && x.homologation_match === 'EXACT')).toBe(true);
    expect(c.every((x) => engineUsability(x).usable)).toBe(true);
  });

  it('PARTIAL (no Ve) → stays PARTIAL, not usable, Economy/Range not forced', () => {
    const p = Homologation.parse({ ...h, version_code: undefined });
    const c = toCandidateSpecValues(matchObservations(p, de, 'ES'), target(p), makeId) as SpecValue[];
    expect(c.every((x) => x.homologation_match === 'PARTIAL' && !engineUsability(x).usable)).toBe(true);
  });
});

describe('5–6 · FINAL wins over PROVISIONAL and never double counts', () => {
  const rows = [row({ Status: 'F', R: 10, 'Ewltp (g/km)': 130 }), row({ Status: 'P', R: 10, 'Ewltp (g/km)': 131 }), row({ Status: 'F', R: 5, Mt: 1510 })];

  it('uses only FINAL rows when both exist', () => {
    const [o] = obsOf(rows);
    expect(o!.status).toBe('F');
    expect([...o!.fields['Ewltp (g/km)']!.keys()]).toEqual([130]);
  });

  it('registrations are the FINAL total only (no F+P double counting)', () => {
    expect(obsOf(rows)[0]!.registrations).toBe(15);
  });

  it('PROVISIONAL-only data is flagged provisional', () => {
    const provOnly = obsOf([row({ Status: 'P' })]);
    const c = toCandidateSpecValues(matchObservations(homologation({}), provOnly, 'ES'), target(homologation({})), makeId);
    expect(c.every((x) => x.provisional === true)).toBe(true);
  });
});

describe('7–8 · casing: normalized for matching, original kept in raw/provenance', () => {
  it('lower-case TAN in VScar matches upper-case EEA rows and vice versa', () => {
    const obs = obsOf([row({ TAN: 'E1*2007/46*9999*01' }), row({ TAN: 'e1*2007/46*9999*01', Status: 'F', R: 1 })]);
    expect(obs).toHaveLength(1);
    expect(matchObservations(homologation({ type_approval_number: 'e1*2007/46*9999*01' }), obs, 'ES').level).toBe('TAN_VA_VE');
    expect(obs[0]!.type_approval_number_raw).toEqual(['E1*2007/46*9999*01', 'e1*2007/46*9999*01']);
  });

  it('the raw file keeps the source casing untouched (Petrol / e1*)', async () => {
    const rawDir = mkdtempSync(join(tmpdir(), 'vscar-raw-'));
    const r = await runEeaImport({
      year: 2018,
      filters: { memberState: 'ES', make: 'VOLKSWAGEN', commercialNamePrefix: 'GOLF', engineCapacityCm3: 1498, enginePowerKw: 96 },
      targets: [],
      sourceId: SOURCES.eea.id,
      rawDir,
      retrievedAt: '2026-09-24',
      fetchImpl: fakeFetch(recorded('golf-2018-es')),
    });
    const raw = readFileSync(r.raw.file_path, 'utf8');
    expect(raw).toContain('"Ft": "Petrol"');
    expect(raw).toContain('"TAN": "e1*2007/46*0623*35"');
  });
});

describe('9–10 · power basis and mass definition', () => {
  it('Ep of a hybrid never becomes system power; ICE Ep is ICE_ONLY; BEV Ep is electric power', () => {
    const hev = homologation({ homologation_powertrain: 'NOVC_HEV' });
    const cHev = toCandidateSpecValues(matchObservations(hev, obsOf([row({ Fm: 'H' })]), 'ES'), target(hev), makeId);
    expect(byKey(cHev, 'perf.power_max_kw')).toEqual([]);
    expect(byKey(cHev, 'perf.power_ice_kw')[0]?.value).toBe(110);

    const ice = homologation({});
    const cIce = toCandidateSpecValues(matchObservations(ice, obsOf([row({})]), 'ES'), target(ice), makeId);
    expect(byKey(cIce, 'perf.power_max_kw')[0]?.measurement_basis?.power_basis).toBe('ICE_ONLY');

    const bev = homologation({ homologation_powertrain: 'BEV' });
    const cBev = toCandidateSpecValues(matchObservations(bev, obsOf([row({ Fm: 'E', Ft: 'ELECTRIC', 'Ec (cm3)': null })]), 'ES'), target(bev), makeId);
    expect(byKey(cBev, 'perf.power_max_kw')).toEqual([]);
    expect(byKey(cBev, 'perf.power_electric_kw')[0]?.value).toBe(110);
  });

  it('M → EU_RUNNING_ORDER; Mt → WLTP_TEST_MASS, never running order', () => {
    const c = toCandidateSpecValues(matchObservations(homologation({}), obsOf([row({})]), 'ES'), target(homologation({})), makeId);
    const masses = byKey(c, 'dim.mass_kg');
    expect(masses.find((m) => m.external_field === 'M (kg)')?.measurement_basis?.mass_definition).toBe('EU_RUNNING_ORDER');
    expect(masses.find((m) => m.external_field === 'Mt')?.measurement_basis?.mass_definition).toBe('WLTP_TEST_MASS');
    expect(masses.find((m) => m.value === 1500)?.measurement_basis?.mass_definition).not.toBe('EU_RUNNING_ORDER');
  });

  it('Z (Wh/km) → kWh/100 km ÷10 with unit_conversion; Zr range type stays UNSPECIFIED', () => {
    const bev = homologation({ homologation_powertrain: 'BEV' });
    const c = toCandidateSpecValues(matchObservations(bev, obsOf([row({ Fm: 'E', Ft: 'ELECTRIC', 'Z (Wh/km)': 142, Zr: 440 })]), 'ES'), target(bev), makeId);
    expect(byKey(c, 'nrg.electric_combined_kwh100')[0]).toMatchObject({ value: 14.2, transformation: 'unit_conversion', external_field: 'Z (Wh/km)' });
    expect(byKey(c, 'rng.electric_combined_km')[0]?.measurement_basis?.range_type).toBe('UNSPECIFIED');
  });
});

describe('11 · dataset resolver 2010 → current', () => {
  it('resolves every supported year to a single-status table', () => {
    expect(EEA_SUPPORTED_YEARS).toEqual({ min: 2010, max: 2025 });
    for (let y = EEA_SUPPORTED_YEARS.min; y <= EEA_SUPPORTED_YEARS.max; y++) {
      const d = resolveEeaDataset(y);
      const q = buildEeaQuery({ memberState: 'ES', make: 'SEAT' }, d);
      // tablas mixtas llevan filtro de estado; las versionadas son de un solo estado
      if (d.table.endsWith('[co2cars]')) expect(q).toContain(d.status === 'FINAL' ? "Status='F'" : "Status='P'");
    }
  });

  it('2018 → latest (FINAL, Status filter); 2022 → Fv26 (not latest P); 2023 → Fv28; 2024 → Fv30; 2025 → Pv31 provisional', () => {
    expect(resolveEeaDataset(2018)).toMatchObject({ table: '[CO2Emission].[latest].[co2cars]', status: 'FINAL', status_filter: 'F', provisional: false });
    expect(resolveEeaDataset(2022).table).toBe('[CO2Emission].[latest].[co2cars_2022Fv26]');
    expect(resolveEeaDataset(2023).table).toBe('[CO2Emission].[latest].[co2cars_2023Fv28]');
    expect(resolveEeaDataset(2024).table).toBe('[CO2Emission].[latest].[co2cars_2024Fv30]');
    expect(resolveEeaDataset(2025)).toMatchObject({ table: '[CO2Emission].[latest].[co2cars_2025Pv31]', provisional: true });
    expect(() => resolveEeaDataset(2025, 'FINAL_ONLY')).toThrow();
    expect(() => resolveEeaDataset(2009)).toThrow();
    expect(resolveEeaDataset(2024, 'PROVISIONAL_ONLY').table).toBe('[CO2Emission].[latest].[co2cars_2024Pv29]');
  });

  it('the logical import key is stable and includes year and status', () => {
    const f = { memberState: 'ES', make: 'TESLA', enginePowerKw: 239 };
    expect(eeaImportKey(2021, 'FINAL_OR_PROVISIONAL', f)).toBe(eeaImportKey(2021, 'FINAL_OR_PROVISIONAL', f));
    expect(eeaImportKey(2021, 'FINAL_OR_PROVISIONAL', f)).toMatch(/^eea:2021:FINAL:[0-9a-f]{32}$/);
  });
});

describe('12 · multi-year idempotency of raw ingest', () => {
  it('re-importing the same payloads for 2018 and 2021 never duplicates raw files; layout eea/<year>/<status>/<sha256>.json', async () => {
    const rawDir = mkdtempSync(join(tmpdir(), 'vscar-raw-'));
    const run = (year: number, sample: string, filters: Parameters<typeof runEeaImport>[0]['filters']) =>
      runEeaImport({ year, filters, targets: [], sourceId: SOURCES.eea.id, rawDir, retrievedAt: '2026-09-24', fetchImpl: fakeFetch(recorded(sample)) });
    const golf = { memberState: 'ES', make: 'VOLKSWAGEN', commercialNamePrefix: 'GOLF', engineCapacityCm3: 1498, enginePowerKw: 96 };
    const tesla = { memberState: 'ES', make: 'TESLA', enginePowerKw: 239 };

    const first = [await run(2018, 'golf-2018-es', golf), await run(2021, 'model3-2021-es', tesla)];
    const second = [await run(2018, 'golf-2018-es', golf), await run(2021, 'model3-2021-es', tesla)];

    expect(first.map((r) => r.raw.deduplicated)).toEqual([false, false]);
    expect(second.map((r) => r.raw.deduplicated)).toEqual([true, true]);
    expect(second.map((r) => r.raw.id)).toEqual(first.map((r) => r.raw.id));

    const files = (dir: string): string[] =>
      readdirSync(dir, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? files(join(dir, e.name)) : [relative(rawDir, join(dir, e.name)).replace(/\\/g, '/')]));
    const listed = files(rawDir);
    expect(listed).toHaveLength(2);
    expect(listed.every((f) => /^eea\/(2018|2021)\/final\/[0-9a-f]{64}\.json$/.test(f))).toBe(true);
  });
});

