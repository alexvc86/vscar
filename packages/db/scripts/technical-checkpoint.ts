/**
 * Step D1.7 — checkpoint de SOLO LECTURA de la capa de curación técnica y del catálogo seleccionable.
 *
 *   node --env-file=.env packages/db/scripts/technical-checkpoint.ts --label <nombre> [--out docs/data/d17/checkpoint-<nombre>.json]
 *
 * Migraciones aplicadas vs journal; recuentos; unicidad TAN+Va+Ve (clave y columnas); integridad referencial
 * (huérfanos); runs/items; huella SHA-256 del catálogo seleccionable (reference_variants, homologations, spec_values,
 * vehicle_prices, safety_ratings) y de la capa curada. Sin valores ni secretos. Sale con código 1 si algo no cuadra.
 */
import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';
import type { RowDataPacket } from 'mysql2/promise';
import { createDb, tables } from '../src/index.ts';
import { MIGRATIONS_FOLDER } from '../src/migrations.ts';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');
const { values: args } = parseArgs({ options: { label: { type: 'string' }, out: { type: 'string' } } });
if (!args.label) throw new Error('--label is required');
const url = process.env.DATABASE_URL;
if (!url) throw new Error('DATABASE_URL is not set (see .env.example)');
const dbName = new URL(url).pathname.replace(/^\//, '');

const sha = (x: unknown) => createHash('sha256').update(JSON.stringify(x)).digest('hex');
const byId = <T,>(rows: T[]) => [...rows].sort((a, b) => String((a as { id?: string }).id ?? JSON.stringify(a)).localeCompare(String((b as { id?: string }).id ?? JSON.stringify(b))));

const handle = createDb(url);
try {
  const db = handle.db;
  const q = async (sql: string) => (await handle.pool.query<RowDataPacket[]>(sql))[0];
  const n = async (sql: string) => Number((await q(sql))[0]!.n);

  const journal = JSON.parse(await readFile(join(MIGRATIONS_FOLDER, 'meta', '_journal.json'), 'utf8')) as { entries: Array<{ tag: string }> };
  const applied = await n('SELECT COUNT(*) AS n FROM __drizzle_migrations');

  const catalog: Record<string, { rows: number; sha256: string }> = {};
  for (const [name, tbl] of Object.entries({ reference_variants: tables.referenceVariants, homologations: tables.homologations, spec_values: tables.specValues, vehicle_prices: tables.vehiclePrices, safety_ratings: tables.safetyRatings })) {
    const rows = byId(await db.select().from(tbl));
    catalog[name] = { rows: rows.length, sha256: sha(rows) };
  }
  const variants = await q('SELECT status, COUNT(*) AS n FROM reference_variants GROUP BY status ORDER BY status');

  const curated: Record<string, { rows: number; sha256: string }> = {};
  for (const [name, tbl] of Object.entries({ curated_technical_vehicles: tables.curatedTechnicalVehicles, curated_attributes: tables.curatedAttributes, curated_spec_values: tables.curatedSpecValues })) {
    // created_at/updated_at fuera de la huella: solo contenido.
    const rows = byId((await db.select().from(tbl)).map(({ created_at: _c, updated_at: _u, ...r }: Record<string, unknown>) => r));
    curated[name] = { rows: rows.length, sha256: sha(rows) };
  }

  const integrity = {
    duplicateTechnicalKeys: await n('SELECT COUNT(*) AS n FROM (SELECT market_code, technical_key FROM curated_technical_vehicles GROUP BY 1, 2 HAVING COUNT(*) > 1) x'),
    duplicateIdentityColumns: await n('SELECT COUNT(*) AS n FROM (SELECT market_code, type_approval_number, variant_code, version_code FROM curated_technical_vehicles GROUP BY 1, 2, 3, 4 HAVING COUNT(*) > 1) x'),
    keyColumnMismatch: await n("SELECT COUNT(*) AS n FROM curated_technical_vehicles WHERE UPPER(technical_key) <> UPPER(CONCAT(type_approval_number, '|', variant_code, '|', version_code))"),
    incompleteTan: await n("SELECT COUNT(*) AS n FROM curated_technical_vehicles WHERE type_approval_number NOT REGEXP '^E[0-9]{1,2}[*][0-9]{4}/[0-9]{1,4}[*][0-9]{1,5}[*][0-9]{1,3}$'"),
    orphanAttributes: await n('SELECT COUNT(*) AS n FROM curated_attributes a LEFT JOIN curated_technical_vehicles v ON v.id = a.vehicle_id WHERE v.id IS NULL'),
    orphanObservations: await n('SELECT COUNT(*) AS n FROM curated_spec_values s LEFT JOIN curated_technical_vehicles v ON v.id = s.vehicle_id WHERE v.id IS NULL'),
    observationsWithoutSource: await n('SELECT COUNT(*) AS n FROM curated_spec_values s LEFT JOIN sources x ON x.id = s.source_id WHERE x.id IS NULL'),
    itemsWithoutRun: await n('SELECT COUNT(*) AS n FROM curated_import_items i LEFT JOIN curated_import_runs r ON r.id = i.run_id WHERE r.id IS NULL'),
    curatedIdsInReferenceVariants: await n('SELECT COUNT(*) AS n FROM curated_technical_vehicles v JOIN reference_variants r ON r.id = v.id'),
    checkConstraints: await n("SELECT COUNT(*) AS n FROM information_schema.TABLE_CONSTRAINTS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME LIKE 'curated%' AND CONSTRAINT_TYPE = 'CHECK'"),
  };
  const counts = {
    vehicles: curated.curated_technical_vehicles!.rows,
    attributes: curated.curated_attributes!.rows,
    observations: curated.curated_spec_values!.rows,
    usable: await n("SELECT COUNT(*) AS n FROM curated_spec_values WHERE quality_status = 'USABLE'"),
    inConflict: await n("SELECT COUNT(*) AS n FROM curated_spec_values WHERE conflict_status = 'IN_CONFLICT'"),
    vehiclesWithConflicts: await n("SELECT COUNT(DISTINCT vehicle_id) AS n FROM curated_spec_values WHERE conflict_status = 'IN_CONFLICT'"),
    byRights: Object.fromEntries((await q('SELECT rights_status AS k, COUNT(*) AS n FROM curated_spec_values GROUP BY 1 ORDER BY 1')).map((r) => [r.k, Number(r.n)])),
    bySource: Object.fromEntries((await q('SELECT source_code AS k, COUNT(*) AS n FROM curated_spec_values GROUP BY 1 ORDER BY 1')).map((r) => [r.k, Number(r.n)])),
    runs: Object.fromEntries((await q('SELECT status AS k, COUNT(*) AS n FROM curated_import_runs GROUP BY 1 ORDER BY 1')).map((r) => [r.k, Number(r.n)])),
    itemsByBatch: Object.fromEntries((await q("SELECT CONCAT(batch_key, ':', status) AS k, COUNT(*) AS n FROM curated_import_items GROUP BY 1 ORDER BY 1")).map((r) => [r.k, Number(r.n)])),
  };
  const report = {
    step: 'D1.7',
    label: args.label,
    database: dbName,
    migrations: { journal: journal.entries.length, applied, latest: journal.entries.at(-1)!.tag, pending: journal.entries.length - applied },
    selectableCatalog: { referenceVariantsByStatus: Object.fromEntries(variants.map((r) => [r.status, Number(r.n)])), tables: catalog, sha256: sha(catalog) },
    curatedLayer: { tables: curated, sha256: sha(curated) },
    counts,
    integrity,
    ok: journal.entries.length === applied && Object.entries(integrity).every(([k, v]) => (k === 'checkConstraints' ? v === 10 : v === 0)),
  };
  if (args.out) {
    await mkdir(dirname(join(ROOT, args.out)), { recursive: true });
    await writeFile(join(ROOT, args.out), `${JSON.stringify(report, null, 2)}\n`);
  }
  console.log(JSON.stringify(report, null, 2));
  if (!report.ok) process.exitCode = 1;
} finally {
  await handle.close();
}
