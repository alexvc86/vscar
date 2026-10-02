'use client';
import { useEffect, useState } from 'react';
import type { AtmosphereVariant } from '@/lab/atmosphere';
import { useLab, type Renderer } from '@/lab/lab-context';
import { SCENARIO_SELECTED, SCENARIO_TIE } from '@/lab/pipeline';
import type { TierOverride } from '@/lab/tier';

/** FPS por rAF (ventana de 500 ms). Solo existe mientras el panel lo muestra. */
function useFps(on: boolean) {
  const [fps, setFps] = useState<number>();
  useEffect(() => {
    if (!on) return;
    let raf = 0;
    let n = 0;
    let t0 = performance.now();
    const tick = (t: number) => {
      n++;
      if (t - t0 >= 500) {
        setFps(Math.round((n * 1000) / (t - t0)));
        n = 0;
        t0 = t;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [on]);
  return on ? fps : undefined;
}

export function DevPanel({ pipelineMs, robustness, onRobustness }: { pipelineMs: number; robustness?: { ms: number; level: string }; onRobustness: () => void }) {
  const lab = useLab();
  const [showFps, setShowFps] = useState(false);
  const fps = useFps(showFps);
  return (
    <details className="devpanel">
      <summary>Lab panel</summary>
      <div className="devpanel__grid">
        <label>
          Tier
          <select value={lab.tierOverride} onChange={(e) => lab.set({ tierOverride: e.target.value as TierOverride })}>
            {(['AUTO', 'HIGH', 'LOW', '2D', 'REDUCED'] as const).map((t) => (
              <option key={t}>{t}</option>
            ))}
          </select>
        </label>
        <label>
          Renderer
          <select value={lab.renderer} onChange={(e) => lab.set({ renderer: e.target.value as Renderer })}>
            {(['SVG', 'OGL', 'R3F'] as const).map((t) => (
              <option key={t}>{t}</option>
            ))}
          </select>
        </label>
        <label>
          Atmosphere
          <select value={lab.atmosphere} onChange={(e) => lab.set({ atmosphere: e.target.value as AtmosphereVariant })}>
            {(['ribbon', 'stream', 'off'] as const).map((t) => (
              <option key={t}>{t}</option>
            ))}
          </select>
        </label>
        <label className="devpanel__check">
          <input type="checkbox" checked={lab.motion} onChange={(e) => lab.set({ motion: e.target.checked })} /> Motion
        </label>
        <label className="devpanel__wide">
          Long trips / year: <span className="mono">{lab.longTrips}</span>
          <input type="range" min={0} max={12} value={lab.longTrips} onChange={(e) => lab.set({ longTrips: Number(e.target.value) })} />
        </label>
        <div className="devpanel__wide devpanel__buttons">
          <button type="button" onClick={() => lab.set({ longTrips: SCENARIO_TIE })}>A · {SCENARIO_TIE}</button>
          <button type="button" onClick={() => lab.set({ longTrips: SCENARIO_SELECTED })}>B · {SCENARIO_SELECTED}</button>
          <button type="button" onClick={onRobustness}>Compute robustness</button>
        </div>
        <label className="devpanel__check">
          <input type="checkbox" checked={showFps} onChange={(e) => setShowFps(e.target.checked)} /> FPS
        </label>
        <dl className="devpanel__stats mono">
          <dt>tier</dt>
          <dd data-testid="tier">
            {lab.decision.tier}
            {lab.decision.reducedMotion ? ' (reduced)' : ''}
          </dd>
          <dt>why</dt>
          <dd>{lab.decision.reasons.join(', ')}</dd>
          <dt>renderer</dt>
          <dd>{lab.decision.tier === '2D' ? 'SVG (2D)' : lab.renderer}</dd>
          <dt>pipeline</dt>
          <dd data-testid="pipeline-ms">{pipelineMs.toFixed(1)} ms</dd>
          {robustness && (
            <>
              <dt>robustness</dt>
              <dd>
                {robustness.level} · {robustness.ms.toFixed(0)} ms
              </dd>
            </>
          )}
          {fps !== undefined && (
            <>
              <dt>fps</dt>
              <dd data-testid="fps">{fps}</dd>
            </>
          )}
        </dl>
      </div>
    </details>
  );
}
