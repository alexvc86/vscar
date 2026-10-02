import { useId } from 'react';
import { BODY, WHEELS, WINDOW, svgPath } from '@/lab/silhouette';

/**
 * Renderer base OBLIGATORIO (2D): SVG puro, cero JS de WebGL. La "luz" es un degradado y un reflejo cuya
 * intensidad (`lit` 0–1) cambia el estado (empate: igual en ambos; seleccionado: luz principal).
 */
export function VehicleSvg({ side, lit = 0.6, title }: { side: 'a' | 'b'; lit?: number; title: string }) {
  const id = useId().replace(/:/g, '');
  const W = 1000;
  const H = 384;
  const color = side === 'a' ? 'var(--candidate-a)' : 'var(--candidate-b)';
  return (
    <svg viewBox={`0 0 ${W} ${H + 40}`} className="vehicle-svg" role="img" aria-label={title}>
      <defs>
        <linearGradient id={`body-${id}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={color} stopOpacity={0.35 + 0.4 * lit} />
          <stop offset="0.55" stopColor="#1E2125" stopOpacity="1" />
          <stop offset="1" stopColor="#0B0C0E" stopOpacity="1" />
        </linearGradient>
        <linearGradient id={`spec-${id}`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#F2F1EC" stopOpacity="0" />
          <stop offset={side === 'a' ? '0.62' : '0.38'} stopColor="#F2F1EC" stopOpacity={0.15 + 0.55 * lit} />
          <stop offset="1" stopColor="#F2F1EC" stopOpacity="0" />
        </linearGradient>
        <radialGradient id={`shadow-${id}`} cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor="#000" stopOpacity="0.7" />
          <stop offset="1" stopColor="#000" stopOpacity="0" />
        </radialGradient>
      </defs>
      <ellipse cx={W / 2} cy={H * 0.82 + 8} rx={W * 0.52} ry={26} fill={`url(#shadow-${id})`} />
      <path d={svgPath(BODY, W, H)} fill={`url(#body-${id})`} stroke={color} strokeOpacity={0.35 + 0.5 * lit} strokeWidth={2} />
      <path d={svgPath(BODY.slice(3, 10), W, H).replace(' Z', '')} fill="none" stroke={`url(#spec-${id})`} strokeWidth={3} />
      <path d={svgPath(WINDOW, W, H)} fill="#0B0C0E" fillOpacity={0.85} stroke={color} strokeOpacity={0.25} />
      {WHEELS.map((w) => (
        <g key={w.x}>
          <circle cx={w.x * W} cy={(1 - w.y) * H} r={w.r * H} fill="#0B0C0E" stroke="#3a3d42" strokeWidth={6} />
          <circle cx={w.x * W} cy={(1 - w.y) * H} r={w.r * H * 0.55} fill="none" stroke={color} strokeOpacity={0.25 + 0.4 * lit} strokeWidth={3} />
        </g>
      ))}
    </svg>
  );
}
