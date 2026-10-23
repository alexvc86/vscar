import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { MARKETS, type MarketCode } from '@/i18n/locales';
import { vehicleCatalog } from '@/server/catalog';
import { CatalogUnavailableError } from '@/server/db';
import { allowRequest } from '@/server/rate-limit';

/**
 * API INTERNA (Step 7b.2 → D1.8): navegación del selector Marca → Modelo → Año (+ resolución técnica). No es contrato público.
 *   GET /api/catalog/browse?market=ES&level=brands
 *   GET /api/catalog/browse?market=ES&level=models&brand=Volkswagen
 *   GET /api/catalog/browse?market=ES&level=years&brand=Volkswagen&model=Golf
 *   GET /api/catalog/browse?market=ES&level=variants&brand=Volkswagen&model=Golf&year=2018   (year=unknown → sin año)
 *   GET /api/catalog/browse?market=ES&level=configurations&brand=Volkswagen&model=Golf&year=2018   (D1.8, ADR-020)
 * D1.8: en PREVIEW, marcas/modelos/años incluyen homologaciones técnicas DESCUBRIBLES (no comparables), agregadas;
 * nunca ids, TAN ni observaciones de la capa técnica.
 * DTOs mínimos; derechos de datos y de media ya aplicados en el servidor según el canal del despliegue.
 */
export const dynamic = 'force-dynamic';

const name = z.string().trim().min(1).max(64);
const Query = z.discriminatedUnion('level', [
  z.object({ level: z.literal('brands') }),
  z.object({ level: z.literal('models'), brand: name }),
  z.object({ level: z.literal('years'), brand: name, model: name }),
  z.object({ level: z.literal('variants'), brand: name, model: name, year: z.union([z.literal('unknown'), z.coerce.number().int().min(1990).max(2100)]) }),
  z.object({ level: z.literal('configurations'), brand: name, model: name, year: z.union([z.literal('unknown'), z.coerce.number().int().min(1990).max(2100)]) }),
]);
const Market = z.enum(Object.keys(MARKETS) as [MarketCode, ...MarketCode[]]);

export async function GET(request: NextRequest) {
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'local';
  if (!allowRequest(`browse:${ip}`)) return NextResponse.json({ error: 'RATE_LIMITED' }, { status: 429, headers: { 'Retry-After': '10' } });

  const params = Object.fromEntries(request.nextUrl.searchParams);
  const market = Market.safeParse(params.market?.toUpperCase());
  const q = Query.safeParse(params);
  if (!market.success || !q.success) return NextResponse.json({ error: 'INVALID_QUERY' }, { status: 400 });

  const t0 = performance.now();
  try {
    const c = vehicleCatalog();
    const m = market.data;
    const body =
      q.data.level === 'brands'
        ? { brands: await c.listBrands(m) }
        : q.data.level === 'models'
          ? { models: await c.listModels(m, q.data.brand) }
          : q.data.level === 'years'
            ? { years: await c.listModelYears(m, q.data.brand, q.data.model) }
            : q.data.level === 'variants'
              ? { variants: await c.listVariants(m, q.data.brand, q.data.model, q.data.year === 'unknown' ? null : q.data.year) }
              : { resolution: await c.listConfigurations(m, q.data.brand, q.data.model, q.data.year === 'unknown' ? null : q.data.year) };
    return NextResponse.json(
      { market: m, level: q.data.level, channel: c.channel, ...body },
      { headers: { 'Cache-Control': 'private, max-age=30', 'Server-Timing': `catalog;dur=${(performance.now() - t0).toFixed(1)}` } },
    );
  } catch (e) {
    console.error('[catalog] browse failed:', e instanceof CatalogUnavailableError ? 'unavailable' : e instanceof Error ? e.message : e);
    return NextResponse.json({ error: 'CATALOG_UNAVAILABLE' }, { status: 503 });
  }
}
