import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import {
  GIAVEH_EXPECTED_HEADER,
  RDW_DATASETS,
  RDW_MAPPING,
  RDW_SOURCE,
  RetryableSourceError,
  buildRdwQuery,
  buildRdwWithdrawalQuery,
  fetchRdw,
  giavehLookup,
  groupRdwRows,
  indexGiaveh,
  mapRdwVersions,
  matchRdw,
  rdwNumber,
  readGiavehCsv,
  type RdwDatasetName,
  type RdwFetchLike,
} from '../src/index.ts';

/** Step D1.1 — RDW (muestra real CC0 del piloto, 2026-10-16) y GIAVEH (fixture SINTÉTICO). */

const sample = JSON.parse(readFileSync(fileURLToPath(new URL('./fixtures/rdw/pilot-sample.json', import.meta.url)), 'utf8')) as Record<RdwDatasetName | 'withdrawals', Record<string, string>[]>;
const datasets = Object.fromEntries(Object.entries(sample).filter(([k]) => k in RDW_DATASETS)) as Partial<Record<RdwDatasetName, unknown[]>>;
const { versions, issues } = groupRdwRows(datasets);

const GOLF33 = { tan: 'E1*2007/46*0623*33', variant: 'GAC4DACAX0', version: 'FM6FM6AJ015N7MVON1ML79VR2N' };
const GOLF35 = { tan: 'e1*2007/46*0623*35', variant: 'gac4dacax0', version: 'FM6FM6AJ015N7CPON1ML1BVR2NA' };
const SEAL = { tan: 'E13*2018/858*00639*03', variant: 'SE2R1C', version: '2NTE5F002NL1' };
const RAV4 = { tan: 'E6*2007/46*0429*05', variant: 'AXAP54(N)', version: 'AXAP54L-ANXMBW(1F)' };

describe('RDW TGK — schema, query, pagination, rate limits, licence', () => {
  it('parses the real rows: one version per TAN+Va+Ve+revision, numbers as numbers, empty never 0', () => {
    expect(issues).toEqual([]);
    const g = versions.find((v) => v.tan === 'E1*2007/46*0623*33')!;
    expect(g).toMatchObject({ variant: 'GAC4DACAX0', revision: 0, tanBase: 'E1*2007/46*0623', validFrom: '2017-12-20' });
    expect(rdwNumber(g.basis, 'massarijklaarbovengrens')).toBe(1301);
    expect(rdwNumber(g.basis, 'paramrijweerstandf0ondergrens')).toBeUndefined();
    expect(versions.filter((v) => v.tan === 'E6*2007/46*0429*05').map((v) => v.revision)).toEqual([0, 1]);
  });

  it('builds safe SoQL: whitelisted fields, escaped (Va, Ve) pairs, deterministic order, bounded batches', () => {
    const q = buildRdwQuery('handelsbenaming', [RAV4]);
    expect(q.$where).toBe("(codevariantgk='AXAP54(N)' AND codeuitvoeringtgk='AXAP54L-ANXMBW(1F)')");
    expect(q.$order!.startsWith('typegoedkeuringsnummer,codevariantgk,codeuitvoeringtgk,volgnummerrevisieuitvoering')).toBe(true);
    expect(() => buildRdwQuery('basis', [{ variant: "X' OR 1=1 --", version: 'Y' }])).toThrow(/unsafe/);
    expect(() => buildRdwQuery('basis', Array.from({ length: 26 }, () => RAV4))).toThrow(/1\.\.25/);
    expect(buildRdwWithdrawalQuery(['e6*2007/46*0429*05']).$where).toBe("upper(typegoedkeuringsnummer) IN ('E6*2007/46*0429*05')");
  });

  it('paginates with $limit/$offset until a short page', async () => {
    const urls: string[] = [];
    const fake: RdwFetchLike = async (url) => {
      urls.push(url);
      const offset = Number(new URL(url).searchParams.get('$offset'));
      return { ok: true, status: 200, json: async () => (offset === 0 ? [{ a: 1 }, { a: 2 }] : [{ a: 3 }]) };
    };
    const r = await fetchRdw('byxc-wwua', buildRdwQuery('basis', [GOLF33]), { fetchImpl: fake, pageSize: 2 });
    expect(r.rows).toHaveLength(3);
    expect(urls.map((u) => new URL(u).searchParams.get('$offset'))).toEqual(['0', '2']);
  });

  it('429: waits Retry-After (never bypasses the quota) and gives up after the configured retries', async () => {
    const waits: number[] = [];
    let n = 0;
    const flaky: RdwFetchLike = async () => (++n === 1 ? { ok: false, status: 429, headers: { get: () => '7' }, json: async () => ({}) } : { ok: true, status: 200, json: async () => [] });
    const r = await fetchRdw('byxc-wwua', buildRdwQuery('basis', [GOLF33]), { fetchImpl: flaky, sleep: async (ms) => void waits.push(ms) });
    expect(r.rateLimited).toBe(1);
    expect(waits).toEqual([7000]);
    const always: RdwFetchLike = async () => ({ ok: false, status: 429, json: async () => ({}) });
    await expect(fetchRdw('byxc-wwua', {}, { fetchImpl: always, sleep: async () => {}, maxRateLimitRetries: 2 })).rejects.toBeInstanceOf(RetryableSourceError);
  });

  it('licence metadata and data protection: CC0 TGK registers only; plates and Dutch commercial data are rejected', () => {
    expect(RDW_SOURCE).toMatchObject({ source_code: 'S11', license: 'Public Domain (CC0 1.0)', source_market: 'NL' });
    const rejected = RDW_MAPPING.filter((m) => m.target.kind === 'rejected').flatMap((m) => m.fields);
    expect(rejected).toEqual(expect.arrayContaining(['kenteken', 'catalogusprijs', 'bruto_bpm']));
    for (const ds of Object.values(RDW_DATASETS)) expect(ds.fields).not.toContain('kenteken');
  });
});

describe('RDW ↔ EEA technical identity', () => {
  it('EXACT only with the full TAN (extension included) + Va + Ve; case and spacing normalised', () => {
    const m = matchRdw(GOLF35, versions);
    expect(m).toMatchObject({ level: 'EXACT', identity: 'EXACT' });
    expect(m.versions).toHaveLength(1);
  });

  it('same Va/Ve under another TAN extension is a revision mismatch (PARTIAL, values not used)', () => {
    const m = matchRdw({ tan: 'E9*2007/46*3167*27', variant: 'SFDTTCX0', version: 'FD7SFD7GC0024BIVL1BAD16' }, versions);
    expect(m).toMatchObject({ level: 'TAN_EXTENSION_MISMATCH', identity: 'PARTIAL', versions: [] });
    expect(m.nearMisses[0]!.tan).toBe('E9*2007/46*3167*26');
  });

  it('same TAN + Ve under another variant is not the same vehicle (Golf 3 vs 5 doors)', () => {
    const g = versions.find((v) => v.tan === 'E1*2007/46*0623*33')!;
    const twin = { ...g, variant: 'GAC2DACAX0', key: g.key.replace('GAC4', 'GAC2') };
    expect(matchRdw({ ...GOLF33, variant: 'GAC2DACAX0' }, [g]).level).toBe('VARIANT_MISMATCH');
    expect(matchRdw(GOLF33, [g, twin]).versions).toEqual([g]);
  });

  it('same Va/Ve under another approval (other issuing state or small series) is a different homologation', () => {
    const r = versions.find((v) => v.tan === 'E6*2007/46*0429*05')!;
    const other = { ...r, tan: 'E13*2007/46*2356*05', tanBase: 'E13*2007/46*2356' };
    expect(matchRdw({ ...RAV4, tan: 'E13*KS18/858*00023*01' }, [other]).level).toBe('OTHER_APPROVAL');
  });

  it('several RDW revisions of the exact version are all kept; identical values merge', () => {
    const m = matchRdw(RAV4, versions);
    expect(m.versions.map((v) => v.revision)).toEqual([0, 1]);
    const { observations, revisionConflicts } = mapRdwVersions(m.versions, 'OVC_HEV');
    expect(observations.find((o) => o.key === 'dim.length_mm')!.revisions).toEqual([0, 1]);
    expect(revisionConflicts).toEqual([]);
  });

  it('different values across revisions are preserved as conflicts, never averaged', () => {
    const [r0] = matchRdw(RAV4, versions).versions;
    const r9 = { ...r0!, revision: 9, key: `${r0!.key}9`, basis: { ...r0!.basis!, massarijklaarondergrens: '1990', massarijklaarbovengrens: '1990' } };
    const { observations, revisionConflicts } = mapRdwVersions([r0!, r9], 'OVC_HEV');
    expect(observations.filter((o) => o.key === 'dim.mass_kg')).toHaveLength(2);
    expect(revisionConflicts.some((c) => c.includes('dim.mass_kg'))).toBe(true);
  });
});

describe('RDW mapping v1', () => {
  const map = (k: typeof GOLF33, hp: Parameters<typeof mapRdwVersions>[1]) => mapRdwVersions(matchRdw(k, versions).versions, hp);

  it('ICE (Golf *33, 2017): dimensions as variant envelope, mass, seats, Euro family, NEDC values (pre-2021, no WLTP)', () => {
    const { observations: o } = map(GOLF33, 'ICE');
    const get = (k: string) => o.find((x) => x.key === k);
    expect(get('dim.length_mm')).toMatchObject({ min: 4258, max: 4356, rangeBasis: 'HOMOLOGATION_FAMILY', unit: 'mm' });
    expect(get('dim.mass_kg')).toMatchObject({ value: 1301, measurementBasis: { mass_definition: 'EU_RUNNING_ORDER' } });
    expect(get('perf.power_max_kw')).toMatchObject({ value: 96, measurementBasis: { power_basis: 'ICE_ONLY' } });
    expect(get('seats')).toMatchObject({ target: 'structural', value: 5 });
    expect(get('emissions_standard_family')!.value).toBe('EURO_6');
    expect(o.filter((x) => x.testCycle === 'NEDC').map((x) => x.key).sort()).toEqual(['emi.co2_combined_gkm', 'nrg.fuel_combined_l100']);
    expect(get('dim.length_mm')!.sourceRecordIds[0]).toBe('S11:byxc-wwua:E1*2007/46*0623*33|GAC4DACAX0|FM6FM6AJ015N7MVON1ML79VR2N|r0');
  });

  it('EU body code AC is kept raw, never translated (the 5-door Golf hatchback is homologated AC)', () => {
    const { observations: o } = map(GOLF33, 'ICE');
    expect(o.find((x) => x.key === 'body_code_eu')!.value).toBe('AC');
    expect(o.some((x) => x.key === 'body_type')).toBe(false);
  });

  it('BEV (SEAL): Wh/km → kWh/100 km; single bound → INFERRED; "NEDC" fields on a WLTP row are ignored as anomalies', () => {
    const { observations: o, anomalies } = map(SEAL, 'BEV');
    expect(o.find((x) => x.key === 'nrg.electric_combined_kwh100')).toMatchObject({ value: 15.9, testCycle: 'WLTP', mappingConfidence: 'INFERRED' });
    expect(o.find((x) => x.key === 'rng.electric_combined_km')).toMatchObject({ value: 583, measurementBasis: { range_type: 'WLTP_COMBINED' } });
    expect(o.some((x) => x.testCycle === 'NEDC')).toBe(false);
    expect(anomalies.some((a) => a.includes('NEDC fields populated'))).toBe(true);
    expect(o.find((x) => x.key === 'body_type')!.value).toBe('sedan');
  });

  it('PHEV (RAV4): weighted values only (no CS published) → CS stays missing, weighted never becomes CS', () => {
    const { observations: o } = map(RAV4, 'OVC_HEV');
    expect(o.some((x) => x.key === 'nrg.fuel_charge_sustaining_l100')).toBe(false);
    expect(o.find((x) => x.key === 'nrg.phev_weighted_fuel_l100')).toMatchObject({ value: 1, mappingConfidence: 'INFERRED' });
    expect(o.find((x) => x.key === 'drivetrain')!.value).toBe('AWD');
    expect(o.find((x) => x.key === 'rng.electric_combined_km' && x.measurementBasis?.range_type === 'EAER')!.value).toBe(75);
  });

  it('a PHEV "combined" WLTP value is charge-sustaining (glossary), mapped to the CS key', () => {
    const [r] = matchRdw(RAV4, versions).versions;
    const withCs = { ...r!, energy: r!.energy.map((e) => (e.codeenergiebron === 'B' ? { ...e, brandstofverbruikgecombwltpogr: '5.712', brandstofverbruikgecombwltpbgr: '5.809' } : e)) };
    const { observations: o } = mapRdwVersions([withCs], 'OVC_HEV');
    expect(o.find((x) => x.key === 'nrg.fuel_charge_sustaining_l100')).toMatchObject({ min: 5.71, max: 5.81, measurementBasis: { consumption_basis: 'CHARGE_SUSTAINING' } });
    expect(o.some((x) => x.key === 'nrg.fuel_combined_l100')).toBe(false);
  });

  it('commercial data never appears among observations (no price, trim or equipment keys)', () => {
    for (const k of [GOLF33, SEAL]) for (const o of map(k, k === SEAL ? 'BEV' : 'ICE').observations) expect(o.key).not.toMatch(/price|trim|equipment|war\./);
  });
});

/* GIAVEH: fixture SINTÉTICO con la cabecera real (los datos reales no se redistribuyen: S12 pendiente de revisión). */
describe('GIAVEH (S12) — directory of type approvals, no technical data', () => {
  const csv = `﻿${GIAVEH_EXPECTED_HEADER.join(',')}\n"1","e1*2007/46*0623*35","AU","PERSONA FISICA DE EJEMPLO","MARCA A"\n"2","e9*2018/858*11001*08","DBG","FABRICANTE SA","MARCA B; MARCA C"\n`;
  async function* src() {
    yield csv;
  }

  it('parses the 5 real columns, normalises the TAN and never keeps the manufacturer (may be a natural person)', async () => {
    const { records, rows } = await readGiavehCsv({ path: 'x', source: src() });
    expect(rows).toBe(2);
    expect(records[0]).toEqual({ fichaId: '1', tan: 'E1*2007/46*0623*35', tanRaw: 'e1*2007/46*0623*35', type: 'AU', brands: ['MARCA A'], line: 2 });
    expect(JSON.stringify(records)).not.toContain('PERSONA');
    expect(records[1]!.brands).toEqual(['MARCA B', 'MARCA C']);
  });

  it('lookup: TAN with extension + Type, or explicit miss', async () => {
    const idx = indexGiaveh((await readGiavehCsv({ path: 'x', source: src() })).records);
    expect(giavehLookup(idx, 'E1*2007/46*0623*35', ['AU']).status).toBe('TAN_AND_TYPE');
    expect(giavehLookup(idx, 'E1*2007/46*0623*35', ['ZZ']).status).toBe('TAN_TYPE_DIFFERS');
    expect(giavehLookup(idx, 'E1*2007/46*0623*36', ['AU']).status).toBe('TAN_NOT_FOUND');
  });

  it('schema drift is an error', async () => {
    async function* bad() {
      yield 'Num F.R.,Tipo\n"1","AU"\n';
    }
    await expect(readGiavehCsv({ path: 'x', source: bad() })).rejects.toThrow(/schema drift/);
  });
});
