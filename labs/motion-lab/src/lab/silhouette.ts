/**
 * Perfil de sedán fastback propio (sin fotos, sin logos, sin assets externos). Coordenadas normalizadas:
 * x 0 (trasera) → 1 (frontal), y 0 (suelo) → 1 (techo). Lo comparten SVG, OGL (máscara) y R3F (extrusión).
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
