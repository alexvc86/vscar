import type { EsTariffZone } from '@vscar/vehicle-schema';

/**
 * REE / ESIOS (S04) — fichero oficial del PVPC (archivo 70, `download_json`). Verificado 2026-09-24/25:
 * - Acceso público: `archives/70/download_json` responde sin token (un token inválido se ignora); el endpoint
 *   de indicadores (`indicators/1001`) sí exige token personal. v0.1 usa el archivo; `ESIOS_TOKEN` es opcional.
 * - Una fila por periodo horario del día local: 23 filas el día de cambio a verano, 25 el de cambio a invierno.
 *   Las etiquetas `Hora` no son fiables como hora de reloj (en el día de 25 h van de "00-01" a "24-25").
 * - `PCB` = término de energía del PVPC 2.0TD para Península, Canarias y Baleares; `CYM` = Ceuta y Melilla.
 *   €/MWh con coma decimal. Incluye coste de la energía + peajes y cargos del término de energía.
 *   **Excluye** impuestos, recargos y gravámenes (RD 216/2014, art. 7.6) y el término de potencia.
 * - Formato 2.0TD desde 2021-06-01; antes, 2.0A (`GEN`/`NOC`/`VHC`), no soportado.
 * - Día aún no publicado: HTTP 200 con `{"message":"No values for specified archive"}`. El PVPC de D se publica en D-1 (~20:15).
 * - Derechos: términos específicos de ESIOS no verificados; el aviso legal de ree.es restringe el uso comercial (ver DATA_RIGHTS_MATRIX).
 */
export const ESIOS_DATASET = {
  source_code: 'S04',
  name: 'REE / ESIOS — PVPC 2.0TD (término de energía), archivo 70',
  base_url: 'https://api.esios.ree.es',
  archive_id: 70,
  attribution: 'Red Eléctrica (REE) — e·sios, PVPC 2.0TD',
  taxes_evidence_url: 'https://www.boe.es/buscar/act.php?id=BOE-A-2014-3376',
  source_timezone: 'Europe/Madrid',
  first_supported_date: '2021-06-01',
} as const;

export const ESIOS_ADAPTER_VERSION = '0.1.0';
export const ESIOS_TRANSFORMATION_VERSION = 1;

/** Columna del archivo → zona tarifaria VScar. */
export const ESIOS_ZONE_FIELDS: Readonly<Record<EsTariffZone, string>> = {
  PENINSULA_CANARIAS_BALEARES: 'PCB',
  CEUTA_MELILLA: 'CYM',
};
