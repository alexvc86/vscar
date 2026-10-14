import type { CandidateView, MetricView } from '@/domain/view-model';
import { metricLabel } from '@/i18n/engine-messages';
import type { I18n } from '@/i18n/use-i18n';

/**
 * Fila de comparación del detalle (Step 7c §114–115): sin aspecto de hoja de cálculo.
 *
 *   AUTONOMÍA ELÉCTRICA
 *   570 km                 448 km
 *            +122 km · Ventaja clara
 *            Para tu uso: Ligera
 *
 * Todo sale del Comparison Engine (valores, delta orientado, niveles); la UI solo da formato. UNKNOWN = "No
 * confirmado" (nunca 0); NOT_COMPARABLE muestra el motivo (p. ej. NEDC vs WLTP) y ningún ganador.
 */
export function MetricCompare({ metric, candidates, i18n }: { metric: MetricView; candidates: [CandidateView, CandidateView]; i18n: I18n }) {
  const { t, f } = i18n;
  const unit = metric.a?.unit ?? metric.b?.unit ?? null;
  const leader = metric.leader ? candidates.find((c) => c.side === metric.leader) : undefined;
  const levelLong = (l?: string) => (l && t.has(`metricLayers.levelLong.${l}`) ? t(`metricLayers.levelLong.${l}`) : undefined);
  const delta = metric.delta && metric.outcome !== 'NOT_COMPARABLE' ? f.valueRange({ min: Math.abs(metric.delta.min), max: Math.abs(metric.delta.max) }, unit) : undefined;
  const meaningful = metric.outcome !== 'UNKNOWN' && metric.outcome !== 'NOT_COMPARABLE' ? levelLong(metric.meaningful) : undefined;
  const forYou = metric.forYou && metric.forYou !== metric.meaningful ? levelLong(metric.forYou) : undefined;
  const value = (side: 'a' | 'b') => {
    const v = side === 'a' ? metric.a : metric.b;
    if (!v) return <span className="value-unknown">{t('common.notConfirmed')}</span>;
    return (
      <>
        <span className="mono mcmp__num">{f.valueRange(v, unit)}</span>
        {v.cycle ? <span className="mcmp__cycle">{t('technical.cycle', { cycle: v.cycle })}</span> : null}
      </>
    );
  };
  return (
    <div className="mcmp" data-outcome={metric.outcome} data-metric={metric.metric}>
      <p className="mcmp__label">{metricLabel(t, metric.metric)}</p>
      <dl className="mcmp__values">
        {candidates.map((c) => (
          <div key={c.side} className={`mcmp__side mcmp__side--${c.side}${metric.leader === c.side ? ' is-ahead' : ''}`}>
            <dt className="sr-only">{c.name}</dt>
            <dd>{value(c.side)}</dd>
          </div>
        ))}
      </dl>
      <p className="mcmp__delta">
        {metric.outcome === 'NOT_COMPARABLE' ? (
          <span className="outcome outcome--not_comparable">
            {t('technical.outcome.NOT_COMPARABLE', { name: '' })}
            {metric.reasonMessage ? <span className="muted"> — {i18n.mInline(metric.reasonMessage)}</span> : null}
          </span>
        ) : delta && leader ? (
          <>
            {/* Diferencia SIN signo + quién va por delante: correcto tanto si "más es mejor" como si "menos es mejor". */}
            <span className="mono">{delta}</span> · <span className={`tone-${leader.side}`}>{t('metricLayers.ahead', { name: leader.name })}</span>
            {meaningful ? <span className="mcmp__level"> · {meaningful}</span> : null}
          </>
        ) : (
          <span className="muted">{meaningful ?? t(`technical.outcome.${metric.outcome}`, { name: '' })}</span>
        )}
      </p>
      {forYou ? (
        <p className="mcmp__foryou">
          {t('metricLayers.forYouShort')}: <strong>{forYou}</strong>
        </p>
      ) : null}
    </div>
  );
}
