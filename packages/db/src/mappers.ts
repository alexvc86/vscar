import type {
  Homologation,
  Incentive,
  ReferenceVariant,
  SafetyRating,
  Source,
  SpecValue,
  VehiclePrice,
} from '@vscar/vehicle-schema';
import type * as t from './schema.ts';

type Row<T extends { $inferSelect: unknown }> = T['$inferSelect'];
type Insert<T extends { $inferInsert: unknown }> = T['$inferInsert'];

/** El dominio omite los opcionales; MySQL usa NULL. */
function compact<T extends Record<string, unknown>>(obj: T): { [K in keyof T]: Exclude<T[K], null> } {
  return Object.fromEntries(Object.entries(obj).filter(([, v]) => v !== null && v !== undefined)) as never;
}
const nul = <T>(v: T | undefined): T | null => (v === undefined ? null : v);

// ---------------------------------------------------------------------------
// Domain → rows
// ---------------------------------------------------------------------------

export function sourceToRow(s: Source): Insert<typeof t.sources> {
  return { ...s, base_url: nul(s.base_url), notes: nul(s.notes) };
}

export function homologationToRow(h: Homologation): Insert<typeof t.homologations> {
  return {
    id: h.id,
    market_code: h.market_code,
    type_approval_number: nul(h.type_approval_number),
    variant_code: nul(h.variant_code),
    version_code: nul(h.version_code),
    manufacturer_type_code: nul(h.manufacturer_type_code),
    valid_from: h.valid_from,
    valid_to: nul(h.valid_to),
    test_cycle: h.test_cycle,
    emissions_standard_family: h.emissions_standard_family,
    emissions_standard_level: nul(h.emissions_standard_level),
    emissions_standard_raw: nul(h.emissions_standard_raw),
    homologation_powertrain: h.homologation_powertrain,
    identification_confidence: h.identification_confidence,
    source_id: h.source_id,
    source_url: h.source_url,
    notes: nul(h.notes),
  };
}

export function variantToRow(v: ReferenceVariant): Insert<typeof t.referenceVariants> {
  const c = v.commercial;
  const x = v.technical;
  return {
    id: v.id,
    market_code: v.market_code,
    commercial_group_key: v.commercial_group_key,
    canonical_key: v.canonical_key,
    slug: v.slug,
    manufacturer: c.manufacturer,
    model: c.model,
    generation_code: c.generation_code,
    facelift: nul(c.facelift),
    trim_name: c.trim_name,
    commercial_name: c.commercial_name,
    model_year: c.model_year,
    body_type: c.body_type,
    sales_start: nul(c.sales_start),
    sales_end: nul(c.sales_end),
    price_list_date: nul(c.price_list_date),
    powertrain_type: x.powertrain_type,
    fuel_type: nul(x.fuel_type),
    drivetrain: x.drivetrain,
    transmission: x.transmission,
    gears: x.gears === undefined ? null : String(x.gears),
    seats: nul(x.seats),
    doors: nul(x.doors),
    homologation_id: v.homologation_id,
    status: v.status,
    notes: nul(v.notes),
  };
}

export function specValueToRow(v: SpecValue): Insert<typeof t.specValues> {
  const kind = v.value === undefined ? null : typeof v.value === 'number' ? 'number' : typeof v.value === 'boolean' ? 'boolean' : 'string';
  return {
    id: v.id,
    variant_id: v.variant_id,
    spec_key: v.spec_key,
    value_kind: kind,
    value_num: kind === 'number' ? (v.value as number) : null,
    value_text: kind === 'string' ? (v.value as string) : null,
    value_bool: kind === 'boolean' ? (v.value as boolean) : null,
    value_min: nul(v.value_min),
    value_max: nul(v.value_max),
    range_basis: nul(v.range_basis),
    unit: v.unit,
    source_id: v.source_id,
    source_url: v.source_url,
    source_market: v.source_market,
    reference_market: v.reference_market,
    archived: v.archived,
    archive_url: nul(v.archive_url),
    original_url: nul(v.original_url),
    source_authority: v.source_authority,
    mapping_confidence: v.mapping_confidence,
    homologation_match: v.homologation_match,
    retrieved_at: v.retrieved_at,
    valid_from: nul(v.valid_from),
    valid_to: nul(v.valid_to),
    test_cycle: nul(v.test_cycle),
    test_cycle_inferred: nul(v.test_cycle_inferred),
    cycle_evidence: nul(v.cycle_evidence),
    status: v.status,
    provisional: v.provisional,
    measurement_basis: v.measurement_basis ?? null,
    external_field: nul(v.external_field),
    transformation: nul(v.transformation),
    transformation_version: nul(v.transformation_version),
    raw_ingest_id: nul(v.raw_ingest_id),
    notes: nul(v.notes),
  };
}

export function priceToRow(p: VehiclePrice): Insert<typeof t.vehiclePrices> {
  return {
    ...p,
    valid_from: nul(p.valid_from),
    valid_to: nul(p.valid_to),
    price_list_date: nul(p.price_list_date),
    archive_url: nul(p.archive_url),
    original_url: nul(p.original_url),
    notes: nul(p.notes),
  };
}

export function incentiveToRow(i: Incentive): Insert<typeof t.incentives> {
  return {
    ...i,
    amount_minor: nul(i.amount_minor),
    currency: nul(i.currency),
    rule: nul(i.rule),
    eligibility: nul(i.eligibility),
    valid_from: nul(i.valid_from),
    valid_to: nul(i.valid_to),
  };
}

export function safetyToRow(r: SafetyRating): Insert<typeof t.safetyRatings> {
  return {
    ...r,
    stars: nul(r.stars),
    adult_pct: nul(r.adult_pct),
    child_pct: nul(r.child_pct),
    vru_pct: nul(r.vru_pct),
    assist_pct: nul(r.assist_pct),
    protocol_version: nul(r.protocol_version),
    tested_year: nul(r.tested_year),
    rating_valid_from: nul(r.rating_valid_from),
    rating_valid_to: nul(r.rating_valid_to),
    tested_powertrain: nul(r.tested_powertrain),
    tested_variant_note: nul(r.tested_variant_note),
    archive_url: nul(r.archive_url),
    original_url: nul(r.original_url),
  };
}

// ---------------------------------------------------------------------------
// Rows → domain input (validado después con Zod en el repositorio)
// ---------------------------------------------------------------------------

const withoutCreatedAt = <T extends { created_at?: unknown }>(row: T): Omit<T, 'created_at'> => {
  const { created_at: _createdAt, ...rest } = row;
  return rest;
};

export function sourceFromRow(row: Row<typeof t.sources>): unknown {
  return compact(withoutCreatedAt(row));
}

export function homologationFromRow(row: Row<typeof t.homologations>): unknown {
  return compact(withoutCreatedAt(row));
}

export function variantFromRow(row: Row<typeof t.referenceVariants>): unknown {
  return compact({
    id: row.id,
    market_code: row.market_code,
    commercial_group_key: row.commercial_group_key,
    canonical_key: row.canonical_key,
    slug: row.slug,
    commercial: compact({
      manufacturer: row.manufacturer,
      model: row.model,
      generation_code: row.generation_code,
      facelift: row.facelift,
      trim_name: row.trim_name,
      commercial_name: row.commercial_name,
      model_year: row.model_year,
      body_type: row.body_type,
      sales_start: row.sales_start,
      sales_end: row.sales_end,
      price_list_date: row.price_list_date,
    }),
    technical: compact({
      powertrain_type: row.powertrain_type,
      fuel_type: row.fuel_type,
      drivetrain: row.drivetrain,
      transmission: row.transmission,
      gears: row.gears === null ? null : row.gears === 'not_applicable' ? 'not_applicable' : Number(row.gears),
      seats: row.seats,
      doors: row.doors,
    }),
    homologation_id: row.homologation_id,
    status: row.status,
    notes: row.notes,
  });
}

export function specValueFromRow(row: Row<typeof t.specValues>): unknown {
  const { value_kind, value_num, value_text, value_bool, ...rest } = withoutCreatedAt(row);
  const value = value_kind === 'number' ? value_num : value_kind === 'string' ? value_text : value_kind === 'boolean' ? value_bool : null;
  // `unit` es nullable en el dominio (claves enum/texto): NULL no significa "ausente".
  return { ...compact({ ...rest, value }), unit: rest.unit };
}

export function priceFromRow(row: Row<typeof t.vehiclePrices>): unknown {
  return compact(withoutCreatedAt(row));
}

export function incentiveFromRow(row: Row<typeof t.incentives>): unknown {
  return compact(withoutCreatedAt(row));
}

export function safetyFromRow(row: Row<typeof t.safetyRatings>): unknown {
  return compact(withoutCreatedAt(row));
}

