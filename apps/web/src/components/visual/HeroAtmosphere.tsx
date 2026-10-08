'use client';
import { MOTION } from '@vscar/ui/tokens';
import { ATMOSPHERE_DPR_CAP, atmosphereMode, dprScale, type AtmosphereMode } from '@vscar/ui/visual-tier';
import { Component, useEffect, useRef, useState, type ComponentType, type ReactNode } from 'react';
import { afterLoadIdle } from '@/client/scenario-nav';
import { currentTier } from './tier-client';

/**
 * Atmósfera del hero (ADR-011 §1–2): ThreeUI RibbonField, decorativa, diferida y envuelta.
 * El degradado CSS vive en el HTML del servidor (`.atmosphere`) y queda SIEMPRE debajo:
 * reduced motion, sin WebGL, contexto perdido, tier 2D o fallo del chunk → solo degradado, nunca canvas vacío.
 */
type RibbonProps = { speed: number; opacity: number; brightness: number; saturation: number; hue: number; pointerAmount: number; className?: string };

class Boundary extends Component<{ onFail: () => void; children: ReactNode }, { failed: boolean }> {
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

export function HeroAtmosphere() {
  const host = useRef<HTMLDivElement>(null);
  const [Ribbon, setRibbon] = useState<ComponentType<RibbonProps>>();
  const [mode, setMode] = useState<AtmosphereMode>('STATIC');
  const [failed, setFailed] = useState(false);
  const [mobile, setMobile] = useState(false);

  useEffect(() => {
    const el = host.current;
    if (!el) return;
    let io: IntersectionObserver | undefined;
    const cancel = afterLoadIdle(() => {
      const decision = currentTier();
      setMobile(window.innerWidth < 700);
      io = new IntersectionObserver(([e]) => {
        const m = atmosphereMode({ tier: decision.tier, reducedMotion: decision.reducedMotion, webglFailed: false, inView: !!e?.isIntersecting });
        setMode(m);
        if (m !== 'STATIC')
          import('@designcodeio/threeui/components/RibbonFieldBackground')
            .then((mod) => setRibbon(() => mod.RibbonFieldBackground as unknown as ComponentType<RibbonProps>))
            .catch(() => setFailed(true));
      });
      io.observe(el);
    });
    const lost = () => setFailed(true);
    el.addEventListener('webglcontextlost', lost, true);
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const onMq = () => {
      if (mq.matches) setFailed(true);
    };
    mq.addEventListener('change', onMq);
    return () => {
      cancel();
      io?.disconnect();
      el.removeEventListener('webglcontextlost', lost, true);
      mq.removeEventListener('change', onMq);
    };
  }, []);

  const active = mode !== 'STATIC' && !failed && Ribbon;
  const scale = active ? dprScale(window.devicePixelRatio || 1, ATMOSPHERE_DPR_CAP[mode]) : 1;
  return (
    <div ref={host} className="atmosphere__gl" data-atmosphere-mode={active ? mode : 'STATIC'} aria-hidden="true">
      {active ? (
        <div className="atmosphere__scale" style={scale > 1 ? { width: `${100 / scale}%`, height: `${100 / scale}%`, transform: `scale(${scale})`, transformOrigin: '0 0' } : undefined}>
          <Boundary onFail={() => setFailed(true)}>
            <Ribbon
              speed={mode === 'WEBGL_HIGH' ? MOTION.atmosphere_speed.HIGH : MOTION.atmosphere_speed.LOW}
              opacity={mobile ? 0.45 : 0.6}
              brightness={0.85}
              saturation={0.55}
              hue={-0.08}
              pointerAmount={mobile ? 0 : 0.4}
              className="atmosphere__canvas"
            />
          </Boundary>
        </div>
      ) : null}
    </div>
  );
}
