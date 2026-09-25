import { z } from 'zod';
import {
  BodyType,
  Drivetrain,
  EmissionsStandardFamily,
  EmissionsStandardLevel,
  FuelType,
  HomologationPowertrain,
  IdentificationConfidence,
  IsoDate,
  PowertrainType,
  ReferenceMarket,
  TestCycle,
  Transmission,
  Uuid,
} from './enums.ts';

/**
 * Technical identity (ADR-007, Catalog v0.2 §2.2): una homologación concreta con periodo de validez.
 */
export const Homologation = z
  .object({
    id: Uuid,
    market_code: ReferenceMarket,
    type_approval_number: z.string().min(1).optional(),
    variant_code: z.string().min(1).optional(),
    version_code: z.string().min(1).optional(),
    /** Identificador equivalente del fabricante/homologador cuando no hay TAN/Va/Ve. */
    manufacturer_type_code: z.string().min(1).optional(),
    valid_from: IsoDate,
    valid_to: IsoDate.optional(),
    test_cycle: TestCycle,
    emissions_standard_family: EmissionsStandardFamily,
    emissions_standard_level: EmissionsStandardLevel.optional(),
    emissions_standard_raw: z.string().optional(),
    homologation_powertrain: HomologationPowertrain,
    identification_confidence: IdentificationConfidence,
    source_id: Uuid,
    source_url: z.string().url(),
    notes: z.string().optional(),
  })
  .strict()
  .superRefine((h, ctx) => {
    const hasEuIds = h.type_approval_number !== undefined || h.variant_code !== undefined || h.version_code !== undefined;
    if (!hasEuIds && h.manufacturer_type_code === undefined && h.identification_confidence !== 'UNCONFIRMED') {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['identification_confidence'],
        message: 'without TAN/Va/Ve or an equivalent code the homologation can only be UNCONFIRMED',
      });
    }
    if (h.valid_to !== undefined && h.valid_from > h.valid_to) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['valid_to'], message: '`valid_from` must be <= `valid_to`' });
    }
  });
export type Homologation = z.infer<typeof Homologation>;
export type HomologationInput = z.input<typeof Homologation>;

/** Commercial identity (Catalog v0.2 §2.1): lo que el usuario ve y busca. */
export const CommercialIdentity = z
  .object({
    manufacturer: z.string().min(1),
    model: z.string().min(1),
    generation_code: z.string().min(1),
    facelift: z.string().min(1).optional(),
    trim_name: z.string().min(1),
    commercial_name: z.string().min(1),
    /** Tal como lo declara la fuente; atributo comercial, no identidad técnica. */
    model_year: z.number().int().min(1990).max(2100),
    body_type: BodyType,
    sales_start: IsoDate.optional(),
    sales_end: IsoDate.optional(),
    price_list_date: IsoDate.optional(),
  })
  .strict();
export type CommercialIdentity = z.infer<typeof CommercialIdentity>;

/** Campos estructurales técnicos (Catalog v0.2 §2.4). */
export const TechnicalFields = z
  .object({
    powertrain_type: PowertrainType,
    fuel_type: FuelType.optional(),
    drivetrain: Drivetrain,
    transmission: Transmission,
    gears: z.union([z.number().int().positive(), z.literal('not_applicable')]).optional(),
    seats: z.number().int().positive().optional(),
    doors: z.number().int().positive().optional(),
  })
  .strict();
export type TechnicalFields = z.infer<typeof TechnicalFields>;

/**
 * ReferenceVariant = commercial identity + technical identity (homologation_id).
 * Varias ReferenceVariants pueden compartir `commercial_group_key` (ADR-007).
 */
export const ReferenceVariant = z
  .object({
    id: Uuid,
    market_code: ReferenceMarket,
    /** Agrupa variants técnicas bajo una misma denominación comercial (UX/SEO). */
    commercial_group_key: z.string().regex(/^[a-z]{2}:[a-z0-9.:-]+$/),
    /** `commercial_group_key` + discriminador de homologación (`:h<short>`). */
    canonical_key: z.string().regex(/^[a-z]{2}:[a-z0-9.:-]+:h[a-z0-9-]+$/),
    slug: z.string().regex(/^[a-z0-9-]+$/),
    commercial: CommercialIdentity,
    technical: TechnicalFields,
    homologation_id: Uuid,
    status: z.enum(['draft', 'published', 'test_fixture']),
    notes: z.string().optional(),
  })
  .strict()
  .superRefine((rv, ctx) => {
    if (!rv.canonical_key.startsWith(`${rv.commercial_group_key}:h`)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['canonical_key'], message: 'canonical_key must extend commercial_group_key with :h<homologation>' });
    }
    if (!rv.commercial_group_key.startsWith(`${rv.market_code.toLowerCase()}:`)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['commercial_group_key'], message: 'commercial_group_key must start with the market code' });
    }
  });
export type ReferenceVariant = z.infer<typeof ReferenceVariant>;
export type ReferenceVariantInput = z.input<typeof ReferenceVariant>;
