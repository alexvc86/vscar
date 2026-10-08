import { getRequestConfig } from 'next-intl/server';
import { DEFAULT_LOCALE, LANGUAGES, MARKETS, parseLocaleSegment } from './locales.ts';

/**
 * next-intl sin middleware: el locale de next-intl ES el segmento `{language}-{market}` (`es-es`, `en-es`).
 * Los mensajes se eligen por IDIOMA; la zona horaria por MERCADO.
 */
export default getRequestConfig(async ({ requestLocale }) => {
  const locale = parseLocaleSegment(await requestLocale) ?? DEFAULT_LOCALE;
  const messages = (await import(`../../messages/${LANGUAGES[locale.language].messages}.json`)).default;
  return {
    locale: locale.segment,
    messages,
    timeZone: MARKETS[locale.market].timeZone,
    // Una clave ausente nunca rompe la página ni muestra la clave cruda en producción.
    getMessageFallback: ({ namespace, key }) => (process.env.NODE_ENV === 'production' ? '' : `${namespace ? `${namespace}.` : ''}${key}`),
  };
});
