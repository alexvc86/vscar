import { createHash, randomUUID } from 'node:crypto';
import { and, asc, eq, inArray, sql } from 'drizzle-orm';
import { CuratedAttribute, CuratedObservation, CuratedTechnicalVehicle, Source, SpecValue, type CuratedTechnicalVehicleInput } from '@vscar/vehicle-schema';
import type { Pool } from 'mysql2/promise';
import type { VscarDb } from './client.ts';
import * as m from './mappers.ts';
import * as t from './schema.ts';

/**
 * Step D1.6 — repositorio de la capa de CURACIÓN TÉCNICA (ADR-019 B). Solo escribe en tablas `curated_*` (y añade
 * fuentes que falten en `sources`, sin modificar las existentes). Nunca toca `reference_variants` ni su `spec_values`:
 * un vehículo curado no entra en el selector ni en los motores sin una promoción explícita.
 */

export interface TechnicalImportPlanItem {
  vehicle: CuratedTechnicalVehicleInput;
  attributes: readonly CuratedAttribute[];
  observations: readonly CuratedObservation[];
}

export interface TechnicalImportCounts {
  planned: number;
  /** inserted + updated */
  imported: number;
  inserted: number;
  updated: number;
  skippedUnchanged: number;
  failed: number;
  vehicles: number;
  attributes: number;
  observations: number;
}

export interface TechnicalImportOptions {
  /** Solo tests: se invoca antes de cada elemento (permite simular un fallo a mitad de lote). */
  beforeItem?: (technicalKey: string, index: number) => void | Promise<void>;
  now?: () => string;
  /**
   * Step D1.6a: reescribir un vehículo curado que ya existe con otro contenido exige pedirlo explícitamente.
   * Sin esta opción el elemento falla (nunca se sobrescriben observaciones en silencio).
   */
  allowUpdates?: boolean;
}

/** Acción que la importación aplicaría a un elemento (Step D1.6a; la usa también el dry-run). */
export type TechnicalImportAction = 'INSERT' | 'SKIP' | 'UPDATE' | 'REJECT';

export interface TechnicalImportPlanEntry {
  technicalKey: string;
  vehicleId: string;
  action: TechnicalImportAction;
  /** Observaciones en conflicto que se conservarían (informativo: no excluye el elemento). */
  conflicts: number;
  reason?: string;
}

export interface TechnicalImportPreview {
  entries: TechnicalImportPlanEntry[];
  counts: { planned: number; insert: number; skip: number; update: number; reject: number; withConflicts: number; conflictingValues: number };
}

/** Otro importador técnico está en marcha (bloqueo de MySQL `vscar_curated_import`). */
export class ConcurrentImportError extends Error {
  constructor() {
    super('another technical import is running (MySQL lock vscar_curated_import): refusing to run concurrently');
    this.name = 'ConcurrentImportError';
  }
}

export const CURATED_IMPORT_LOCK = 'vscar_curated_import';

export class DuplicateTechnicalIdentityError extends Error {
  constructor(key: string, existingId: string, plannedId: string) {
    super(`technical identity ${key} already curated as ${existingId} (planned id ${plannedId}): refusing to duplicate`);
    this.name = 'DuplicateTechnicalIdentityError';
  }
}

const sha256 = (s: string) => createHash('sha256').update(s).digest('hex');
/** Huella estable de un elemento (sus filas con orden fijo): decide si la reanudación lo vuelve a escribir. */
export const itemHash = (item: TechnicalImportPlanItem) =>
  sha256(JSON.stringify({ v: item.vehicle, a: [...item.attributes].sort((x, y) => x.id.localeCompare(y.id)), o: [...item.observations].sort((x, y) => x.value.id.localeCompare(y.value.id)) }));
export const planHash = (items: readonly TechnicalImportPlanItem[]) => sha256(items.map(itemHash).sort().join('\n'));

const nul = <T>(v: T | undefined): T | null => (v === undefined ? null : v);
const nowSql = () => new Date().toISOString().replace('T', ' ').replace('Z', '');

function vehicleToRow(v: CuratedTechnicalVehicle): typeof t.curatedTechnicalVehicles.$inferInsert {
  return {
    id: v.id,
    market_code: v.market_code,
    technical_key: v.technical_key,
    brand: v.brand,
    model: v.model,
    type_approval_number: v.technical_identity.type_approval_number,
    variant_code: v.technical_identity.variant_code,
    version_code: v.technical_identity.version_code,
    identity_confidence: v.technical_identity.confidence,
    homologation_powertrain: v.homologation_powertrain,
    product_class: v.product_class,
    fuel_type: nul(v.fuel_type),
    first_observed_year: v.registration_period.first_observed_year,
    last_observed_year: v.registration_period.last_observed_year,
    commercial_identity_status: v.commercial_identity_status,
    curation_status: v.curation_status,
    source_codes: v.source_codes,
    d1_candidate_id: nul(v.d1_candidate_id),
    d1_rank: nul(v.d1_rank),
    blockers: v.blockers,
    notes: nul(v.notes),
  };
}

function vehicleFromRow(r: typeof t.curatedTechnicalVehicles.$inferSelect): CuratedTechnicalVehicle {
  return CuratedTechnicalVehicle.parse({
    id: r.id,
    market_code: r.market_code,
    technical_key: r.technical_key,
    brand: r.brand,
    model: r.model,
    technical_identity: { type_approval_number: r.type_approval_number, variant_code: r.variant_code, version_code: r.version_code, confidence: r.identity_confidence },
    homologation_powertrain: r.homologation_powertrain,
    product_class: r.product_class,
    ...(r.fuel_type ? { fuel_type: r.fuel_type } : {}),
    registration_period: { first_observed_year: r.first_observed_year, last_observed_year: r.last_observed_year },
    commercial_identity_status: r.commercial_identity_status,
    curation_status: r.curation_status,
    source_codes: r.source_codes,
    ...(r.d1_candidate_id ? { d1_candidate_id: r.d1_candidate_id } : {}),
    ...(r.d1_rank !== null ? { d1_rank: r.d1_rank } : {}),
    blockers: r.blockers,
    ...(r.notes ? { notes: r.notes } : {}),
  });
}

function observationToRow(o: CuratedObservation): typeof t.curatedSpecValues.$inferInsert {
  const { variant_id, ...base } = m.specValueToRow(o.value);
  return {
    ...base,
    vehicle_id: variant_id,
    source_code: o.source_code,
    source_record: o.source_record,
    identity_match: o.identity_match,
    rights_status: o.rights_status,
    quality_status: o.quality_status,
    quality_reasons: o.quality_reasons,
    conflict_status: o.conflict_status,
    conflict_group: nul(o.conflict_group),
  };
}

function observationFromRow(r: typeof t.curatedSpecValues.$inferSelect): CuratedObservation {
  const { vehicle_id, source_code, source_record, identity_match, rights_status, quality_status, quality_reasons, conflict_status, conflict_group, ...rest } = r;
  const value = SpecValue.parse(m.specValueFromRow({ ...rest, variant_id: vehicle_id }));
  return CuratedObservation.parse({ value, source_code, source_record, identity_match, rights_status, quality_status, quality_reasons, conflict_status, ...(conflict_group ? { conflict_group } : {}) });
}

function attributeFromRow(r: typeof t.curatedAttributes.$inferSelect): CuratedAttribute {
  const { created_at: _c, ...rest } = r;
  return CuratedAttribute.parse(rest);
}

export interface CuratedVehicleDetail {
  vehicle: CuratedTechnicalVehicle;
  attributes: CuratedAttribute[];
  observations: CuratedObservation[];
  sources: Source[];
}

/** Validación de dominio de un elemento (mismas reglas en el dry-run y en la escritura). */
function validateItem(item: TechnicalImportPlanItem) {
  const vehicle = CuratedTechnicalVehicle.parse(item.vehicle);
  const attributes = item.attributes.map((a) => CuratedAttribute.parse(a));
  const observations = item.observations.map((o) => CuratedObservation.parse(o));
  for (const a of attributes) if (a.vehicle_id !== vehicle.id) throw new Error(`attribute ${a.id} belongs to another vehicle`);
  for (const o of observations) if (o.value.variant_id !== vehicle.id) throw new Error(`observation ${o.value.id} belongs to another vehicle`);
  return { vehicle, attributes, observations };
}

export function createTechnicalCurationRepository(db: VscarDb) {
  /** Añade fuentes que no existan. Una fuente existente (por id) nunca se modifica. */
  async function ensureSources(sources: readonly Source[]): Promise<number> {
    if (!sources.length) return 0;
    const existing = new Set((await db.select({ id: t.sources.id }).from(t.sources).where(inArray(t.sources.id, sources.map((s) => s.id)))).map((r) => r.id));
    const missing = sources.filter((s) => !existing.has(s.id));
    if (missing.length) await db.insert(t.sources).values(missing.map((s) => m.sourceToRow(Source.parse(s))));
    return missing.length;
  }

  /** Escribe UN vehículo y sus filas en una transacción: o todo o nada. Reemplaza sus atributos/observaciones (ids deterministas). */
  async function writeItem(item: TechnicalImportPlanItem): Promise<{ attributes: number; observations: number }> {
    const { vehicle, attributes, observations } = validateItem(item);
    await db.transaction(async (tx) => {
      const same = await tx.select({ id: t.curatedTechnicalVehicles.id }).from(t.curatedTechnicalVehicles).where(and(eq(t.curatedTechnicalVehicles.market_code, vehicle.market_code), eq(t.curatedTechnicalVehicles.technical_key, vehicle.technical_key)));
      if (same.length && same[0]!.id !== vehicle.id) throw new DuplicateTechnicalIdentityError(vehicle.technical_key, same[0]!.id, vehicle.id);
      const row = vehicleToRow(vehicle);
      if (same.length) {
        const { id: _id, ...update } = row;
        await tx.update(t.curatedTechnicalVehicles).set(update).where(eq(t.curatedTechnicalVehicles.id, vehicle.id));
      } else await tx.insert(t.curatedTechnicalVehicles).values(row);
      await tx.delete(t.curatedAttributes).where(eq(t.curatedAttributes.vehicle_id, vehicle.id));
      await tx.delete(t.curatedSpecValues).where(eq(t.curatedSpecValues.vehicle_id, vehicle.id));
      if (attributes.length) await tx.insert(t.curatedAttributes).values(attributes);
      if (observations.length) await tx.insert(t.curatedSpecValues).values(observations.map(observationToRow));
    });
    return { attributes: attributes.length, observations: observations.length };
  }

  /**
   * Step D1.6a — clasificación de SOLO LECTURA de un plan (base del dry-run y de la importación):
   * INSERT (vehículo nuevo) · SKIP (ya importado con la misma huella, en cualquier lote) · UPDATE (existe con otro
   * contenido) · REJECT (inválido, o su TAN|Va|Ve ya está curada con otro id). No escribe nada.
   */
  async function planImport(plan: readonly TechnicalImportPlanItem[]): Promise<TechnicalImportPreview> {
    const keys = plan.map((p) => p.vehicle.technical_key);
    const ids = plan.map((p) => p.vehicle.id);
    const v = t.curatedTechnicalVehicles;
    const existing = keys.length ? await db.select({ id: v.id, key: v.technical_key, market: v.market_code }).from(v).where(inArray(v.technical_key, keys)) : [];
    const byId = ids.length ? await db.select({ id: v.id }).from(v).where(inArray(v.id, ids)) : [];
    const it = t.curatedImportItems;
    const items = keys.length ? await db.select({ key: it.technical_key, hash: it.item_hash, status: it.status }).from(it).where(inArray(it.technical_key, keys)) : [];
    const seen = new Set<string>();
    const entries = plan.map((item): TechnicalImportPlanEntry => {
      const key = item.vehicle.technical_key;
      const conflicts = item.observations.filter((o) => o.conflict_status === 'IN_CONFLICT').length;
      const head = { technicalKey: key, vehicleId: item.vehicle.id, conflicts };
      if (seen.has(key)) return { ...head, action: 'REJECT', reason: 'duplicate technical key in the plan' };
      seen.add(key);
      try {
        validateItem(item);
      } catch (e) {
        return { ...head, action: 'REJECT', reason: (e instanceof Error ? e.message : String(e)).slice(0, 500) };
      }
      // La collation de MySQL (utf8mb4_0900_ai_ci) compara sin mayúsculas: la misma regla aquí.
      const other = existing.find((x) => x.market === item.vehicle.market_code && x.key.toUpperCase() === key.toUpperCase() && x.id !== item.vehicle.id);
      if (other) return { ...head, action: 'REJECT', reason: new DuplicateTechnicalIdentityError(key, other.id, item.vehicle.id).message };
      if (!byId.some((x) => x.id === item.vehicle.id)) return { ...head, action: 'INSERT' };
      const hash = itemHash(item);
      if (items.some((x) => x.key === key && x.status === 'IMPORTED' && x.hash === hash)) return { ...head, action: 'SKIP' };
      return { ...head, action: 'UPDATE', reason: 'curated vehicle exists with different content' };
    });
    const n = (a: TechnicalImportAction) => entries.filter((e) => e.action === a).length;
    return {
      entries,
      counts: { planned: plan.length, insert: n('INSERT'), skip: n('SKIP'), update: n('UPDATE'), reject: n('REJECT'), withConflicts: entries.filter((e) => e.conflicts > 0).length, conflictingValues: entries.reduce((sum, e) => sum + e.conflicts, 0) },
    };
  }

  /** Bloqueo consultivo de MySQL en una conexión propia: se libera al terminar o si la conexión/proceso muere. */
  async function withImportLock<T>(fn: () => Promise<T>): Promise<T> {
    // `createDb` crea drizzle sobre un pool de `mysql2/promise`; el bloqueo necesita SU conexión (no una del pool cualquiera).
    const conn = await (db as unknown as { $client: Pool }).$client.getConnection();
    try {
      const [rows] = await conn.query('SELECT GET_LOCK(?, 0) AS ok', [CURATED_IMPORT_LOCK]);
      if ((rows as Array<{ ok: number | null }>)[0]?.ok !== 1) throw new ConcurrentImportError();
      try {
        return await fn();
      } finally {
        await conn.query('SELECT RELEASE_LOCK(?)', [CURATED_IMPORT_LOCK]).catch(() => undefined);
      }
    } finally {
      conn.release();
    }
  }

  /**
   * Importa un lote de forma idempotente y reanudable: un elemento ya IMPORTED con la misma huella (en cualquier lote)
   * se omite; uno FAILED se reintenta; uno cambiado solo se reescribe con `allowUpdates`. Un fallo detiene el lote,
   * deja los anteriores confirmados y el run en FAILED. Una segunda importación simultánea falla (ConcurrentImportError).
   */
  async function importBatch(batchKey: string, plan: readonly TechnicalImportPlanItem[], sources: readonly Source[], opts: TechnicalImportOptions = {}): Promise<{ runId: string; status: 'COMPLETED' | 'FAILED'; counts: TechnicalImportCounts; error?: string }> {
    const now = opts.now ?? nowSql;
    const keys = plan.map((p) => p.vehicle.technical_key);
    if (new Set(keys).size !== keys.length) throw new Error('plan contains duplicate technical keys');
    return withImportLock(async () => {
      // Con el bloqueo tomado no hay otro importador vivo: un run RUNNING es de un proceso caído (Step D1.6a).
      await db.update(t.curatedImportRuns).set({ status: 'ABANDONED', finished_at: now(), error: 'process ended before finishing (lock released)' }).where(eq(t.curatedImportRuns.status, 'RUNNING'));
      const runId = randomUUID();
      await db.insert(t.curatedImportRuns).values({ id: runId, batch_key: batchKey, plan_hash: planHash(plan), status: 'RUNNING', started_at: now() });
      const counts: TechnicalImportCounts = { planned: plan.length, imported: 0, inserted: 0, updated: 0, skippedUnchanged: 0, failed: 0, vehicles: 0, attributes: 0, observations: 0 };
      let error: string | undefined;
      await ensureSources(sources);
      const preview = await planImport(plan);
      for (const [i, item] of plan.entries()) {
        const key = item.vehicle.technical_key;
        const hash = itemHash(item);
        const entry = preview.entries[i]!;
        if (entry.action === 'SKIP') {
          counts.skippedUnchanged++;
          continue;
        }
        try {
          await opts.beforeItem?.(key, i);
          if (entry.action === 'REJECT') throw new Error(entry.reason ?? 'rejected');
          if (entry.action === 'UPDATE' && !opts.allowUpdates) throw new Error(`${entry.reason}: refusing to overwrite without allowUpdates`);
          const w = await writeItem(item);
          counts.imported++;
          if (entry.action === 'UPDATE') counts.updated++;
          else counts.inserted++;
          counts.attributes += w.attributes;
          counts.observations += w.observations;
          await upsertItem(batchKey, key, item.vehicle.id, hash, 'IMPORTED', runId, null, now());
        } catch (e) {
          counts.failed++;
          error = `${key}: ${e instanceof Error ? e.message : String(e)}`;
          await upsertItem(batchKey, key, item.vehicle.id, hash, 'FAILED', runId, error, now());
          break;
        }
      }
      counts.vehicles = Number((await db.select({ n: sql<number>`count(*)` }).from(t.curatedTechnicalVehicles))[0]!.n);
      const status = error ? 'FAILED' : 'COMPLETED';
      await db.update(t.curatedImportRuns).set({ status, finished_at: now(), counts, ...(error ? { error } : {}) }).where(eq(t.curatedImportRuns.id, runId));
      return { runId, status, counts, ...(error ? { error } : {}) };
    });
  }

  async function upsertItem(batchKey: string, key: string, vehicleId: string, hash: string, status: 'IMPORTED' | 'FAILED', runId: string, error: string | null, at: string) {
    await db
      .insert(t.curatedImportItems)
      .values({ batch_key: batchKey, technical_key: key, vehicle_id: vehicleId, item_hash: hash, status, run_id: runId, error, updated_at: at })
      .onDuplicateKeyUpdate({ set: { vehicle_id: vehicleId, item_hash: hash, status, run_id: runId, error, updated_at: at } });
  }

  async function listVehicles(market: string): Promise<CuratedTechnicalVehicle[]> {
    const rows = await db.select().from(t.curatedTechnicalVehicles).where(eq(t.curatedTechnicalVehicles.market_code, market)).orderBy(asc(t.curatedTechnicalVehicles.brand), asc(t.curatedTechnicalVehicles.model), asc(t.curatedTechnicalVehicles.technical_key));
    return rows.map(vehicleFromRow);
  }

  async function loadVehicles(ids: readonly string[]): Promise<CuratedVehicleDetail[]> {
    if (!ids.length) return [];
    const [vs, attrs, obs] = await Promise.all([
      db.select().from(t.curatedTechnicalVehicles).where(inArray(t.curatedTechnicalVehicles.id, [...ids])),
      db.select().from(t.curatedAttributes).where(inArray(t.curatedAttributes.vehicle_id, [...ids])),
      db.select().from(t.curatedSpecValues).where(inArray(t.curatedSpecValues.vehicle_id, [...ids])),
    ]);
    const sourceIds = [...new Set(obs.map((o) => o.source_id))];
    const srcs = sourceIds.length ? (await db.select().from(t.sources).where(inArray(t.sources.id, sourceIds))).map((r) => Source.parse(m.sourceFromRow(r))) : [];
    const byId = <T extends { id: string }>(xs: T[]) => [...xs].sort((a, b) => a.id.localeCompare(b.id));
    return vs
      .map(vehicleFromRow)
      .sort((a, b) => a.technical_key.localeCompare(b.technical_key))
      .map((vehicle) => {
        const o = byId(obs.filter((x) => x.vehicle_id === vehicle.id)).map(observationFromRow);
        return { vehicle, attributes: byId(attrs.filter((a) => a.vehicle_id === vehicle.id)).map(attributeFromRow), observations: o, sources: srcs.filter((s) => o.some((x) => x.value.source_id === s.id)) };
      });
  }

  async function counts() {
    const n = async (tbl: typeof t.curatedTechnicalVehicles | typeof t.curatedAttributes | typeof t.curatedSpecValues) => (await db.select({ n: sql<number>`count(*)` }).from(tbl))[0]!.n;
    return { vehicles: Number(await n(t.curatedTechnicalVehicles)), attributes: Number(await n(t.curatedAttributes)), observations: Number(await n(t.curatedSpecValues)) };
  }

  return { ensureSources, writeItem, planImport, importBatch, listVehicles, loadVehicles, counts };
}
export type TechnicalCurationRepository = ReturnType<typeof createTechnicalCurationRepository>;
