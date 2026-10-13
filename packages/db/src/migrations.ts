import { fileURLToPath } from 'node:url';
import { migrate } from 'drizzle-orm/mysql2/migrator';
import type { VscarDb } from './client.ts';

/**
 * Migraciones (entrada propia `@vscar/db/migrations`): las usan scripts, worker y tests, nunca la web (que solo lee).
 */

/** Carpeta de migraciones versionadas del paquete. */
export const MIGRATIONS_FOLDER = fileURLToPath(new URL('../drizzle', import.meta.url));

/** Aplica las migraciones pendientes (idempotente: drizzle registra las aplicadas). Nunca borra datos. */
export async function applyMigrations(db: VscarDb): Promise<void> {
  await migrate(db, { migrationsFolder: MIGRATIONS_FOLDER });
}
