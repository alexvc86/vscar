/**
 * Tier visual (VSCAR_VISUAL_DIRECTION_V0_1 §10.3), validado en el Motion Lab (Step 6e) y extraído aquí sin
 * cambios de lógica. Funciones puras y deterministas: las señales del navegador se leen aparte
 * (`readTierSignals`) para poder testear la decisión sin navegador.
 */
export type VisualTier = 'HIGH' | 'LOW' | '2D';
export type TierOverride = 'AUTO' | 'HIGH' | 'LOW' | '2D' | 'REDUCED';

export interface TierSignals {
  reducedMotion: boolean;
  saveData?: boolean;
  effectiveType?: string;
  deviceMemory?: number;
  hardwareConcurrency?: number;
  webgl: boolean;
  webgl2: boolean;
  viewportWidth: number;
}

export interface TierDecision {
  tier: VisualTier;
  /** Reduced motion efectivo (preferencia del sistema o simulación). */
  reducedMotion: boolean;
  reasons: string[];
}

export const MOBILE_MAX_WIDTH = 700;
const DESKTOP_MIN = 1024;

export function resolveVisualTier(s: TierSignals, override: TierOverride = 'AUTO'): TierDecision {
  const reasons: string[] = [];
  if (override === 'REDUCED' || s.reducedMotion) {
    reasons.push(override === 'REDUCED' ? 'reduced motion (simulated)' : 'prefers-reduced-motion');
    return { tier: '2D', reducedMotion: true, reasons };
  }
  // Sin WebGL nunca hay tier WebGL, aunque se fuerce.
  if (!s.webgl) return { tier: '2D', reducedMotion: false, reasons: ['WebGL unavailable'] };
  if (override !== 'AUTO') return { tier: override, reducedMotion: false, reasons: [`override ${override}`] };

  if (s.saveData) return { tier: '2D', reducedMotion: false, reasons: ['save-data'] };
  if (s.effectiveType === '2g' || s.effectiveType === 'slow-2g') return { tier: '2D', reducedMotion: false, reasons: [`network ${s.effectiveType}`] };
  if ((s.deviceMemory !== undefined && s.deviceMemory <= 2) || (s.hardwareConcurrency !== undefined && s.hardwareConcurrency <= 2)) {
    return { tier: '2D', reducedMotion: false, reasons: ['low-end device'] };
  }
  if (s.effectiveType === '3g') reasons.push('network 3g');
  if (s.viewportWidth < MOBILE_MAX_WIDTH) reasons.push('mobile viewport');
  const strong = s.webgl2 && (s.deviceMemory ?? 8) >= 8 && (s.hardwareConcurrency ?? 8) >= 8 && s.viewportWidth >= DESKTOP_MIN && s.effectiveType !== '3g';
  if (strong) return { tier: 'HIGH', reducedMotion: false, reasons: ['WebGL2, ≥ 8 GB, ≥ 8 cores, desktop viewport'] };
  if (!s.webgl2) reasons.push('WebGL1 only');
  return { tier: 'LOW', reducedMotion: false, reasons: reasons.length ? reasons : ['mid-range device'] };
}

/** Lectura de señales en el navegador (adaptador del entorno; no se testea). */
export function readTierSignals(): TierSignals {
  const nav = navigator as Navigator & { deviceMemory?: number; connection?: { saveData?: boolean; effectiveType?: string } };
  let webgl = false;
  let webgl2 = false;
  try {
    const c = document.createElement('canvas');
    webgl2 = !!c.getContext('webgl2');
    webgl = webgl2 || !!c.getContext('webgl');
  } catch {
    webgl = false;
  }
  return {
    reducedMotion: window.matchMedia('(prefers-reduced-motion: reduce)').matches,
    ...(nav.connection?.saveData !== undefined ? { saveData: nav.connection.saveData } : {}),
    ...(nav.connection?.effectiveType ? { effectiveType: nav.connection.effectiveType } : {}),
    ...(nav.deviceMemory !== undefined ? { deviceMemory: nav.deviceMemory } : {}),
    ...(nav.hardwareConcurrency ? { hardwareConcurrency: nav.hardwareConcurrency } : {}),
    webgl,
    webgl2,
    viewportWidth: window.innerWidth,
  };
}

/** Override de desarrollo (`?tier=HIGH|LOW|2D|REDUCED`); en producción siempre AUTO. */
export function tierOverrideFrom(value: string | null | undefined, enabled: boolean): TierOverride {
  if (!enabled || !value) return 'AUTO';
  const v = value.toUpperCase();
  return v === 'HIGH' || v === 'LOW' || v === '2D' || v === 'REDUCED' ? v : 'AUTO';
}

// ------------------------------------------------------------------------------------------ atmosphere

/**
 * Decisión pura del wrapper de atmósfera (ThreeUI RibbonField, ADR-011 §1–2). El degradado CSS está
 * SIEMPRE debajo: reduced motion, sin WebGL, contexto perdido o tier 2D → STATIC (nunca canvas en blanco).
 */
export type AtmosphereMode = 'WEBGL_HIGH' | 'WEBGL_LOW' | 'STATIC';

export interface AtmosphereInput {
  tier: VisualTier;
  reducedMotion: boolean;
  webglFailed: boolean;
  inView: boolean;
}

export function atmosphereMode(i: AtmosphereInput): AtmosphereMode {
  if (i.reducedMotion || i.webglFailed || i.tier === '2D' || !i.inView) return 'STATIC';
  return i.tier === 'HIGH' ? 'WEBGL_HIGH' : 'WEBGL_LOW';
}

/** Tope de DPR: ThreeUI usa `devicePixelRatio` sin límite → el wrapper escala el contenedor. */
export const ATMOSPHERE_DPR_CAP: Record<'WEBGL_HIGH' | 'WEBGL_LOW', number> = { WEBGL_HIGH: 1.5, WEBGL_LOW: 1 };

/** Factor de escala CSS para que el canvas real tenga `cap` píxeles por píxel CSS. */
export function dprScale(devicePixelRatio: number, cap: number): number {
  return devicePixelRatio > cap ? devicePixelRatio / cap : 1;
}
