import { drizzle, type MySql2Database } from 'drizzle-orm/mysql2';
import mysql from 'mysql2/promise';
import * as schema from './schema.ts';

export type VscarDb = MySql2Database<typeof schema>;

export interface DbHandle {
  db: VscarDb;
  pool: mysql.Pool;
  close(): Promise<void>;
}

/**
 * Conexión a MySQL. `dateStrings` mantiene DATE como `YYYY-MM-DD` (round-trip exacto con el dominio).
 * En el VPS la URL vive en C:\vscar\config\.env (sin BOM), nunca en Git.
 */
export function createDb(url: string): DbHandle {
  const pool = mysql.createPool({ uri: url, dateStrings: true, connectionLimit: 5, charset: 'utf8mb4' });
  const db = drizzle(pool, { schema, mode: 'default' });
  return { db, pool, close: () => pool.end() };
}
