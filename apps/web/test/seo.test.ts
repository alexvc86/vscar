import { describe, expect, it } from 'vitest';
import { createTranslator } from 'next-intl';
import en from '../messages/en.json';
import es from '../messages/es.json';
import { canonicalPairSlug, canonicalScenario, INDEXABLE_PAIR_SLUGS } from '../src/domain/canonical.ts';
import { pairSlug, type VehicleOption } from '../src/domain/catalog.ts';
import { DEFAULT_SCENARIO } from '../src/domain/scenario.ts';
import type { Translator } from '../src/i18n/engine-messages.ts';
import { parseLocaleSegment } from '../src/i18n/locales.ts';
import { comparisonJsonLd, comparisonMetadata, comparisonPair, isIndexablePair, robotsFor, robotsTxt, sitemapEntries } from '../src/server/seo.ts';
import { memoryCatalog } from './support/catalog.ts';
import { publicSyntheticBundle } from './support/public-synthetic.ts';

/** Step 7c — capa SEO: identidad de página (par + mercado) separada del escenario; indexable ≠ accesible. */
const BYD = 'byd-seal-2026-design-rwd-82-5-kwh';
const M3 = 'tesla-model-3-2021-standard-range-plus-e6r';
const M3_LATE = 'tesla-model-3-2021-standard-range-plus-e6cr';
const SITE = 'https://vscar.example';
const t = (seg: 'es-es' | 'en-es') => createTranslator({ locale: seg, messages: seg === 'es-es' ? es : en }) as unknown as Translator;
const locale = (seg: 'es-es' | 'en-es') => parseLocaleSegment(seg)!;
const opt = async (catalog: ReturnType<typeof memoryCatalog>, slug: string): Promise<VehicleOption> => (await catalog.getVariantBySlug('ES', slug))!.option;

describe('canonical pair and canonical scenario', () => {
  it('A-vs-B and B-vs-A share ONE deterministic canonical (by slug); the UI keeps the user order', () => {
    expect(canonicalPairSlug({ slug: M3 }, { slug: BYD })).toBe(pairSlug(BYD, M3));
    expect(canonicalPairSlug({ slug: BYD }, { slug: M3 })).toBe(pairSlug(BYD, M3));
  });
  it('the Canonical Comparison Scenario is market-specific, versioned and deterministic', () => {
    expect(canonicalScenario('ES')).toEqual({ version: 'ES-2026.10', scenario: DEFAULT_SCENARIO });
  });
  it('indexable pairs are an editorial list, not N² combinations', () => {
    expect(INDEXABLE_PAIR_SLUGS.size).toBeLessThanOrEqual(10);
    expect(INDEXABLE_PAIR_SLUGS.has(pairSlug(BYD, M3))).toBe(true);
  });
});

describe('metadata ES / EN (PREVIEW today)', async () => {
  const c = memoryCatalog('PREVIEW');
  const [byd, m3] = [await opt(c, BYD), await opt(c, M3)];

  it('ES: localized title/description, canonical without scenario, hreflang + x-default, OG + Twitter', () => {
    const md = comparisonMetadata({ locale: locale('es-es'), pair: comparisonPair('ES', m3, byd, pairSlug(M3, BYD)), names: ['Tesla Model 3', 'BYD SEAL'], t: t('es-es'), channel: 'PREVIEW' });
    expect(md.title).toEqual({ absolute: 'Tesla Model 3 vs BYD SEAL — ¿Cuál encaja mejor contigo? | VScar' });
    expect(md.description).toBe('Compara Tesla Model 3 y BYD SEAL en coste, autonomía, prestaciones y uso real. VScar te muestra cuál encaja mejor con tus necesidades y por qué.');
    // Swap: la URL visitada es M3-vs-BYD, el canonical es el orden determinista, y nunca lleva query.
    expect(md.alternates?.canonical).toBe(`/es-es/compare/${BYD}-vs-${M3}`);
    expect(md.alternates?.languages).toEqual({ 'es-ES': `/es-es/compare/${BYD}-vs-${M3}`, 'en-ES': `/en-es/compare/${BYD}-vs-${M3}`, 'x-default': `/es-es/compare/${BYD}-vs-${M3}` });
    expect(md.openGraph).toMatchObject({ type: 'website', siteName: 'VScar', url: `/es-es/compare/${BYD}-vs-${M3}`, locale: 'es_ES', alternateLocale: ['en_ES'] });
    expect(md.twitter).toMatchObject({ card: 'summary_large_image' });
    expect(JSON.stringify(md)).not.toMatch(/km=|trips=|\b[0-9a-f]{8}-[0-9a-f]{4}-/);
  });

  it('EN: own canonical (never canonicalised to ES), connected by hreflang', () => {
    const md = comparisonMetadata({ locale: locale('en-es'), pair: comparisonPair('ES', byd, m3, pairSlug(BYD, M3)), names: ['BYD SEAL', 'Tesla Model 3'], t: t('en-es'), channel: 'PREVIEW' });
    expect(md.title).toEqual({ absolute: 'BYD SEAL vs Tesla Model 3 — Which fits you better? | VScar' });
    expect(md.alternates?.canonical).toBe(`/en-es/compare/${BYD}-vs-${M3}`);
    expect(md.openGraph).toMatchObject({ locale: 'en_ES', alternateLocale: ['es_ES'] });
    expect(JSON.stringify(md)).not.toMatch(/Compara|encaja/);
  });

  it('no absolute winner language in metadata', () => {
    for (const seg of ['es-es', 'en-es'] as const) {
      const md = comparisonMetadata({ locale: locale(seg), pair: comparisonPair('ES', byd, m3, pairSlug(BYD, M3)), names: ['BYD SEAL', 'Tesla Model 3'], t: t(seg), channel: 'PREVIEW' });
      expect(`${JSON.stringify(md.title)} ${md.description}`).not.toMatch(/\b(best car|winner|beats|gana|mejor coche)\b/i);
    }
  });

  it('PREVIEW: noindex, nofollow always (fixtures never indexable)', () => {
    const md = comparisonMetadata({ locale: locale('es-es'), pair: comparisonPair('ES', byd, m3, pairSlug(BYD, M3)), names: ['BYD SEAL', 'Tesla Model 3'], t: t('es-es'), channel: 'PREVIEW' });
    expect(md.robots).toEqual({ index: false, follow: false });
    expect(robotsFor('PREVIEW', true)).toEqual({ index: false, follow: false });
  });
});

describe('PUBLIC (synthetic public catalog): index-ready', async () => {
  const pub = memoryCatalog('PUBLIC', publicSyntheticBundle());
  const [byd, m3, m3late] = [await opt(pub, BYD), await opt(pub, M3), await opt(pub, M3_LATE)];

  it('the synthetic catalog really is public (not preview)', () => {
    expect([byd.preview, m3.preview, m3late.preview]).toEqual([undefined, undefined, undefined]);
  });
  it('curated pair with two public cars → index, follow (both URL orders; personalised views share the canonical)', () => {
    for (const [a, b] of [[byd, m3], [m3, byd]] as const) {
      const md = comparisonMetadata({ locale: locale('es-es'), pair: comparisonPair('ES', a, b, pairSlug(a.slug, b.slug)), names: [a.model, b.model], t: t('es-es'), channel: 'PUBLIC' });
      expect(md.robots).toEqual({ index: true, follow: true });
      expect(md.alternates?.canonical).toBe(`/es-es/compare/${BYD}-vs-${M3}`);
    }
  });
  it('accessible ≠ indexable: a valid but non-curated pair is noindex, follow', () => {
    const pair = comparisonPair('ES', byd, m3late, pairSlug(BYD, M3_LATE));
    expect(isIndexablePair('PUBLIC', pair)).toBe(false);
    expect(comparisonMetadata({ locale: locale('es-es'), pair, names: ['BYD SEAL', 'Tesla Model 3'], t: t('es-es'), channel: 'PUBLIC' }).robots).toEqual({ index: false, follow: true });
  });
  it('sitemap: static pages + ONLY curated public pairs, each with its hreflang alternates', async () => {
    const entries = await sitemapEntries({ channel: 'PUBLIC', siteUrl: SITE, catalog: pub });
    const urls = entries.map((e) => e.url);
    expect(urls).toContain(`${SITE}/es-es/compare/${BYD}-vs-${M3}`);
    expect(urls).toContain(`${SITE}/en-es/compare/${BYD}-vs-${M3}`);
    expect(urls.some((u) => u.includes(M3_LATE))).toBe(false);
    expect(urls.some((u) => u.includes('?'))).toBe(false);
    const pairEntry = entries.find((e) => e.url === `${SITE}/es-es/compare/${BYD}-vs-${M3}`)!;
    expect(pairEntry.alternates?.languages).toEqual({ 'es-ES': `${SITE}/es-es/compare/${BYD}-vs-${M3}`, 'en-ES': `${SITE}/en-es/compare/${BYD}-vs-${M3}` });
  });
});

describe('sitemap and robots.txt per channel (real catalog)', () => {
  it('PREVIEW: empty sitemap (no fixture URLs)', async () => {
    expect(await sitemapEntries({ channel: 'PREVIEW', siteUrl: SITE, catalog: memoryCatalog('PREVIEW') })).toEqual([]);
  });
  it('PUBLIC with today’s empty public catalog: valid sitemap with static pages only, no error', async () => {
    const urls = (await sitemapEntries({ channel: 'PUBLIC', siteUrl: SITE, catalog: memoryCatalog('PUBLIC') })).map((e) => e.url);
    expect(urls.sort()).toEqual([`${SITE}/en-es`, `${SITE}/en-es/methodology`, `${SITE}/es-es`, `${SITE}/es-es/methodology`]);
  });
  it('robots.txt never blocks pages (crawlers must see noindex); API disallowed; sitemap only in PUBLIC', () => {
    expect(robotsTxt('PUBLIC', SITE)).toEqual({ rules: [{ userAgent: '*', allow: '/', disallow: ['/api/'] }], sitemap: `${SITE}/sitemap.xml` });
    expect(robotsTxt('PREVIEW', SITE)).toEqual({ rules: [{ userAgent: '*', allow: '/', disallow: ['/api/'] }] });
  });
});

describe('structured data: honest schema only', async () => {
  const c = memoryCatalog('PREVIEW');
  const [byd, m3] = [await opt(c, BYD), await opt(c, M3)];
  const ld = comparisonJsonLd({ locale: locale('es-es'), pair: comparisonPair('ES', byd, m3, pairSlug(BYD, M3)), names: ['BYD SEAL', 'Tesla Model 3'], t: t('es-es'), siteUrl: SITE });
  it('WebPage + BreadcrumbList + ItemList of the two cars, canonical absolute URL', () => {
    expect(ld['@type']).toBe('WebPage');
    expect(ld.url).toBe(`${SITE}/es-es/compare/${BYD}-vs-${M3}`);
    expect(ld.breadcrumb.itemListElement.map((i) => i.name)).toEqual(['Inicio', 'Comparar', 'BYD SEAL vs Tesla Model 3']);
    expect(ld.mainEntity.itemListElement.map((i) => i.item.brand.name)).toEqual(['BYD', 'Tesla']);
  });
  it('never Review, rating or aggregateRating (VScar has no ratings and its result is not a review)', () => {
    expect(JSON.stringify(ld)).not.toMatch(/Review|[Rr]ating/);
  });
});
