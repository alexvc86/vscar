import { pairSlug } from '@/domain/catalog';
import type { DecisionView } from '@/domain/view-model';
import { localizedHref } from '@/i18n/routes';
import type { I18n } from '@/i18n/use-i18n';
import { optionText, pairLabels, selectorLabels } from '../catalog/labels';
import { ChangeCarButton, SwapCarsLink } from '../catalog/PairControls';
import { ShareComparison } from './ShareComparison';
import { VehicleVisual } from '../vehicle/VehicleVisual';
import { HeroAtmosphere } from '../visual/HeroAtmosphere';
import { ScenarioTrigger } from './ScenarioTrigger';

/**
 * Capítulo 00 · VS. Server-rendered: nombres, siluetas SVG y escenario están en el HTML aunque no cargue
 * ningún JS visual. Dueños: CSS = entrada del vehículo (`.vehicle-entry`); GSAP = `[data-vs-*]` (scrub);
 * ThreeUI = canvas de la atmósfera (sobre el degradado CSS).
 */
export function HeroVs({ view, i18n, search = '' }: { view: DecisionView; i18n: I18n; search?: string }) {
  const { t, locale } = i18n;
  const [a, b] = view.candidates;
  const labels = pairLabels(i18n);
  const sel = selectorLabels(i18n);
  const swapped = pairSlug(b.option.slug, a.option.slug);
  return (
    <section id="vs" className="chapter chapter--vs" aria-labelledby="vs-title" data-chapter="vs" data-vs-scene="">
      <div className="atmosphere atmosphere--hero" aria-hidden="true">
        <HeroAtmosphere />
      </div>
      <div className="vs__sticky">
        <div className="chapter__inner vs__inner">
          <h1 id="vs-title" className="vs__title">
            <span className="tone-a">{a.name}</span> <span className="vs__title-vs">{t('common.vs')}</span> <span className="tone-b">{b.name}</span>
          </h1>
          <div className="vs__stage">
            {[a, b].map((c) => (
              <figure key={c.side} className={`vs__vehicle vs__vehicle--${c.side}`} {...(c.side === 'a' ? { 'data-vs-a': '' } : { 'data-vs-b': '' })}>
                <div className="vehicle-entry">
                  <VehicleVisual side={c.side} lit={0.6} idPrefix={`hero-${c.side}`} label={t('common.genericSilhouette', { name: c.name, body: c.body })} />
                </div>
                <figcaption>
                  <span className={`label tone-${c.side}`}>{t('comparison.candidate', { side: c.side.toUpperCase() })}</span>
                  <span className="vs__name">{c.name}</span>
                  {(() => {
                    const text = optionText(c.option, sel);
                    return (
                      <>
                        <span className="vs__variant" data-testid={`variant-${c.side}`}>
                          {text.name}
                        </span>
                        <span className="mono vs__meta">
                          {text.meta}
                          {text.period ? ` · ${text.period}` : ''}
                          {c.option.preview ? <span className="picker__badge" title={sel.previewNote}>{sel.preview}</span> : null}
                        </span>
                      </>
                    );
                  })()}
                  <ChangeCarButton side={c.side} label={labels.change} ariaLabel={labels.changeCar.replace('{name}', c.name)} />
                </figcaption>
              </figure>
            ))}
            <span className="vs__mark" data-vs-mark="" aria-hidden="true">
              VS
            </span>
          </div>
          <div className="vs__actions">
            <a href="#details" className="vs-button vs-button--ghost">
              {t('navigation.jumpToDetails')}
            </a>
            <ScenarioTrigger label={t('scenario.cta')} />
            <SwapCarsLink href={localizedHref(locale, { page: 'compare', slug: swapped }, search)} locale={locale.segment} slug={swapped} label={labels.swap} />
            <ShareComparison
              title={t('seo.compareTitle', { a: a.name, b: b.name })}
              labels={{ button: t('share.button'), copied: t('share.copied'), copyFailed: t('share.copyFailed'), text: t('share.text', { a: a.name, b: b.name }) }}
            />
          </div>
        </div>
      </div>
    </section>
  );
}
