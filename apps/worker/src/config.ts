import { hostname } from 'node:os';
import { join } from 'node:path';
import { z } from 'zod';

/**
 * Configuración del worker desde variables de entorno (NSSM: AppEnvironmentExtra o --env-file).
 * El `.env` se escribe sin BOM UTF-8 (nunca con PowerShell Set-Content).
 */
const Env = z.object({
  DATABASE_URL: z.string().regex(/^mysql:\/\//, 'DATABASE_URL must be a mysql:// URL'),
  VSCAR_DATA_DIR: z.string().min(1),
  VSCAR_LOG_DIR: z.string().min(1).optional(),
  WORKER_POLL_MS: z.coerce.number().int().min(250).max(600_000).default(10_000),
  WORKER_ID: z.string().min(1).max(128).optional(),
  WORKER_STALE_LOCK_MIN: z.coerce.number().int().min(1).max(1_440).default(30),
  WORKER_HEARTBEAT_MS: z.coerce.number().int().min(1_000).default(30_000),
  WORKER_HEALTH_HOST: z.string().default('127.0.0.1'),
  /** 0 desactiva el endpoint de salud. */
  WORKER_HEALTH_PORT: z.coerce.number().int().min(0).max(65_535).default(8180),
  EEA_BASE_URL: z.string().url().default('https://discodata.eea.europa.eu/sql'),
  EEA_TIMEOUT_MS: z.coerce.number().int().min(1_000).max(600_000).default(60_000),
  MITECO_BASE_URL: z.string().url().default('https://sedeaplicaciones.minetur.gob.es/ServiciosRESTCarburantes/PreciosCarburantes'),
  MITECO_TIMEOUT_MS: z.coerce.number().int().min(1_000).max(600_000).default(180_000),
  ESIOS_BASE_URL: z.string().url().default('https://api.esios.ree.es'),
  ESIOS_TIMEOUT_MS: z.coerce.number().int().min(1_000).max(600_000).default(60_000),
  /** Token personal de ESIOS (opcional: el archivo PVPC es público). Secreto: nunca se registra. */
  ESIOS_TOKEN: z.string().optional(),
});

export interface WorkerConfig {
  databaseUrl: string;
  dataDir: string;
  rawDir: string;
  logDir: string;
  pollMs: number;
  workerId: string;
  staleLockMinutes: number;
  heartbeatMs: number;
  health: { host: string; port: number };
  eea: { baseUrl: string; timeoutMs: number };
  miteco: { baseUrl: string; timeoutMs: number };
  esios: { baseUrl: string; timeoutMs: number; token?: string };
  /** Valores que nunca pueden aparecer en logs ni en `jobs.last_error`. */
  secrets: string[];
}

function dbPassword(url: string): string | undefined {
  try {
    return decodeURIComponent(new URL(url).password) || undefined;
  } catch {
    return undefined;
  }
}

export function loadConfig(env: NodeJS.ProcessEnv = process.env): WorkerConfig {
  const e = Env.parse(env);
  return {
    databaseUrl: e.DATABASE_URL,
    dataDir: e.VSCAR_DATA_DIR,
    rawDir: join(e.VSCAR_DATA_DIR, 'raw'),
    logDir: e.VSCAR_LOG_DIR ?? join(e.VSCAR_DATA_DIR, '..', 'logs'),
    pollMs: e.WORKER_POLL_MS,
    workerId: e.WORKER_ID ?? `${hostname()}-${process.pid}`,
    staleLockMinutes: e.WORKER_STALE_LOCK_MIN,
    heartbeatMs: e.WORKER_HEARTBEAT_MS,
    health: { host: e.WORKER_HEALTH_HOST, port: e.WORKER_HEALTH_PORT },
    eea: { baseUrl: e.EEA_BASE_URL, timeoutMs: e.EEA_TIMEOUT_MS },
    miteco: { baseUrl: e.MITECO_BASE_URL, timeoutMs: e.MITECO_TIMEOUT_MS },
    esios: { baseUrl: e.ESIOS_BASE_URL, timeoutMs: e.ESIOS_TIMEOUT_MS, ...(e.ESIOS_TOKEN?.trim() ? { token: e.ESIOS_TOKEN.trim() } : {}) },
    secrets: [e.ESIOS_TOKEN?.trim(), dbPassword(e.DATABASE_URL)].filter((s): s is string => !!s),
  };
}
