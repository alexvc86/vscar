import { z } from 'zod';
import { IsoDate, Uuid } from './enums.ts';

/**
 * Step 7b.2 — media de vehículo y tipos de año.
 *
 * Política: [VEHICLE_MEDIA_POLICY](../../../docs/data/VEHICLE_MEDIA_POLICY.md) · [ADR-014](../../../docs/adr/ADR-014-vehicle-model-media-and-selector-flow.md).
 * Derechos de la IMAGEN ≠ derechos de los DATOS del vehículo: un coche publicable puede no tener imagen publicable
 * (se muestra la silueta SVG del sistema) y nunca se oculta un coche por faltarle imagen.
 */

/**
 * Estado de un derecho (✅ VERIFIED · ⚠️ CONDITIONAL · ❓ PENDING · ❌ DENIED). Es EL MISMO vocabulario de la
 * DATA_RIGHTS_MATRIX: `@vscar/quality` lo reutiliza para las fuentes de datos y para la media (sin duplicar).
 */
export const RightsStatus = z.enum(['VERIFIED', 'CONDITIONAL', 'PENDING', 'DENIED']);
export type RightsStatus = z.infer<typeof RightsStatus>;

/** Uso de la imagen. Step 7b.2 implementa SELECTOR (tarjeta de modelo) y THUMBNAIL (resultados); HERO queda previsto. */
export const MediaRole = z.enum(['SELECTOR', 'THUMBNAIL', 'HERO']);
export type MediaRole = z.infer<typeof MediaRole>;

export const MediaType = z.enum(['IMAGE', 'SVG']);
export type MediaType = z.infer<typeof MediaType>;

/**
 * Procedencia de la imagen (policy §Sources). Prohibidas sin excepción: buscadores de imágenes, fotos de prensa sin
 * derechos verificados, imágenes de concesionarios, capturas de pantalla. `UNVERIFIED` no se publica nunca.
 */
export const MediaOrigin = z.enum(['SELF_CREATED', 'LICENSED', 'PUBLIC_DOMAIN', 'MANUFACTURER_VERIFIED', 'UNVERIFIED']);
export type MediaOrigin = z.infer<typeof MediaOrigin>;

/** Cómo se describe la imagen a lectores de pantalla: decorativa (`alt=""`) o identificativa ("Volkswagen Golf"). */
export const MediaAlt = z.enum(['DECORATIVE', 'IDENTIFYING']);
export type MediaAlt = z.infer<typeof MediaAlt>;

/**
 * Imagen a nivel de MODELO (o modelo + generación), nunca por versión técnica: no hace falta una foto por motor.
 * Clave: marca + modelo (+ generación explícita). Rango de año modelo solo si una generación no basta.
 */
export const VehicleModelMedia = z
  .object({
    id: Uuid,
    brand: z.string().min(1),
    model: z.string().min(1),
    /** Igual que `reference_variants.generation_code`. Ausente = imagen genérica del modelo. */
    generation_code: z.string().min(1).optional(),
    model_year_from: z.number().int().min(1990).max(2100).optional(),
    model_year_to: z.number().int().min(1990).max(2100).optional(),
    role: MediaRole,
    media_type: MediaType,
    /** Ruta de un asset local optimizado, relativa a `apps/web/public` (preferencia Alpha). */
    asset_path: z.string().regex(/^\/media\/[a-z0-9/_.-]+\.(png|jpe?g|webp|avif|svg)$/).optional(),
    /** URL externa con licencia explícita (alternativa; requiere dominio permitido en la web). */
    external_url: z.string().url().optional(),
    width: z.number().int().positive(),
    height: z.number().int().positive(),
    origin: MediaOrigin,
    rights_status: RightsStatus,
    /** Fuente registrada (DATA_RIGHTS_MATRIX) si la imagen procede de una; los assets propios no la necesitan. */
    source_id: Uuid.optional(),
    attribution: z.string().min(1).optional(),
    license: z.string().min(1).optional(),
    verified_at: IsoDate.optional(),
    alt: MediaAlt.default('IDENTIFYING'),
    notes: z.string().optional(),
  })
  .strict()
  .superRefine((m, ctx) => {
    const fail = (path: string, message: string) => ctx.addIssue({ code: z.ZodIssueCode.custom, path: [path], message });
    if ((m.asset_path === undefined) === (m.external_url === undefined)) fail('asset_path', 'exactly one of asset_path or external_url');
    if (m.model_year_from !== undefined && m.model_year_to !== undefined && m.model_year_from > m.model_year_to) fail('model_year_to', 'model_year_from must be <= model_year_to');
    if ((m.rights_status === 'VERIFIED' || m.rights_status === 'CONDITIONAL') && (!m.license || !m.verified_at)) fail('license', 'verified or conditional rights need license and verified_at');
    if (m.rights_status === 'CONDITIONAL' && !m.attribution) fail('attribution', 'conditional rights need the required attribution');
    if (m.origin === 'UNVERIFIED' && (m.rights_status === 'VERIFIED' || m.rights_status === 'CONDITIONAL')) fail('rights_status', 'an UNVERIFIED origin cannot have verified rights');
  });
export type VehicleModelMedia = z.infer<typeof VehicleModelMedia>;
export type VehicleModelMediaInput = z.input<typeof VehicleModelMedia>;

/**
 * Tipos de año (Step 7b.2 §19). El selector usa SOLO `MODEL_YEAR` (`ReferenceVariant.commercial.model_year`, tal
 * como lo declara la fuente). `PRODUCTION_YEAR` es el periodo comercial/homologación de la variant; `REGISTRATION_YEAR`
 * pertenece a una unidad concreta (UsedVehicleInstance). Nunca se infiere uno de otro: si falta el año modelo, la
 * variant aparece bajo "año desconocido", no bajo el de su matriculación, del dataset o de la publicación de la fuente.
 */
export const YEAR_KINDS = ['MODEL_YEAR', 'PRODUCTION_YEAR', 'REGISTRATION_YEAR'] as const;
export type YearKind = (typeof YEAR_KINDS)[number];
