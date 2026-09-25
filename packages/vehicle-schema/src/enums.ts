import { z } from 'zod';

// ---------------------------------------------------------------------------
// Primitivos
// ---------------------------------------------------------------------------

export const Uuid = z.string().uuid();
export type Uuid = z.infer<typeof Uuid>;

/** Fecha ISO `YYYY-MM-DD`. Todas las fechas del dominio usan este formato (round-trip exacto con MySQL DATE). */
export const IsoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'expected YYYY-MM-DD');
export type IsoDate = z.infer<typeof IsoDate>;

/** Código de mercado ISO 3166-1 alfa-2 (mercado de la variant o mercado de origen del dato). */
export const MarketCode = z.string().regex(/^[A-Z]{2}$/, 'expected ISO 3166-1 alpha-2');
export type MarketCode = z.infer<typeof MarketCode>;

/** Mercados donde VScar publica ReferenceVariants (Alpha: ES público, US test). */
export const ReferenceMarket = z.enum(['ES', 'US']);
export type ReferenceMarket = z.infer<typeof ReferenceMarket>;

/** Mercados UE entre los que se admite cross-market de datos técnicos de homologación (D1). */
export const EU_MARKETS: ReadonlySet<string> = new Set([
  'AT', 'BE', 'BG', 'CY', 'CZ', 'DE', 'DK', 'EE', 'ES', 'FI', 'FR', 'GR', 'HR', 'HU',
  'IE', 'IT', 'LT', 'LU', 'LV', 'MT', 'NL', 'PL', 'PT', 'RO', 'SE', 'SI', 'SK',
]);

// ---------------------------------------------------------------------------
// Procedencia (Catalog v0.2 §3.2–§3.4)
// ---------------------------------------------------------------------------

/** Quién publica el dato. OFFICIAL_* no significa "correcto". */
export const SourceAuthority = z.enum([
  'OFFICIAL_AUTHORITY',
  'OFFICIAL_MANUFACTURER',
  'VERIFIED_EDITORIAL',
  'SECONDARY_REFERENCE',
  'USER_PROVIDED',
  'CALCULATED',
  'ESTIMATED',
]);
export type SourceAuthority = z.infer<typeof SourceAuthority>;

/**
 * Catalog v0.2 Q8: `source_authority` mezcla "quién origina" y "cómo se origina".
 * Se deja abierta la evolución a `source_authority` + `value_origin` sin cambiar
 * el catálogo: esta proyección se usa en código en lugar de comparar strings sueltos.
 */
export type ValueOrigin = 'DIRECT' | 'USER_PROVIDED' | 'CALCULATED' | 'ESTIMATED';
export function valueOriginOf(authority: SourceAuthority): ValueOrigin {
  switch (authority) {
    case 'USER_PROVIDED':
    case 'CALCULATED':
    case 'ESTIMATED':
      return authority;
    default:
      return 'DIRECT';
  }
}

export const MappingConfidence = z.enum([
  'EXACT',
  'TRIM_LEVEL',
  'POWERTRAIN_LEVEL',
  'GENERATION_LEVEL',
  'CROSS_MARKET_EXACT_HOMOLOGATION',
  'INFERRED',
  'UNCONFIRMED',
]);
export type MappingConfidence = z.infer<typeof MappingConfidence>;

export const HomologationMatch = z.enum(['EXACT', 'PARTIAL', 'UNCONFIRMED', 'NOT_APPLICABLE']);
export type HomologationMatch = z.infer<typeof HomologationMatch>;

export const TestCycle = z.enum(['NEDC', 'NEDC_CORRELATED', 'WLTP', 'EPA', 'MANUFACTURER', 'UNDECLARED']);
export type TestCycle = z.infer<typeof TestCycle>;

/** Estado de curación del valor. */
export const CurationStatus = z.enum(['DRAFT', 'REVIEWED', 'PUBLISHED', 'CONFLICT', 'REJECTED']);
export type CurationStatus = z.infer<typeof CurationStatus>;

export const RangeBasis = z.enum(['WHEEL_SIZE', 'TRIM', 'EQUIPMENT', 'HOMOLOGATION_FAMILY', 'UNSPECIFIED']);
export type RangeBasis = z.infer<typeof RangeBasis>;

export const Transformation = z.enum(['identity', 'unit_conversion', 'derived', 'mapping', 'manual']);
export type Transformation = z.infer<typeof Transformation>;

// ---------------------------------------------------------------------------
// Bases de medida (Catalog v0.2 §5)
// ---------------------------------------------------------------------------

export const PowerBasis = z.enum(['SYSTEM', 'ICE_ONLY', 'ELECTRIC_ONLY', 'UNSPECIFIED']);
export const BatteryCapacityBasis = z.enum(['GROSS', 'USABLE', 'NOMINAL', 'UNSPECIFIED']);
export const MassDefinition = z.enum(['EU_RUNNING_ORDER', 'DIN', 'WLTP_TEST_MASS', 'CURB_UNSPECIFIED', 'GROSS_VEHICLE']);
export const BootMethod = z.enum(['VDA', 'SAE', 'MANUFACTURER', 'UNSPECIFIED']);
export const TurningMeasure = z.enum(['RADIUS', 'DIAMETER', 'UNSPECIFIED']);
export const RangeType = z.enum(['WLTP_COMBINED', 'WLTP_CITY', 'EAER', 'AER', 'TOTAL', 'EPA', 'UNSPECIFIED']);
export const ConsumptionBasis = z.enum(['COMBINED', 'WEIGHTED_PHEV', 'CHARGE_SUSTAINING', 'CHARGE_DEPLETING', 'UNSPECIFIED']);
export const ChargingLossBasis = z.enum(['INCLUDED', 'EXCLUDED', 'UNSPECIFIED']);

// ---------------------------------------------------------------------------
// Identidad (Catalog v0.2 §2)
// ---------------------------------------------------------------------------

/** Clasificación de producto. */
export const PowertrainType = z.enum(['ICE', 'MHEV', 'HEV', 'PHEV', 'BEV', 'FCEV', 'EREV']);
export type PowertrainType = z.infer<typeof PowertrainType>;

/** Clasificación de homologación (decide etiqueta DGT y fiscalidad). */
export const HomologationPowertrain = z.enum(['ICE', 'NOVC_HEV', 'OVC_HEV', 'BEV', 'FCEV', 'UNKNOWN']);
export type HomologationPowertrain = z.infer<typeof HomologationPowertrain>;

export const IdentificationConfidence = z.enum(['EXACT', 'PARTIAL', 'UNCONFIRMED']);
export type IdentificationConfidence = z.infer<typeof IdentificationConfidence>;

export const EmissionsStandardFamily = z.enum(['EURO_5', 'EURO_6', 'EURO_7', 'EPA_TIER_3', 'UNKNOWN']);
/** Ampliable por PR; nunca se infiere sin tabla oficial versionada. */
export const EmissionsStandardLevel = z.enum(['B', 'C', 'D_TEMP', 'D', 'E', 'E_BIS', 'EA', 'EB', 'AP', 'UNSPECIFIED']);

export const FuelType = z.enum(['petrol', 'diesel', 'lpg', 'cng', 'e85', 'hydrogen']);
export const Drivetrain = z.enum(['FWD', 'RWD', 'AWD']);
export const Transmission = z.enum(['manual', 'automatic', 'dct', 'cvt', 'ecvt', 'single_speed']);
export const BodyType = z.enum(['hatchback', 'sedan', 'estate', 'suv', 'mpv', 'coupe', 'convertible', 'pickup', 'van']);

// ---------------------------------------------------------------------------
// Precios y seguridad (Catalog v0.2 §11–§12)
// ---------------------------------------------------------------------------

export const PriceType = z.enum(['original_list', 'current_new', 'msrp', 'otr']);
export const PriceBasis = z.enum(['LIST', 'PROMOTIONAL', 'FINANCED', 'OTR', 'MSRP', 'UNKNOWN']);
export const InclTaxes = z.enum(['YES', 'NO', 'UNKNOWN']);
export const RatingAuthority = z.enum(['EuroNCAP', 'NHTSA', 'IIHS']);
export const RatingStatus = z.enum(['VALID', 'EXPIRED', 'NOT_RATED', 'PROVISIONAL']);
