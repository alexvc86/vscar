import type { Metadata } from 'next';
import { notFound, permanentRedirect } from 'next/navigation';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { selectorLabels } from '@/components/catalog/labels';
import { PairPickerHost } from '@/components/catalog/PairControls';
import { ChapterIndex, type ChapterItem } from '@/components/compare/ChapterIndex';
import { DecisionChapters } from '@/components/compare/DecisionChapters';
import { HeroVs } from '@/components/compare/HeroVs';
import { LiveDecision } from '@/components/compare/LiveDecision';
import { ScenarioSheetHost } from '@/components/scenario/ScenarioSheetHost';
import { SiteFooter } from '@/components/site/SiteFooter';
import { SiteHeader } from '@/components/site/SiteHeader';
import { ScrollChoreography } from '@/components/visual/ScrollChoreography';
import type { ComparisonData } from '@/domain/comparison-data';
import { parseScenarioFromSearchParams, serializeScenario, type Scenario } from '@/domain/scenario';
import type { DecisionView } from '@/domain/view-model';
import { metricLabel } from '@/i18n/engine-messages';
import { parseLocaleSegment } from '@/i18n/locales';
import { localeAlternates } from '@/i18n/metadata';
import { localizedHref, routePath } from '@/i18n/routes';
import { useI18n } from '@/i18n/use-i18n';
import { loadComparisonData, loadComparisonPageData } from '@/server/comparison-loader';
import { CatalogUnavailableError } from '@/server/db';

type Params = Promise<{ locale: string; slug: string }>;
type Search = Promise<Record<string, string | string[] | undefined>>;

/** Par elegido por el usuario: se resuelve por petición contra el catálogo (Step 7b), sin parámetros estáticos. */
export const dynamicParams = true;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { locale: segment, slug } = await params;
  const locale = parseLocaleSegment(segment);
  if (!locale) return {};
  const load = await loadComparisonData(locale.market, slug).catch(() => undefined);
  if (load?.kind !== 'ok') return {};
  const t = await getTranslations({ locale: locale.segment });
  const [a, b] = load.data.vehicles;
  return {
    title: t('comparison.metaTitle', { a: a.label, b: b.label }),
    description: t('comparison.metaDescription', { a: a.label, b: b.label, market: t(`markets.${locale.market}`) }),
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
  const { scenario, invalid } = parseScenarioFromSearchParams(await searchParams);
  let page;
  try {
    page = await loadComparisonPageData({ market: locale.market, slug, scenario });
  } catch (e) {
    // Base de datos caída o sin configurar: error CONTROLADO, sin stack trace (Step 7b §82–83).
    if (e instanceof CatalogUnavailableError) return <CatalogUnavailable />;
    throw e;
  }
  // Alias conocido (URL de la Step 7a o slug renombrado) → canónico, conservando el escenario.
  if (page.kind === 'redirect') permanentRedirect(localizedHref(locale, { page: 'compare', slug: page.pairSlug }, serializeScenario(scenario)));
  // Slug inválido, variant no seleccionable u otro mercado: 404 (mensaje específico de comparación en
  // `[locale]/not-found.tsx`). Nunca otro vehículo en su lugar. Sin `not-found.tsx` en este segmento: Next lo
  // renderiza antes que la página y fijaría el locale de next-intl por defecto para toda la petición.
  if (page.kind === 'not-found') notFound();
  return <CompareView data={page.data} view={page.view} scenario={scenario} invalid={invalid} slug={page.data.pairSlug} />;
}

function CompareView({ data, view, scenario, invalid, slug }: { data: ComparisonData; view: DecisionView; scenario: Scenario; invalid: string[]; slug: string }) {
  const i18n = useI18n();
  const { t, locale } = i18n;
  const pathname = localizedHref(locale, { page: 'compare', slug });
  const labels: Record<string, string> = Object.fromEntries(['vs', 'result', 'reason', 'economics', 'tradeoffs', 'change', 'confidence', 'details'].map((k) => [k, t(`comparison.chapters.${k}`)]));
  const chapterItems: ChapterItem[] = view.chapters.map((c) => ({ id: c.id, label: c.kind === 'reason' && c.metric ? metricLabel(t, c.metric) : (labels[c.kind] ?? c.id) }));
  const [a, b] = data.vehicles;
  return (
    <>
      <SiteHeader route={{ page: 'compare', slug }} search={serializeScenario(scenario)} />
      {/* `key` por par: al cambiar de coche, el estado cliente (recálculo, worker) empieza de cero. */}
      <main id="main" className="compare" data-route={routePath({ page: 'compare', slug })} data-pair={slug} key={slug}>
        <HeroVs view={view} i18n={i18n} search={serializeScenario(scenario)} />
        <ChapterIndex initial={chapterItems} labels={labels} title={t('navigation.chapterIndex')} />
        {invalid.length ? (
          <p className="notice" role="status">
            {t('errors.invalidScenario', { fields: invalid.join(', ') })}
          </p>
        ) : null}
        <LiveDecision initialView={view} initialScenario={scenario} data={data} pathname={pathname} slug={slug} locale={locale.segment} language={locale.language} labels={{ recalculating: t('scenario.recalculating') }}>
          <DecisionChapters view={view} scenario={scenario} pathname={pathname} />
        </LiveDecision>
      </main>
      <SiteFooter />
      <ScenarioSheetHost pathname={pathname} slug={slug} locale={locale.segment} language={locale.language} />
      <PairPickerHost locale={locale.segment} market={locale.market} labels={selectorLabels(i18n)} a={a.option} b={b.option} />
      <ScrollChoreography />
    </>
  );
}

function CatalogUnavailable() {
  const { t, locale } = useI18n();
  return (
    <>
      <SiteHeader route={{ page: 'home' }} />
      <main id="main" className="page page--narrow">
        <h1 className="page__title">{t('catalog.error')}</h1>
        <p className="muted" role="alert">
          {t('catalog.unavailable')}
        </p>
        <p>
          <a className="vs-button vs-button--ghost" href={localizedHref(locale, { page: 'home' })}>
            {t('errors.backHome')}
          </a>
        </p>
      </main>
      <SiteFooter />
    </>
  );
}
