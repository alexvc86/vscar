import { ZodError } from 'zod';

/** Error que no debe reintentarse (datos/esquema/configuración): el job pasa a DEAD para revisión. */
export class NonRetryableError extends Error {
  readonly retryable = false;
}

/**
 * Clasificación de errores para la cola:
 * - `retryable === true` (p. ej. RetryableSourceError: red, timeout, HTTP 5xx/429) → reintento con backoff.
 * - ZodError / NonRetryableError / `retryable === false` → no reintentable (DEAD, revisión).
 * - Resto → reintentable, acotado por max_attempts.
 */
export function isRetryable(e: unknown): boolean {
  if (e instanceof ZodError || e instanceof NonRetryableError) return false;
  if (e && typeof e === 'object' && 'retryable' in e) return (e as { retryable: unknown }).retryable === true;
  if (e && typeof e === 'object' && (e as { name?: string }).name === 'ZodError') return false;
  return true;
}

export function errorMessage(e: unknown): string {
  if (e instanceof ZodError) return `validation error: ${e.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ')}`;
  return e instanceof Error ? `${e.name}: ${e.message}` : String(e);
}
