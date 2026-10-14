import type { MediaRole, VehicleModelMedia } from '@vscar/vehicle-schema';
import { allowedIn, type PublicationChannel, type SourcePublication } from './publication.ts';

/**
 * Publicación de MEDIA (Step 7b.2). Regla propia, separada de la de datos: los derechos de una imagen no dependen
 * de los de las specs del coche y viceversa. Mismo vocabulario de derechos y de canales que los datos.
 *   VERIFIED / CONDITIONAL (con atribución) → PUBLIC y PREVIEW
 *   PENDING                                → solo PREVIEW (con distintivo de vista previa)
 *   DENIED, u origen UNVERIFIED con derechos no pendientes → nunca
 */
export function mediaPublication(m: Pick<VehicleModelMedia, 'rights_status' | 'origin'>): SourcePublication {
  if (m.rights_status === 'DENIED') return 'BLOCKED';
  if (m.origin === 'UNVERIFIED') return m.rights_status === 'PENDING' ? 'PREVIEW_ONLY' : 'BLOCKED';
  if (m.rights_status === 'PENDING') return 'PREVIEW_ONLY';
  return 'PUBLISHABLE';
}

export interface ModelMediaQuery {
  brand: string;
  model: string;
  /** Generación explícita de la variant/modelo (nunca inventada). */
  generation?: string | null | undefined;
  /** Año modelo, solo para imágenes con rango de años. */
  modelYear?: number | null | undefined;
  role: MediaRole;
  channel: PublicationChannel;
}

export interface ModelMediaChoice {
  /** Imagen a mostrar; ausente = silueta SVG del sistema (nunca una tarjeta sin visual). */
  media?: VehicleModelMedia;
  /** Nivel que resolvió: generación exacta, modelo, o fallback SVG. */
  match: 'GENERATION' | 'MODEL' | 'FALLBACK';
  /** true si la imagen solo es visible en PREVIEW (derechos pendientes): la UI lo señala. */
  previewOnly: boolean;
}

const norm = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
const RIGHTS_RANK = { VERIFIED: 0, CONDITIONAL: 1, PENDING: 2, DENIED: 3 } as const;

/** Orden de fallback (policy): 1) media de la generación exacta · 2) media del modelo · 3) silueta SVG. */
export function selectModelMedia(records: readonly VehicleModelMedia[], q: ModelMediaQuery): ModelMediaChoice {
  // THUMBNAIL puede reutilizar la imagen de SELECTOR (misma imagen, otro tamaño); nunca la de HERO.
  const roles: MediaRole[] = q.role === 'THUMBNAIL' ? ['THUMBNAIL', 'SELECTOR'] : [q.role];
  const usable = records.filter(
    (m) =>
      norm(m.brand) === norm(q.brand) &&
      norm(m.model) === norm(q.model) &&
      roles.includes(m.role) &&
      allowedIn(mediaPublication(m), q.channel) &&
      (q.modelYear == null || ((m.model_year_from === undefined || m.model_year_from <= q.modelYear) && (m.model_year_to === undefined || q.modelYear <= m.model_year_to))),
  );
  const best = (xs: VehicleModelMedia[]) =>
    [...xs].sort(
      (a, b) =>
        roles.indexOf(a.role) - roles.indexOf(b.role) ||
        RIGHTS_RANK[a.rights_status] - RIGHTS_RANK[b.rights_status] ||
        Number(b.model_year_from !== undefined) - Number(a.model_year_from !== undefined) ||
        (a.id < b.id ? -1 : 1),
    )[0];
  const choose = (m: VehicleModelMedia | undefined, match: ModelMediaChoice['match']): ModelMediaChoice | undefined =>
    m ? { media: m, match, previewOnly: mediaPublication(m) === 'PREVIEW_ONLY' } : undefined;

  const generation = q.generation ? norm(q.generation) : undefined;
  return (
    (generation ? choose(best(usable.filter((m) => m.generation_code && norm(m.generation_code) === generation)), 'GENERATION') : undefined) ??
    choose(best(usable.filter((m) => !m.generation_code)), 'MODEL') ?? { match: 'FALLBACK', previewOnly: false }
  );
}
