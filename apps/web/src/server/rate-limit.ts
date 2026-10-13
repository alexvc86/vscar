import 'server-only';

/**
 * Límite de peticiones por clave (ventana fija, en memoria del proceso). Suficiente para local/VPS de un solo
 * proceso; con varias instancias se sustituye por uno distribuido (Plan §38) sin cambiar a los llamadores.
 */
const WINDOW_MS = 10_000;
const MAX_PER_WINDOW = 60;
const buckets = new Map<string, { start: number; count: number }>();

export function allowRequest(key: string, now = Date.now()): boolean {
  const b = buckets.get(key);
  if (!b || now - b.start >= WINDOW_MS) {
    buckets.set(key, { start: now, count: 1 });
    if (buckets.size > 10_000) buckets.clear();
    return true;
  }
  b.count += 1;
  return b.count <= MAX_PER_WINDOW;
}
