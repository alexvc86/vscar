import { Disclosure } from '@vscar/ui/disclosure';
import type { CandidateSide } from '@vscar/ui/tokens';
import { DEFAULT_SCENARIO, serializeScenario, type Scenario } from '@/domain/scenario';
import { sourceInfo } from '@/domain/sources';
import type { CandidateView, ContributionView, DecisionView, MetricView, WhyNotView } from '@/domain/view-model';
import { metricLabel } from '@/i18n/engine-messages';
import { useI18n, type I18n } from '@/i18n/use-i18n';
import { VehicleVisual } from '../vehicle/VehicleVisual';
import { Chapter, SplitHeading } from './Heading';
import { STATIC_KIT, type MotionKit } from './kit';
import { MetricLayers } from './MetricLayers';
import { ScenarioTrigger } from './ScenarioTrigger';

/**
 * Capítulos dinámicos (Step 6d §3.1): solo se renderiza lo que el Decision Engine hace relevante.
 * Componente COMPARTIDO: Server Component en el HTML inicial y Client Component en el recálculo diferido.
 */
export interface DecisionChaptersProps {
  view: DecisionView;
  scenario: Scenario;
  /** Ruta de la página (sin query) para enlaces de escenario y anclas. */
  pathname: string;
  kit?: MotionKit;
  /** true mientras el worker calcula la robustez del escenario actual. */
  robustnessPending?: boolean;
}

export function DecisionChapters({ view, scenario, pathname, kit = STATIC_KIT, robustnessPending = false }: DecisionChaptersProps) {
  const i18n = useI18n();
  const metrics = new Map<string, MetricView>([...view.metricsByCategory.flatMap((c) => c.metrics), ...view.keyMetrics].map((m) => [m.metric, m]));
  let index = 1;
  return (
    <>
      {view.chapters.map((ch) => {
        switch (ch.kind) {
          case 'result':
            return <ResultChapter key={ch.id} index={index++} view={view} kit={kit} i18n={i18n} metrics={metrics} pending={robustnessPending} scenario={scenario} />;
          case 'reason': {
            const m = metrics.get(ch.metric!);
            return m ? <ReasonChapter key={ch.id} id={ch.id} index={index++} metric={m} view={view} i18n={i18n} /> : null;
          }
          case 'economics':
            return <EconomicsChapter key={ch.id} index={index++} view={view} scenario={scenario} i18n={i18n} />;
          case 'tradeoffs':
            return <TradeoffsChapter key={ch.id} index={index++} view={view} i18n={i18n} />;
          case 'change':
            return <ChangeChapter key={ch.id} index={index++} view={view} scenario={scenario} pathname={pathname} pending={robustnessPending} i18n={i18n} />;
          case 'confidence':
            return <ConfidenceChapter key={ch.id} index={index++} view={view} i18n={i18n} pending={robustnessPending} />;
          case 'details':
            return <DetailsChapter key={ch.id} index={index++} view={view} i18n={i18n} />;
          default:
            return null;
        }
      })}
    </>
  );
}

const nameOf = (view: DecisionView, side?: CandidateSide) => view.candidates.find((c) => c.side === side)?.name ?? '';

function contributionText(c: ContributionView, view: DecisionView, metrics: Map<string, MetricView>, { t, f }: I18n): string {
  const metric = c.metric ? metrics.get(c.metric) : undefined;
  if (metric && metric.leader && metric.a && metric.b) {
    const unit = metric.a.unit ?? metric.b.unit;
    const win = metric.leader === 'a' ? metric.a : metric.b;
    const lose = metric.leader === 'a' ? metric.b : metric.a;
    const level = c.level ?? metric.meaningful;
    const base = t('decision.contribution.metricAhead', {
      label: metricLabel(t, metric.metric),
      winner: nameOf(view, metric.leader),
      valueWinner: f.valueRange(win, unit) ?? '',
      other: nameOf(view, metric.leader === 'a' ? 'b' : 'a'),
      valueOther: f.valueRange(lose, unit) ?? '',
      level: level ? t(`metricLayers.level.${level}`) : '',
    });
    return metric.forYou ? `${base} · ${t('decision.contribution.forYou', { level: t(`metricLayers.level.${metric.forYou}`) })}` : base;
  }
  if (c.component === 'DEAL_BREAKER' && c.side) return t('decision.contribution.dealBreaker', { name: nameOf(view, c.side) });
  // Sin campos estructurados suficientes: respaldo inglés del engine (hueco documentado en WEB_FOUNDATION).
  return c.text;
}

function ConfidenceMeter({ level, i18n }: { level: 'HIGH' | 'MEDIUM' | 'LOW'; i18n: I18n }) {
  const filled = level === 'HIGH' ? 3 : level === 'MEDIUM' ? 2 : 1;
  return (
    <span className="confidence-meter" data-level={level}>
      <span className="confidence-meter__bars" aria-hidden="true">
        {[1, 2, 3].map((n) => (
          <span key={n} className={n <= filled ? 'is-on' : ''} />
        ))}
      </span>
      <span className="mono">{i18n.t(`confidence.level.${level}`)}</span>
    </span>
  );
}

function ResultChapter({ view, kit, i18n, metrics, index, pending, scenario }: { view: DecisionView; kit: MotionKit; i18n: I18n; metrics: Map<string, MetricView>; index: number; pending: boolean; scenario: Scenario }) {
  const { t, f } = i18n;
  const status = view.status;
  const selectedName = view.selected ? nameOf(view, view.selected) : undefined;
  const balanced = status !== 'BEST_FOR_YOU';
  const { Card, Marker, Morph } = kit;
  return (
    <Chapter id="result" labelledBy="result-title" index={index} className="chapter--result">
      <p className="label">{t('decision.eyebrow')}</p>
      <p className="result__scenario mono" data-testid="scenario-summary">
        {t('comparison.scenarioSummary', { km: `${f.number(scenario.km)} km`, daily: `${f.number(scenario.daily)} km`, trips: scenario.trips, home: f.percent(scenario.home / 100) })}
      </p>
      <h2 id="result-title" className="result__headline" tabIndex={-1} data-status={status}>
        {t(`decision.status.${status}`)}
        {selectedName ? <span className="result__who tone-a-or-b" data-side={view.selected}>: {selectedName}</span> : null}
      </h2>
      <p className="result__lead">{t(`decision.statusLead.${status}`, { name: selectedName ?? '' })}</p>
      <div className="result__row" data-balanced={balanced ? 'true' : 'false'}>
        {view.candidates.map((c, i) => {
          const selected = view.selected === c.side;
          const dim = !balanced && !selected;
          const closest = view.closest === c.side;
          return (
            <Card
              key={c.id}
              className={`result-card result-card--${c.side}${selected ? ' is-selected' : ''}${dim ? ' is-dim' : ''}`}
              style={{ flexGrow: balanced ? 1 : selected ? 1.4 : 0.8, order: i * 2 }}
              dim={dim}
              aria-label={`${c.name} ${c.year}${selected ? ` — ${t('decision.selectedBadge')}` : ''}`}
            >
              <div className="result-card__vehicle">
                <VehicleVisual side={c.side} lit={balanced ? 0.6 : selected ? 1 : 0.25} idPrefix={`result-${c.side}`} label={t('common.genericSilhouette', { name: c.name, body: c.body })} />
              </div>
              <h3 className="result-card__name">
                {c.name} <span className="mono">{c.year}</span>
              </h3>
              {selected ? <Marker className="verdict verdict--selected">{t('decision.selectedBadge')}</Marker> : null}
              {closest ? <p className="verdict verdict--closest">{t('decision.closestOption')}</p> : null}
            </Card>
          );
        })}
        {balanced ? (
          <Marker className="verdict verdict--tie" hidden>
            <span className="verdict__eq">=</span>
            <span className="sr-only">{t('decision.tieMarker')}</span>
          </Marker>
        ) : null}
      </div>
      <Morph morphKey={`${status}-${view.selected ?? ''}`} className="result__why">
        <h3 className="label">{balanced ? t('decision.whyTie') : t('decision.why')}</h3>
        <ul className="result__reasons">
          {view.reasons.length ? view.reasons.map((c) => <li key={`${c.component}-${c.metric ?? c.text}`}>{contributionText(c, view, metrics, i18n)}</li>) : <li>{t(`decision.statusLead.${status}`, { name: selectedName ?? '' })}</li>}
        </ul>
        {view.notices.length ? (
          <ul className="result__notices">
            {view.notices.map((n) => (
              <li key={n.messageKey}>{i18n.m(n)}</li>
            ))}
          </ul>
        ) : null}
        <p className="result__confidence">
          <a href="#confidence" className="link-quiet">
            {t('confidence.title')} · <span className={pending ? 'is-stale' : undefined}><ConfidenceMeter level={view.confidence.level} i18n={i18n} /></span>
            {pending ? <span className="sr-only"> · {t('robustness.checking')}</span> : null}
          </a>
        </p>
      </Morph>
    </Chapter>
  );
}

function ReasonChapter({ id, metric, view, i18n, index }: { id: string; metric: MetricView; view: DecisionView; i18n: I18n; index: number }) {
  const { t } = i18n;
  const tie = view.status !== 'BEST_FOR_YOU';
  return (
    <Chapter id={id} labelledBy={`${id}-title`} index={index} className="chapter--reason">
      <p className="label">{tie ? t('decision.tieKeyIntro') : t('decision.reasonIntro')}</p>
      <SplitHeading id={`${id}-title`} text={metricLabel(t, metric.metric)} className="chapter__title" />
      <MetricLayers metric={metric} candidates={view.candidates} i18n={i18n} />
    </Chapter>
  );
}

function EconomicsChapter({ view, scenario, i18n, index }: { view: DecisionView; scenario: Scenario; i18n: I18n; index: number }) {
  const { t, f } = i18n;
  const e = view.economics;
  const leaderName = nameOf(view, e.leader);
  const savings = e.annualDelta ? f.moneyMinorRange({ min: Math.abs(e.annualDelta.min), max: Math.abs(e.annualDelta.max) }) : undefined;
  const statusLine =
    e.status === 'LEADER' && savings ? t('economic.cheaper', { name: leaderName, amount: savings }) : e.status === 'NOT_COMPARABLE' ? t('economic.notComparable') : e.status === 'UNKNOWN' ? t('economic.unknown') : t('economic.tie');
  return (
    <Chapter id="economics" labelledBy="economics-title" index={index} className="chapter--economics">
      <p className="label">{t('comparison.chapters.economics')}</p>
      <SplitHeading id="economics-title" text={statusLine} className="chapter__title chapter__title--md" />
      <p className="muted">{t('economic.lead', { km: `${f.number(scenario.km)} km` })}</p>
      <div className="econ-grid">
        {view.candidates.map((c) => {
          const s = e.perSide[c.side];
          return (
            <article key={c.side} className={`econ-card econ-card--${c.side}`}>
              <h3 className="econ-card__name">{c.name}</h3>
              <p className="mono econ-card__big">{s.annual ? f.moneyMinorRange(s.annual, 0) : t('common.notConfirmed')}</p>
              <p className="muted">{t('economic.perYear')}</p>
              <dl className="econ-card__list">
                <div>
                  <dt>{t('economic.per100km')}</dt>
                  <dd className="mono">{s.per100km ? f.moneyRange(s.per100km) : t('common.notConfirmed')}</dd>
                </div>
                <div>
                  <dt>{t('economic.horizon', { years: e.horizonYears })}</dt>
                  <dd className="mono">{s.horizon ? f.moneyMinorRange(s.horizon, 0) : t('common.notConfirmed')}</dd>
                </div>
              </dl>
            </article>
          );
        })}
      </div>
      <p className="muted small">{t('economic.rangeNote')}</p>
      <MarketContext view={view} i18n={i18n} />
    </Chapter>
  );
}

export function MarketContext({ view, i18n }: { view: DecisionView; i18n: I18n }) {
  const { t, f } = i18n;
  const en = view.energy;
  return (
    <aside className="market-context" aria-label={t('economic.marketContext')}>
      <h3 className="label">{t('economic.marketContext')}</h3>
      <dl>
        {en.fuel ? (
          <div>
            <dt>{t('economic.referenceFuel')}</dt>
            <dd>
              <span className="mono">{f.money(en.fuel.value, 3)}/L</span>
              {!en.fuel.usedByVehicles ? <span className="muted"> · {t('economic.fuelNotUsed')}</span> : null}
            </dd>
          </div>
        ) : null}
        {en.electricity ? (
          <div>
            <dt>{t('economic.referenceElectricity')}</dt>
            <dd>
              <span className="mono">{f.money(en.electricity.value, 3)}/kWh</span>
              {en.electricity.taxes === 'EXCLUDED' ? <span className="muted"> · {t('economic.taxesExcluded')}</span> : null}
            </dd>
          </div>
        ) : null}
        <div>
          <dt>{t('economic.homeCharging')}</dt>
          <dd className="mono">{f.percent(en.homeChargingShare)}</dd>
        </div>
      </dl>
    </aside>
  );
}

function WhyNotList({ items, i18n }: { items: WhyNotView['items']; i18n: I18n }) {
  return (
    <ul className="whynot__list">
      {items.map((it, k) => (
        <li key={`${it.messageKey}-${it.metric ?? k}`} data-severity={it.severity}>
          {i18n.m(it)}
        </li>
      ))}
    </ul>
  );
}

function TradeoffsChapter({ view, i18n, index }: { view: DecisionView; i18n: I18n; index: number }) {
  const { t } = i18n;
  // Con elegido: sus TRADEOFFS son `tradeoffsForSelected` (no se repiten desde `whyNotByCandidate`).
  // Sin elegido (empate…): cada candidato muestra sus TRADEOFFS de `whyNotByCandidate`.
  const whyNot = view.whyNot.filter((w) => (w.kind === 'WHY_NOT' || (!view.selected && w.kind === 'TRADEOFFS')) && w.items.length);
  const verify = view.whyNot.filter((w) => w.kind === 'VERIFY_BEFORE_DECIDING' && w.items.length);
  return (
    <Chapter id="tradeoffs" labelledBy="tradeoffs-title" index={index} className="chapter--tradeoffs">
      <SplitHeading id="tradeoffs-title" text={t('comparison.chapters.tradeoffs')} className="chapter__title" />
      <div className="whynot-grid">
        {view.selected && view.tradeoffs.length ? (
          <article className={`whynot whynot--${view.selected}`}>
            <h3>{t('decision.tradeoffsTitle', { name: nameOf(view, view.selected) })}</h3>
            <WhyNotList items={view.tradeoffs} i18n={i18n} />
          </article>
        ) : null}
        {whyNot.map((w) => (
          <article key={w.side} className={`whynot whynot--${w.side}`}>
            <h3>{w.kind === 'TRADEOFFS' ? t('decision.tradeoffsTitle', { name: nameOf(view, w.side) }) : t('decision.whyNotTitle', { name: nameOf(view, w.side) })}</h3>
            <WhyNotList items={w.items} i18n={i18n} />
            {w.onlyMinor ? <p className="muted small">{t('decision.onlyMinor')}</p> : null}
          </article>
        ))}
        {verify.map((w) => (
          <article key={`v-${w.side}`} className="whynot whynot--verify">
            <h3>{t('decision.verifyTitle')}</h3>
            <WhyNotList items={w.items} i18n={i18n} />
          </article>
        ))}
      </div>
    </Chapter>
  );
}

function ChangeChapter({ view, scenario, pathname, pending, i18n, index }: { view: DecisionView; scenario: Scenario; pathname: string; pending: boolean; i18n: I18n; index: number }) {
  const { t } = i18n;
  const presets = [1, 10].map((trips) => ({ trips, href: `${pathname}${serializeScenario({ ...scenario, trips })}` }));
  return (
    <Chapter id="change" labelledBy="change-title" index={index} className="chapter--change">
      <SplitHeading id="change-title" text={t('robustness.title')} className="chapter__title" />
      <div className="pending-host" aria-busy={pending ? 'true' : undefined}>
        {pending ? (
          <p className="pending-pill" role="status">
            {t('robustness.checking')}
          </p>
        ) : null}
        {view.robustness ? (
          <div className={pending ? 'is-stale' : undefined} aria-live="polite">
            <p className="chip chip--status">{t(`robustness.status.${view.robustness.status}`)}</p>
            <ul className="robustness__list">
              {view.robustness.messages.map((msg, k) => (
                <li key={`${msg.messageKey}-${k}`}>{i18n.m(msg)}</li>
              ))}
            </ul>
          </div>
        ) : (
          <p className="muted robustness__pending">{t('robustness.checking')}</p>
        )}
      </div>
      <div className="change__actions">
        <ScenarioTrigger label={t('scenario.cta')} />
      </div>
      <div className="change__quick">
        <h3 className="label">{t('scenario.quickTitle')}</h3>
        <ul className="quick-list">
          {presets.map((p) => (
            <li key={p.trips}>
              <a href={p.href} className="vs-button vs-button--ghost vs-button--sm" data-scenario-link="" aria-current={scenario.trips === p.trips ? 'true' : undefined}>
                {t('scenario.presetLongTrips', { count: p.trips })}
              </a>
            </li>
          ))}
          {/* Siempre en el layout (oculto con `visibility` en el escenario por defecto): sin salto al cambiar. */}
          <li className={serializeScenario(scenario) ? undefined : 'is-reserved'}>
            <a
              href={`${pathname}${serializeScenario(DEFAULT_SCENARIO)}`}
              className="vs-button vs-button--quiet vs-button--sm"
              data-scenario-link=""
              {...(serializeScenario(scenario) ? {} : { tabIndex: -1, 'aria-hidden': true })}
            >
              {t('scenario.reset')}
            </a>
          </li>
        </ul>
      </div>
    </Chapter>
  );
}

function ConfidenceChapter({ view, i18n, index, pending }: { view: DecisionView; i18n: I18n; index: number; pending: boolean }) {
  const { t } = i18n;
  return (
    <Chapter id="confidence" labelledBy="confidence-title" index={index} className="chapter--confidence">
      <SplitHeading id="confidence-title" text={t('comparison.chapters.confidence')} className="chapter__title" />
      <div className="pending-host" aria-busy={pending ? 'true' : undefined}>
        {pending ? (
          <p className="pending-pill" role="status">
            {t('robustness.checking')}
          </p>
        ) : null}
        <div className={pending ? 'is-stale' : undefined}>
          <p className="confidence__level">
            {t('confidence.title')}: <ConfidenceMeter level={view.confidence.level} i18n={i18n} />
          </p>
          <p className="muted small">{t('confidence.explain')}</p>
          <ul className="confidence__reasons">
            {view.confidence.reasons.map((r, k) => (
              <li key={`${r.messageKey}-${k}`}>{i18n.m(r)}</li>
            ))}
          </ul>
        </div>
      </div>
      {view.verify.length ? (
        <div className="verify">
          <h3>{t('decision.verifyTitle')}</h3>
          <ul>
            {view.verify.map((v, k) => (
              <li key={`${v.messageKey}-${k}`}>{i18n.m(v)}</li>
            ))}
          </ul>
        </div>
      ) : null}
    </Chapter>
  );
}

function valueCell(m: MetricView, side: CandidateSide, i18n: I18n) {
  const v = side === 'a' ? m.a : m.b;
  const unit = m.a?.unit ?? m.b?.unit;
  if (!v) return <span className="value-unknown">{i18n.t('common.notConfirmed')}</span>;
  return (
    <>
      <span className="mono">{i18n.f.valueRange(v, unit)}</span>
      {v.cycle ? <span className="cycle"> · {i18n.t('technical.cycle', { cycle: v.cycle })}</span> : null}
    </>
  );
}

function outcomeText(m: MetricView, view: DecisionView, i18n: I18n): string {
  const name = m.leader ? nameOf(view, m.leader) : '';
  return i18n.t(`technical.outcome.${m.outcome}`, { name });
}

function DetailsChapter({ view, i18n, index }: { view: DecisionView; i18n: I18n; index: number }) {
  const { t, f } = i18n;
  const [ca, cb] = view.candidates;
  return (
    <Chapter id="details" labelledBy="details-title" index={index} className="chapter--details">
      <h2 id="details-title" className="chapter__title" tabIndex={-1}>
        {t('comparison.chapters.details')}
      </h2>
      <div className="details">
        {view.metricsByCategory.map(({ category, metrics }) => (
          <Disclosure key={category} summary={<span>{t(`technical.categories.${category}`)}</span>} className="details__category">
            <table className="metric-table">
              <caption className="sr-only">{t(`technical.categories.${category}`)}</caption>
              <thead>
                <tr>
                  <th scope="col">
                    <span className="sr-only">{t('technical.title')}</span>
                  </th>
                  <th scope="col" className="tone-a">
                    {ca.name}
                  </th>
                  <th scope="col" className="tone-b">
                    {cb.name}
                  </th>
                  <th scope="col">
                    <span className="sr-only">{t('metricLayers.meaningful')}</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {metrics.map((m) => (
                  <tr key={m.metric} data-outcome={m.outcome}>
                    <th scope="row">{metricLabel(t, m.metric)}</th>
                    <td>{valueCell(m, 'a', i18n)}</td>
                    <td>{valueCell(m, 'b', i18n)}</td>
                    <td className="metric-table__outcome">
                      <span className={`outcome outcome--${m.outcome.toLowerCase()}`}>{outcomeText(m, view, i18n)}</span>
                      {m.meaningful && m.outcome !== 'UNKNOWN' ? <span className="muted"> · {t(`metricLayers.levelLong.${m.meaningful}`)}</span> : null}
                      {m.outcome === 'NOT_COMPARABLE' && m.reason ? <span className="muted small"> — {m.reason}</span> : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Disclosure>
        ))}
        <Disclosure summary={<span>{t('technical.title')} · {t('practical.title')}</span>} className="details__category">
          <dl className="summary-list">
            {view.candidates.map((c) => (
              <div key={c.side}>
                <dt className={`tone-${c.side}`}>{c.name}</dt>
                <dd>
                  {t('technical.title')}: <span className="mono">{view.technical[c.side].score ? f.numberRange(view.technical[c.side].score!, 1) : t('common.notConfirmed')}</span> ·{' '}
                  {t('technical.coverage', { value: f.percent(view.technical[c.side].coverage) })}
                </dd>
                <dd>
                  {t('practical.title')}: {t(`practical.status.${view.practical[c.side].status}`)}
                </dd>
              </div>
            ))}
          </dl>
        </Disclosure>
        <HowWeCalculated view={view} i18n={i18n} />
      </div>
    </Chapter>
  );
}

function HowWeCalculated({ view, i18n }: { view: DecisionView; i18n: I18n }) {
  const { t, f } = i18n;
  const elec = view.energy.electricity;
  const elecSource = sourceInfo(elec?.sourceId);
  const fuelSource = sourceInfo(view.energy.fuel?.sourceId);
  const cycles = [...new Set(view.metricsByCategory.flatMap((c) => c.metrics.flatMap((m) => [m.a?.cycle, m.b?.cycle])).filter(Boolean))];
  const vehicleSources = view.provenance.sourceIds.map((id) => sourceInfo(id)).filter((s): s is NonNullable<typeof s> => !!s && !s.key);
  const sourceLabel = (s: typeof elecSource) => (s?.key && t.has(`methodology.sources.${s.key}`) ? t(`methodology.sources.${s.key}`) : (s?.name ?? ''));
  return (
    <Disclosure summary={<span>{t('methodology.howWeCalculated')}</span>} className="details__category details__how" id="how-we-calculated">
      <dl className="summary-list">
        {elec ? (
          <div>
            <dt>{t('economic.referenceElectricity')}</dt>
            <dd>
              <span className="mono">{f.money(elec.value, 3)}/kWh</span> · {t('methodology.source')}: {sourceLabel(elecSource)} · {t('methodology.origin')}: {t(`methodology.origins.${elec.origin}`)}
              {elec.date ? ` · ${t('methodology.referenceDate')}: ${f.date(elec.date.slice(0, 10))}` : ''}
            </dd>
            {elecSource?.publicationBlocked ? <dd className="muted small">{t('methodology.rightsNote')}</dd> : null}
          </div>
        ) : null}
        {view.energy.fuel ? (
          <div>
            <dt>{t('economic.referenceFuel')}</dt>
            <dd>
              <span className="mono">{f.money(view.energy.fuel.value, 3)}/L</span> · {t('methodology.source')}: {sourceLabel(fuelSource)}
              {view.energy.fuel.date ? ` · ${t('methodology.referenceDate')}: ${f.date(view.energy.fuel.date.slice(0, 10))}` : ''}
            </dd>
          </div>
        ) : null}
        {cycles.length ? (
          <div>
            <dt>{t('methodology.cycle')}</dt>
            <dd className="mono">{cycles.join(' · ')}</dd>
          </div>
        ) : null}
        {vehicleSources.length ? (
          <div>
            <dt>{t('methodology.source')}</dt>
            <dd>{vehicleSources.map((s) => s.name).join(' · ')}</dd>
          </div>
        ) : null}
        <div>
          <dt>{t('methodology.title')}</dt>
          <dd className="mono small">{t('methodology.versions', { engine: view.versions.engine, methodology: view.versions.methodology, rules: view.versions.decisionRules })}</dd>
          <dd className="mono small">
            {t('methodology.scenarioHash')}: {view.versions.scenarioHash}
          </dd>
        </div>
      </dl>
      <p className="muted small">{t('common.devSnapshot')}</p>
    </Disclosure>
  );
}

export function CandidateNames({ candidates }: { candidates: [CandidateView, CandidateView] }) {
  return (
    <>
      <span className="tone-a">{candidates[0].name}</span> <span className="muted">vs</span> <span className="tone-b">{candidates[1].name}</span>
    </>
  );
}
