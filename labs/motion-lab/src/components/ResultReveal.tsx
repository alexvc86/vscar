'use client';
import { AnimatePresence, LayoutGroup, motion, MotionConfig } from 'motion/react';
import { forwardRef } from 'react';
import { useLab } from '@/lab/lab-context';
import { MOTION } from '@/lab/tokens';
import { CANDIDATES, type ResultView } from '@/lab/view-model';
import { VehicleSvg } from './VehicleSvg';

/**
 * Effect 4 — Result reveal (Motion = estado/layout de UI).
 * PRACTICAL_TIE: dos tarjetas de igual peso, luz neutra, sin glow; el marcador "=" ocupa el centro.
 * SELECTED: el marcador (mismo layoutId) viaja a la tarjeta elegida, que gana jerarquía (ancho/orden visual
 * por layout, no zoom); la otra baja de contraste. Comunica "la decisión cambió", no "has ganado".
 */
export const ResultReveal = forwardRef<HTMLHeadingElement, { view: ResultView }>(function ResultReveal({ view }, headingRef) {
  const lab = useLab();
  const reduced = lab.decision.reducedMotion;
  const tie = view.status !== 'SELECTED';
  const layout = MOTION.result_lock;
  const transition = !lab.motion ? { duration: 0 } : reduced ? { duration: layout.reduced_ms / 1000 } : { duration: layout.ms / 1000, ease: tie ? MOTION.tie_balance.css : layout.css };

  return (
    <MotionConfig transition={transition} reducedMotion={reduced ? 'always' : 'never'}>
      <div className="result" data-status={view.status}>
        <h2 ref={headingRef} tabIndex={-1} className="result__headline">
          {view.headline}
          {view.selectedLabel ? <span className="result__who">: {view.selectedLabel}</span> : null}
        </h2>
        <p className="sr-only" aria-live="polite">
          {tie ? 'Resultado: empate práctico entre BYD SEAL y Tesla Model 3 para este escenario.' : `Resultado: la decisión cambió. Mejor para tus necesidades: ${view.selectedLabel}.`}
        </p>
        <LayoutGroup>
          <div className="result__row">
            {CANDIDATES.map((c, i) => {
              const selected = view.selectedId === c.id;
              const dim = !tie && !selected;
              return (
                <motion.article
                  key={c.id}
                  layout={!reduced}
                  className={`result-card result-card--${c.side}${selected ? ' is-selected' : ''}${dim ? ' is-dim' : ''}`}
                  style={{ flexGrow: tie ? 1 : selected ? 1.4 : 0.8, order: i * 2 }}
                  animate={{ opacity: dim ? 0.62 : 1 }}
                  aria-label={`${c.label} ${c.year}${selected ? ', seleccionado' : ''}`}
                >
                  <motion.div layout={!reduced ? 'position' : false} className="result-card__vehicle">
                    <VehicleSvg side={c.side} lit={tie ? 0.6 : selected ? 1 : 0.25} title={`${c.label} — silueta genérica`} />
                  </motion.div>
                  <motion.h3 layout={!reduced ? 'position' : false} className="result-card__name">
                    {c.label} <span className="mono">{c.year}</span>
                  </motion.h3>
                  {selected && (
                    <motion.p layoutId="verdict" className="verdict verdict--selected">
                      Best for your needs
                    </motion.p>
                  )}
                </motion.article>
              );
            })}
            {tie && (
              <motion.div layoutId="verdict" className="verdict verdict--tie" style={{ order: 1 }} aria-hidden="true">
                =
              </motion.div>
            )}
          </div>
        </LayoutGroup>
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={view.status}
            className="result__why"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={!lab.motion ? { duration: 0 } : { duration: MOTION.scenario_morph.ms / 1000, ease: MOTION.scenario_morph.css }}
          >
            <h3 className="eyebrow">{tie ? 'Why it is a tie' : 'Why'}</h3>
            <ul>
              {view.reasons.map((r) => (
                <li key={r}>{r}</li>
              ))}
            </ul>
            <p className="confidence">
              Recommendation confidence: <strong className="mono">{view.confidence.level}</strong>
            </p>
            <ul className="confidence__reasons">
              {view.confidence.reasons.map((r) => (
                <li key={r}>{r}</li>
              ))}
            </ul>
          </motion.div>
        </AnimatePresence>
      </div>
    </MotionConfig>
  );
});
