import 'server-only';
import { createHash, timingSafeEqual } from 'node:crypto';

/**
 * Step D1.6 — autorización de las rutas internas (`/internal/*`). `noindex` NO es control de acceso: estas rutas
 * exigen HTTP Basic con credenciales de entorno y fallan cerradas.
 *
 * - `VSCAR_INTERNAL_USER` + `VSCAR_INTERNAL_PASSWORD` (≥ 16 caracteres) definidos → se exige Basic.
 * - Sin credenciales (o contraseña corta) → la ruta NO existe (404): nunca se abre por omisión.
 * - Solo en el canal PREVIEW: un despliegue PUBLIC no expone la capa técnica aunque haya credenciales.
 * - Step D1.6a: HTTP Basic solo viaja cifrado. Fuera de loopback, una petición en HTTP plano recibe 403 SIN desafío
 *   (el navegador nunca llega a enviar la contraseña en claro); detrás de un proxy TLS cuenta `X-Forwarded-Proto: https`.
 * Se usa en `proxy.ts` y otra vez dentro de la página (defensa en profundidad).
 */
export type InternalAuthResult = 'ok' | 'unauthorized' | 'disabled';
export const INTERNAL_REALM = 'VScar internal';
export const MIN_INTERNAL_PASSWORD = 16;

export interface InternalAuthEnv {
  VSCAR_INTERNAL_USER?: string | undefined;
  VSCAR_INTERNAL_PASSWORD?: string | undefined;
  VSCAR_PUBLICATION_CHANNEL?: string | undefined;
}

// Step D1.6a: se comparan resúmenes SHA-256 (longitud fija) para que el tiempo no revele la longitud de usuario/contraseña.
const digest = (s: string) => createHash('sha256').update(s, 'utf8').digest();
const same = (a: string, b: string) => timingSafeEqual(digest(a), digest(b));

const LOOPBACK = new Set(['localhost', '127.0.0.1', '[::1]', '::1']);
/** Cabeceras de la petición que intervienen en la regla de transporte. */
export interface TransportHeaders {
  host?: string | null;
  'x-forwarded-proto'?: string | null;
  'x-forwarded-host'?: string | null;
  'x-forwarded-for'?: string | null;
  forwarded?: string | null;
}
const loopbackIp = (ip: string) => /^(127\.\d+\.\d+\.\d+|::1|::ffff:127\.\d+\.\d+\.\d+)$/i.test(ip.trim());
/**
 * ¿Transporte aceptable para HTTP Basic? HTTPS directo o tras un proxy TLS (`X-Forwarded-Proto: https`); o, en HTTP
 * plano, solo una petición LOCAL: host de loopback (cabecera `Host`; Next no la refleja en la URL) Y cliente de
 * loopback (primer `X-Forwarded-For`, que el servidor de Next rellena con la IP del socket y que un proxy inverso
 * rellena con la IP real del cliente). Así un proxy sin TLS que reenvía a localhost no hereda la exención local.
 */
export function internalTransportOk(url: URL, h: TransportHeaders): boolean {
  if (url.protocol === 'https:') return true;
  if ((h['x-forwarded-proto'] ?? '').split(',')[0]!.trim().toLowerCase() === 'https') return true;
  if (h.forwarded) return false;
  const host = (h.host ?? url.host).trim().toLowerCase();
  const hostname = host.startsWith('[') ? host.slice(0, host.indexOf(']') + 1) : host.split(':')[0]!;
  const client = (h['x-forwarded-for'] ?? '').split(',')[0]!;
  return LOOPBACK.has(hostname) && (client === '' || loopbackIp(client));
}

/** Lee solo las tres variables necesarias (nunca el resto del entorno). */
export const internalAuthEnv = (e: NodeJS.ProcessEnv = process.env): InternalAuthEnv => ({ VSCAR_INTERNAL_USER: e.VSCAR_INTERNAL_USER, VSCAR_INTERNAL_PASSWORD: e.VSCAR_INTERNAL_PASSWORD, VSCAR_PUBLICATION_CHANNEL: e.VSCAR_PUBLICATION_CHANNEL });

export function internalAuthEnabled(env: InternalAuthEnv): boolean {
  const user = env.VSCAR_INTERNAL_USER?.trim();
  const pass = env.VSCAR_INTERNAL_PASSWORD ?? '';
  return (env.VSCAR_PUBLICATION_CHANNEL ?? 'PUBLIC') === 'PREVIEW' && !!user && pass.length >= MIN_INTERNAL_PASSWORD;
}

export function checkInternalAuth(authorization: string | null | undefined, env: InternalAuthEnv): InternalAuthResult {
  if (!internalAuthEnabled(env)) return 'disabled';
  const m = /^Basic\s+([A-Za-z0-9+/=]+)$/.exec((authorization ?? '').trim());
  if (!m) return 'unauthorized';
  let decoded: string;
  try {
    decoded = Buffer.from(m[1]!, 'base64').toString('utf8');
  } catch {
    return 'unauthorized';
  }
  const i = decoded.indexOf(':');
  if (i < 0) return 'unauthorized';
  const user = decoded.slice(0, i);
  const pass = decoded.slice(i + 1);
  // Comparar ambos siempre (sin cortocircuito) para no filtrar cuál falla.
  const okUser = same(user, env.VSCAR_INTERNAL_USER!.trim());
  const okPass = same(pass, env.VSCAR_INTERNAL_PASSWORD!);
  return okUser && okPass ? 'ok' : 'unauthorized';
}

/** Cabeceras de toda respuesta interna: nunca indexable, nunca en caché compartida. */
export const INTERNAL_HEADERS: Readonly<Record<string, string>> = { 'X-Robots-Tag': 'noindex, nofollow, noarchive', 'Cache-Control': 'private, no-store' };
