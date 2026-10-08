import { METHODOLOGY_VERSION } from '@vscar/methodology';
import { useI18n } from '@/i18n/use-i18n';

export function SiteFooter() {
  const { t } = useI18n();
  return (
    <footer className="site-footer">
      <div className="site-footer__inner">
        <p className="muted small">{t('common.tagline')}</p>
        <p className="muted small mono">
          {t('common.devSnapshot')} · Methodology {METHODOLOGY_VERSION}
        </p>
      </div>
    </footer>
  );
}
