import { Disclosure } from '@vscar/ui/disclosure';
import type { CandidateSide } from '@vscar/ui/tokens';
import { DEFAULT_SCENARIO, serializeScenario, type Scenario } from '@/domain/scenario';
import { withDisplayNames, type CandidateView, type DecisionView, type MetricView, type UsedSideView, type WhyNotView } from '@/domain/view-model';
import { metricLabel } from '@/i18n/engine-messages';
import { useI18n, type I18n } from '@/i18n/use-i18n';
import { VehicleVisual } from '../vehicle/VehicleVisual';
import { Chapter, SplitHeading } from './Heading';
import { MessageText } from './MessageText';
import { STATIC_KIT, type MotionKit } from './kit';
import { relevantTechnicalMetrics } from '@/domain/chapters';
import { localizedHref } from '@/i18n/routes';
import { MetricCompare } from './MetricCompare';
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
  /** Step 8b: bloque usado de la URL (`u=1&…`, sin `?`): los enlaces de escenario lo conservan. */
  usedQuery?: string;
  /** Step 8c: fecha de evaluación de los usados y enlace para actualizarla a hoy (solo con algún usado). */
  evaluation?: EvaluationInfo | undefined;
}

export interface EvaluationInfo {
  /** Fecha de la URL (`eval`). */
  date: string;
  /** Hoy en el mercado. */
  today: string;
  /** Misma comparación con `eval` = hoy (ausente si ya es hoy). */
  updateHref?: string;
}

/** Query de escenario (`?…` o "") + bloque usado. */
const withUsed = (q: string, used?: string) => (!used ? q : q ? `${q}&${used}` : `?${used}`);

export function DecisionChapters({ view: engineView, scenario, pathname, kit = STATIC_KIT, robustnessPending = false, usedQuery, evaluation }: DecisionChaptersProps) {
  // Step 8c: nombres de presentación (misma variant → "Golf nuevo / usado") en la UI y en los mensajes del engine.
  const i18n = useI18n(engineView);
  const view = withDisplayNames(engineView, i18n.names);
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
          case 'technical':
            return <TechnicalChapter key={ch.id} index={index++} view={view} i18n={i18n} />;
          case 'practical':
            return <PracticalChapter key={ch.id} index={index++} view={view} i18n={i18n} />;
          case 'used':
            return view.used ? <UsedChapter key={ch.id} index={index++} view={view} i18n={i18n} evaluation={evaluation} /> : null;
          case 'tradeoffs':
            return <TradeoffsChapter key={ch.id} index={index++} view={view} i18n={i18n} />;
          case 'change':
            return <ChangeChapter key={ch.id} index={index++} view={view} scenario={scenario} pathname={pathname} usedQuery={usedQuery} pending={robustnessPending} i18n={i18n} />;
          case 'confidence':
            return <ConfidenceChapter key={ch.id} index={index++} view={view} i18n={i18n} pending={robustnessPending} />;
          case 'details':
            return <DetailsChapter key={ch.id} index={index++} view={view} i18n={i18n} evaluation={evaluation} />;
          default:
            return null;
        }
      })}
    </>
  );
}

const nameOf = (view: DecisionView, side?: CandidateSide) => view.candidates.find((c) => c.side === side)?.name ?? '';

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
  // Motivos: las contribuciones del engine; en un empate, las reglas Meaningful For You de las métricas clave
  // (por qué esa diferencia no decide para tu uso). Todo son mensajes del engine.
  const whyItems = view.reasons.length
    ? view.reasons.map((c) => ({ key: `${c.component}-${c.metric ?? c.message.messageKey}`, msg: c.message, why: c.whyMessages }))
    : view.keyMetrics.flatMap((m) => m.forYouMessages.map((msg) => ({ key: `${m.metric}-${msg.messageKey}`, msg, why: [] })));
  void metrics;
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
      <div className="result__lead">
        <MessageText msg={view.explanation} i18n={i18n} />
      </div>
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
        {whyItems.length ? (
          <>
            <h3 className="label">{balanced ? t('decision.whyTie') : t('decision.why')}</h3>
            <ul className="result__reasons">
              {whyItems.map((w) => (
                <li key={w.key}>
                  <MessageText msg={w.msg} i18n={i18n} />
                  {w.why.length ? <span className="result__reason-why"> — {w.why.map((x) => i18n.mInline(x)).join('; ')}</span> : null}
                </li>
              ))}
            </ul>
          </>
        ) : null}
        {view.sameVariant ? <SameVariantNote view={view} i18n={i18n} /> : null}
        {view.notices.length ? (
          <ul className="result__notices">
            {view.notices.map((n) => (
              <li key={n.messageKey}>
                <MessageText msg={n} i18n={i18n} />
              </li>
            ))}
          </ul>
        ) : null}
        {view.closestNote ? (
          <p className="muted small">
            <MessageText msg={view.closestNote} i18n={i18n} />
          </p>
        ) : null}
        <p className="result__confidence">
          <a href="#confidence" className="link-quiet">
            {t('confidence.title')} · <span className={pending ? 'is-stale' : undefined}><ConfidenceMeter level={view.confidence.level} i18n={i18n} /></span>
            {pending ? <span className="sr-only"> · {t('robustness.checking')}</span> : null}
          </a>
          {/* Step 8c: la información de la unidad usada es OTRO indicador (cuánto se sabe), no la confianza del resultado. */}
          {view.used && view.usedInformationConfidence && view.usedInformationConfidence !== 'NOT_APPLICABLE' ? (
            <span className="result__used-info muted small" data-testid="used-info-short">
              {' '}
              · {t('used.module.infoShort', { level: t(`engine.level.${view.usedInformationConfidence}`) })}
            </span>
          ) : null}
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
  // Titular = explicación del Economic Fit del engine (no se compone en la UI).
  const statusLine = e.messages[0] ? i18n.mInline(e.messages[0]) : t('economic.title');
  return (
    <Chapter id="economics" labelledBy="economics-title" index={index} className="chapter--economics">
      <p className="label">{t('comparison.chapters.economics')}</p>
      <SplitHeading id="economics-title" text={statusLine} className="chapter__title chapter__title--md" />
      <p className="muted">{t('economic.lead', { km: `${f.number(scenario.km)} km` })}</p>
      <p className="econ-badges">
        <span className="chip chip--horizon">{t('economic.horizonYears', { years: e.horizonYears })}</span>
        {/* Step 8c: estas tarjetas son COSTE DE USO (energía); el coste conocido con compra va en su propio bloque. */}
        <span className="chip">{t('economic.runningScope')}</span>
      </p>
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
      {e.perSide.a.purchase || e.perSide.b.purchase ? <PurchaseBlock view={view} i18n={i18n} /> : null}
      <MarketContext view={view} i18n={i18n} />
    </Chapter>
  );
}

/** Capacidad técnica: diferencias que el engine califica de relevantes (≥ MEANINGFUL) + resultado técnico separado. */
function TechnicalChapter({ view, i18n, index }: { view: DecisionView; i18n: I18n; index: number }) {
  const { t, f } = i18n;
  const tech = view.metricsByCategory.filter((c) => c.category !== 'Economy').flatMap((c) => c.metrics);
  const metrics = relevantTechnicalMetrics(tech, view.keyMetrics).slice(0, 4);
  const lead = view.technicalMessages[0] ? i18n.mInline(view.technicalMessages[0]) : t('comparison.chapters.technical');
  return (
    <Chapter id="technical" labelledBy="technical-title" index={index} className="chapter--technical">
      <p className="label">{t('comparison.chapters.technical')}</p>
      <SplitHeading id="technical-title" text={lead} className="chapter__title chapter__title--md" />
      <p className="muted">{t('technical.chapterLead')}</p>
      <div className="mcmp-list">
        {metrics.map((m) => (
          <MetricCompare key={m.metric} metric={m} candidates={view.candidates} i18n={i18n} />
        ))}
      </div>
      <dl className="tech-scores">
        {view.candidates.map((c) => (
          <div key={c.side}>
            <dt className={`tone-${c.side}`}>{c.name}</dt>
            <dd>
              {t('technical.score')}: <span className="mono">{view.technical[c.side].score ? f.numberRange(view.technical[c.side].score!, 1) : t('common.notConfirmed')}</span> ·{' '}
              {t('technical.coverage', { value: f.percent(view.technical[c.side].coverage) })}
            </dd>
          </div>
        ))}
      </dl>
    </Chapter>
  );
}

/** Encaje práctico: estado de requisitos por coche con los mensajes del engine (deal breakers, concesiones, sin confirmar). */
function PracticalChapter({ view, i18n, index }: { view: DecisionView; i18n: I18n; index: number }) {
  const { t } = i18n;
  return (
    <Chapter id="practical" labelledBy="practical-title" index={index} className="chapter--practical">
      <SplitHeading id="practical-title" text={t('comparison.chapters.practical')} className="chapter__title" />
      <p className="muted">{t('practical.chapterLead')}</p>
      <div className="whynot-grid">
        {view.candidates.map((c) => (
          <article key={c.side} className={`whynot whynot--${c.side}`} data-practical={view.practical[c.side].status}>
            <h3>{c.name}</h3>
            <p className="chip chip--status">{t(`practical.status.${view.practical[c.side].status}`)}</p>
            {view.practical[c.side].messages.length ? (
              <ul className="whynot__list">
                {view.practical[c.side].messages.map((msg, k) => (
                  <li key={`${msg.messageKey}-${k}`}>
                    <MessageText msg={msg} i18n={i18n} />
                  </li>
                ))}
              </ul>
            ) : null}
          </article>
        ))}
      </div>
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
          <MessageText msg={it} i18n={i18n} />
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

function ChangeChapter({ view, scenario, pathname, usedQuery, pending, i18n, index }: { view: DecisionView; scenario: Scenario; pathname: string; usedQuery?: string | undefined; pending: boolean; i18n: I18n; index: number }) {
  const { t } = i18n;
  const presets = [1, 10].map((trips) => ({ trips, href: `${pathname}${withUsed(serializeScenario({ ...scenario, trips }), usedQuery)}` }));
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
                <li key={`${msg.messageKey}-${k}`}>
                  <MessageText msg={msg} i18n={i18n} />
                </li>
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
              href={`${pathname}${withUsed(serializeScenario(DEFAULT_SCENARIO), usedQuery)}`}
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

/**
 * Step 8b/8c — tres conceptos separados (nunca uno solo): (A) DESEMBOLSO INICIAL (precio de compra: catálogo o
 * solicitado), (B) COSTE DE USO (energía; las tarjetas de arriba, base del Economic Fit) y (C) COSTE CONOCIDO al horizonte
 * (compra + energía; no es un coste total de propiedad). El punto de equilibrio es el del Economics Engine, sin recalcular.
 */
function PurchaseBlock({ view, i18n }: { view: DecisionView; i18n: I18n }) {
  const { t, f } = i18n;
  const e = view.economics;
  const [a, b] = view.candidates;
  const pa = e.perSide.a.purchase;
  const pb = e.perSide.b.purchase;
  const notComparable = e.status === 'NOT_COMPARABLE';
  const money = (n: number) => f.moneyMinorRange({ min: n, max: n }, 0);
  const lower = pa && pb && pa.amount !== pb.amount ? (pa.amount < pb.amount ? a : b) : undefined;
  const be = e.breakEven;
  const premium = be?.premium ? view.candidates.find((c) => c.side === be.premium) : undefined;
  const component = (k: string) => t(`economic.component.${k}`);
  return (
    <section className="purchase-block" aria-labelledby="purchase-title" data-testid="purchase-block">
      <h3 id="purchase-title" className="label">
        {t('economic.purchaseTitle')}
      </h3>
      <div className="econ-grid">
        {[a, b].map((c) => {
          const s = e.perSide[c.side];
          return (
            <article key={c.side} className={`econ-card econ-card--${c.side}`} data-testid={`purchase-${c.side}`}>
              <h4 className="econ-card__name">{c.name}</h4>
              <dl className="econ-card__list">
                <div>
                  <dt>
                    {t('economic.purchase')}
                    {s.purchase ? <span className="muted"> · {t(`economic.purchaseSource.${s.purchase.source}`)}</span> : null}
                  </dt>
                  <dd className="mono econ-card__big">{s.purchase ? money(s.purchase.amount) : t('economic.noPurchase')}</dd>
                </div>
                <div>
                  <dt>
                    {t('economic.ownership', { years: e.horizonYears })}
                    {s.ownership && s.purchase ? <span className="muted small econ-card__scope"> {t('economic.ownershipIncludes', { items: s.ownership.included.map(component).join(' + ') })}</span> : null}
                  </dt>
                  <dd className="mono">{s.ownership && s.purchase ? f.moneyMinorRange(s.ownership.total, 0) : t('economic.ownershipUnavailable')}</dd>
                </div>
              </dl>
            </article>
          );
        })}
      </div>
      {lower && pa && pb ? (
        <p className="purchase-block__diff" data-testid="purchase-diff">
          {t('economic.lowerPurchase', { name: lower.name, amount: money(Math.abs(pa.amount - pb.amount)) })}
        </p>
      ) : !pa || !pb ? (
        <p className="purchase-block__diff muted" data-testid="purchase-diff">
          {t('economic.purchaseMissing')}
        </p>
      ) : null}
      {be && premium && !notComparable ? (
        <p className="purchase-block__breakeven" data-testid="break-even">
          {be.status === 'BREAK_EVEN' && be.years && be.annualSaving
            ? be.years.min > e.horizonYears
              ? t('economic.breakEvenBeyond', { name: premium.name, saving: f.moneyMinorRange(be.annualSaving, 0), years: e.horizonYears })
              : t('economic.breakEven', { name: premium.name, extra: f.moneyMinorRange(be.extraPurchase!, 0), saving: f.moneyMinorRange(be.annualSaving, 0), years: f.numberRange(be.years, 1) })
            : be.status === 'BREAK_EVEN_UNCERTAIN'
              ? t('economic.breakEvenUncertain', { name: premium.name, years: f.number(be.minYears ?? 0, 1) })
              : be.status === 'NO_BREAK_EVEN'
                ? t('economic.noBreakEven', { name: premium.name, extra: f.moneyMinorRange(be.extraPurchase!, 0) })
                : null}
        </p>
      ) : null}
      <p className="muted small">{t('economic.knownCostNote', { years: e.horizonYears })}</p>
      {notComparable ? <p className="muted small" data-testid="known-cost-not-comparable">{t('economic.knownCostNotComparable')}</p> : null}
      <p className="muted small">{t('economic.purchaseNote')}</p>
    </section>
  );
}

/** Step 8c — misma variant en los dos lados: qué es igual y qué no (datos estructurados de la vista; sin redactar decisiones). */
function SameVariantNote({ view, i18n }: { view: DecisionView; i18n: I18n }) {
  const { t, f } = i18n;
  const pa = view.economics.perSide.a.purchase;
  const pb = view.economics.perSide.b.purchase;
  const lower = pa && pb && pa.amount !== pb.amount ? view.candidates.find((c) => c.side === (pa.amount < pb.amount ? 'a' : 'b')) : undefined;
  return (
    <div className="result__same" data-testid="same-variant-note">
      <p>{t('decision.sameVariantNote')}</p>
      {lower && pa && pb ? <p className="muted">{t('economic.lowerPurchaseSameRunning', { name: lower.name, amount: f.moneyMinorRange({ min: Math.abs(pa.amount - pb.amount), max: Math.abs(pa.amount - pb.amount) }, 0) })}</p> : null}
    </div>
  );
}

/**
 * Step 8b — "Este usado": información de la unidad (Used Information Confidence), señales agrupadas por naturaleza
 * (ATTENTION / INFORMATION_GAP / NOTE) y verificación. Todas las frases vienen del Used Adjustment (messageKey +
 * params); la UI solo agrupa. Nunca una nota de usado ni una probabilidad.
 */
function UsedChapter({ view, i18n, index, evaluation }: { view: DecisionView; i18n: I18n; index: number; evaluation?: EvaluationInfo | undefined }) {
  const { t } = i18n;
  const sides = view.candidates.filter((c) => view.used?.[c.side]);
  const list = (items: UsedSideView['verification'], cls: string, testid: string) =>
    items.length ? (
      <ul className={cls} data-testid={testid}>
        {items.map((m, k) => (
          <li key={`${m.messageKey}-${k}`}>
            <MessageText msg={m} i18n={i18n} />
          </li>
        ))}
      </ul>
    ) : null;
  return (
    <Chapter id="used" labelledBy="used-title" index={index} className="chapter--used">
      <SplitHeading id="used-title" text={t('used.module.title')} className="chapter__title" />
      <p className="muted">{t('used.module.lead')}</p>
      <div className="used-grid">
        {sides.map((c) => {
          const u = view.used![c.side]!;
          return (
            <article key={c.side} className={`used-card used-card--${c.side}`} data-testid={`used-card-${c.side}`}>
              <h3 className="used-card__name">
                <span className={`label tone-${c.side}`}>{c.side.toUpperCase()}</span> {c.name}
              </h3>
              {/* Step 8c: indicador PROPIO (cuánto sabemos de esta unidad), visualmente distinto de la confianza de la
                  recomendación; nunca una fiabilidad mecánica. */}
              <p className="used-card__confidence">
                {t('used.module.confidence')}: <span className={`info-level info-level--${u.information.level.toLowerCase()}`} data-testid={`used-info-level-${c.side}`}>{t(`engine.level.${u.information.level}`)}</span>
              </p>
              <p className="muted small">{t('used.module.confidenceNote')}</p>
              <p className="muted small">
                <MessageText msg={u.information.summary} i18n={i18n} />
              </p>
              {list(u.information.reasons, 'used-card__reasons', `used-reasons-${c.side}`)}
              {u.signals.attention.length ? <h4 className="label">{t('used.module.attention')}</h4> : null}
              {list(u.signals.attention, 'used-signals used-signals--attention', `used-attention-${c.side}`)}
              {u.signals.gaps.length ? <h4 className="label">{t('used.module.gaps')}</h4> : null}
              {list(u.signals.gaps, 'used-signals used-signals--gaps', `used-gaps-${c.side}`)}
              {u.signals.notes.length ? <h4 className="label">{t('used.module.notes')}</h4> : null}
              {list(u.signals.notes, 'used-signals used-signals--notes', `used-notes-${c.side}`)}
              {!u.signals.attention.length && !u.signals.gaps.length ? <p className="muted small">{t('used.module.noSignals')}</p> : null}
              {u.verification.length ? <h4 className="label">{t('used.module.verify')}</h4> : null}
              {list(u.verification, 'used-verify', `used-verify-${c.side}`)}
              {u.warnings.length ? <h4 className="label">{t('used.module.warnings')}</h4> : null}
              {list(u.warnings, 'used-warnings', `used-warnings-${c.side}`)}
              <p className="muted small">
                <MessageText msg={u.purchase} i18n={i18n} />
              </p>
            </article>
          );
        })}
      </div>
      <p className="muted small used-provenance">{t('used.module.provenance')}</p>
      {evaluation ? <EvaluationBlock evaluation={evaluation} i18n={i18n} testId="evaluation" /> : null}
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
              <li key={`${r.messageKey}-${k}`}>
                <MessageText msg={r} i18n={i18n} />
              </li>
            ))}
          </ul>
        </div>
      </div>
      {view.verifyBySide.length ? (
        <div className="verify" data-testid="verify">
          <h3>{t('decision.verifyTitle')}</h3>
          {/* Step 8c: cada comprobación con el coche al que pertenece. */}
          {view.candidates
            .filter((c) => view.verifyBySide.some((v) => v.side === c.side))
            .map((c) => (
              <div key={c.side} className="verify__group" data-testid={`verify-${c.side}`}>
                <p className={`label tone-${c.side}`}>{c.name}</p>
                <ul>
                  {view.verifyBySide
                    .filter((v) => v.side === c.side)
                    .map((v, k) => (
                      <li key={`${v.messageKey}-${k}`}>
                        <MessageText msg={v} i18n={i18n} />
                      </li>
                    ))}
                </ul>
              </div>
            ))}
        </div>
      ) : null}
    </Chapter>
  );
}

function DetailsChapter({ view, i18n, index, evaluation }: { view: DecisionView; i18n: I18n; index: number; evaluation?: EvaluationInfo | undefined }) {
  const { t, f } = i18n;
  return (
    <Chapter id="details" labelledBy="details-title" index={index} className="chapter--details">
      <h2 id="details-title" className="chapter__title" tabIndex={-1}>
        {t('comparison.chapters.details')}
      </h2>
      <div className="details">
        {view.metricsByCategory.map(({ category, metrics }) => (
          <Disclosure key={category} summary={<span>{t(`technical.categories.${category}`)}</span>} className="details__category">
            <div className="mcmp-list">
              {metrics.map((m) => (
                <MetricCompare key={m.metric} metric={m} candidates={view.candidates} i18n={i18n} />
              ))}
            </div>
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
                  {view.practical[c.side].messages.length ? (
                    <ul className="msg-details">
                      {view.practical[c.side].messages.map((msg, k) => (
                        <li key={`${msg.messageKey}-${k}`}>
                          <MessageText msg={msg} i18n={i18n} />
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </dd>
              </div>
            ))}
          </dl>
          {view.technicalMessages.length ? (
            <ul className="msg-details">
              {view.technicalMessages.map((msg, k) => (
                <li key={`${msg.messageKey}-${k}`}>
                  <MessageText msg={msg} i18n={i18n} />
                </li>
              ))}
            </ul>
          ) : null}
        </Disclosure>
        <HowWeCalculated view={view} i18n={i18n} evaluation={evaluation} />
      </div>
    </Chapter>
  );
}

/**
 * Step 8c — fecha de evaluación de los usados: qué fecha usa el análisis, para qué y cómo llevarla a hoy (solo a
 * petición: abrir un enlace antiguo nunca la cambia). En el capítulo "Este usado" y en "Cómo lo calculamos".
 */
function EvaluationBlock({ evaluation, i18n, testId }: { evaluation: EvaluationInfo; i18n: I18n; testId: string }) {
  const { t } = i18n;
  const longDate = (iso: string) => new Intl.DateTimeFormat(i18n.locale.formatLocale, { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }).format(new Date(`${iso}T00:00:00Z`));
  return (
    <div className="evaluation" data-testid={testId}>
      <p>
        <strong>{t('used.evaluation.date', { date: longDate(evaluation.date) })}</strong>
      </p>
      <p className="muted small">{t('used.evaluation.explain')}</p>
      <p className="muted small">{t('used.evaluation.scope')}</p>
      {evaluation.updateHref ? (
        <p>
          <a href={evaluation.updateHref} className="vs-button vs-button--ghost vs-button--sm" data-testid={testId === 'evaluation' ? 'update-eval' : undefined}>
            {t('used.evaluation.update')}
          </a>
        </p>
      ) : (
        <p className="muted small">{t('used.evaluation.isToday')}</p>
      )}
    </div>
  );
}

function HowWeCalculated({ view, i18n, evaluation }: { view: DecisionView; i18n: I18n; evaluation?: EvaluationInfo | undefined }) {
  const { t, f } = i18n;
  const elec = view.energy.electricity;
  const sourceInfo = (id: string | undefined) => (id ? view.sources.find((s) => s.id === id) : undefined);
  const elecSource = sourceInfo(elec?.sourceId);
  const fuelSource = sourceInfo(view.energy.fuel?.sourceId);
  const cycles = [...new Set(view.metricsByCategory.flatMap((c) => c.metrics.flatMap((m) => [m.a?.cycle, m.b?.cycle])).filter(Boolean))];
  // Fuentes de los vehículos (identidad, valores, precios) con su estado de derechos; las de energía van arriba.
  const vehicleSources = view.sources.filter((s) => !s.key);
  const attributions = [...new Set(view.sources.map((s) => s.attribution).filter((a): a is string => !!a))];
  const pendingRights = view.sources.some((s) => s.publication === 'PREVIEW_ONLY');
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
            {elecSource?.publication === 'PREVIEW_ONLY' ? <dd className="muted small">{t('methodology.rightsNote')}</dd> : null}
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
        {attributions.length ? (
          <div>
            <dt>{t('methodology.attribution')}</dt>
            {attributions.map((a) => (
              <dd key={a} className="small">
                {a}
              </dd>
            ))}
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
      {view.dataSnapshot.vehicles.includes('@') ? (
        <p className="muted small">{t('methodology.dataUpdated', { date: view.dataSnapshot.vehicles.split('@')[1]!.slice(0, 10) })}</p>
      ) : null}
      {evaluation && view.used ? <EvaluationBlock evaluation={evaluation} i18n={i18n} testId="evaluation-method" /> : null}
      <p className="small">
        <a href={localizedHref(i18n.locale, { page: 'methodology' })}>{t('methodology.link')}</a>
      </p>
      <p className="muted small">
        {view.channel === 'PREVIEW' || pendingRights ? `${t('common.devSnapshot')} ` : ''}
        <span className="mono">{t('methodology.dataSnapshot', { vehicles: view.dataSnapshot.vehicles, energy: view.dataSnapshot.energy, rights: view.dataSnapshot.rights })}</span>
      </p>
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
