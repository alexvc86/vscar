import 'server-only';
import { createTechnicalCurationRepository } from '@vscar/db';
import { diagnosticVehicle, type DiagnosticVehicle } from '@/domain/technical-diagnostics';
import { catalogDb } from './db';

/** Step D1.6 — lectura de la capa de curación técnica para la vista interna (nunca para el selector ni los motores). */
export async function technicalCatalogDiagnostics(market: 'ES'): Promise<{ vehicles: DiagnosticVehicle[] }> {
  const repo = createTechnicalCurationRepository(catalogDb());
  const list = await repo.listVehicles(market);
  const details = await repo.loadVehicles(list.map((v) => v.id));
  return { vehicles: details.map(diagnosticVehicle).sort((a, b) => a.name.localeCompare(b.name) || a.registration.localeCompare(b.registration)) };
}
