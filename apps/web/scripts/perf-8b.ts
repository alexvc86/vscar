/**
 * Medición del Step 8b (Nuevo/Usado), build de PRODUCCIÓN con MySQL (canal PREVIEW):
 *   - SSR (TTFB): par base new/new (cacheado), vista usada repetida (cacheada) y vistas usadas con hechos NUEVOS
 *     (loader + Used Adjustment + decisión con robustez, sin caché);
 *   - LCP y CLS (carga) e INP (cambio de escenario y compartir) en la comparación nuevo vs usado;
 *   - INP del formulario de la unidad usada (elegir Usado, escribir, Revisar, Elegir) en el selector;
 *   escritorio y móvil (CPU ×4), 5 cargas por perfil.
 *
 *   VSCAR_WEB_URL=http://localhost:4210 node apps/web/scripts/perf-8b.ts
 */
import { chromium, type Page } from '@playwright/test';

const BASE = process.env.VSCAR_WEB_URL ?? 'http://localhost:4200';
const GOLF = 'volkswagen-golf-style-1-5-etsi-150-dsg';
const BASE_PAIR = 'byd-seal-2026-design-rwd-82-5-kwh-vs-tesla-model-3-2021-standard-range-plus-e6r';
const USED = `${GOLF}-vs-${GOLF}?u=1&b=used&b_price=28000&b_km=84000&b_reg=2019-03&b_service=partial&eval=2026-10-15`;
const pct = (xs: number[], p: number) => {
  const s = [...xs].sort((a, b) => a - b);
  return +s[Math.min(s.length - 1, Math.ceil((p / 100) * s.length) - 1)]!.toFixed(0);
};
const stats = (xs: number[]) => ({ n: xs.length, p50: pct(xs, 50), p95: pct(xs, 95), max: Math.round(Math.max(...xs)) });

async function ttfb(url: string) {
  const t0 = performance.now();
  const r = await fetch(url);
  const t = performance.now() - t0;
  await r.text();
  return t;
}

const ssr = { baseNewNew: [] as number[], usedCached: [] as number[], usedNewFacts: [] as number[] };
await ttfb(`${BASE}/es-es/compare/${BASE_PAIR}`);
await ttfb(`${BASE}/es-es/compare/${USED}`);
for (let i = 0; i < 15; i++) ssr.baseNewNew.push(await ttfb(`${BASE}/es-es/compare/${BASE_PAIR}`));
for (let i = 0; i < 15; i++) ssr.usedCached.push(await ttfb(`${BASE}/${i % 2 ? 'en-es' : 'es-es'}/compare/${USED}`));
for (let i = 0; i < 15; i++) ssr.usedNewFacts.push(await ttfb(`${BASE}/es-es/compare/${GOLF}-vs-${GOLF}?u=1&b=used&b_price=${20_000 + i * 731}&b_km=${30_000 + i * 4_111}&b_reg=2020&eval=2026-10-15`));

const OBSERVE = () => {
  const w = window as unknown as { __v: { lcp: number; cls: number; inp: number[] } };
  w.__v = { lcp: 0, cls: 0, inp: [] };
  new PerformanceObserver((l) => l.getEntries().forEach((e) => (w.__v.lcp = e.startTime))).observe({ type: 'largest-contentful-paint', buffered: true });
  new PerformanceObserver((l) => l.getEntries().forEach((e) => !(e as unknown as { hadRecentInput: boolean }).hadRecentInput && (w.__v.cls += (e as unknown as { value: number }).value))).observe({ type: 'layout-shift', buffered: true });
  new PerformanceObserver((l) => l.getEntries().forEach((e) => (e as unknown as { interactionId: number }).interactionId && w.__v.inp.push(e.duration))).observe({ type: 'event', buffered: true, durationThreshold: 16 } as PerformanceObserverInit);
};
const read = (page: Page) => page.evaluate(() => (window as unknown as { __v: { lcp: number; cls: number; inp: number[] } }).__v);

async function comparisonVitals(page: Page) {
  await page.goto(`${BASE}/es-es/compare/${USED}`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1500);
  await page.locator('a[data-scenario-link]', { hasText: /10/ }).first().click();
  await page.waitForTimeout(1500);
  await page.getByTestId('share').click();
  await page.waitForTimeout(600);
  return read(page);
}

async function formVitals(page: Page) {
  await page.goto(`${BASE}/es-es`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1200);
  await page.getByTestId('home-cta').click();
  await page.getByTestId('brand-Volkswagen').click();
  await page.getByTestId('model-Golf').click();
  await page.getByTestId('year-2027').click();
  await page.getByTestId(`variant-${GOLF}`).click();
  await page.getByTestId('condition-used').click();
  await page.getByTestId('used-price').pressSequentially('28000');
  await page.getByTestId('used-km').pressSequentially('84000');
  await page.getByTestId('used-regYear').pressSequentially('2019');
  await page.locator('.uf-more > summary').click();
  await page.getByTestId('used-service-partial').check();
  await page.getByTestId('used-review').click();
  await page.getByTestId('choose-car').click();
  await page.waitForTimeout(400);
  return read(page);
}

const browser = await chromium.launch({ channel: 'chrome', headless: true });
const result: Record<string, { lcp: number[]; cls: number[]; inp: number[]; formInp: number[]; formInpP75: number[] }> = {};
for (const profile of ['desktop', 'mobile'] as const) {
  const r = (result[profile] = { lcp: [] as number[], cls: [] as number[], inp: [] as number[], formInp: [] as number[], formInpP75: [] as number[] });
  for (let i = 0; i < 5; i++) {
    const ctx = await browser.newContext(profile === 'desktop' ? { viewport: { width: 1440, height: 900 } } : { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
    await ctx.grantPermissions(['clipboard-read', 'clipboard-write']);
    await ctx.addInitScript(() => Object.defineProperty(navigator, 'share', { value: undefined, configurable: true }));
    await ctx.addInitScript(OBSERVE);
    const page = await ctx.newPage();
    if (profile === 'mobile') await (await ctx.newCDPSession(page)).send('Emulation.setCPUThrottlingRate', { rate: 4 });
    const v = await comparisonVitals(page);
    r.lcp.push(Math.round(v.lcp));
    r.cls.push(+v.cls.toFixed(3));
    r.inp.push(Math.round(Math.max(0, ...v.inp)));
    const f = await formVitals(page);
    r.formInp.push(Math.round(Math.max(0, ...f.inp)));
    r.formInpP75.push(f.inp.length ? pct(f.inp, 75) : 0);
    await ctx.close();
  }
}
await browser.close();

console.log(
  JSON.stringify(
    {
      base: BASE,
      ssrTtfbMs: { baseNewNew: stats(ssr.baseNewNew), usedCached: stats(ssr.usedCached), usedNewFacts: stats(ssr.usedNewFacts) },
      vitals: Object.fromEntries(
        Object.entries(result).map(([k, v]) => [k, { lcpMs: v.lcp, cls: v.cls, inpMs: v.inp, formInpMaxMs: v.formInp, formInpP75Ms: v.formInpP75, p75: { lcpMs: pct(v.lcp, 75), inpMs: pct(v.inp, 75), formInpMs: pct(v.formInp, 75) }, worst: { lcpMs: Math.max(...v.lcp), cls: Math.max(...v.cls), inpMs: Math.max(...v.inp), formInpMs: Math.max(...v.formInp) } }]),
      ),
    },
    null,
    2,
  ),
);
