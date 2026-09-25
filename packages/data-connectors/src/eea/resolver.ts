import { eeaRequestUrl } from './query.ts';
import type { FetchLike } from './client.ts';

/**
 * EEADatasetResolver: dado (año, preferencia de estado) devuelve la tabla EEA correcta.
 * `[latest].[co2cars]` NO es una fuente universal: mezcla filas P y F (2010–2021), solo trae P de 2022
 * y no contiene 2023+. Los años recientes están en tablas versionadas `co2cars_<año><F|P>v<n>`.
 *
 * Registro verificado contra discodata el 2026-09-24 (sondeo de nombres; INFORMATION_SCHEMA está bloqueado).
 * Actualizar con `discoverEeaTables` (p. ej. desde una tarea programada) y subir EEA_REGISTRY_VERSION.
 */
export type EeaStatus = 'FINAL' | 'PROVISIONAL';
export type StatusPreference = 'FINAL_ONLY' | 'FINAL_OR_PROVISIONAL' | 'PROVISIONAL_ONLY';

export interface EeaDatasetEntry {
  year: number;
  status: EeaStatus;
  table: string;
  /** Filtro obligatorio por `Status` cuando la tabla mezcla estados. */
  status_filter?: 'F' | 'P';
}

export interface ResolvedEeaDataset extends EeaDatasetEntry {
  provisional: boolean;
  registry_version: string;
}

export const EEA_REGISTRY_VERSION = '2026-09-24';

const LATEST = '[CO2Emission].[latest].[co2cars]';
const versioned = (name: string) => `[CO2Emission].[latest].[${name}]`;

function buildRegistry(): EeaDatasetEntry[] {
  const entries: EeaDatasetEntry[] = [];
  for (let year = 2010; year <= 2021; year++) {
    entries.push({ year, status: 'FINAL', table: LATEST, status_filter: 'F' });
    entries.push({ year, status: 'PROVISIONAL', table: LATEST, status_filter: 'P' });
  }
  entries.push(
    { year: 2022, status: 'FINAL', table: versioned('co2cars_2022Fv26') },
    { year: 2022, status: 'PROVISIONAL', table: versioned('co2cars_2022Pv25') },
    { year: 2023, status: 'FINAL', table: versioned('co2cars_2023Fv28') },
    { year: 2023, status: 'PROVISIONAL', table: versioned('co2cars_2023Pv27') },
    { year: 2024, status: 'FINAL', table: versioned('co2cars_2024Fv30') },
    { year: 2024, status: 'PROVISIONAL', table: versioned('co2cars_2024Pv29') },
    { year: 2025, status: 'PROVISIONAL', table: versioned('co2cars_2025Pv31') },
  );
  return entries;
}

export const EEA_DATASET_REGISTRY: readonly EeaDatasetEntry[] = buildRegistry();

export const EEA_SUPPORTED_YEARS = {
  min: Math.min(...EEA_DATASET_REGISTRY.map((e) => e.year)),
  max: Math.max(...EEA_DATASET_REGISTRY.map((e) => e.year)),
};

export function resolveEeaDataset(
  year: number,
  preference: StatusPreference = 'FINAL_OR_PROVISIONAL',
  registry: readonly EeaDatasetEntry[] = EEA_DATASET_REGISTRY,
): ResolvedEeaDataset {
  const forYear = registry.filter((e) => e.year === year);
  const final = forYear.find((e) => e.status === 'FINAL');
  const provisional = forYear.find((e) => e.status === 'PROVISIONAL');
  const chosen = preference === 'PROVISIONAL_ONLY' ? provisional : preference === 'FINAL_ONLY' ? final : (final ?? provisional);
  if (!chosen) {
    throw new Error(`no EEA dataset for year ${year} with preference ${preference} (registry ${EEA_REGISTRY_VERSION})`);
  }
  return { ...chosen, provisional: chosen.status === 'PROVISIONAL', registry_version: EEA_REGISTRY_VERSION };
}

/**
 * Descubre tablas versionadas nuevas sondeando nombres (uso operativo, no en CI).
 * Devuelve las que responden con resultados.
 */
export async function discoverEeaTables(
  fetchImpl: FetchLike,
  years: readonly number[],
  versions: readonly number[],
): Promise<EeaDatasetEntry[]> {
  const found: EeaDatasetEntry[] = [];
  for (const year of years) {
    for (const [letter, status] of [['F', 'FINAL'], ['P', 'PROVISIONAL']] as const) {
      for (const v of versions) {
        const table = versioned(`co2cars_${year}${letter}v${v}`);
        const res = await fetchImpl(eeaRequestUrl(`SELECT TOP 1 Year FROM ${table}`, 1, 1));
        const body = (await res.json()) as { results?: unknown[] };
        if (Array.isArray(body.results) && body.results.length > 0) found.push({ year, status, table });
      }
    }
  }
  return found;
}
