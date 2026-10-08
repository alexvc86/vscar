import type { AppLocale } from './locales.ts';

/**
 * Rutas canónicas (ADR-012): el segmento funcional es estable e idéntico en todos los idiomas
 * (`/es-es/compare/…`, `/en-es/compare/…`); solo se traducen las etiquetas visibles.
 * `/es-es/comparar/…` redirige a la forma canónica (next.config).
 */
export type AppRoute = { page: 'home' } | { page: 'compare'; slug: string } | { page: 'methodology' };

export function routePath(route: AppRoute): string {
  switch (route.page) {
    case 'home':
      return '/';
    case 'compare':
      return `/compare/${route.slug}`;
    case 'methodology':
      return '/methodology';
  }
}

export function localizedHref(locale: Pick<AppLocale, 'segment'>, route: AppRoute, search?: string): string {
  const path = routePath(route);
  // Sin barra final (Next normaliza `/es-es/` → `/es-es`): evita un redirect extra.
  const base = path === '/' ? `/${locale.segment}` : `/${locale.segment}${path}`;
  return search ? `${base}${search.startsWith('?') ? search : `?${search}`}` : base;
}

/** Cambia solo el segmento de locale de un pathname, conservando página, slug y query. */
export function swapLocaleInPath(pathname: string, search: string, target: Pick<AppLocale, 'segment'>): string {
  const parts = pathname.split('/');
  // ['', 'es-es', 'compare', 'slug']
  if (parts.length < 2 || !parts[1]) return `/${target.segment}${search}`;
  parts[1] = target.segment;
  const path = parts.join('/').replace(/\/$/, '');
  return `${path}${search}`;
}
