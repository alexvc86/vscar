import { appendFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Logger JSON-lines por canal y día: <logDir>/<channel>/<channel>-YYYY-MM-DD.log
 * (rotación diaria por nombre; la retención de 14–30 días la aplica una tarea de mantenimiento).
 * Nunca escribe secretos: se enmascaran credenciales en URLs y claves sensibles.
 */
export type Channel = 'worker' | 'eea' | 'miteco' | 'esios';

export interface Logger {
  log(channel: Channel, event: string, data?: Record<string, unknown>): void;
}

const SENSITIVE_KEY = /pass(word)?|secret|token|authorization|cookie|database_url/i;
const CREDENTIALS_IN_URL = /([a-z][a-z0-9+.-]*:\/\/)([^:/@\s]+):([^@\s]+)@/gi;

/** Sustituye cada aparición de un secreto conocido (p. ej. `ESIOS_TOKEN`) aunque llegue dentro de un texto. */
export function scrubSecrets(text: string, secrets: readonly string[] = []): string {
  let out = text;
  for (const s of secrets) if (s && s.length >= 6) out = out.split(s).join('[REDACTED]');
  return out;
}

export function redact(value: unknown, key = '', secrets: readonly string[] = []): unknown {
  if (SENSITIVE_KEY.test(key)) return '[REDACTED]';
  if (typeof value === 'string') return scrubSecrets(value.replace(CREDENTIALS_IN_URL, '$1$2:[REDACTED]@'), secrets);
  if (Array.isArray(value)) return value.map((v) => redact(v, '', secrets));
  if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, redact(v, k, secrets)]));
  return value;
}

export function createFileLogger(logDir: string, opts: { echo?: boolean; secrets?: readonly string[] } = {}): Logger {
  const ensured = new Set<string>();
  return {
    log(channel, event, data = {}) {
      const now = new Date();
      const dir = join(logDir, channel);
      if (!ensured.has(dir)) {
        mkdirSync(dir, { recursive: true });
        ensured.add(dir);
      }
      const line = JSON.stringify({ ts: now.toISOString(), channel, event, ...(redact(data, '', opts.secrets) as object) });
      appendFileSync(join(dir, `${channel}-${now.toISOString().slice(0, 10)}.log`), `${line}\n`, 'utf8');
      if (opts.echo) process.stdout.write(`${line}\n`);
    },
  };
}

/** Logger en memoria para tests. */
export function createMemoryLogger(opts: { secrets?: readonly string[] } = {}): Logger & { lines: { channel: Channel; event: string; data: Record<string, unknown> }[] } {
  const lines: { channel: Channel; event: string; data: Record<string, unknown> }[] = [];
  return { lines, log: (channel, event, data = {}) => lines.push({ channel, event, data: redact(data, '', opts.secrets) as Record<string, unknown> }) };
}
