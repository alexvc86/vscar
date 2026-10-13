import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { SEARCH_LIMIT, SEARCH_MAX_CHARS } from '@/domain/catalog';
import { MARKETS, type MarketCode } from '@/i18n/locales';
import { vehicleCatalog } from '@/server/catalog';
import { CatalogUnavailableError } from '@/server/db';
import { allowRequest } from '@/server/rate-limit';

/**
 * API INTERNA de la web (Step 7b §85–86), no contrato público: búsqueda del selector de vehículos.
 *   GET /api/catalog/search?market=ES&q=golf
 * Route Handler (no Server Action): GET cacheable, independiente de la URL de la página y del idioma
 * (el catálogo depende del mercado, nunca del idioma), y extraíble a la futura API v1.
 * Respuesta mínima: identidad comercial de cada ReferenceVariant seleccionable; sin specs ni precios.
 */
export const dynamic = 'force-dynamic';

const Query = z.object({
  market: z.enum(Object.keys(MARKETS) as [MarketCode, ...MarketCode[]]),
  q: z.string().max(SEARCH_MAX_CHARS).default(''),
  limit: z.coerce.number().int().min(1).max(SEARCH_LIMIT).default(SEARCH_LIMIT),
});

export async function GET(request: NextRequest) {
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'local';
  if (!allowRequest(`search:${ip}`)) return NextResponse.json({ error: 'RATE_LIMITED' }, { status: 429, headers: { 'Retry-After': '10' } });

  const params = Object.fromEntries(request.nextUrl.searchParams);
  const parsed = Query.safeParse({ market: params.market?.toUpperCase(), q: params.q, limit: params.limit });
  if (!parsed.success) return NextResponse.json({ error: 'INVALID_QUERY' }, { status: 400 });

  const t0 = performance.now();
  try {
    const r = await vehicleCatalog().searchVehicles(parsed.data.market, parsed.data.q, parsed.data.limit);
    const results = r.results.map((o) => ({
      id: o.id,
      slug: o.slug,
      brand: o.brand,
      model: o.model,
      variant: o.variant,
      year: o.year,
      powertrainType: o.powertrainType,
      bodyType: o.bodyType,
      ...(o.period ? { period: o.period } : {}),
      ...(o.preview ? { preview: true } : {}),
    }));
    return NextResponse.json(
      { market: parsed.data.market, query: r.query, mode: r.mode, results },
      { headers: { 'Cache-Control': 'private, max-age=30', 'Server-Timing': `catalog;dur=${(performance.now() - t0).toFixed(1)}` } },
    );
  } catch (e) {
    // Nunca un stack trace al cliente: error controlado (el selector muestra "No pudimos cargar el catálogo").
    if (e instanceof CatalogUnavailableError) console.error('[catalog] unavailable:', e.cause instanceof Error ? e.cause.message : e.cause);
    else console.error('[catalog] search failed:', e instanceof Error ? e.message : e);
    return NextResponse.json({ error: 'CATALOG_UNAVAILABLE' }, { status: 503 });
  }
}
