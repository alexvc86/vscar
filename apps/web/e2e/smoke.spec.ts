import { expect, test, type Page } from '@playwright/test';

const PATH = '/es-es/compare/byd-seal-vs-tesla-model-3';

function watchConsole(page: Page) {
  const problems: string[] = [];
  page.on('console', (m) => {
    if (m.type() === 'error' || m.type() === 'warning') problems.push(`${m.type()}: ${m.text()}`);
  });
  page.on('pageerror', (e) => problems.push(`pageerror: ${e.message}`));
  return problems;
}

test('ES tie → 10 trips → BYD → EN keeps scenario → back to ES', async ({ page }) => {
  const problems = watchConsole(page);
  await page.goto(PATH);
  await expect(page.locator('html')).toHaveAttribute('lang', 'es');
  const headline = page.locator('#result-title');
  await expect(headline).toHaveAttribute('data-status', 'PRACTICAL_TIE');
  await expect(headline).toHaveText('Empate práctico');
  await expect(page.locator('.result-card.is-selected')).toHaveCount(0);

  // Cambio de escenario sin recarga (pushState + recálculo en cliente).
  const origin = await page.evaluate(() => performance.timeOrigin);
  await page.locator('a[data-scenario-link]', { hasText: '10 viajes largos' }).click();
  await expect(page).toHaveURL(/\?trips=10$/);
  await expect(headline).toHaveAttribute('data-status', 'BEST_FOR_YOU');
  await expect(headline).toContainText('BYD SEAL');
  await expect(page.locator('.result-card--a.is-selected')).toHaveCount(1);
  expect(await page.evaluate(() => performance.timeOrigin)).toBe(origin);
  // Robustez del worker: llega sin bloquear y actualiza la confianza.
  await expect(page.locator('#change .pending-pill')).toHaveCount(0, { timeout: 15_000 });
  await expect(page.locator('#change .robustness__list li').first()).toContainText('28.570 km/año');
  await expect(page.locator('#confidence .confidence__level')).toContainText('MEDIA');

  // Cambiar a inglés conserva mercado, comparación y escenario.
  await page.locator('[data-lang-switch="en"]').click();
  await expect(page).toHaveURL(/\/en-es\/compare\/byd-seal-vs-tesla-model-3\?trips=10$/);
  await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  await expect(headline).toHaveAttribute('data-status', 'BEST_FOR_YOU');
  await expect(headline).toHaveText('Best for your needs: BYD SEAL');
  await expect(page.locator('[data-testid="scenario-summary"]')).toContainText('15,000 km per year');
  await expect(page.locator('#confidence .confidence__level')).toContainText('MEDIUM');

  await page.locator('[data-lang-switch="es"]').click();
  await expect(page).toHaveURL(/\/es-es\/compare\/byd-seal-vs-tesla-model-3\?trips=10$/);
  await expect(headline).toHaveText('El mejor para tus necesidades: BYD SEAL');
  expect(problems).toEqual([]);
});

test('scenario sheet: react-hook-form + Zod writes the URL and recalculates', async ({ page }) => {
  const problems = watchConsole(page);
  await page.goto(PATH);
  await page.getByRole('button', { name: 'Cambiar tu uso' }).first().click();
  const dialog = page.getByRole('dialog', { name: 'Tu uso' });
  await expect(dialog).toBeVisible();
  await dialog.getByLabel('Viajes largos al año').fill('10');
  await dialog.getByLabel('Distancia al año').fill('18000');
  await dialog.getByRole('button', { name: 'Aplicar' }).click();
  await expect(dialog).toBeHidden();
  await expect(page).toHaveURL(/\?km=18000&trips=10$/);
  await expect(page.locator('#result-title')).toHaveAttribute('data-status', 'BEST_FOR_YOU');
  await expect(page.locator('[data-testid="scenario-summary"]')).toContainText('18.000 km al año');
  // Validación: fuera de rango → error accesible y "Aplicar" deshabilitado.
  await page.getByRole('button', { name: 'Cambiar tu uso' }).first().click();
  await page.getByRole('dialog').getByLabel('Viajes largos al año').fill('999');
  await expect(page.getByRole('dialog').getByRole('alert')).toBeVisible();
  await expect(page.getByRole('dialog').getByRole('button', { name: 'Aplicar' })).toBeDisabled();
  await page.keyboard.press('Escape');
  expect(problems).toEqual([]);
});

test('routing: / → /es-es/, comparar alias, unknown locale 404, home in both languages', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveURL(/\/es-es$/);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('No el mejor coche. El mejor coche para ti.');
  await page.goto('/en-es');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Not the best car. The best car for you.');
  await expect(page.getByRole('link', { name: 'Compare cars' })).toHaveAttribute('href', '/en-es/compare/byd-seal-vs-tesla-model-3');
  await page.goto('/es-es/comparar/byd-seal-vs-tesla-model-3');
  await expect(page).toHaveURL(/\/es-es\/compare\/byd-seal-vs-tesla-model-3$/);
  const res = await page.goto('/fr-fr');
  expect(res?.status()).toBe(404);
});

test('reduced motion: no WebGL, no GSAP, same information', async ({ browser }) => {
  const ctx = await browser.newContext({ reducedMotion: 'reduce' });
  const page = await ctx.newPage();
  const problems = watchConsole(page);
  await page.goto(PATH);
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(2500);
  await expect(page.locator('canvas')).toHaveCount(0);
  await expect(page.locator('[data-atmosphere-mode]')).toHaveAttribute('data-atmosphere-mode', 'STATIC');
  expect(await page.evaluate(() => document.documentElement.dataset.scrollTriggers ?? null)).toBeNull();
  expect(await page.evaluate(() => [...performance.getEntriesByType('resource')].map((e) => e.name).filter((n) => /gsap|threeui/i.test(n)))).toEqual([]);
  await expect(page.locator('#result-title')).toHaveText('Empate práctico');
  await expect(page.locator('#change .robustness__list li')).not.toHaveCount(0);
  expect(problems).toEqual([]);
  await ctx.close();
});

test('keyboard: skip link and jump to details', async ({ page }) => {
  await page.goto(PATH);
  await page.keyboard.press('Tab');
  await expect(page.locator(':focus')).toHaveText('Saltar al contenido');
  await page.getByRole('link', { name: 'Ir a los detalles' }).click();
  await expect(page).toHaveURL(/#details$/);
  await expect(page.locator('#details summary').first()).toBeVisible();
});
