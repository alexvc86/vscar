import { NextIntlClientProvider } from 'next-intl';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import en from '../messages/en.json';
import es from '../messages/es.json';
import { DecisionChapters } from '../src/components/compare/DecisionChapters';
import { COMPARISONS, DEMO_SLUG } from '../src/domain/comparisons.ts';
import { computeDecision, computeRobustness } from '../src/domain/decision.ts';
import { DEFAULT_SCENARIO } from '../src/domain/scenario.ts';
import { serverDecisionView } from '../src/domain/server-decision.ts';
import { buildDecisionView, withRobustness } from '../src/domain/view-model.ts';

const def = COMPARISONS[DEMO_SLUG]!;
const render = (segment: 'es-es' | 'en-es', trips: number, view = serverDecisionView(def, { ...DEFAULT_SCENARIO, trips }).view) =>
  renderToStaticMarkup(
    <NextIntlClientProvider locale={segment} messages={segment === 'es-es' ? es : en} timeZone="Europe/Madrid">
      <DecisionChapters view={view} scenario={{ ...DEFAULT_SCENARIO, trips }} pathname={`/${segment}/compare/${DEMO_SLUG}`} />
    </NextIntlClientProvider>,
  );
const text = (html: string) => html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');

describe('shared chapters render (same product, two languages)', () => {
  it('/es-es: practical tie in Spanish, no winner marked', () => {
    const html = render('es-es', 1);
    expect(html).toContain('data-status="PRACTICAL_TIE"');
    expect(text(html)).toContain('Empate práctico');
    expect(html).not.toContain('is-selected');
    expect(text(html)).toContain('15.000 km al año');
  });
  it('/en-es: same decision, English text, still km and EUR', () => {
    const esHtml = render('es-es', 10);
    const enHtml = render('en-es', 10);
    for (const h of [esHtml, enHtml]) {
      expect(h).toContain('data-status="BEST_FOR_YOU"');
      expect(h).toContain('result-card result-card--a is-selected');
    }
    expect(text(esHtml)).toContain('El mejor para tus necesidades');
    expect(text(enHtml)).toContain('Best for your needs');
    expect(text(enHtml)).toContain('15,000 km per year');
    expect(text(enHtml)).toMatch(/€\d/);
    expect(text(enHtml)).not.toMatch(/\bmiles?\b/);
  });
  it('verify / why-not / tradeoffs come from the engine keys (no raw keys, no braces)', () => {
    for (const seg of ['es-es', 'en-es'] as const) {
      const t = text(render(seg, 10));
      expect(t).not.toContain('engine.decision');
      expect(t).not.toMatch(/\{[a-zA-Z]+\}/);
    }
    expect(text(render('es-es', 10))).toContain('¿Por qué no el Tesla Model 3?');
    expect(text(render('en-es', 10))).toContain('What you give up with the BYD SEAL');
  });
  it('hydration consistency: server markup === markup of the client recompute + worker result', () => {
    for (const trips of [1, 10]) {
      const s = { ...DEFAULT_SCENARIO, trips };
      const c = computeDecision(def, s, { robustness: false });
      const clientView = withRobustness(buildDecisionView(def, c.input, c.result, false), computeRobustness(def, s));
      expect(render('es-es', trips, clientView)).toBe(render('es-es', trips));
    }
  });
});
