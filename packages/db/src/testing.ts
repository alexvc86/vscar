import { sql } from 'drizzle-orm';
import mysql, { type RowDataPacket } from 'mysql2/promise';
import { createDb, type DbHandle } from './client.ts';
import { applyMigrations, MIGRATIONS_FOLDER } from './migrations.ts';

export { MIGRATIONS_FOLDER };

/**
 * Solo para tests: abre la base, borra sus tablas y aplica todas las migraciones.
 * Se niega a tocar cualquier base cuyo nombre no termine en `_test`.
 */
export async function freshTestDb(url: string): Promise<DbHandle> {
  const dbName = new URL(url).pathname.replace(/^\//, '');
  if (!dbName.endsWith('_test')) throw new Error(`refusing to reset database "${dbName}": name must end with _test`);
  // Varios paquetes (db, worker, web) reinician la MISMA base: un bloqueo consultivo de MySQL serializa los ficheros
  // de test entre procesos. Se mantiene hasta `close()`.
  const lock = await mysql.createConnection({ uri: url });
  const [[acquired]] = await lock.query<RowDataPacket[]>("SELECT GET_LOCK('vscar_test_reset', 600) AS ok");
  if (acquired?.ok !== 1) {
    await lock.end();
    throw new Error('could not acquire the vscar_test lock');
  }
  const handle = createDb(url);
  const close = handle.close;
  handle.close = async () => {
    await close();
    await lock.query("SELECT RELEASE_LOCK('vscar_test_reset')");
    await lock.end();
  };
  const [rows] = await handle.pool.query<RowDataPacket[]>('SELECT table_name AS name FROM information_schema.tables WHERE table_schema = DATABASE()');
  await handle.db.execute(sql`SET FOREIGN_KEY_CHECKS = 0`);
  for (const r of rows) await handle.pool.query(`DROP TABLE IF EXISTS \`${String(r.name)}\``);
  await handle.db.execute(sql`SET FOREIGN_KEY_CHECKS = 1`);
  await applyMigrations(handle.db);
  return handle;
}
