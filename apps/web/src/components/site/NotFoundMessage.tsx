'use client';
import { usePathname } from 'next/navigation';

/**
 * 404 con mensaje según la ruta (Step 7b §84): en una comparación, "no encontramos uno de estos vehículos".
 * Los textos llegan ya traducidos del servidor; aquí solo se elige cuál mostrar (también en el SSR).
 */
export interface NotFoundCopy {
  title: string;
  body: string;
  cta: string;
  href: string;
}

export function NotFoundMessage({ generic, compare }: { generic: NotFoundCopy; compare: NotFoundCopy }) {
  const isCompare = /^\/[a-z]{2}-[a-z]{2}\/(compare|comparar)\//.test(usePathname() ?? '');
  const copy = isCompare ? compare : generic;
  return (
    <main id="main" className="page page--narrow" {...(isCompare ? { 'data-testid': 'compare-not-found' } : {})}>
      <h1 className="page__title">{copy.title}</h1>
      <p className="muted">{copy.body}</p>
      <p>
        <a className={`vs-button ${isCompare ? 'vs-button--solid' : 'vs-button--ghost'}`} href={copy.href}>
          {copy.cta}
        </a>
      </p>
    </main>
  );
}
