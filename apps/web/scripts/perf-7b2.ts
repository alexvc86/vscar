/**
 * Medición del Step 7b.2 (VehiclePicker + media), build de PRODUCCIÓN con MySQL:
 *   - apertura del selector (clic → marcas pintadas) y cada paso (clic → contenido del paso siguiente pintado);
 *   - API `/api/catalog/browse` por nivel (p50/p95);
 *   - imagen de tarjeta: bytes que sirve next/image (AVIF/WebP) para `MEDIA_PATH`, si existe un asset local.
 *
 *   VSCAR_WEB_URL=http://localhost:4200 [MEDIA_PATH=/media/…] node apps/web/scripts/perf-7b2.ts
 */
import { chromium } from '@playwright/test';

const BASE = process.env.VSCAR_WEB_URL ?? 'http://localhost:4200';
const pct = (xs: number[], p: number) => {
  const s = [...xs].sort((a, b) => a - b);
  return +s[Math.min(s.length - 1, Math.ceil((p / 100) * s.length) - 1)]!.toFixed(1);
};
const stats = (xs: number[]) => ({ n: xs.length, p50: pct(xs, 50), p95: pct(xs, 95) });

// --- API por nivel ---
const LEVELS: Record<string, string> = {
  brands: 'level=brands',
  models: 'level=models&brand=Volkswagen',
  years: 'level=years&brand=Volkswagen&model=Golf',
  variants: 'level=variants&brand=Volkswagen&model=Golf&year=2018',
};
const api: Record<string, ReturnType<typeof stats>> = {};
for (const [level, q] of Object.entries(LEVELS)) {
  const xs: number[] = [];
  for (let i = 0; i < 30; i++) {
    const t0 = performance.now();
    const r = await fetch(`${BASE}/api/catalog/browse?market=ES&${q}`);
    await r.text();
    xs.push(performance.now() - t0);
  }
  api[level] = stats(xs);
}

// El bucle anterior agota a propósito el límite de la API interna (60 peticiones / 10 s por IP): se espera a la
// siguiente ventana para que la UI no reciba 429.
await new Promise((r) => setTimeout(r, 11_000));

// --- UI: apertura y pasos (5 repeticiones, contexto nuevo cada vez = sin caché de respuestas) ---
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const ui: Record<string, number[]> = { open: [], brandToModel: [], modelToYear: [], yearToVariants: [] };
for (let i = 0; i < 5; i++) {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  await page.goto(`${BASE}/es-es`, { waitUntil: 'networkidle' });
  // Precarga en reposo del chunk del selector y de las marcas (lo que vería un usuario real tras unos instantes).
  await page.waitForTimeout(Number(process.env.SETTLE_MS ?? 1500));
  /** Clic → contenido del paso siguiente en el DOM, medido DENTRO de la página (frame a frame, sin el polling de Playwright). */
  const timed = async (key: string, trigger: string, ready: string) => {
    const ms = await page.evaluate(
      ([t, r]) =>
        new Promise<number>((resolve) => {
          const t0 = performance.now();
          (document.querySelector(t) as HTMLElement).click();
          const tick = () => (document.querySelector(r) ? resolve(performance.now() - t0) : requestAnimationFrame(tick));
          requestAnimationFrame(tick);
        }),
      [trigger, ready] as const,
    );
    ui[key]!.push(Math.round(ms));
  };
  await timed('open', '[data-testid="pick-a"]', '[data-testid="brand-Volkswagen"]');
  await timed('brandToModel', '[data-testid="brand-Volkswagen"]', '[data-testid="model-Golf"]');
  await timed('modelToYear', '[data-testid="model-Golf"]', '[data-testid="year-2018"]');
  await timed('yearToVariants', '[data-testid="year-2018"]', '.vp-variant__row');
  await ctx.close();
}
await browser.close();

// --- Imagen de tarjeta vía next/image ---
let image: Record<string, unknown> = { note: 'no approved media in the catalog: cards use the inline SVG silhouette (0 image bytes)' };
const media = process.env.MEDIA_PATH;
if (media) {
  const out: Record<string, number> = {};
  for (const [fmt, accept] of [['avif', 'image/avif'], ['webp', 'image/webp']] as const) {
    for (const w of [320, 440]) {
      const r = await fetch(`${BASE}/_next/image?url=${encodeURIComponent(media)}&w=${w}&q=75`, { headers: { accept } });
      out[`${fmt}@${w}`] = +((await r.arrayBuffer()).byteLength / 1024).toFixed(1);
    }
  }
  image = { source: media, kb: out };
}

console.log(JSON.stringify({ base: BASE, browseApiMs: api, uiMs: Object.fromEntries(Object.entries(ui).map(([k, v]) => [k, { runs: v, p50: pct(v, 50) }])), image }, null, 2));
