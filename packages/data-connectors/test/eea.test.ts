import { mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { GOLF_2018_IDS, MODEL3_2021_IDS, SOURCES, loadAllCases } from '@vscar/fixtures';
import { detectConflicts, engineUsability } from '@vscar/quality';
import { Homologation, displayCycle, type SpecValue } from '@vscar/vehicle-schema';
import {
  EEA_MAPPING_VERSION,
  buildEeaQuery,
  fetchEea,
  resolveEeaDataset,
  matchObservations,
  normalizeEeaRows,
  runEeaImport,
  toCandidateSpecValues,
  verifyRawIngest,
  type EeaObservation,
} from '../src/index.ts';
import { fakeFetch, recorded } from './helpers.ts';

const all = loadAllCases();
const variant = (id: string) => all.variants.find((v) => v.id === id)!;
const homologationOf = (id: string) => all.homologations.find((h) => h.id === variant(id).homologation_id)!;
const curated = (id: string) => all.spec_values.filter((v) => v.variant_id === id);
let seq = 0;
const makeId = () => `00000000-0000-4000-8000-${String(++seq).padStart(12, '0')}`;

const target = (variantId: string, h: Homologation) => ({
  variant_id: variantId,
  reference_market: 'ES' as const,
  source_id: SOURCES.eea.id,
  source_url: 'https://discodata.eea.europa.eu/sql',
  retrieved_at: '2026-09-24',
  homologation_powertrain: h.homologation_powertrain,
});

function candidatesFor(variantId: string, h: Homologation, observations: EeaObservation[]) {
  const match = matchObservations(h, observations, 'ES');
  return { match, candidates: toCandidateSpecValues(match, target(variantId, h), makeId) };
}

const byKey = <T extends { spec_key: string }>(values: readonly T[], key: string): T[] => values.filter((v) => v.spec_key === key);

describe('query builder', () => {
  const d2018 = resolveEeaDataset(2018);

  it('builds a whitelisted, server-side aggregated query with the dataset status filter', () => {
    const q = buildEeaQuery({ memberState: 'ES', make: 'volkswagen', commercialNamePrefix: 'GOLF', engineCapacityCm3: 1498 }, d2018);
    expect(q).toContain("Mk='VOLKSWAGEN'");
    expect(q).toContain("Cn LIKE 'GOLF%'");
    expect(q).toContain("Status='F'");
    expect(q).toContain('SUM(R) AS R');
    expect(q).toContain('GROUP BY MS, Year, Status, TAN, Va, Ve');
  });

  it('rejects SQL-injection-like input instead of passing it through', () => {
    expect(() => buildEeaQuery({ memberState: 'ES', make: 'VW', commercialNamePrefix: "GOLF'; DROP TABLE x --" }, d2018)).toThrow(/unsafe/);
    expect(() => buildEeaQuery({ memberState: 'ES', make: "VW' OR '1'='1" }, d2018)).toThrow(/unsafe/);
    expect(() => buildEeaQuery({ memberState: 'ES', make: 'VW', enginePowerKw: '96 OR 1=1' as unknown as number }, d2018)).toThrow(/invalid engine power/);
    expect(() => buildEeaQuery({ memberState: 'ES', make: 'VW', fuelMode: "P' --" }, d2018)).toThrow(/invalid fuel mode/);
    expect(() => buildEeaQuery({ memberState: "ES'", make: 'VW' }, d2018)).toThrow(/member state/);
  });

  it('rejects tables outside the EEA whitelist', () => {
    expect(() => buildEeaQuery({ memberState: 'ES', make: 'X' }, { ...d2018, table: '[dbo].[users]' })).toThrow();
  });
});

describe('client', () => {
  it('pages until a short page and surfaces API errors', async () => {
    const calls: string[] = [];
    let n = 0;
    const paged = async (url: string) => {
      calls.push(url);
      n++;
      return { ok: true, status: 200, json: async () => ({ results: n === 1 ? [{ a: 1 }, { a: 2 }] : [{ a: 3 }] }) };
    };
    const r = await fetchEea('SELECT 1', { fetchImpl: paged, pageSize: 2 });
    expect(r.rows).toHaveLength(3);
    expect(calls.map((u) => new URL(u).searchParams.get('p'))).toEqual(['1', '2']);
    await expect(fetchEea('SELECT 1', { fetchImpl: fakeFetch({ errors: [{ error: 'system tables are not allowed' }] }) })).rejects.toThrow(/system tables/);
  });
});

describe('normalization (real Golf 2018 ES sample)', () => {
  const { observations, issues } = normalizeEeaRows(recorded('golf-2018-es').results);

  it('keeps final data only when both P and F rows exist (no double counting)', () => {
    expect(observations.every((o) => o.status === 'F')).toBe(true);
    const h33 = observations.find((o) => o.type_approval_number === 'E1*2007/46*0623*33' && o.variant_code === 'GAC4DACAX0' && o.version_code === 'FM6FM6AJ015N7MVON1ML79VR2N')!;
    expect(h33.registrations).toBe(140);
    expect(issues.filter((i) => i.kind === 'PROVISIONAL_ONLY')).toEqual([]);
  });

  it('normalizes inconsistent casing (TAN e1*/E1*, Petrol/PETROL)', () => {
    expect(observations.every((o) => o.type_approval_number === o.type_approval_number.toUpperCase())).toBe(true);
    expect(new Set(observations.flatMap((o) => o.fuel_types))).toEqual(new Set(['PETROL']));
  });
});

describe('Golf 2018: the adapter reproduces the DC-03 curation', () => {
  const { observations } = normalizeEeaRows(recorded('golf-2018-es').results);
  const h33 = homologationOf(GOLF_2018_IDS.rvA);

  it('without a version code, several EEA versions stay UNCONFIRMED (manual and DSG mixed)', () => {
    const noVe = Homologation.parse({ ...h33, version_code: undefined, identification_confidence: 'PARTIAL' });
    const { match, candidates } = candidatesFor(GOLF_2018_IDS.rvA, noVe, observations);
    expect(match.level).toBe('TAN_VA');
    expect(match.mapping_confidence).toBe('UNCONFIRMED');
    expect(candidates.length).toBeGreaterThan(0);
    // Los candidatos se guardan como evidencia, pero no pueden alimentar engines.
    expect(candidates.every((c) => !engineUsability(c as SpecValue).usable)).toBe(true);
    const co2 = byKey(candidates, 'emi.co2_combined_gkm')[0]!;
    expect([co2.value_min, co2.value_max]).toEqual([110, 116]);
  });

  it('with the exact version (TAN *33 + Va + Ve, now in the curated homologation) the values match the fixture: no conflicts', () => {
    expect(h33.version_code).toBe('FM6FM6AJ015N7MVON1ML79VR2N');
    const exactH = h33;
    const { match, candidates } = candidatesFor(GOLF_2018_IDS.rvA, exactH, observations);
    expect(match.level).toBe('TAN_VA_VE');
    expect(byKey(candidates, 'emi.co2_combined_gkm')[0]).toMatchObject({ value: 113, test_cycle: 'NEDC', external_field: 'Enedc (g/km)' });
    expect(byKey(candidates, 'dim.mass_kg')[0]).toMatchObject({ value: 1301, measurement_basis: { mass_definition: 'EU_RUNNING_ORDER' } });
    expect(byKey(candidates, 'perf.power_max_kw')[0]).toMatchObject({ value: 96, measurement_basis: { power_basis: 'ICE_ONLY' } });
    expect(byKey(candidates, 'dim.wheelbase_mm')[0]?.value).toBe(2620);
    const conflicts = detectConflicts([...curated(GOLF_2018_IDS.rvA), ...(candidates as SpecValue[])]);
    expect(conflicts).toEqual([]);
  });

  it('TAN *35 (WLTP): Enedc becomes an inferred NEDC-correlated value, never a declared one', () => {
    const manual35 = observations.find(
      (o) => o.type_approval_number === 'E1*2007/46*0623*35' && o.version_code.startsWith('FM6') && o.fields['Ewltp (g/km)']?.has(136) && o.fields['Enedc (g/km)']?.has(113),
    )!;
    const h35 = Homologation.parse({ ...homologationOf(GOLF_2018_IDS.rvB), version_code: manual35.version_code });
    const { candidates } = candidatesFor(GOLF_2018_IDS.rvB, h35, observations);
    const nedc = byKey(candidates, 'emi.co2_combined_gkm').find((c) => c.external_field === 'Enedc (g/km)')!;
    expect(displayCycle(nedc as SpecValue)).toMatchObject({ cycle: 'NEDC_CORRELATED', declared: false });
    expect(detectConflicts([...curated(GOLF_2018_IDS.rvB), ...(candidates as SpecValue[])]).filter((c) => c.spec_key === 'emi.co2_combined_gkm')).toEqual([]);
  });
});

describe('Tesla Model 3 2021: no guessing, and a real conflict surfaces', () => {
  const { observations } = normalizeEeaRows(recorded('model3-2021-es').results);

  it('the curated homologation (TAN without revision, no Va) is not matched', () => {
    const { match, candidates } = candidatesFor(MODEL3_2021_IDS.srp, homologationOf(MODEL3_2021_IDS.srp), observations);
    expect(match.level).toBe('NONE');
    expect(candidates).toEqual([]);
  });

  it('with TAN *13 / E6R / PB1S5N: EEA range 440 km conflicts with IDAE 448 km → human review', () => {
    const h = Homologation.parse({ ...homologationOf(MODEL3_2021_IDS.srp), type_approval_number: 'e4*2007/46*1293*13', variant_code: 'E6R', version_code: 'PB1S5N', manufacturer_type_code: undefined, identification_confidence: 'EXACT' });
    const { candidates } = candidatesFor(MODEL3_2021_IDS.srp, h, observations);
    expect(byKey(candidates, 'rng.electric_combined_km')[0]).toMatchObject({ value: 440, test_cycle: 'UNDECLARED', test_cycle_inferred: 'WLTP' });
    expect(byKey(candidates, 'nrg.electric_combined_kwh100')[0]?.value).toBe(14.2);
    expect(byKey(candidates, 'perf.power_electric_kw')[0]?.value).toBe(239);
    const conflicts = detectConflicts([...curated(MODEL3_2021_IDS.srp), ...(candidates as SpecValue[])]);
    const range = conflicts.find((c) => c.spec_key === 'rng.electric_combined_km')!;
    expect(range.requires_human_review).toBe(true);
    expect(conflicts.find((c) => c.spec_key === 'nrg.electric_combined_kwh100')).toBeUndefined();
  });
});

describe('SEAT León e-HYBRID 2022: cross-market matching by homologation (D1)', () => {
  const es = normalizeEeaRows(recorded('leon-ehybrid-2022-es').results).observations;
  const de = normalizeEeaRows(recorded('leon-ehybrid-2022-de').results).observations;
  const shared = es.find((o) => de.some((d) => d.type_approval_number === o.type_approval_number && d.variant_code === o.variant_code && d.version_code === o.version_code))!;
  const leonVariant = all.variants.find((v) => v.commercial.model === 'León')!;
  const h = Homologation.parse({
    id: '00000000-0000-4000-8000-00000000fe01',
    market_code: 'ES',
    type_approval_number: shared.type_approval_number,
    variant_code: shared.variant_code,
    version_code: shared.version_code,
    valid_from: '2022-01-01',
    test_cycle: 'WLTP',
    emissions_standard_family: 'EURO_6',
    homologation_powertrain: 'OVC_HEV',
    identification_confidence: 'EXACT',
    source_id: SOURCES.eea.id,
    source_url: 'https://discodata.eea.europa.eu/sql',
  });

  it('EXACT TAN/Va/Ve match in DE feeds engines with source_market visible', () => {
    const match = matchObservations(h, de, 'ES');
    expect(match).toMatchObject({ level: 'TAN_VA_VE', cross_market: true, homologation_match: 'EXACT', mapping_confidence: 'CROSS_MARKET_EXACT_HOMOLOGATION' });
    const candidates = toCandidateSpecValues(match, target(leonVariant.id, h), makeId) as SpecValue[];
    expect(candidates.length).toBeGreaterThan(0);
    for (const c of candidates) {
      expect(c.source_market).toBe('DE');
      expect(c.reference_market).toBe('ES');
    }
    const range = byKey(candidates, 'rng.electric_combined_km')[0]!;
    expect(engineUsability(range).usable).toBe(true);
    expect(range.measurement_basis?.range_type).toBe('UNSPECIFIED');
  });

  it('without a version code the cross-market match is PARTIAL → human review before use', () => {
    const partialH = Homologation.parse({ ...h, version_code: undefined });
    const match = matchObservations(partialH, de, 'ES');
    expect(match.homologation_match).toBe('PARTIAL');
    const candidates = toCandidateSpecValues(match, target(leonVariant.id, partialH), makeId) as SpecValue[];
    expect(candidates.every((c) => !engineUsability(c).usable)).toBe(true);
  });

  it('combustion power of the PHEV goes to perf.power_ice_kw, never to system power', () => {
    const candidates = toCandidateSpecValues(matchObservations(h, de, 'ES'), target(leonVariant.id, h), makeId);
    expect(byKey(candidates, 'perf.power_max_kw')).toEqual([]);
    expect(byKey(candidates, 'perf.power_ice_kw')[0]?.value).toBe(110);
  });
});

describe('runEeaImport (end to end, recorded response)', () => {
  it('writes an auditable raw file and returns schema-valid DRAFT candidates', async () => {
    const rawDir = mkdtempSync(join(tmpdir(), 'vscar-raw-'));
    const calls: string[] = [];
    const exactH = Homologation.parse({ ...homologationOf(GOLF_2018_IDS.rvA), version_code: 'FM6FM6AJ015N7MVON1ML79VR2N' });
    const opts = {
      year: 2018,
      filters: { memberState: 'ES', make: 'VOLKSWAGEN', commercialNamePrefix: 'GOLF', engineCapacityCm3: 1498, enginePowerKw: 96 },
      targets: [{ variant: variant(GOLF_2018_IDS.rvA), homologation: exactH }],
      sourceId: SOURCES.eea.id,
      rawDir,
      retrievedAt: '2026-09-24',
      fetchImpl: fakeFetch(recorded('golf-2018-es'), calls),
    };
    const result = await runEeaImport(opts);

    expect(calls).toHaveLength(1);
    expect(result.raw).toMatchObject({ source_code: 'S01', row_count: 137, import_status: 'NORMALIZED', dataset_year: 2018, dataset_status: 'FINAL', source_table: '[CO2Emission].[latest].[co2cars]' });
    expect(await verifyRawIngest(result.raw)).toBe(true);
    expect(JSON.parse(readFileSync(result.raw.file_path, 'utf8')).results).toHaveLength(137);

    const [t] = result.targets;
    expect(t!.issues).toEqual([]);
    expect(t!.candidates.every((c) => c.status === 'DRAFT' && c.source_authority === 'OFFICIAL_AUTHORITY' && c.transformation_version === EEA_MAPPING_VERSION && c.raw_ingest_id === result.raw.id)).toBe(true);

    // Determinista: misma respuesta → mismos ids.
    const again = await runEeaImport({ ...opts, fetchImpl: fakeFetch(recorded('golf-2018-es')) });
    expect(again.targets[0]!.candidates.map((c) => c.id)).toEqual(t!.candidates.map((c) => c.id));
  });
});

describe.skipIf(!(process.env.VSCAR_EEA_LIVE || process.env.VSCAR_LIVE_EEA))('live EEA discodata (VSCAR_EEA_LIVE=1)', () => {
  it('the real API still returns the confirmed fields', async () => {
    const q = buildEeaQuery({ memberState: 'ES', make: 'VOLKSWAGEN', commercialNamePrefix: 'GOLF', engineCapacityCm3: 1498, enginePowerKw: 96 }, resolveEeaDataset(2018));
    const r = await fetchEea(q);
    const { observations } = normalizeEeaRows(r.rows);
    expect(observations.some((o) => o.version_code === 'FM6FM6AJ015N7MVON1ML79VR2N' && o.fields['Enedc (g/km)']?.has(113))).toBe(true);
  }, 120_000);
});
