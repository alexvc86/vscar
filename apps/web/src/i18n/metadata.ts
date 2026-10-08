import type { Metadata } from 'next';
import { sameMarketLocales, type AppLocale } from './locales.ts';
import { localizedHref, type AppRoute } from './routes.ts';

/**
 * Fundación SEO por locale (Step 7a §25): `canonical` sin el escenario (es estado del usuario) y
 * `hreflang` solo entre idiomas del MISMO mercado (Plan §29); `x-default` → locale por defecto del mercado.
 */
export function localeAlternates(locale: AppLocale, route: AppRoute): Metadata['alternates'] {
  const siblings = sameMarketLocales(locale);
  return {
    canonical: localizedHref(locale, route),
    languages: {
      ...Object.fromEntries(siblings.map((l) => [l.hreflang, localizedHref(l, route)])),
      'x-default': localizedHref(siblings[0]!, route),
    },
  };
}
