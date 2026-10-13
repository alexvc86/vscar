import { NotFoundMessage } from '@/components/site/NotFoundMessage';
import { SiteFooter } from '@/components/site/SiteFooter';
import { SiteHeader } from '@/components/site/SiteHeader';
import { localizedHref } from '@/i18n/routes';
import { useI18n } from '@/i18n/use-i18n';

export default function NotFound() {
  const { t, locale } = useI18n();
  const home = localizedHref(locale, { page: 'home' });
  return (
    <>
      <SiteHeader route={{ page: 'home' }} />
      <NotFoundMessage
        generic={{ title: t('errors.notFoundTitle'), body: t('errors.notFoundBody'), cta: t('errors.backHome'), href: home }}
        compare={{ title: t('catalog.notFoundTitle'), body: t('catalog.notFoundBody'), cta: t('catalog.chooseOther'), href: `${home}#compare` }}
      />
      <SiteFooter />
    </>
  );
}
