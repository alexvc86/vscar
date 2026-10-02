'use client';
import { motion, useInView } from 'motion/react';
import dynamic from 'next/dynamic';
import { Component, useRef, useState, type ReactNode } from 'react';
import { useLab } from '@/lab/lab-context';
import { MOTION, sec } from '@/lab/tokens';
import { VehicleSvg } from './VehicleSvg';

/**
 * Effect 2 — Vehicle entry. SVG es la base obligatoria y el fallback de todo:
 * tier 2D / reduced motion / fallo WebGL / mientras carga el chunk → SVG. OGL y R3F van en chunks propios.
 * Propiedad: Motion anima SOLO el wrapper (opacity/x); el interior WebGL lo anima su librería.
 */
const Ogl = dynamic(() => import('./VehicleOgl'), { ssr: false });
const R3F = dynamic(() => import('./VehicleSilhouetteR3F'), { ssr: false });

const RGB = { a: [0.557, 0.773, 1] as [number, number, number], b: [0.886, 0.745, 0.541] as [number, number, number] };
const HEX = { a: '#8EC5FF', b: '#E2BE8A' };

class GLBoundary extends Component<{ fallback: ReactNode; children: ReactNode }, { failed: boolean }> {
  override state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  override render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}

export function VehicleStage({ side, label, lit }: { side: 'a' | 'b'; label: string; lit: number }) {
  const lab = useLab();
  const box = useRef<HTMLDivElement>(null);
  // Lazy real: el chunk y el contexto WebGL solo se crean cerca del viewport (y se quedan: once).
  const near = useInView(box, { once: true, margin: '50% 0px' });
  const [glOk] = useState(() => typeof window === 'undefined' || !!document.createElement('canvas').getContext('webgl'));
  const renderer = lab.decision.tier === '2D' || !glOk ? 'SVG' : lab.renderer;
  const svg = <VehicleSvg side={side} lit={lit} title={`${label} — silueta genérica de sedán (no es una imagen del fabricante)`} />;
  const reduced = lab.decision.reducedMotion;
  const dir = side === 'a' ? -1 : 1;

  return (
    <motion.div
      ref={box}
      className="vehicle-stage"
      data-renderer={renderer}
      initial={lab.motion ? (reduced ? { opacity: 0 } : { opacity: 0, x: 48 * dir * (lab.mobile ? 0.5 : 1) }) : false}
      whileInView={{ opacity: 1, x: 0 }}
      viewport={{ once: true, amount: 0.4 }}
      transition={reduced ? { duration: MOTION.vehicle_entry.reduced_ms / 1000 } : { duration: sec(MOTION.vehicle_entry.ms, lab.mobile), ease: MOTION.vehicle_entry.css }}
    >
      {renderer === 'SVG' || !near ? (
        svg
      ) : (
        <>
          <span className="sr-only" role="img" aria-label={`${label} — silueta genérica de sedán`} />
          <GLBoundary fallback={svg}>
            {renderer === 'OGL' ? (
              <Ogl color={RGB[side]} lit={lit} animate={lab.animate} mobile={lab.mobile} />
            ) : (
              <R3F color={HEX[side]} lit={lit} animate={lab.animate} mobile={lab.mobile} />
            )}
          </GLBoundary>
        </>
      )}
    </motion.div>
  );
}
