'use client';
import { useEffect, useState } from 'react';

/**
 * Compartir comparación (Step 7c §5–10): comparte la URL ACTUAL completa (idioma, mercado, par y escenario en la
 * query), así otro navegador reconstruye la misma comparación. Sin login, sin sesión, sin persistencia.
 * Web Share API si existe (móvil, sobre todo); si no, copia el enlace. Aviso breve en una región `aria-live`.
 */
export interface ShareLabels {
  button: string;
  copied: string;
  copyFailed: string;
  /** Texto ya rellenado ("Mira esta comparación de VScar: A vs B"). */
  text: string;
  /** Step 8b: aviso previo cuando el enlace incluye hechos de unidades usadas introducidos por el usuario. */
  usedNote?: string;
}

type ShareNavigator = Navigator & { share?: (d: ShareData) => Promise<void>; canShare?: (d: ShareData) => boolean };

export function ShareComparison({ labels, title }: { labels: ShareLabels; title: string }) {
  const [status, setStatus] = useState<'' | 'copied' | 'failed'>('');
  useEffect(() => {
    if (!status) return;
    const id = setTimeout(() => setStatus(''), 2500);
    return () => clearTimeout(id);
  }, [status]);

  const share = async () => {
    const url = window.location.href;
    const data: ShareData = { title, text: labels.text, url };
    const nav = navigator as ShareNavigator;
    if (typeof nav.share === 'function' && (!nav.canShare || nav.canShare(data))) {
      try {
        await nav.share(data);
        return;
      } catch (e) {
        // El usuario cerró el diálogo: no es un error. Cualquier otro fallo → se copia el enlace.
        if ((e as DOMException)?.name === 'AbortError') return;
      }
    }
    try {
      await navigator.clipboard.writeText(url);
      setStatus('copied');
    } catch {
      setStatus('failed');
    }
  };

  return (
    <span className="share">
      <button type="button" className="vs-button vs-button--ghost" onClick={share} data-testid="share" aria-describedby={labels.usedNote ? 'share-used-note' : undefined}>
        <span aria-hidden="true">↗ </span>
        {labels.button}
      </button>
      <span className="share__status small" role="status" aria-live="polite" data-testid="share-status">
        {status === 'copied' ? labels.copied : status === 'failed' ? labels.copyFailed : ''}
      </span>
      {labels.usedNote ? (
        <span id="share-used-note" className="share__note small muted" data-testid="share-used-note">
          {labels.usedNote}
        </span>
      ) : null}
    </span>
  );
}
