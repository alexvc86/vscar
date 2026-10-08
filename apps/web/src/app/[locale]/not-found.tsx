import { useI18n } from '@/i18n/use-i18n';
import { localizedHref } from '@/i18n/routes';

export default function NotFound() {
  const { t, locale } = useI18n();
  return (
    <main id="main" className="page page--narrow">
      <h1 className="page__title">{t('errors.notFoundTitle')}</h1>
      <p className="muted">{t('errors.notFoundBody')}</p>
      <p>
        <a className="vs-button vs-button--ghost" href={localizedHref(locale, { page: 'home' })}>
          {t('errors.backHome')}
        </a>
      </p>
    </main>
  );
}
