import { NextResponse, type NextRequest } from 'next/server';
import { INTERNAL_HEADERS, INTERNAL_REALM, checkInternalAuth, internalAuthEnabled, internalAuthEnv, internalTransportOk } from './server/internal-auth';

/**
 * Proxy (Next 16, antes `middleware`) — solo para `/internal/*` (Step D1.6). Sin credenciales configuradas la ruta
 * no existe (404); con credenciales, HTTP Basic obligatorio. La página vuelve a comprobarlo (defensa en profundidad).
 */
export function proxy(request: NextRequest) {
  const env = internalAuthEnv();
  if (!internalAuthEnabled(env)) return new NextResponse('Not Found', { status: 404, headers: INTERNAL_HEADERS });
  // Step D1.6a: sin HTTPS (fuera de loopback) no se pide la contraseña: no hay desafío Basic que el navegador conteste en claro.
  const hd = (k: string) => request.headers.get(k);
  const transport = { host: hd('host'), 'x-forwarded-proto': hd('x-forwarded-proto'), 'x-forwarded-host': hd('x-forwarded-host'), 'x-forwarded-for': hd('x-forwarded-for'), forwarded: hd('forwarded') };
  if (!internalTransportOk(request.nextUrl, transport)) return new NextResponse('HTTPS required', { status: 403, headers: INTERNAL_HEADERS });
  const result = checkInternalAuth(request.headers.get('authorization'), env);
  if (result === 'unauthorized') return new NextResponse('Authentication required', { status: 401, headers: { ...INTERNAL_HEADERS, 'WWW-Authenticate': `Basic realm="${INTERNAL_REALM}", charset="UTF-8"` } });
  const res = NextResponse.next();
  for (const [k, v] of Object.entries(INTERNAL_HEADERS)) res.headers.set(k, v);
  return res;
}

export const config = { matcher: ['/internal/:path*'] };
