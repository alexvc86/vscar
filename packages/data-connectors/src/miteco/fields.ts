import type { FuelProduct, EsTaxZone } from '@vscar/vehicle-schema';

/**
 * MITECO — Geoportal de gasolineras (S03). Servicio REST de precios de carburantes en estaciones terrestres.
 * Verificado 2026-09-24:
 * - Licencia: CC BY 4.0, publicador Ministerio para la Transición Ecológica y el Reto Demográfico
 *   (https://catalogo.datosabiertos.miteco.gob.es/catalogo/es/dataset/214e0895-b3aa-4662-8ebe-18134c21fb45),
 *   datos calificados por el publicador como provisionales.
 * - Precios = PVP con impuestos (Orden ITC/2308/2007; FAQ MITECO), €/L, decimal con coma, "" = no vende.
 * - `EstacionesTerrestresHist/{dd-MM-yyyy}` devuelve los precios en vigor a las 0:00 (hora peninsular) de ese día;
 *   la respuesta es determinista (misma fecha → mismo contenido). El último día disponible es ayer.
 */
export const MITECO_DATASET = {
  source_code: 'S03',
  name: 'MITECO — Precios de carburantes en estaciones de servicio (Geoportal)',
  base_url: 'https://sedeaplicaciones.minetur.gob.es/ServiciosRESTCarburantes/PreciosCarburantes',
  license: 'CC BY 4.0',
  attribution: 'Ministerio para la Transición Ecológica y el Reto Demográfico — Geoportal de gasolineras, CC BY 4.0',
  terms_url: 'https://catalogo.datosabiertos.miteco.gob.es/catalogo/es/dataset/214e0895-b3aa-4662-8ebe-18134c21fb45',
  taxes_evidence_url: 'https://www.miteco.gob.es/en/energia/hidrocarburos-nuevos-combustibles/petroleo/faqs.html',
  source_timezone: 'Europe/Madrid',
  /** Primer día con histórico observado. */
  first_history_date: '2007-01-01',
} as const;

export const MITECO_ADAPTER_VERSION = '0.1.0';
export const MITECO_TRANSFORMATION_VERSION = 1;

/** Campo de la respuesta → producto VScar. Solo productos líquidos en €/L (GNC/GNL/H₂ se venden por kg: no mapeados). */
export const MITECO_PRODUCT_FIELDS: Readonly<Record<FuelProduct, string>> = {
  PETROL_95_E5: 'Precio Gasolina 95 E5',
  PETROL_95_E10: 'Precio Gasolina 95 E10',
  PETROL_98_E5: 'Precio Gasolina 98 E5',
  DIESEL_A: 'Precio Gasoleo A',
  DIESEL_A_PREMIUM: 'Precio Gasoleo Premium',
  LPG: 'Precio Gases licuados del petróleo',
};

/** Límites de parseo (no de plausibilidad de mercado): fuera de ellos el precio se excluye y se cuenta, nunca se corrige. */
export const MITECO_PRICE_BOUNDS_EUR_PER_L = { min: 0.3, max: 5 } as const;

/**
 * `IDCCAA` de MITECO → ISO 3166-2 y zona fiscal. Los ids de MITECO **no** son los códigos INE de CCAA
 * (07/08 están intercambiados). Contrastado con `Listados/ComunidadesAutonomas` (test).
 */
export const MITECO_REGIONS: Readonly<Record<string, { iso: string; name: string; tax_zone: EsTaxZone }>> = {
  '01': { iso: 'ES-AN', name: 'Andalucia', tax_zone: 'PENINSULA_BALEARES' },
  '02': { iso: 'ES-AR', name: 'Aragón', tax_zone: 'PENINSULA_BALEARES' },
  '03': { iso: 'ES-AS', name: 'Asturias', tax_zone: 'PENINSULA_BALEARES' },
  '04': { iso: 'ES-IB', name: 'Baleares', tax_zone: 'PENINSULA_BALEARES' },
  '05': { iso: 'ES-CN', name: 'Canarias', tax_zone: 'CANARIAS' },
  '06': { iso: 'ES-CB', name: 'Cantabria', tax_zone: 'PENINSULA_BALEARES' },
  '07': { iso: 'ES-CM', name: 'Castilla la Mancha', tax_zone: 'PENINSULA_BALEARES' },
  '08': { iso: 'ES-CL', name: 'Castilla y León', tax_zone: 'PENINSULA_BALEARES' },
  '09': { iso: 'ES-CT', name: 'Cataluña', tax_zone: 'PENINSULA_BALEARES' },
  '10': { iso: 'ES-VC', name: 'Comunidad Valenciana', tax_zone: 'PENINSULA_BALEARES' },
  '11': { iso: 'ES-EX', name: 'Extremadura', tax_zone: 'PENINSULA_BALEARES' },
  '12': { iso: 'ES-GA', name: 'Galicia', tax_zone: 'PENINSULA_BALEARES' },
  '13': { iso: 'ES-MD', name: 'Madrid', tax_zone: 'PENINSULA_BALEARES' },
  '14': { iso: 'ES-MC', name: 'Murcia', tax_zone: 'PENINSULA_BALEARES' },
  '15': { iso: 'ES-NC', name: 'Navarra', tax_zone: 'PENINSULA_BALEARES' },
  '16': { iso: 'ES-PV', name: 'País Vasco', tax_zone: 'PENINSULA_BALEARES' },
  '17': { iso: 'ES-RI', name: 'Rioja (La)', tax_zone: 'PENINSULA_BALEARES' },
  '18': { iso: 'ES-CE', name: 'Ceuta', tax_zone: 'CEUTA' },
  '19': { iso: 'ES-ML', name: 'Melilla', tax_zone: 'MELILLA' },
};
