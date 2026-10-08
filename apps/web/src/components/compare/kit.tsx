import type { CSSProperties, ComponentType, ReactNode } from 'react';

/**
 * Kit de animación inyectable. Los capítulos son componentes compartidos: en el HTML inicial (RSC) usan
 * etiquetas planas (cero JS de Motion en la ruta crítica); en el chunk diferido del recálculo reciben
 * componentes de Motion (layout compartido, crossfade). Un único dueño por propiedad: Motion solo toca
 * lo que pasa por este kit; GSAP solo los nodos `data-split` / `data-scrub-*`.
 */
export interface CardProps {
  className: string;
  style: CSSProperties;
  dim: boolean;
  'aria-label': string;
  children: ReactNode;
}
export interface MarkerProps {
  className: string;
  children: ReactNode;
  hidden?: boolean;
}
export interface MorphProps {
  /** Cambia cuando cambia el contenido (dispara el crossfade `scenario_morph`). */
  morphKey: string;
  className?: string;
  children: ReactNode;
}

export interface MotionKit {
  Card: ComponentType<CardProps>;
  /** Marcador compartido empate ↔ elegido (`layoutId="verdict"`). */
  Marker: ComponentType<MarkerProps>;
  Morph: ComponentType<MorphProps>;
}

export const STATIC_KIT: MotionKit = {
  Card: ({ dim: _dim, children, ...p }) => <article {...p}>{children}</article>,
  Marker: ({ hidden, children, className }) => (
    <span className={className} {...(hidden ? { 'aria-hidden': true } : {})}>
      {children}
    </span>
  ),
  Morph: ({ morphKey: _k, className, children }) => <div className={className}>{children}</div>,
};
