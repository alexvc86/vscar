import { z } from 'zod';
import {
  CurationStatus,
  EU_MARKETS,
  HomologationMatch,
  IsoDate,
  MappingConfidence,
  MarketCode,
  RangeBasis,
  ReferenceMarket,
  SourceAuthority,
  TestCycle,
  Transformation,
  Uuid,
} from './enums.ts';
import { MeasurementBasis, type MeasurementBasisField } from './measurement-basis.ts';
import { getSpecKeyDefinition, type SpecKeyDefinition } from './spec-keys.ts';

/**
 * SourcedValue v0.2 (Catalog v0.2 §3) ligado a una SpecKey de una ReferenceVariant técnica.
 * Los campos opcionales se omiten (no `null`) para que el round-trip con MySQL sea exacto.
 */
const SpecValueObject = z
  .object({
    id: Uuid,
    variant_id: Uuid,
    spec_key: z.string(),

    // Valor: punto o rango (D4: nunca se colapsa un rango)
    value: z.union([z.number(), z.string(), z.boolean()]).optional(),
    value_min: z.number().optional(),
    value_max: z.number().optional(),
    range_basis: RangeBasis.optional(),
    unit: z.string().nullable(),

    // Fuente
    source_id: Uuid,
    source_url: z.string().url(),
    source_market: MarketCode,
    reference_market: ReferenceMarket,
    archived: z.boolean().default(false),
    archive_url: z.string().url().optional(),
    original_url: z.string().url().optional(),

    // Calidad (dimensiones independientes)
    source_authority: SourceAuthority,
    mapping_confidence: MappingConfidence,
    homologation_match: HomologationMatch,

    // Tiempo
    retrieved_at: IsoDate,
    valid_from: IsoDate.optional(),
    valid_to: IsoDate.optional(),

    // Ciclo
    test_cycle: TestCycle.optional(),
    test_cycle_inferred: TestCycle.exclude(['UNDECLARED']).optional(),
    cycle_evidence: z.string().min(1).optional(),

    // Estado
    status: CurationStatus.default('DRAFT'),
    provisional: z.boolean().default(false),

    measurement_basis: MeasurementBasis.optional(),

    // Trazabilidad de adapter (DATA_RIGHTS_MATRIX §4)
    external_field: z.string().optional(),
    transformation: Transformation.optional(),
    transformation_version: z.number().int().positive().optional(),
    /** Fichero bruto del que procede el valor (Plan §33.1: Source → Raw ingest → Dataset). */
    raw_ingest_id: Uuid.optional(),

    notes: z.string().optional(),
  })
  .strict();

export interface SpecValueIssue {
  path: string;
  message: string;
}

/** Reglas independientes de la SpecKey. */
export function genericSpecValueIssues(v: z.infer<typeof SpecValueObject>): SpecValueIssue[] {
  const issues: SpecValueIssue[] = [];
  const hasPoint = v.value !== undefined;
  const hasMin = v.value_min !== undefined;
  const hasMax = v.value_max !== undefined;

  if (hasPoint === (hasMin || hasMax)) {
    issues.push({ path: 'value', message: 'exactly one of `value` or (`value_min`,`value_max`) is required' });
  }
  if (hasMin !== hasMax) {
    issues.push({ path: 'value_min', message: 'ranges need both `value_min` and `value_max`' });
  }
  if ((hasMin || hasMax) && v.range_basis === undefined) {
    issues.push({ path: 'range_basis', message: 'ranges need `range_basis`' });
  }
  if (v.archived && (v.archive_url === undefined || v.original_url === undefined)) {
    issues.push({ path: 'archive_url', message: 'archived values need `archive_url` and `original_url`' });
  }
  if (v.test_cycle_inferred !== undefined && v.test_cycle !== 'UNDECLARED') {
    issues.push({ path: 'test_cycle_inferred', message: '`test_cycle_inferred` only allowed when `test_cycle` is UNDECLARED' });
  }
  if (v.test_cycle_inferred !== undefined && v.cycle_evidence === undefined) {
    issues.push({ path: 'cycle_evidence', message: 'an inferred cycle needs `cycle_evidence`' });
  }

  const crossMarket = v.source_market !== v.reference_market;
  if (crossMarket && v.homologation_match === 'NOT_APPLICABLE') {
    issues.push({ path: 'homologation_match', message: 'cross-market values need EXACT, PARTIAL or UNCONFIRMED' });
  }
  if (!crossMarket && v.homologation_match !== 'NOT_APPLICABLE') {
    issues.push({ path: 'homologation_match', message: 'same-market values must use NOT_APPLICABLE' });
  }
  if (crossMarket && !(EU_MARKETS.has(v.source_market) && EU_MARKETS.has(v.reference_market))) {
    issues.push({ path: 'source_market', message: 'cross-market reuse is only allowed between EU markets (D1)' });
  }
  if (v.mapping_confidence === 'CROSS_MARKET_EXACT_HOMOLOGATION' && !(crossMarket && v.homologation_match === 'EXACT')) {
    issues.push({ path: 'mapping_confidence', message: 'CROSS_MARKET_EXACT_HOMOLOGATION requires a cross-market EXACT homologation match' });
  }
  if (v.valid_from !== undefined && v.valid_to !== undefined && v.valid_from > v.valid_to) {
    issues.push({ path: 'valid_to', message: '`valid_from` must be <= `valid_to`' });
  }
  return issues;
}

/** Reglas que dependen de la definición de la SpecKey (Catalog v0.2 §7). */
export function definitionIssues(v: z.infer<typeof SpecValueObject>, def: SpecKeyDefinition): SpecValueIssue[] {
  const issues: SpecValueIssue[] = [];
  const numeric = def.dataType === 'int' || def.dataType === 'decimal';

  if (v.unit !== def.unit) {
    issues.push({ path: 'unit', message: `unit must be ${def.unit ?? 'null'} for ${def.key}` });
  }
  if (!numeric && (v.value_min !== undefined || v.value_max !== undefined)) {
    issues.push({ path: 'value_min', message: `${def.key} is not numeric: ranges not allowed` });
  }
  if (v.value !== undefined) {
    if (numeric && typeof v.value !== 'number') issues.push({ path: 'value', message: `${def.key} expects a number` });
    if (def.dataType === 'int' && typeof v.value === 'number' && !Number.isInteger(v.value)) {
      issues.push({ path: 'value', message: `${def.key} expects an integer` });
    }
    if ((def.dataType === 'text' || def.dataType === 'json') && typeof v.value !== 'string') {
      issues.push({ path: 'value', message: `${def.key} expects a string` });
    }
    if (def.dataType === 'enum' && !(typeof v.value === 'string' && def.enumValues?.includes(v.value))) {
      issues.push({ path: 'value', message: `${def.key} expects one of ${def.enumValues?.join(', ')}` });
    }
  }
  if (def.cycle && v.test_cycle === undefined) {
    issues.push({ path: 'test_cycle', message: `${def.key} requires test_cycle (use UNDECLARED if the source does not state it)` });
  }
  if (!def.cycle && v.test_cycle !== undefined) {
    issues.push({ path: 'test_cycle', message: `${def.key} does not take a test_cycle` });
  }
  for (const field of def.basis ?? []) {
    if (v.measurement_basis?.[field] === undefined) {
      issues.push({ path: `measurement_basis.${field}`, message: `${def.key} requires ${field} (UNSPECIFIED allowed)` });
    }
  }
  for (const [field, expected] of Object.entries(def.fixedBasis ?? {})) {
    const actual = v.measurement_basis?.[field as MeasurementBasisField];
    if (actual !== undefined && actual !== expected) {
      issues.push({ path: `measurement_basis.${field}`, message: `${def.key} has fixed ${field}=${String(expected)}` });
    }
  }
  if (!def.crossMarket && v.source_market !== v.reference_market) {
    issues.push({ path: 'source_market', message: `${def.key} is a market element: cross-market reuse not allowed (D1)` });
  }
  return issues;
}

export const SpecValue = SpecValueObject.superRefine((v, ctx) => {
  const def = getSpecKeyDefinition(v.spec_key);
  const issues = genericSpecValueIssues(v);
  if (!def) {
    issues.push({ path: 'spec_key', message: `unknown SpecKey ${v.spec_key}` });
  } else {
    issues.push(...definitionIssues(v, def));
  }
  for (const issue of issues) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: issue.path.split('.'), message: issue.message });
  }
});

export type SpecValue = z.infer<typeof SpecValue>;
export type SpecValueInput = z.input<typeof SpecValue>;

export function isRange(v: SpecValue): boolean {
  return v.value_min !== undefined && v.value_max !== undefined;
}

export function isCrossMarket(v: Pick<SpecValue, 'source_market' | 'reference_market'>): boolean {
  return v.source_market !== v.reference_market;
}

/** ¿El valor está vigente en la fecha dada? Sin fecha → siempre vigente. */
export function isValidAt(v: { valid_from?: string | undefined; valid_to?: string | undefined }, date: string | undefined): boolean {
  if (date === undefined) return true;
  if (v.valid_from !== undefined && date < v.valid_from) return false;
  if (v.valid_to !== undefined && date > v.valid_to) return false;
  return true;
}

/**
 * Presentación del ciclo: un ciclo inferido nunca se muestra como declarado (Catalog v0.2 §3.4).
 */
export function displayCycle(v: Pick<SpecValue, 'test_cycle' | 'test_cycle_inferred'>): {
  cycle: string | undefined;
  declared: boolean;
  label: string | undefined;
} {
  if (v.test_cycle === undefined) return { cycle: undefined, declared: false, label: undefined };
  if (v.test_cycle === 'UNDECLARED') {
    return {
      cycle: v.test_cycle_inferred,
      declared: false,
      label: v.test_cycle_inferred ? `ciclo no declarado (probablemente ${v.test_cycle_inferred})` : 'ciclo no declarado',
    };
  }
  return { cycle: v.test_cycle, declared: true, label: v.test_cycle };
}
