import { useLocale, useTranslations } from 'next-intl';
import type { Message } from '@vscar/decision-engine';
import type { CandidateSide } from '@vscar/ui/tokens';
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
  /** Step 8c: nombre de presentación de cada participante (alias por condición si es la misma variant). */
  names: Readonly<Record<string, string>>;
}

/** Lo mínimo de la vista para nombrar a los participantes. */
export interface NamedCandidates {
  sameVariant: boolean;
  candidates: readonly { side: CandidateSide; name: string; condition: 'new' | 'used'; option: { brand: string; model: string } }[];
}

/**
 * Alias de presentación (Step 8c): con la misma ReferenceVariant en los dos lados, el engine los llama
 * "Volkswagen Golf A / B" (neutro respecto al idioma); la UI los muestra por condición: "Volkswagen Golf nuevo / usado"
 * (o "usado A / usado B" si los dos son usados). Con variants distintas, el nombre del engine tal cual.
 */
export function participantNames(view: NamedCandidates, t: Translator): Record<string, string> {
  if (!view.sameVariant) return {};
  const bothUsed = view.candidates.every((c) => c.condition === 'used');
  return Object.fromEntries(
    view.candidates.map((c) => {
      const name = `${c.option.brand} ${c.option.model}`;
      return [c.name, bothUsed ? t('used.alias.usedSide', { name, side: c.side.toUpperCase() }) : t(`used.alias.${c.condition}`, { name })];
    }),
  );
}

export function useI18n(view?: NamedCandidates): I18n {
  const locale = parseLocaleSegment(useLocale()) ?? DEFAULT_LOCALE;
  const t = useTranslations() as unknown as Translator;
  const f = createFormat(locale.formatLocale, MARKETS[locale.market], { yes: t('technical.boolean.true'), no: t('technical.boolean.false') });
  const names = view ? participantNames(view, t) : {};
  const aliases = Object.keys(names).length ? { aliases: names } : {};
  return { locale, t, f, names, m: (msg) => renderEngineMessage(msg, t, f, { inlineDetails: false, ...aliases }), mInline: (msg) => renderEngineMessage(msg, t, f, aliases) };
}

/** Nombre de presentación de un participante (alias si existe; si no, el del engine). */
export const displayName = (i18n: Pick<I18n, 'names'>, name: string) => i18n.names[name] ?? name;

export type { Format, Translator };
