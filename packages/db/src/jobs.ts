import { randomUUID } from 'node:crypto';
import { and, eq, inArray, sql } from 'drizzle-orm';
import type { VscarDb } from './client.ts';
import { jobs } from './schema.ts';

/**
 * Cola de jobs sobre MySQL (Step 4d). Todas las marcas de tiempo usan el reloj de MySQL (NOW(3))
 * para que varios workers compartan una única referencia temporal.
 */
export type JobRow = typeof jobs.$inferSelect;
export type JobStatus = JobRow['status'];

/** Backoff versionado: 1, 5, 15, 60 minutos (se repite el último). */
export const BACKOFF_POLICY = { version: 'backoff-v1', minutes: [1, 5, 15, 60] } as const;
export const DEFAULT_MAX_ATTEMPTS = 5;

export function backoffMinutes(attempt: number): number {
  const m = BACKOFF_POLICY.minutes;
  return m[Math.min(Math.max(attempt, 1), m.length) - 1]!;
}

export interface EnqueueOptions {
  idempotencyKey?: string;
  maxAttempts?: number;
  /** Retraso en segundos respecto a NOW(). */
  delaySeconds?: number;
  /** Si ya existe un job terminado (SUCCESS/DEAD) con la misma clave, vuelve a ponerlo en PENDING. */
  rerunFinished?: boolean;
}

export interface EnqueueResult {
  job: JobRow;
  created: boolean;
}

export function createJobQueue(db: VscarDb) {
  const byId = async (id: string) => (await db.select().from(jobs).where(eq(jobs.id, id)))[0];

  return {
    get: byId,

    async enqueue(type: string, payload: unknown, opts: EnqueueOptions = {}): Promise<EnqueueResult> {
      if (opts.idempotencyKey) {
        const [existing] = await db.select().from(jobs).where(eq(jobs.idempotency_key, opts.idempotencyKey));
        if (existing) {
          if (opts.rerunFinished && (existing.status === 'SUCCESS' || existing.status === 'DEAD')) {
            await db
              .update(jobs)
              .set({ status: 'PENDING', attempts: 0, run_at: sql`NOW(3)`, last_error: null, finished_at: null, result: null, updated_at: sql`NOW(3)` })
              .where(and(eq(jobs.id, existing.id), inArray(jobs.status, ['SUCCESS', 'DEAD'])));
            return { job: (await byId(existing.id))!, created: false };
          }
          return { job: existing, created: false };
        }
      }
      const id = randomUUID();
      try {
        await db.insert(jobs).values({
          id,
          type,
          payload,
          status: 'PENDING',
          attempts: 0,
          max_attempts: opts.maxAttempts ?? DEFAULT_MAX_ATTEMPTS,
          run_at: sql`NOW(3) + INTERVAL ${Math.max(0, Math.trunc(opts.delaySeconds ?? 0))} SECOND`,
          idempotency_key: opts.idempotencyKey ?? null,
          created_at: sql`NOW(3)`,
          updated_at: sql`NOW(3)`,
        });
      } catch (e) {
        // Carrera entre dos enqueue con la misma clave: gana el índice único.
        if (opts.idempotencyKey && /Duplicate entry/i.test(String((e as Error).message ?? e) + String((e as { cause?: unknown }).cause ?? ''))) {
          const [existing] = await db.select().from(jobs).where(eq(jobs.idempotency_key, opts.idempotencyKey));
          if (existing) return { job: existing, created: false };
        }
        throw e;
      }
      return { job: (await byId(id))!, created: true };
    },

    /**
     * Reclama atómicamente el siguiente job listo. Dos workers nunca obtienen el mismo job:
     * SELECT … FOR UPDATE SKIP LOCKED dentro de una transacción + UPDATE por id con claim_token.
     */
    async claimNext(workerId: string, types?: readonly string[]): Promise<JobRow | undefined> {
      const token = randomUUID();
      const claimedId = await db.transaction(async (tx) => {
        const typeFilter = types && types.length ? sql`AND type IN (${sql.join(types.map((t) => sql`${t}`), sql`, `)})` : sql``;
        const [rows] = (await tx.execute(
          sql`SELECT id FROM jobs WHERE status IN ('PENDING','FAILED') AND run_at <= NOW(3) ${typeFilter} ORDER BY run_at, created_at LIMIT 1 FOR UPDATE SKIP LOCKED`,
        )) as unknown as [{ id: string }[]];
        const id = rows[0]?.id;
        if (!id) return undefined;
        await tx
          .update(jobs)
          .set({
            status: 'RUNNING',
            attempts: sql`attempts + 1`,
            locked_by: workerId,
            locked_at: sql`NOW(3)`,
            heartbeat_at: sql`NOW(3)`,
            started_at: sql`NOW(3)`,
            finished_at: null,
            claim_token: token,
            updated_at: sql`NOW(3)`,
          })
          .where(eq(jobs.id, id));
        return id;
      });
      return claimedId ? byId(claimedId) : undefined;
    },

    /** Latido de un job en curso (evita que se considere lock caducado). */
    async heartbeat(job: Pick<JobRow, 'id' | 'claim_token'>): Promise<boolean> {
      const [r] = await db
        .update(jobs)
        .set({ heartbeat_at: sql`NOW(3)`, updated_at: sql`NOW(3)` })
        .where(and(eq(jobs.id, job.id), eq(jobs.claim_token, job.claim_token ?? ''), eq(jobs.status, 'RUNNING')));
      return r.affectedRows === 1;
    },

    /** Marca SUCCESS solo si el worker sigue siendo el dueño del lock. */
    async complete(job: Pick<JobRow, 'id' | 'claim_token'>, result: unknown): Promise<boolean> {
      const [r] = await db
        .update(jobs)
        .set({ status: 'SUCCESS', result: result ?? null, finished_at: sql`NOW(3)`, locked_at: null, locked_by: null, claim_token: null, last_error: null, updated_at: sql`NOW(3)` })
        .where(and(eq(jobs.id, job.id), eq(jobs.claim_token, job.claim_token ?? ''), eq(jobs.status, 'RUNNING')));
      return r.affectedRows === 1;
    },

    /**
     * Registra un fallo. No reintentable o intentos agotados → DEAD; si no → FAILED con run_at según backoff.
     */
    async fail(job: Pick<JobRow, 'id' | 'claim_token' | 'attempts' | 'max_attempts'>, error: string, retryable: boolean): Promise<JobStatus> {
      const dead = !retryable || job.attempts >= job.max_attempts;
      const status: JobStatus = dead ? 'DEAD' : 'FAILED';
      await db
        .update(jobs)
        .set({
          status,
          last_error: error.slice(0, 10_000),
          finished_at: sql`NOW(3)`,
          run_at: dead ? sql`run_at` : sql`NOW(3) + INTERVAL ${backoffMinutes(job.attempts)} MINUTE`,
          locked_at: null,
          locked_by: null,
          claim_token: null,
          updated_at: sql`NOW(3)`,
        })
        .where(and(eq(jobs.id, job.id), eq(jobs.claim_token, job.claim_token ?? ''), eq(jobs.status, 'RUNNING')));
      return status;
    },

    /**
     * Recupera jobs RUNNING cuyo último latido (o lock) es más antiguo que `staleMinutes`.
     * Cuenta como intento fallido: FAILED (reintento inmediato) o DEAD si ya no quedan intentos.
     */
    async recoverStale(staleMinutes: number): Promise<number> {
      const minutes = Math.max(1, Math.trunc(staleMinutes));
      // Bloquea las filas caducadas y las actualiza una a una (el orden de SET en MySQL no es controlable desde el ORM).
      return db.transaction(async (tx) => {
        const [rows] = (await tx.execute(
          sql`SELECT id, locked_by, attempts, max_attempts FROM jobs WHERE status = 'RUNNING' AND COALESCE(heartbeat_at, locked_at) < NOW(3) - INTERVAL ${minutes} MINUTE FOR UPDATE SKIP LOCKED`,
        )) as unknown as [{ id: string; locked_by: string | null; attempts: number; max_attempts: number }[]];
        for (const r of rows) {
          await tx
            .update(jobs)
            .set({
              status: r.attempts >= r.max_attempts ? 'DEAD' : 'FAILED',
              last_error: `stale lock recovered (was locked by ${r.locked_by ?? '?'})`,
              locked_at: null,
              locked_by: null,
              claim_token: null,
              run_at: sql`NOW(3)`,
              updated_at: sql`NOW(3)`,
            })
            .where(and(eq(jobs.id, r.id), eq(jobs.status, 'RUNNING')));
        }
        return rows.length;
      });
    },

    async stats(): Promise<{ by_status: Record<string, number>; queue_depth: number; last_finished_at: string | null }> {
      const [rows] = (await db.execute(sql`SELECT status, COUNT(*) AS n FROM jobs GROUP BY status`)) as unknown as [{ status: string; n: number }[]];
      const [ready] = (await db.execute(sql`SELECT COUNT(*) AS n FROM jobs WHERE status IN ('PENDING','FAILED') AND run_at <= NOW(3)`)) as unknown as [{ n: number }[]];
      const [last] = (await db.execute(sql`SELECT MAX(finished_at) AS t FROM jobs`)) as unknown as [{ t: string | null }[]];
      return {
        by_status: Object.fromEntries(rows.map((r) => [r.status, Number(r.n)])),
        queue_depth: Number(ready[0]?.n ?? 0),
        last_finished_at: last[0]?.t ?? null,
      };
    },
  };
}

export type JobQueue = ReturnType<typeof createJobQueue>;
