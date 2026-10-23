import type { SelectionAvailability, YearBasis } from './model-selection';

/**
 * Catálogo de vehículos en la web (Step 7b): forma mínima de una ReferenceVariant seleccionable, etiqueta derivada,
 * ranking de búsqueda y slugs de par. Módulo PURO y apto para cliente: sin engines, sin DB, sin specs.
 *
 * Identidad: la UI muestra nombres comerciales; detrás siempre hay UNA ReferenceVariant técnica (`id`).
 */

export const POWERTRAINS = ['ICE', 'MHEV', 'HEV', 'PHEV', 'BEV', 'FCEV', 'EREV'] as const;

/** Opción del selector = respuesta mínima del catálogo (Step 7b §87). Sin specs, sin precios, sin códigos. */
export interface VehicleOption {
  id: string;
  slug: string;
  brand: string;
  model: string;
  /** Versión comercial sin marca ni modelo ("Design RWD 82,5 kWh"). */
  variant: string;
  /** Año modelo tal como lo declara la fuente; null si no existe (nunca se infiere de la matriculación). */
  year: number | null;
  powertrainType: string;
  bodyType: string;
  /**
   * Periodo de homologación, SOLO cuando hace falta para distinguir dos variants técnicas con el mismo nombre
   * comercial, año y powertrain (ADR-007). Fechas ISO; la UI las formatea.
   */
  period?: { from: string; to?: string };
  /**
   * Ciclo de homologación, SOLO cuando distingue variants con el mismo nombre comercial, año y powertrain y el periodo
   * no basta (Golf 2018 Advance: NEDC vs WLTP). Es un hecho comprensible, no un código.
   */
  cycle?: string;
  /** true si la variant solo está disponible en el canal PREVIEW (derechos pendientes / registro de prueba). */
  preview?: boolean;
}

/** Etiqueta estructurada: la UI la compone y traduce (powertrain, periodo). No se guarda ningún string derivado. */
export interface VehicleDisplayLabel {
  brand: string;
  /** "SEAL Design RWD 82,5 kWh" */
  name: string;
  /** "BYD SEAL" — nombre corto para frases y el VS. */
  short: string;
  year: number | null;
  powertrain: string;
  period?: { from: string; to?: string };
  cycle?: string;
}

/** Quita el prefijo de marca y modelo del nombre comercial ("BYD SEAL Design…" → "Design…"). */
export function commercialVariant(commercialName: string, brand: string, model: string, trim: string): string {
  let rest = commercialName.trim();
  for (const prefix of [brand, model]) {
    if (normalizeSearch(rest).startsWith(`${normalizeSearch(prefix)} `)) rest = rest.slice(prefix.length).trim();
  }
  return rest.replace(/^[,\s]+/, '') || trim;
}

export function buildVehicleDisplayLabel(o: VehicleOption): VehicleDisplayLabel {
  return { brand: o.brand, name: `${o.model} ${o.variant}`.trim(), short: `${o.brand} ${o.model}`, year: o.year, powertrain: o.powertrainType, ...(o.period ? { period: o.period } : {}), ...(o.cycle ? { cycle: o.cycle } : {}) };
}

/**
 * Nombres cortos distintos para A y B en las frases ("BYD SEAL frente a Tesla Model 3"). Si coinciden (Golf vs
 * Golf), se añade el año; si siguen coincidiendo, la versión; y por último el inicio del periodo.
 */
export function distinctShortNames(a: VehicleOption, b: VehicleOption): [string, string] {
  const steps: ((o: VehicleOption) => string)[] = [
    (o) => `${o.brand} ${o.model}`,
    (o) => `${o.brand} ${o.model}${o.year ? ` ${o.year}` : ''}`,
    (o) => `${o.brand} ${o.model} ${o.variant}${o.year ? ` ${o.year}` : ''}`,
    (o) => `${o.brand} ${o.model} ${o.variant}${o.year ? ` ${o.year}` : ''}${o.period ? ` (${o.period.from.slice(0, 7)})` : ''}`,
  ];
  for (const step of steps) {
    const [x, y] = [step(a), step(b)];
    if (x !== y) return [x, y];
  }
  return [`${steps[3]!(a)} A`, `${steps[3]!(b)} B`];
}

/** Normalización de búsqueda: sin acentos, minúsculas, espacios colapsados, ≤ 100 caracteres. */
export function normalizeSearch(s: string): string {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/\s+/g, ' ').trim().slice(0, 100);
}

export const SEARCH_MIN_CHARS = 2;
export const SEARCH_MAX_CHARS = 100;
export const SEARCH_LIMIT = 20;

/**
 * Ranking determinista (Step 7b §32), sin IA ni fuzzy: modelo exacto > marca + modelo exactos > prefijo >
 * coincidencia en la versión > año. Empates por marca, modelo, año (más reciente) y slug.
 */
export function searchScore(o: VehicleOption, query: string): number {
  const q = normalizeSearch(query);
  if (!q) return 0;
  const brand = normalizeSearch(o.brand);
  const model = normalizeSearch(o.model);
  const full = normalizeSearch(`${o.brand} ${o.model} ${o.variant}`);
  const variant = normalizeSearch(o.variant);
  if (q === model) return 100;
  if (q === `${brand} ${model}`) return 90;
  if (model.startsWith(q) || `${brand} ${model}`.startsWith(q)) return 75;
  if (brand.startsWith(q) || full.startsWith(q)) return 70;
  if (q.split(' ').every((tok) => variant.includes(tok))) return 50;
  if (o.year !== null && q.split(' ').includes(String(o.year))) return 30;
  return 10;
}

export function rankSearchResults(options: readonly VehicleOption[], query: string): VehicleOption[] {
  const scored = options.map((o) => ({ o, s: searchScore(o, query) }));
  return scored
    .sort(
      (x, y) =>
        y.s - x.s ||
        x.o.brand.localeCompare(y.o.brand) ||
        x.o.model.localeCompare(y.o.model) ||
        (y.o.year ?? 0) - (x.o.year ?? 0) ||
        (x.o.period?.from ?? '').localeCompare(y.o.period?.from ?? '') ||
        x.o.slug.localeCompare(y.o.slug),
    )
    .map((x) => x.o);
}

/** Orden de navegación sin búsqueda (marca → modelo → año). */
export function browseOrder(options: readonly VehicleOption[]): VehicleOption[] {
  return [...options].sort((a, b) => a.brand.localeCompare(b.brand) || a.model.localeCompare(b.model) || (b.year ?? 0) - (a.year ?? 0) || (a.period?.from ?? '').localeCompare(b.period?.from ?? '') || a.slug.localeCompare(b.slug));
}

const PAIR_SEPARATOR = '-vs-';

/** `/{locale}/compare/{a}-vs-{b}`: A y B conservan su orden (la UI usa identidad A/B). */
export function pairSlug(a: string, b: string): string {
  return `${a}${PAIR_SEPARATOR}${b}`;
}

/** Separa un slug de par. Un slug de variant nunca contiene `-vs-` (lo garantiza el schema). */
export function parsePairSlug(slug: string): { a: string; b: string } | undefined {
  const parts = slug.split(PAIR_SEPARATOR);
  if (parts.length !== 2) return undefined;
  const [a, b] = parts as [string, string];
  const ok = (s: string) => /^[a-z0-9]+(-[a-z0-9]+)*$/.test(s);
  return ok(a) && ok(b) ? { a, b } : undefined;
}

/** Comparaciones de ejemplo (no "populares": no hay analytics). Solo se muestran si ambas están en el catálogo. */
export const EXAMPLE_PAIRS: readonly { a: string; b: string }[] = [
  { a: 'byd-seal-2026-design-rwd-82-5-kwh', b: 'tesla-model-3-2021-standard-range-plus-e6r' },
  { a: 'bmw-x3-2018-xdrive20d', b: 'volkswagen-golf-style-1-5-etsi-150-dsg' },
];

/** URL de la Step 7a (comparación fija) → par canónico. Se redirige (308) para no romper enlaces compartidos. */
export const LEGACY_PAIRS: Readonly<Record<string, string>> = {
  'byd-seal-vs-tesla-model-3': pairSlug('byd-seal-2026-design-rwd-82-5-kwh', 'tesla-model-3-2021-standard-range-plus-e6r'),
};

// ---------------------------------------------------------------------------------------------------------------
// Step 7b.2 — navegación Marca → Modelo → Año → Versión. DTOs mínimos (sin specs completas) servidos por el servidor
// con los derechos ya aplicados: el cliente nunca recibe una URL de imagen que su canal no pueda mostrar.
// ---------------------------------------------------------------------------------------------------------------

/** Imagen ya autorizada para el canal. Ausente = silueta SVG del sistema (nunca una tarjeta sin visual). */
export interface MediaView {
  /** Asset local optimizado (`/media/…`); se sirve con next/image (AVIF/WebP). */
  src: string;
  width: number;
  height: number;
  /** DECORATIVE → `alt=""`; IDENTIFYING → "Marca Modelo". */
  alt: 'DECORATIVE' | 'IDENTIFYING';
  /** Nivel que resolvió la imagen (generación exacta o modelo). */
  match: 'GENERATION' | 'MODEL';
  attribution?: string;
  /** Solo en PREVIEW: imagen con derechos pendientes (se señala discretamente). */
  preview?: boolean;
}

export interface BrandOption {
  brand: string;
  /** Modelos navegables de la marca en el mercado y canal (comparables o solo descubribles, D1.8). */
  models: number;
  /** D1.8: COMPARISON_ELIGIBLE si algún modelo es comparable; CATALOG_DISCOVERABLE si solo hay datos técnicos. */
  availability: SelectionAvailability;
}

/** Tarjeta de modelo: como mucho imagen, nombre, años disponibles y una pista de generación. */
export interface ModelCard {
  brand: string;
  model: string;
  /** Generaciones explícitas del catálogo (nunca inventadas). La UI solo las muestra si distinguen algo. */
  generations: string[];
  /** Años modelo presentes (más reciente primero); `null` = año desconocido. */
  years: (number | null)[];
  bodyType: string;
  media?: MediaView;
  preview?: boolean;
  /** D1.8: comparable (alguna ReferenceVariant seleccionable) o solo descubrible (homologaciones técnicas). */
  availability: SelectionAvailability;
}

export interface YearOption {
  /** Año del selector; `null` = desconocido. Su significado lo da `basis` (nunca se convierte uno en otro). */
  year: number | null;
  /** Generación explícita de ese año, si existe (p. ej. "Mk7"). */
  generations: string[];
  /** D1.8: año-modelo declarado (catálogo seleccionable) y/o matriculación observada (homologaciones técnicas). */
  basis: YearBasis[];
  availability: SelectionAvailability;
}

/** Fila de versión: apunta EXACTAMENTE a una ReferenceVariant (`id`), nunca a un nombre comercial. */
export interface VariantRow extends VehicleOption {
  /** Potencia máxima en kW solo si hay un valor usable, publicable en el canal y sin conflicto. */
  powerKw?: { min: number; max: number };
  transmission: string;
  drivetrain: string;
  generation?: string;
  media?: MediaView;
  /** Solo PREVIEW (detalle técnico de metodología/depuración). Nunca en PUBLIC. */
  identity?: { referenceVariantId: string; status: string; tan?: string; va?: string; ve?: string };
}

/** `year` de la API: número o `unknown`. */
export const yearParam = (y: number | null) => (y === null ? 'unknown' : String(y));
