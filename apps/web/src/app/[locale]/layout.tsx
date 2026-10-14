import { GeistMono } from 'geist/font/mono';
import { GeistSans } from 'geist/font/sans';
import type { Metadata, Viewport } from 'next';
import { notFound } from 'next/navigation';
import { setRequestLocale } from 'next-intl/server';
import type { ReactNode } from 'react';
import { LANGUAGES, LOCALES, parseLocaleSegment } from '@/i18n/locales';
import { serverEnv } from '@/server/env';
import '../globals.css';

/** Layout raíz por locale: `<html lang>` según el IDIOMA del segmento `{language}-{market}`. */
export const dynamicParams = false;
export function generateStaticParams() {
  return LOCALES.map((l) => ({ locale: l.segment }));
}
/** Origen para URLs absolutas de OG, canonical y JSON-LD (`VSCAR_SITE_URL`). */
export function generateMetadata(): Metadata {
  return { metadataBase: new URL(serverEnv().siteUrl) };
}
export const viewport: Viewport = { themeColor: '#0B0C0E', colorScheme: 'dark', width: 'device-width', initialScale: 1 };

export default async function LocaleLayout({ children, params }: { children: ReactNode; params: Promise<{ locale: string }> }) {
  const { locale: segment } = await params;
  const locale = parseLocaleSegment(segment);
  if (!locale) notFound();
  setRequestLocale(locale.segment);
  return (
    <html lang={LANGUAGES[locale.language].htmlLang} className={`${GeistSans.variable} ${GeistMono.variable}`} data-market={locale.market}>
      <body>{children}</body>
    </html>
  );
}
