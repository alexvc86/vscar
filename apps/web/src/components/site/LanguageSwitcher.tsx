'use client';
import { usePathname, useSearchParams } from 'next/navigation';
import { swapLocaleInPath } from '@/i18n/routes';

/**
 * Selector ES | EN. Cambia SOLO el idioma: conserva mercado, página, comparación y escenario (query).
 * Son enlaces normales (funcionan sin JS); con JS, la query refleja el escenario actual de la URL.
 */
export interface LanguageOption {
  segment: string;
  short: string;
  nativeName: string;
  htmlLang: string;
  hreflang: string;
  current: boolean;
}

export function LanguageSwitcher({ options, label }: { options: LanguageOption[]; label: string }) {
  const pathname = usePathname();
  const params = useSearchParams();
  const search = params.toString() ? `?${params.toString()}` : '';
  return (
    <nav className="lang-switch" aria-label={label}>
      <ul>
        {options.map((o) => (
          <li key={o.segment}>
            <a
              href={swapLocaleInPath(pathname, search, o)}
              hrefLang={o.hreflang}
              lang={o.htmlLang}
              aria-current={o.current ? 'true' : undefined}
              title={o.nativeName}
              data-lang-switch={o.short.toLowerCase()}
            >
              <span aria-hidden="true">{o.short}</span>
              <span className="sr-only">{o.nativeName}</span>
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}
