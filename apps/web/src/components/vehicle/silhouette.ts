/**
 * Perfil de sedán fastback propio (sin fotos, sin logos, sin assets externos). Coordenadas normalizadas:
 * x 0 (trasera) → 1 (frontal), y 0 (suelo) → 1 (techo). Base del renderer SVG de Alpha (ADR-011): un renderer futuro puede reutilizar el mismo perfil.
 * Ambos candidatos usan la MISMA escala: los fixtures no traen dimensiones de BYD SEAL ni Model 3 y no se inventan.
 */
export const BODY: readonly (readonly [number, number])[] = [
  [0.035, 0.2],
  [0.012, 0.3],
  [0.03, 0.42],
  [0.1, 0.47],
  [0.25, 0.53],
  [0.4, 0.78],
  [0.56, 0.8],
  [0.66, 0.74],
  [0.77, 0.56],
  [0.92, 0.49],
  [0.985, 0.4],
  [0.995, 0.24],
  [0.975, 0.2],
];
export const WINDOW: readonly (readonly [number, number])[] = [
  [0.3, 0.55],
  [0.42, 0.74],
  [0.55, 0.755],
  [0.63, 0.705],
  [0.71, 0.56],
];
export const WHEELS = [
  { x: 0.205, y: 0.17, r: 0.125 },
  { x: 0.79, y: 0.17, r: 0.125 },
] as const;
export const ASPECT = 2.6;

/** Path SVG en un viewBox de `w × h` (y invertida). */
export function svgPath(points: readonly (readonly [number, number])[], w: number, h: number): string {
  return points.map(([x, y], i) => `${i ? 'L' : 'M'}${(x * w).toFixed(1)} ${((1 - y) * h).toFixed(1)}`).join(' ') + ' Z';
}

/**
 * Step 7b.2 — perfiles GENÉRICOS por clase de carrocería para el fallback del selector. No representan ningún modelo:
 * dibujan una clase (berlina, compacto, SUV). Cuando no hay imagen con derechos, el selector muestra la del tipo
 * de carrocería de la variant, sin fingir exactitud.
 */
export interface BodyProfile {
  body: readonly (readonly [number, number])[];
  window: readonly (readonly [number, number])[];
  wheels: readonly { x: number; y: number; r: number }[];
}

export const BODY_PROFILES: Record<'sedan' | 'hatchback' | 'suv', BodyProfile> = {
  sedan: { body: BODY, window: WINDOW, wheels: WHEELS },
  hatchback: {
    body: [
      [0.035, 0.2],
      [0.015, 0.32],
      [0.03, 0.6],
      [0.09, 0.76],
      [0.36, 0.82],
      [0.55, 0.8],
      [0.66, 0.72],
      [0.78, 0.56],
      [0.92, 0.5],
      [0.985, 0.4],
      [0.995, 0.24],
      [0.975, 0.2],
    ],
    window: [
      [0.08, 0.58],
      [0.11, 0.72],
      [0.36, 0.78],
      [0.55, 0.765],
      [0.63, 0.71],
      [0.71, 0.58],
    ],
    wheels: [
      { x: 0.2, y: 0.17, r: 0.13 },
      { x: 0.79, y: 0.17, r: 0.13 },
    ],
  },
  suv: {
    body: [
      [0.03, 0.22],
      [0.015, 0.36],
      [0.025, 0.66],
      [0.07, 0.86],
      [0.6, 0.89],
      [0.7, 0.8],
      [0.8, 0.65],
      [0.93, 0.59],
      [0.99, 0.48],
      [0.995, 0.28],
      [0.975, 0.22],
    ],
    window: [
      [0.07, 0.66],
      [0.1, 0.83],
      [0.6, 0.86],
      [0.68, 0.78],
      [0.76, 0.66],
    ],
    wheels: [
      { x: 0.2, y: 0.19, r: 0.15 },
      { x: 0.8, y: 0.19, r: 0.15 },
    ],
  },
};

/** Clase de silueta por tipo de carrocería (catálogo v0.2). */
export function profileFor(bodyType: string): keyof typeof BODY_PROFILES {
  if (bodyType === 'suv' || bodyType === 'pickup') return 'suv';
  if (bodyType === 'hatchback' || bodyType === 'estate' || bodyType === 'mpv' || bodyType === 'van') return 'hatchback';
  return 'sedan';
}
