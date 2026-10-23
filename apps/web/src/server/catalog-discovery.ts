import 'server-only';
import { createTechnicalCurationRepository, type CuratedVehicleDetail } from '@vscar/db';
import type { NotComparableReason, TechnicalConfiguration } from '@/domain/model-selection';
import { registrationYears } from '@/domain/model-selection';
import { catalogDb } from './db';

/**
 * Step D1.8 (ADR-020) — DESCUBRIMIENTO de marcas, modelos y años a partir de las homologaciones técnicas curadas
 * (D1.6–D1.7). Solo en el canal PREVIEW; en PUBLIC devuelve vacío (el gate PUBLIC no cambia).
 *
 * Al navegador solo llega un AGREGADO por homologación:
 * - marca y modelo de la fuente oficial;
 * - años de matriculación observados (REGISTRATION_OBSERVED, nunca año-modelo);
 * - clase de tren motriz, combustible y caja;
 * - potencia, solo cuando significa lo mismo para el usuario: térmica en ICE/MHEV y eléctrica en BEV. En HEV/PHEV
 *   la potencia térmica no es la del sistema y no se muestra.
 * Nunca llegan ids, TAN/Va/Ve, observaciones, derechos por campo ni valores en conflicto. Nada de esto es comparable:
 * una homologación curada no es una ReferenceVariant (ADR-019 B).
 */
export interface DiscoveryEntry {
  brand: string;
  model: string;
  years: number[];
  config: TechnicalConfiguration;
}

const PRODUCT_TO_POWERTRAIN: Record<string, string> = { ICE_OR_MHEV: 'ICE', HEV_OR_MHEV: 'HEV', MHEV: 'MHEV', PHEV: 'PHEV', BEV: 'BEV' };

function usableValue(d: CuratedVehicleDetail, key: string, basis?: readonly string[]) {
  const o = d.observations.find(
    (x) => x.value.spec_key === key && x.quality_status === 'USABLE' && x.conflict_status === 'NONE' && (!basis || basis.includes(String((x.value.measurement_basis as Record<string, unknown> | undefined)?.power_basis ?? ''))),
  );
  if (!o) return undefined;
  const v = o.value;
  if (typeof v.value === 'number') return { min: v.value, max: v.value };
  if (typeof v.value_min === 'number' && typeof v.value_max === 'number') return { min: v.value_min, max: v.value_max };
  return undefined;
}

/** Entrada agregada de una homologación curada (pura: testable sin MySQL). */
export function discoveryEntry(d: CuratedVehicleDetail, currentYear: number): DiscoveryEntry | undefined {
  const v = d.vehicle;
  const years = registrationYears(v.registration_period.first_observed_year, v.registration_period.last_observed_year, currentYear);
  if (!years.length) return undefined;
  const powertrainType = PRODUCT_TO_POWERTRAIN[v.product_class] ?? v.product_class;
  const power = powertrainType === 'ICE' || powertrainType === 'MHEV' ? usableValue(d, 'perf.power_max_kw', ['ICE_ONLY', 'SYSTEM']) : powertrainType === 'BEV' ? (usableValue(d, 'perf.power_electric_kw') ?? usableValue(d, 'perf.power_max_kw', ['SYSTEM', 'ELECTRIC_ONLY'])) : undefined;
  const transmission = d.attributes.find((a) => a.kind === 'TECHNICAL' && a.attribute === 'transmission')?.value;
  const commercial = (attr: string) => d.attributes.find((a) => a.kind === 'COMMERCIAL' && a.attribute === attr);
  const reasons: NotComparableReason[] = [];
  if (v.commercial_identity_status === 'UNCONFIRMED') reasons.push('COMMERCIAL_IDENTITY_UNCONFIRMED');
  if (commercial('generation')?.status !== 'EXACT') reasons.push('GENERATION_NOT_VERIFIED');
  if (commercial('model_year')?.status !== 'EXACT') reasons.push('MODEL_YEAR_NOT_VERIFIED');
  if (commercial('trim')?.status !== 'EXACT') reasons.push('TRIM_NOT_CONFIRMED');
  reasons.push('NOT_PROMOTED');
  return {
    brand: v.brand,
    model: v.model,
    years,
    config: { powertrainType, ...(v.fuel_type ? { fuel: v.fuel_type } : {}), ...(transmission ? { transmission } : {}), ...(power ? { powerKw: power } : {}), reasons },
  };
}

const g = globalThis as unknown as { __vscarDiscovery?: { version: string; at: number; entries: DiscoveryEntry[] } };
const TTL_MS = 30_000;

/** Entradas de descubrimiento del mercado (caché por versión de la capa curada; sin N+1: tres consultas agrupadas). */
export async function loadDiscovery(market: string, currentYear: number): Promise<DiscoveryEntry[]> {
  const cached = g.__vscarDiscovery;
  if (cached && cached.version.startsWith(`${market}.`) && Date.now() - cached.at < TTL_MS) return cached.entries;
  const repo = createTechnicalCurationRepository(catalogDb());
  const c = await repo.counts();
  const version = `${market}.${c.vehicles}.${c.attributes}.${c.observations}.${currentYear}`;
  if (cached && cached.version === version) {
    cached.at = Date.now();
    return cached.entries;
  }
  const list = await repo.listVehicles(market);
  const details = await repo.loadVehicles(list.map((x) => x.id));
  const entries = details.map((d) => discoveryEntry(d, currentYear)).filter((e): e is DiscoveryEntry => !!e);
  g.__vscarDiscovery = { version, at: Date.now(), entries };
  return entries;
}
