'use client';
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { AtmosphereVariant } from './atmosphere.ts';
import { readTierSignals, resolveVisualTier, type TierDecision, type TierOverride, type TierSignals } from './tier.ts';

export type Renderer = 'SVG' | 'OGL' | 'R3F';

export interface LabSettings {
  tierOverride: TierOverride;
  renderer: Renderer;
  atmosphere: AtmosphereVariant;
  motion: boolean;
  longTrips: number;
}

interface LabState extends LabSettings {
  decision: TierDecision;
  signals?: TierSignals;
  mobile: boolean;
  /** Animaciones activas: motion ON y sin reduced motion. */
  animate: boolean;
  set: (patch: Partial<LabSettings>) => void;
}

const Ctx = createContext<LabState | null>(null);

/** Ajustes iniciales desde la query (?tier=LOW&renderer=OGL&trips=10…): solo lab, para capturas reproducibles. */
function initial(): LabSettings {
  const q = typeof window === 'undefined' ? new URLSearchParams() : new URLSearchParams(window.location.search);
  const pick = <T extends string>(k: string, allowed: readonly T[], d: T) => (allowed.includes(q.get(k) as T) ? (q.get(k) as T) : d);
  return {
    tierOverride: pick('tier', ['AUTO', 'HIGH', 'LOW', '2D', 'REDUCED'] as const, 'AUTO'),
    renderer: pick('renderer', ['SVG', 'OGL', 'R3F'] as const, 'SVG'),
    atmosphere: pick('atmosphere', ['ribbon', 'stream', 'off'] as const, 'ribbon'),
    motion: q.get('motion') !== 'off',
    longTrips: Number.isFinite(Number(q.get('trips'))) && q.get('trips') !== null ? Math.max(0, Math.min(12, Number(q.get('trips')))) : 1,
  };
}

export function LabProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<LabSettings>(() => ({ tierOverride: 'AUTO', renderer: 'SVG', atmosphere: 'ribbon', motion: true, longTrips: 1 }));
  const [signals, setSignals] = useState<TierSignals>();
  useEffect(() => {
    setSettings(initial());
    const read = () => setSignals(readTierSignals());
    read();
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    mq.addEventListener('change', read);
    window.addEventListener('resize', read);
    return () => {
      mq.removeEventListener('change', read);
      window.removeEventListener('resize', read);
    };
  }, []);
  const value = useMemo<LabState>(() => {
    const decision = signals ? resolveVisualTier(signals, settings.tierOverride) : { tier: '2D' as const, reducedMotion: false, reasons: ['server render'] };
    return {
      ...settings,
      decision,
      ...(signals ? { signals } : {}),
      mobile: (signals?.viewportWidth ?? 1440) < 700,
      animate: settings.motion && !decision.reducedMotion,
      set: (patch) => setSettings((s) => ({ ...s, ...patch })),
    };
  }, [settings, signals]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useLab(): LabState {
  const v = useContext(Ctx);
  if (!v) throw new Error('useLab outside LabProvider');
  return v;
}
