import type { RobustnessRun } from '@/domain/decision';
import type { Scenario } from '@/domain/scenario';

/** Contrato del Web Worker de robustez: entrada y salida estructuradas, sin React ni DOM. */
export interface RobustnessRequest {
  id: number;
  slug: string;
  scenario: Scenario;
}
export type RobustnessResponse = ({ ok: true } & RobustnessRun & { id: number }) | { ok: false; id: number; error: string };
