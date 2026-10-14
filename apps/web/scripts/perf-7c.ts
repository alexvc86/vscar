/**
 * Medición del Step 7c (página de comparación compartible), build de PRODUCCIÓN con MySQL:
 *   - SSR (TTFB): URL base (escenario canónico, cacheado) y vistas personalizadas nuevas (decisión + robustez);
 *   - LCP y CLS (carga) e INP (cambio de escenario y compartir), escritorio y móvil (CPU ×4).
 *
 *   VSCAR_WEB_URL=http://localhost:4200 node apps/web/scripts/perf-7c.ts
 */
import { chromium, type Page } from '@playwright/test';

const BASE = process.env.VSCAR_WEB_URL ?? 'http://localhost:4200';
const PAIR = 'byd-seal-2026-design-rwd-82-5-kwh-vs-tesla-model-3-2021-standard-range-plus-e6r';
const pct = (xs: number[], p: number) => {
  const s = [...xs].sort((a, b) => a - b);
  return +s[Math.min(s.length - 1, Math.ceil((p / 100) * s.length) - 1)]!.toFixed(0);
};
const stats = (xs: number[]) => ({ n: xs.length, p50: pct(xs, 50), p95: pct(xs, 95) });

async function ttfb(url: string) {
  const t0 = performance.now();
  const r = await fetch(url);
  const t = performance.now() - t0;
  await r.text();
  return t;
}

const ssrBase: number[] = [];
const ssrPersonal: number[] = [];
await ttfb(`${BASE}/es-es/compare/${PAIR}`); // primera petición del proceso (índice del catálogo)
for (let i = 0; i < 15; i++) ssrBase.push(await ttfb(`${BASE}/${i % 2 ? 'en-es' : 'es-es'}/compare/${PAIR}`));
for (let i = 0; i < 15; i++) ssrPersonal.push(await ttfb(`${BASE}/es-es/compare/${PAIR}?km=${8000 + i * 1700}&trips=${i % 12}`));

async function vitals(page: Page, url: string) {
  await page.addInitScript(() => {
    const w = window as unknown as { __v: { lcp: number; cls: number; inp: number[] } };
    w.__v = { lcp: 0, cls: 0, inp: [] };
    new PerformanceObserver((l) => l.getEntries().forEach((e) => (w.__v.lcp = e.startTime))).observe({ type: 'largest-contentful-paint', buffered: true });
    new PerformanceObserver((l) => l.getEntries().forEach((e) => !(e as unknown as { hadRecentInput: boolean }).hadRecentInput && (w.__v.cls += (e as unknown as { value: number }).value))).observe({ type: 'layout-shift', buffered: true });
    new PerformanceObserver((l) => l.getEntries().forEach((e) => (e as unknown as { interactionId: number }).interactionId && w.__v.inp.push(e.duration))).observe({ type: 'event', buffered: true, durationThreshold: 16 } as PerformanceObserverInit);
  });
  await page.goto(url, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1500);
  await page.locator('a[data-scenario-link]', { hasText: /10/ }).first().click();
  await page.waitForTimeout(1500);
  await page.getByTestId('share').click();
  await page.waitForTimeout(600);
  return page.evaluate(() => (window as unknown as { __v: { lcp: number; cls: number; inp: number[] } }).__v);
}

const browser = await chromium.launch({ channel: 'chrome', headless: true });
const result: Record<string, { lcp: number[]; cls: number[]; inp: number[] }> = {};
for (const profile of ['desktop', 'mobile'] as const) {
  result[profile] = { lcp: [], cls: [], inp: [] };
  for (let i = 0; i < 5; i++) {
    const ctx = await browser.newContext(profile === 'desktop' ? { viewport: { width: 1440, height: 900 } } : { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
    await ctx.grantPermissions(['clipboard-read', 'clipboard-write']);
    await ctx.addInitScript(() => Object.defineProperty(navigator, 'share', { value: undefined, configurable: true }));
    const page = await ctx.newPage();
    if (profile === 'mobile') await (await ctx.newCDPSession(page)).send('Emulation.setCPUThrottlingRate', { rate: 4 });
    const v = await vitals(page, `${BASE}/es-es/compare/${PAIR}`);
    result[profile]!.lcp.push(Math.round(v.lcp));
    result[profile]!.cls.push(+v.cls.toFixed(3));
    result[profile]!.inp.push(Math.round(Math.max(0, ...v.inp)));
    await ctx.close();
  }
}
await browser.close();

console.log(
  JSON.stringify(
    {
      base: BASE,
      ssrTtfbMs: { canonical: stats(ssrBase), personalisedNewScenario: stats(ssrPersonal) },
      vitals: Object.fromEntries(Object.entries(result).map(([k, v]) => [k, { lcpMs: v.lcp, cls: v.cls, inpMs: v.inp, worst: { lcpMs: Math.max(...v.lcp), cls: Math.max(...v.cls), inpMs: Math.max(...v.inp) } }])),
    },
    null,
    2,
  ),
);
