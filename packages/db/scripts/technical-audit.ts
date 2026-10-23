/**
 * Step D1.6a — auditoría de SOLO LECTURA de la capa de curación técnica (sin escrituras en MySQL).
 *
 *   node --env-file=.env packages/db/scripts/technical-audit.ts [--out docs/data/d16a/first-18-audit.json]
 *
 * Por vehículo:
 * - identidad (TAN completo + Va + Ve) y periodo de matriculación;
 * - observaciones por fuente, derechos, calidad y conflictos;
 * - atributos comerciales y última ejecución.
 * Comprobaciones globales:
 * - sin generación ni año-modelo;
 * - acabados solo donde D1.2 los marcó EXACT;
 * - toda fila cita la clave exacta de SU vehículo (sin propagación entre versiones);
 * - solo fuentes oficiales y ninguna fuente de investigación (OpenDataBay, gor3a…);
 * - sin precios en la capa curada;
 * - catálogo seleccionable idéntico al de D1.6.
 * Sin secretos: no imprime la URL de la base.
 */
import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';
import { createDb, createTechnicalCurationRepository, tables } from '../src/index.ts';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');
const { values: args } = parseArgs({ options: { out: { type: 'string', default: 'docs/data/d16a/first-18-audit.json' } } });
const url = process.env.DATABASE_URL;
if (!url) throw new Error('DATABASE_URL is not set (see .env.example)');
const dbName = new URL(url).pathname.replace(/^\//, '');

const OFFICIAL_SOURCES = new Set(['S01', 'S02', 'S11', 'S13']);
const OFFICIAL_HOSTS = new Set(['discodata.eea.europa.eu', 'opendata.rdw.nl']);
const RESEARCH_MARKERS = /opendatabay|gor3a|kaggle|autoseeker|vehiclesdb|github|car_dataset|models\.csv/i;
const D12_EXACT_TRIM_RANKS = new Set([4, 26]);

const handle = createDb(url);
try {
  const db = handle.db;
  const repo = createTechnicalCurationRepository(db);
  const list = await repo.listVehicles('ES');
  const details = await repo.loadVehicles(list.map((v) => v.id));
  const items = await db.select().from(tables.curatedImportItems);
  const runs = await db.select().from(tables.curatedImportRuns);
  const keyOf = (s: string) => s.toUpperCase();

  const vehicles = details
    .sort((a, b) => (a.vehicle.d1_rank ?? 0) - (b.vehicle.d1_rank ?? 0))
    .map(({ vehicle: v, attributes, observations }) => {
      const k = keyOf(v.technical_key);
      const bySource = (code: string) => observations.filter((o) => o.source_code === code).length;
      const foreign = [...observations.map((o) => o.source_record), ...attributes.filter((a) => a.kind === 'TECHNICAL' || a.attribute === 'commercial_designation').map((a) => a.source_record)].filter((r) => !keyOf(r).includes(k));
      const groups = new Map<string, typeof observations>();
      for (const o of observations.filter((x) => x.conflict_status === 'IN_CONFLICT')) groups.set(o.conflict_group!, [...(groups.get(o.conflict_group!) ?? []), o]);
      const conflicts = [...groups.entries()].map(([group, obs]) => {
        const sources = [...new Set(obs.map((o) => o.source_code))].sort();
        const bases = [...new Set(obs.map((o) => JSON.stringify({ cycle: o.value.test_cycle ?? null, basis: o.value.measurement_basis ?? null })))];
        return {
          candidateRank: v.d1_rank,
          specKey: obs[0]!.value.spec_key,
          conflictGroup: group,
          // Step D1.7: los valores de fuentes con derechos PENDING no se escriben en artefactos versionados (redistribución no aprobada).
          values: obs.map((o) => ({ source: o.source_code, record: o.source_record, rights: o.rights_status, ...(o.rights_status === 'PENDING' ? { value: null, valueRedacted: 'rights PENDING' } : { value: o.value.value ?? [o.value.value_min, o.value.value_max] }), unit: o.value.unit, testCycle: o.value.test_cycle ?? null, measurementBasis: o.value.measurement_basis ?? null, quality: o.quality_status })),
          conflictType: sources.length > 1 ? (bases.length > 1 ? 'CROSS_SOURCE_DIFFERENT_BASIS' : 'CROSS_SOURCE_VALUE_MISMATCH') : bases.length > 1 ? 'SAME_SOURCE_DIFFERENT_BASIS' : 'SAME_SOURCE_VALUE_MISMATCH',
          decisionStatus: 'OPEN — all values kept, none averaged, no source-priority rule applied',
        };
      });
      const item = items.filter((i) => i.vehicle_id === v.id).sort((a, b) => String(b.updated_at).localeCompare(String(a.updated_at)))[0];
      return {
        id: v.id,
        candidateRank: v.d1_rank ?? null,
        candidateId: v.d1_candidate_id ?? null,
        brand: v.brand,
        model: v.model,
        fullTan: v.technical_identity.type_approval_number,
        variant: v.technical_identity.variant_code,
        version: v.technical_identity.version_code,
        identityConfidence: v.technical_identity.confidence,
        commercialIdentity: v.commercial_identity_status,
        commercialAttributes: attributes.filter((a) => a.kind === 'COMMERCIAL').map((a) => ({ attribute: a.attribute, status: a.status, source: a.source_code, rights: a.rights_status })),
        registrationPeriod: v.registration_period,
        curationStatus: v.curation_status,
        observations: { total: observations.length, S01: bySource('S01'), S11: bySource('S11'), usable: observations.filter((o) => o.quality_status === 'USABLE').length, notUsable: observations.filter((o) => o.quality_status === 'NOT_USABLE').length },
        rights: Object.fromEntries([...new Set(observations.map((o) => o.source_code))].sort().map((s) => [s, [...new Set(observations.filter((o) => o.source_code === s).map((o) => o.rights_status))]])),
        technicalAttributes: attributes.filter((a) => a.kind === 'TECHNICAL').map((a) => `${a.attribute}=${a.rights_status === 'PENDING' ? '<redacted>' : a.value} (${a.source_code}, ${a.rights_status})`),
        openConflicts: conflicts,
        rowsCitingAnotherKey: foreign.length,
        blockers: v.blockers,
        lastImport: item ? { batch: item.batch_key, status: item.status, runId: item.run_id, at: item.updated_at, runStatus: runs.find((r) => r.id === item.run_id)?.status ?? null } : null,
      };
    });

  const allAttrs = details.flatMap((d) => d.attributes);
  const allObs = details.flatMap((d) => d.observations);
  const srcRows = await db.select().from(tables.sources);
  const usedSourceIds = [...new Set(allObs.map((o) => o.value.source_id))];
  const hosts = [...new Set(allObs.map((o) => new URL(o.value.source_url).host))].sort();
  const catalog: Record<string, string | number> = {};
  for (const [name, tbl] of Object.entries({ reference_variants: tables.referenceVariants, homologations: tables.homologations, spec_values: tables.specValues, vehicle_prices: tables.vehiclePrices, safety_ratings: tables.safetyRatings })) {
    const rows = await db.select().from(tbl);
    catalog[`${name}_rows`] = rows.length;
    catalog[`${name}_sha256`] = createHash('sha256').update(JSON.stringify([...rows].sort((a, b) => String((a as { id: string }).id).localeCompare(String((b as { id: string }).id))))).digest('hex');
  }
  const d16Report = JSON.parse(await readFile(join(ROOT, 'docs/data/d16/import-report.json'), 'utf8')) as { existingCatalog: { after: Record<string, string | number> } };
  const checks = {
    noGenerationOrModelYearRows: allAttrs.filter((a) => a.attribute === 'generation' || a.attribute === 'model_year').length === 0,
    trimOnlyWhereD12Exact: allAttrs.filter((a) => a.attribute === 'trim').every((a) => a.status === 'EXACT' && D12_EXACT_TRIM_RANKS.has(details.find((d) => d.vehicle.id === a.vehicle_id)!.vehicle.d1_rank ?? -1)),
    noCommercialAttributeObserved: allAttrs.filter((a) => a.kind === 'COMMERCIAL').every((a) => a.status !== 'OBSERVED'),
    noModelPropagation: vehicles.every((v) => v.rowsCitingAnotherKey === 0),
    onlyOfficialSources: [...allObs.map((o) => o.source_code), ...allAttrs.map((a) => a.source_code)].every((s) => OFFICIAL_SOURCES.has(s)) && hosts.every((h) => OFFICIAL_HOSTS.has(h)),
    noResearchDataset: ![...allObs.map((o) => `${o.source_record} ${o.value.source_url} ${o.value.notes ?? ''}`), ...allAttrs.map((a) => `${a.source_record} ${a.evidence}`), ...srcRows.filter((s) => usedSourceIds.includes(s.id)).map((s) => `${s.name} ${s.base_url}`)].some((t) => RESEARCH_MARKERS.test(t)),
    noPriceInCuratedLayer: allObs.every((o) => !/price|precio/i.test(o.value.spec_key)),
    noDeniedOrSecondary: allObs.every((o) => o.rights_status !== 'DENIED' && o.value.source_authority !== 'SECONDARY_REFERENCE'),
    conflictsPreserved: allObs.filter((o) => o.conflict_status === 'IN_CONFLICT').every((o) => !!o.conflict_group),
    selectableCatalogUnchangedSinceD16: JSON.stringify(catalog) === JSON.stringify(d16Report.existingCatalog.after),
    curatedIdsNotReferenceVariants: (await db.select({ id: tables.referenceVariants.id }).from(tables.referenceVariants)).every((r) => !details.some((d) => d.vehicle.id === r.id)),
  };
  const conflicts = vehicles.flatMap((v) => v.openConflicts);
  const summary = {
    step: 'D1.6a',
    database: dbName,
    vehicles: vehicles.length,
    observations: allObs.length,
    bySource: Object.fromEntries([...new Set(allObs.map((o) => o.source_code))].sort().map((s) => [s, allObs.filter((o) => o.source_code === s).length])),
    usable: allObs.filter((o) => o.quality_status === 'USABLE').length,
    notUsable: allObs.filter((o) => o.quality_status === 'NOT_USABLE').length,
    usableByRights: Object.fromEntries(['APPROVED', 'CONDITIONAL', 'PENDING'].map((r) => [r, allObs.filter((o) => o.quality_status === 'USABLE' && o.rights_status === r).length])),
    attributes: allAttrs.length,
    attributesByKind: { TECHNICAL: allAttrs.filter((a) => a.kind === 'TECHNICAL').length, COMMERCIAL: allAttrs.filter((a) => a.kind === 'COMMERCIAL').length },
    conflictingValues: allObs.filter((o) => o.conflict_status === 'IN_CONFLICT').length,
    vehiclesWithConflicts: vehicles.filter((v) => v.openConflicts.length).map((v) => v.candidateRank),
    conflictGroups: conflicts.length,
    sourceHosts: hosts,
    importRuns: runs.map((r) => ({ batch: r.batch_key, status: r.status, startedAt: r.started_at })).sort((a, b) => String(a.startedAt).localeCompare(String(b.startedAt))),
    selectableCatalog: { referenceVariants: catalog.reference_variants_rows },
    checks,
    allChecksPass: Object.values(checks).every(Boolean),
  };
  await mkdir(dirname(join(ROOT, args.out!)), { recursive: true });
  await writeFile(join(ROOT, args.out!), `${JSON.stringify({ summary, conflicts, vehicles }, null, 2)}\n`);
  console.log(JSON.stringify(summary, null, 2));
  if (!summary.allChecksPass) process.exitCode = 1;
} finally {
  await handle.close();
}
