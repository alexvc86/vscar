import { mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import type { FetchLike } from '@vscar/data-connectors';
import { createCatalogRepository, createDb, createJobQueue, type DbHandle, type JobQueue } from '@vscar/db';
import { freshTestDb } from '@vscar/db/testing';
import { GOLF_2018_IDS, MODEL3_2021_IDS, SOURCES, loadCase } from '@vscar/fixtures';
import {
  HANDLERS,
  NonRetryableError,
  createMemoryLogger,
  createWorker,
  eeaImportIdempotencyKey,
  esiosImportIdempotencyKey,
  mitecoImportIdempotencyKey,
  loadConfig,
  redact,
  startHealthServer,
  type EeaImportPayload,
  type Handler,
} from '../src/index.ts';

const url = process.env.VSCAR_TEST_DATABASE_URL;
const sample = (name: string): unknown =>
  JSON.parse(readFileSync(fileURLToPath(new URL(`../../../packages/data-connectors/test/fixtures/eea/${name}.json`, import.meta.url)), 'utf8'));
const fake = (body: unknown): FetchLike => async () => ({ ok: true, status: 200, json: async () => body });

describe('config and log redaction (no DB)', () => {
  it('parses env with sane defaults', () => {
    const c = loadConfig({ DATABASE_URL: 'mysql://vscar_app:secret@127.0.0.1:3306/vscar_db', VSCAR_DATA_DIR: 'C:\\vscar\\data' });
    expect(c).toMatchObject({ pollMs: 10_000, staleLockMinutes: 30, health: { host: '127.0.0.1', port: 8180 } });
    expect(c.rawDir.replace(/\\/g, '/')).toBe('C:/vscar/data/raw');
    expect(() => loadConfig({ DATABASE_URL: 'postgres://x', VSCAR_DATA_DIR: 'x' })).toThrow();
  });

  it('ESIOS token: optional, trimmed, and registered as a secret together with the DB password', () => {
    const base = { DATABASE_URL: 'mysql://vscar_app:p%40ss-word1@127.0.0.1:3306/vscar_db', VSCAR_DATA_DIR: 'C:\\vscar\\data' };
    expect(loadConfig(base).esios.token).toBeUndefined();
    expect(loadConfig({ ...base, ESIOS_TOKEN: '' }).esios.token).toBeUndefined();
    const c = loadConfig({ ...base, ESIOS_TOKEN: '  abc123-token  ' });
    expect(c.esios.token).toBe('abc123-token');
    expect(c.secrets.sort()).toEqual(['abc123-token', 'p@ss-word1']);
  });

  it('never logs secrets', () => {
    expect(redact({ DATABASE_URL: 'mysql://u:p@h/db', note: 'mysql://vscar_app:hunter2@127.0.0.1/vscar_db', password: 'x' })).toEqual({
      DATABASE_URL: '[REDACTED]',
      note: 'mysql://vscar_app:[REDACTED]@127.0.0.1/vscar_db',
      password: '[REDACTED]',
    });
  });
});

describe.skipIf(!url)('jobs queue + VScarWorker on MySQL', () => {
  let handle: DbHandle;
  let queue: JobQueue;
  const rawDir = mkdtempSync(join(tmpdir(), 'vscar-worker-raw-'));
  const logger = createMemoryLogger();

  const makeWorker = (handlers: Record<string, Handler>, workerId = 'w-test', q: JobQueue = queue, h: DbHandle = handle) =>
    createWorker({
      queue: q,
      handlers,
      context: { db: h.db, logger, rawDir, eea: { baseUrl: 'https://discodata.eea.europa.eu/sql', timeoutMs: 5_000 }, fetchImpl: fake(sample('golf-2018-es')) },
      logger,
      workerId,
      pollMs: 250,
      staleLockMinutes: 30,
      heartbeatMs: 60_000,
    });

  beforeAll(async () => {
    handle = await freshTestDb(url!);
    queue = createJobQueue(handle.db);
    const repo = createCatalogRepository(handle.db);
    await repo.saveBundle(loadCase('golf2018TwoHomologations'));
    await repo.saveBundle(loadCase('teslaModel3IntraYear'));
    await repo.saveBundle({ sources: [SOURCES.miteco, SOURCES.esios], homologations: [], variants: [], spec_values: [] });
  });

  beforeEach(async () => {
    await handle.pool.query('DELETE FROM jobs');
  });

  afterAll(async () => {
    await handle?.close();
  });

  it('enqueue is idempotent by key (also under concurrent enqueue)', async () => {
    const results = await Promise.all(Array.from({ length: 5 }, () => queue.enqueue('QUALITY_CHECK', { variant_ids: [GOLF_2018_IDS.rvA] }, { idempotencyKey: 'k:same' })));
    expect(new Set(results.map((r) => r.job.id)).size).toBe(1);
    expect(results.filter((r) => r.created)).toHaveLength(1);
  });

  it('atomic lock: five concurrent workers, one job → exactly one claim', async () => {
    await queue.enqueue('QUALITY_CHECK', { variant_ids: [GOLF_2018_IDS.rvA] });
    const handles = Array.from({ length: 5 }, () => createDb(url!));
    try {
      const claims = await Promise.all(handles.map((h, i) => createJobQueue(h.db).claimNext(`w${i}`)));
      expect(claims.filter(Boolean)).toHaveLength(1);
    } finally {
      await Promise.all(handles.map((h) => h.close()));
    }
  });

  it('atomic lock: four workers draining twenty jobs never run a job twice', async () => {
    for (let i = 0; i < 20; i++) await queue.enqueue('NOOP', { i });
    const seen: string[] = [];
    const noop: Handler = async (payload) => {
      seen.push(JSON.stringify(payload));
      return { ok: true };
    };
    const handles = Array.from({ length: 4 }, () => createDb(url!));
    try {
      await Promise.all(handles.map((h, i) => makeWorker({ NOOP: noop }, `w${i}`, createJobQueue(h.db), h).drain()));
    } finally {
      await Promise.all(handles.map((h) => h.close()));
    }
    expect(seen).toHaveLength(20);
    expect(new Set(seen).size).toBe(20);
    expect((await queue.stats()).by_status).toEqual({ SUCCESS: 20 });
  });

  it('retries with backoff, then DEAD when attempts are exhausted', async () => {
    const { job } = await queue.enqueue('FLAKY', {}, { maxAttempts: 2 });
    const flaky: Handler = async () => {
      throw new Error('temporary outage');
    };
    const w = makeWorker({ FLAKY: flaky });

    expect((await w.tick())?.outcome).toBe('FAILED');
    const afterFirst = (await queue.get(job.id))!;
    expect(afterFirst).toMatchObject({ status: 'FAILED', attempts: 1, last_error: 'Error: temporary outage' });
    const [delayRows] = await handle.pool.query('SELECT TIMESTAMPDIFF(SECOND, NOW(3), run_at) AS s FROM jobs WHERE id = ?', [job.id]);
    const delay = (delayRows as { s: number }[])[0]!;
    expect(delay.s).toBeGreaterThanOrEqual(55); // backoff 1 min
    expect(await w.tick()).toBeUndefined(); // aún no toca

    await handle.pool.query('UPDATE jobs SET run_at = NOW(3) - INTERVAL 1 SECOND WHERE id = ?', [job.id]);
    expect((await w.tick())?.outcome).toBe('DEAD');
    expect((await queue.get(job.id))!).toMatchObject({ status: 'DEAD', attempts: 2 });
  });

  it('non-retryable errors (schema validation) go straight to DEAD', async () => {
    const { job } = await queue.enqueue('EEA_IMPORT', { year: 'not-a-year' });
    expect((await makeWorker(HANDLERS).tick())?.outcome).toBe('DEAD');
    const dead = (await queue.get(job.id))!;
    expect(dead).toMatchObject({ status: 'DEAD', attempts: 1 });
    expect(dead.last_error).toMatch(/^validation error/);
    const { job: job2 } = await queue.enqueue('QUALITY_CHECK', {}, {});
    const bad: Handler = async () => {
      throw new NonRetryableError('bad data');
    };
    await makeWorker({ QUALITY_CHECK: bad }).tick();
    expect((await queue.get(job2.id))!.status).toBe('DEAD');
  });

  it('stale locks are recovered; a live heartbeat is not; a recovered job cannot complete twice', async () => {
    const { job } = await queue.enqueue('SLOW', {});
    const claimed = (await queue.claimNext('crashed-worker'))!;
    expect(claimed.id).toBe(job.id);

    expect(await queue.recoverStale(30)).toBe(0); // latido reciente
    await handle.pool.query('UPDATE jobs SET locked_at = NOW(3) - INTERVAL 2 HOUR, heartbeat_at = NOW(3) - INTERVAL 2 HOUR WHERE id = ?', [job.id]);
    expect(await queue.recoverStale(30)).toBe(1);
    const recovered = (await queue.get(job.id))!;
    expect(recovered).toMatchObject({ status: 'FAILED', attempts: 1, locked_by: null });
    expect(recovered.last_error).toContain('crashed-worker');

    // El worker original "revive" y trata de completar: pierde el lock.
    expect(await queue.complete(claimed, { late: true })).toBe(false);
    expect((await queue.get(job.id))!.status).toBe('FAILED');
  });

  it('EEA_IMPORT: worker → adapter → raw_ingest → DRAFT values; idempotent key; re-run is append-only', async () => {
    const payload: EeaImportPayload = {
      year: 2018,
      status_preference: 'FINAL_OR_PROVISIONAL',
      filters: { memberState: 'ES', make: 'VOLKSWAGEN', commercialNamePrefix: 'GOLF', engineCapacityCm3: 1498, enginePowerKw: 96 },
      variant_ids: [GOLF_2018_IDS.rvA, GOLF_2018_IDS.rvB],
    };
    const key = eeaImportIdempotencyKey(payload);
    expect(key).toMatch(/^eea:2018:FINAL:[0-9a-f]{32}:t[0-9a-f]{8}$/);

    const first = await queue.enqueue('EEA_IMPORT', payload, { idempotencyKey: key });
    expect((await queue.enqueue('EEA_IMPORT', payload, { idempotencyKey: key })).created).toBe(false);

    const w = makeWorker(HANDLERS);
    expect((await w.tick())?.outcome).toBe('SUCCESS');
    const done = (await queue.get(first.job.id))!;
    const result = done.result as { inserted_values: number; raw_deduplicated: boolean; targets: { match: string }[]; conflicts: { review_required: boolean }[] };
    expect(result.targets.map((t) => t.match)).toEqual(['TAN_VA_VE', 'TAN_VA_VE']);
    expect(result.inserted_values).toBeGreaterThan(0);
    expect(result.conflicts.every((c) => !c.review_required)).toBe(true);
    expect(logger.lines.some((l) => l.channel === 'eea' && l.event === 'eea.import.done')).toBe(true);
    expect(logger.lines.some((l) => l.channel === 'worker' && l.event === 'job.finish' && l.data.job_id === first.job.id)).toBe(true);

    // Re-ejecución explícita del mismo import lógico: nada nuevo en MySQL ni en disco.
    const rerun = await queue.enqueue('EEA_IMPORT', payload, { idempotencyKey: key, rerunFinished: true });
    expect(rerun.job.id).toBe(first.job.id);
    expect((await w.tick())?.outcome).toBe('SUCCESS');
    const again = (await queue.get(first.job.id))!.result as { inserted_values: number; raw_deduplicated: boolean };
    expect(again).toMatchObject({ inserted_values: 0, raw_deduplicated: true });
  });

  it('QUALITY_CHECK and CONFLICT_SCAN report without auto-correcting (Tesla E6R: 440 vs 448 → REVIEW_REQUIRED)', async () => {
    // Importa el dato EEA de E6R (TAN *13 / PB1S5N) sobre una variant de test explícita.
    const repo = createCatalogRepository(handle.db);
    const bundle = await repo.loadBundle([MODEL3_2021_IDS.srp]);
    await handle.pool.query("UPDATE homologations SET type_approval_number = 'e4*2007/46*1293*13', version_code = 'PB1S5N' WHERE id = ?", [bundle.homologations[0]!.id]);
    const eea = makeWorker(HANDLERS);
    const payload = { year: 2021, filters: { memberState: 'ES', make: 'TESLA', enginePowerKw: 239 }, variant_ids: [MODEL3_2021_IDS.srp] };
    await queue.enqueue('EEA_IMPORT', payload);
    const w = createWorker({
      queue,
      handlers: HANDLERS,
      context: { db: handle.db, logger, rawDir, eea: { baseUrl: 'https://discodata.eea.europa.eu/sql', timeoutMs: 5_000 }, fetchImpl: fake(sample('model3-2021-es')) },
      logger,
      workerId: 'w-tesla',
      pollMs: 250,
      staleLockMinutes: 30,
      heartbeatMs: 60_000,
    });
    expect((await w.tick())?.outcome).toBe('SUCCESS');

    const scan = await queue.enqueue('CONFLICT_SCAN', { variant_ids: [MODEL3_2021_IDS.srp, GOLF_2018_IDS.rvA] });
    const quality = await queue.enqueue('QUALITY_CHECK', { variant_ids: [MODEL3_2021_IDS.srp] });
    await eea.drain();
    const scanResult = (await queue.get(scan.job.id))!.result as { result: string; variants: { variant_id: string; result: string; conflicts: { spec_key: string }[] }[] };
    expect(scanResult.result).toBe('REVIEW_REQUIRED');
    const tesla = scanResult.variants.find((v) => v.variant_id === MODEL3_2021_IDS.srp)!;
    expect(tesla.conflicts.map((c) => c.spec_key)).toContain('rng.electric_combined_km');
    expect(scanResult.variants.find((v) => v.variant_id === GOLF_2018_IDS.rvA)!.result).toBe('NO_CONFLICT');
    const q = (await queue.get(quality.job.id))!.result as { variants: { plausibility: string; eligibility: Record<string, string> }[] };
    expect(q.variants[0]!.eligibility.Range).not.toBe('NOT_AVAILABLE');
  });

  it('MITECO_IMPORT: worker → adapter → raw (.json.gz) → energy_prices; idempotent; unpublished date → DEAD', async () => {
    const hist = (p: string): unknown =>
      JSON.parse(readFileSync(fileURLToPath(new URL(`../../../packages/data-connectors/test/fixtures/miteco/hist-2026-09-20-p${p}.json`, import.meta.url)), 'utf8'));
    const provinceFetch: FetchLike = async (u) => ({ ok: true, status: 200, json: async () => hist(/\/(\d{2})$/.exec(u)![1]!) });
    const w = createWorker({
      queue,
      handlers: HANDLERS,
      context: { db: handle.db, logger, rawDir, eea: { baseUrl: 'https://discodata.eea.europa.eu/sql', timeoutMs: 5_000 }, fetchImpl: provinceFetch, now: () => new Date('2026-09-24T06:00:00Z') },
      logger,
      workerId: 'w-miteco',
      pollMs: 250,
      staleLockMinutes: 30,
      heartbeatMs: 60_000,
    });
    const payload = { date: '2026-09-20', provinces: ['42', '35'] };
    const key = mitecoImportIdempotencyKey(payload);
    expect(key).toMatch(/^miteco:2026-09-20:[0-9a-f]{16}:t1$/);
    const first = await queue.enqueue('MITECO_IMPORT', payload, { idempotencyKey: key });
    expect((await w.tick())?.outcome).toBe('SUCCESS');
    const result = (await queue.get(first.job.id))!.result as { inserted_prices: number; observations: number; stations_total: number; raw_deduplicated: boolean };
    expect(result).toMatchObject({ stations_total: 298, raw_deduplicated: false });
    expect(result.inserted_prices).toBe(result.observations);
    expect(logger.lines.some((l) => l.channel === 'miteco' && l.event === 'miteco.import.done')).toBe(true);
    const [rows] = (await handle.pool.query("SELECT COUNT(*) AS n FROM energy_prices WHERE scope_type = 'PROVINCE' AND scope_code = '42'")) as unknown as [{ n: number }[]];
    expect(Number(rows[0]!.n)).toBeGreaterThan(0);

    await queue.enqueue('MITECO_IMPORT', payload, { idempotencyKey: key, rerunFinished: true });
    expect((await w.tick())?.outcome).toBe('SUCCESS');
    expect((await queue.get(first.job.id))!.result).toMatchObject({ inserted_prices: 0, raw_deduplicated: true });

    // Fecha aún no publicada (hoy): no se reintenta, se revisa.
    const future = await queue.enqueue('MITECO_IMPORT', { date: '2026-09-24', provinces: [] });
    await w.tick();
    const dead = (await queue.get(future.job.id))!;
    expect(dead.status).toBe('DEAD');
    expect(dead.last_error).toMatch(/not published yet \(latest: 2026-09-23\)/);
  });

  it('ESIOS_IMPORT: PVPC → energy_prices; idempotent; NOT_AVAILABLE_YET → DEAD; token never in logs or last_error', async () => {
    const TOKEN = 'esios-SECRET-token-0123456789';
    const pvpc = JSON.parse(readFileSync(fileURLToPath(new URL('../../../packages/data-connectors/test/fixtures/esios/pvpc-2026-09-24.json', import.meta.url)), 'utf8'));
    const notAvailable = JSON.parse(readFileSync(fileURLToPath(new URL('../../../packages/data-connectors/test/fixtures/esios/pvpc-not-available.json', import.meta.url)), 'utf8'));
    const seen: Record<string, string>[] = [];
    const esiosFetch: FetchLike = async (u, init) => {
      seen.push(init?.headers ?? {});
      if (u.includes('date=2026-09-24')) return { ok: true, status: 200, json: async () => pvpc };
      if (u.includes('date=2026-09-26')) return { ok: true, status: 200, json: async () => notAvailable };
      throw new Error(`socket hang up (x-api-key: ${TOKEN})`);
    };
    const secretLogger = createMemoryLogger({ secrets: [TOKEN] });
    const w = createWorker({
      queue,
      handlers: HANDLERS,
      context: {
        db: handle.db,
        logger: secretLogger,
        rawDir,
        eea: { baseUrl: 'https://discodata.eea.europa.eu/sql', timeoutMs: 5_000 },
        esios: { baseUrl: 'https://api.esios.ree.es', timeoutMs: 5_000, token: TOKEN },
        fetchImpl: esiosFetch,
        now: () => new Date('2026-09-25T09:00:00Z'),
      },
      logger: secretLogger,
      workerId: 'w-esios',
      pollMs: 250,
      staleLockMinutes: 30,
      heartbeatMs: 60_000,
      secrets: [TOKEN],
    });

    const payload = { date: '2026-09-24' };
    expect(esiosImportIdempotencyKey(payload)).toBe('esios:2026-09-24:pvpc:t1');
    const first = await queue.enqueue('ESIOS_IMPORT', payload, { idempotencyKey: esiosImportIdempotencyKey(payload) });
    expect((await w.tick())?.outcome).toBe('SUCCESS');
    const result = (await queue.get(first.job.id))!.result as { inserted_prices: number; hours: number; daily: { zone: string; mean_eur_per_kwh: number }[] };
    expect(result).toMatchObject({ inserted_prices: 2, hours: 24 });
    expect(result.daily.find((d) => d.zone === 'PENINSULA_CANARIAS_BALEARES')!.mean_eur_per_kwh).toBe(0.194264);
    expect(seen[0]!['x-api-key']).toBe(TOKEN);

    await queue.enqueue('ESIOS_IMPORT', payload, { idempotencyKey: esiosImportIdempotencyKey(payload), rerunFinished: true });
    expect((await w.tick())?.outcome).toBe('SUCCESS');
    expect((await queue.get(first.job.id))!.result).toMatchObject({ inserted_prices: 0, raw_deduplicated: true });

    // Mañana aún no publicado: DEAD con motivo explícito, sin reintentos.
    const tomorrow = await queue.enqueue('ESIOS_IMPORT', { date: '2026-09-26' });
    expect((await w.tick())?.outcome).toBe('DEAD');
    const dead = (await queue.get(tomorrow.job.id))!;
    expect(dead.attempts).toBe(1);
    expect(dead.last_error).toMatch(/NOT_AVAILABLE_YET/);

    // Un error de red que arrastra el token: reintentable, pero el token no llega ni a MySQL ni a los logs.
    const leak = await queue.enqueue('ESIOS_IMPORT', { date: '2026-09-23' });
    expect((await w.tick())?.outcome).toBe('FAILED');
    const failed = (await queue.get(leak.job.id))!;
    expect(failed.last_error).toContain('[REDACTED]');
    expect(failed.last_error).not.toContain(TOKEN);
    expect(JSON.stringify(secretLogger.lines)).not.toContain(TOKEN);
    const [rows] = (await handle.pool.query('SELECT last_error, result, payload FROM jobs')) as unknown as [unknown[]];
    expect(JSON.stringify(rows)).not.toContain(TOKEN);
  });

  it('health endpoint exposes status, uptime, last job, queue depth and version only', async () => {
    const w = makeWorker({});
    const server = await startHealthServer({ host: '127.0.0.1', port: 0, state: w.state, queue, workerId: 'w-health' });
    try {
      const addr = server.address() as { port: number };
      const res = await fetch(`http://127.0.0.1:${addr.port}/health`);
      const body = (await res.json()) as Record<string, unknown>;
      expect(res.status).toBe(200);
      expect(body).toMatchObject({ status: 'ok', worker_version: '0.1.0', worker_id: 'w-health' });
      expect(Object.keys(body).sort()).toEqual(['jobs_by_status', 'last_job_at', 'queue_depth', 'running_job', 'status', 'uptime_s', 'worker_id', 'worker_version']);
      expect((await fetch(`http://127.0.0.1:${addr.port}/secrets`)).status).toBe(404);
    } finally {
      server.close();
    }
  });
});
