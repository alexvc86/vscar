'use client';
import dynamic from 'next/dynamic';
import { useEffect, useState } from 'react';
import { useUi } from '@/client/store';
import type { LanguageCode } from '@/i18n/locales';

const ScenarioSheet = dynamic(() => import('./ScenarioSheet'), { ssr: false });

/** Monta la hoja solo tras la primera apertura (chunk diferido: formulario, Zod y Radix Dialog). */
export function ScenarioSheetHost({ pathname, slug, locale, language, usedSides = [] }: { pathname: string; slug: string; locale: string; language: LanguageCode; usedSides?: ('a' | 'b')[] }) {
  const open = useUi((s) => s.sheetOpen);
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    if (open) setMounted(true);
  }, [open]);
  return mounted ? <ScenarioSheet pathname={pathname} slug={slug} locale={locale} language={language} hasUsed={usedSides.length > 0} /> : null;
}
