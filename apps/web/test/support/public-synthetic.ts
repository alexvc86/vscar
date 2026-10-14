import { BYD_SEAL_IDS, MODEL3_2021_IDS, loadAllCases } from '@vscar/fixtures';
import type { DatasetBundle } from '@vscar/vehicle-schema';

/**
 * Catálogo PUBLIC **SINTÉTICO** (solo tests, Step 7c §106): el Dataset Core real no tiene ningún coche público. Aquí
 * BYD SEAL y los dos Model 3 2021 "estándar plus" pasan a `published`, identidad `EXACT` y sus valores/precios a una
 * fuente con derechos publicables (EEA, S01). Las fuentes secundarias siguen siéndolo (ocultas). No toca MySQL ni el
 * catálogo real: sirve para probar indexación, canonical, hreflang y sitemap en canal PUBLIC.
 */
export const SYNTHETIC_PUBLIC_IDS = [BYD_SEAL_IDS.variant, MODEL3_2021_IDS.srp, MODEL3_2021_IDS.srpE6cr] as const;

export function publicSyntheticBundle(): DatasetBundle {
  const b = loadAllCases();
  const eea = b.sources.find((s) => s.code === 'S01')!;
  const ids = new Set<string>(SYNTHETIC_PUBLIC_IDS.filter(Boolean));
  const homs = new Set(b.variants.filter((v) => ids.has(v.id)).map((v) => v.homologation_id));
  const toEea = <T extends { source_id: string; source_authority: string }>(x: T): T => (x.source_authority === 'SECONDARY_REFERENCE' ? x : { ...x, source_id: eea.id, source_authority: 'OFFICIAL_AUTHORITY' });
  return {
    ...b,
    variants: b.variants.map((v) => (ids.has(v.id) ? { ...v, status: 'published' as const } : v)),
    homologations: b.homologations.map((h) => (homs.has(h.id) ? { ...h, identification_confidence: 'EXACT' as const, source_id: eea.id } : h)),
    spec_values: b.spec_values.map((v) => (ids.has(v.variant_id) ? toEea(v) : v)),
    prices: b.prices.map((p) => (ids.has(p.variant_id) ? toEea(p) : p)),
  };
}
