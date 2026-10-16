/**
 * Step D1.4 — adquisición puntual (red). Descarga una vez los artefactos de datos de la release fijada de gor3a (S14) y la
 * muestra pública de Opendatabay (S15) a `data/raw/` (fuera de Git) y verifica sus SHA-256. Idempotente: si el fichero
 * existe con la huella esperada, no se vuelve a descargar. Nunca descarga ni ejecuta el código del repositorio de terceros.
 *
 *   node packages/curation/scripts/d14-acquire.ts
 *
 * Opendatabay: solo la muestra publicada (`sampleLink`); el CSV completo está en un bucket privado tras cuenta → no se accede.
 * Las páginas de licencia/procedencia se guardaron como evidencia (HTML) en la misma carpeta durante la investigación.
 */
import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { GOR3A_DATASET } from '@vscar/data-connectors';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');
const rel = `https://github.com/gor3a/vehicle-makes-models/releases/download/${GOR3A_DATASET.release}`;
const raw = `https://raw.githubusercontent.com/gor3a/vehicle-makes-models/${GOR3A_DATASET.commit}`;
const G = join(ROOT, 'data', 'raw', 'gor3a', GOR3A_DATASET.release);
const O = join(ROOT, 'data', 'raw', 'opendatabay', '2026-10-16');

const RESOURCES: { url: string; path: string; sha256: string }[] = [
  { url: `${rel}/vehicle-data-json.zip`, path: join(G, 'vehicle-data-json.zip'), sha256: '76e524ef5b26c733d2ec911df706f0dec0dcc28f4032f261f0ecf139ba10db8e' },
  { url: `${rel}/vehicle-data-csv.zip`, path: join(G, 'vehicle-data-csv.zip'), sha256: '0265e47303cc08cb1b95b075f37d67e8ef7fb67c5dfcd2adbaafaad5acfb98b4' },
  { url: `${rel}/vehicles.sqlite`, path: join(G, 'vehicles.sqlite'), sha256: '4f7e8aa7655238451c720487aecda506c36491fb1451b1d45cb56719c102d170' },
  { url: `${raw}/README.md`, path: join(G, 'repo_README.md'), sha256: '34dd14c1b2da0fe45440b03bf6bc029eaba586702b43a8c9fc7a1a0b3e3a1799' },
  { url: `${raw}/LICENSE-DATA`, path: join(G, 'repo_LICENSE-DATA'), sha256: '929002c598eb35029cbcd8fc40a9c47626da4d13eda06bba25cbafba531b8cb8' },
  { url: 'https://storage.googleapis.com/opendatabay_public/77731fb5-141f-4ebe-9ee7-1c06b133d99e/sample_101_Car_Dataset_1945-2020.csv', path: join(O, 'sample_101_Car_Dataset_1945-2020.csv'), sha256: '9128249e935b6ad877454cc56ba889783c49bff79ad3139e11f9586effe57240' },
];

const sha = (b: Buffer) => createHash('sha256').update(b).digest('hex');
for (const r of RESOURCES) {
  const existing = await readFile(r.path).catch(() => undefined);
  if (existing && sha(existing) === r.sha256) {
    console.log(`ok (cached) ${r.path}`);
    continue;
  }
  const res = await fetch(r.url, { headers: { 'user-agent': 'VScar data audit (one-off, D1.4)' } });
  if (!res.ok) throw new Error(`${r.url}: HTTP ${res.status}`);
  const body = Buffer.from(await res.arrayBuffer());
  if (sha(body) !== r.sha256) throw new Error(`${r.url}: SHA-256 mismatch (release changed?) — not stored`);
  await mkdir(dirname(r.path), { recursive: true });
  await writeFile(r.path, body);
  console.log(`downloaded ${r.path} (${body.length} B)`);
}
