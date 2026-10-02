import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { atmosphereMode, dprScale } from '../src/lab/atmosphere.ts';
import { IDS, runLab, SCENARIO_SELECTED, SCENARIO_TIE } from '../src/lab/pipeline.ts';
import { resolveVisualTier, type TierSignals } from '../src/lab/tier.ts';
import { rangeLayers, resultView } from '../src/lab/view-model.ts';

const DESKTOP: TierSignals = { reducedMotion: false, webgl: true, webgl2: true, deviceMemory: 8, hardwareConcurrency: 12, viewportWidth: 1440 };

describe('resolveVisualTier', () => {
  it('strong desktop → HIGH', () => expect(resolveVisualTier(DESKTOP).tier).toBe('HIGH'));
  it('mid desktop (4 GB) → LOW', () => expect(resolveVisualTier({ ...DESKTOP, deviceMemory: 4 }).tier).toBe('LOW'));
  it('mobile viewport → LOW', () => expect(resolveVisualTier({ ...DESKTOP, viewportWidth: 390 }).tier).toBe('LOW'));
  it('WebGL1 only → LOW', () => expect(resolveVisualTier({ ...DESKTOP, webgl2: false }).tier).toBe('LOW'));
  it('3g → LOW', () => expect(resolveVisualTier({ ...DESKTOP, effectiveType: '3g' }).tier).toBe('LOW'));
  it('save-data / 2g / low-end → 2D', () => {
    expect(resolveVisualTier({ ...DESKTOP, saveData: true }).tier).toBe('2D');
    expect(resolveVisualTier({ ...DESKTOP, effectiveType: '2g' }).tier).toBe('2D');
    expect(resolveVisualTier({ ...DESKTOP, deviceMemory: 2 }).tier).toBe('2D');
    expect(resolveVisualTier({ ...DESKTOP, hardwareConcurrency: 2 }).tier).toBe('2D');
  });
  it('no WebGL → 2D even when overridden to HIGH', () => expect(resolveVisualTier({ ...DESKTOP, webgl: false, webgl2: false }, 'HIGH').tier).toBe('2D'));
  it('override applies when WebGL is available', () => expect(resolveVisualTier({ ...DESKTOP, deviceMemory: 2 }, 'HIGH').tier).toBe('HIGH'));
  it('is deterministic', () => expect(resolveVisualTier(DESKTOP)).toEqual(resolveVisualTier(DESKTOP)));
});

describe('reduced motion forces 2D', () => {
  it('system preference → 2D + reducedMotion, ignoring overrides', () => {
    for (const o of ['AUTO', 'HIGH', 'LOW'] as const) {
      const d = resolveVisualTier({ ...DESKTOP, reducedMotion: true }, o);
      expect(d).toMatchObject({ tier: '2D', reducedMotion: true });
    }
  });
  it('lab simulation REDUCED → 2D + reducedMotion', () => expect(resolveVisualTier(DESKTOP, 'REDUCED')).toMatchObject({ tier: '2D', reducedMotion: true }));
});

describe('ThreeAtmosphere wrapper fallback', () => {
  const base = { tier: 'HIGH' as const, reducedMotion: false, motionEnabled: true, variant: 'ribbon' as const, webglFailed: false, inView: true };
  it('HIGH/LOW map to WebGL modes', () => {
    expect(atmosphereMode(base)).toBe('WEBGL_HIGH');
    expect(atmosphereMode({ ...base, tier: 'LOW' })).toBe('WEBGL_LOW');
  });
  it('any failure or restriction → STATIC (CSS gradient, never blank)', () => {
    expect(atmosphereMode({ ...base, reducedMotion: true })).toBe('STATIC');
    expect(atmosphereMode({ ...base, webglFailed: true })).toBe('STATIC');
    expect(atmosphereMode({ ...base, tier: '2D' })).toBe('STATIC');
    expect(atmosphereMode({ ...base, motionEnabled: false })).toBe('STATIC');
    expect(atmosphereMode({ ...base, variant: 'off' })).toBe('STATIC');
    expect(atmosphereMode({ ...base, inView: false })).toBe('STATIC');
  });
  it('caps DPR', () => {
    expect(dprScale(2, 1.5)).toBeCloseTo(4 / 3);
    expect(dprScale(1, 1.5)).toBe(1);
  });
});

describe('real decision pipeline (no hardcoded winner)', () => {
  it('commuter scenario A → PRACTICAL_TIE', () => {
    const { result } = runLab(SCENARIO_TIE);
    expect(result.alphaBestForYou.status).toBe('PRACTICAL_TIE');
    expect(resultView(result).status).toBe('PRACTICAL_TIE');
  });
  it('changing only longTripsPerYear → real BYD selection', () => {
    const { result } = runLab(SCENARIO_SELECTED);
    expect(result.alphaBestForYou.status).toBe('BEST_FOR_YOU');
    expect(result.alphaBestForYou.candidateId).toBe(IDS.byd);
    const v = resultView(result);
    expect(v.status).toBe('SELECTED');
    expect(v.reasons.length).toBeGreaterThan(0);
    expect(v.reasons.length).toBeLessThanOrEqual(3);
    expect(v.confidence.reasons.length).toBeLessThanOrEqual(3);
  });
  it('range metric comes from the Comparison Engine, oriented from BYD', () => {
    const l = rangeLayers(runLab(SCENARIO_TIE).range)!;
    expect(l).toBeDefined();
    expect(l.a - l.b).toBeGreaterThan(0);
    expect(l.rawText).toBe(`+${l.a - l.b}`);
  });
  it('switch point between tie and selection lies inside the slider range', () => {
    const statuses = Array.from({ length: 13 }, (_, t) => runLab(t).result.alphaBestForYou.status);
    expect(statuses).toContain('PRACTICAL_TIE');
    expect(statuses).toContain('BEST_FOR_YOU');
  });
});

describe('boundary: no DB / connectors / worker / mysql', () => {
  const FORBIDDEN = /['"](@vscar\/db|@vscar\/data-connectors|@vscar\/worker|@vscar\/fixtures|mysql2?|drizzle-orm)(\/[^'"]*)?['"]/;
  const files = (d: string): string[] => readdirSync(d).flatMap((f) => (statSync(join(d, f)).isDirectory() ? files(join(d, f)) : [join(d, f)]));
  it('src/ never imports them', () => {
    const offenders = files(join(import.meta.dirname, '..', 'src')).filter((f) => /\.(ts|tsx)$/.test(f) && FORBIDDEN.test(readFileSync(f, 'utf8')));
    expect(offenders).toEqual([]);
  });
  it('runtime dependencies do not include them', () => {
    const pkg = JSON.parse(readFileSync(join(import.meta.dirname, '..', 'package.json'), 'utf8')) as { dependencies: Record<string, string> };
    expect(Object.keys(pkg.dependencies).filter((d) => /^(@vscar\/(db|data-connectors|worker|fixtures)|mysql2?|drizzle-orm)$/.test(d))).toEqual([]);
  });
});
