import 'server-only';
import { z } from 'zod';

/**
 * Configuración de servidor (Step 7b). Una sola fuente: el `.env` raíz del monorepo (cargado en next.config).
 * - `DATABASE_URL`: MySQL del catálogo (solo lectura desde la web).
 * - `VSCAR_PUBLICATION_CHANNEL`: `PUBLIC` (por defecto, falla cerrado) o `PREVIEW` (Alpha privada, local).
 * - `VSCAR_SITE_URL`: origen público para URLs absolutas (OG, JSON-LD, sitemap). Por defecto, el de desarrollo.
 */
const Env = z.object({
  DATABASE_URL: z.string().regex(/^mysql:\/\//, 'DATABASE_URL must be a mysql:// URL').optional(),
  VSCAR_PUBLICATION_CHANNEL: z.enum(['PUBLIC', 'PREVIEW']).default('PUBLIC'),
  VSCAR_SITE_URL: z.string().url().default('http://localhost:4200'),
});

export interface ServerEnv {
  databaseUrl?: string;
  channel: 'PUBLIC' | 'PREVIEW';
  siteUrl: string;
}

export function serverEnv(env: NodeJS.ProcessEnv = process.env): ServerEnv {
  const e = Env.parse({ DATABASE_URL: env.DATABASE_URL || undefined, VSCAR_PUBLICATION_CHANNEL: env.VSCAR_PUBLICATION_CHANNEL || undefined, VSCAR_SITE_URL: env.VSCAR_SITE_URL || undefined });
  return { ...(e.DATABASE_URL ? { databaseUrl: e.DATABASE_URL } : {}), channel: e.VSCAR_PUBLICATION_CHANNEL, siteUrl: e.VSCAR_SITE_URL.replace(/\/$/, '') };
}
