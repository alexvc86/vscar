/**
 * Slugs de ReferenceVariant (Step 7b). El slug es ROUTING, no identidad: el id técnico (UUID) nunca cambia y el
 * slug no es clave primaria. Reglas:
 * - legible y estable: `[a-z0-9-]`, sin acentos; nunca contiene `-vs-` (separador de pares en la URL);
 * - único por mercado (lo garantiza la base de datos);
 * - un slug publicado NO se recalcula: si cambia la etiqueta comercial, el slug se mantiene (o se crea uno nuevo
 *   y el antiguo queda como alias con redirect). Por eso solo se PROPONE slug para variants nuevas.
 */

export const PAIR_SEPARATOR = '-vs-';

export function slugify(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .replace(/-vs-/g, '-v-');
}

export function isValidVariantSlug(slug: string): boolean {
  return /^[a-z0-9]+(-[a-z0-9]+)*$/.test(slug) && !slug.includes(PAIR_SEPARATOR) && slug.length <= 200;
}

export interface SlugParts {
  manufacturer: string;
  model: string;
  /** Versión comercial (trim / nombre comercial sin marca ni modelo). */
  variant: string;
  model_year: number;
  powertrain_type: string;
  /** Discriminador técnico (p. ej. el sufijo `:h…` de canonical_key). Último recurso ante colisión. */
  technical_discriminator: string;
}

/**
 * Propone el slug de una variant NUEVA frente a los ya ocupados en su mercado. Determinista; añade sufijos solo
 * cuando hacen falta, en este orden: año → powertrain → discriminador técnico.
 */
export function proposeVariantSlug(p: SlugParts, taken: ReadonlySet<string>): string {
  const base = slugify(`${p.manufacturer} ${p.model} ${p.variant}`);
  const candidates = [base, `${base}-${p.model_year}`, slugify(`${base}-${p.model_year}-${p.powertrain_type}`), slugify(`${base}-${p.model_year}-${p.powertrain_type}-${p.technical_discriminator}`)];
  for (const c of candidates) if (isValidVariantSlug(c) && !taken.has(c)) return c;
  for (let n = 2; ; n++) {
    const c = `${candidates[3]}-${n}`;
    if (!taken.has(c)) return c;
  }
}
