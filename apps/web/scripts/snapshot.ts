/**
 * Exporta el DatasetBundle controlado (Dataset Core v0.1, fixtures) a JSON. Servidor y cliente leen el MISMO
 * snapshot, así la decisión inicial (RSC) y el recálculo en cliente/worker parten de los mismos hechos.
 * `@vscar/fixtures` usa node:crypto, por eso no se importa en `src/`.
 */
import { writeFileSync } from 'node:fs';
import { BYD_SEAL_IDS, MODEL3_2021_IDS, loadAllCases } from '@vscar/fixtures';

const bundle = loadAllCases();
const out = {
  _provenance: { generated: new Date().toISOString().slice(0, 10), how: '@vscar/fixtures loadAllCases() (Dataset Core v0.1 curation drafts — not a publishable dataset)' },
  ids: { byd: BYD_SEAL_IDS.variant, model3: MODEL3_2021_IDS.srp },
  bundle,
};
writeFileSync(new URL('../src/data/dataset-core.snapshot.json', import.meta.url), JSON.stringify(out));
console.log('snapshot:', bundle.variants.length, 'variants,', bundle.spec_values.length, 'values');
