'use client';
import dynamic from 'next/dynamic';
import { Component, useEffect, useRef, useState, type ReactNode } from 'react';
import { ATMOSPHERE_DPR_CAP, atmosphereMode, dprScale, type AtmosphereVariant } from '@/lab/atmosphere';
import { useLab } from '@/lab/lab-context';
import { MOTION } from '@/lab/tokens';

/**
 * ThreeAtmosphere: único punto de uso de ThreeUI (THREEUI_EVALUATION §5).
 * - Degradado CSS siempre debajo (LCP-safe, nunca en blanco).
 * - ThreeUI solo en tier HIGH/LOW, con motion, sin reduced motion, cerca del viewport.
 * - Carga diferida por subruta + next/dynamic(ssr:false); fallo de WebGL → se queda el CSS.
 * - DPR limitado escalando el contenedor (ThreeUI usa devicePixelRatio sin tope).
 */
const Ribbon = dynamic(() => import('@designcodeio/threeui/components/RibbonFieldBackground').then((m) => m.RibbonFieldBackground), { ssr: false });
const Stream = dynamic(() => import('@designcodeio/threeui/components/StreamConvergenceBackground').then((m) => m.StreamConvergenceBackground), { ssr: false });

class WebGLBoundary extends Component<{ onFail: () => void; children: ReactNode }, { failed: boolean }> {
  override state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  override componentDidCatch() {
    this.props.onFail();
  }
  override render() {
    return this.state.failed ? null : this.props.children;
  }
}

export function ThreeAtmosphere({ variant, tone = 'neutral' }: { variant?: AtmosphereVariant; tone?: 'neutral' | 'a' | 'b' | 'balance' }) {
  const lab = useLab();
  const ref = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(false);
  const [webglFailed, setWebglFailed] = useState(false);
  const v = variant ?? lab.atmosphere;
  const mode = atmosphereMode({ tier: lab.decision.tier, reducedMotion: lab.decision.reducedMotion, motionEnabled: lab.motion, variant: v, webglFailed, inView });

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => setInView(!!e?.isIntersecting), { rootMargin: '200% 0px' });
    io.observe(el);
    return () => io.disconnect();
  }, []);
  // Contexto perdido o sin WebGL real: el canvas de ThreeUI no lanza, así que se comprueba aquí.
  useEffect(() => {
    if (mode === 'STATIC') return;
    const c = document.createElement('canvas');
    if (!c.getContext('webgl')) setWebglFailed(true);
    const lost = () => setWebglFailed(true);
    const el = ref.current;
    el?.addEventListener('webglcontextlost', lost, true);
    return () => el?.removeEventListener('webglcontextlost', lost, true);
  }, [mode]);

  const scale = mode === 'STATIC' || typeof window === 'undefined' ? 1 : dprScale(window.devicePixelRatio || 1, ATMOSPHERE_DPR_CAP[mode]);
  const speed = mode === 'WEBGL_HIGH' ? MOTION.atmosphere_speed.HIGH : MOTION.atmosphere_speed.LOW;
  const hue = tone === 'a' ? -0.08 : tone === 'b' ? 0.08 : 0;

  return (
    <div ref={ref} aria-hidden="true" data-atmosphere-mode={mode} className={`atmosphere atmosphere--${tone}`}>
      {mode !== 'STATIC' && (
        <div className="atmosphere__gl" style={scale > 1 ? { width: `${100 / scale}%`, height: `${100 / scale}%`, transform: `scale(${scale})`, transformOrigin: '0 0' } : undefined}>
          <WebGLBoundary onFail={() => setWebglFailed(true)}>
            {v === 'stream' ? (
              <Stream speed={speed} opacity={0.55} brightness={0.8} saturation={0.6} hue={hue} fidelity={mode === 'WEBGL_HIGH' ? 0.5 : 0.25} className="atmosphere__canvas" />
            ) : (
              <Ribbon speed={speed} opacity={0.6} brightness={0.85} saturation={0.55} hue={hue} pointerAmount={lab.mobile ? 0 : 0.4} className="atmosphere__canvas" />
            )}
          </WebGLBoundary>
        </div>
      )}
    </div>
  );
}
