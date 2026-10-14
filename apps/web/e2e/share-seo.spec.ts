import { expect, test, type Page } from '@playwright/test';

/**
 * Step 7c — comparaciones compartibles y base SEO. La URL (ruta + query) basta para reconstruir la misma
 * comparación; el canonical, el OG y la indexación representan la comparación BASE, nunca cada escenario.
 */
const BYD = 'byd-seal-2026-design-rwd-82-5-kwh';
const M3 = 'tesla-model-3-2021-standard-range-plus-e6r';
const PAIR = `${BYD}-vs-${M3}`;

/** Simula un navegador sin Web Share API (escritorio): fuerza el fallback de copiar enlace. */
const NO_WEB_SHARE = () => {
  Object.defineProperty(navigator, 'share', { value: undefined, configurable: true });
  Object.defineProperty(navigator, 'canShare', { value: undefined, configurable: true });
};

async function head(page: Page, selector: string, attr = 'content') {
  return page.locator(selector).first().getAttribute(attr);
}

test('§110 change scenario → copy link → another browser opens it: same cars, market, scenario and decision → EN → share again', async ({ browser }) => {
  const ctx = await browser.newContext();
  await ctx.grantPermissions(['clipboard-read', 'clipboard-write']);
  await ctx.addInitScript(NO_WEB_SHARE);
  const page = await ctx.newPage();
  await page.goto(`/es-es/compare/${PAIR}`);
  await page.locator('a[data-scenario-link]', { hasText: '10 viajes largos' }).click();
  await expect(page).toHaveURL(/\?trips=10$/);
  await expect(page.locator('#result-title')).toHaveAttribute('data-status', 'BEST_FOR_YOU');

  await page.getByTestId('share').click();
  await expect(page.getByTestId('share-status')).toHaveText('Enlace copiado');
  const copied = await page.evaluate(() => navigator.clipboard.readText());
  expect(copied).toMatch(new RegExp(`/es-es/compare/${PAIR}[?]trips=10$`));
  // El aviso no es permanente.
  await expect(page.getByTestId('share-status')).toHaveText('', { timeout: 5000 });

  // Otro navegador (contexto nuevo, sin estado): misma comparación desde la URL.
  const other = await browser.newContext();
  const p2 = await other.newPage();
  await p2.goto(copied);
  await expect(p2.locator('main')).toHaveAttribute('data-pair', PAIR);
  await expect(p2.locator('html')).toHaveAttribute('lang', 'es');
  await expect(p2.locator('#result-title')).toHaveAttribute('data-status', 'BEST_FOR_YOU');
  await expect(p2.locator('#result-title')).toContainText('BYD SEAL');
  await expect(p2.getByTestId('scenario-summary')).toContainText('10');
  // Canonical = comparación base (sin escenario).
  expect(await head(p2, 'link[rel="canonical"]', 'href')).toMatch(new RegExp(`/es-es/compare/${PAIR}$`));
  await other.close();

  await page.locator('[data-lang-switch="en"]').click();
  await expect(page).toHaveURL(new RegExp(`/en-es/compare/${PAIR}[?]trips=10$`));
  expect(await head(page, 'link[rel="canonical"]', 'href')).toMatch(new RegExp(`/en-es/compare/${PAIR}$`));
  expect(await head(page, 'link[rel="alternate"][hreflang="es-ES"]', 'href')).toMatch(new RegExp(`/es-es/compare/${PAIR}$`));
  await expect(page).toHaveTitle('BYD SEAL vs Tesla Model 3 — Which fits you better? | VScar');
  await page.getByTestId('share').click();
  await expect(page.getByTestId('share-status')).toHaveText('Link copied');
  expect(await page.evaluate(() => navigator.clipboard.readText())).toMatch(new RegExp(`/en-es/compare/${PAIR}[?]trips=10$`));
  await ctx.close();
});

test('Web Share API: native share gets the full current URL, the title and the localized text', async ({ page }) => {
  await page.addInitScript(() => {
    (window as unknown as { __shared: unknown[] }).__shared = [];
    Object.defineProperty(navigator, 'share', { value: (d: unknown) => ((window as unknown as { __shared: unknown[] }).__shared.push(d), Promise.resolve()), configurable: true });
  });
  await page.goto(`/es-es/compare/${PAIR}?km=18000&trips=10`);
  await page.getByTestId('share').click();
  const shared = (await page.evaluate(() => (window as unknown as { __shared: { url: string; text: string; title: string }[] }).__shared)) as { url: string; text: string; title: string }[];
  expect(shared).toHaveLength(1);
  expect(shared[0]!.url).toMatch(new RegExp(`/es-es/compare/${PAIR}[?]km=18000&trips=10$`));
  expect(shared[0]!.text).toBe('Mira esta comparación de VScar: BYD SEAL vs Tesla Model 3');
  await expect(page.getByTestId('share-status')).toHaveText('');
});

test('§111 PREVIEW: every page is noindex, nofollow; robots.txt does not block pages; sitemap has no fixture URLs', async ({ page, request }) => {
  for (const path of ['/es-es', '/en-es/methodology', `/es-es/compare/${PAIR}`, `/en-es/compare/${PAIR}?trips=10`]) {
    await page.goto(path);
    expect(await head(page, 'meta[name="robots"]'), path).toBe('noindex, nofollow');
  }
  const robots = await (await request.get('/robots.txt')).text();
  expect(robots).toContain('Allow: /');
  expect(robots).toContain('Disallow: /api/');
  expect(robots).not.toContain('Sitemap:');
  const sitemap = await (await request.get('/sitemap.xml')).text();
  expect(sitemap).not.toContain('<loc>');
});

test('swap keeps both URLs working with ONE canonical; OG image is stable regardless of the scenario', async ({ page, request }) => {
  await page.goto(`/es-es/compare/${M3}-vs-${BYD}?trips=10`);
  await expect(page.locator('main')).toHaveAttribute('data-pair', `${M3}-vs-${BYD}`);
  expect(await head(page, 'link[rel="canonical"]', 'href')).toMatch(new RegExp(`/es-es/compare/${PAIR}$`));
  expect(await head(page, 'meta[property="og:url"]')).toMatch(new RegExp(`/es-es/compare/${PAIR}$`));
  await expect(page).toHaveTitle('Tesla Model 3 vs BYD SEAL — ¿Cuál encaja mejor contigo? | VScar');

  await page.goto(`/es-es/compare/${PAIR}?km=40000&trips=20`);
  const personalised = await head(page, 'meta[property="og:image"]');
  await page.goto(`/es-es/compare/${PAIR}`);
  const base = await head(page, 'meta[property="og:image"]');
  expect(personalised).toBe(base);
  expect(base).not.toMatch(/km=|trips=/);
  const img = await request.get(new URL(base!).pathname + new URL(base!).search);
  expect(img.status()).toBe(200);
  expect(img.headers()['content-type']).toBe('image/png');
});

test('skip links: content → result → details', async ({ page }) => {
  await page.goto(`/es-es/compare/${PAIR}`);
  await page.keyboard.press('Tab');
  await expect(page.locator(':focus')).toHaveText('Saltar al contenido');
  await page.keyboard.press('Tab');
  await expect(page.locator(':focus')).toHaveText('Saltar al resultado');
  await page.keyboard.press('Tab');
  await expect(page.locator(':focus')).toHaveText('Saltar a los detalles');
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(/#details$/);
});

test('§11 without JavaScript the page still answers: names, result, reasons, economics, details, confidence', async ({ browser }) => {
  const ctx = await browser.newContext({ javaScriptEnabled: false });
  const page = await ctx.newPage();
  await page.goto(`/es-es/compare/${PAIR}?trips=10`);
  await expect(page.locator('h1')).toContainText('BYD SEAL');
  await expect(page.locator('#result-title')).toHaveAttribute('data-status', 'BEST_FOR_YOU');
  for (const id of ['#result', '#change', '#confidence', '#details']) await expect(page.locator(id)).toHaveCount(1);
  await expect(page.locator('.mcmp').first()).toBeAttached();
  await expect(page.locator('script[type="application/ld+json"]')).toHaveCount(1);
  await ctx.close();
});

test('§112 mobile 390 px: share falls back to copy, rail is compact and non-obstructive', async ({ browser }) => {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  await ctx.grantPermissions(['clipboard-read', 'clipboard-write']);
  await ctx.addInitScript(NO_WEB_SHARE);
  const page = await ctx.newPage();
  await page.goto(`/es-es/compare/${PAIR}?trips=10`);
  await page.getByTestId('share').tap();
  await expect(page.getByTestId('share-status')).toHaveText('Enlace copiado');
  await page.locator('#details').scrollIntoViewIfNeeded();
  const rail = page.getByTestId('vehicle-rail');
  const box = await rail.boundingBox();
  expect(box!.height).toBeLessThanOrEqual(48);
  expect(box!.y).toBeLessThanOrEqual(60);
  // El título del capítulo no queda bajo la barra fija.
  await page.locator('#details-title').scrollIntoViewIfNeeded();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await ctx.close();
});
