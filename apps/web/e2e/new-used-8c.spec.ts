import { expect, test, type Page } from '@playwright/test';

/**
 * Step 8c — endurecimiento de la experiencia NEW/USED: lo que LEE la persona (nombres por condición, desembolso vs
 * coste de uso vs coste conocido, información de la unidad ≠ confianza de la recomendación, verificación por coche) y la
 * fecha de evaluación (explicada y actualizable a hoy, sin tocar los hechos declarados).
 */
const GOLF = 'volkswagen-golf-style-1-5-etsi-150-dsg';
const BYD = 'byd-seal-2026-design-rwd-82-5-kwh';
const M3 = 'tesla-model-3-2021-standard-range-plus-e6r';
const G01 = `${GOLF}-vs-${GOLF}?u=1&b=used&b_price=28000&b_km=84000&b_reg=2019&b_service=partial&eval=2026-10-15`;

function watchConsole(page: Page) {
  const problems: string[] = [];
  page.on('console', (m) => {
    if (m.type() === 'error' || m.type() === 'warning') problems.push(`${m.type()}: ${m.text()}`);
  });
  page.on('pageerror', (e) => problems.push(`pageerror: ${e.message}`));
  return problems;
}

test('G01 page: names by condition, three economic concepts kept apart, no economic winner from the price', async ({ page }) => {
  const problems = watchConsole(page);
  await page.goto(`/es-es/compare/${G01}`);
  await expect(page).toHaveTitle('Volkswagen Golf nuevo vs Volkswagen Golf usado — ¿Cuál encaja mejor contigo? | VScar');
  await expect(page.locator('#vs-title')).toHaveText('Volkswagen Golf nuevo vs Volkswagen Golf usado');
  await expect(page.getByTestId('condition-b')).toHaveText('B · USADO · 84.000 km');
  await expect(page.locator('main')).not.toContainText(/Golf [AB]\b/);
  await expect(page.getByTestId('same-variant-note')).toContainText('misma variante técnica');
  await expect(page.getByTestId('same-variant-note')).toContainText('eso no cambia el coste de uso');
  // A · desembolso, B · coste de uso, C · coste conocido.
  await expect(page.locator('#economics .chip').filter({ hasText: 'Coste de uso: energía' })).toHaveCount(1);
  await expect(page.locator('#economics')).not.toContainText('Vista de costes conocidos');
  await expect(page.getByTestId('purchase-diff')).toHaveText('El Volkswagen Golf usado requiere un desembolso inicial 10.850 € menor.');
  await expect(page.getByTestId('break-even')).toContainText('no gasta menos al año en energía: con este uso, esa diferencia no se recupera');
  await expect(page.getByTestId('purchase-block')).toContainText('no es un coste total de propiedad');
  await expect(page.locator('#result-title')).toHaveText('Empate práctico');
  // Información de la unidad ≠ confianza de la recomendación.
  await expect(page.getByTestId('used-info-level-b')).toHaveText('media');
  await expect(page.getByTestId('used-card-b')).toContainText('no es la fiabilidad del coche ni la confianza de la recomendación');
  await expect(page.getByTestId('used-info-short')).toContainText('Información sobre la unidad usada: media');
  // Los datos desconocidos no son "lo que sacrificas".
  await expect(page.locator('#tradeoffs')).not.toContainText('sin confirmar');
  await expect(page.getByTestId('verify-b')).toContainText('Volkswagen Golf usado');
  await expect(page.getByTestId('verify-a')).toHaveCount(0);
  expect(problems).toEqual([]);
});

test('evaluation date: explained, kept by shared links, updated to today only on request (facts untouched)', async ({ page }) => {
  const problems = watchConsole(page);
  await page.goto(`/es-es/compare/${G01}&trips=10`);
  const evaluation = page.getByTestId('evaluation');
  await expect(evaluation).toContainText('Fecha de evaluación: 15 de octubre de 2026.');
  await expect(evaluation).toContainText('calcular la antigüedad');
  // Abrir un enlace antiguo NO recalcula: la URL conserva su fecha.
  await expect(page).toHaveURL(/eval=2026-10-15/);
  const today = await page.evaluate(() => new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Madrid' }).format(new Date()));
  await page.getByTestId('update-eval').click();
  await expect(page).toHaveURL(new RegExp(`[?]trips=10&u=1&b=used&b_price=28000&b_km=84000&b_reg=2019&b_service=partial&eval=${today}#result$`));
  await expect(page.getByTestId('eval-updated')).toContainText('Análisis actualizado');
  await expect(page.getByTestId('eval-updated')).toContainText(/no cambian|Cambia:/);
  await expect(page.locator('#result-title')).toBeFocused();
  await expect(page.getByTestId('evaluation')).toContainText('El análisis ya usa la fecha de hoy.');
  await expect(page.getByTestId('used-facts-b')).toContainText('84.000 km');
  // El parámetro transitorio no queda en la URL que se comparte.
  expect(page.url()).not.toContain('prev_eval');
  expect(problems).toEqual([]);
});

test('English: same logical result, names by condition, market units', async ({ page }) => {
  const problems = watchConsole(page);
  await page.goto(`/en-es/compare/${G01}`);
  await expect(page).toHaveTitle('Volkswagen Golf (new) vs Volkswagen Golf (used) — Which fits you better? | VScar');
  await expect(page.getByTestId('condition-b')).toHaveText('B · USED · 84,000 km');
  await expect(page.getByTestId('purchase-diff')).toHaveText('The Volkswagen Golf (used) costs €10,850 less to buy (initial outlay).');
  await expect(page.getByTestId('evaluation')).toContainText('Evaluation date: 15 October 2026.');
  await expect(page.locator('#result-title')).toHaveText('Practical tie');
  await expect(page.locator('main')).not.toContainText(/Golf [AB]\b/);
  expect(problems).toEqual([]);
});

test('changing a used car brings attention to the updated result', async ({ page }) => {
  await page.goto(`/es-es/compare/${BYD}-vs-${M3}?u=1&b=used&b_price=19000&b_km=62000&eval=2026-10-15`);
  await page.getByTestId('change-b').click();
  await page.getByTestId('year-2021').click();
  await page.getByTestId(`variant-${M3}`).click();
  await page.getByTestId('condition-used').click();
  await page.getByTestId('used-price').fill('17500');
  await page.getByTestId('used-review').click();
  await page.getByTestId('choose-car').click();
  await expect(page).toHaveURL(/b_price=17500.*#result$/);
  // Regresión 8c: misma ruta con otros hechos de unidad → un solo <main> (antes quedaban dos montados).
  await expect(page.locator('main')).toHaveCount(1);
  await expect(page.locator('#result-title')).toHaveCount(1);
  await expect(page.locator('#result-title')).toBeFocused();
  await expect(page.getByTestId('used-facts-b')).toContainText('17.500');
});
