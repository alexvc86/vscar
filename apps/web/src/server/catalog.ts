import 'server-only';
import { createVehicleCatalogService, type VehicleCatalogService } from './catalog-service';
import { catalogReader } from './db';
import { serverEnv } from './env';

/** Servicio de catálogo del proceso (canal fijo por despliegue; sobrevive al HMR en desarrollo). */
const g = globalThis as unknown as { __vscarCatalog?: VehicleCatalogService };

export function vehicleCatalog(): VehicleCatalogService {
  g.__vscarCatalog ??= createVehicleCatalogService({ reader: catalogReader, channel: serverEnv().channel });
  return g.__vscarCatalog;
}
