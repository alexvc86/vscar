import {
  bigint,
  boolean,
  char,
  date,
  datetime,
  double,
  index,
  int,
  json,
  mysqlEnum,
  mysqlTable,
  smallint,
  text,
  timestamp,
  tinyint,
  uniqueIndex,
  varchar,
} from 'drizzle-orm/mysql-core';

/**
 * Schema MySQL 8 de VScar (Alpha) — SpecKey Catalog v0.2, ADR-002 (MySQL), ADR-007 (identidad).
 * Convenciones: UUID CHAR(36); fechas DATE en modo string (YYYY-MM-DD); JSON nativo; enums como VARCHAR
 * validados por Zod en la capa de dominio (no ENUM de MySQL: el catálogo evoluciona por PR).
 *
 * Identidad comercial desnormalizada en `reference_variants` en esta iteración; la normalización
 * (manufacturers/models/generations/facelifts) llega con la herramienta de curación.
 */

const uuid = (name: string) => char(name, { length: 36 });
const isoDate = (name: string) => date(name, { mode: 'string' });
const url = (name: string) => varchar(name, { length: 2048 });
const createdAt = () => timestamp('created_at', { mode: 'string' }).defaultNow().notNull();

export const sources = mysqlTable('sources', {
  id: uuid('id').primaryKey(),
  code: varchar('code', { length: 16 }).notNull(),
  name: varchar('name', { length: 255 }).notNull(),
  source_authority: varchar('source_authority', { length: 32 }).notNull(),
  market_code: char('market_code', { length: 2 }).notNull(),
  base_url: url('base_url'),
  notes: text('notes'),
  created_at: createdAt(),
});

export const homologations = mysqlTable(
  'homologations',
  {
    id: uuid('id').primaryKey(),
    market_code: char('market_code', { length: 2 }).notNull(),
    type_approval_number: varchar('type_approval_number', { length: 64 }),
    variant_code: varchar('variant_code', { length: 64 }),
    version_code: varchar('version_code', { length: 128 }),
    manufacturer_type_code: varchar('manufacturer_type_code', { length: 128 }),
    valid_from: isoDate('valid_from').notNull(),
    valid_to: isoDate('valid_to'),
    test_cycle: varchar('test_cycle', { length: 24 }).notNull(),
    emissions_standard_family: varchar('emissions_standard_family', { length: 16 }).notNull(),
    emissions_standard_level: varchar('emissions_standard_level', { length: 16 }),
    emissions_standard_raw: varchar('emissions_standard_raw', { length: 64 }),
    homologation_powertrain: varchar('homologation_powertrain', { length: 16 }).notNull(),
    identification_confidence: varchar('identification_confidence', { length: 16 }).notNull(),
    source_id: uuid('source_id').notNull().references(() => sources.id),
    source_url: url('source_url').notNull(),
    notes: text('notes'),
    created_at: createdAt(),
  },
  (t) => [index('homologations_eu_ids').on(t.type_approval_number, t.variant_code, t.version_code)],
);

export const referenceVariants = mysqlTable(
  'reference_variants',
  {
    id: uuid('id').primaryKey(),
    market_code: char('market_code', { length: 2 }).notNull(),
    commercial_group_key: varchar('commercial_group_key', { length: 255 }).notNull(),
    canonical_key: varchar('canonical_key', { length: 255 }).notNull(),
    slug: varchar('slug', { length: 255 }).notNull(),
    // commercial identity
    manufacturer: varchar('manufacturer', { length: 64 }).notNull(),
    model: varchar('model', { length: 64 }).notNull(),
    generation_code: varchar('generation_code', { length: 32 }).notNull(),
    facelift: varchar('facelift', { length: 32 }),
    trim_name: varchar('trim_name', { length: 128 }).notNull(),
    commercial_name: varchar('commercial_name', { length: 255 }).notNull(),
    model_year: smallint('model_year').notNull(),
    body_type: varchar('body_type', { length: 16 }).notNull(),
    sales_start: isoDate('sales_start'),
    sales_end: isoDate('sales_end'),
    price_list_date: isoDate('price_list_date'),
    // technical fields
    powertrain_type: varchar('powertrain_type', { length: 8 }).notNull(),
    fuel_type: varchar('fuel_type', { length: 16 }),
    drivetrain: varchar('drivetrain', { length: 8 }).notNull(),
    transmission: varchar('transmission', { length: 16 }).notNull(),
    gears: varchar('gears', { length: 16 }),
    seats: tinyint('seats'),
    doors: tinyint('doors'),
    // technical identity (ADR-007): una homologación pertenece a una sola variant técnica
    homologation_id: uuid('homologation_id').notNull().references(() => homologations.id),
    status: varchar('status', { length: 16 }).notNull(),
    notes: text('notes'),
    created_at: createdAt(),
  },
  (t) => [
    uniqueIndex('reference_variants_canonical_key').on(t.canonical_key),
    uniqueIndex('reference_variants_homologation').on(t.homologation_id),
    uniqueIndex('reference_variants_market_slug_year').on(t.market_code, t.slug, t.model_year),
    index('reference_variants_group').on(t.commercial_group_key),
    index('reference_variants_search').on(t.market_code, t.manufacturer, t.model, t.model_year),
  ],
);

/** Raw ingest (Plan §33.1): metadatos del fichero bruto; el contenido vive en C:scar\data
aw\. */
export const rawIngest = mysqlTable(
  'raw_ingest',
  {
    id: uuid('id').primaryKey(),
    source_id: uuid('source_id').notNull().references(() => sources.id),
    source_code: varchar('source_code', { length: 16 }).notNull(),
    external_id: varchar('external_id', { length: 64 }).notNull(),
    query_hash: char('query_hash', { length: 64 }),
    dataset_year: smallint('dataset_year'),
    dataset_status: varchar('dataset_status', { length: 16 }),
    source_table: varchar('source_table', { length: 128 }),
    registry_version: varchar('registry_version', { length: 32 }),
    adapter_version: varchar('adapter_version', { length: 32 }),
    transformation_version: int('transformation_version'),
    original_filename: varchar('original_filename', { length: 255 }).notNull(),
    file_path: varchar('file_path', { length: 1024 }).notNull(),
    payload_hash: char('payload_hash', { length: 64 }).notNull(),
    row_count: int('row_count').notNull(),
    request: json('request').notNull(),
    import_status: varchar('import_status', { length: 16 }).notNull(),
    retrieved_at: isoDate('retrieved_at').notNull(),
    imported_at: timestamp('imported_at', { mode: 'string' }),
    error: text('error'),
    created_at: createdAt(),
  },
  (t) => [uniqueIndex('raw_ingest_payload_hash').on(t.payload_hash)],
);

/** SourcedValue v0.2 (append-only). */
export const specValues = mysqlTable(
  'spec_values',
  {
    id: uuid('id').primaryKey(),
    variant_id: uuid('variant_id').notNull().references(() => referenceVariants.id),
    spec_key: varchar('spec_key', { length: 64 }).notNull(),
    value_kind: varchar('value_kind', { length: 8 }),
    value_num: double('value_num'),
    value_text: text('value_text'),
    value_bool: boolean('value_bool'),
    value_min: double('value_min'),
    value_max: double('value_max'),
    range_basis: varchar('range_basis', { length: 24 }),
    unit: varchar('unit', { length: 16 }),
    source_id: uuid('source_id').notNull().references(() => sources.id),
    source_url: url('source_url').notNull(),
    source_market: char('source_market', { length: 2 }).notNull(),
    reference_market: char('reference_market', { length: 2 }).notNull(),
    archived: boolean('archived').notNull(),
    archive_url: url('archive_url'),
    original_url: url('original_url'),
    source_authority: varchar('source_authority', { length: 32 }).notNull(),
    mapping_confidence: varchar('mapping_confidence', { length: 40 }).notNull(),
    homologation_match: varchar('homologation_match', { length: 16 }).notNull(),
    retrieved_at: isoDate('retrieved_at').notNull(),
    valid_from: isoDate('valid_from'),
    valid_to: isoDate('valid_to'),
    test_cycle: varchar('test_cycle', { length: 24 }),
    test_cycle_inferred: varchar('test_cycle_inferred', { length: 24 }),
    cycle_evidence: text('cycle_evidence'),
    status: varchar('status', { length: 16 }).notNull(),
    provisional: boolean('provisional').notNull(),
    measurement_basis: json('measurement_basis'),
    external_field: varchar('external_field', { length: 128 }),
    transformation: varchar('transformation', { length: 24 }),
    transformation_version: int('transformation_version'),
    raw_ingest_id: uuid('raw_ingest_id').references(() => rawIngest.id),
    notes: text('notes'),
    created_at: createdAt(),
  },
  (t) => [index('spec_values_variant_key').on(t.variant_id, t.spec_key), index('spec_values_source').on(t.source_id)],
);

export const vehiclePrices = mysqlTable(
  'vehicle_prices',
  {
    id: uuid('id').primaryKey(),
    variant_id: uuid('variant_id').notNull().references(() => referenceVariants.id),
    price_type: varchar('price_type', { length: 16 }).notNull(),
    price_basis: varchar('price_basis', { length: 16 }).notNull(),
    amount_minor: bigint('amount_minor', { mode: 'number' }).notNull(),
    currency: char('currency', { length: 3 }).notNull(),
    incl_taxes: varchar('incl_taxes', { length: 8 }).notNull(),
    region: varchar('region', { length: 32 }).notNull(),
    valid_from: isoDate('valid_from'),
    valid_to: isoDate('valid_to'),
    price_list_date: isoDate('price_list_date'),
    source_id: uuid('source_id').notNull().references(() => sources.id),
    source_url: url('source_url').notNull(),
    source_authority: varchar('source_authority', { length: 32 }).notNull(),
    archived: boolean('archived').notNull(),
    archive_url: url('archive_url'),
    original_url: url('original_url'),
    notes: text('notes'),
    created_at: createdAt(),
  },
  (t) => [index('vehicle_prices_variant').on(t.variant_id)],
);

export const incentives = mysqlTable('incentives', {
  id: uuid('id').primaryKey(),
  market_code: char('market_code', { length: 2 }).notNull(),
  region: varchar('region', { length: 32 }).notNull(),
  program: varchar('program', { length: 64 }).notNull(),
  amount_minor: bigint('amount_minor', { mode: 'number' }),
  currency: char('currency', { length: 3 }),
  rule: text('rule'),
  eligibility: text('eligibility'),
  applies_to_variant_ids: json('applies_to_variant_ids').notNull(),
  valid_from: isoDate('valid_from'),
  valid_to: isoDate('valid_to'),
  source_id: uuid('source_id').notNull().references(() => sources.id),
  source_url: url('source_url').notNull(),
  created_at: createdAt(),
});

export const safetyRatings = mysqlTable(
  'safety_ratings',
  {
    id: uuid('id').primaryKey(),
    variant_id: uuid('variant_id').notNull().references(() => referenceVariants.id),
    authority: varchar('authority', { length: 16 }).notNull(),
    rating_status: varchar('rating_status', { length: 16 }).notNull(),
    stars: tinyint('stars'),
    adult_pct: tinyint('adult_pct'),
    child_pct: tinyint('child_pct'),
    vru_pct: tinyint('vru_pct'),
    assist_pct: tinyint('assist_pct'),
    protocol_version: varchar('protocol_version', { length: 64 }),
    tested_year: smallint('tested_year'),
    rating_valid_from: isoDate('rating_valid_from'),
    rating_valid_to: isoDate('rating_valid_to'),
    tested_powertrain: varchar('tested_powertrain', { length: 128 }),
    tested_variant_note: text('tested_variant_note'),
    mapping_confidence: varchar('mapping_confidence', { length: 40 }).notNull(),
    source_id: uuid('source_id').notNull().references(() => sources.id),
    source_url: url('source_url').notNull(),
    archived: boolean('archived').notNull(),
    archive_url: url('archive_url'),
    original_url: url('original_url'),
    created_at: createdAt(),
  },
  (t) => [index('safety_ratings_variant').on(t.variant_id)],
);

/**
 * Cola de jobs (Plan §35, Step 4d): sin broker externo. Lock atómico con SELECT … FOR UPDATE SKIP LOCKED.
 * PENDING → RUNNING → SUCCESS | FAILED (reintento programado en run_at) | DEAD (agotado o no reintentable).
 */
export const JOB_STATUSES = ['PENDING', 'RUNNING', 'SUCCESS', 'FAILED', 'DEAD'] as const;
const dt = (name: string) => datetime(name, { mode: 'string', fsp: 3 });

export const jobs = mysqlTable(
  'jobs',
  {
    id: uuid('id').primaryKey(),
    type: varchar('type', { length: 64 }).notNull(),
    payload: json('payload').notNull(),
    status: mysqlEnum('status', JOB_STATUSES).notNull(),
    attempts: int('attempts').notNull().default(0),
    max_attempts: int('max_attempts').notNull(),
    run_at: dt('run_at').notNull(),
    locked_at: dt('locked_at'),
    locked_by: varchar('locked_by', { length: 128 }),
    claim_token: char('claim_token', { length: 36 }),
    heartbeat_at: dt('heartbeat_at'),
    started_at: dt('started_at'),
    finished_at: dt('finished_at'),
    last_error: text('last_error'),
    result: json('result'),
    idempotency_key: varchar('idempotency_key', { length: 191 }),
    created_at: dt('created_at').notNull(),
    updated_at: dt('updated_at').notNull(),
  },
  (t) => [uniqueIndex('jobs_idempotency_key').on(t.idempotency_key), index('jobs_ready').on(t.status, t.run_at)],
);

/**
 * Precios de energía normalizados (Step 4e, `EnergyPriceObservation`). Append-only: una revisión de la fuente
 * (otro payload) crea filas nuevas; el consumidor elige la más reciente por `retrieved_at`.
 */
export const energyPrices = mysqlTable(
  'energy_prices',
  {
    id: uuid('id').primaryKey(),
    market_code: char('market_code', { length: 2 }).notNull(),
    energy_product: varchar('energy_product', { length: 32 }).notNull(),
    /** Existing rows (MITECO, 4e) predate the column: surtidor = RETAIL_PUMP_PRICE. */
    price_basis: varchar('price_basis', { length: 32 }).notNull().default('RETAIL_PUMP_PRICE'),
    scope_type: varchar('scope_type', { length: 16 }).notNull(),
    scope_code: varchar('scope_code', { length: 32 }).notNull(),
    price_date: isoDate('price_date').notNull(),
    observed_at: datetime('observed_at', { mode: 'string' }).notNull(),
    source_timezone: varchar('source_timezone', { length: 64 }).notNull(),
    statistic: varchar('statistic', { length: 16 }).notNull(),
    value: double('value').notNull(),
    unit: varchar('unit', { length: 16 }).notNull(),
    currency: char('currency', { length: 3 }).notNull(),
    taxes: varchar('taxes', { length: 16 }).notNull(),
    aggregation_method: varchar('aggregation_method', { length: 40 }).notNull(),
    distribution: json('distribution').notNull(),
    source_authority: varchar('source_authority', { length: 32 }).notNull(),
    derived_from_authority: varchar('derived_from_authority', { length: 32 }).notNull(),
    source_id: uuid('source_id').notNull().references(() => sources.id),
    source_url: url('source_url').notNull(),
    provisional: boolean('provisional').notNull(),
    retrieved_at: isoDate('retrieved_at').notNull(),
    raw_ingest_id: uuid('raw_ingest_id').notNull().references(() => rawIngest.id),
    external_field: varchar('external_field', { length: 128 }).notNull(),
    adapter_version: varchar('adapter_version', { length: 32 }).notNull(),
    transformation_version: int('transformation_version').notNull(),
    created_at: createdAt(),
  },
  (t) => [index('energy_prices_lookup').on(t.market_code, t.energy_product, t.scope_type, t.scope_code, t.price_date)],
);
