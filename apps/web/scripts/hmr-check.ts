/**
 * Comprobación de limpieza tras HMR (pendiente desde Step 6e). Uso:
 *   corepack pnpm --filter @vscar/web exec next dev -p 4201   (en otra terminal)
 *   node scripts/hmr-check.ts
 * Abre la comparación en Chrome real, edita varias veces ficheros que montan GSAP, ThreeUI y los
 * capítulos (añade y quita un comentario), y compara ScrollTriggers, listeners de `window` (CDP),
 * contextos WebGL y errores de consola antes y después. Restaura siempre los ficheros.
 */
import { chromium } from '@playwright/test';
import { readFileSync, writeFileSync } from 'node:fs';

const TARGET = process.env.VSCAR_HMR_URL ?? 'http://localhost:4201/es-es/compare/byd-seal-vs-tesla-model-3';
const ROUNDS = 3;
const FILES = ['src/components/visual/GsapScenes.tsx', 'src/components/visual/HeroAtmosphere.tsx', 'src/components/compare/DecisionChapters.tsx'].map((f) => new URL(`../${f}`, import.meta.url));

const browser = await chromium.launch({ channel: 'chrome', headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const problems: string[] = [];
page.on('console', (m) => {
  if (m.type() === 'error' || m.type() === 'warning') problems.push(`${m.type()}: ${m.text().slice(0, 200)}`);
});
page.on('pageerror', (e) => problems.push(`pageerror: ${e.message}`));
const cdp = await page.context().newCDPSession(page);

async function snapshot(label: string) {
  await page.waitForTimeout(2500);
  const dom = await page.evaluate(() => ({
    scrollTriggers: Number(document.documentElement.dataset.scrollTriggers ?? 'NaN'),
    canvases: document.querySelectorAll('canvas').length,
    atmosphere: document.querySelector('[data-atmosphere-mode]')?.getAttribute('data-atmosphere-mode') ?? null,
    status: document.querySelector('#result-title')?.getAttribute('data-status') ?? null,
  }));
  const { result } = await cdp.send('Runtime.evaluate', { expression: 'window' });
  const { listeners } = await cdp.send('DOMDebugger.getEventListeners', { objectId: result.objectId! });
  const byType: Record<string, number> = {};
  for (const l of listeners) byType[l.type] = (byType[l.type] ?? 0) + 1;
  return { label, ...dom, windowListeners: listeners.length, byType };
}

const originals = FILES.map((f) => readFileSync(f, 'utf8'));
const snapshots = [];
try {
  await page.goto(TARGET, { waitUntil: 'networkidle', timeout: 120_000 });
  snapshots.push(await snapshot('initial'));
  for (let r = 1; r <= ROUNDS; r++) {
    for (const [i, f] of FILES.entries()) {
      writeFileSync(f, `${originals[i]}\n// hmr-check round ${r}\n`);
      await page.waitForTimeout(1500);
      writeFileSync(f, originals[i]!);
      await page.waitForTimeout(1500);
    }
    snapshots.push(await snapshot(`after round ${r}`));
  }
} finally {
  FILES.forEach((f, i) => writeFileSync(f, originals[i]!));
  await browser.close();
}

const first = snapshots[0]!;
const last = snapshots.at(-1)!;
const verdict = {
  noDuplicatedScrollTriggers: last.scrollTriggers === first.scrollTriggers,
  noDuplicatedWindowListeners: last.windowListeners <= first.windowListeners,
  oneWebGLContext: snapshots.every((s) => s.canvases <= 1),
  noConsoleErrors: problems.length === 0,
};
console.log(JSON.stringify({ url: TARGET, rounds: ROUNDS, snapshots, problems, verdict }, null, 2));
process.exit(Object.values(verdict).every(Boolean) ? 0 : 1);
