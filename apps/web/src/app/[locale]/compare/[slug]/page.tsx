import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { ChapterIndex, type ChapterItem } from '@/components/compare/ChapterIndex';
import { DecisionChapters } from '@/components/compare/DecisionChapters';
import { HeroVs } from '@/components/compare/HeroVs';
import { LiveDecision } from '@/components/compare/LiveDecision';
import { ScenarioSheetHost } from '@/components/scenario/ScenarioSheetHost';
import { SiteFooter } from '@/components/site/SiteFooter';
import { SiteHeader } from '@/components/site/SiteHeader';
import { ScrollChoreography } from '@/components/visual/ScrollChoreography';
import { COMPARISONS, comparisonFor } from '@/domain/comparisons';
import { parseScenarioFromSearchParams, serializeScenario } from '@/domain/scenario';
import { serverDecisionView } from '@/domain/server-decision';
import { metricLabel } from '@/i18n/engine-messages';
import { LOCALES, parseLocaleSegment } from '@/i18n/locales';
import { localeAlternates } from '@/i18n/metadata';
import { localizedHref, routePath } from '@/i18n/routes';
import { useI18n } from '@/i18n/use-i18n';
import type { Scenario } from '@/domain/scenario';
import type { DecisionView } from '@/domain/view-model';

type Params = Promise<{ locale: string; slug: string }>;
type Search = Promise<Record<string, string | string[] | undefined>>;

export const dynamicParams = false;
export function generateStaticParams() {
  return LOCALES.flatMap((l) => Object.values(COMPARISONS).filter((c) => c.market === l.market).map((c) => ({ locale: l.segment, slug: c.slug })));
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { locale: segment, slug } = await params;
  const locale = parseLocaleSegment(segment);
  const def = locale && comparisonFor(slug, locale.market);
  if (!locale || !def) return {};
  const t = await getTranslations({ locale: locale.segment });
  const [a, b] = def.vehicles;
  return {
    title: t('comparison.metaTitle', { a: a.name, b: b.name }),
    description: t('comparison.metaDescription', { a: a.name, b: b.name, market: t(`markets.${locale.market}`) }),
    alternates: localeAlternates(locale, { page: 'compare', slug }),
    // Fundación SEO solamente: la indexación real llega con el quality gate (Plan §30).
    robots: { index: false, follow: true },
  };
}

export default async function ComparePage({ params, searchParams }: { params: Params; searchParams: Search }) {
  const { locale: segment, slug } = await params;
  const locale = parseLocaleSegment(segment);
  if (!locale) notFound();
  setRequestLocale(locale.segment);
  const def = comparisonFor(slug, locale.market);
  if (!def) notFound();
  const { scenario, invalid } = parseScenarioFromSearchParams(await searchParams);
  const { view } = serverDecisionView(def, scenario);
  return <CompareView view={view} scenario={scenario} invalid={invalid} slug={slug} />;
}

function CompareView({ view, scenario, invalid, slug }: { view: DecisionView; scenario: Scenario; invalid: string[]; slug: string }) {
  const i18n = useI18n();
  const { t, locale } = i18n;
  const pathname = localizedHref(locale, { page: 'compare', slug });
  const labels: Record<string, string> = Object.fromEntries(['vs', 'result', 'reason', 'economics', 'tradeoffs', 'change', 'confidence', 'details'].map((k) => [k, t(`comparison.chapters.${k}`)]));
  const chapterItems: ChapterItem[] = view.chapters.map((c) => ({ id: c.id, label: c.kind === 'reason' && c.metric ? metricLabel(t, c.metric) : (labels[c.kind] ?? c.id) }));
  return (
    <>
      <SiteHeader route={{ page: 'compare', slug }} search={serializeScenario(scenario)} />
      <main id="main" className="compare" data-route={routePath({ page: 'compare', slug })}>
        <HeroVs view={view} i18n={i18n} />
        <ChapterIndex initial={chapterItems} labels={labels} title={t('navigation.chapterIndex')} />
        {invalid.length ? (
          <p className="notice" role="status">
            {t('errors.invalidScenario', { fields: invalid.join(', ') })}
          </p>
        ) : null}
        <LiveDecision initialView={view} initialScenario={scenario} pathname={pathname} slug={slug} locale={locale.segment} language={locale.language} labels={{ recalculating: t('scenario.recalculating') }}>
          <DecisionChapters view={view} scenario={scenario} pathname={pathname} />
        </LiveDecision>
      </main>
      <SiteFooter />
      <ScenarioSheetHost pathname={pathname} slug={slug} locale={locale.segment} language={locale.language} />
      <ScrollChoreography />
    </>
  );
}
