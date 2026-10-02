import type { VisualTier } from './tier.ts';

/**
 * Decisión pura del wrapper de atmósfera ThreeUI (THREEUI_EVALUATION §5).
 * El degradado CSS está SIEMPRE debajo: si WebGL no está o falla, la atmósfera nunca queda en blanco.
 */
export type AtmosphereVariant = 'ribbon' | 'stream' | 'off';
export type AtmosphereMode = 'WEBGL_HIGH' | 'WEBGL_LOW' | 'STATIC';

export interface AtmosphereInput {
  tier: VisualTier;
  reducedMotion: boolean;
  motionEnabled: boolean;
  variant: AtmosphereVariant;
  webglFailed: boolean;
  inView: boolean;
}

export function atmosphereMode(i: AtmosphereInput): AtmosphereMode {
  // Reduced motion → fallback estático real (no "WebGL más lento").
  if (i.reducedMotion || !i.motionEnabled || i.variant === 'off' || i.webglFailed || i.tier === '2D' || !i.inView) return 'STATIC';
  return i.tier === 'HIGH' ? 'WEBGL_HIGH' : 'WEBGL_LOW';
}

/** Tope de DPR: ThreeUI usa `devicePixelRatio` sin límite → el wrapper escala el contenedor. */
export const ATMOSPHERE_DPR_CAP: Record<'WEBGL_HIGH' | 'WEBGL_LOW', number> = { WEBGL_HIGH: 1.5, WEBGL_LOW: 1 };

/** Factor de escala CSS para que el canvas real tenga `cap` píxeles por píxel CSS. */
export function dprScale(devicePixelRatio: number, cap: number): number {
  return devicePixelRatio > cap ? devicePixelRatio / cap : 1;
}
