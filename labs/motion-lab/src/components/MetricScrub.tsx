'use client';
import { useGSAP } from '@gsap/react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useRef } from 'react';
import { useLab } from '@/lab/lab-context';
import { MOTION } from '@/lab/tokens';
import type { MetricLayers } from '@/lab/view-model';

gsap.registerPlugin(useGSAP, ScrollTrigger);

const LEVEL_TEXT: Record<string, string> = { TIE: 'Tie', SLIGHT: 'Slight advantage', MEANINGFUL: 'Meaningful advantage', CLEAR: 'Clear advantage', UNKNOWN: 'Unknown' };

/**
 * Effect 5 — Metric scrub: RAW → MEANINGFUL DIFFERENCE → MEANINGFUL FOR YOU.
 * Todo el contenido está en el DOM desde el SSR; GSAP solo anima (scaleX de barras, opacidad de capas)
 * con scrub sobre scroll nativo. Los valores vienen del Comparison Engine y no se tocan.
 */
export function MetricScrub({ layers, scenarioKey }: { layers: MetricLayers; scenarioKey: string }) {
  const lab = useLab();
  const root = useRef<HTMLDivElement>(null);
  const max = Math.max(layers.a, layers.b);

  useGSAP(
    () => {
      if (!lab.animate) return;
      const tl = gsap.timeline({
        defaults: { ease: 'none' },
        scrollTrigger: { trigger: root.current, start: 'top 75%', end: lab.mobile ? 'bottom 75%' : 'bottom 55%', scrub: MOTION.metric_scrub.scrub },
      });
      tl.from('.metric__bar-fill', { scaleX: 0, stagger: 0.1 })
        .from('[data-layer="raw"]', { autoAlpha: 0, y: 12 })
        .from('[data-layer="meaningful"]', { autoAlpha: 0, y: 12 })
        .from('[data-layer="for-you"]', { autoAlpha: 0, y: 12 });
    },
    { scope: root, dependencies: [lab.animate, lab.mobile, scenarioKey], revertOnUpdate: true },
  );

  return (
    <div ref={root} className="metric">
      <dl className="metric__bars">
        {[
          { side: 'a', label: 'BYD SEAL', v: layers.a },
          { side: 'b', label: 'Tesla Model 3', v: layers.b },
        ].map((r) => (
          <div key={r.side} className={`metric__row metric__row--${r.side}`}>
            <dt>{r.label}</dt>
            <dd>
              <span className="metric__bar" aria-hidden="true">
                <span className="metric__bar-fill" style={{ transform: `scaleX(${r.v / max})` }} />
              </span>
              <span className="mono metric__value">
                {r.v} {layers.unit}
              </span>
            </dd>
          </div>
        ))}
      </dl>
      <ol className="metric__layers">
        <li data-layer="raw">
          <span className="eyebrow">Raw difference</span>
          <span className="mono metric__big">
            {layers.rawText} {layers.unit}
          </span>
        </li>
        <li data-layer="meaningful">
          <span className="eyebrow">Meaningful difference</span>
          <span className="chip">{LEVEL_TEXT[layers.meaningful] ?? layers.meaningful}</span>
        </li>
        <li data-layer="for-you">
          <span className="eyebrow">Meaningful for you</span>
          <span className="chip chip--you">{layers.forYou ? (LEVEL_TEXT[layers.forYou] ?? layers.forYou) : 'Not assessed'}</span>
          {layers.forYouRules.length > 0 && <span className="metric__rules mono">{layers.forYouRules.join(' · ')}</span>}
        </li>
      </ol>
    </div>
  );
}
