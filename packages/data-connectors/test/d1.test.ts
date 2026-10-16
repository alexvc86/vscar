import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { isSpecKey } from '@vscar/vehicle-schema';
import {
  AcquisitionManifest,
  ColumnProfiler,
  CsvParser,
  EEA_MAX_GET_URL,
  IDAE_EXPECTED_HEADER,
  IDAE_MAPPING,
  buildEeaInventoryQuery,
  buildEeaSurveyQuery,
  buildFileManifest,
  checkIdaeHeader,
  co2ByCycle,
  extractHints,
  fetchEea,
  groupEeaSurveyRows,
  hashFile,
  normalizeIdaeRow,
  parseCsvText,
  parseEeaInventory,
  parseIdaeDate,
  readIdaeCsv,
  resolveEeaDataset,
  tanBaseOf,
  verifyFileManifest,
  type FetchLike,
  type IdaeColumn,
} from '../src/index.ts';

/** Step D1 — adquisición, inventario, IDAE (fixtures SINTÉTICOS) y encuesta EEA (muestras reales CC BY). */

const fixture = (name: string) => JSON.parse(readFileSync(fileURLToPath(new URL(`./fixtures/eea/${name}`, import.meta.url)), 'utf8')) as { query: string; results: Record<string, unknown>[] };

describe('CSV streaming parser (RFC 4180)', () => {
  const text = '﻿a,b,c\r\n1,"x, y","say ""hi"""\n2,"multi\nline",\n3,,last';
  it('quotes, escaped quotes, embedded separators/newlines, CRLF, BOM, last line without newline', () => {
    const rows = parseCsvText(text);
    expect(rows.map((r) => r.fields)).toEqual([
      ['a', 'b', 'c'],
      ['1', 'x, y', 'say "hi"'],
      ['2', 'multi\nline', ''],
      ['3', '', 'last'],
    ]);
    // Trazabilidad: línea física donde empieza cada registro.
    expect(rows.map((r) => r.line)).toEqual([1, 2, 3, 5]);
  });
  it('gives the same rows whatever the chunk boundaries are (streaming)', () => {
    for (const size of [1, 2, 3, 7]) {
      const p = new CsvParser();
      const rows = [];
      for (let i = 0; i < text.length; i += size) rows.push(...p.push(text.slice(i, i + size)));
      rows.push(...p.end());
      expect(rows).toEqual(parseCsvText(text));
    }
  });
  it('rejects an unterminated quoted field instead of guessing', () => {
    expect(() => parseCsvText('a,b\n1,"open')).toThrow(/unterminated/);
  });
});

describe('column inventory', () => {
  it('detects types, null and zero rates, cardinality and keeps numbers numeric', () => {
    const p = new ColumnProfiler(['n', 'd', 't', 'e'], 2);
    for (const r of [['0', '01/02/2020', 'x', ''], ['1.5', '01/03/2020', 'y', ''], ['2', '', 'z', '']]) p.add(r);
    const [n, d, t, e] = p.result();
    expect(n).toMatchObject({ type: 'decimal', zeroCount: 1, min: 0, max: 2, nullCount: 0, example: '1.5' });
    expect(d).toMatchObject({ type: 'date_dmy', nullCount: 1 });
    expect(t).toMatchObject({ type: 'text', distinct: 2, distinctCapped: true });
    expect(e).toMatchObject({ type: 'empty', nullRate: 1 });
  });
});

describe('acquisition manifest', () => {
  it('records SHA-256 and size, validates the schema and detects a modified raw file', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'vscar-d1-'));
    const path = join(dir, 'raw.csv');
    writeFileSync(path, 'a,b\n1,2\n');
    const m = await buildFileManifest({
      absolutePath: path,
      sourceId: 'S02',
      resourceTitle: 'test',
      resourceUrl: 'https://example.org/x',
      retrievedAt: '2026-10-16T10:00:00.000Z',
      storedPath: 'raw/test/raw.csv',
      contentType: 'text/csv',
      licenseReference: 'none',
      rightsStatusAtRetrieval: 'PENDING_REVIEW',
      redistributable: false,
      schemaVersion: 'test-1',
      recordCount: 1,
    });
    expect(m.sha256).toBe((await hashFile(path)).sha256);
    expect(m.fileSize).toBe(8);
    expect(await verifyFileManifest(m, path)).toBe(true);
    writeFileSync(path, 'a,b\n1,3\n');
    expect(await verifyFileManifest(m, path)).toBe(false);
    expect(AcquisitionManifest.safeParse({ ...m, sourceId: 'IDAE' }).success).toBe(false);
    expect(AcquisitionManifest.safeParse({ ...m, storedPath: undefined }).success).toBe(false);
  });
});

/* ───────── IDAE: fixtures SINTÉTICOS (los derechos de IDAE no permiten redistribuir filas reales) ───────── */

const H = IDAE_EXPECTED_HEADER;
const synthetic = (o: Partial<Record<IdaeColumn, string>>) => {
  const base: Record<IdaeColumn, string> = {
    Fecha_alta: '01/03/2023', Fecha_actualizacion: '01/03/2023', Fecha_comercializacion: '', Marca: 'Marca Sintética', Modelo: 'MODELO X',
    Vehiculo: 'VERSION SINTETICA 1.5 110 kW (150 CV)', Segmento: 'Berlinas-Familiares Medios', Motorizacion: 'Gasolina', Categoria: 'M1', MTMA: '1900',
    Consumo_NEDC: '6.1', Emisiones_NEDC: '138', Consumo_Mixto_WLTP_Min: '5.8', Consumo_Mixto_WLTP_Max: '6.4', Consumo_Mixto_WLTP: '6.1',
    Emisionies_CO2_Mixto_WLTP_Min: '112', Emisionies_CO2_Mixto_WLTP_Max: '118', Autonomia_electrica: '0', Consumo_Electrico: '0', Observaciones: '0',
  };
  return { ...base, ...o };
};
const norm = (o: Partial<Record<IdaeColumn, string>>, line = 2) => {
  const row = synthetic(o);
  return normalizeIdaeRow((c) => row[c], { line, fileSha256: 'a'.repeat(64), editionYear: 2026 });
};
const csvOf = (rows: Array<Partial<Record<IdaeColumn, string>>>, header: readonly string[] = H) =>
  [header.join(','), ...rows.map((r) => H.map((c) => `"${synthetic(r)[c].replace(/"/g, '""')}"`).join(','))].join('\n') + '\n';
async function* chunks(text: string) {
  for (let i = 0; i < text.length; i += 17) yield text.slice(i, i + 17);
}

describe('IDAE (S02) — schema, drift and normalization', () => {
  it('header of the 2026-09 edition is recognised; drift is reported, never adapted silently', () => {
    expect(checkIdaeHeader([...H])).toMatchObject({ schemaVersion: 'idae-historico-csv-2026-09', compatible: true });
    expect(checkIdaeHeader([...H].reverse())).toMatchObject({ schemaVersion: 'UNKNOWN', compatible: true, reordered: true });
    expect(checkIdaeHeader(H.filter((c) => c !== 'Consumo_Electrico'))).toMatchObject({ compatible: false, missing: ['Consumo_Electrico'] });
    expect(checkIdaeHeader([...H, 'Nueva_Columna']).unexpected).toEqual(['Nueva_Columna']);
  });

  it('readIdaeCsv fails on incompatible headers (schema drift)', async () => {
    const text = csvOf([{}], H.filter((c) => c !== 'MTMA'));
    await expect(readIdaeCsv({ path: 'x', fileSha256: 'b'.repeat(64), editionYear: 2026, source: chunks(text) })).rejects.toThrow(/schema drift/);
  });

  it('0 and empty mean "not reported" — never a value of 0; negatives are issues', () => {
    const r = norm({ Motorizacion: 'Eléctricos puros', Consumo_Mixto_WLTP_Min: '0', Consumo_Mixto_WLTP_Max: '0', Autonomia_electrica: '412', Consumo_Electrico: '16.5', MTMA: '-1' });
    expect(r.values).toEqual({ electricRangeKm: 412, electricKwh100: 16.5 });
    expect(r.values.fuelWltpMin).toBeUndefined();
    expect(r.issues.some((i) => i.startsWith('measure_negative'))).toBe(true);
  });

  it('impossible WLTP ranges and implausible consumption (e.g. CO₂ in the fuel column) are dropped and counted', () => {
    expect(norm({ Consumo_Mixto_WLTP_Min: '6.4', Consumo_Mixto_WLTP_Max: '5.8' })).toMatchObject({ values: { gvwKg: 1900 }, issues: ['fuel_wltp_min_gt_max: 6.4 > 5.8'] });
    expect(norm({ Consumo_Mixto_WLTP_Min: '5.1', Consumo_Mixto_WLTP_Max: '160.82' }).values.fuelWltpMax).toBeUndefined();
  });

  it('columns whose label contradicts the values stay UNMAPPED (kept only as internal evidence)', () => {
    const r = norm({});
    expect(r.unmapped).toEqual({ consumoNedc: 6.1, emisionesNedc: 138, consumoMixtoWltp: 6.1, co2Min: 112, co2Max: 118 });
    expect(Object.keys(r.values)).not.toContain('co2');
    const unmapped = IDAE_MAPPING.filter((m) => m.status === 'UNMAPPED').map((m) => m.column).sort();
    expect(unmapped).toEqual(['Consumo_Mixto_WLTP', 'Consumo_NEDC', 'Emisiones_NEDC', 'Emisionies_CO2_Mixto_WLTP_Max', 'Emisionies_CO2_Mixto_WLTP_Min']);
  });

  it('every column has a mapping rule and every mapped SpecKey exists in the catalogue', () => {
    expect(IDAE_MAPPING.map((m) => m.column).sort()).toEqual([...H].sort());
    for (const m of IDAE_MAPPING.filter((x) => x.status === 'MAPPED')) expect(isSpecKey(m.specKey!), m.column).toBe(true);
  });

  it('dates: dd/mm/yyyy → ISO; impossible or future dates are issues (original kept, never corrected)', () => {
    expect(parseIdaeDate('29/02/2024', 2026)).toEqual({ iso: '2024-02-29' });
    expect(parseIdaeDate('30/02/2024', 2026).issue).toMatch(/impossible/);
    expect(parseIdaeDate('01/01/2054', 2026).issue).toMatch(/out-of-range/);
    expect(norm({ Fecha_actualizacion: '01/01/2029' }).issues).toContain('fecha_actualizacion_invalid: out-of-range date "01/01/2029"');
  });

  it('distributor makes and scopes: Canarias and commercial vehicles are separated', () => {
    expect(norm({ Marca: 'Volkswagen Turismos' })).toMatchObject({ make: 'Volkswagen', scope: 'MAINLAND' });
    expect(norm({ Marca: 'Toyota Canarias' })).toMatchObject({ make: 'Toyota', scope: 'CANARIAS' });
    expect(norm({ Marca: 'Volkswagen Vehículos Comerciales' }).scope).toBe('COMMERCIAL');
  });

  it('powertrain mapping never infers MHEV; unknown motorizaciones are issues', () => {
    expect(norm({ Motorizacion: 'Híbridos de gasolina' })).toMatchObject({ powertrain: 'HEV', fuel: 'petrol' });
    expect(norm({ Motorizacion: 'Híbridos enchufables' }).powertrain).toBe('PHEV');
    expect(norm({ Motorizacion: 'Gasolina', Vehiculo: '1.5 eTSI 110 kW MHEV' }).powertrain).toBe('ICE');
    expect(norm({ Motorizacion: 'Vapor' }).issues).toContain('unknown_motorizacion: "Vapor"');
  });

  it('hints: kW/CV and an official (Va/Ve) code candidate only when both parts mix letters and digits', () => {
    expect(extractHints('Design (SE2R1C/2NTE5F002NL1)').codeCandidate).toEqual({ variant: 'SE2R1C', version: '2NTE5F002NL1' });
    expect(extractHints('3008 AM D0/D1/E0').codeCandidate).toBeUndefined();
    expect(extractHints('1.6 HDI 110/112 CV').codeCandidate).toBeUndefined();
    expect(extractHints('1.4 T-JET 107 KW (145 CV) (MY21)')).toMatchObject({ kw: [107], cv: [145], modelYearTag: 'MY21' });
  });

  it('streaming read: profile of all rows, records for M1 only, traceable to the original line', async () => {
    const text = csvOf([{}, { Categoria: 'N1' }, { Vehiculo: 'multi\nline "x"' }]);
    const res = await readIdaeCsv({ path: 'x', fileSha256: 'c'.repeat(64), editionYear: 2026, source: chunks(text) });
    expect(res.totalRows).toBe(3);
    expect(res.records.map((r) => r.line)).toEqual([2, 4]);
    expect(res.records[0]!.sourceRecordId).toBe(`S02:${'c'.repeat(12)}:L2`);
    expect(res.filteredOut).toEqual({ 'category N1': 1 });
    expect(res.profile.find((p) => p.sourceField === 'MTMA')).toMatchObject({ type: 'integer', count: 3 });
  });
});

/* ───────── EEA: encuesta D1 (muestras reales, CC BY 4.0) ───────── */

describe('EEA survey (S01) — server-side aggregation, drift, deduplication', () => {
  const ds2016 = resolveEeaDataset(2016, 'FINAL_ONLY');
  const ds2024 = resolveEeaDataset(2024, 'FINAL_ONLY');

  it('survey query: whitelisted columns, Type and pre-2017 `E (g/km)`, contains-filter on Cn, status filter for mixed tables', () => {
    const q = buildEeaSurveyQuery({ memberState: 'ES', makes: ['CUPRA', 'SEAT'], commercialNameContains: ['FORMENTOR'] }, ds2016);
    expect(q).toContain("Mk IN ('CUPRA','SEAT')");
    expect(q).toContain("Cn LIKE '%FORMENTOR%'");
    expect(q).toContain("Status='F'");
    expect(q).toContain('[E (g/km)]');
    expect(q).toMatch(/GROUP BY MS, Year, Status, TAN, T, Va, Ve/);
    expect(q).toContain('SUM(CAST(R AS BIGINT)) AS R');
    expect(buildEeaSurveyQuery({ memberState: 'ES', makes: ['TESLA'], commercialNameContains: [] }, ds2024)).not.toContain('Cn LIKE');
  });

  it('rejects unsafe filters (SQL injection) and unbounded requests', () => {
    expect(() => buildEeaSurveyQuery({ memberState: 'ES', makes: ["X' OR 1=1 --"], commercialNameContains: [] }, ds2024)).toThrow(/unsafe/);
    expect(() => buildEeaSurveyQuery({ memberState: 'ES', makes: [], commercialNameContains: [] }, ds2024)).toThrow(/makes/);
    expect(() => buildEeaSurveyQuery({ memberState: 'E S', makes: ['BYD'], commercialNameContains: [] }, ds2024)).toThrow(/member state/);
    expect(() => buildEeaSurveyQuery({ memberState: 'ES', makes: ['BYD'], commercialNameContains: [] }, { ...ds2024, table: '[dbo].[users]' })).toThrow(/unsupported/);
  });

  it('inventory query only asks for Ech/RLFI from 2023 (they do not exist before)', () => {
    expect(buildEeaInventoryQuery('ES', ds2016)).not.toContain('Ech');
    expect(buildEeaInventoryQuery('ES', ds2024)).toContain('(Ech IS NULL');
  });

  it('inventory (real 2018 response): one row per registration, null and zero rates per column', () => {
    const f = fixture('d1-inventory-2018-es.json');
    const inv = parseEeaInventory('ES', { year: 2018 }, f.results[0]!);
    expect(inv.rows).toBe(inv.registrations); // 2018+: una fila por matriculación
    expect(inv.rows).toBeGreaterThan(1_000_000);
    const col = (c: string) => inv.columns.find((x) => x.sourceField === c)!;
    expect(col('Ech').present).toBe(false);
    expect(col('TAN').nullRate).toBeLessThan(0.05);
    expect(col('Ve').distinct).toBeGreaterThan(1000);
  });

  it('long queries switch to POST with the same parameters (discodata answers 404 to very long GET URLs)', async () => {
    const calls: Array<{ url: string; method?: string; body?: string }> = [];
    const fake: FetchLike = async (url, init) => {
      calls.push({ url, ...(init?.method ? { method: init.method } : {}), ...(init?.body ? { body: init.body } : {}) });
      return { ok: true, status: 200, json: async () => ({ results: [] }) };
    };
    const longQuery = `SELECT 1 /* ${'x'.repeat(EEA_MAX_GET_URL)} */`;
    const r = await fetchEea(longQuery, { fetchImpl: fake });
    expect(calls[0]!.method).toBe('POST');
    expect(new URLSearchParams(calls[0]!.body).get('query')).toBe(longQuery);
    expect(r.request_urls[0]).toContain('query=');
    await fetchEea('SELECT 1', { fetchImpl: fake });
    expect(calls[1]!.method).toBeUndefined();
  });

  it('2016 (aggregated rows, CO₂ only in `E (g/km)`): grouped by TAN/Va/Ve, NEDC CO₂ read from `E`', () => {
    const f = fixture('d1-survey-dacia-2016-es.json');
    const { groups, missingIdentifiers } = groupEeaSurveyRows(f.results);
    expect(groups.length).toBeGreaterThan(0);
    expect(missingIdentifiers).toBe(0);
    const g = groups[0]!;
    expect(g.year).toBe(2016);
    expect(g.distributions['Ewltp (g/km)']).toBeUndefined();
    expect(co2ByCycle(g).nedc?.field).toBe('E (g/km)');
    // Filas agregadas: una fila puede representar varias matriculaciones.
    expect(groups.reduce((s, x) => s + x.registrations, 0)).toBeGreaterThan(groups.reduce((s, x) => s + x.sourceRows, 0));
  });

  it('2025 provisional (real BYD rows): provisional status kept, WLTP CO₂ separate, no averaging', () => {
    const f = fixture('d1-survey-byd-2025p-es.json');
    const { groups } = groupEeaSurveyRows(f.results);
    expect(groups.every((g) => g.status === 'P')).toBe(true);
    const seal = groups.find((g) => g.variant === 'SE2R1C' && g.version === '2NTE5F002NL1');
    expect(seal).toBeDefined();
    expect(seal!.homologationPowertrain).toBe('BEV');
    for (const g of groups) for (const d of Object.values(g.distributions)) expect(d!.every(([, n]) => Number.isInteger(n))).toBe(true);
  });

  it('deduplication: many registrations → one technical group; F preferred over P; values kept as a distribution', () => {
    const row = (o: Record<string, unknown>) => ({ MS: 'ES', Year: 2019, Status: 'F', TAN: 'e1*2007/46*0001*02', T: 'AB', Va: 'v1', Ve: 'x1', Mk: 'TEST', Cn: 'M', Ft: 'petrol', Fm: 'M', 'Ec (cm3)': 1498, 'Ep (KW)': 110, 'Ewltp (g/km)': 130, R: 1, source_rows: 1, ...o });
    const { groups, missingIdentifiers, missingIdentifierRegistrations } = groupEeaSurveyRows([
      row({ R: 40, source_rows: 40 }),
      row({ 'Ewltp (g/km)': 134, R: 10, source_rows: 10, TAN: 'E1*2007/46*0001*02' }),
      row({ Status: 'P', R: 99, source_rows: 99 }),
      row({ TAN: null, R: 5 }),
    ]);
    expect(groups).toHaveLength(1);
    expect(groups[0]).toMatchObject({ registrations: 50, tan: 'E1*2007/46*0001*02', tanBase: 'E1*2007/46*0001', status: 'F', conflicts: [] });
    expect(groups[0]!.distributions['Ewltp (g/km)']).toEqual([[130, 40], [134, 10]]);
    expect({ missingIdentifiers, missingIdentifierRegistrations }).toEqual({ missingIdentifiers: 1, missingIdentifierRegistrations: 5 });
    expect(tanBaseOf('e9*2007/46*4008*19')).toBe('E9*2007/46*4008');
  });

  it('discrepancies inside one version are flagged for the conflict engine, never resolved', () => {
    const row = (o: Record<string, unknown>) => ({ MS: 'ES', Year: 2019, Status: 'F', TAN: 'E1*X*1*01', Va: 'V', Ve: 'X', Mk: 'TEST', Ft: 'petrol', Fm: 'M', 'Ep (KW)': 110, R: 1, ...o });
    const { groups } = groupEeaSurveyRows([row({}), row({ Fm: 'B', Ft: 'LPG', 'Ep (KW)': 81 })]);
    expect(groups[0]!.conflicts).toEqual(expect.arrayContaining(['fuel modes B/M', 'fuel types LPG/PETROL', 'Ep (KW) spread 81–110']));
    expect(groups[0]!.homologationPowertrain).toBe('UNKNOWN');
  });
});
