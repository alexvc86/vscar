import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { SiteFooter } from '@/components/site/SiteFooter';
import { SiteHeader } from '@/components/site/SiteHeader';
import { VehicleVisual } from '@/components/vehicle/VehicleVisual';
import { HeroAtmosphere } from '@/components/visual/HeroAtmosphere';
import { CompareBuilder } from '@/components/catalog/CompareBuilder';
import { optionText, pairLabels, selectorLabels } from '@/components/catalog/labels';
import { pairSlug, type VehicleOption } from '@/domain/catalog';
import { DEFAULT_LOCALE, parseLocaleSegment, type MarketCode } from '@/i18n/locales';
import { localeAlternates } from '@/i18n/metadata';
import { localizedHref } from '@/i18n/routes';
import { useI18n } from '@/i18n/use-i18n';
import { vehicleCatalog } from '@/server/catalog';

type Params = Promise<{ locale: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const locale = parseLocaleSegment((await params).locale) ?? DEFAULT_LOCALE;
  const t = await getTranslations({ locale: locale.segment });
  return { title: `VScar — ${t('home.title')}`, description: t('home.lead'), alternates: localeAlternates(locale, { page: 'home' }), robots: { index: false, follow: true } };
}

/** Ejemplos del catálogo real: se revalidan (ISR) para seguir los cambios de datos sin recalcular en cada visita. */
export const revalidate = 60;

/** Comparaciones de ejemplo SOLO si ambas variants están en el catálogo del canal. Sin base de datos: ninguna. */
async function examplesFor(market: MarketCode): Promise<{ a: VehicleOption; b: VehicleOption }[]> {
  try {
    return await vehicleCatalog().examples(market);
  } catch {
    return [];
  }
}

export default async function HomePage({ params }: { params: Params }) {
  const locale = parseLocaleSegment((await params).locale) ?? DEFAULT_LOCALE;
  setRequestLocale(locale.segment);
  return <Home examples={await examplesFor(locale.market)} />;
}

function Home({ examples }: { examples: { a: VehicleOption; b: VehicleOption }[] }) {
  const i18n = useI18n();
  const { t, locale } = i18n;
  const sel = selectorLabels(i18n);
  const pair = pairLabels(i18n);
  return (
    <>
      <SiteHeader route={{ page: 'home' }} />
      <main id="main" className="home">
        <section className="home__hero" aria-labelledby="home-title">
          <div className="atmosphere atmosphere--hero" aria-hidden="true">
            <HeroAtmosphere />
          </div>
          <div className="home__inner">
            <h1 id="home-title" className="home__title">
              {t('home.title')}
            </h1>
            <p className="home__lead">{t('home.lead')}</p>
            <p>
              <a className="vs-button vs-button--solid vs-button--lg" href="#compare" data-testid="home-cta" data-open-picker="">
                {t('home.cta')}
              </a>
            </p>
            <p className="muted small">
              {t('home.demoNote')} · {t(`markets.${locale.market}`)}
            </p>
            <div className="home__vehicles" aria-hidden="true">
              {(['a', 'b'] as const).map((side) => (
                <div key={side} className={`home__vehicle home__vehicle--${side} vehicle-entry`}>
                  <VehicleVisual side={side} lit={0.6} idPrefix={`home-${side}`} label="" />
                </div>
              ))}
            </div>
          </div>
        </section>
        <section id="compare" className="home__compare" aria-labelledby="compare-title">
          <h2 id="compare-title" className="section-title">
            {pair.compareTitle}
          </h2>
          <p className="muted">{pair.compareLead}</p>
          <CompareBuilder locale={locale.segment} market={locale.market} labels={pair} selector={sel} />
          {examples.length ? (
            <div className="home__examples">
              <h3 className="label">{t('catalog.examplesTitle')}</h3>
              <ul className="examples">
                {examples.map(({ a, b }) => {
                  const ta = optionText(a, sel);
                  const tb = optionText(b, sel);
                  return (
                    <li key={`${a.id}-${b.id}`}>
                      <a href={localizedHref(locale, { page: 'compare', slug: pairSlug(a.slug, b.slug) })} data-testid="example-pair">
                        <span className="tone-a">
                          {ta.brand} {ta.name}
                        </span>{' '}
                        <span className="muted">{t('common.vs')}</span>{' '}
                        <span className="tone-b">
                          {tb.brand} {tb.name}
                        </span>
                        <span className="mono small muted examples__meta">
                          {ta.meta} — {tb.meta}
                        </span>
                      </a>
                    </li>
                  );
                })}
              </ul>
              <p className="muted small">{t('catalog.examplesNote')}</p>
            </div>
          ) : null}
        </section>
        <section className="home__pillars" aria-labelledby="pillars-title">
          <h2 id="pillars-title" className="section-title">
            {t('home.pillarsTitle')}
          </h2>
          <ol className="pillars">
            {(['pillar1', 'pillar2', 'pillar3'] as const).map((k, i) => (
              <li key={k}>
                <span className="mono pillars__n">0{i + 1}</span>
                <p>{t(`home.${k}`)}</p>
              </li>
            ))}
          </ol>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
