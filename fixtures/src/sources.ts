import type { SourceInput } from '@vscar/vehicle-schema';
import { uid } from './builders.ts';

const src = (key: string, s: Omit<SourceInput, 'id'>): SourceInput => ({ id: uid(`source:${key}`), ...s });

/** Registro de fuentes usado por los fixtures (códigos de DATA_RIGHTS_MATRIX v0.2 §2). Derechos: ❓ (no verificados). */
export const SOURCES = {
  eea: src('eea', { code: 'S01', name: 'EEA — CO2 emissions from new passenger cars (discodata)', source_authority: 'OFFICIAL_AUTHORITY', market_code: 'EU', base_url: 'https://discodata.eea.europa.eu/' }),
  miteco: src('miteco', { code: 'S03', name: 'MITECO — Geoportal de gasolineras (precios de carburantes)', source_authority: 'OFFICIAL_AUTHORITY', market_code: 'ES', base_url: 'https://sedeaplicaciones.minetur.gob.es/ServiciosRESTCarburantes/PreciosCarburantes' }),
  esios: src('esios', { code: 'S04', name: 'REE / ESIOS — PVPC 2.0TD (término de energía)', source_authority: 'OFFICIAL_AUTHORITY', market_code: 'ES', base_url: 'https://api.esios.ree.es' }),
  idae: src('idae', { code: 'S02', name: 'IDAE — base de datos de consumo y emisiones', source_authority: 'OFFICIAL_AUTHORITY', market_code: 'ES', base_url: 'https://coches.idae.es/' }),
  euroNcap: src('euroncap', { code: 'S05', name: 'Euro NCAP', source_authority: 'VERIFIED_EDITORIAL', market_code: 'EU', base_url: 'https://www.euroncap.com/' }),
  dgt: src('dgt', { code: 'S07', name: 'DGT — distintivo ambiental (reglas)', source_authority: 'OFFICIAL_AUTHORITY', market_code: 'ES', base_url: 'https://www.dgt.es/' }),
  vwEs: src('vw-es', { code: 'S08', name: 'Volkswagen España (configurador, catálogos)', source_authority: 'OFFICIAL_MANUFACTURER', market_code: 'ES', base_url: 'https://www.volkswagen.es/' }),
  bmwEs: src('bmw-es', { code: 'S08', name: 'BMW Ibérica — PressClub', source_authority: 'OFFICIAL_MANUFACTURER', market_code: 'ES', base_url: 'https://www.press.bmwgroup.com/spain/' }),
  bydEs: src('byd-es', { code: 'S08', name: 'BYD España (web, catálogo, prensa)', source_authority: 'OFFICIAL_MANUFACTURER', market_code: 'ES', base_url: 'https://www.byd.com/es-es/' }),
  seatEs: src('seat-es', { code: 'S08', name: 'SEAT España (web, media center, tarifas)', source_authority: 'OFFICIAL_MANUFACTURER', market_code: 'ES', base_url: 'https://www.seat.es/' }),
  seatDe: src('seat-de', { code: 'S08-EU', name: 'SEAT Deutschland', source_authority: 'OFFICIAL_MANUFACTURER', market_code: 'DE', base_url: 'https://www.seat.de/' }),
  teslaEs: src('tesla-es', { code: 'S08', name: 'Tesla España (web y configurador archivados, manual)', source_authority: 'OFFICIAL_MANUFACTURER', market_code: 'ES', base_url: 'https://www.tesla.com/es_es' }),
  evDatabase: src('ev-database', { code: 'C07', name: 'EV Database (sin licencia: SECONDARY_REFERENCE)', source_authority: 'SECONDARY_REFERENCE', market_code: 'EU', base_url: 'https://ev-database.org/' }),
} satisfies Record<string, SourceInput>;
