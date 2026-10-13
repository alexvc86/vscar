/**
 * Base de DESARROLLO de la web (Step 7b): aplica migraciones y carga el Dataset Core v0.1 (fixtures de curación,
 * `status = test_fixture`) si la base está vacía. Idempotente. Solo bases cuyo nombre termina en `_dev`.
 *
 *   corepack pnpm db:dev            (lee DATABASE_URL de .env)
 */
import { loadAllCases } from '@vscar/fixtures';
import { createCatalogRepository, createDb, tables } from '../src/index.ts';
import { applyMigrations } from '../src/migrations.ts';

const url = process.env.DATABASE_URL;
if (!url) throw new Error('DATABASE_URL is not set (see .env.example)');
const name = new URL(url).pathname.replace(/^\//, '');
if (!name.endsWith('_dev')) throw new Error(`refusing to seed "${name}": dev database name must end with _dev`);

const handle = createDb(url);
try {
  await applyMigrations(handle.db);
  const existing = await handle.db.select({ id: tables.referenceVariants.id }).from(tables.referenceVariants).limit(1);
  if (existing.length) {
    console.log(`${name}: migrations applied; catalog already seeded (no changes)`);
  } else {
    const bundle = loadAllCases();
    await createCatalogRepository(handle.db).saveBundle(bundle);
    console.log(`${name}: migrations applied; seeded Dataset Core v0.1 — ${bundle.variants.length} variants, ${bundle.spec_values.length} values, ${bundle.prices.length} prices`);
  }
} finally {
  await handle.close();
}
