import { mkdtempSync, readFileSync, readdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, relative } from 'node:path';
import { describe, expect, it } from 'vitest';
import { EnergyPriceObservation } from '@vscar/vehicle-schema';
import {
  EsiosNotAvailableError,
  EsiosRequestError,
  RetryableSourceError,
  esiosImportKey,
  esiosLatestPossibleDate,
  esiosPvpcUrl,
  fetchEsiosPvpc,
  hoursInLocalDay,
  localMidnightUtc,
  normalizePvpcDay,
  readRawPayload,
  runEsiosImport,
  verifyRawIngest,
  type FetchLike,
} from '../src/index.ts';

const SOURCE_ID = '00000000-0000-4000-8000-00000000c004';
const FAKE_TOKEN = 'tok_TEST-SECRET-9f8e7d6c5b4a';
const fixture = (name: string) => JSON.parse(readFileSync(new URL(`./fixtures/esios/${name}.json`, import.meta.url), 'utf8')) as { PVPC?: Record<string, string>[]; message?: string };
const rowsOf = (name: string) => fixture(name).PVPC!;

/** fetch falso: sirve el fixture del día pedido y registra URL y cabeceras. */
const dayFetch = (calls: { url: string; headers?: Record<string, string> }[] = []): FetchLike => async (url, init) => {
  calls.push({ url, ...(init?.headers ? { headers: init.headers } : {}) });
  const date = /date=(\d{4}-\d{2}-\d{2})/.exec(url)![1]!;
  const known = ['2026-09-24', '2026-03-29', '2025-10-26'].includes(date);
  return { ok: true, status: 200, json: async () => (known ? fixture(`pvpc-${date}`) : fixture('pvpc-not-available')) };
};
const tmpRaw = () => mkdtempSync(join(tmpdir(), 'vscar-esios-'));
const NOW = new Date('2026-09-25T09:00:00Z');
const run = (date: string, over: Partial<Parameters<typeof runEsiosImport>[0]> = {}) =>
  runEsiosImport({ date, sourceId: SOURCE_ID, rawDir: tmpRaw(), retrievedAt: '2026-09-25', fetchImpl: dayFetch(), now: NOW, ...over });

describe('Europe/Madrid local days', () => {
  it('normal day = 24 h; spring-forward = 23 h; fall-back = 25 h', () => {
    expect(hoursInLocalDay('2026-09-24')).toBe(24);
    expect(hoursInLocalDay('2026-03-29')).toBe(23);
    expect(hoursInLocalDay('2025-10-26')).toBe(25);
    expect(hoursInLocalDay('2026-10-25')).toBe(25);
  });

  it('local midnight is 22:00 UTC in summer and 23:00 UTC in winter', () => {
    expect(new Date(localMidnightUtc('2026-09-24')).toISOString()).toBe('2026-09-23T22:00:00.000Z');
    expect(new Date(localMidnightUtc('2026-01-15')).toISOString()).toBe('2026-01-14T23:00:00.000Z');
    expect(new Date(localMidnightUtc('2026-03-29')).toISOString()).toBe('2026-03-28T23:00:00.000Z');
  });
});

describe('ESIOS PVPC normalization (recorded responses)', () => {
  it('normal day: reproducible daily mean/min/max per tariff zone (values computed independently)', () => {
    const day = normalizePvpcDay('2026-09-24', rowsOf('pvpc-2026-09-24'));
    expect(day.issues).toEqual([]);
    expect(day.daily).toEqual([
      { zone: 'PENINSULA_CANARIAS_BALEARES', external_field: 'PCB', mean: 0.194264, min: 0.04916, max: 0.38922, n: 24 },
      { zone: 'CEUTA_MELILLA', external_field: 'CYM', mean: 0.194267, min: 0.05316, max: 0.38922, n: 24 },
    ]);
    // Reproducible: misma entrada → mismo resultado.
    expect(normalizePvpcDay('2026-09-24', rowsOf('pvpc-2026-09-24')).daily).toEqual(day.daily);
  });

  it('hours carry exact UTC instants and local time (summer, +02:00)', () => {
    const pcb = normalizePvpcDay('2026-09-24', rowsOf('pvpc-2026-09-24')).hours.filter((h) => h.zone === 'PENINSULA_CANARIAS_BALEARES');
    expect(pcb[0]).toMatchObject({ period_index: 0, source_label: '00-01', start_utc: '2026-09-23T22:00:00.000Z', start_local: '2026-09-24T00:00:00', utc_offset: '+02:00', eur_per_kwh: 0.18901 });
    expect(pcb[23]).toMatchObject({ start_utc: '2026-09-24T21:00:00.000Z', start_local: '2026-09-24T23:00:00' });
  });

  it('23-hour day (spring forward): 23 periods, 01:00 is followed by 03:00 local', () => {
    const day = normalizePvpcDay('2026-03-29', rowsOf('pvpc-2026-03-29'));
    const pcb = day.hours.filter((h) => h.zone === 'PENINSULA_CANARIAS_BALEARES');
    expect(day.expected_hours).toBe(23);
    expect(pcb.map((h) => h.start_local.slice(11, 13)).slice(0, 4)).toEqual(['00', '01', '03', '04']);
    expect(pcb[1]!.utc_offset).toBe('+01:00');
    expect(pcb[2]!.utc_offset).toBe('+02:00');
    expect(day.daily[0]).toMatchObject({ n: 23, mean: 0.09436, min: 0.08477, max: 0.11025 });
  });

  it('25-hour day (fall back): 25 periods, 02:00 local happens twice; source labels are not clock hours', () => {
    const day = normalizePvpcDay('2025-10-26', rowsOf('pvpc-2025-10-26'));
    const pcb = day.hours.filter((h) => h.zone === 'PENINSULA_CANARIAS_BALEARES');
    expect(pcb).toHaveLength(25);
    expect(pcb.slice(1, 4).map((h) => [h.start_local.slice(11, 16), h.utc_offset])).toEqual([
      ['01:00', '+02:00'],
      ['02:00', '+02:00'],
      ['02:00', '+01:00'],
    ]);
    expect(pcb[24]!.source_label).toBe('24-25');
    expect(new Set(pcb.map((h) => h.start_utc)).size).toBe(25);
    expect(day.daily[0]).toMatchObject({ n: 25, mean: 0.116975, min: 0.06554, max: 0.16217 });
  });

  it('wrong number of hours, wrong day or legacy 2.0A format are rejected, never averaged', () => {
    expect(() => normalizePvpcDay('2026-09-24', rowsOf('pvpc-2026-09-24').slice(0, 23))).toThrow(/23 hourly rows .* expected 24/);
    expect(() => normalizePvpcDay('2026-09-25', rowsOf('pvpc-2026-09-24'))).toThrow(/not for 25\/09\/2026/);
    expect(() => normalizePvpcDay('2021-05-31', rowsOf('pvpc-2021-05-31-legacy-2.0A'))).toThrow(/not in the 2.0TD format/);
  });

  it('an unparseable hour drops that zone for the day (reported), not a partial average', () => {
    const rows = rowsOf('pvpc-2026-09-24').map((r, i) => (i === 5 ? { ...r, CYM: 'n/d' } : r));
    const day = normalizePvpcDay('2026-09-24', rows);
    expect(day.daily.map((d) => d.zone)).toEqual(['PENINSULA_CANARIAS_BALEARES']);
    expect(day.issues).toHaveLength(1);
  });
});

describe('ESIOS adapter pipeline', () => {
  it('produces schema-valid reference observations (PVPC energy term, taxes excluded) with provenance', async () => {
    const res = await run('2026-09-24');
    expect(res.invalid).toEqual([]);
    const pcb = EnergyPriceObservation.parse(res.observations.find((o) => o.scope_code === 'PENINSULA_CANARIAS_BALEARES'));
    expect(pcb).toMatchObject({
      energy_product: 'ELECTRICITY',
      price_basis: 'PVPC_ENERGY_TERM',
      scope_type: 'TARIFF_ZONE',
      price_date: '2026-09-24',
      observed_at: '2026-09-24T00:00:00',
      statistic: 'MEAN',
      value: 0.194264,
      unit: 'EUR_PER_KWH',
      taxes: 'EXCLUDED',
      aggregation_method: 'HOURLY_ARITHMETIC_MEAN',
      distribution: { n: 24, min: 0.04916, max: 0.38922 },
      source_authority: 'CALCULATED',
      derived_from_authority: 'OFFICIAL_AUTHORITY',
      external_field: 'PCB',
      raw_ingest_id: res.raw.id,
      source_url: 'https://api.esios.ree.es/archives/70/download_json?locale=es&date=2026-09-24',
    });
    expect(res.hours).toHaveLength(48);
  });

  it('raw is append-only, deduplicated and hash-verifiable; observation ids are stable', async () => {
    const rawDir = tmpRaw();
    const a = await run('2026-09-24', { rawDir });
    const b = await run('2026-09-24', { rawDir, retrievedAt: '2026-09-26' });
    expect([a.raw.deduplicated, b.raw.deduplicated]).toEqual([false, true]);
    expect(b.raw.payload_hash).toBe(a.raw.payload_hash);
    expect(b.observations.map((o) => o.id)).toEqual(a.observations.map((o) => o.id));
    expect(relative(rawDir, a.raw.file_path).split(/[\\/]/)).toEqual(['esios', '2026', 'snapshot', `${a.raw.payload_hash}.json`]);
    expect(readdirSync(join(rawDir, 'esios', '2026', 'snapshot'))).toHaveLength(1);
    expect(await verifyRawIngest(a.raw)).toBe(true);
    expect(a.raw).toMatchObject({ source_code: 'S04', dataset_status: 'SNAPSHOT', row_count: 24, source_table: 'archives/70/2026-09-24' });
  });

  it('the token is sent only as a header: never in URL, raw file, raw metadata, logs or errors', async () => {
    const calls: { url: string; headers?: Record<string, string> }[] = [];
    const logs: string[] = [];
    const logger = (event: string, data: Record<string, unknown>) => logs.push(JSON.stringify({ event, ...data }));
    const rawDir = tmpRaw();
    const res = await run('2026-09-24', { rawDir, token: FAKE_TOKEN, fetchImpl: dayFetch(calls), logger });
    expect(calls[0]!.headers).toMatchObject({ 'x-api-key': FAKE_TOKEN });
    expect(calls[0]!.url).not.toContain(FAKE_TOKEN);
    expect(await readRawPayload(res.raw.file_path)).not.toContain(FAKE_TOKEN);
    expect(JSON.stringify(res)).not.toContain(FAKE_TOKEN);
    expect(logs.join('\n')).not.toContain(FAKE_TOKEN);

    // Un error de red que (por lo que sea) contiene el token no lo filtra.
    const leaky: FetchLike = async () => {
      throw new Error(`connect ECONNRESET while sending x-api-key=${FAKE_TOKEN}`);
    };
    const err = await fetchEsiosPvpc(esiosPvpcUrl('2026-09-24'), { fetchImpl: leaky, token: FAKE_TOKEN, logger }).catch((e: Error) => e);
    expect(err).toBeInstanceOf(RetryableSourceError);
    expect((err as Error).message).not.toContain(FAKE_TOKEN);
    expect(logs.join('\n')).not.toContain(FAKE_TOKEN);
  });

  it('a day not published yet → NOT_AVAILABLE_YET (non-retryable), before or after asking the source', async () => {
    const tomorrow = await run('2026-09-26').catch((e: Error) => e);
    expect(tomorrow).toBeInstanceOf(EsiosNotAvailableError);
    expect((tomorrow as EsiosNotAvailableError).code).toBe('NOT_AVAILABLE_YET');
    expect((tomorrow as EsiosNotAvailableError).retryable).toBe(false);
    const calls: { url: string }[] = [];
    const farFuture = await run('2026-10-10', { fetchImpl: dayFetch(calls) }).catch((e: Error) => e);
    expect(farFuture).toBeInstanceOf(EsiosNotAvailableError);
    expect(calls).toEqual([]);
    expect(esiosLatestPossibleDate(NOW)).toBe('2026-09-26');
    expect(esiosLatestPossibleDate(new Date('2026-09-25T22:30:00Z'))).toBe('2026-09-27');
  });

  it('dates before 2.0TD, invalid dates and HTTP errors are classified', async () => {
    await expect(run('2021-05-31')).rejects.toBeInstanceOf(EsiosRequestError);
    expect(() => esiosPvpcUrl('2026-02-30')).toThrow(EsiosRequestError);
    expect(() => esiosPvpcUrl("2026-09-24&x=1")).toThrow(EsiosRequestError);
    const status = (s: number): FetchLike => async () => ({ ok: false, status: s, json: async () => ({}) });
    await expect(fetchEsiosPvpc('u', { fetchImpl: status(503) })).rejects.toBeInstanceOf(RetryableSourceError);
    await expect(fetchEsiosPvpc('u', { fetchImpl: status(403) })).rejects.toBeInstanceOf(EsiosRequestError);
    const hang: FetchLike = (_u, init) => new Promise((_r, reject) => init?.signal?.addEventListener('abort', () => reject(init.signal!.reason)));
    await expect(fetchEsiosPvpc('u', { fetchImpl: hang, timeoutMs: 20 })).rejects.toBeInstanceOf(RetryableSourceError);
  });

  it('idempotency key is one per local day and transformation version', () => {
    expect(esiosImportKey('2026-09-24')).toBe('esios:2026-09-24:pvpc:t1');
    expect(() => esiosImportKey('24-09-2026')).toThrow(EsiosRequestError);
  });
});

describe.skipIf(!process.env.VSCAR_ESIOS_LIVE)('live ESIOS (VSCAR_ESIOS_LIVE=1; ESIOS_TOKEN optional)', () => {
  it('today’s real PVPC file normalizes into valid observations', async () => {
    const token = process.env.ESIOS_TOKEN || undefined;
    const logs: string[] = [];
    const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Madrid' }).format(new Date());
    const res = await runEsiosImport({ date: today, sourceId: SOURCE_ID, rawDir: tmpRaw(), retrievedAt: today, ...(token ? { token } : {}), timeoutMs: 60_000, logger: (e, d) => logs.push(JSON.stringify({ e, ...d })) });
    expect(res.invalid).toEqual([]);
    expect(res.observations.map((o) => o.scope_code).sort()).toEqual(['CEUTA_MELILLA', 'PENINSULA_CANARIAS_BALEARES']);
    for (const o of res.observations) {
      EnergyPriceObservation.parse(o);
      expect(o.distribution.n).toBe(hoursInLocalDay(today));
      expect(o.value).toBeGreaterThan(0.01);
      expect(o.value).toBeLessThan(1);
    }
    if (token) expect(logs.join('\n') + JSON.stringify(res)).not.toContain(token);
  }, 120_000);
});
