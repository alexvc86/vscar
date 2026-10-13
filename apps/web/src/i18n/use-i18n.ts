import { useLocale, useTranslations } from 'next-intl';
import type { Message } from '@vscar/decision-engine';
import { renderEngineMessage, type Translator } from './engine-messages.ts';
import { createFormat, type Format } from './format.ts';
import { DEFAULT_LOCALE, MARKETS, parseLocaleSegment, type AppLocale } from './locales.ts';

/**
 * Acceso único a traducción + formato para componentes compartidos. Funciona igual como Server Component
 * (resultado inicial en el HTML) y como Client Component (recálculo dentro del chunk diferido).
 */
export interface I18n {
  locale: AppLocale;
  t: Translator;
  f: Format;
  /** Mensaje del engine localizado (texto principal; los `details` los muestra `MessageText`). */
  m: (msg: Message) => string;
  /** Mensaje del engine con sus `details` en línea (para contextos de una sola línea). */
  mInline: (msg: Message) => string;
}

export function useI18n(): I18n {
  const locale = parseLocaleSegment(useLocale()) ?? DEFAULT_LOCALE;
  const t = useTranslations() as unknown as Translator;
  const f = createFormat(locale.formatLocale, MARKETS[locale.market], { yes: t('technical.boolean.true'), no: t('technical.boolean.false') });
  return { locale, t, f, m: (msg) => renderEngineMessage(msg, t, f, { inlineDetails: false }), mInline: (msg) => renderEngineMessage(msg, t, f) };
}

export type { Format, Translator };
