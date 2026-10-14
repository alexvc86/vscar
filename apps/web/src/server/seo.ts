import 'server-only';
import type { Metadata, MetadataRoute } from 'next';
import { canonicalPairSlug, INDEXABLE_PAIR_SLUGS } from '@/domain/canonical';
import { parsePairSlug, type VehicleOption } from '@/domain/catalog';
import { LANGUAGES, LOCALES, sameMarketLocales, type AppLocale, type MarketCode } from '@/i18n/locales';
import { localeAlternates } from '@/i18n/metadata';
import { localizedHref, type AppRoute } from '@/i18n/routes';
import type { Translator } from '@/i18n/engine-messages';
import type { VehicleCatalogService } from './catalog-service';

/**
 * Capa SEO (Step 7c, ADR-015). Funciones puras sobre el canal, el par y el locale; las páginas solo las llaman.
 *
 * - canonical: por idioma, SIN escenario y con el par en orden canónico (A-vs-B y B-vs-A → mismo canonical);
 * - hreflang: idiomas del MISMO mercado + `x-default` → idioma por defecto del mercado;
 * - robots: PREVIEW → noindex, nofollow (siempre); PUBLIC → indexable solo si el par es editorial y sus dos coches
 *   son públicos; cualquier otro par es accesible pero `noindex, follow`.
 */

/** Representación de servidor de un par (Step 7c §50). */
export interface ComparisonPair {
  market: MarketCode;
  variantA: VehicleOption;
  variantB: VehicleOption;
  /** Slug en el orden del usuario (la URL que se visita y se comparte). */
  pathSlug: string;
  /** Slug canónico (orden determinista) para canonical, OG url, sitemap. */
  canonicalSlug: string;
}

export function comparisonPair(market: MarketCode, a: VehicleOption, b: VehicleOption, pathSlug: string): ComparisonPair {
  return { market, variantA: a, variantB: b, pathSlug, canonicalSlug: canonicalPairSlug(a, b) };
}

export type Channel = 'PUBLIC' | 'PREVIEW';

export function isIndexablePair(channel: Channel, pair: Pick<ComparisonPair, 'canonicalSlug' | 'variantA' | 'variantB'>): boolean {
  // En PUBLIC solo existen coches públicos (el catálogo ya está filtrado); en PREVIEW nada es indexable.
  return channel === 'PUBLIC' && !pair.variantA.preview && !pair.variantB.preview && INDEXABLE_PAIR_SLUGS.has(pair.canonicalSlug);
}

export function robotsFor(channel: Channel, indexable: boolean): NonNullable<Metadata['robots']> {
  if (channel === 'PREVIEW') return { index: false, follow: false };
  return indexable ? { index: true, follow: true } : { index: false, follow: true };
}

/** canonical por idioma + hreflang del mismo mercado + x-default (implementación única: `localeAlternates`). */
export function alternatesFor(locale: AppLocale, route: AppRoute): NonNullable<Metadata['alternates']> {
  return localeAlternates(locale, route)!;
}

const ogLocale = (l: AppLocale) => `${LANGUAGES[l.language].htmlLang.split('-')[0]}_${l.market}`;

export function comparisonMetadata({ locale, pair, names, t, channel }: { locale: AppLocale; pair: ComparisonPair; names: [string, string]; t: Translator; channel: Channel }): Metadata {
  const [a, b] = names;
  const title = t('seo.compareTitle', { a, b });
  const description = t('seo.compareDescription', { a, b });
  const route: AppRoute = { page: 'compare', slug: pair.canonicalSlug };
  const canonical = localizedHref(locale, route);
  return {
    title: { absolute: title },
    description,
    alternates: alternatesFor(locale, route),
    openGraph: {
      type: 'website',
      siteName: 'VScar',
      title,
      description,
      url: canonical,
      locale: ogLocale(locale),
      alternateLocale: sameMarketLocales(locale)
        .filter((l) => l.segment !== locale.segment)
        .map(ogLocale),
    },
    twitter: { card: 'summary_large_image', title, description },
    robots: robotsFor(channel, isIndexablePair(channel, pair)),
  };
}

/**
 * JSON-LD honesto (§23–24): WebPage + BreadcrumbList + ItemList de los dos coches. Sin Review, rating ni
 * aggregateRating: VScar no tiene valoraciones de usuarios y su resultado no es una reseña.
 */
export function comparisonJsonLd({ locale, pair, names, t, siteUrl }: { locale: AppLocale; pair: ComparisonPair; names: [string, string]; t: Translator; siteUrl: string }) {
  const abs = (path: string) => new URL(path, siteUrl).toString();
  const url = abs(localizedHref(locale, { page: 'compare', slug: pair.canonicalSlug }));
  const car = (o: VehicleOption, position: number) => ({
    '@type': 'ListItem',
    position,
    item: {
      '@type': 'Car',
      name: `${o.brand} ${o.model} ${o.variant}`.trim(),
      brand: { '@type': 'Brand', name: o.brand },
      model: o.model,
      ...(o.year ? { vehicleModelDate: String(o.year) } : {}),
    },
  });
  return {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name: t('seo.compareTitle', { a: names[0], b: names[1] }),
    description: t('seo.compareDescription', { a: names[0], b: names[1] }),
    url,
    inLanguage: LANGUAGES[locale.language].htmlLang,
    isPartOf: { '@type': 'WebSite', name: 'VScar', url: abs(localizedHref(locale, { page: 'home' })) },
    breadcrumb: {
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: t('breadcrumbs.home'), item: abs(localizedHref(locale, { page: 'home' })) },
        { '@type': 'ListItem', position: 2, name: t('breadcrumbs.compare'), item: `${abs(localizedHref(locale, { page: 'home' }))}#compare` },
        { '@type': 'ListItem', position: 3, name: `${names[0]} vs ${names[1]}`, item: url },
      ],
    },
    mainEntity: { '@type': 'ItemList', numberOfItems: 2, itemListElement: [car(pair.variantA, 1), car(pair.variantB, 2)] },
  };
}

/**
 * Sitemap (Step 7c §58–64). PREVIEW: vacío (nunca URLs de fixtures). PUBLIC: páginas estáticas por idioma + SOLO los
 * pares editoriales cuyos dos coches son públicos, con sus alternativas hreflang. Accesible ≠ indexable: los demás
 * pares funcionan y se comparten, pero no entran aquí. Sin catálogo (BD caída) → solo páginas estáticas.
 */
export async function sitemapEntries({ channel, siteUrl, catalog }: { channel: Channel; siteUrl: string; catalog: VehicleCatalogService }): Promise<MetadataRoute.Sitemap> {
  if (channel === 'PREVIEW') return [];
  const abs = (path: string) => new URL(path, siteUrl).toString();
  const entry = (locale: AppLocale, route: AppRoute): MetadataRoute.Sitemap[number] => ({
    url: abs(localizedHref(locale, route)),
    alternates: { languages: Object.fromEntries(sameMarketLocales(locale).map((l) => [l.hreflang, abs(localizedHref(l, route))])) },
  });
  const out: MetadataRoute.Sitemap = [];
  for (const locale of LOCALES) out.push(entry(locale, { page: 'home' }), entry(locale, { page: 'methodology' }));
  for (const market of [...new Set(LOCALES.map((l) => l.market))]) {
    for (const slug of [...INDEXABLE_PAIR_SLUGS].sort()) {
      const pair = parsePairSlug(slug);
      if (!pair) continue;
      try {
        const [a, b] = await Promise.all([catalog.getVariantBySlug(market, pair.a), catalog.getVariantBySlug(market, pair.b)]);
        if (!a || !b || !isIndexablePair(channel, comparisonPair(market, a.option, b.option, slug))) continue;
        for (const locale of LOCALES.filter((l) => l.market === market)) out.push(entry(locale, { page: 'compare', slug: canonicalPairSlug(a.option, b.option) }));
      } catch {
        break; // catálogo no disponible: el sitemap sigue siendo válido con las páginas estáticas
      }
    }
  }
  return out;
}

/** robots.txt: nunca bloquea páginas (los crawlers deben ver el `noindex` de PREVIEW); bloquea la API interna. */
export function robotsTxt(channel: Channel, siteUrl: string): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: '*', allow: '/', disallow: ['/api/'] }],
    ...(channel === 'PUBLIC' ? { sitemap: new URL('/sitemap.xml', siteUrl).toString() } : {}),
  };
}
