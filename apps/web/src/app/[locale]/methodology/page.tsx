import { ALPHA_DECISION_RULES, METHODOLOGY_VERSION } from '@vscar/methodology';
import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { SiteFooter } from '@/components/site/SiteFooter';
import { SiteHeader } from '@/components/site/SiteHeader';
import { DEFAULT_LOCALE, parseLocaleSegment } from '@/i18n/locales';
import { localeAlternates } from '@/i18n/metadata';
import { serverEnv } from '@/server/env';
import { robotsFor } from '@/server/seo';
import { useI18n } from '@/i18n/use-i18n';

type Params = Promise<{ locale: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const locale = parseLocaleSegment((await params).locale) ?? DEFAULT_LOCALE;
  const t = await getTranslations({ locale: locale.segment });
  return { title: { absolute: t('seo.methodologyTitle') }, description: t('methodology.lead'), alternates: localeAlternates(locale, { page: 'methodology' }), robots: robotsFor(serverEnv().channel, true) };
}

export default async function MethodologyPage({ params }: { params: Params }) {
  setRequestLocale((parseLocaleSegment((await params).locale) ?? DEFAULT_LOCALE).segment);
  return <Methodology />;
}

// Step 7c §80: orden de la decisión, Meaningful Difference, encaje práctico y económico, confianza, rangos.
const SECTIONS = ['order', 'separate', 'meaningful', 'practical', 'economic', 'confidence', 'ranges'] as const;

function Methodology() {
  const { t } = useI18n();
  return (
    <>
      <SiteHeader route={{ page: 'methodology' }} />
      <main id="main" className="page">
        <h1 className="page__title">{t('methodology.title')}</h1>
        <p className="page__lead">{t('methodology.lead')}</p>
        {SECTIONS.map((s) => (
          <section key={s} className="page__section" aria-labelledby={`m-${s}`}>
            <h2 id={`m-${s}`}>{t(`methodology.sections.${s}`)}</h2>
            <p>{t(`methodology.sections.${s}Body`)}</p>
          </section>
        ))}
        <p className="muted small mono">
          Methodology {METHODOLOGY_VERSION} · {ALPHA_DECISION_RULES.version}
        </p>
        <p className="muted small">{t('methodology.rightsNote')}</p>
      </main>
      <SiteFooter />
    </>
  );
}
