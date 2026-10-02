'use client';
import { useGSAP } from '@gsap/react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { SplitText } from 'gsap/SplitText';
import { useRef } from 'react';
import { useLab } from '@/lab/lab-context';
import { MOTION, sec } from '@/lab/tokens';

gsap.registerPlugin(useGSAP, ScrollTrigger, SplitText);

/**
 * Effect 3 (parte texto): line-mask reveal. El lector de pantalla lee la frase completa (sr-only);
 * la copia animada es aria-hidden, así SplitText nunca rompe la lectura palabra a palabra.
 * `useGSAP` revierte split + tweens + ScrollTriggers al desmontar (y en HMR).
 */
export function SplitHeading({ as: Tag = 'h2', text, className, scrub = false }: { as?: 'h1' | 'h2' | 'h3'; text: string; className?: string; scrub?: boolean }) {
  const lab = useLab();
  const ref = useRef<HTMLSpanElement>(null);

  useGSAP(
    () => {
      if (!lab.animate || !ref.current) return;
      const split = SplitText.create(ref.current, { type: 'lines', mask: 'lines', linesClass: 'split-line' });
      gsap.from(split.lines, {
        yPercent: 110,
        duration: sec(MOTION.section_enter.ms, lab.mobile),
        stagger: (lab.mobile ? MOTION.mobile_stagger_ms : MOTION.section_enter.stagger_ms) / 1000,
        ease: MOTION.section_enter.gsap,
        scrollTrigger: scrub
          ? { trigger: ref.current, start: 'top 85%', end: lab.mobile ? 'top 55%' : 'top 40%', scrub: MOTION.versus_transition.scrub }
          : { trigger: ref.current, start: 'top 85%', once: true },
      });
      return () => split.revert();
    },
    { dependencies: [lab.animate, lab.mobile, text, scrub], revertOnUpdate: true },
  );

  return (
    <Tag className={className}>
      <span className="sr-only">{text}</span>
      <span ref={ref} aria-hidden="true" className="split-copy">
        {text}
      </span>
    </Tag>
  );
}
