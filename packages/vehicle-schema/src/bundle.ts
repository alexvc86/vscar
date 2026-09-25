import { z } from 'zod';
import { Homologation, ReferenceVariant } from './identity.ts';
import { Incentive, SafetyRating, Source, VehiclePrice } from './records.ts';
import { SpecValue } from './sourced-value.ts';

/**
 * Conjunto autocontenido de datos de catálogo (una o varias ReferenceVariants con todo lo que cuelga de ellas).
 * Es la unidad de importación/round-trip y la forma de los fixtures.
 */
export const DatasetBundle = z
  .object({
    sources: z.array(Source),
    homologations: z.array(Homologation),
    variants: z.array(ReferenceVariant),
    spec_values: z.array(SpecValue),
    prices: z.array(VehiclePrice).default([]),
    incentives: z.array(Incentive).default([]),
    safety_ratings: z.array(SafetyRating).default([]),
  })
  .strict()
  .superRefine((b, ctx) => {
    const ids = (xs: { id: string }[]) => new Set(xs.map((x) => x.id));
    const sources = ids(b.sources);
    const homologations = new Map(b.homologations.map((h) => [h.id, h]));
    const variants = new Map(b.variants.map((v) => [v.id, v]));

    const fail = (path: (string | number)[], message: string) => ctx.addIssue({ code: z.ZodIssueCode.custom, path, message });

    b.homologations.forEach((h, i) => {
      if (!sources.has(h.source_id)) fail(['homologations', i, 'source_id'], 'unknown source');
    });
    b.variants.forEach((v, i) => {
      const h = homologations.get(v.homologation_id);
      if (!h) fail(['variants', i, 'homologation_id'], 'unknown homologation');
      else if (h.market_code !== v.market_code) fail(['variants', i, 'homologation_id'], 'homologation market differs from variant market');
    });
    b.spec_values.forEach((sv, i) => {
      const v = variants.get(sv.variant_id);
      if (!v) fail(['spec_values', i, 'variant_id'], 'unknown variant');
      else if (v.market_code !== sv.reference_market) fail(['spec_values', i, 'reference_market'], 'reference_market must equal the variant market');
      if (!sources.has(sv.source_id)) fail(['spec_values', i, 'source_id'], 'unknown source');
    });
    b.prices.forEach((p, i) => {
      if (!variants.has(p.variant_id)) fail(['prices', i, 'variant_id'], 'unknown variant');
      if (!sources.has(p.source_id)) fail(['prices', i, 'source_id'], 'unknown source');
    });
    b.safety_ratings.forEach((r, i) => {
      if (!variants.has(r.variant_id)) fail(['safety_ratings', i, 'variant_id'], 'unknown variant');
      if (!sources.has(r.source_id)) fail(['safety_ratings', i, 'source_id'], 'unknown source');
    });
    b.incentives.forEach((inc, i) => {
      if (!sources.has(inc.source_id)) fail(['incentives', i, 'source_id'], 'unknown source');
    });

    // Nunca se mezclan homologaciones (ADR-007): una homologación pertenece a una sola variant técnica.
    const byHomologation = new Map<string, string>();
    b.variants.forEach((v, i) => {
      const other = byHomologation.get(v.homologation_id);
      if (other && other !== v.id) fail(['variants', i, 'homologation_id'], 'homologation already used by another ReferenceVariant');
      byHomologation.set(v.homologation_id, v.id);
    });
  });

export type DatasetBundle = z.infer<typeof DatasetBundle>;
export type DatasetBundleInput = z.input<typeof DatasetBundle>;
