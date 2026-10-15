import { expect, test, type Page } from '@playwright/test';

/**
 * Step 8b — Nuevo/Usado de punta a punta sobre el build de producción y el catálogo MySQL de desarrollo (PREVIEW).
 * Flujos A–F del brief + requisitos de usados. Sin errores ni avisos de consola.
 */
const GOLF = 'volkswagen-golf-style-1-5-etsi-150-dsg';
const BYD = 'byd-seal-2026-design-rwd-82-5-kwh';
const M3 = 'tesla-model-3-2021-standard-range-plus-e6r';
const EVAL = /eval=\d{4}-\d{2}-\d{2}/;

function watchConsole(page: Page) {
  const problems: string[] = [];
  page.on('console', (m) => {
    if (m.type() === 'error' || m.type() === 'warning') problems.push(`${m.type()}: ${m.text()}`);
  });
  page.on('pageerror', (e) => problems.push(`pageerror: ${e.message}`));
  return problems;
}

async function browse(page: Page, brand: string, model: string, year: string, slug: string) {
  await page.getByTestId(`brand-${brand}`).click();
  await page.getByTestId(`model-${model}`).click();
  await page.getByTestId(`year-${year}`).click();
  await page.getByTestId(`variant-${slug}`).click();
  await expect(page.locator('.vp-summary')).toBeVisible();
}

async function fillUsed(page: Page, f: { price?: string; km?: string; month?: string; year?: string; service?: string; soh?: string }) {
  await page.getByTestId('condition-used').click();
  await expect(page.getByTestId('used-form')).toBeVisible();
  await expect(page.locator('#vp-step-title')).toBeFocused();
  if (f.price) await page.getByTestId('used-price').fill(f.price);
  if (f.km) await page.getByTestId('used-km').fill(f.km);
  if (f.month) await page.getByTestId('used-regMonth').selectOption(f.month);
  if (f.year) await page.getByTestId('used-regYear').fill(f.year);
  if (f.service || f.soh) await page.locator('.uf-more > summary').click();
  if (f.service) await page.getByTestId(`used-service-${f.service}`).check();
  if (f.soh) {
    await page.getByTestId('used-soh-unknown').uncheck();
    await page.getByTestId('used-soh').fill(f.soh);
  }
  await page.getByTestId('used-review').click();
  await expect(page.getByTestId('used-review-panel')).toBeVisible();
}

const NEW_USED_QUERY = 'u=1&b=used&b_price=28000&b_km=84000&b_reg=2019-03&b_service=partial';

test('A — new vs used, same ReferenceVariant: picker → two distinct participants → result', async ({ page }) => {
  const problems = watchConsole(page);
  await page.goto('/es-es');
  await page.getByTestId('home-cta').click();
  await browse(page, 'Volkswagen', 'Golf', '2027', GOLF);
  await expect(page.locator('#vp-step-title')).toHaveText('¿Cómo estás considerando este coche?');
  await page.getByTestId('condition-new').click();
  // Coche B: la MISMA variant, como usado.
  await expect(page.getByTestId('picker-side')).toHaveText('Coche B');
  await browse(page, 'Volkswagen', 'Golf', '2027', GOLF);
  await fillUsed(page, { price: '28.000', km: '84.000', month: '3', year: '2019', service: 'partial' });
  await expect(page.getByTestId('used-review-panel')).toContainText('28.000 €');
  await expect(page.getByTestId('used-review-panel')).toContainText('84.000 km');
  await expect(page.getByTestId('used-review-panel')).toContainText('Marzo de 2019');
  await page.getByTestId('choose-car').click();
  await expect(page.getByTestId('pick-b-condition')).toHaveText('B · USADO');
  await expect(page.getByTestId('pick-a-condition')).toHaveText('A · NUEVO');
  await page.getByTestId('compare-go').click();

  await expect(page).toHaveURL(new RegExp(`/es-es/compare/${GOLF}-vs-${GOLF}[?]${NEW_USED_QUERY.replace(/[?]/g, '\\?')}&eval=`));
  await expect(page.getByTestId('condition-a')).toHaveText('A · NUEVO');
  await expect(page.getByTestId('condition-b')).toHaveText('B · USADO');
  await expect(page.getByTestId('used-facts-b')).toContainText('84.000 km');
  await expect(page.getByTestId('used-card-b')).toBeVisible();
  await expect(page.getByTestId('used-card-a')).toHaveCount(0);
  await expect(page.getByTestId('purchase-b')).toContainText('28.000');
  await expect(page.getByTestId('purchase-b')).toContainText('precio solicitado');
  await expect(page.getByTestId('used-attention-b')).toContainText('Historial de mantenimiento parcial');
  // Vista personalizada: noindex y sin canonical (no existe comparación base nuevo vs nuevo de la misma variant).
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', /noindex/);
  await expect(page.locator('link[rel="canonical"]')).toHaveCount(0);
  await expect(page.locator('script[type="application/ld+json"]')).toHaveCount(0);
  expect(problems).toEqual([]);
});

test('B — used vs used: facts per car, scenario change recalculates and keeps the units; used requirements', async ({ page }) => {
  const problems = watchConsole(page);
  await page.goto('/es-es');
  await page.getByTestId('home-cta').click();
  await browse(page, 'BYD', 'SEAL', '2026', BYD);
  await fillUsed(page, { price: '33000', km: '9000', soh: '96' });
  await page.getByTestId('choose-car').click();
  await browse(page, 'Tesla', 'Model 3', '2021', M3);
  await fillUsed(page, { price: '18500', km: '70000', month: '6', year: '2021', soh: '88' });
  await page.getByTestId('choose-car').click();
  await page.getByTestId('compare-go').click();
  await expect(page).toHaveURL(/[?]u=1&a=used&a_price=33000&a_km=9000&a_soh=96&b=used&b_price=18500&b_km=70000&b_reg=2021-06&b_soh=88&eval=/);
  await expect(page.getByTestId('used-card-a')).toBeVisible();
  await expect(page.getByTestId('used-card-b')).toBeVisible();
  // En español, Intl no agrupa los números de 4 cifras (9000), igual que el resto de la web.
  await expect(page.getByTestId('used-facts-a')).toContainText('9000 km');

  // Cambio de escenario (enlace rápido): recálculo en cliente; el bloque usado se conserva.
  await page.locator('a[data-scenario-link]').filter({ hasText: '10 viajes largos' }).click();
  await expect(page).toHaveURL(/[?]trips=10&u=1&a=used&a_price=33000.*&eval=/);
  await expect(page.locator('.live-decision')).toHaveAttribute('data-live', 'client');
  await expect(page.getByTestId('used-card-b')).toBeVisible();

  // Requisitos para usados en "Cambiar tu uso": SOH mínima 90 % → el Model 3 (88 %) no cumple.
  await page.getByRole('button', { name: 'Cambiar tu uso' }).first().click();
  await expect(page.getByTestId('used-requirements')).toBeVisible();
  await page.locator('#sc-minsoh').fill('90');
  await page.getByRole('button', { name: 'Aplicar' }).click();
  await expect(page).toHaveURL(/minsoh=90&u=1&a=used/);
  await expect(page.locator('#result')).toContainText('BYD SEAL');
  expect(problems).toEqual([]);
});

test('C — share: the link carries both cars, their condition and the used facts; same decision elsewhere', async ({ browser }) => {
  const ctx = await browser.newContext({ permissions: ['clipboard-read', 'clipboard-write'] });
  const page = await ctx.newPage();
  const problems = watchConsole(page);
  await page.goto(`/es-es/compare/${GOLF}-vs-${GOLF}?trips=10&${NEW_USED_QUERY}&eval=2026-10-15`);
  await expect(page.getByTestId('share-used-note')).toContainText('El enlace incluirá el precio, el kilometraje y el estado');
  await page.evaluate(() => Object.defineProperty(navigator, 'share', { value: undefined, configurable: true }));
  await page.getByTestId('share').click();
  await expect(page.getByTestId('share-status')).toHaveText('Enlace copiado');
  const url = await page.evaluate(() => navigator.clipboard.readText());
  expect(url).toContain(`trips=10&${NEW_USED_QUERY}&eval=2026-10-15`);
  const headline = await page.locator('#result-title').innerText();

  const other = await browser.newContext();
  const p2 = await other.newPage();
  await p2.goto(url);
  await expect(p2.getByTestId('condition-b')).toHaveText('B · USADO');
  await expect(p2.getByTestId('used-facts-b')).toContainText('84.000 km');
  await expect(p2.getByTestId('used-facts-b')).toContainText('Marzo de 2019');
  await expect(p2.locator('#result-title')).toHaveText(headline);
  // La imagen OG es la de la comparación base: no lleva hechos de la unidad.
  const og = await p2.locator('meta[property="og:image"]').getAttribute('content');
  expect(og).not.toMatch(/b_price|b_km|u=1/);
  expect(problems).toEqual([]);
  await other.close();
  await ctx.close();
});

test('D — swap: A NEW / B USED → A USED / B NEW, the facts follow their car', async ({ page }) => {
  const problems = watchConsole(page);
  await page.goto(`/es-es/compare/${BYD}-vs-${M3}?${'u=1&b=used&b_price=19000&b_km=62000&b_soh=91'}&eval=2026-10-15`);
  await expect(page.getByTestId('condition-b')).toHaveText('B · USADO');
  await page.getByTestId('swap-cars').click();
  await expect(page).toHaveURL(new RegExp(`/es-es/compare/${M3}-vs-${BYD}[?]u=1&a=used&a_price=19000&a_km=62000&a_soh=91&eval=2026-10-15$`));
  await expect(page.getByTestId('condition-a')).toHaveText('A · USADO');
  await expect(page.getByTestId('condition-b')).toHaveText('B · NUEVO');
  await expect(page.getByTestId('used-facts-a')).toContainText('19.000');
  await expect(page.getByTestId('used-card-a')).toBeVisible();
  await expect(page.getByTestId('used-card-b')).toHaveCount(0);
  expect(problems).toEqual([]);
});

test('E — i18n: switching to English keeps cars, facts and scenario; used reasons are translated', async ({ page }) => {
  const problems = watchConsole(page);
  const query = `trips=10&${NEW_USED_QUERY}&eval=2026-10-15`;
  await page.goto(`/es-es/compare/${GOLF}-vs-${GOLF}?${query}`);
  await page.locator('[data-lang-switch="en"]').click();
  await expect(page).toHaveURL(new RegExp(`/en-es/compare/${GOLF}-vs-${GOLF}[?]${query}$`));
  await expect(page.getByTestId('condition-b')).toHaveText('B · USED');
  await expect(page.getByTestId('used-facts-b')).toContainText('84,000 km');
  await expect(page.getByTestId('used-facts-b')).toContainText('March 2019');
  await expect(page.getByTestId('purchase-b')).toContainText('€28,000');
  await expect(page.getByTestId('used-attention-b')).toContainText('Service history partial');
  await expect(page.getByTestId('used-card-b')).not.toContainText(/historial|kilometraje|garantía/i);
  expect(problems).toEqual([]);
});

test('F — mobile 390 px: used form by touch and keyboard, accessible CTA, errors tied to their field', async ({ browser }) => {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  const page = await ctx.newPage();
  const problems = watchConsole(page);
  await page.goto('/es-es');
  await page.getByTestId('home-cta').click();
  const sheet = page.locator('.vs-picker--browse');
  expect((await sheet.boundingBox())?.width).toBeGreaterThanOrEqual(388);
  await page.getByTestId('brand-Volkswagen').tap();
  await page.getByTestId('model-Golf').tap();
  await page.getByTestId('year-2027').tap();
  await page.getByTestId(`variant-${GOLF}`).tap();
  const used = page.getByTestId('condition-used');
  expect((await used.boundingBox())?.height).toBeGreaterThanOrEqual(44);
  await used.tap();
  // Error asociado a su campo (precio fuera de rango) y foco en él; nada se valida mientras se escribe.
  await page.getByTestId('used-price').fill('50');
  await expect(page.locator('#uf-price-err')).toHaveCount(0);
  await page.getByTestId('used-review').tap();
  await expect(page.locator('#uf-price-err')).toContainText('Introduce un precio entre');
  await expect(page.getByTestId('used-price')).toBeFocused();
  await expect(page.getByTestId('used-price')).toHaveAttribute('aria-describedby', /uf-price-err/);
  // Teclado: corregir y avanzar con Enter.
  await page.getByTestId('used-price').fill('15900');
  await page.getByTestId('used-km').focus();
  await page.keyboard.type('84000');
  await page.keyboard.press('Enter');
  const cta = page.getByTestId('choose-car');
  await expect(cta).toBeVisible();
  expect((await cta.boundingBox())?.height).toBeGreaterThanOrEqual(44);
  // Volver atrás conserva lo escrito para la misma unidad.
  await page.getByTestId('picker-back').tap();
  await expect(page.getByTestId('used-price')).toHaveValue('15900');
  await page.getByTestId('used-review').tap();
  await cta.tap();
  await expect(page.getByTestId('pick-a-condition')).toHaveText('A · USADO');
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(0);
  expect(problems).toEqual([]);
  await ctx.close();
});

test('changing the used car never reuses the previous unit facts', async ({ page }) => {
  await page.goto(`/es-es/compare/${BYD}-vs-${M3}?u=1&b=used&b_price=19000&b_km=62000&b_soh=91&eval=2026-10-15`);
  await page.getByTestId('change-b').click();
  await page.getByTestId('step-brand').click();
  await browse(page, 'Volkswagen', 'Golf', '2027', GOLF);
  await page.getByTestId('condition-used').click();
  await expect(page.getByTestId('used-price')).toHaveValue('');
  await expect(page.getByTestId('used-km')).toHaveValue('');
  await page.getByTestId('used-review').click();
  await page.getByTestId('choose-car').click();
  await expect(page).toHaveURL(new RegExp(`/es-es/compare/${BYD}-vs-${GOLF}[?]u=1&b=used&eval=2026-10-15$`));
});

test('malformed used parameters never produce a 500', async ({ page }) => {
  const res = await page.goto(`/es-es/compare/${GOLF}-vs-${GOLF}?u=1&b=used&b_price=abc&b_km=-1&b_reg=2099&b_soh=500&eval=nope`);
  expect(res?.status()).toBe(200);
  await expect(page.locator('.notice').first()).toContainText('b_price');
  const both = await page.goto(`/es-es/compare/${GOLF}-vs-${GOLF}?a_price=1000`);
  expect(both?.status()).toBe(404);
  expect(EVAL.test('eval=2026-10-15')).toBe(true);
});
