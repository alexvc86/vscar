import type { CandidateView, MetricView } from '@/domain/view-model';
import { forYouRuleText, metricLabel } from '@/i18n/engine-messages';
import type { I18n } from '@/i18n/use-i18n';

/**
 * Patrón de cifra VScar (Step 6d §4.8): RAW → MEANINGFUL DIFFERENCE → MEANINGFUL FOR YOU.
 * Todo el contenido está en el HTML; GSAP solo anima `data-scrub-*` (barras y capas) con scrub nativo.
 */
export function MetricLayers({ metric, candidates, i18n }: { metric: MetricView; candidates: [CandidateView, CandidateView]; i18n: I18n }) {
  const { t, f } = i18n;
  const unit = metric.a?.unit ?? metric.b?.unit ?? null;
  const num = (v: MetricView['a']) => (typeof v?.min === 'number' ? v.min : undefined);
  const va = num(metric.a);
  const vb = num(metric.b);
  const max = Math.max(va ?? 0, vb ?? 0) || 1;
  const leader = metric.leader ? candidates.find((c) => c.side === metric.leader) : undefined;
  const raw = metric.delta ? f.valueRange({ min: Math.abs(metric.delta.min), max: Math.abs(metric.delta.max) }, unit) : undefined;
  const levelLong = (l?: string) => (l && t.has(`metricLayers.levelLong.${l}`) ? t(`metricLayers.levelLong.${l}`) : t('metricLayers.notAssessed'));
  return (
    <div className="metric" data-scrub-metric="">
      <dl className="metric__bars">
        {candidates.map((c) => {
          const v = c.side === 'a' ? metric.a : metric.b;
          const n = num(v);
          return (
            <div key={c.side} className={`metric__row metric__row--${c.side}`}>
              <dt>{c.name}</dt>
              <dd>
                <span className="metric__bar" aria-hidden="true">
                  <span className="metric__bar-fill" data-scrub-bar="" style={{ transform: `scaleX(${n !== undefined ? n / max : 0})` }} />
                </span>
                <span className="mono metric__value">{n !== undefined ? f.valueRange(v as { min: number; max: number }, unit) : t('common.notConfirmed')}</span>
              </dd>
            </div>
          );
        })}
      </dl>
      <ol className="metric__layers">
        <li data-scrub-layer="raw">
          <span className="label">{t('metricLayers.raw')}</span>
          <span className={`mono metric__big ${leader ? `tone-${leader.side}` : ''}`}>{raw ? `${leader ? '+' : ''}${raw}` : t('common.notConfirmed')}</span>
          {leader ? <span className="metric__who">{t('metricLayers.ahead', { name: leader.name })}</span> : null}
        </li>
        <li data-scrub-layer="meaningful">
          <span className="label">{t('metricLayers.meaningful')}</span>
          <span className="chip">{levelLong(metric.meaningful)}</span>
        </li>
        <li data-scrub-layer="for-you">
          <span className="label">{t('metricLayers.forYou')}</span>
          <span className="chip chip--you">{levelLong(metric.forYou)}</span>
          {metric.forYouRules.map((r) => (
            <span key={r} className="metric__rule">
              {forYouRuleText(t, r)}
            </span>
          ))}
        </li>
      </ol>
      <p className="sr-only">{metricLabel(t, metric.metric)}</p>
    </div>
  );
}
