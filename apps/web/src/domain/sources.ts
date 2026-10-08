import dataset from '@/data/dataset-core.snapshot.json';
import energy from '@/data/energy-observations.snapshot.json';

/**
 * Registro de fuentes para "Cómo lo calculamos": nombre y autoridad por `source_id`, tal como vienen del
 * Dataset Core y de las observaciones de energía. La capa de publicación decidirá qué se puede publicar
 * (ESIOS bloqueado hasta resolver derechos): aquí se conserva la procedencia, no se oculta.
 */
export interface SourceInfo {
  id: string;
  name: string;
  authority?: string;
  url?: string;
  /** true si la publicación depende de derechos aún no resueltos (DATA_RIGHTS_MATRIX). */
  publicationBlocked: boolean;
  /** Clave de traducción (`methodology.sources.*`) cuando existe. */
  key?: 'esios' | 'miteco' | 'dataset';
}

/** Organismo por host de la URL de la observación (`source_authority` es el estado de procedencia, no el emisor). */
const ENERGY_HOSTS: Record<string, { key: 'esios' | 'miteco'; name: string; blocked: boolean }> = {
  'api.esios.ree.es': { key: 'esios', name: 'Red Eléctrica — ESIOS (PVPC)', blocked: true },
  'sedeaplicaciones.minetur.gob.es': { key: 'miteco', name: 'MITECO — Geoportal de carburantes', blocked: false },
};

const REGISTRY = new Map<string, SourceInfo>();
for (const s of dataset.bundle.sources as { id: string; name: string; source_authority?: string; base_url?: string }[]) {
  REGISTRY.set(s.id, { id: s.id, name: s.name, ...(s.source_authority ? { authority: s.source_authority } : {}), ...(s.base_url ? { url: s.base_url } : {}), publicationBlocked: false });
}
for (const o of energy.observations as { source_id: string; source_url: string }[]) {
  if (REGISTRY.has(o.source_id)) continue;
  const host = new URL(o.source_url).host;
  const known = ENERGY_HOSTS[host];
  REGISTRY.set(o.source_id, { id: o.source_id, name: known?.name ?? host, authority: host, url: o.source_url, publicationBlocked: known?.blocked ?? true, ...(known ? { key: known.key } : {}) });
}

export function sourceInfo(id: string | undefined): SourceInfo | undefined {
  return id ? REGISTRY.get(id) : undefined;
}
