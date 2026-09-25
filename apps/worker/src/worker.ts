import { setTimeout as sleep } from 'node:timers/promises';
import type { JobQueue, JobRow } from '@vscar/db';
import { errorMessage, isRetryable, NonRetryableError } from './errors.ts';
import type { Handler, HandlerContext } from './handlers.ts';
import { scrubSecrets, type Logger } from './logger.ts';

export const WORKER_VERSION = '0.1.0';

export interface WorkerOptions {
  queue: JobQueue;
  handlers: Readonly<Record<string, Handler>>;
  context: Omit<HandlerContext, 'heartbeat'>;
  logger: Logger;
  workerId: string;
  pollMs: number;
  staleLockMinutes: number;
  heartbeatMs: number;
  /** Secretos (tokens, contraseñas) que nunca se guardan en `jobs.last_error` ni en logs. */
  secrets?: readonly string[];
}

export interface WorkerState {
  started_at: number;
  last_job_at: string | null;
  processed: number;
  running_job: string | null;
}

export type TickResult = { job: JobRow; outcome: 'SUCCESS' | 'FAILED' | 'DEAD' } | undefined;

/**
 * Bucle del worker: recupera locks caducados, reclama un job (lock atómico), lo ejecuta con latido
 * periódico y registra SUCCESS / FAILED (reintento con backoff) / DEAD.
 */
export function createWorker(opts: WorkerOptions) {
  const state: WorkerState = { started_at: Date.now(), last_job_at: null, processed: 0, running_job: null };
  let stopping = false;
  const types = Object.keys(opts.handlers);

  async function tick(): Promise<TickResult> {
    const recovered = await opts.queue.recoverStale(opts.staleLockMinutes);
    if (recovered > 0) opts.logger.log('worker', 'stale.recovered', { count: recovered });

    const job = await opts.queue.claimNext(opts.workerId, types);
    if (!job) return undefined;

    state.running_job = job.id;
    const started = Date.now();
    opts.logger.log('worker', 'job.start', { job_id: job.id, type: job.type, attempt: job.attempts, started_at: new Date(started).toISOString() });
    const beat = setInterval(() => void opts.queue.heartbeat(job), opts.heartbeatMs);
    try {
      const handler = opts.handlers[job.type];
      if (!handler) throw new NonRetryableError(`unknown job type ${job.type}`);
      const result = await handler(job.payload, { ...opts.context, heartbeat: async () => void (await opts.queue.heartbeat(job)) });
      const ok = await opts.queue.complete(job, result);
      opts.logger.log('worker', 'job.finish', { job_id: job.id, type: job.type, attempt: job.attempts, duration_ms: Date.now() - started, result: ok ? 'SUCCESS' : 'LOST_LOCK' });
      return { job, outcome: 'SUCCESS' };
    } catch (e) {
      const retryable = isRetryable(e);
      const message = scrubSecrets(errorMessage(e), opts.secrets);
      const outcome = await opts.queue.fail(job, message, retryable);
      opts.logger.log('worker', 'job.error', {
        job_id: job.id,
        type: job.type,
        attempt: job.attempts,
        duration_ms: Date.now() - started,
        result: outcome,
        retryable,
        error: message,
      });
      return { job, outcome: outcome === 'DEAD' ? 'DEAD' : 'FAILED' };
    } finally {
      clearInterval(beat);
      state.running_job = null;
      state.processed++;
      state.last_job_at = new Date().toISOString();
    }
  }

  return {
    state,
    tick,
    /** Procesa hasta vaciar la cola lista (útil en tests y en ejecuciones puntuales). */
    async drain(max = 1_000): Promise<NonNullable<TickResult>[]> {
      const out: NonNullable<TickResult>[] = [];
      for (let i = 0; i < max; i++) {
        const r = await tick();
        if (!r) break;
        out.push(r);
      }
      return out;
    },
    async run(): Promise<void> {
      opts.logger.log('worker', 'worker.start', { worker_id: opts.workerId, version: WORKER_VERSION, poll_ms: opts.pollMs });
      while (!stopping) {
        try {
          const r = await tick();
          if (!r) await sleep(opts.pollMs);
        } catch (e) {
          opts.logger.log('worker', 'worker.loop_error', { error: scrubSecrets(errorMessage(e), opts.secrets) });
          await sleep(opts.pollMs);
        }
      }
      opts.logger.log('worker', 'worker.stop', { worker_id: opts.workerId, processed: state.processed });
    },
    /** Parada ordenada: termina el job en curso y sale del bucle. */
    stop() {
      stopping = true;
    },
  };
}

export type Worker = ReturnType<typeof createWorker>;
