import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * Fronteras de rendimiento y de datos (Step 7a §105): análisis estático del grafo de imports.
 * Se recorren solo imports ESTÁTICOS desde las islas cliente que van en el JS inicial; los `import()`
 * dinámicos son precisamente las fronteras diferidas y no se siguen.
 */
const ROOT = resolve(import.meta.dirname, '..');
const SRC = join(ROOT, 'src');

/** Islas cliente que una página server-rendered importa estáticamente (JS inicial). */
const INITIAL_ISLANDS = [
  'components/compare/LiveDecision.tsx',
  'components/compare/ScenarioTrigger.tsx',
  'components/compare/ChapterIndex.tsx',
  'components/scenario/ScenarioSheetHost.tsx',
  'components/site/LanguageSwitcher.tsx',
  'components/visual/HeroAtmosphere.tsx',
  'components/visual/ScrollChoreography.tsx',
  // Step 7b: selector de vehículos (home) y controles del par (comparación). El selector en sí es diferido.
  'components/catalog/CompareBuilder.tsx',
  'components/catalog/PairControls.tsx',
];

const STATIC_IMPORT = /^\s*import\s+(?!type\b)(?:[^'"]*?\sfrom\s+)?['"]([^'"]+)['"]/gm;

function resolveLocal(from: string, spec: string): string | undefined {
  const base = spec.startsWith('@/') ? join(SRC, spec.slice(2)) : spec.startsWith('.') ? resolve(dirname(from), spec) : undefined;
  if (!base) return undefined;
  for (const c of [base, `${base}.ts`, `${base}.tsx`, join(base, 'index.ts')]) if (existsSync(c) && statSync(c).isFile()) return c;
  return undefined;
}

/** Devuelve todos los especificadores alcanzables por imports estáticos (paquetes + ficheros locales). */
function reachable(entry: string): { packages: Set<string>; files: Set<string> } {
  const packages = new Set<string>();
  const files = new Set<string>();
  const stack = [join(SRC, entry)];
  while (stack.length) {
    const f = stack.pop()!;
    if (files.has(f)) continue;
    files.add(f);
    const code = readFileSync(f, 'utf8');
    for (const m of code.matchAll(STATIC_IMPORT)) {
      const spec = m[1]!;
      const local = resolveLocal(f, spec);
      if (local) stack.push(local);
      else if (!spec.startsWith('.') && !spec.startsWith('@/')) packages.add(spec);
    }
  }
  return { packages, files };
}

describe('initial JS boundary (lazy boundaries)', () => {
  const graph = INITIAL_ISLANDS.map((e) => ({ entry: e, ...reachable(e) }));
  const allPackages = new Set(graph.flatMap((g) => [...g.packages]));
  const allFiles = new Set(graph.flatMap((g) => [...g.files].map((f) => f.slice(SRC.length + 1).replace(/\\/g, '/'))));

  it('the vehicle selector is a deferred chunk (import() on first open)', () => {
    expect(allFiles.has('components/catalog/VehicleSelector.tsx')).toBe(false);
    for (const f of ['components/catalog/CompareBuilder.tsx', 'components/catalog/PairControls.tsx']) {
      expect(readFileSync(join(SRC, f), 'utf8')).toMatch(/import\('\.\/VehicleSelector'\)/);
    }
  });
  it('client pipeline (engines, dataset) is not in the initial graph', () => {
    for (const p of ['@vscar/decision-engine', '@vscar/comparison-engine', '@vscar/economics-engine', '@vscar/market-context', '@vscar/vehicle-schema']) expect(allPackages.has(p), p).toBe(false);
    expect(allFiles.has('domain/decision.ts')).toBe(false);
    expect([...allFiles].some((f) => f.startsWith('data/'))).toBe(false);
  });
  it('GSAP, Motion, ThreeUI, react-hook-form and next-intl client provider are deferred', () => {
    for (const p of ['gsap', 'gsap/ScrollTrigger', 'gsap/SplitText', '@gsap/react', 'motion/react', 'motion', '@designcodeio/threeui', 'react-hook-form', '@hookform/resolvers/zod', 'next-intl', '@radix-ui/react-dialog', '@vscar/ui/sheet']) {
      expect(allPackages.has(p), p).toBe(false);
    }
    expect([...allPackages].some((p) => p.startsWith('@designcodeio/threeui'))).toBe(false);
  });
  it('the deferred modules really are behind dynamic import()', () => {
    const src = (f: string) => readFileSync(join(SRC, f), 'utf8');
    expect(src('components/compare/LiveDecision.tsx')).toMatch(/import\('\.\/ClientDecision'\)/);
    expect(src('components/visual/ScrollChoreography.tsx')).toMatch(/import\('\.\/GsapScenes'\)/);
    expect(src('components/visual/HeroAtmosphere.tsx')).toMatch(/import\('@designcodeio\/threeui\/components\/RibbonFieldBackground'\)/);
    expect(src('components/scenario/ScenarioSheetHost.tsx')).toMatch(/import\('\.\/ScenarioSheet'\)/);
  });
  it('robustness runs in a Web Worker, never in the client recompute path', () => {
    const worker = readFileSync(join(SRC, 'workers/robustness.worker.ts'), 'utf8');
    expect(worker).toContain('computeRobustness');
    expect(worker).not.toMatch(/from 'react/);
    const client = readFileSync(join(SRC, 'components/compare/ClientDecision.tsx'), 'utf8');
    expect(client).toMatch(/new Worker\(new URL\('\.\.\/\.\.\/workers\/robustness\.worker\.ts', import\.meta\.url\)/);
    expect(client).toContain('{ robustness: false }');
    expect(client).not.toContain('computeRobustness');
  });
});

describe('server-only data layer (Step 7b)', () => {
  const walk = (d: string): string[] => readdirSync(d).flatMap((f) => (statSync(join(d, f)).isDirectory() ? walk(join(d, f)) : [join(d, f)]));
  const files = walk(SRC).filter((f) => /\.(ts|tsx)$/.test(f));
  const rel = (f: string) => f.slice(SRC.length + 1).replace(/\\/g, '/');
  const DB = /['"](@vscar\/db|mysql2?|drizzle-orm)(\/[^'"]*)?['"]/;

  it('@vscar/db is imported ONLY under src/server/**', () => {
    expect(files.filter((f) => DB.test(readFileSync(f, 'utf8'))).map(rel).filter((f) => !f.startsWith('server/'))).toEqual([]);
  });
  it("every module in src/server/** starts with import 'server-only'", () => {
    for (const f of files.filter((x) => rel(x).startsWith('server/'))) expect(readFileSync(f, 'utf8').trimStart(), rel(f)).toMatch(/^import 'server-only';/);
  });
  it("no 'use client' module (nor the worker) reaches the server layer, the DB or snapshot data", () => {
    const clientEntries = files.filter((f) => /^\s*['"]use client['"]/.test(readFileSync(f, 'utf8'))).map(rel);
    expect(clientEntries.length).toBeGreaterThan(5);
    for (const entry of [...clientEntries, 'workers/robustness.worker.ts']) {
      const g = reachable(entry);
      const reached = [...g.files].map(rel);
      expect(reached.filter((f) => f.startsWith('server/') || f.startsWith('data/')), entry).toEqual([]);
      expect([...g.packages].filter((p) => DB.test(`'${p}'`)), entry).toEqual([]);
    }
  });
});

describe('i18n request locale', () => {
  it('no segment-level not-found under [locale]/: Next renders it before the page and it would pin next-intl to the default locale', () => {
    const walk = (d: string): string[] => readdirSync(d).flatMap((f) => (statSync(join(d, f)).isDirectory() ? walk(join(d, f)) : [join(d, f)]));
    const notFounds = walk(join(SRC, 'app')).filter((f) => /not-found\.tsx$/.test(f)).map((f) => f.slice(SRC.length + 1).replace(/\\/g, '/'));
    expect(notFounds).toEqual(['app/[locale]/not-found.tsx']);
  });
});

describe('dependency boundary', () => {
  const pkg = JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf8')) as { dependencies: Record<string, string>; devDependencies: Record<string, string> };
  const deps = Object.keys(pkg.dependencies);
  it('no R3F / three / OGL / Lenis / smooth-scroll in production deps (ADR-011)', () => {
    for (const d of deps) expect(d).not.toMatch(/^(three|@react-three\/.*|ogl|lenis|@studio-freight\/lenis|locomotive-scroll|smooth-scrollbar)$/);
  });
  it('no connectors / worker; MySQL only through @vscar/db (never mysql2 or drizzle directly)', () => {
    for (const d of [...deps, ...Object.keys(pkg.devDependencies)]) expect(d).not.toMatch(/^(@vscar\/(data-connectors|worker)|mysql2?|drizzle-orm)$/);
  });
  it('src/ never imports connectors, worker, fixtures or the MySQL driver/ORM directly', () => {
    const FORBIDDEN = /['"](@vscar\/(data-connectors|worker|fixtures)|mysql2?|drizzle-orm)(\/[^'"]*)?['"]/;
    const walk = (d: string): string[] => readdirSync(d).flatMap((f) => (statSync(join(d, f)).isDirectory() ? walk(join(d, f)) : [join(d, f)]));
    expect(walk(SRC).filter((f) => /\.(ts|tsx)$/.test(f) && FORBIDDEN.test(readFileSync(f, 'utf8')))).toEqual([]);
  });
});
