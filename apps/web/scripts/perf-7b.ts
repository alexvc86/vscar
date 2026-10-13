/**
 * Medición del Step 7b (selector + orquestación), reproducible, sobre el build de PRODUCCIÓN con MySQL:
 *   - búsqueda: latencia de /api/catalog/search (fría = primera vez cada consulta; caliente = repetida) y su
 *     `Server-Timing` (tiempo del servicio de catálogo);
 *   - SSR de la comparación: TTFB con escenario nuevo (decisión + robustez) y repetido (caché);
 *   - tamaño del HTML (incluye los datos del par serializados para el recálculo en cliente);
 *   - INP (Event Timing) de abrir el selector, escribir en él y cambiar el escenario; escritorio y móvil (CPU ×4).
 *
 *   corepack pnpm --filter @vscar/web build && (cd apps/web && VSCAR_TIMINGS=1 corepack pnpm exec next start -p 4210)
 *   VSCAR_WEB_URL=http://localhost:4210 node apps/web/scripts/perf-7b.ts
 */
import { chromium, type Page } from '@playwright/test';
import { gzipSync } from 'node:zlib';

const BASE = process.env.VSCAR_WEB_URL ?? 'http://localhost:4200';
const PAIR = 'byd-seal-2026-design-rwd-82-5-kwh-vs-tesla-model-3-2021-standard-range-plus-e6r';
const pct = (xs: number[], p: number) => {
  const s = [...xs].sort((a, b) => a - b);
  return +s[Math.min(s.length - 1, Math.ceil((p / 100) * s.length) - 1)]!.toFixed(1);
};
const stats = (xs: number[]) => ({ n: xs.length, p50: pct(xs, 50), p95: pct(xs, 95), max: pct(xs, 100) });

async function timed(url: string): Promise<{ ms: number; ttfb: number; serverMs?: number; body: string; status: number }> {
  const t0 = performance.now();
  const res = await fetch(url, { redirect: 'manual' });
  const ttfb = performance.now() - t0;
  const body = await res.text();
  const st = res.headers.get('server-timing')?.match(/dur=([\d.]+)/)?.[1];
  return { ms: performance.now() - t0, ttfb, ...(st ? { serverMs: +st } : {}), body, status: res.status };
}

// --- Búsqueda ---
const QUERIES = ['go', 'golf', 'golf etsi', 'golf 2018', 'leon', 'león', 'LEON', 'seat', 'tesla', 'model 3', 'mod', 'seal', 'byd', 'bmw', 'x3', 'bev', 'phev', '2021', 'tracción', 'design'];
const cold: number[] = [];
const coldServer: number[] = [];
for (const q of QUERIES) {
  const r = await timed(`${BASE}/api/catalog/search?market=ES&q=${encodeURIComponent(q)}`);
  if (r.status !== 200) throw new Error(`search ${q}: ${r.status}`);
  cold.push(r.ms);
  if (r.serverMs !== undefined) coldServer.push(r.serverMs);
}
const warm: number[] = [];
const warmServer: number[] = [];
for (let i = 0; i < 10; i++) {
  for (const q of QUERIES) {
    const r = await timed(`${BASE}/api/catalog/search?market=ES&q=${encodeURIComponent(q)}`);
    warm.push(r.ms);
    if (r.serverMs !== undefined) warmServer.push(r.serverMs);
  }
}

// --- SSR de la comparación ---
const ssrCold: number[] = [];
const ssrWarm: number[] = [];
let html = '';
for (let i = 0; i < 12; i++) {
  const km = 9000 + i * 1500; // escenario nuevo en cada petición: decisión + robustez sin caché
  const r = await timed(`${BASE}/es-es/compare/${PAIR}?km=${km}`);
  ssrCold.push(r.ttfb);
}
for (let i = 0; i < 12; i++) {
  const r = await timed(`${BASE}/es-es/compare/${PAIR}`);
  ssrWarm.push(r.ttfb);
  html = r.body;
}

// --- INP (Event Timing) ---
async function inp(page: Page, action: () => Promise<void>): Promise<number> {
  await page.evaluate(() => {
    (window as unknown as { __events: number[] }).__events = [];
    new PerformanceObserver((list) => {
      for (const e of list.getEntries() as (PerformanceEventTiming & { interactionId?: number })[]) if (e.interactionId) (window as unknown as { __events: number[] }).__events.push(e.duration);
    }).observe({ type: 'event', buffered: false, durationThreshold: 16 } as PerformanceObserverInit);
  });
  await action();
  await page.waitForTimeout(600);
  const xs = await page.evaluate(() => (window as unknown as { __events: number[] }).__events);
  return xs.length ? Math.max(...xs) : 0;
}

const browser = await chromium.launch({ channel: 'chrome', headless: true });
const inpResults: Record<string, Record<string, number[]>> = {};
for (const profile of ['desktop', 'mobile'] as const) {
  const ctx = await browser.newContext(profile === 'desktop' ? { viewport: { width: 1440, height: 900 } } : { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  const runs: Record<string, number[]> = { openSelector: [], typeSearch: [], scenarioChange: [] };
  for (let i = 0; i < (profile === 'mobile' ? 5 : 3); i++) {
    const page = await ctx.newPage();
    if (profile === 'mobile') {
      const cdp = await ctx.newCDPSession(page);
      await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
    }
    await page.goto(`${BASE}/es-es/compare/${PAIR}`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1500);
    runs.openSelector!.push(await inp(page, () => page.getByTestId('change-b').click()));
    await page.getByTestId('vehicle-search').waitFor();
    runs.typeSearch!.push(await inp(page, () => page.getByTestId('vehicle-search').pressSequentially('golf', { delay: 60 })));
    await page.keyboard.press('Escape');
    await page.waitForTimeout(300);
    runs.scenarioChange!.push(await inp(page, () => page.locator('a[data-scenario-link]', { hasText: '10 viajes largos' }).click()));
    await page.close();
  }
  inpResults[profile] = runs;
  await ctx.close();
}
await browser.close();

console.log(
  JSON.stringify(
    {
      base: BASE,
      search: { coldMs: stats(cold), coldServerMs: coldServer.length ? stats(coldServer) : null, warmMs: stats(warm), warmServerMs: warmServer.length ? stats(warmServer) : null },
      comparisonSSR: { newScenarioTtfbMs: stats(ssrCold), repeatedTtfbMs: stats(ssrWarm) },
      comparisonHtml: { rawKB: +(Buffer.byteLength(html) / 1024).toFixed(1), gzipKB: +(gzipSync(html).length / 1024).toFixed(1) },
      inpMs: Object.fromEntries(Object.entries(inpResults).map(([k, v]) => [k, Object.fromEntries(Object.entries(v).map(([a, xs]) => [a, { runs: xs.map((x) => Math.round(x)), worst: Math.round(Math.max(...xs)) }]))])),
    },
    null,
    2,
  ),
);
