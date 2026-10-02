/**
 * Tier visual (VSCAR_VISUAL_DIRECTION_V0_1 §10.3). Función pura y determinista: las señales se leen aparte
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
  /** Reduced motion efectivo (preferencia del sistema o simulación del lab). */
  reducedMotion: boolean;
  reasons: string[];
}

const MOBILE_MAX = 700;
const DESKTOP_MIN = 1024;

export function resolveVisualTier(s: TierSignals, override: TierOverride = 'AUTO'): TierDecision {
  const reasons: string[] = [];
  if (override === 'REDUCED' || s.reducedMotion) {
    reasons.push(override === 'REDUCED' ? 'reduced motion (simulated)' : 'prefers-reduced-motion');
    return { tier: '2D', reducedMotion: true, reasons };
  }
  // Sin WebGL nunca hay tier WebGL, aunque se fuerce desde el panel.
  if (!s.webgl) return { tier: '2D', reducedMotion: false, reasons: ['WebGL unavailable'] };
  if (override !== 'AUTO') return { tier: override, reducedMotion: false, reasons: [`override ${override}`] };

  if (s.saveData) return { tier: '2D', reducedMotion: false, reasons: ['save-data'] };
  if (s.effectiveType === '2g' || s.effectiveType === 'slow-2g') return { tier: '2D', reducedMotion: false, reasons: [`network ${s.effectiveType}`] };
  if ((s.deviceMemory !== undefined && s.deviceMemory <= 2) || (s.hardwareConcurrency !== undefined && s.hardwareConcurrency <= 2)) {
    return { tier: '2D', reducedMotion: false, reasons: ['low-end device'] };
  }
  if (s.effectiveType === '3g') reasons.push('network 3g');
  if (s.viewportWidth < MOBILE_MAX) reasons.push('mobile viewport');
  const strong = s.webgl2 && (s.deviceMemory ?? 8) >= 8 && (s.hardwareConcurrency ?? 8) >= 8 && s.viewportWidth >= DESKTOP_MIN && s.effectiveType !== '3g';
  if (strong) return { tier: 'HIGH', reducedMotion: false, reasons: ['WebGL2, ≥ 8 GB, ≥ 8 cores, desktop viewport'] };
  if (!s.webgl2) reasons.push('WebGL1 only');
  return { tier: 'LOW', reducedMotion: false, reasons: reasons.length ? reasons : ['mid-range device'] };
}

/** Lectura de señales en el navegador (no se testea: es un adaptador del entorno). */
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
