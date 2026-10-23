import { expect, test, type Page } from '@playwright/test';

/**
 * Step D1.8 — escenarios con vehículos REALES del catálogo de desarrollo (MySQL `vscar_dev`, canal PREVIEW), en
 * escritorio y en móvil. Solo años y configuraciones presentes en la base; nada inventado para la prueba.
 * - comparable: el selector resuelve el coche y pregunta Nuevo/Usado;
 * - solo datos técnicos: información + "Comparación no disponible", sin resumen ni cálculos.
 * Capturas opcionales: VSCAR_D18_SHOTS=<directorio>.
 */
const SCENARIOS = [
  { brand: 'Volkswagen', model: 'Golf', year: '2018', expect: 'summary' },
  { brand: 'Toyota', model: 'Corolla', year: '2022', expect: 'unavailable' },
  { brand: 'Toyota', model: 'Yaris', year: '2022', expect: 'unavailable' },
  { brand: 'Tesla', model: 'Model Y', year: '2022', expect: 'unavailable' },
  { brand: 'Peugeot', model: '308', year: '2024', expect: 'unavailable' },
  { brand: 'Renault', model: 'Clio', year: '2024', expect: 'unavailable' },
  { brand: 'Kia', model: 'Sportage', year: '2022', expect: 'unavailable' },
] as const;
const VIEWPORTS = [
  { name: 'desktop', viewport: { width: 1440, height: 900 }, isMobile: false, hasTouch: false },
  { name: 'mobile', viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true },
] as const;
const shots = process.env.VSCAR_D18_SHOTS;

async function pick(page: Page, s: (typeof SCENARIOS)[number], touch: boolean) {
  const press = (id: string) => (touch ? page.getByTestId(id).tap() : page.getByTestId(id).click());
  await press(`brand-${s.brand}`);
  await press(`model-${s.model}`);
  await press(`year-${s.year}`);
}

for (const vp of VIEWPORTS) {
  test(`D1.8 real vehicles — ${vp.name}`, async ({ browser }) => {
    const ctx = await browser.newContext({ viewport: vp.viewport, isMobile: vp.isMobile, hasTouch: vp.hasTouch });
    const page = await ctx.newPage();
    const problems: string[] = [];
    page.on('pageerror', (e) => problems.push(e.message));
    page.on('console', (m) => (m.type() === 'error' ? problems.push(m.text()) : undefined));
    for (const s of SCENARIOS) {
      await page.goto('/es-es');
      await page.getByTestId('home-cta').click();
      await expect(page.locator('.vs-picker--browse')).toBeVisible();
      await pick(page, s, vp.hasTouch);
      if (s.expect === 'summary') {
        await expect(page.locator('.vp-summary')).toBeVisible();
        await expect(page.getByTestId('condition-new')).toBeVisible();
        await expect(page.locator('.vp-summary')).not.toContainText(/NEDC|WLTP|E\d+\*/);
      } else {
        const panel = page.getByTestId('unavailable-panel');
        await expect(panel).toBeVisible();
        await expect(panel).toContainText('Comparación no disponible');
        await expect(page.getByTestId('condition-new')).toHaveCount(0);
        await expect(panel).not.toContainText(/E\d+\*|\bTAN\b|S11|RDW/);
      }
      // Sin scroll horizontal en ningún viewport.
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true);
      if (shots) await page.screenshot({ path: `${shots}/d18-${vp.name}-${s.brand}-${s.model}-${s.year}.png`.replace(/ /g, '_') });
    }
    expect(problems).toEqual([]);
    await ctx.close();
  });
}
