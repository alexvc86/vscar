/**
 * Step D1.7 — copia de seguridad LÓGICA de la capa de curación técnica y prueba de restauración aislada.
 *
 *   node --env-file=.env packages/db/scripts/technical-backup.ts --backup --label <nombre>
 *   node --env-file=.env packages/db/scripts/technical-backup.ts --verify-restore data/backups/d17/<archivo>.json
 *
 * --backup (lee DATABASE_URL, solo `_dev`/`_test`; no escribe en la base):
 *   DDL (`SHOW CREATE TABLE`) + todas las filas de `curated_*` y de las fuentes que referencian,
 *   en `data/backups/d17/` (fuera de Git: contiene valores con derechos pendientes).
 *   Imprime la huella SHA-256 por tabla (sin valores).
 * --verify-restore (usa VSCAR_TEST_DATABASE_URL, base `_test`):
 *   - Toma el bloqueo de los tests (`vscar_test_reset`) y crea tablas PROPIAS `restore_d17_*`, con las mismas columnas,
 *     índices, CHECK y FK internas.
 *   - Restaura las filas y compara la huella de cada tabla con la del archivo.
 *   - Al final borra solo esas tablas `restore_d17_*`. Nunca toca las tablas de los tests ni otra base.
 */
import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';
import mysql, { type RowDataPacket } from 'mysql2/promise';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');
const { values: args } = parseArgs({ options: { backup: { type: 'boolean', default: false }, label: { type: 'string' }, 'verify-restore': { type: 'string' } } });

/** Orden de inserción (padres antes que hijos). `sources` solo con las filas referenciadas. */
const TABLES = ['sources', 'curated_technical_vehicles', 'curated_attributes', 'curated_spec_values', 'curated_import_runs', 'curated_import_items'] as const;
const PREFIX = 'restore_d17_';
const sha = (x: unknown) => createHash('sha256').update(JSON.stringify(x)).digest('hex');
const dbNameOf = (u: string) => new URL(u).pathname.replace(/^\//, '');

interface BackupFile {
  step: 'D1.7';
  label: string;
  database: string;
  createdAt: string;
  tables: Record<string, { ddl: string; jsonColumns: string[]; orderBy: string; rows: Record<string, unknown>[]; sha256: string }>;
}

const ORDER: Record<(typeof TABLES)[number], string> = {
  sources: 'id',
  curated_technical_vehicles: 'id',
  curated_attributes: 'id',
  curated_spec_values: 'id',
  curated_import_runs: 'id',
  curated_import_items: 'batch_key, technical_key',
};

async function readTable(c: mysql.Connection, table: string, name: string, orderBy: string, where = '') {
  const [rows] = await c.query<RowDataPacket[]>(`SELECT * FROM \`${table}\` ${where} ORDER BY ${orderBy}`);
  return rows.map((r) => ({ ...r }) as Record<string, unknown>).map((r) => JSON.parse(JSON.stringify(r)) as Record<string, unknown>).map((r) => ({ ...r, __t: name }));
}
const strip = (rows: Record<string, unknown>[]) => rows.map(({ __t: _t, ...r }) => r);

if (args.backup) {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error('DATABASE_URL is not set');
  const dbName = dbNameOf(url);
  if (!/_(dev|test)$/.test(dbName)) throw new Error(`refusing to back up "${dbName}" with this tool: only _dev/_test`);
  if (!args.label) throw new Error('--label is required');
  const c = await mysql.createConnection({ uri: url, dateStrings: true, charset: 'utf8mb4' });
  try {
    const file: BackupFile = { step: 'D1.7', label: args.label, database: dbName, createdAt: new Date().toISOString(), tables: {} };
    for (const t of TABLES) {
      const [[ddlRow]] = await c.query<RowDataPacket[]>(`SHOW CREATE TABLE \`${t}\``);
      const [cols] = await c.query<RowDataPacket[]>("SELECT COLUMN_NAME AS c FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND DATA_TYPE = 'json'", [t]);
      const where = t === 'sources' ? 'WHERE id IN (SELECT DISTINCT source_id FROM curated_spec_values)' : '';
      const rows = strip(await readTable(c, t, t, ORDER[t], where));
      file.tables[t] = { ddl: String(ddlRow!['Create Table']), jsonColumns: cols.map((x) => String(x.c)), orderBy: ORDER[t], rows, sha256: sha(rows) };
    }
    const out = join(ROOT, 'data', 'backups', 'd17', `curated-${args.label}.json`);
    await mkdir(dirname(out), { recursive: true });
    const text = `${JSON.stringify(file)}\n`;
    await writeFile(out, text);
    console.log(JSON.stringify({ file: `data/backups/d17/curated-${args.label}.json`, fileSha256: createHash('sha256').update(text).digest('hex'), database: dbName, tables: Object.fromEntries(Object.entries(file.tables).map(([k, v]) => [k, { rows: v.rows.length, sha256: v.sha256 }])) }, null, 2));
  } finally {
    await c.end();
  }
} else if (args['verify-restore']) {
  const url = process.env.VSCAR_TEST_DATABASE_URL;
  if (!url) throw new Error('VSCAR_TEST_DATABASE_URL is not set');
  const dbName = dbNameOf(url);
  if (!dbName.endsWith('_test')) throw new Error(`refusing to restore into "${dbName}": test database name must end with _test`);
  const file = JSON.parse(await readFile(resolve(ROOT, args['verify-restore']), 'utf8')) as BackupFile;
  const c = await mysql.createConnection({ uri: url, dateStrings: true, charset: 'utf8mb4', multipleStatements: false });
  const [[lock]] = await c.query<RowDataPacket[]>("SELECT GET_LOCK('vscar_test_reset', 600) AS ok");
  if (lock?.ok !== 1) throw new Error('could not acquire the vscar_test lock');
  const created: string[] = [];
  const results: Record<string, { rows: number; expected: string; restored: string; match: boolean }> = {};
  try {
    const [existing] = await c.query<RowDataPacket[]>('SELECT TABLE_NAME AS t FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME LIKE ?', [`${PREFIX}%`]);
    if (existing.length) throw new Error(`restore tables already exist (${existing.map((r) => r.t).join(', ')}): refusing to touch them`);
    for (const t of TABLES) {
      const meta = file.tables[t]!;
      // Mismo DDL con nombres propios: tabla, referencias internas y nombres de restricciones (únicos por esquema).
      let ddl = meta.ddl;
      for (const other of TABLES) ddl = ddl.replaceAll(`\`${other}\``, `\`${PREFIX}${other}\``);
      ddl = ddl.replace(/CONSTRAINT `([^`]+)`/g, (_m, name: string) => `CONSTRAINT \`r17_${createHash('sha1').update(`${t}:${name}`).digest('hex').slice(0, 20)}\``);
      // FK hacia tablas que no se restauran (raw_ingest): se quita; se comprueba abajo que la columna va vacía.
      ddl = ddl.replace(/,\s*CONSTRAINT `[^`]+` FOREIGN KEY \(`raw_ingest_id`\) REFERENCES `raw_ingest` \(`id`\)[^,\n)]*/g, '');
      await c.query(ddl);
      created.push(`${PREFIX}${t}`);
      for (const row of meta.rows) {
        if (t === 'curated_spec_values' && row.raw_ingest_id != null) throw new Error('raw_ingest_id present: extend the restore to raw_ingest');
        const cols = Object.keys(row);
        const vals = cols.map((k) => (meta.jsonColumns.includes(k) && row[k] !== null ? JSON.stringify(row[k]) : row[k]));
        await c.query(`INSERT INTO \`${PREFIX}${t}\` (${cols.map((k) => `\`${k}\``).join(', ')}) VALUES (${cols.map(() => '?').join(', ')})`, vals);
      }
      const restored = strip(await readTable(c, `${PREFIX}${t}`, t, meta.orderBy));
      results[t] = { rows: restored.length, expected: meta.sha256, restored: sha(restored), match: sha(restored) === meta.sha256 };
    }
    const [checks] = await c.query<RowDataPacket[]>("SELECT COUNT(*) AS n FROM information_schema.TABLE_CONSTRAINTS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME LIKE ? AND CONSTRAINT_TYPE = 'CHECK'", [`${PREFIX}%`]);
    console.log(JSON.stringify({ restoredInto: `${dbName} (tables ${PREFIX}*)`, backup: args['verify-restore'], label: file.label, tables: results, checkConstraintsRestored: Number(checks[0]!.n), allMatch: Object.values(results).every((r) => r.match) }, null, 2));
    if (!Object.values(results).every((r) => r.match)) process.exitCode = 1;
  } finally {
    // Limpieza: SOLO las tablas creadas por esta ejecución, hijos primero.
    await c.query('SET FOREIGN_KEY_CHECKS = 0');
    for (const t of [...created].reverse()) await c.query(`DROP TABLE IF EXISTS \`${t}\``);
    await c.query('SET FOREIGN_KEY_CHECKS = 1');
    await c.query("SELECT RELEASE_LOCK('vscar_test_reset')");
    await c.end();
  }
} else {
  throw new Error('use --backup --label <name> or --verify-restore <file>');
}
