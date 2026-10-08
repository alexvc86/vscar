import { startTransition } from 'react';
import { serializeScenario, type Scenario } from '@/domain/scenario';

/**
 * Cambio de escenario SIN recarga: la URL se actualiza con `history.pushState` (Next sincroniza
 * `useSearchParams`) y el recálculo ocurre en el chunk diferido. Sin JS, los enlaces navegan al servidor.
 */
export const CHAPTERS_UPDATED = 'vscar:chapters-updated';

/**
 * La actualización de la URL (y por tanto del escenario) es NO URGENTE: se cede primero al pintado
 * (rAF + tarea) y después va en `startTransition`. El input pinta en el siguiente frame y el router, la
 * carga del chunk y el recálculo ocurren después (INP).
 */
function push(next: string): void {
  if (`${location.pathname}${location.search}` === next) return;
  requestAnimationFrame(() => setTimeout(() => startTransition(() => window.history.pushState(null, '', next)), 0));
}

/**
 * Tras cambiar el escenario, el usuario va al resultado (lo que ha cambiado): salto instantáneo, sin
 * animación de scroll, y foco en el titular para lectores de pantalla. Los bloques que llegan después
 * del worker quedan fuera del viewport, así el recálculo no desplaza lo que se está leyendo.
 */
export function revealResult(): void {
  const heading = document.getElementById('result-title');
  document.getElementById('result')?.scrollIntoView({ block: 'start', behavior: 'auto' });
  heading?.focus({ preventScroll: true });
}

export function pushScenario(pathname: string, scenario: Scenario): void {
  revealResult();
  push(`${pathname}${serializeScenario(scenario)}`);
}

export function pushHref(href: string): void {
  const url = new URL(href, location.href);
  revealResult();
  push(`${url.pathname}${url.search}`);
}

export function notifyChaptersUpdated(): void {
  window.dispatchEvent(new Event(CHAPTERS_UPDATED));
}

/** Espera a que la página esté cargada y el hilo libre (estrategia post-LCP para GSAP y ThreeUI). */
export function afterLoadIdle(cb: () => void): () => void {
  let cancelled = false;
  let idle: number | undefined;
  let timer: ReturnType<typeof setTimeout> | undefined;
  const run = () => {
    if (cancelled) return;
    const ric = (window as Window & { requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => number }).requestIdleCallback;
    if (ric) idle = ric(() => !cancelled && cb(), { timeout: 2000 });
    else timer = setTimeout(() => !cancelled && cb(), 200);
  };
  if (document.readyState === 'complete') run();
  else window.addEventListener('load', run, { once: true });
  return () => {
    cancelled = true;
    window.removeEventListener('load', run);
    if (idle !== undefined) (window as Window & { cancelIdleCallback?: (id: number) => void }).cancelIdleCallback?.(idle);
    if (timer) clearTimeout(timer);
  };
}
