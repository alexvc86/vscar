import { cpSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { migrate } from 'drizzle-orm/mysql2/migrator';
import type { RowDataPacket } from 'mysql2/promise';
import { Source, SpecValue, technicalKeyOf } from '@vscar/vehicle-schema';
import { createTechnicalCurationRepository, tables, type DbHandle } from '../src/index.ts';
import { MIGRATIONS_FOLDER } from '../src/migrations.ts';
import { freshTestDb } from './test-db.ts';

/**
 * Step D1.6a — la migración 0009 (restricciones de la capa de curación) aplicada sobre una base que YA tiene datos
 * curados con 0008: no se pierde ninguna fila y las restricciones quedan activas. Requiere VSCAR_TEST_DATABASE_URL.
 */
const url = process.env.VSCAR_TEST_DATABASE_URL;

describe.skipIf(!url)('migration 0009 over existing curated data (MySQL)', () => {
  let handle: DbHandle;
  let upTo0008: string;
  beforeAll(async () => {
    handle = await freshTestDb(url!);
    // Volver a una base vacía y aplicar solo 0000–0008 (copia de la carpeta con el journal recortado).
    const [rows] = await handle.pool.query<RowDataPacket[]>('SELECT table_name AS name FROM information_schema.tables WHERE table_schema = DATABASE()');
    await handle.pool.query('SET FOREIGN_KEY_CHECKS = 0');
    for (const r of rows) await handle.pool.query(`DROP TABLE IF EXISTS \`${String(r.name)}\``);
    await handle.pool.query('SET FOREIGN_KEY_CHECKS = 1');
    upTo0008 = mkdtempSync(join(tmpdir(), 'vscar-mig-'));
    cpSync(MIGRATIONS_FOLDER, upTo0008, { recursive: true });
    const journalPath = join(upTo0008, 'meta', '_journal.json');
    const journal = JSON.parse(readFileSync(journalPath, 'utf8')) as { entries: Array<{ idx: number }> };
    writeFileSync(journalPath, JSON.stringify({ ...journal, entries: journal.entries.filter((e) => e.idx <= 8) }));
    await migrate(handle.db, { migrationsFolder: upTo0008 });
  });
  afterAll(async () => {
    await handle?.close();
    if (upTo0008) rmSync(upTo0008, { recursive: true, force: true });
  });

  it('0009 keeps every existing row and activates the constraints', async () => {
    const source = Source.parse({ id: 'a0000000-0000-5000-8000-0000000000f1', code: 'S01', name: 'EEA (test)', source_authority: 'OFFICIAL_AUTHORITY', market_code: 'EU', base_url: 'https://discodata.eea.europa.eu/' });
    const repo = createTechnicalCurationRepository(handle.db);
    await repo.ensureSources([source]);
    for (const n of [1, 2, 3]) {
      const id = `b0000000-0000-5000-8000-0000000000f${n}`;
      const identity = { type_approval_number: `E9*2007/46*0001*0${n}`, variant_code: 'A', version_code: `V${n}`, confidence: 'EXACT' as const };
      const value = SpecValue.parse({ id: `c0000000-0000-5000-8000-0000000000f${n}`, variant_id: id, spec_key: 'dim.mass_kg', value: 1200 + n, unit: 'kg', source_id: source.id, source_url: 'https://discodata.eea.europa.eu/', source_market: 'ES', reference_market: 'ES', source_authority: 'OFFICIAL_AUTHORITY', mapping_confidence: 'EXACT', homologation_match: 'NOT_APPLICABLE', retrieved_at: '2026-10-16', measurement_basis: { mass_definition: 'EU_RUNNING_ORDER' } });
      await repo.writeItem({
        vehicle: { id, market_code: 'ES', technical_key: technicalKeyOf(identity), brand: 'Mig', model: `M${n}`, technical_identity: identity, homologation_powertrain: 'ICE', product_class: 'ICE_OR_MHEV', registration_period: { first_observed_year: 2019, last_observed_year: 2020 }, commercial_identity_status: 'UNCONFIRMED', curation_status: 'CURATED', source_codes: ['S01'], blockers: [] },
        attributes: [],
        observations: [{ value, source_code: 'S01', source_record: `S01:mig:${n}`, identity_match: 'EXACT_TAN_VA_VE', rights_status: 'CONDITIONAL', quality_status: 'USABLE', quality_reasons: [], conflict_status: 'NONE' }],
      });
    }
    await handle.pool.query("INSERT INTO curated_import_runs (id, batch_key, plan_hash, status, started_at) VALUES ('e0000000-0000-5000-8000-000000000001', 'mig', REPEAT('a', 64), 'COMPLETED', NOW(3))");
    await handle.pool.query("INSERT INTO curated_import_items (batch_key, technical_key, vehicle_id, item_hash, status, run_id, updated_at) VALUES ('mig', 'E9*2007/46*0001*01|A|V1', 'b0000000-0000-5000-8000-0000000000f1', REPEAT('b', 64), 'IMPORTED', 'e0000000-0000-5000-8000-000000000001', NOW(3))");
    const before = await repo.counts();

    await migrate(handle.db, { migrationsFolder: MIGRATIONS_FOLDER });

    expect(await repo.counts()).toEqual(before);
    expect(before).toEqual({ vehicles: 3, attributes: 0, observations: 3 });
    expect((await handle.db.select().from(tables.curatedImportItems)).length).toBe(1);
    const [checks] = await handle.pool.query<RowDataPacket[]>("SELECT COUNT(*) AS n FROM information_schema.TABLE_CONSTRAINTS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME LIKE 'curated%' AND CONSTRAINT_TYPE = 'CHECK'");
    expect(checks[0]!.n).toBe(10);
  });
});
