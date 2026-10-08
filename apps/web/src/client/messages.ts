import { LANGUAGES, type LanguageCode } from '@/i18n/locales';

/**
 * Mensajes para los chunks cliente diferidos. El HTML inicial no envía catálogos al cliente: se cargan
 * (un chunk por idioma) solo cuando el usuario recalcula o abre la hoja de escenario.
 */
const cache = new Map<string, Record<string, unknown>>();
export async function loadMessages(language: LanguageCode): Promise<Record<string, unknown>> {
  const file = LANGUAGES[language].messages;
  const hit = cache.get(file);
  if (hit) return hit;
  const messages = (await import(`../../messages/${file}.json`)).default as Record<string, unknown>;
  cache.set(file, messages);
  return messages;
}
