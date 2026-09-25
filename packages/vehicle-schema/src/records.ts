import { z } from 'zod';
import {
  InclTaxes,
  IsoDate,
  MappingConfidence,
  MarketCode,
  PriceBasis,
  PriceType,
  RatingAuthority,
  RatingStatus,
  ReferenceMarket,
  SourceAuthority,
  Uuid,
} from './enums.ts';

/** Registro de fuentes (DATA_RIGHTS_MATRIX §2). Los derechos viven en la matriz, no aquí. */
export const Source = z
  .object({
    id: Uuid,
    /** Código de la matriz: S01, S08, S08-EU… */
    code: z.string().regex(/^[SC]\d{2}(-[A-Z]{2})?$/),
    name: z.string().min(1),
    source_authority: SourceAuthority,
    market_code: MarketCode,
    base_url: z.string().url().optional(),
    notes: z.string().optional(),
  })
  .strict();
export type Source = z.infer<typeof Source>;
export type SourceInput = z.input<typeof Source>;

const archiveFields = {
  archived: z.boolean().default(false),
  archive_url: z.string().url().optional(),
  original_url: z.string().url().optional(),
};

function archiveCheck(v: { archived: boolean; archive_url?: string | undefined; original_url?: string | undefined }, ctx: z.RefinementCtx) {
  if (v.archived && (v.archive_url === undefined || v.original_url === undefined)) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['archive_url'], message: 'archived records need `archive_url` and `original_url`' });
  }
}

function validityCheck(v: { valid_from?: string | undefined; valid_to?: string | undefined }, ctx: z.RefinementCtx) {
  if (v.valid_from !== undefined && v.valid_to !== undefined && v.valid_from > v.valid_to) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['valid_to'], message: '`valid_from` must be <= `valid_to`' });
  }
}

/** Precios (Catalog v0.2 §11). `used_asking_price` nunca va aquí; los incentivos van aparte. */
export const VehiclePrice = z
  .object({
    id: Uuid,
    variant_id: Uuid,
    price_type: PriceType,
    price_basis: PriceBasis,
    amount_minor: z.number().int().nonnegative(),
    currency: z.string().regex(/^[A-Z]{3}$/),
    incl_taxes: InclTaxes,
    region: z.string().min(1),
    valid_from: IsoDate.optional(),
    valid_to: IsoDate.optional(),
    price_list_date: IsoDate.optional(),
    source_id: Uuid,
    source_url: z.string().url(),
    source_authority: SourceAuthority,
    ...archiveFields,
    notes: z.string().optional(),
  })
  .strict()
  .superRefine((p, ctx) => {
    archiveCheck(p, ctx);
    validityCheck(p, ctx);
  });
export type VehiclePrice = z.infer<typeof VehiclePrice>;
export type VehiclePriceInput = z.input<typeof VehiclePrice>;

/** Incentivos (MOVES, Plan Auto+, CAE…): nunca restados al precio base guardado. */
export const Incentive = z
  .object({
    id: Uuid,
    market_code: ReferenceMarket,
    region: z.string().min(1),
    program: z.string().min(1),
    amount_minor: z.number().int().nonnegative().optional(),
    currency: z.string().regex(/^[A-Z]{3}$/).optional(),
    rule: z.string().optional(),
    eligibility: z.string().optional(),
    applies_to_variant_ids: z.array(Uuid).default([]),
    valid_from: IsoDate.optional(),
    valid_to: IsoDate.optional(),
    source_id: Uuid,
    source_url: z.string().url(),
  })
  .strict()
  .superRefine((i, ctx) => {
    validityCheck(i, ctx);
    if (i.amount_minor === undefined && i.rule === undefined) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['amount_minor'], message: 'an incentive needs `amount_minor` or `rule`' });
    }
  });
export type Incentive = z.infer<typeof Incentive>;
export type IncentiveInput = z.input<typeof Incentive>;

/** Ratings de seguridad con estado (Catalog v0.2 §12). */
export const SafetyRating = z
  .object({
    id: Uuid,
    variant_id: Uuid,
    authority: RatingAuthority,
    rating_status: RatingStatus,
    stars: z.number().int().min(0).max(5).optional(),
    adult_pct: z.number().int().min(0).max(100).optional(),
    child_pct: z.number().int().min(0).max(100).optional(),
    vru_pct: z.number().int().min(0).max(100).optional(),
    assist_pct: z.number().int().min(0).max(100).optional(),
    protocol_version: z.string().min(1).optional(),
    tested_year: z.number().int().optional(),
    rating_valid_from: IsoDate.optional(),
    rating_valid_to: IsoDate.optional(),
    tested_powertrain: z.string().optional(),
    tested_variant_note: z.string().optional(),
    mapping_confidence: MappingConfidence,
    source_id: Uuid,
    source_url: z.string().url(),
    ...archiveFields,
  })
  .strict()
  .superRefine((r, ctx) => {
    archiveCheck(r, ctx);
    if (r.rating_status !== 'NOT_RATED' && (r.protocol_version === undefined || r.tested_year === undefined)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['protocol_version'], message: 'ratings need protocol_version and tested_year' });
    }
    if (r.mapping_confidence !== 'EXACT' && r.rating_status !== 'NOT_RATED' && r.tested_variant_note === undefined) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['tested_variant_note'], message: 'a non-exact rating needs tested_variant_note (no fake equivalence)' });
    }
  });
export type SafetyRating = z.infer<typeof SafetyRating>;
export type SafetyRatingInput = z.input<typeof SafetyRating>;
