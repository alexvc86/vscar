import { ImageResponse } from 'next/og';
import { getTranslations } from 'next-intl/server';
import { canonicalScenario } from '@/domain/canonical';
import { DEFAULT_LOCALE, parseLocaleSegment } from '@/i18n/locales';
import { loadComparisonData } from '@/server/comparison-loader';
import { ogFonts } from '@/server/og-fonts';
import { serverDecisionView } from '@/server/server-decision';

/**
 * Imagen OG de una comparación (Step 7c §19–22). ESTABLE: depende solo del par, el idioma y el Canonical Comparison
 * Scenario del mercado (nunca de los parámetros de la URL), así no hay una imagen por combinación de escenario.
 * Solo texto + identidad VScar (oscuro, A azul, B arena, Geist): ninguna foto de coche, ningún asset sin derechos.
 */
export const alt = 'VScar';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

const C = { base: '#0B0C0E', text: '#F2F1EC', muted: '#A3A6AD', line: 'rgba(242,241,236,0.18)', a: '#8EC5FF', b: '#E2BE8A' };

export default async function Image({ params }: { params: Promise<{ locale: string; slug: string }> }) {
  const { locale: segment, slug } = await params;
  const locale = parseLocaleSegment(segment) ?? DEFAULT_LOCALE;
  const t = await getTranslations({ locale: locale.segment });
  const load = await loadComparisonData(locale.market, slug).catch(() => undefined);
  const f = await ogFonts();
  const opts = { ...size, ...(f ? { fonts: f } : {}) };

  if (load?.kind !== 'ok') {
    return new ImageResponse(
      (
        <div style={{ display: 'flex', width: '100%', height: '100%', background: C.base, color: C.text, alignItems: 'center', justifyContent: 'center', fontFamily: 'Geist', fontSize: 72 }}>
          VScar
        </div>
      ),
      opts,
    );
  }

  const { data } = load;
  const canonical = canonicalScenario(locale.market);
  const view = serverDecisionView(data, canonical.scenario).view;
  const [a, b] = data.vehicles;
  const selected = view.selected ? view.candidates.find((c) => c.side === view.selected) : undefined;
  const status = t(`seo.ogStatus.${view.status}`);
  const km = new Intl.NumberFormat(locale.formatLocale).format(canonical.scenario.km);

  return new ImageResponse(
    (
      <div style={{ display: 'flex', flexDirection: 'column', width: '100%', height: '100%', background: C.base, color: C.text, padding: '56px 72px', fontFamily: 'Geist' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 28 }}>
          <span style={{ fontWeight: 600 }}>VScar</span>
          <span style={{ display: 'flex', gap: 16, color: C.muted, fontFamily: 'GeistMono', fontSize: 22 }}>
            {data.channel === 'PREVIEW' ? <span style={{ border: `1px solid ${C.line}`, borderRadius: 999, padding: '2px 14px' }}>{t('catalog.preview')}</span> : null}
            <span>{t(`markets.${locale.market}`)}</span>
          </span>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', flexGrow: 1, justifyContent: 'center', gap: 6 }}>
          <span style={{ color: C.a, fontSize: 84, fontWeight: 600, lineHeight: 1.05 }}>{a.label}</span>
          <span style={{ color: C.muted, fontFamily: 'GeistMono', fontSize: 36 }}>VS</span>
          <span style={{ color: C.b, fontSize: 84, fontWeight: 600, lineHeight: 1.05 }}>{b.label}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 20, borderTop: `1px solid ${C.line}`, paddingTop: 24 }}>
          <span style={{ display: 'flex', fontSize: 34, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 2, color: selected ? (selected.side === 'a' ? C.a : C.b) : C.text }}>
            {status}
            {selected ? ` · ${selected.name}` : ''}
          </span>
        </div>
        <span style={{ marginTop: 12, color: C.muted, fontFamily: 'GeistMono', fontSize: 22 }}>{t('seo.ogScenario', { km, market: t(`markets.${locale.market}`) })} · {canonical.version}</span>
      </div>
    ),
    opts,
  );
}
