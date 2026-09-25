import { mkdtempSync, readFileSync, readdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, relative } from 'node:path';
import { describe, expect, it } from 'vitest';
import { EnergyPriceObservation } from '@vscar/vehicle-schema';
import {
  MITECO_REGIONS,
  MitecoRequestError,
  RetryableSourceError,
  aggregateMitecoPrices,
  fetchMiteco,
  mitecoHistoryUrl,
  mitecoImportKey,
  mitecoLatestAvailableDate,
  normalizeMitecoStations,
  parseMitecoPrice,
  percentile,
  readRawPayload,
  runMitecoImport,
  verifyRawIngest,
  type FetchLike,
} from '../src/index.ts';

const SOURCE_ID = '00000000-0000-4000-8000-00000000c003';
const PROVINCES = ['42', '26', '35', '51', '52'];
const fixturePath = (name: string) => new URL(`./fixtures/miteco/${name}.json`, import.meta.url);
const recordedMiteco = (name: string) => JSON.parse(readFileSync(fixturePath(name), 'utf8'));
const hist = (p: string) => recordedMiteco(`hist-2026-09-20-p${p}`) as { Fecha: string; ListaEESSPrecio: Record<string, string>[] };

/** fetch falso: sirve el fixture de la provincia pedida en la URL. */
const provinceFetch = (calls: string[] = []): FetchLike => async (url) => {
  calls.push(url);
  const p = /\/(\d{2})$/.exec(url)?.[1];
  return { ok: true, status: 200, json: async () => hist(p!) };
};
const allStations = () => PROVINCES.flatMap((p) => hist(p).ListaEESSPrecio);
const tmpRaw = () => mkdtempSync(join(tmpdir(), 'vscar-miteco-'));
const run = (rawDir: string, calls: string[] = []) =>
  runMitecoImport({ date: '2026-09-20', provinces: PROVINCES, sourceId: SOURCE_ID, rawDir, retrievedAt: '2026-09-24', fetchImpl: provinceFetch(calls) });

describe('MITECO adapter — parsing', () => {
  it('decimal comma prices; empty means "not sold" (null), never 0', () => {
    expect(parseMitecoPrice('1,529')).toBe(1.529);
    expect(parseMitecoPrice('')).toBeNull();
    expect(parseMitecoPrice(undefined)).toBeNull();
    expect(parseMitecoPrice('1.529')).toBeNaN();
  });

  it('region table matches the official MITECO list (ids are not INE CCAA codes)', () => {
    const official = recordedMiteco('ccaa') as { IDCCAA: string; CCAA: string }[];
    expect(Object.fromEntries(official.map((c) => [c.IDCCAA, c.CCAA]))).toEqual(Object.fromEntries(Object.entries(MITECO_REGIONS).map(([id, r]) => [id, r.name])));
    expect(MITECO_REGIONS['07']!.iso).toBe('ES-CM');
    expect(MITECO_REGIONS['08']!.iso).toBe('ES-CL');
  });

  it('restricted sales and implausible prices are excluded and counted, never corrected', () => {
    const base = hist('42').ListaEESSPrecio[0]!;
    const rows = [
      base,
      { ...base, IDEESS: 'R1', 'Tipo Venta': 'R', 'Precio Gasoleo A': '1,100' },
      { ...base, IDEESS: 'X1', 'Precio Gasoleo A': '19,990' },
      { ...base, IDEESS: 'X2', 'Precio Gasoleo A': 'n/d' },
      base,
    ];
    const snap = normalizeMitecoStations('20/09/2026 0:00:00', rows);
    const diesel = aggregateMitecoPrices(snap.prices, snap.excluded).find((a) => a.product === 'DIESEL_A' && a.scope_type === 'PROVINCE')!;
    expect(diesel).toMatchObject({ n: 1, median: 2.019, excluded_restricted: 1, excluded_implausible: 2 });
    expect(snap.issues.map((i) => i.kind).sort()).toEqual(['DUPLICATE_STATION', 'IMPLAUSIBLE_PRICE', 'UNPARSEABLE_PRICE']);
    expect(snap.observed_at).toBe('2026-09-20T00:00:00');
  });

  it('percentile uses linear interpolation (type 7)', () => {
    expect(percentile([1, 2, 3, 4], 0.5)).toBe(2.5);
    expect(percentile([1, 2, 3], 0.5)).toBe(2);
    expect(percentile([10, 20, 30, 40, 50], 0.25)).toBe(20);
  });
});

describe('MITECO adapter — aggregation', () => {
  const snap = normalizeMitecoStations(hist('42').Fecha, allStations());
  const aggs = aggregateMitecoPrices(snap.prices, snap.excluded);
  const find = (product: string, t: string, c: string) => aggs.find((a) => a.product === product && a.scope_type === t && a.scope_code === c);

  it('tax zones are never mixed: Canarias, Ceuta and Melilla are separate from Península+Baleares', () => {
    // Valores calculados independientemente (Python) sobre los mismos ficheros.
    expect(find('DIESEL_A', 'TAX_ZONE', 'PENINSULA_BALEARES')).toMatchObject({ n: 124, median: 1.974, p25: 1.829, p75: 2.009, min: 1.738, max: 2.069 });
    expect(find('DIESEL_A', 'TAX_ZONE', 'CANARIAS')).toMatchObject({ n: 255, median: 1.659 });
    expect(find('DIESEL_A', 'TAX_ZONE', 'CEUTA')).toMatchObject({ n: 10, median: 1.748 });
    expect(find('DIESEL_A', 'TAX_ZONE', 'MELILLA')).toMatchObject({ n: 12, median: 1.517 });
    expect(find('PETROL_95_E5', 'TAX_ZONE', 'PENINSULA_BALEARES')).toMatchObject({ n: 123, median: 1.975 });
    expect(aggs.some((a) => a.scope_code === 'ES')).toBe(false);
  });

  it('regions use ISO 3166-2 and provinces INE codes', () => {
    expect(find('PETROL_95_E5', 'REGION', 'ES-CL')).toMatchObject({ n: 42, median: 2.022 });
    expect(find('PETROL_95_E5', 'PROVINCE', '26')).toMatchObject({ n: 81, median: 1.969, p25: 1.868, p75: 1.995 });
    expect(find('LPG', 'PROVINCE', '35')).toMatchObject({ n: 19, median: 0.898 });
  });

  it('a product nobody sells produces no aggregate (not a zero)', () => {
    expect(aggs.filter((a) => a.product === 'PETROL_95_E10')).toEqual([]);
    expect(find('LPG', 'TAX_ZONE', 'CEUTA')).toBeUndefined();
  });
});

describe('MITECO adapter — pipeline', () => {
  it('province subset → only PROVINCE aggregates, validated against the schema, with provenance', async () => {
    const calls: string[] = [];
    const res = await run(tmpRaw(), calls);
    expect(calls).toHaveLength(5);
    expect(calls[0]).toBe('https://sedeaplicaciones.minetur.gob.es/ServiciosRESTCarburantes/PreciosCarburantes/EstacionesTerrestresHist/FiltroProvincia/20-09-2026/26');
    expect(res.invalid).toEqual([]);
    expect(new Set(res.observations.map((o) => o.scope_type))).toEqual(new Set(['PROVINCE']));
    const soria = res.observations.find((o) => o.energy_product === 'DIESEL_A' && o.scope_code === '42')!;
    expect(EnergyPriceObservation.parse(soria)).toMatchObject({
      value: 1.985,
      unit: 'EUR_PER_L',
      taxes: 'INCLUDED',
      price_date: '2026-09-20',
      observed_at: '2026-09-20T00:00:00',
      source_timezone: 'Europe/Madrid',
      aggregation_method: 'UNWEIGHTED_STATION_MEDIAN',
      source_authority: 'CALCULATED',
      derived_from_authority: 'OFFICIAL_AUTHORITY',
      provisional: true,
      external_field: 'Precio Gasoleo A',
      raw_ingest_id: res.raw.id,
      distribution: { n: 41, p25: 1.809, p75: 2.009, min: 1.739, max: 2.029, excluded_restricted: 0, excluded_implausible: 0 },
    });
    expect(res.stations_total).toBe(403);
  });

  it('national import (no filter) produces TAX_ZONE, REGION and PROVINCE aggregates', async () => {
    const national = { Fecha: hist('42').Fecha, ListaEESSPrecio: allStations(), Nota: 'n', ResultadoConsulta: 'OK' };
    const calls: string[] = [];
    const fetchImpl: FetchLike = async (url) => (calls.push(url), { ok: true, status: 200, json: async () => national });
    const res = await runMitecoImport({ date: '2026-09-20', sourceId: SOURCE_ID, rawDir: tmpRaw(), retrievedAt: '2026-09-24', fetchImpl });
    expect(calls).toEqual(['https://sedeaplicaciones.minetur.gob.es/ServiciosRESTCarburantes/PreciosCarburantes/EstacionesTerrestresHist/20-09-2026']);
    expect(new Set(res.observations.map((o) => o.scope_type))).toEqual(new Set(['TAX_ZONE', 'REGION', 'PROVINCE']));
  });

  it('raw is gzip, append-only, deduplicated, and hash-verifiable; observation ids are stable', async () => {
    const rawDir = tmpRaw();
    const a = await run(rawDir);
    const b = await run(rawDir);
    expect(a.raw.deduplicated).toBe(false);
    expect(b.raw.deduplicated).toBe(true);
    expect(b.observations.map((o) => o.id)).toEqual(a.observations.map((o) => o.id));
    expect(relative(rawDir, a.raw.file_path).split(/[\\/]/)).toEqual(['miteco', '2026', 'snapshot', `${a.raw.payload_hash}.json.gz`]);
    expect(readdirSync(join(rawDir, 'miteco', '2026', 'snapshot'))).toHaveLength(1);
    expect(await verifyRawIngest(a.raw)).toBe(true);
    const payload = JSON.parse(await readRawPayload(a.raw.file_path));
    expect(payload.response_meta.Fecha).toBe('20/09/2026 0:00:00');
    expect(payload.results).toHaveLength(403);
    expect(a.raw).toMatchObject({ source_code: 'S03', dataset_status: 'SNAPSHOT', dataset_year: 2026, row_count: 403, source_table: 'EstacionesTerrestresHist/20-09-2026' });
  });

  it('idempotency key depends on date, scope and transformation version only', () => {
    expect(mitecoImportKey('2026-09-20')).toMatch(/^miteco:2026-09-20:[0-9a-f]{16}:t1$/);
    expect(mitecoImportKey('2026-09-20', ['42', '26'])).toBe(mitecoImportKey('2026-09-20', ['26', '42', '42']));
    expect(mitecoImportKey('2026-09-20')).not.toBe(mitecoImportKey('2026-09-21'));
    expect(mitecoImportKey('2026-09-20')).not.toBe(mitecoImportKey('2026-09-20', ['42']));
  });
});

describe('MITECO adapter — request safety and errors', () => {
  it('URLs are built only from validated dates and province codes', () => {
    expect(() => mitecoHistoryUrl('2026-02-31')).toThrow(MitecoRequestError);
    expect(() => mitecoHistoryUrl('20-09-2026')).toThrow(MitecoRequestError);
    expect(() => mitecoHistoryUrl('2026-09-20', '42/../../x')).toThrow(MitecoRequestError);
    expect(() => mitecoHistoryUrl('2026-09-20', "42' OR 1=1")).toThrow(MitecoRequestError);
    expect(mitecoHistoryUrl('2026-09-20', '07')).toMatch(/\/FiltroProvincia\/20-09-2026\/07$/);
  });

  it('a date the source has not published yet is a non-retryable error', async () => {
    const body = { Fecha: null, ListaEESSPrecio: [], ResultadoConsulta: 'Parametros de entrada incorrectos: La fecha de consulta al histórico no puede ser posterior a 23/09/2026' };
    const fetchImpl: FetchLike = async () => ({ ok: true, status: 200, json: async () => body });
    await expect(fetchMiteco('u', { fetchImpl })).rejects.toBeInstanceOf(MitecoRequestError);
  });

  it('network errors, timeouts and HTTP 5xx/429 are retryable; 4xx is not', async () => {
    const status = (s: number): FetchLike => async () => ({ ok: false, status: s, json: async () => ({}) });
    await expect(fetchMiteco('u', { fetchImpl: status(503) })).rejects.toBeInstanceOf(RetryableSourceError);
    await expect(fetchMiteco('u', { fetchImpl: status(429) })).rejects.toBeInstanceOf(RetryableSourceError);
    await expect(fetchMiteco('u', { fetchImpl: status(404) })).rejects.toBeInstanceOf(MitecoRequestError);
    const hang: FetchLike = (_u, init) => new Promise((_r, reject) => init?.signal?.addEventListener('abort', () => reject(init.signal!.reason)));
    await expect(fetchMiteco('u', { fetchImpl: hang, timeoutMs: 20 })).rejects.toBeInstanceOf(RetryableSourceError);
  });

  it('a response for a different day than requested is rejected', async () => {
    const fetchImpl: FetchLike = async () => ({ ok: true, status: 200, json: async () => ({ ...hist('42'), Fecha: '19/09/2026 0:00:00', ResultadoConsulta: 'OK' }) });
    await expect(runMitecoImport({ date: '2026-09-20', provinces: ['42'], sourceId: SOURCE_ID, rawDir: tmpRaw(), retrievedAt: '2026-09-24', fetchImpl })).rejects.toThrow(/requested 2026-09-20/);
  });

  it('latest available day is yesterday in Europe/Madrid', () => {
    expect(mitecoLatestAvailableDate(new Date('2026-09-24T12:00:00Z'))).toBe('2026-09-23');
    // 23:30 UTC del 24 ya es día 25 en Madrid (CEST) → último publicado: 24.
    expect(mitecoLatestAvailableDate(new Date('2026-09-24T23:30:00Z'))).toBe('2026-09-24');
    expect(mitecoLatestAvailableDate(new Date('2026-03-01T10:00:00Z'))).toBe('2026-02-28');
  });
});

describe.skipIf(!process.env.VSCAR_MITECO_LIVE)('live MITECO (VSCAR_MITECO_LIVE=1)', () => {
  it('the real national history still has the confirmed shape', async () => {
    const date = mitecoLatestAvailableDate();
    const res = await runMitecoImport({ date, sourceId: SOURCE_ID, rawDir: tmpRaw(), retrievedAt: date, timeoutMs: 180_000 });
    expect(res.stations_total).toBeGreaterThan(10_000);
    expect(res.invalid).toEqual([]);
    const pb = res.observations.find((o) => o.energy_product === 'DIESEL_A' && o.scope_code === 'PENINSULA_BALEARES')!;
    expect(pb.distribution.n).toBeGreaterThan(9_000);
    expect(pb.value).toBeGreaterThan(0.8);
    expect(pb.value).toBeLessThan(3.5);
    expect(res.observations.filter((o) => o.scope_type === 'REGION')).not.toHaveLength(0);
  }, 240_000);
});
