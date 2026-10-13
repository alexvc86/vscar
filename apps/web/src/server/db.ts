import 'server-only';
import { createCatalogReader, createDb, type CatalogReader, type DbHandle } from '@vscar/db';
import { serverEnv } from './env';

/**
 * Conexión de solo lectura al catálogo. Una por proceso (sobrevive al HMR en desarrollo). Si no hay
 * `DATABASE_URL`, el catálogo no está disponible: la home sigue funcionando y el selector muestra un error controlado.
 */
const g = globalThis as unknown as { __vscarDb?: DbHandle };

export class CatalogUnavailableError extends Error {
  constructor(cause?: unknown) {
    super('vehicle catalog unavailable', cause ? { cause } : undefined);
    this.name = 'CatalogUnavailableError';
  }
}

export function catalogReader(): CatalogReader {
  const { databaseUrl } = serverEnv();
  if (!databaseUrl) throw new CatalogUnavailableError('DATABASE_URL is not set');
  g.__vscarDb ??= createDb(databaseUrl);
  return createCatalogReader(g.__vscarDb.db);
}
