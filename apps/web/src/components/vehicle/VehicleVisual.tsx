import type { CandidateSide } from '@vscar/ui/tokens';
import { BODY, WHEELS, WINDOW, svgPath } from './silhouette.ts';

/**
 * Arquitectura de visual de vehículo (Step 7a §7):
 *   VehicleVisual  — API estable que usan las páginas (vehículo, lado, luz, contexto).
 *   VehicleSilhouette — renderer SVG de Alpha (ADR-011: SVG ONLY). Cero JS, server-rendered.
 * Otro renderer futuro se conecta en `VehicleVisual` sin tocar las páginas.
 */
export type VehicleRenderer = 'svg';

export interface VehicleVisualProps {
  side: CandidateSide;
  /** 0–1: intensidad de la luz (empate: igual en ambos; seleccionado: luz principal). */
  lit: number;
  /** Texto accesible (nombre + aviso de silueta genérica). */
  label: string;
  /** Prefijo único para los ids de los degradados SVG. */
  idPrefix: string;
  renderer?: VehicleRenderer;
  className?: string;
}

export function VehicleVisual({ renderer = 'svg', ...props }: VehicleVisualProps) {
  switch (renderer) {
    case 'svg':
      return <VehicleSilhouette {...props} />;
  }
}

const W = 1000;
const H = 384;

export function VehicleSilhouette({ side, lit, label, idPrefix, className }: Omit<VehicleVisualProps, 'renderer'>) {
  const id = `${idPrefix}-${side}`;
  const color = side === 'a' ? 'var(--vs-candidate-a)' : 'var(--vs-candidate-b)';
  return (
    <svg viewBox={`0 0 ${W} ${H + 40}`} className={className ?? 'vehicle-svg'} role="img" aria-label={label} data-lit={lit}>
      <defs>
        <linearGradient id={`${id}-body`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={color} stopOpacity={0.35 + 0.4 * lit} />
          <stop offset="0.55" stopColor="var(--vs-raised)" />
          <stop offset="1" stopColor="var(--vs-base)" />
        </linearGradient>
        <linearGradient id={`${id}-spec`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="var(--vs-text)" stopOpacity="0" />
          <stop offset={side === 'a' ? '0.62' : '0.38'} stopColor="var(--vs-text)" stopOpacity={0.15 + 0.55 * lit} />
          <stop offset="1" stopColor="var(--vs-text)" stopOpacity="0" />
        </linearGradient>
        <radialGradient id={`${id}-shadow`} cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor="#000" stopOpacity="0.7" />
          <stop offset="1" stopColor="#000" stopOpacity="0" />
        </radialGradient>
      </defs>
      <ellipse cx={W / 2} cy={H * 0.82 + 8} rx={W * 0.52} ry={26} fill={`url(#${id}-shadow)`} />
      <path d={svgPath(BODY, W, H)} fill={`url(#${id}-body)`} stroke={color} strokeOpacity={0.35 + 0.5 * lit} strokeWidth={2} />
      <path d={svgPath(BODY.slice(3, 10), W, H).replace(' Z', '')} fill="none" stroke={`url(#${id}-spec)`} strokeWidth={3} />
      <path d={svgPath(WINDOW, W, H)} fill="var(--vs-base)" fillOpacity={0.85} stroke={color} strokeOpacity={0.25} />
      {WHEELS.map((w) => (
        <g key={w.x}>
          <circle cx={w.x * W} cy={(1 - w.y) * H} r={w.r * H} fill="var(--vs-base)" stroke="#3a3d42" strokeWidth={6} />
          <circle cx={w.x * W} cy={(1 - w.y) * H} r={w.r * H * 0.55} fill="none" stroke={color} strokeOpacity={0.25 + 0.4 * lit} strokeWidth={3} />
        </g>
      ))}
    </svg>
  );
}
