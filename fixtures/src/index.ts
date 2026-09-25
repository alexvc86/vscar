import { DatasetBundle, type DatasetBundleInput } from '@vscar/vehicle-schema';
import { bmwX3Range } from './cases/bmw-x3-2018-range.ts';
import { bydSealBatteryUnspecified } from './cases/byd-seal-battery-unspecified.ts';
import { golf2018TwoHomologations } from './cases/golf-2018-two-homologations.ts';
import { golfCurrentOfficialConflict } from './cases/golf-current-official-conflict.ts';
import { seatLeonEhybridCrossMarket } from './cases/seat-leon-ehybrid-cross-market.ts';
import { teslaModel3IntraYear } from './cases/tesla-model3-2021-intra-year.ts';

export { uid, RETRIEVED } from './builders.ts';
export { SOURCES } from './sources.ts';
export { GOLF_2018_IDS } from './cases/golf-2018-two-homologations.ts';
export { X3_2018_IDS } from './cases/bmw-x3-2018-range.ts';
export { BYD_SEAL_IDS } from './cases/byd-seal-battery-unspecified.ts';
export { LEON_EHYBRID_IDS } from './cases/seat-leon-ehybrid-cross-market.ts';
export { MODEL3_2021_IDS } from './cases/tesla-model3-2021-intra-year.ts';
export { GOLF_CURRENT_IDS } from './cases/golf-current-official-conflict.ts';

/**
 * Los seis casos de validación técnica del schema v0.2 (Step 3).
 * Derivados de borradores de curación Dataset Core v0.1: NO son dataset publicable.
 */
export const SCHEMA_VALIDATION_CASES = {
  golf2018TwoHomologations,
  bmwX3Range,
  bydSealBatteryUnspecified,
  seatLeonEhybridCrossMarket,
  teslaModel3IntraYear,
  golfCurrentOfficialConflict,
} satisfies Record<string, DatasetBundleInput>;

export type CaseName = keyof typeof SCHEMA_VALIDATION_CASES;

/** Caso validado y normalizado (defaults aplicados). */
export function loadCase(name: CaseName): DatasetBundle {
  return DatasetBundle.parse(SCHEMA_VALIDATION_CASES[name]);
}

/** Todos los casos en un único bundle (fuentes compartidas deduplicadas). */
export function loadAllCases(): DatasetBundle {
  const parts = Object.values(SCHEMA_VALIDATION_CASES);
  const dedupe = <T extends { id: string }>(xs: T[]) => [...new Map(xs.map((x) => [x.id, x])).values()];
  return DatasetBundle.parse({
    sources: dedupe(parts.flatMap((p) => p.sources)),
    homologations: parts.flatMap((p) => p.homologations),
    variants: parts.flatMap((p) => p.variants),
    spec_values: parts.flatMap((p) => p.spec_values),
    prices: parts.flatMap((p) => p.prices ?? []),
    incentives: parts.flatMap((p) => p.incentives ?? []),
    safety_ratings: parts.flatMap((p) => p.safety_ratings ?? []),
  });
}
