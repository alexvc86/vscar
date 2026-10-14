import { BODY_PROFILES, profileFor, svgPath } from './silhouette.ts';

/**
 * Silueta GENÉRICA por clase de carrocería (fallback del selector, Step 7b.2). Decorativa: el nombre del coche ya está
 * en el texto de la tarjeta. No usa gradientes con id (puede repetirse muchas veces en la misma página).
 */
const W = 1000;
const H = 384;

export function BodySilhouette({ bodyType, className }: { bodyType: string; className?: string }) {
  const p = BODY_PROFILES[profileFor(bodyType)];
  return (
    <svg viewBox={`0 0 ${W} ${H + 40}`} className={className ?? 'body-silhouette'} aria-hidden="true" focusable="false" data-silhouette={profileFor(bodyType)}>
      <ellipse cx={W / 2} cy={H * 0.82 + 10} rx={W * 0.5} ry={22} fill="#000" fillOpacity={0.45} />
      <path d={svgPath(p.body, W, H)} fill="var(--vs-raised)" stroke="var(--vs-line-strong)" strokeWidth={3} />
      <path d={svgPath(p.window, W, H)} fill="var(--vs-base)" fillOpacity={0.9} stroke="var(--vs-line)" strokeWidth={2} />
      {p.wheels.map((w) => (
        <g key={w.x}>
          <circle cx={w.x * W} cy={(1 - w.y) * H} r={w.r * H} fill="var(--vs-base)" stroke="#3a3d42" strokeWidth={6} />
          <circle cx={w.x * W} cy={(1 - w.y) * H} r={w.r * H * 0.5} fill="none" stroke="var(--vs-line-strong)" strokeWidth={3} />
        </g>
      ))}
    </svg>
  );
}
