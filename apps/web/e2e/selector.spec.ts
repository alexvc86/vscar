import { expect, test, type Page } from '@playwright/test';

/**
 * Step 7b.2 → D1.8 (ADR-020) — VehiclePicker: Marca → Modelo → Año (tres pasos) y "Buscar directamente" (atajo), sobre el
 * catálogo MySQL de desarrollo (canal PREVIEW). La homologación se resuelve en el servidor; solo si hay configuraciones
 * realmente distintas aparece una aclaración contextual. Nunca hay un paso "Versión".
 */
const GOLF18_WLTP = 'volkswagen-golf-2018-advance-1-5-tsi-130-h35';
const GOLF_ETSI = 'volkswagen-golf-style-1-5-etsi-150-dsg';
const BYD = 'byd-seal-2026-design-rwd-82-5-kwh';
/** Model 3 2021 "Autonomía estándar plus": E6R y E6CR son equivalentes; se compara E6CR (ADR-020 §4). */
const M3 = 'tesla-model-3-2021-standard-range-plus-e6cr';
const M3_SRP = /Autonomía estándar plus|Standard Range Plus|estándar plus/i;

function watchConsole(page: Page) {
  const problems: string[] = [];
  page.on('console', (m) => {
    if (m.type() === 'error' || m.type() === 'warning') problems.push(`${m.type()}: ${m.text()}`);
  });
  page.on('pageerror', (e) => problems.push(`pageerror: ${e.message}`));
  return problems;
}

/** Recorre los 3 pasos (+ aclaración si hace falta) y confirma. Comprueba el foco en el título de cada paso. */
async function browseTo(page: Page, brand: string, model: string, year: string, configuration?: RegExp) {
  const title = page.locator('#vp-step-title');
  await page.getByTestId(`brand-${brand}`).click();
  await expect(title).toBeFocused();
  await page.getByTestId(`model-${model}`).click();
  await expect(title).toBeFocused();
  await page.getByTestId(`year-${year}`).click();
  await expect(title).toBeFocused();
  if (configuration) {
    await expect(page.getByTestId('configuration-panel')).toBeVisible();
    await page.getByTestId('configuration-panel').getByRole('button', { name: configuration }).click();
    await expect(title).toBeFocused();
  }
  await expect(page.locator('.vp-summary')).toBeVisible();
  await page.getByTestId('condition-new').click();
}

test('§107 home ES → Volkswagen → Golf → 2018 (no version step) → second car → compare → change A (year) → EN keeps pair', async ({ page }) => {
  const problems = watchConsole(page);
  await page.goto('/es-es');
  await page.getByTestId('home-cta').click();
  const dialog = page.getByRole('dialog');
  await expect(dialog).toHaveAccessibleName('Elige el primer coche');
  await expect(page.getByTestId('picker-side')).toHaveText('Coche A');
  await expect(page.locator('[aria-current="step"]')).toContainText('Marca');
  // Tarjeta de modelo: una por modelo, con sus años reales y visual (silueta genérica: no hay imagen con derechos).
  await page.getByTestId('brand-Volkswagen').click();
  const golf = page.getByTestId('model-Golf');
  await expect(golf).toContainText('2027');
  await expect(golf).toContainText('2018');
  await expect(golf.locator('[data-visual="silhouette"]')).toHaveCount(1);
  await page.getByTestId('model-Golf').click();
  await expect(page.getByTestId('year-2018')).toHaveAttribute('data-availability', 'COMPARISON_ELIGIBLE');
  await page.getByTestId('year-2018').click();
  // D1.8: dos homologaciones (NEDC / WLTP) del mismo coche → UNA opción, sin paso Versión ni tarjetas duplicadas.
  await expect(page.locator('.vp-summary')).toBeVisible();
  await expect(page.locator('.vp-summary')).not.toContainText(/NEDC|WLTP/);
  await expect(page.getByTestId('step-version')).toHaveCount(0);
  await page.getByTestId('condition-new').click();

  // Flujo guiado: el selector pasa al coche B.
  await expect(dialog).toHaveAccessibleName('Elige el segundo coche');
  await expect(page.getByTestId('picker-side')).toHaveText('Coche B');
  // Model 3 2021: dos configuraciones reales → aclaración contextual (no un cuarto paso fijo).
  await browseTo(page, 'Tesla', 'Model 3', '2021', M3_SRP);
  await expect(dialog).toBeHidden();
  await page.getByTestId('compare-go').click();
  await expect(page).toHaveURL(new RegExp(`/es-es/compare/${GOLF18_WLTP}-vs-${M3}$`));

  // Escenario + cambiar A: el selector abre en el AÑO del coche actual; otro año → coche resuelto directamente.
  await page.goto(`/es-es/compare/${GOLF18_WLTP}-vs-${M3}?trips=10`);
  await page.getByTestId('change-a').click();
  await expect(page.locator('[aria-current="step"]')).toContainText('Año');
  await page.getByTestId('year-2027').click();
  await page.getByTestId('condition-new').click();
  await expect(page).toHaveURL(new RegExp(`/es-es/compare/${GOLF_ETSI}-vs-${M3}[?]trips=10(#result)?$`));

  await page.locator('[data-lang-switch="en"]').click();
  await expect(page).toHaveURL(new RegExp(`/en-es/compare/${GOLF_ETSI}-vs-${M3}[?]trips=10$`));
  await expect(page.getByTestId('variant-a')).toContainText('Golf');
  expect(problems).toEqual([]);
});

test('step back without closing; search directly as a shortcut; swap keeps the scenario', async ({ page }) => {
  const problems = watchConsole(page);
  await page.goto(`/en-es/compare/${BYD}-vs-${M3}?trips=10`);
  await page.getByTestId('change-b').click();
  await expect(page.locator('[aria-current="step"]')).toContainText('Year');
  await page.getByTestId('picker-back').click();
  await expect(page.locator('[aria-current="step"]')).toContainText('Model');
  await page.getByTestId('picker-back').click();
  await expect(page.locator('[aria-current="step"]')).toContainText('Brand');
  await expect(page.getByRole('dialog')).toBeVisible();

  await page.getByTestId('picker-mode').click();
  const search = page.getByTestId('vehicle-search');
  await expect(search).toBeFocused();
  await expect(search).toHaveAttribute('role', 'combobox');
  await search.fill('golf etsi');
  await page.locator(`[role="option"][data-slug="${GOLF_ETSI}"]`).click();
  // Step 8b: tras elegir el coche, ¿Nuevo o Usado?
  await page.getByTestId('condition-new').click();
  await expect(page).toHaveURL(new RegExp(`/en-es/compare/${BYD}-vs-${GOLF_ETSI}[?]trips=10(#result)?$`));

  await page.getByTestId('swap-cars').click();
  await expect(page).toHaveURL(new RegExp(`/en-es/compare/${GOLF_ETSI}-vs-${BYD}[?]trips=10$`));
  expect(problems).toEqual([]);
});

test('same car twice as NEW is blocked (Used is allowed); Escape closes and returns focus to Change', async ({ page }) => {
  await page.goto(`/en-es/compare/${BYD}-vs-${M3}`);
  const changeA = page.getByTestId('change-a');
  await changeA.click();
  await page.getByTestId('step-brand').click();
  await browseToVersion(page, 'Tesla', 'Model 3', '2021');
  // Step 8b: M3 ya es el coche B (nuevo). Elegirlo otra vez como NUEVO avisa; como USADO sería válido.
  await page.getByTestId('configuration-panel').getByRole('button', { name: /Standard Range Plus|estándar plus/i }).click();
  await page.getByTestId('condition-new').click();
  await expect(page.getByRole('dialog').getByRole('alert')).toHaveText('This same car is already the new one on the other side: choose Used to compare a specific car, or pick another car.');
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toBeHidden();
  await expect(changeA).toBeFocused();
});

async function browseToVersion(page: Page, brand: string, model: string, year: string) {
  await page.getByTestId(`brand-${brand}`).click();
  await page.getByTestId(`model-${model}`).click();
  await page.getByTestId(`year-${year}`).click();
}

test('keyboard only: Tab + Enter through the three steps (a single configuration resolves by itself)', async ({ page }) => {
  await page.goto('/es-es');
  await page.getByTestId('pick-a').focus();
  await page.keyboard.press('Enter');
  const title = page.locator('#vp-step-title');
  await expect(title).toBeFocused();
  for (const target of ['brand-SEAT', 'model-León', 'year-2026']) {
    await page.getByTestId(target).focus();
    await page.keyboard.press('Enter');
    await expect(title).toBeFocused();
  }
  await page.getByTestId('condition-new').focus();
  await page.keyboard.press('Enter');
  await expect(page.getByTestId('pick-a')).toContainText('León');
});

test('§108 mobile 390 px: full-screen sheet, the three steps, select a car', async ({ browser }) => {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  const page = await ctx.newPage();
  await page.goto('/es-es');
  await page.getByTestId('home-cta').click();
  const sheet = page.locator('.vs-picker--browse');
  await expect(sheet).toBeVisible();
  const box = await sheet.boundingBox();
  expect(box?.width).toBeGreaterThanOrEqual(388);
  await expect(page.locator('.vp__steps')).toBeHidden();
  await expect(page.locator('.vp__progress')).toHaveText('1 / 3');
  await page.getByTestId('brand-BYD').tap();
  await page.getByTestId('model-SEAL').tap();
  const year = page.getByTestId('year-2026');
  expect((await year.boundingBox())?.height).toBeGreaterThanOrEqual(44);
  await year.tap();
  await expect(page.locator('.vp__progress')).toHaveText('3 / 3');
  const newCar = page.getByTestId('condition-new');
  expect((await newCar.boundingBox())?.height).toBeGreaterThanOrEqual(44);
  await newCar.tap();
  await expect(page.getByTestId('pick-a')).toContainText('SEAL');
  await ctx.close();
});

test('unknown vehicle → specific 404; invalid inputs → controlled API errors', async ({ page, request }) => {
  const res = await page.goto(`/es-es/compare/${BYD}-vs-no-such-car`);
  expect(res?.status()).toBe(404);
  await expect(page.getByTestId('compare-not-found')).toContainText('No encontramos uno de estos vehículos.');
  expect((await request.get(`/api/catalog/search?market=ES&q=${'x'.repeat(101)}`)).status()).toBe(400);
  expect((await request.get('/api/catalog/browse?market=ES&level=models')).status()).toBe(400);
});

test('ES and EN pickers show the same brands, models, years and configurations', async ({ page }) => {
  const collect = async (locale: string) => {
    await page.goto(`/${locale}`);
    await page.getByTestId('pick-a').click();
    // Esperar a que cada lista haya cargado antes de leerla.
    await expect(page.getByTestId('brand-Tesla')).toBeVisible();
    const brands = await page.locator('[data-testid^="brand-"]').evaluateAll((els) => els.map((e) => e.getAttribute('data-testid')));
    await page.getByTestId('brand-Tesla').click();
    await page.getByTestId('model-Model 3').click();
    await expect(page.getByTestId('year-2021')).toBeVisible();
    const years = await page.locator('[data-testid^="year-"]').evaluateAll((els) => els.map((e) => e.getAttribute('data-testid')));
    await page.getByTestId('year-2021').click();
    await expect(page.getByTestId('configuration-panel')).toBeVisible();
    const configurations = await page.locator('[data-testid^="configuration-c"]').evaluateAll((els) => els.map((e) => e.getAttribute('data-testid')));
    return { brands, years, configurations };
  };
  const es = await collect('es-es');
  // 2021: "Autonomía estándar plus" (E6R + E6CR equivalentes) y "Tracción trasera" — nunca tres filas.
  expect(es.configurations).toHaveLength(2);
  expect(await collect('en-es')).toEqual(es);
});

test('D1.8 — "I don\'t know" keeps the choice without numbers; a model with only technical data says why it is not comparable', async ({ page }) => {
  const problems = watchConsole(page);
  await page.goto('/en-es');
  await page.getByTestId('pick-a').click();
  await page.getByTestId('brand-Tesla').click();
  await page.getByTestId('model-Model 3').click();
  await page.getByTestId('year-2021').click();
  await page.getByTestId('configuration-dont-know').click();
  const panel = page.getByTestId('unavailable-panel');
  await expect(panel).toHaveAttribute('data-reason', 'dontKnow');
  await expect(panel).toContainText('Comparison unavailable');
  await expect(page.locator('.vp-summary')).toHaveCount(0);
  await page.getByTestId('choose-configuration').click();
  await expect(page.getByTestId('configuration-panel')).toBeVisible();

  // Toyota: solo homologaciones técnicas → información y motivos, sin comparación ni resumen Nuevo/Usado.
  await page.getByTestId('step-brand').click();
  await expect(page.getByTestId('brand-Toyota')).toHaveAttribute('data-availability', 'CATALOG_DISCOVERABLE');
  await page.getByTestId('brand-Toyota').click();
  await page.getByTestId('model-Corolla').click();
  await expect(page.getByTestId('year-2022')).toContainText('registrations');
  await page.getByTestId('year-2022').click();
  await expect(page.getByTestId('unavailable-panel')).toHaveAttribute('data-reason', 'technical');
  await expect(page.getByTestId('unavailable-panel')).toContainText('Not yet in the comparable catalogue');
  await expect(page.getByTestId('condition-new')).toHaveCount(0);
  await expect(page.getByTestId('unavailable-panel')).not.toContainText(/E\d+\*|TAN|S11|RDW/);
  expect(problems).toEqual([]);
});
