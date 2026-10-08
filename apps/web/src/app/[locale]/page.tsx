import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { SiteFooter } from '@/components/site/SiteFooter';
import { SiteHeader } from '@/components/site/SiteHeader';
import { VehicleVisual } from '@/components/vehicle/VehicleVisual';
import { HeroAtmosphere } from '@/components/visual/HeroAtmosphere';
import { COMPARISONS, DEMO_SLUG } from '@/domain/comparisons';
import { DEFAULT_LOCALE, parseLocaleSegment } from '@/i18n/locales';
import { localeAlternates } from '@/i18n/metadata';
import { localizedHref } from '@/i18n/routes';
import { useI18n } from '@/i18n/use-i18n';

type Params = Promise<{ locale: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const locale = parseLocaleSegment((await params).locale) ?? DEFAULT_LOCALE;
  const t = await getTranslations({ locale: locale.segment });
  return { title: `VScar — ${t('home.title')}`, description: t('home.lead'), alternates: localeAlternates(locale, { page: 'home' }), robots: { index: false, follow: true } };
}

export default async function HomePage({ params }: { params: Params }) {
  setRequestLocale((parseLocaleSegment((await params).locale) ?? DEFAULT_LOCALE).segment);
  return <Home />;
}

function Home() {
  const { t, locale } = useI18n();
  const demo = COMPARISONS[DEMO_SLUG]!;
  const [a, b] = demo.vehicles;
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
              <a className="vs-button vs-button--solid vs-button--lg" href={localizedHref(locale, { page: 'compare', slug: DEMO_SLUG })}>
                {t('home.cta')}
              </a>
            </p>
            <p className="muted small">
              {t('home.demoNote', { a: a.name, b: b.name })} · {t(`markets.${locale.market}`)}
            </p>
            <div className="home__vehicles" aria-hidden="true">
              {demo.vehicles.map((v) => (
                <div key={v.side} className={`home__vehicle home__vehicle--${v.side} vehicle-entry`}>
                  <VehicleVisual side={v.side} lit={0.6} idPrefix={`home-${v.side}`} label={t('common.genericSilhouette', { name: v.name, body: v.body })} />
                </div>
              ))}
            </div>
          </div>
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
