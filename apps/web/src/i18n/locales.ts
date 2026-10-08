/**
 * Idioma × mercado (ADR-012). Son ejes INDEPENDIENTES:
 *   - el idioma decide los textos (y el locale de formato junto con el mercado);
 *   - el mercado decide coches, precios, impuestos, fuentes, energía, moneda y unidades.
 * `/en-es/` = inglés con datos de España. Añadir `en-gb`, `es-mx` o `de-de` es añadir entradas a estos
 * registros (más traducciones y datos), sin tocar engines ni rutas.
 */

export interface LanguageConfig {
  /** Atributo `<html lang>`. */
  htmlLang: string;
  /** Catálogo de mensajes (`messages/{messages}.json`). */
  messages: string;
  nativeName: string;
}

export interface MarketConfig {
  /** Código de mercado de los engines (`EnergyContext.market`, `SENSITIVITY_RANGES`…). */
  engineMarket: string;
  currency: string;
  timeZone: string;
  /** Unidades del MERCADO (no del idioma). */
  units: { distance: 'km' | 'mi'; fuelConsumption: 'L_PER_100KM' | 'MPG_US' | 'MPG_UK'; electricConsumption: 'KWH_PER_100KM' | 'MI_PER_KWH' };
  /** Región de referencia para el contexto energético de la demo. */
  energyRegion: string;
  /** Fecha de referencia del snapshot de energía (Step 7a: snapshot controlado). */
  energyDate: string;
}

export const LANGUAGES = {
  es: { htmlLang: 'es', messages: 'es', nativeName: 'Español' },
  en: { htmlLang: 'en', messages: 'en', nativeName: 'English' },
} as const satisfies Record<string, LanguageConfig>;

export const MARKETS = {
  ES: {
    engineMarket: 'ES',
    currency: 'EUR',
    timeZone: 'Europe/Madrid',
    units: { distance: 'km', fuelConsumption: 'L_PER_100KM', electricConsumption: 'KWH_PER_100KM' },
    energyRegion: 'ES-MD',
    energyDate: '2026-09-24',
  },
} as const satisfies Record<string, MarketConfig>;

export type LanguageCode = keyof typeof LANGUAGES;
export type MarketCode = keyof typeof MARKETS;

export interface AppLocale {
  /** Segmento de URL: `{language}-{market}` en minúsculas. */
  segment: string;
  language: LanguageCode;
  market: MarketCode;
  /** Locale de formato `Intl` para ESTE par (en-ES de CLDR usa separadores españoles; se fija en-GB). */
  formatLocale: string;
  /** Valor `hreflang` (BCP 47). */
  hreflang: string;
}

/** Combinaciones activas. Un locale nuevo = una fila (y sus mensajes/datos). */
export const LOCALES = [
  { segment: 'es-es', language: 'es', market: 'ES', formatLocale: 'es-ES', hreflang: 'es-ES' },
  { segment: 'en-es', language: 'en', market: 'ES', formatLocale: 'en-GB', hreflang: 'en-ES' },
] as const satisfies readonly AppLocale[];

export const DEFAULT_LOCALE: AppLocale = LOCALES[0];

export function parseLocaleSegment(segment: string | undefined | null): AppLocale | undefined {
  if (!segment) return undefined;
  return LOCALES.find((l) => l.segment === segment.toLowerCase());
}

/** Locales del MISMO mercado (hreflang solo entre traducciones equivalentes, Plan §29). */
export function sameMarketLocales(locale: AppLocale): AppLocale[] {
  return LOCALES.filter((l) => l.market === locale.market);
}

export function marketOf(locale: AppLocale): MarketConfig {
  return MARKETS[locale.market];
}

export function languageOf(locale: AppLocale): LanguageConfig {
  return LANGUAGES[locale.language];
}

/** Locale con el mismo mercado y otro idioma (selector de idioma); undefined si no existe la combinación. */
export function switchLanguage(locale: AppLocale, language: LanguageCode): AppLocale | undefined {
  return LOCALES.find((l) => l.market === locale.market && l.language === language);
}
