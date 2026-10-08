import { Suspense } from 'react';
import { DEMO_SLUG } from '@/domain/comparisons';
import { LANGUAGES, sameMarketLocales } from '@/i18n/locales';
import { localizedHref, type AppRoute } from '@/i18n/routes';
import { useI18n } from '@/i18n/use-i18n';
import { LanguageSwitcher, type LanguageOption } from './LanguageSwitcher';

/** Navegación inicial: VScar · Comparar · Metodología · Idioma. Sin mega-menú. */
export function SiteHeader({ route, search = '' }: { route: AppRoute; search?: string }) {
  const { t, locale } = useI18n();
  const options: LanguageOption[] = sameMarketLocales(locale).map((l) => ({
    segment: l.segment,
    short: l.language.toUpperCase(),
    nativeName: LANGUAGES[l.language].nativeName,
    htmlLang: LANGUAGES[l.language].htmlLang,
    hreflang: l.hreflang,
    current: l.segment === locale.segment,
  }));
  const label = t('navigation.languageSwitchLabel', { market: t(`markets.${locale.market}`) });
  return (
    <header className="site-header">
      <a href="#main" className="skip-link">
        {t('common.skipToContent')}
      </a>
      <div className="site-header__inner">
        <a href={localizedHref(locale, { page: 'home' })} className="brand">
          VScar
        </a>
        <nav aria-label={t('navigation.mainNav')} className="site-nav">
          <ul>
            <li>
              <a href={localizedHref(locale, { page: 'compare', slug: DEMO_SLUG })}>{t('navigation.compare')}</a>
            </li>
            <li>
              <a href={localizedHref(locale, { page: 'methodology' })}>{t('navigation.methodology')}</a>
            </li>
          </ul>
        </nav>
        <span className="site-header__market">{t(`markets.${locale.market}`)}</span>
        {/* useSearchParams en una isla: Suspense evita forzar CSR del resto de la página. */}
        <Suspense fallback={<StaticLanguageLinks options={options} label={label} route={route} search={search} />}>
          <LanguageSwitcher options={options} label={label} />
        </Suspense>
      </div>
    </header>
  );
}

function StaticLanguageLinks({ options, label, route, search }: { options: LanguageOption[]; label: string; route: AppRoute; search: string }) {
  return (
    <nav className="lang-switch" aria-label={label}>
      <ul>
        {options.map((o) => (
          <li key={o.segment}>
            <a href={localizedHref(o, route, search)} hrefLang={o.hreflang} lang={o.htmlLang} aria-current={o.current ? 'true' : undefined}>
              {o.short}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}
