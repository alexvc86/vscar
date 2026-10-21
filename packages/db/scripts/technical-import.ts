/**
 * Step D1.6 / D1.6a — importación de la capa de CURACIÓN TÉCNICA en MySQL (`vscar_dev`). Idempotente y reanudable.
 * Vive en @vscar/db (ADR-002: solo este paquete persiste); consume el plan JSON que genera `curation` (sin depender de él).
 *
 *   node --env-file=.env packages/db/scripts/technical-import.ts [--plan <ruta>] [--dry-run] [--allow-update]
 *
 * - `--plan`: plan JSON (por defecto `data/curation/d16/plan-first-18.json`; los lotes D1.6a están en `data/curation/d16a/`).
 * - `--dry-run` (Step D1.6a): valida y clasifica cada elemento (INSERT / SKIP / UPDATE / REJECT, y cuántos traen
 *   valores en conflicto) SIN escribir: no aplica migraciones, no crea runs, no escribe informes; comprueba al final
 *   que las tablas curadas y el catálogo seleccionable no han cambiado.
 * - `--allow-update`: permite reescribir vehículos curados existentes con contenido distinto (por defecto, fallan).
 * - Solo bases cuyo nombre termina en `_dev` (o `_test`). Nunca el VPS.
 * - Importación real: aplica migraciones, ejecuta el lote DOS veces (la segunda no debe cambiar nada) y comprueba que
 *   el catálogo seleccionable existente (reference_variants, spec_values, precios…) queda intacto.
 * Informe (solo importación real): docs/data/d16/import-report.json (lote D1.6) o docs/data/d16a/import-report-<lote>.json.
 */
import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';
import type { RowDataPacket } from 'mysql2/promise';
import { createDb, createTechnicalCurationRepository, planHash, tables, type TechnicalImportPlanItem, type VscarDb } from '../src/index.ts';
import { MIGRATIONS_FOLDER, applyMigrations } from '../src/migrations.ts';
import { Source } from '@vscar/vehicle-schema';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');
const { values: args } = parseArgs({ options: { plan: { type: 'string', default: 'data/curation/d16/plan-first-18.json' }, 'dry-run': { type: 'boolean', default: false }, 'allow-update': { type: 'boolean', default: false } } });
const url = process.env.DATABASE_URL;
if (!url) throw new Error('DATABASE_URL is not set (see .env.example)');
const dbName = new URL(url).pathname.replace(/^\//, '');
if (!/_(dev|test)$/.test(dbName)) throw new Error(`refusing to import into "${dbName}": database name must end with _dev or _test`);

const plan = JSON.parse(await readFile(resolve(ROOT, args.plan!), 'utf8')) as { batchKey: string; sources: unknown[]; items: TechnicalImportPlanItem[] };
const sources = plan.sources.map((s) => Source.parse(s));

/** Huella del catálogo seleccionable: ids + contenido de las tablas que nunca deben cambiar. */
async function catalogFingerprint(db: VscarDb) {
  const parts: Record<string, string | number> = {};
  for (const [name, tbl] of Object.entries({ reference_variants: tables.referenceVariants, homologations: tables.homologations, spec_values: tables.specValues, vehicle_prices: tables.vehiclePrices, safety_ratings: tables.safetyRatings })) {
    const rows = await db.select().from(tbl);
    parts[`${name}_rows`] = rows.length;
    parts[`${name}_sha256`] = createHash('sha256').update(JSON.stringify([...rows].sort((a, b) => String((a as { id: string }).id).localeCompare(String((b as { id: string }).id))))).digest('hex');
  }
  return parts;
}

/** Huella de TODA la capa curada (incluidos runs e items): el dry-run no puede cambiarla. */
async function curatedFingerprint(db: VscarDb) {
  const all = await Promise.all([tables.curatedTechnicalVehicles, tables.curatedAttributes, tables.curatedSpecValues, tables.curatedImportRuns, tables.curatedImportItems, tables.sources].map((tb) => db.select().from(tb)));
  return createHash('sha256').update(JSON.stringify(all)).digest('hex');
}

const handle = createDb(url);
try {
  const db = handle.db;
  const repo = createTechnicalCurationRepository(db);
  if (args['dry-run']) {
    const journal = JSON.parse(await readFile(join(MIGRATIONS_FOLDER, 'meta', '_journal.json'), 'utf8')) as { entries: unknown[] };
    const [[applied]] = await handle.pool.query<RowDataPacket[]>("SELECT (SELECT COUNT(*) FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = '__drizzle_migrations') AS has_journal, (SELECT COUNT(*) FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'curated_technical_vehicles') AS has_curated");
    const appliedCount = applied!.has_journal ? Number(((await handle.pool.query<RowDataPacket[]>('SELECT COUNT(*) AS n FROM __drizzle_migrations'))[0][0] as { n: number }).n) : 0;
    const pendingMigrations = journal.entries.length - appliedCount;
    if (!applied!.has_curated) {
      console.log(JSON.stringify({ mode: 'DRY_RUN', database: dbName, batchKey: plan.batchKey, pendingMigrations, error: 'curated tables missing: run the real import (it applies migrations) or `corepack pnpm db:dev` first' }));
      process.exitCode = 1;
    } else {
      const catalogBefore = await catalogFingerprint(db);
      const curatedBefore = await curatedFingerprint(db);
      const preview = await repo.planImport(plan.items);
      const unchanged = JSON.stringify(catalogBefore) === JSON.stringify(await catalogFingerprint(db)) && curatedBefore === (await curatedFingerprint(db));
      const c = preview.counts;
      console.log(
        JSON.stringify(
          {
            mode: 'DRY_RUN',
            database: dbName,
            batchKey: plan.batchKey,
            planHash: planHash(plan.items),
            pendingMigrations,
            wouldInsert: c.insert,
            wouldSkip: c.skip,
            wouldUpdate: c.update,
            wouldReject: c.reject,
            wouldConflict: { vehicles: c.withConflicts, values: c.conflictingValues },
            updatesAllowed: args['allow-update'],
            observations: plan.items.reduce((s, i) => s + i.observations.length, 0),
            attributes: plan.items.reduce((s, i) => s + i.attributes.length, 0),
            entries: preview.entries.filter((e) => e.action !== 'INSERT' || e.conflicts).map((e) => ({ key: e.technicalKey, action: e.action, conflicts: e.conflicts, ...(e.reason ? { reason: e.reason } : {}) })),
            nothingWritten: unchanged,
          },
          null,
          2,
        ),
      );
      if (!unchanged || c.reject || (c.update && !args['allow-update'])) process.exitCode = 1;
    }
  } else {
    await applyMigrations(db);
    const before = await catalogFingerprint(db);
    const countsBefore = await repo.counts();
    const opts = { allowUpdates: args['allow-update'] };
    const run1 = await repo.importBatch(plan.batchKey, plan.items, sources, opts);
    const after1 = await repo.counts();
    const run2 = await repo.importBatch(plan.batchKey, plan.items, sources, opts);
    const after2 = await repo.counts();
    const after = await catalogFingerprint(db);
    const selectableReferenceVariants = Number(after.reference_variants_rows);
    const report = {
      step: plan.batchKey === 'd16-first-18' ? 'D1.6' : 'D1.6a',
      database: dbName,
      batchKey: plan.batchKey,
      planHash: planHash(plan.items),
      countsBefore,
      run1: { status: run1.status, counts: run1.counts, ...(run1.error ? { error: run1.error } : {}) },
      afterRun1: after1,
      run2: { status: run2.status, counts: run2.counts },
      afterRun2: after2,
      idempotent: JSON.stringify(after1) === JSON.stringify(after2) && run2.counts.imported === 0,
      existingCatalog: { before, after, unchanged: JSON.stringify(before) === JSON.stringify(after), selectableReferenceVariants },
    };
    const out = plan.batchKey === 'd16-first-18' ? 'docs/data/d16/import-report.json' : `docs/data/d16a/import-report-${plan.batchKey}.json`;
    await mkdir(dirname(join(ROOT, out)), { recursive: true });
    await writeFile(join(ROOT, out), `${JSON.stringify(report, null, 2)}\n`);
    console.log(JSON.stringify({ run1: report.run1.counts, run2: report.run2.counts, idempotent: report.idempotent, catalogUnchanged: report.existingCatalog.unchanged, selectableReferenceVariants }));
    if (!report.idempotent || !report.existingCatalog.unchanged || run1.status !== 'COMPLETED') process.exitCode = 1;
  }
} finally {
  await handle.close();
}
