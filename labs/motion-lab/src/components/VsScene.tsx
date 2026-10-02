'use client';
import { useGSAP } from '@gsap/react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useRef } from 'react';
import { useLab } from '@/lab/lab-context';
import { MOTION } from '@/lab/tokens';

gsap.registerPlugin(useGSAP, ScrollTrigger);

/**
 * Effect 3 — VS transition. Sticky CSS (no pin de GSAP, sin hijacking, scroll nativo) + scrub corto.
 * GSAP es dueño de x/opacity de `.vs__name` y scale/opacity de `.vs__mark`; nada más anima esos nodos.
 */
export function VsScene() {
  const lab = useLab();
  const root = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      if (!lab.animate) return;
      const d = lab.mobile ? 0.5 : 1;
      const tl = gsap.timeline({
        defaults: { ease: 'none' },
        scrollTrigger: { trigger: root.current, start: 'top top', end: 'bottom bottom', scrub: MOTION.versus_transition.scrub },
      });
      tl.from('.vs__name--a', { xPercent: -60 * d, autoAlpha: 0 }, 0)
        .from('.vs__name--b', { xPercent: 60 * d, autoAlpha: 0 }, 0)
        .from('.vs__mark', { scale: 0.6, autoAlpha: 0 }, 0.15)
        .to('.vs__name', { autoAlpha: 0.35 }, 0.75);
    },
    { scope: root, dependencies: [lab.animate, lab.mobile], revertOnUpdate: true },
  );

  return (
    <section ref={root} className="vs" aria-labelledby="vs-title">
      <div className="vs__sticky">
        <h2 id="vs-title" className="sr-only">
          BYD SEAL versus Tesla Model 3
        </h2>
        <div className="vs__row" aria-hidden="true">
          <span className="vs__name vs__name--a">BYD SEAL</span>
          <span className="vs__mark">VS</span>
          <span className="vs__name vs__name--b">Model 3</span>
        </div>
      </div>
    </section>
  );
}
