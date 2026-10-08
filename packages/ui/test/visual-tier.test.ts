import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { COLOR, MOTION } from '../src/tokens.ts';
import { atmosphereMode, dprScale, resolveVisualTier, tierOverrideFrom, type TierSignals } from '../src/visual-tier.ts';

const DESKTOP: TierSignals = { reducedMotion: false, webgl: true, webgl2: true, deviceMemory: 8, hardwareConcurrency: 12, viewportWidth: 1440 };

describe('resolveVisualTier (validated in Step 6e)', () => {
  it('strong desktop → HIGH; mid / mobile / WebGL1 / 3g → LOW', () => {
    expect(resolveVisualTier(DESKTOP).tier).toBe('HIGH');
    expect(resolveVisualTier({ ...DESKTOP, deviceMemory: 4 }).tier).toBe('LOW');
    expect(resolveVisualTier({ ...DESKTOP, viewportWidth: 390 }).tier).toBe('LOW');
    expect(resolveVisualTier({ ...DESKTOP, webgl2: false }).tier).toBe('LOW');
    expect(resolveVisualTier({ ...DESKTOP, effectiveType: '3g' }).tier).toBe('LOW');
  });
  it('save-data / 2g / low-end → 2D', () => {
    expect(resolveVisualTier({ ...DESKTOP, saveData: true }).tier).toBe('2D');
    expect(resolveVisualTier({ ...DESKTOP, effectiveType: '2g' }).tier).toBe('2D');
    expect(resolveVisualTier({ ...DESKTOP, hardwareConcurrency: 2 }).tier).toBe('2D');
  });
  it('reduced motion → 2D + reducedMotion regardless of override', () => {
    for (const o of ['AUTO', 'HIGH', 'LOW', 'REDUCED'] as const) expect(resolveVisualTier({ ...DESKTOP, reducedMotion: o !== 'REDUCED' }, o)).toMatchObject({ tier: '2D', reducedMotion: true });
  });
  it('no WebGL → 2D even when forced HIGH', () => expect(resolveVisualTier({ ...DESKTOP, webgl: false, webgl2: false }, 'HIGH').tier).toBe('2D'));
  it('dev override only when enabled', () => {
    expect(tierOverrideFrom('high', true)).toBe('HIGH');
    expect(tierOverrideFrom('high', false)).toBe('AUTO');
    expect(tierOverrideFrom('nonsense', true)).toBe('AUTO');
  });
});

describe('atmosphere wrapper', () => {
  const base = { tier: 'HIGH' as const, reducedMotion: false, webglFailed: false, inView: true };
  it('maps tiers and falls back to STATIC on any restriction or failure', () => {
    expect(atmosphereMode(base)).toBe('WEBGL_HIGH');
    expect(atmosphereMode({ ...base, tier: 'LOW' })).toBe('WEBGL_LOW');
    for (const p of [{ reducedMotion: true }, { webglFailed: true }, { tier: '2D' as const }, { inView: false }]) expect(atmosphereMode({ ...base, ...p })).toBe('STATIC');
  });
  it('caps DPR', () => expect(dprScale(3, 1.5)).toBe(2));
});

describe('tokens', () => {
  it('CSS tokens mirror the TS palette', () => {
    const css = readFileSync(join(import.meta.dirname, '..', 'src', 'styles', 'tokens.css'), 'utf8').toLowerCase();
    for (const v of Object.values(COLOR.dark)) expect(css).toContain(v.toLowerCase());
    for (const v of Object.values(COLOR.light)) expect(css).toContain(v.toLowerCase());
  });
  it('motion tokens stay inside the Step 6d limits (interaction ≤ 400 ms, reveal ≤ 1.2 s)', () => {
    expect(MOTION.scenario_morph.ms).toBeLessThanOrEqual(400);
    expect(MOTION.vehicle_entry.ms).toBeLessThanOrEqual(1200);
  });
});
