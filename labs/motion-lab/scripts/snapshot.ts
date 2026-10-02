/**
 * Exporta el DatasetBundle real (Dataset Core v0.1, fixtures) a JSON para el navegador.
 * `@vscar/fixtures` usa node:crypto para los ids, así que no puede ejecutarse en el cliente:
 * el lab carga este snapshot y deriva todo lo demás con los engines puros.
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
