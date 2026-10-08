/**
 * Informe de bundle REPRODUCIBLE (Step 7a §64): equivalente a size-limit pero sobre lo que el navegador
 * descarga de verdad. Pide cada ruta al servidor de producción (`next start`), extrae los `<script>` del
 * HTML inicial, mide gzip -9 de cada chunk y clasifica los chunks por librería mediante firmas.
 *
 *   corepack pnpm --filter @vscar/web build && corepack pnpm --filter @vscar/web start
 *   corepack pnpm --filter @vscar/web size            # informe
 *   corepack pnpm --filter @vscar/web size -- --check # además, exit 1 si se supera el presupuesto
 *
 * No relaja el presupuesto: si el JS inicial supera 200 KB gzip lo dice (BUDGET EXCEEDED) con desglose.
 */
import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join, sep } from 'node:path';
import { gzipSync } from 'node:zlib';

const BASE = process.env.VSCAR_WEB_URL ?? 'http://localhost:4200';
const BUDGET_KB = 200;
const ROUTES = ['/es-es/', '/en-es/', '/es-es/compare/byd-seal-vs-tesla-model-3', '/en-es/compare/byd-seal-vs-tesla-model-3', '/es-es/methodology'];
const root = new URL('..', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1');
const chunksDir = join(root, '.next', 'static', 'chunks');

/**
 * Firmas por librería (cadenas que sobreviven a la minificación), en ORDEN DE PRIORIDAD: cada chunk se
 * atribuye a la primera que coincide (librería principal), así el desglose suma el total sin doble conteo.
 */
const SIGNATURES: [string, RegExp][] = [
  ['three', /WebGLRenderer|ShaderChunk|MeshStandardMaterial/],
  ['r3f', /__r3f|react-three-fiber/],
  ['ogl', /new Program\(gl|uTexel/],
  ['robustness-worker', /unknown comparison/],
  ['gsap', /GreenSock|_gsap|ScrollTrigger|SplitText/],
  ['motion', /layoutId|MotionConfig|motionValue|LayoutGroup/],
  ['pipeline', /alpha-decision-v1|why-not-v1|robustness-v1/],
  ['react-hook-form', /useFormContext|shouldUnregister/],
  ['radix', /DismissableLayer|FocusScope/],
  ['next-intl', /use-intl|IntlProvider|MISSING_MESSAGE|INVALID_MESSAGE/],
  ['threeui', /uniform vec2 pointer/],
  ['react-dom', /__reactContainer|onRecoverableError|react-dom/],
  ['next', /__next_f|NEXT_REDIRECT|next-router|__NEXT_DATA__/],
];

const norm = (p: string) => p.split(sep).join('/');
const files = readdirSync(chunksDir, { recursive: true }).map((f) => norm(String(f))).filter((f) => f.endsWith('.js'));
const info = new Map(
  files.map((f) => {
    const buf = readFileSync(join(chunksDir, f));
    const s = buf.toString('utf8');
    const libs = SIGNATURES.filter(([, r]) => r.test(s)).map(([k]) => k);
    return [f, { gz: gzipSync(buf, { level: 9 }).length, raw: buf.length, libs, primary: libs[0] ?? 'app/other', worker: /unknown comparison/.test(s) }];
  }),
);
const kb = (b: number) => +(b / 1024).toFixed(1);

const routes: { route: string; initialKB: number; initialWithLegacyKB: number; scripts: string[]; libs: Record<string, number> }[] = [];
for (const route of ROUTES) {
  const html = await (await fetch(BASE + route)).text();
  const tags = [...html.matchAll(/<script[^>]*src="\/_next\/static\/chunks\/([^"'?\s]+\.js)"[^>]*>/g)];
  const scripts = [...new Set(tags.map((m) => m[1]!))];
  // `noModule` = polyfills legacy: los navegadores modernos no los descargan.
  const legacy = new Set(tags.filter((m) => /noModule/i.test(m[0])).map((m) => m[1]!));
  const libs: Record<string, number> = {};
  let total = 0;
  let legacyTotal = 0;
  for (const s of scripts) {
    const c = info.get(s);
    if (!c) continue;
    if (legacy.has(s)) {
      legacyTotal += c.gz;
      libs['legacy-polyfills (noModule)'] = kb(c.gz);
      continue;
    }
    total += c.gz;
    libs[c.primary] = +((libs[c.primary] ?? 0) + kb(c.gz)).toFixed(1);
  }
  routes.push({ route, initialKB: kb(total), initialWithLegacyKB: kb(total + legacyTotal), scripts, libs });
}

const initialSet = new Set(routes.flatMap((r) => r.scripts));
const deferred = [...info.entries()].filter(([f]) => !initialSet.has(f)).map(([f, c]) => ({ file: f, gzKB: kb(c.gz), primary: c.primary, libs: c.libs, worker: c.worker })).sort((a, b) => b.gzKB - a.gzKB);
const deferredByLibrary = deferred.reduce<Record<string, number>>((acc, d) => ({ ...acc, [d.primary]: +((acc[d.primary] ?? 0) + d.gzKB).toFixed(1) }), {});
const forbidden = [...info.entries()].filter(([, c]) => c.libs.some((l) => l === 'three' || l === 'r3f' || l === 'ogl')).map(([f, c]) => ({ file: f, libs: c.libs }));
// Una librería está en el JS inicial si algún chunk inicial la contiene (aunque no sea su librería principal).
const initialLibs = (lib: string) => routes.filter((r) => r.scripts.some((s) => info.get(s)?.libs.includes(lib))).map((r) => r.route);

const report = {
  base: BASE,
  budgetKB: BUDGET_KB,
  // El presupuesto se evalúa con la cifra CONSERVADORA (incluye los polyfills legacy).
  routes: routes.map((r) => ({ route: r.route, initialKB: r.initialKB, initialWithLegacyKB: r.initialWithLegacyKB, status: r.initialWithLegacyKB <= BUDGET_KB ? 'WITHIN BUDGET' : 'BUDGET EXCEEDED', chunks: r.scripts.length, byLibrary: r.libs })),
  deferredByLibrary,
  deferred,
  checks: {
    gsapNotInitial: initialLibs('gsap').length === 0,
    threeuiNotInitial: initialLibs('threeui').length === 0,
    pipelineNotInitial: initialLibs('pipeline').length === 0,
    motionNotInitial: initialLibs('motion').length === 0,
    formNotInitial: initialLibs('react-hook-form').length === 0,
    noThreeR3fOgl: forbidden.length === 0,
    robustnessWorkerChunk: deferred.some((d) => d.worker),
  },
  forbidden,
};
writeFileSync(join(root, '.next', 'bundle-report.json'), JSON.stringify(report, null, 2));
console.log(JSON.stringify(report, null, 2));
if (process.argv.includes('--check')) {
  const failed = report.routes.some((r) => r.status !== 'WITHIN BUDGET') || Object.values(report.checks).some((v) => !v);
  if (failed) {
    console.error('bundle check FAILED');
    process.exit(1);
  }
}
