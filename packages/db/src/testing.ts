import { fileURLToPath } from 'node:url';
import { sql } from 'drizzle-orm';
import { migrate } from 'drizzle-orm/mysql2/migrator';
import type { RowDataPacket } from 'mysql2';
import { createDb, type DbHandle } from './client.ts';

/** Solo para tests: carpeta de migraciones del paquete. */
export const MIGRATIONS_FOLDER = fileURLToPath(new URL('../drizzle', import.meta.url));

/**
 * Solo para tests: abre la base, borra sus tablas y aplica todas las migraciones.
 * Se niega a tocar cualquier base cuyo nombre no termine en `_test`.
 */
export async function freshTestDb(url: string): Promise<DbHandle> {
  const dbName = new URL(url).pathname.replace(/^\//, '');
  if (!dbName.endsWith('_test')) throw new Error(`refusing to reset database "${dbName}": name must end with _test`);
  const handle = createDb(url);
  const [rows] = await handle.pool.query<RowDataPacket[]>('SELECT table_name AS name FROM information_schema.tables WHERE table_schema = DATABASE()');
  await handle.db.execute(sql`SET FOREIGN_KEY_CHECKS = 0`);
  for (const r of rows) await handle.pool.query(`DROP TABLE IF EXISTS \`${String(r.name)}\``);
  await handle.db.execute(sql`SET FOREIGN_KEY_CHECKS = 1`);
  await migrate(handle.db, { migrationsFolder: MIGRATIONS_FOLDER });
  return handle;
}
