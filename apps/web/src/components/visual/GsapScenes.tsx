'use client';
import { useGSAP } from '@gsap/react';
import { MOTION } from '@vscar/ui/tokens';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { SplitText } from 'gsap/SplitText';
import { useEffect, useState } from 'react';
import { CHAPTERS_UPDATED } from '@/client/scenario-nav';

gsap.registerPlugin(useGSAP, ScrollTrigger, SplitText);

/**
 * Coreografía de scroll (chunk diferido). Scroll nativo: CSS sticky + ScrollTrigger scrub, sin `pin`,
 * sin smooth scroll, sin hijacking. GSAP es el ÚNICO dueño de: líneas `data-split`, `[data-vs-*]` del hero
 * y `[data-scrub-*]` de la métrica. Nada visible queda oculto: solo se anima lo que aún está bajo el
 * viewport, y el estado final es el del HTML. `useGSAP` revierte todo al desmontar o al rehacer.
 */
const below = (el: Element) => el.getBoundingClientRect().top > window.innerHeight;

export function GsapScenes() {
  const [version, setVersion] = useState(0);
  useEffect(() => {
    const bump = () => setVersion((v) => v + 1);
    window.addEventListener(CHAPTERS_UPDATED, bump);
    return () => window.removeEventListener(CHAPTERS_UPDATED, bump);
  }, []);

  useGSAP(
    () => {
      const mobile = window.innerWidth < 700;
      const k = mobile ? MOTION.mobile_distance_factor : 1;
      const dur = (ms: number) => (mobile ? ms * MOTION.mobile_factor : ms) / 1000;

      // 00 VS: separación A · VS · B ligada al scroll (≤ 0,5 viewport atado; sticky solo en escritorio).
      const hero = document.querySelector('[data-vs-scene]');
      if (hero) {
        gsap
          .timeline({ defaults: { ease: 'none' }, scrollTrigger: { trigger: hero, start: 'top top', end: mobile ? '+=40%' : '+=50%', scrub: MOTION.versus_transition.scrub } })
          .to('[data-vs-a]', { xPercent: -6 * k }, 0)
          .to('[data-vs-b]', { xPercent: 6 * k }, 0)
          .to('[data-vs-mark]', { opacity: 0.35, scale: 0.92 }, 0);
      }

      // Titulares: máscara por línea, una vez, solo si aún no se han visto.
      const splits: SplitText[] = [];
      for (const el of gsap.utils.toArray<HTMLElement>('[data-split]')) {
        if (!below(el)) continue;
        const split = SplitText.create(el, { type: 'lines', mask: 'lines', linesClass: 'split-line' });
        splits.push(split);
        gsap.from(split.lines, {
          yPercent: 110,
          duration: dur(MOTION.section_enter.ms),
          stagger: (mobile ? MOTION.mobile_stagger_ms : MOTION.section_enter.stagger_ms) / 1000,
          ease: MOTION.section_enter.gsap,
          scrollTrigger: { trigger: el, start: 'top 85%', once: true },
          // Tras revelar, el titular vuelve a ser texto plano (misma altura): rehacer la coreografía no lo mueve.
          onComplete: () => split.revert(),
        });
      }

      // Métrica: barras + capas RAW → MEANINGFUL → FOR YOU con scrub (valores intactos).
      for (const m of gsap.utils.toArray<HTMLElement>('[data-scrub-metric]')) {
        if (!below(m)) continue;
        gsap
          .timeline({ defaults: { ease: 'none' }, scrollTrigger: { trigger: m, start: 'top 80%', end: mobile ? 'top 45%' : 'top 30%', scrub: MOTION.metric_scrub.scrub } })
          .from(m.querySelectorAll('[data-scrub-bar]'), { scaleX: 0, stagger: 0.1 })
          .from(m.querySelectorAll('[data-scrub-layer="raw"]'), { autoAlpha: 0, y: 12 * k })
          .from(m.querySelectorAll('[data-scrub-layer="meaningful"]'), { autoAlpha: 0, y: 12 * k })
          .from(m.querySelectorAll('[data-scrub-layer="for-you"]'), { autoAlpha: 0, y: 12 * k });
      }
      // Recuento visible en el DOM para verificar la limpieza (HMR / recálculos): solo lectura.
      document.documentElement.dataset.scrollTriggers = String(ScrollTrigger.getAll().length);
      return () => splits.forEach((s) => s.revert());
    },
    { dependencies: [version], revertOnUpdate: true },
  );
  return null;
}
