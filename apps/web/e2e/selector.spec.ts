import { expect, test, type Page } from '@playwright/test';

/**
 * Step 7b — selector real + orquestación (catálogo MySQL de desarrollo, canal PREVIEW).
 * Flujo del brief §118 + teclado, bloqueo de "mismo coche", Escape, atrás/adelante y 404 específica.
 */
const BYD = 'byd-seal-2026-design-rwd-82-5-kwh';
const M3 = 'tesla-model-3-2021-standard-range-plus-e6r';
const M3_LATE = 'tesla-model-3-2021-standard-range-plus-e6cr';

function watchConsole(page: Page) {
  const problems: string[] = [];
  page.on('console', (m) => {
    if (m.type() === 'error' || m.type() === 'warning') problems.push(`${m.type()}: ${m.text()}`);
  });
  page.on('pageerror', (e) => problems.push(`pageerror: ${e.message}`));
  return problems;
}

async function pick(page: Page, query: string, slug: string) {
  const search = page.getByTestId('vehicle-search');
  await expect(search).toBeFocused();
  await search.fill(query);
  const option = page.locator(`[role="option"][data-slug="${slug}"]`);
  await expect(option).toBeVisible();
  await option.click();
}

test('home ES → choose BYD → choose Model 3 → compare → trips → EN keeps pair + scenario → swap → back/forward', async ({ page }) => {
  const problems = watchConsole(page);
  await page.goto('/es-es');
  await expect(page.getByTestId('compare-go')).toBeDisabled();

  // "Comparar coches" abre el selector del primer coche (sin pedir escenario antes).
  await page.getByTestId('home-cta').click();
  const dialog = page.getByRole('dialog');
  await expect(dialog).toHaveAccessibleName('Elige el primer coche');
  await expect(page.locator('.picker__status')).toContainText('Escribe al menos 2 letras');
  await pick(page, 'BYD', BYD);
  // Flujo guiado: el segundo coche se pide a continuación.
  await expect(dialog).toHaveAccessibleName('Elige el segundo coche');
  await page.getByTestId('vehicle-search').fill('Tesla');
  // Dos variants técnicas con el mismo nombre comercial: se distinguen por su periodo, nunca por códigos.
  await expect(page.locator(`[role="option"][data-slug="${M3}"]`)).toContainText('homologado');
  await expect(dialog).not.toContainText('E6R');
  await page.locator(`[role="option"][data-slug="${M3}"]`).click();
  await expect(dialog).toBeHidden();
  await expect(page.getByTestId('pick-a')).toContainText('SEAL Design RWD');
  await expect(page.getByTestId('pick-b')).toContainText('Model 3');

  await page.getByTestId('compare-go').click();
  await expect(page).toHaveURL(new RegExp(`/es-es/compare/${BYD}-vs-${M3}$`));
  const headline = page.locator('#result-title');
  await expect(headline).toHaveAttribute('data-status', 'PRACTICAL_TIE');

  // Cambiar el escenario cambia la decisión (pipeline cliente diferido).
  await page.locator('a[data-scenario-link]', { hasText: '10 viajes largos' }).click();
  await expect(page).toHaveURL(/\?trips=10$/);
  await expect(headline).toHaveAttribute('data-status', 'BEST_FOR_YOU');
  await expect(headline).toContainText('BYD SEAL');

  // Idioma: mismo par, mismo escenario, mismo mercado.
  await page.locator('[data-lang-switch="en"]').click();
  await expect(page).toHaveURL(new RegExp(`/en-es/compare/${BYD}-vs-${M3}\\?trips=10$`));
  await expect(headline).toHaveText('Best for your needs: BYD SEAL');

  // Intercambiar: B vs A con el mismo escenario y la misma decisión (BYD, ahora en el lado B).
  await page.getByTestId('swap-cars').click();
  await expect(page).toHaveURL(new RegExp(`/en-es/compare/${M3}-vs-${BYD}\\?trips=10$`));
  await expect(headline).toHaveText('Best for your needs: BYD SEAL');
  await expect(page.locator('.result-card--b.is-selected')).toHaveCount(1);

  // Historial del navegador.
  await page.goBack();
  await expect(page).toHaveURL(new RegExp(`/en-es/compare/${BYD}-vs-${M3}\\?trips=10$`));
  await expect(page.locator('.result-card--a.is-selected')).toHaveCount(1);
  await page.goForward();
  await expect(page).toHaveURL(new RegExp(`/en-es/compare/${M3}-vs-${BYD}\\?trips=10$`));
  await expect(page.locator('.result-card--b.is-selected')).toHaveCount(1);
  expect(problems).toEqual([]);
});

test('change car on the comparison: keyboard, same-car block, Escape, scenario preserved', async ({ page }) => {
  const problems = watchConsole(page);
  await page.goto(`/en-es/compare/${BYD}-vs-${M3}?trips=10`);
  const changeA = page.getByTestId('change-a');
  await changeA.click();
  const dialog = page.getByRole('dialog');
  await expect(dialog).toHaveAccessibleName('Choose the first car');
  const search = page.getByTestId('vehicle-search');
  await expect(search).toHaveAttribute('role', 'combobox');
  await expect(search).toHaveAttribute('aria-controls', /.+/);

  // A no puede ser igual que B.
  await search.fill('model 3');
  // La opción está `aria-disabled` (ya es el coche B); un usuario puede pulsarla igualmente y recibe el aviso.
  await page.locator(`[role="option"][data-slug="${M3}"]`).click({ force: true });
  await expect(dialog.getByRole('alert')).toHaveText('Choose a different car.');
  await expect(dialog).toBeVisible();

  // Escape cierra y el foco vuelve a "Change".
  await page.keyboard.press('Escape');
  await expect(dialog).toBeHidden();
  await expect(changeA).toBeFocused();

  // Teclado: ↓ hasta la otra variant del Model 3 e Intro.
  await changeA.click();
  await search.fill('tesla');
  await expect(page.locator(`[role="option"][data-slug="${M3_LATE}"]`)).toBeVisible();
  const activeSlug = () =>
    page.evaluate(() => {
      const id = document.activeElement?.getAttribute('aria-activedescendant');
      return id ? document.getElementById(id)?.getAttribute('data-slug') : null;
    });
  for (let i = 0; i < 6 && (await activeSlug()) !== M3_LATE; i++) await page.keyboard.press('ArrowDown');
  expect(await activeSlug()).toBe(M3_LATE);
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(new RegExp(`/en-es/compare/${M3_LATE}-vs-${M3}\\?trips=10$`));
  await expect(page.getByTestId('variant-a')).toContainText('Model 3');
  await expect(page.locator('#result-title')).toHaveAttribute('data-status', /.+/);
  expect(problems).toEqual([]);
});

test('unknown vehicle → specific 404; invalid search input → controlled API error', async ({ page, request }) => {
  const res = await page.goto(`/es-es/compare/${BYD}-vs-no-such-car`);
  expect(res?.status()).toBe(404);
  await expect(page.getByTestId('compare-not-found')).toContainText('No encontramos uno de estos vehículos.');
  const same = await page.goto(`/en-es/compare/${BYD}-vs-${BYD}`);
  expect(same?.status()).toBe(404);
  await expect(page.getByTestId('compare-not-found')).toContainText("We couldn't find one of these vehicles.");
  expect((await request.get(`/api/catalog/search?market=ES&q=${'x'.repeat(101)}`)).status()).toBe(400);
  const ok = await request.get('/api/catalog/search?market=ES&q=leon');
  expect((await ok.json()).results.map((r: { slug: string }) => r.slug)).toEqual(['seat-leon-2026-style-e-hybrid-204']);
});

test('ES and EN selectors list the same catalog', async ({ page }) => {
  const list = async (locale: string) => {
    await page.goto(`/${locale}`);
    await page.getByTestId('pick-a').click();
    await page.getByTestId('vehicle-search').fill('golf');
    await expect(page.locator('[role="option"]').first()).toBeVisible();
    return page.locator('[role="option"]').evaluateAll((els) => els.map((e) => e.getAttribute('data-slug')));
  };
  expect(await list('en-es')).toEqual(await list('es-es'));
});
