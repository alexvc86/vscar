import type { MarketCode } from '@/i18n/locales';
import { EXAMPLE_PAIRS, pairSlug, type VehicleOption } from './catalog.ts';
import { DEFAULT_SCENARIO, type Scenario } from './scenario.ts';

/**
 * Identidad de la página vs escenario del usuario (Step 7c, ADR-015).
 *
 *   PAGE IDENTITY  = coche A + coche B + mercado          → canonical, hreflang, OG, sitemap
 *   USER SCENARIO  = km/año, viajes, carga, horizonte, prioridades (query) → vista personalizada de la MISMA página
 *
 * El contenido indexable y la imagen OG usan el Canonical Comparison Scenario del mercado: versionado y determinista.
 */
export interface CanonicalScenario {
  /** Cambia si cambia el escenario de referencia (trazabilidad del contenido indexado y de la OG). */
  version: string;
  scenario: Scenario;
}

export const CANONICAL_SCENARIOS: Record<MarketCode, CanonicalScenario> = {
  // España: el escenario por defecto de la web (Step 7a): 15.000 km/año, 35 km/día, 1 viaje largo, carga en casa, 5 años.
  ES: { version: 'ES-2026.10', scenario: DEFAULT_SCENARIO },
};

export const canonicalScenario = (market: MarketCode): CanonicalScenario => CANONICAL_SCENARIOS[market];

/**
 * Orden canónico del par para SEO: determinista por slug (A-vs-B y B-vs-A apuntan al mismo canonical). La UI conserva
 * el orden del usuario (colores A/B, intercambiar) y ambas URL funcionan; solo el `canonical` se normaliza.
 */
export function canonicalPairSlug(a: Pick<VehicleOption, 'slug'>, b: Pick<VehicleOption, 'slug'>): string {
  return a.slug <= b.slug ? pairSlug(a.slug, b.slug) : pairSlug(b.slug, a.slug);
}

/**
 * Pares INDEXABLES (Alpha): lista editorial, no todas las combinaciones (N² con 80 coches serían miles de páginas
 * irrelevantes). Accesible ≠ indexable: cualquier par válido funciona y se comparte; solo estos entran en sitemap y
 * pueden indexarse, y solo si sus dos coches son públicos (canal PUBLIC). Hoy coincide con los ejemplos de la home.
 */
export const INDEXABLE_PAIR_SLUGS: ReadonlySet<string> = new Set(EXAMPLE_PAIRS.map(({ a, b }) => canonicalPairSlug({ slug: a }, { slug: b })));
