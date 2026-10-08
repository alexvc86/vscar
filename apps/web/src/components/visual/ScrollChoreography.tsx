'use client';
import { useEffect, useState, type ComponentType } from 'react';
import { afterLoadIdle } from '@/client/scenario-nav';
import { currentTier } from './tier-client';

/**
 * Cargador de la coreografía de scroll. GSAP (ScrollTrigger + SplitText) NO está en el JS crítico:
 * se importa tras `load` + idle (post-LCP) y solo si el tier no es 2D ni hay reduced motion.
 */
export function ScrollChoreography() {
  const [Scenes, setScenes] = useState<ComponentType>();
  useEffect(
    () =>
      afterLoadIdle(() => {
        const d = currentTier();
        if (d.tier === '2D' || d.reducedMotion) return;
        import('./GsapScenes').then((m) => setScenes(() => m.GsapScenes));
      }),
    [],
  );
  return Scenes ? <Scenes /> : null;
}
