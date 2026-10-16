'use client';
import { useEffect } from 'react';

/**
 * Step 8c — al llegar a la comparación tras cambiar una unidad usada o actualizar la fecha de evaluación (`#result`):
 * foco en el titular del resultado (lectores de pantalla y teclado). Además retira de la URL el parámetro transitorio
 * `prev_eval` (solo sirve para explicar qué cambió), para que compartir no lo arrastre. Sin efecto en otros casos.
 */
export function ArrivalFocus() {
  useEffect(() => {
    const url = new URL(window.location.href);
    if (url.searchParams.has('prev_eval')) {
      url.searchParams.delete('prev_eval');
      window.history.replaceState(window.history.state, '', `${url.pathname}${url.search}${url.hash}`);
    }
    if (url.hash === '#result') document.getElementById('result-title')?.focus({ preventScroll: false });
  }, []);
  return null;
}
