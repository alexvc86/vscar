import type { Metadata } from 'next';
import { notFound, permanentRedirect } from 'next/navigation';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { selectorLabels, usedLabels } from '@/components/catalog/labels';
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
import { hasUsed, joinQuery, pairConditionsKey, parsePairConditions, serializePairConditions, swapPair, todayIn } from '@/domain/used-params';
import { withDisplayNames, type DecisionView } from '@/domain/view-model';
import { metricLabel } from '@/i18n/engine-messages';
import { MARKETS, parseLocaleSegment, type MarketCode } from '@/i18n/locales';
import { localizedHref, routePath } from '@/i18n/routes';
import { displayName, participantNames, useI18n } from '@/i18n/use-i18n';
import { vehicleCatalog } from '@/server/catalog';
import { loadComparisonData, loadComparisonPageData } from '@/server/comparison-loader';
import { CatalogUnavailableError } from '@/server/db';
import { serverEnv } from '@/server/env';
import { comparisonJsonLd, comparisonMetadata, comparisonPair, robotsFor } from '@/server/seo';
import { ArrivalFocus } from '@/components/compare/ArrivalFocus';
import { Breadcrumbs, VehicleRail } from '@/components/compare/PageChrome';
import type { Translator } from '@/i18n/engine-messages';

type Params = Promise<{ locale: string; slug: string }>;
type Search = Promise<Record<string, string | string[] | undefined>>;

/** Par elegido por el usuario: se resuelve por petición contra el catálogo (Step 7b), sin parámetros estáticos. */
export const dynamicParams = true;

export async function generateMetadata({ params, searchParams }: { params: Params; searchParams: Search }): Promise<Metadata> {
  const { locale: segment, slug } = await params;
  const locale = parseLocaleSegment(segment);
  if (!locale) return {};
  const { channel } = serverEnv();
  // Step 8b: una vista con hechos de unidades usadas introducidos por el usuario NUNCA es indexable (ni en PUBLIC);
  // la metadata (título, canonical, OG) sigue siendo la del par base y no contiene esos hechos.
  const { pair } = parsePairConditions(await searchParams, todayIn(MARKETS[locale.market].timeZone));
  // Step 8c (corrección): la metadata se carga CON las condiciones de la URL. Sin ellas, Golf nuevo vs Golf usado (misma
  // variant) daba SAME_VEHICLE y la página salía sin título, descripción ni Open Graph.
  const load = await loadComparisonData(locale.market, slug, vehicleCatalog(), pair).catch(() => undefined);
  if (hasUsed(pair)) return usedViewMetadata(locale, slug, load, channel);
  // Par inválido o catálogo caído: la página da 404 / error controlado; nunca indexable.
  if (load?.kind !== 'ok') return { robots: robotsFor(channel, false) };
  const t = (await getTranslations({ locale: locale.segment })) as unknown as Translator;
  const [a, b] = load.data.vehicles;
  // Identidad de la página = par + mercado: título, canonical, hreflang y OG NO dependen del escenario (query).
  return comparisonMetadata({ locale, pair: comparisonPair(locale.market, a.option, b.option, slug), names: [a.label, b.label], t, channel });
}

/**
 * Vista personalizada con unidades usadas: `noindex` siempre; título y OG del par base (sin hechos de la unidad).
 * Misma variant en los dos lados (Golf nuevo vs Golf usado): no existe comparación base, así que no hay canonical.
 */
async function usedViewMetadata(locale: NonNullable<ReturnType<typeof parseLocaleSegment>>, slug: string, load: Awaited<ReturnType<typeof loadComparisonData>> | undefined, channel: 'PUBLIC' | 'PREVIEW'): Promise<Metadata> {
  const robots = robotsFor(channel, false);
  if (load?.kind !== 'ok') return { robots };
  const t = (await getTranslations({ locale: locale.segment })) as unknown as Translator;
  const [a, b] = load.data.vehicles;
  const names = participantNames({ sameVariant: a.option.id === b.option.id, candidates: load.data.vehicles.map((v) => ({ side: v.side, name: v.label, condition: v.condition, option: v.option })) }, t);
  const base = comparisonMetadata({ locale, pair: comparisonPair(locale.market, a.option, b.option, slug), names: [names[a.label] ?? a.label, names[b.label] ?? b.label], t, channel });
  if (a.option.id !== b.option.id) return { ...base, robots };
  // Sin par base: ni canonical/hreflang ni og:url (apuntarían a una página nuevo-vs-nuevo que no existe).
  const { alternates: _alt, openGraph, ...rest } = base;
  const { url: _url, ...og } = (openGraph ?? {}) as Record<string, unknown>;
  return { ...rest, openGraph: og as Metadata['openGraph'], robots };
}

export default async function ComparePage({ params, searchParams }: { params: Params; searchParams: Search }) {
  const { locale: segment, slug } = await params;
  const locale = parseLocaleSegment(segment);
  if (!locale) notFound();
  setRequestLocale(locale.segment);
  const search = await searchParams;
  const { scenario, invalid: invalidScenario } = parseScenarioFromSearchParams(search);
  const { pair: conditions, invalid: invalidUsed } = parsePairConditions(search, todayIn(MARKETS[locale.market].timeZone));
  const invalid = [...invalidScenario, ...invalidUsed];
  const today = todayIn(MARKETS[locale.market].timeZone);
  let page;
  try {
    page = await loadComparisonPageData({ market: locale.market, slug, scenario, conditions });
  } catch (e) {
    // Base de datos caída o sin configurar: error CONTROLADO, sin stack trace (Step 7b §82–83).
    if (e instanceof CatalogUnavailableError) return <CatalogUnavailable />;
    throw e;
  }
  // Alias conocido (URL de la Step 7a o slug renombrado) → canónico, conservando el escenario.
  if (page.kind === 'redirect') permanentRedirect(localizedHref(locale, { page: 'compare', slug: page.pairSlug }, joinQuery(serializeScenario(scenario), conditions)));
  // Slug inválido, variant no seleccionable u otro mercado: 404 (mensaje específico de comparación en
  // `[locale]/not-found.tsx`). Nunca otro vehículo en su lugar. Sin `not-found.tsx` en este segmento: Next lo
  // renderiza antes que la página y fijaría el locale de next-intl por defecto para toda la petición.
  if (page.kind === 'not-found') notFound();
  const update = await evaluationUpdate(locale.market, slug, scenario, page, today, search.prev_eval);
  return <CompareView data={page.data} view={page.view} scenario={scenario} invalid={invalid} slug={page.data.pairSlug} today={today} update={update} />;
}

type UpdateSummary = { from: string; to: string; changes: ('result' | 'practical' | 'information' | 'signals')[] };

/**
 * Step 8c — tras "Actualizar análisis a hoy" (`prev_eval` = fecha anterior): la MISMA comparación con la fecha anterior,
 * por el mismo pipeline, para explicar qué ha cambiado (resultado, encaje práctico, información o señales de la unidad).
 * Nunca se recalcula nada al abrir un enlace antiguo: solo cuando el usuario lo pide.
 */
async function evaluationUpdate(market: MarketCode, slug: string, scenario: Scenario, page: Extract<Awaited<ReturnType<typeof loadComparisonPageData>>, { kind: 'ok' }>, today: string, raw: string | string[] | undefined): Promise<UpdateSummary | undefined> {
  const prev = Array.isArray(raw) ? raw[0] : raw;
  const current = page.data.evaluationDate;
  if (!prev || !current || !/^\d{4}-\d{2}-\d{2}$/.test(prev) || prev >= current || prev > today) return undefined;
  const old = await loadComparisonPageData({ market, slug, scenario, conditions: { ...page.data.conditions, evaluationDate: prev } }).catch(() => undefined);
  if (!old || old.kind !== 'ok') return undefined;
  const a = old.view;
  const b = page.view;
  const sides = ['a', 'b'] as const;
  const keys = (v: typeof a, side: 'a' | 'b') => [...(v.used?.[side]?.signals.attention ?? []), ...(v.used?.[side]?.signals.gaps ?? [])].map((m) => m.messageKey).join(',');
  const changes: UpdateSummary['changes'] = [];
  if (a.status !== b.status || a.selected !== b.selected) changes.push('result');
  if (sides.some((x) => a.practical[x].status !== b.practical[x].status)) changes.push('practical');
  if (sides.some((x) => a.used?.[x]?.information.level !== b.used?.[x]?.information.level)) changes.push('information');
  if (sides.some((x) => keys(a, x) !== keys(b, x))) changes.push('signals');
  return { from: prev, to: current, changes };
}

function CompareView({ data, view: engineView, scenario, invalid, slug, today, update }: { data: ComparisonData; view: DecisionView; scenario: Scenario; invalid: string[]; slug: string; today: string; update?: UpdateSummary | undefined }) {
  const i18n = useI18n(engineView);
  // Step 8c: nombres de presentación para hero, barra, migas (los capítulos reciben la vista del engine y hacen lo mismo).
  const view = withDisplayNames(engineView, i18n.names);
  const { t, locale } = i18n;
  const pathname = localizedHref(locale, { page: 'compare', slug });
  const labels: Record<string, string> = Object.fromEntries(['vs', 'result', 'reason', 'economics', 'technical', 'practical', 'tradeoffs', 'change', 'confidence', 'details'].map((k) => [k, t(`comparison.chapters.${k}`)]));
  const chapterItems: ChapterItem[] = view.chapters.map((c) => ({ id: c.id, label: c.kind === 'reason' && c.metric ? metricLabel(t, c.metric) : (labels[c.kind] ?? c.id) }));
  const [a, b] = data.vehicles;
  const names: [string, string] = [displayName(i18n, a.label), displayName(i18n, b.label)];
  const used = hasUsed(data.conditions);
  // Datos estructurados solo para la comparación base (no para una vista con hechos de unidades usadas).
  const jsonLd = used ? undefined : comparisonJsonLd({ locale, pair: comparisonPair(locale.market, a.option, b.option, slug), names, t, siteUrl: serverEnv().siteUrl });
  // Query completa (escenario + bloque usado): idioma, escenario y swap la conservan; nunca se pierde una unidad.
  const query = joinQuery(serializeScenario(scenario), data.conditions);
  const usedQuery = serializePairConditions(data.conditions);
  const swapQuery = joinQuery(serializeScenario(scenario), swapPair(data.conditions));
  const ignored = data.vehicles.flatMap((v) => v.ignored ?? []);
  // Step 8c: fecha de evaluación (explicada en "Cómo lo calculamos") y acción explícita para llevarla a hoy.
  const evaluation = used && data.evaluationDate
    ? { date: data.evaluationDate, today, ...(data.evaluationDate !== today ? { updateHref: `${pathname}${joinQuery(serializeScenario(scenario), { ...data.conditions, evaluationDate: today })}&prev_eval=${data.evaluationDate}#result` } : {}) }
    : undefined;
  const longDate = (iso: string) => new Intl.DateTimeFormat(locale.formatLocale, { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }).format(new Date(`${iso}T00:00:00Z`));
  return (
    <>
      <SiteHeader
        route={{ page: 'compare', slug }}
        search={query}
        skipLinks={[
          { href: '#result', label: t('skip.result') },
          { href: '#details', label: t('skip.details') },
        ]}
      />
      {/* `key` por par: al cambiar de coche, el estado cliente (recálculo, worker) empieza de cero. */}
      {/* `key` por PAR (como en 7c). Step 8c (corrección): con la misma ruta y otros hechos de unidad (solo cambia la query),
          una `key` que incluía las condiciones dejaba el <main> anterior montado junto al nuevo en la navegación cliente.
          El reinicio por unidad se hace en LiveDecision, que es quien tiene estado. */}
      <main id="main" className="compare" data-route={routePath({ page: 'compare', slug })} data-pair={slug} data-used={used ? 'true' : undefined} key={slug}>
        {jsonLd ? <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, '\\u003c') }} /> : null}
        <Breadcrumbs i18n={i18n} names={names} />
        <HeroVs view={view} i18n={i18n} swapSearch={swapQuery} />
        <VehicleRail i18n={i18n} candidates={view.candidates} />
        <ChapterIndex initial={chapterItems} labels={labels} title={t('navigation.chapterIndex')} />
        {invalid.length ? (
          <p className="notice" role="status">
            {t('errors.invalidScenario', { fields: invalid.join(', ') })}
          </p>
        ) : null}
        {update ? (
          <p className="notice" role="status" data-testid="eval-updated">
            {t('used.evaluation.updated', { from: longDate(update.from), to: longDate(update.to) })}{' '}
            {update.changes.length ? t('used.evaluation.changed', { items: update.changes.map((c) => t(`used.evaluation.change.${c}`)).join(', ') }) : t('used.evaluation.unchanged')}
          </p>
        ) : null}
        {ignored.length ? (
          <p className="notice" role="status" data-testid="used-ignored">
            {t('used.ignoredFacts', { fields: ignored.join(', ') })}
          </p>
        ) : null}
        <LiveDecision key={pairConditionsKey(data.conditions)} evaluation={evaluation} initialView={engineView} initialScenario={scenario} data={data} pathname={pathname} slug={slug} locale={locale.segment} language={locale.language} labels={{ recalculating: t('scenario.recalculating') }}>
          <DecisionChapters view={engineView} scenario={scenario} pathname={pathname} usedQuery={usedQuery} evaluation={evaluation} />
        </LiveDecision>
      </main>
      <SiteFooter />
      <ScenarioSheetHost pathname={pathname} slug={slug} locale={locale.segment} language={locale.language} usedSides={data.vehicles.filter((v) => v.condition === 'used').map((v) => v.side)} />
      <PairPickerHost locale={locale.segment} market={locale.market} labels={selectorLabels(i18n)} used={usedLabels(i18n)} a={a.option} b={b.option} conditions={data.conditions} timeZone={MARKETS[locale.market].timeZone} />
      <ScrollChoreography />
      {/* Remonta en cada par/unidad (navegación cliente): el foco va al resultado nuevo. */}
      <ArrivalFocus key={`${slug}|${pairConditionsKey(data.conditions)}`} />
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
