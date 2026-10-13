import type { PipelineVehicle } from '@vscar/decision-engine';
import type { EnergyContext } from '@vscar/market-context';
import type { CandidateSide } from '@vscar/ui/tokens';
import type { MarketCode } from '@/i18n/locales';
import type { VehicleOption } from './catalog.ts';

/**
 * Datos de una comparación resueltos en el SERVIDOR (Step 7b, `loadComparisonData`): las dos ReferenceVariants
 * elegidas, ya filtradas por derechos y calidad y convertidas a entradas de engine, más la energía de referencia
 * del mercado. Serializable: el servidor los pasa al cliente y al Web Worker, que recalculan con los MISMOS
 * hechos. El cliente nunca consulta la base de datos ni recibe el catálogo completo.
 */
export interface ComparisonVehicle {
  side: CandidateSide;
  option: VehicleOption;
  /** Nombre corto usado por los engines en sus mensajes ("BYD SEAL"). */
  label: string;
  /** Fecha de referencia de los hechos (variants históricas: último día de su homologación). */
  at?: string;
  pipeline: PipelineVehicle;
}

/** Fuente usada por la comparación, con su estado de derechos (DATA_RIGHTS_MATRIX). */
export interface SourceInfo {
  id: string;
  code?: string;
  name: string;
  /** Clave de traducción (`methodology.sources.*`) cuando existe. */
  key?: 'esios' | 'miteco';
  url?: string;
  publication: 'PUBLISHABLE' | 'PREVIEW_ONLY';
  attribution?: string;
}

export interface DataSnapshot {
  /** Huella del catálogo del mercado (cambia con cualquier fila nueva). */
  vehicles: string;
  energy: string;
  rights: string;
}

export interface ComparisonData {
  /** Clave estable para cachés: par + mercado + canal + snapshot. */
  key: string;
  market: MarketCode;
  pairSlug: string;
  channel: 'PUBLIC' | 'PREVIEW';
  vehicles: [ComparisonVehicle, ComparisonVehicle];
  energy: EnergyContext;
  sources: SourceInfo[];
  dataSnapshot: DataSnapshot;
}
