/**
 * Step D1.8 — informe determinista de la navegación Marca → Modelo → Año y de la resolución técnica, recorriendo la API
 * REAL del selector (`/api/catalog/browse`) de un servidor en marcha (canal PREVIEW, MySQL `vscar_dev`).
 *
 *   node apps/web/scripts/d18-navigation-report.mjs [http://localhost:4200] [docs/data/d18/catalog-navigation.json]
 *
 * Solo agregados: marcas, modelos, años con su base y estado de resolución por modelo y año, y opciones comparables
 * (slug de la ReferenceVariant que se compara). Sin valores de observaciones ni ids de la capa técnica.
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');
const base = process.argv[2] ?? 'http://localhost:4200';
const out = resolve(ROOT, process.argv[3] ?? 'docs/data/d18/catalog-navigation.json');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const get = async (params) => {
  for (let attempt = 0; ; attempt++) {
    const r = await fetch(`${base}/api/catalog/browse?${new URLSearchParams({ market: 'ES', ...params })}`);
    // La API tiene limitador por IP: se respeta Retry-After en lugar de saltárselo.
    if (r.status === 429 && attempt < 20) {
      await sleep(Number(r.headers.get('retry-after') ?? 10) * 1000);
      continue;
    }
    if (!r.ok) throw new Error(`${r.status} ${JSON.stringify(params)}`);
    return r.json();
  }
};

const { brands, channel } = await get({ level: 'brands' });
const report = { step: 'D1.8', channel, brands: [] };
for (const b of brands) {
  const { models } = await get({ level: 'models', brand: b.brand });
  const entry = { brand: b.brand, availability: b.availability, models: [] };
  for (const m of models) {
    const { years } = await get({ level: 'years', brand: b.brand, model: m.model });
    const yrs = [];
    for (const y of years) {
      const { resolution } = await get({ level: 'configurations', brand: b.brand, model: m.model, year: y.year === null ? 'unknown' : String(y.year) });
      yrs.push({
        year: y.year,
        basis: y.basis,
        availability: y.availability,
        resolution: resolution.status,
        technicalOnly: resolution.technicalOnly,
        configurations: resolution.configurations.map((c) => ({
          availability: c.availability,
          powertrainType: c.powertrainType,
          ...(c.fuel ? { fuel: c.fuel } : {}),
          ...(c.transmission ? { transmission: c.transmission } : {}),
          ...(c.name ? { name: c.name } : {}),
          members: c.members,
          cycles: c.cycles,
          ...(c.option ? { comparesSlug: c.option.slug } : {}),
          ...(c.reasons ? { reasons: c.reasons } : {}),
        })),
      });
    }
    entry.models.push({ model: m.model, availability: m.availability, years: yrs });
  }
  report.brands.push(entry);
}
const all = report.brands.flatMap((b) => b.models.flatMap((m) => m.years));
const count = (s) => all.filter((y) => y.resolution === s).length;
report.summary = {
  brands: report.brands.length,
  comparableBrands: report.brands.filter((b) => b.availability === 'COMPARISON_ELIGIBLE').length,
  models: report.brands.reduce((n, b) => n + b.models.length, 0),
  comparableModels: report.brands.reduce((n, b) => n + b.models.filter((m) => m.availability === 'COMPARISON_ELIGIBLE').length, 0),
  modelYears: all.length,
  comparableModelYears: all.filter((y) => y.availability === 'COMPARISON_ELIGIBLE').length,
  resolution: { AUTO_RESOLVED: count('AUTO_RESOLVED'), EQUIVALENT_GROUP: count('EQUIVALENT_GROUP'), NEEDS_CONFIGURATION: count('NEEDS_CONFIGURATION'), UNRESOLVED: count('UNRESOLVED') },
  comparableOptions: all.reduce((n, y) => n + y.configurations.filter((c) => c.availability === 'COMPARISON_ELIGIBLE').length, 0),
  homologationsBehindComparableOptions: all.reduce((n, y) => n + y.configurations.filter((c) => c.availability === 'COMPARISON_ELIGIBLE').reduce((s, c) => s + c.members, 0), 0),
  maxYear: Math.max(...all.map((y) => y.year ?? 0)),
};
mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify(report.summary, null, 2));
