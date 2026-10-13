import { createTranslator } from 'next-intl';
import { describe, expect, it } from 'vitest';
import en from '../messages/en.json';
import es from '../messages/es.json';
import type { Translator } from '../src/i18n/engine-messages.ts';
import { createFormat } from '../src/i18n/format.ts';
import { LOCALES, MARKETS, marketOf, parseLocaleSegment, sameMarketLocales, switchLanguage } from '../src/i18n/locales.ts';
import { localeAlternates } from '../src/i18n/metadata.ts';
import { localizedHref, swapLocaleInPath } from '../src/i18n/routes.ts';

const tr = (segment: string): Translator => createTranslator({ locale: segment, messages: segment.startsWith('es') ? es : en }) as unknown as Translator;
const fmt = (segment: string) => {
  const l = parseLocaleSegment(segment)!;
  return createFormat(l.formatLocale, MARKETS[l.market], { yes: 'yes', no: 'no' });
};

function keysOf(o: unknown, prefix = ''): string[] {
  if (o === null || typeof o !== 'object') return [prefix];
  return Object.entries(o as Record<string, unknown>).flatMap(([k, v]) => keysOf(v, prefix ? `${prefix}.${k}` : k));
}

describe('language ≠ market', () => {
  it('es-es and en-es are Spanish/English over the SAME Spanish market', () => {
    const es = parseLocaleSegment('es-es')!;
    const en = parseLocaleSegment('en-es')!;
    expect([es.language, es.market]).toEqual(['es', 'ES']);
    expect([en.language, en.market]).toEqual(['en', 'ES']);
    // Moneda y unidades dependen del mercado, no del idioma.
    expect(marketOf(es)).toBe(marketOf(en));
    expect(marketOf(en).currency).toBe('EUR');
    expect(marketOf(en).units).toEqual({ distance: 'km', fuelConsumption: 'L_PER_100KM', electricConsumption: 'KWH_PER_100KM' });
  });
  it('switching language keeps the market; unknown locales are rejected', () => {
    expect(switchLanguage(parseLocaleSegment('es-es')!, 'en')?.segment).toBe('en-es');
    expect(parseLocaleSegment('fr-fr')).toBeUndefined();
    expect(parseLocaleSegment('es')).toBeUndefined();
    expect(sameMarketLocales(parseLocaleSegment('en-es')!).map((l) => l.segment)).toEqual(['es-es', 'en-es']);
  });
  it('every locale has a valid BCP-47 hreflang and a format locale Intl understands', () => {
    for (const l of LOCALES) {
      expect(Intl.getCanonicalLocales(l.hreflang)).toHaveLength(1);
      expect(Intl.NumberFormat.supportedLocalesOf(l.formatLocale)).toEqual([l.formatLocale]);
    }
  });
});

describe('routing', () => {
  it('canonical `compare` path in every language', () => {
    expect(localizedHref({ segment: 'es-es' }, { page: 'compare', slug: 'byd-seal-vs-tesla-model-3' })).toBe('/es-es/compare/byd-seal-vs-tesla-model-3');
    expect(localizedHref({ segment: 'en-es' }, { page: 'compare', slug: 'byd-seal-vs-tesla-model-3' })).toBe('/en-es/compare/byd-seal-vs-tesla-model-3');
    expect(localizedHref({ segment: 'en-es' }, { page: 'home' })).toBe('/en-es');
  });
  it('language switch preserves page, comparison and scenario query', () => {
    expect(swapLocaleInPath('/es-es/compare/byd-seal-vs-tesla-model-3', '?km=18000&trips=10', { segment: 'en-es' })).toBe('/en-es/compare/byd-seal-vs-tesla-model-3?km=18000&trips=10');
    expect(swapLocaleInPath('/en-es/', '', { segment: 'es-es' })).toBe('/es-es');
    expect(swapLocaleInPath('/en-es', '?x=1', { segment: 'es-es' })).toBe('/es-es?x=1');
    expect(swapLocaleInPath('/en-es/methodology', '', { segment: 'es-es' })).toBe('/es-es/methodology');
  });
  it('hreflang only between languages of the same market + x-default', () => {
    const alt = localeAlternates(parseLocaleSegment('en-es')!, { page: 'compare', slug: 's' })!;
    expect(alt.canonical).toBe('/en-es/compare/s');
    expect(alt.languages).toEqual({ 'es-ES': '/es-es/compare/s', 'en-ES': '/en-es/compare/s', 'x-default': '/es-es/compare/s' });
  });
});

describe('message catalogs', () => {
  it('es and en have exactly the same keys (no missing translations)', () => {
    expect(keysOf(es).sort()).toEqual(keysOf(en).sort());
  });
  it('translations really differ', () => {
    const a = tr('es-es');
    const b = tr('en-es');
    for (const k of ['decision.status.PRACTICAL_TIE', 'decision.status.NO_FULL_MATCH', 'scenario.cta', 'navigation.jumpToDetails', 'confidence.level.LOW', 'common.notConfirmed', 'technical.outcome.NOT_COMPARABLE', 'decision.verifyTitle', 'robustness.checking']) {
      expect(a(k)).not.toBe(b(k));
    }
    expect(a('decision.status.NO_FULL_MATCH')).toBe('Ninguno cumple completamente tus requisitos.');
    expect(b('decision.status.NO_FULL_MATCH')).toBe('None fully meets your requirements.');
    expect(a('common.notConfirmed')).toBe('No confirmado');
    expect(b('technical.outcome.NOT_COMPARABLE')).toBe('Not directly comparable');
    expect([a('confidence.level.HIGH'), a('confidence.level.MEDIUM'), a('confidence.level.LOW')]).toEqual(['ALTA', 'MEDIA', 'BAJA']);
  });
  it('catalogs are namespaced, not flat', () => {
    for (const ns of ['common', 'navigation', 'comparison', 'scenario', 'decision', 'confidence', 'robustness', 'technical', 'economic', 'practical', 'methodology', 'errors']) {
      expect(es).toHaveProperty(ns);
      expect(en).toHaveProperty(ns);
    }
  });
});

describe('localized formatting (market units, language format)', () => {
  it('ES: 18.000 km/año · 386,10 € · 3,22–3,58 €/100 km (NBSP before €)', () => {
    const f = fmt('es-es');
    expect(tr('es-es')('units.kmPerYear', { value: f.number(18000) })).toBe('18.000 km/año');
    expect(f.moneyMinor(38610)).toBe('386,10 €');
    expect(f.valueRange({ min: 3.2248, max: 3.5831 }, 'EUR_PER_100KM')).toBe('3,22–3,58 €/100 km');
    expect(f.number(1500)).toBe('1.500');
  });
  it('EN (Spain market): 18,000 km/year · €386.10 · still km and EUR', () => {
    const f = fmt('en-es');
    expect(tr('en-es')('units.kmPerYear', { value: f.number(18000) })).toBe('18,000 km/year');
    expect(f.moneyMinor(38610)).toBe('€386.10');
    expect(f.valueRange({ min: 3.2248, max: 3.5831 }, 'EUR_PER_100KM')).toBe('€3.22–€3.58/100 km');
    expect(f.valueRange({ min: 570, max: 570 }, 'km')).toBe('570 km');
  });
  it('ranges are never collapsed to a midpoint', () => {
    expect(fmt('es-es').moneyMinorRange({ min: 2396, max: 12368 })).toBe('23,96–123,68 €');
    expect(fmt('en-es').moneyMinorRange({ min: 2396, max: 12368 })).toBe('€23.96–€123.68');
    expect(fmt('es-es').numberRange({ min: 2.4, max: 3.1 }, 1)).toBe('2,4–3,1');
  });
});
