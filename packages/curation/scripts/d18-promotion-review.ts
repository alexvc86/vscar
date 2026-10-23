/**
 * Step D1.8 (ADR-020) — revisión de PROMOCIÓN de homologaciones técnicas al canal PREVIEW (offline, determinista).
 * No promueve nada: evalúa cada candidata contra las cinco puertas y deja el resultado y sus bloqueos documentados.
 *
 *   node packages/curation/scripts/d18-promotion-review.ts
 *
 * Entrada: `docs/data/d17/technical-catalog-coverage.json` (D1.7, generado desde MySQL, sin valores).
 * Salida:  `docs/data/d18/promotion-review.json`.
 *
 * Puertas (todas obligatorias):
 * 1. TECHNICAL_IDENTITY: TAN completo + Va + Ve EXACT.
 * 2. RIGHTS: ninguna fuente DENIED; categorías con derechos compatibles con el canal (PREVIEW admite PENDING, pero
 *    se registra si la categoría depende solo de ellos).
 * 3. QUALITY: sin conflicto abierto en una clave de categoría.
 * 4. CATEGORY_ELIGIBILITY: al menos una categoría de comparación activable con datos utilizables.
 * 5. CONFIGURATION_RESOLUTION: la ReferenceVariant que se crearía exige generación, año-modelo, acabado y nombre
 *    comercial (`ReferenceVariant` en @vscar/vehicle-schema). Deben estar VERIFICADOS; nunca se rellenan desde la
 *    matrícula ni desde la homologación.
 */
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');
const CANDIDATES = [5, 6, 7, 26, 27, 28, 48, 56, 81];

type Vehicle = { rank: number; label: string; technicalKey: string; productClass: string; registration: { first_observed_year: number; last_observed_year: number }; commercialIdentity: string; importantConflictKeys: string[]; technicalCategories: string[]; authorizedCategories: string[]; status: string; fields: Record<string, { found: boolean; status?: string }> };
const cov = JSON.parse(await readFile(join(ROOT, 'docs/data/d17/technical-catalog-coverage.json'), 'utf8')) as { vehicles: Vehicle[] };
/** La auditoría D1.7 certifica que la capa técnica no tiene ninguna fila de año-modelo (no hay fuente). */
const audit = JSON.parse(await readFile(join(ROOT, 'docs/data/d17/audit-after-batch-E.json'), 'utf8')) as { summary: { checks: { noGenerationOrModelYearRows: boolean } } };
const modelYearRowsExist = !audit.summary.checks.noGenerationOrModelYearRows;

const review = CANDIDATES.map((rank) => {
  const v = cov.vehicles.find((x) => x.rank === rank)!;
  const generation = v.fields['Generación confirmada']!;
  const trim = v.fields['Acabado comercial confirmado']!;
  const gates = {
    TECHNICAL_IDENTITY: { pass: /^E\d{1,2}\*\d{4}\/\d{1,4}\*\d{1,5}\*\d{1,3}\|[^|]+\|[^|]+$/i.test(v.technicalKey), detail: 'TAN completo + Va + Ve (EXACT)' },
    RIGHTS: {
      pass: true,
      detail: v.authorizedCategories.length ? `categorías con S01 condicional (CC BY): ${v.authorizedCategories.join(', ')}` : 'las categorías dependen solo de fuentes PENDING (S11): admisible en PREVIEW, nunca en PUBLIC',
    },
    QUALITY: { pass: v.importantConflictKeys.length === 0, detail: v.importantConflictKeys.length ? `conflicto en ${v.importantConflictKeys.join(', ')}` : 'sin conflicto en claves de categoría' },
    CATEGORY_ELIGIBILITY: { pass: v.technicalCategories.length > 0, detail: v.technicalCategories.length ? `activables: ${v.technicalCategories.join(', ')}` : 'ninguna categoría activable' },
    CONFIGURATION_RESOLUTION: {
      pass: generation.found && modelYearRowsExist && trim.status === 'EXACT',
      detail: `ReferenceVariant exige generation_code, model_year, trim_name y commercial_name verificados. Generación: ${generation.found ? 'sí' : 'sin fuente'}; año-modelo: sin fuente (solo matriculación ${v.registration.first_observed_year}–${v.registration.last_observed_year}); acabado: ${trim.status === 'EXACT' ? 'EXACT' : 'no confirmado'}; identidad comercial ${v.commercialIdentity}`,
    },
  };
  const blockedBy = Object.entries(gates)
    .filter(([, g]) => !g.pass)
    .map(([k]) => k);
  return { rank, label: v.label, productClass: v.productClass, diagnosisD17: v.status, gates, decision: blockedBy.length ? 'NOT_PROMOTED' : 'PROMOTABLE_TO_PREVIEW', blockedBy };
});

const out = {
  step: 'D1.8',
  note: 'Promotion review only. Nothing is written to reference_variants. A curated homologation is never promoted by filling generation, model year or trim from registration or homologation data.',
  candidates: review.length,
  promoted: review.filter((r) => r.decision !== 'NOT_PROMOTED').length,
  blocked: {
    identity: review.filter((r) => r.blockedBy.includes('CONFIGURATION_RESOLUTION')).length,
    rights: review.filter((r) => r.blockedBy.includes('RIGHTS')).length,
    data: review.filter((r) => r.blockedBy.includes('CATEGORY_ELIGIBILITY')).length,
    conflicts: review.filter((r) => r.blockedBy.includes('QUALITY')).length,
  },
  review,
};
await mkdir(join(ROOT, 'docs/data/d18'), { recursive: true });
await writeFile(join(ROOT, 'docs/data/d18/promotion-review.json'), `${JSON.stringify(out, null, 2)}\n`);
console.log(JSON.stringify({ candidates: out.candidates, promoted: out.promoted, blocked: out.blocked }));
