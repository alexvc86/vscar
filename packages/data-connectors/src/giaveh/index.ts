import { createReadStream } from 'node:fs';
import { readCsvRows } from '../acquisition/csv.ts';
import { normalizeTan } from '../eea/normalize.ts';

/**
 * GIAVEH (S12) — "Consulta Fichas Reducidas" del Ministerio de Industria y Turismo (datos.gob.es `e05231501-consulta-fichas-reducidas1`).
 * Verificado el 2026-10-16: CSV (7.221.476 B, `Last-Modified` 2023-08-31), XLSX y API REST con el MISMO contenido:
 * número de ficha reducida, contraseña de homologación (TAN con extensión), tipo, fabricante y marcas.
 * **No contiene Va/Ve ni datos técnicos** → solo sirve para comprobar que un TAN (con su extensión) y su `Tipo`
 * constan en el registro español. No se construye un adapter de enriquecimiento (no hay nada que enriquecer).
 *
 * `Fabricante` se descarta al leer: en fabricantes de series cortas es el nombre de una persona física.
 * Condiciones de reutilización: aviso legal de la sede (art. 8 Ley 37/2007): sin alterar, sin desnaturalizar,
 * citar la fuente y la fecha de última actualización.
 */
export const GIAVEH_DATASET = {
  source_code: 'S12',
  name: 'Ministerio de Industria y Turismo — GIAVEH: Consulta Fichas Reducidas',
  catalog_url: 'https://datos.gob.es/es/catalogo/e05231501-consulta-fichas-reducidas1',
  csv_url: 'https://www6.serviciosmin.gob.es/Aplicaciones/OpenDataModule_AC202101/UbicacionGIAVEH/Consulta%20Fichas%20Reducidas.csv',
  api_url: 'https://web.serviciosmin.gob.es/datosabiertosapi/swagger/index.html',
  license_url: 'https://sede.serviciosmin.gob.es/es-ES/Paginas/aviso.aspx#Reutilizacion',
  attribution: 'Ministerio de Industria y Turismo — GIAVEH, Consulta Fichas Reducidas',
} as const;

export const GIAVEH_EXPECTED_HEADER = ['Num F.R.', 'Contraseña', 'Tipo', 'Fabricante', 'Marcas'] as const;

export interface GiavehRecord {
  fichaId: string;
  tan: string;
  tanRaw: string;
  type: string;
  brands: string[];
  line: number;
}

export async function readGiavehCsv(params: { path: string; source?: AsyncIterable<string | Buffer> }): Promise<{ records: GiavehRecord[]; rows: number; issues: string[] }> {
  const records: GiavehRecord[] = [];
  const issues: string[] = [];
  let header: string[] | undefined;
  let rows = 0;
  for await (const r of readCsvRows(params.source ?? createReadStream(params.path))) {
    if (!header) {
      header = r.fields.map((h) => h.trim());
      const missing = GIAVEH_EXPECTED_HEADER.filter((c) => !header!.includes(c));
      if (missing.length) throw new Error(`GIAVEH schema drift: missing ${missing.join(', ')}`);
      continue;
    }
    if (r.fields.length === 1 && r.fields[0] === '') continue;
    rows++;
    const get = (c: (typeof GIAVEH_EXPECTED_HEADER)[number]) => (r.fields[header!.indexOf(c)] ?? '').trim();
    const tanRaw = get('Contraseña');
    if (!tanRaw) {
      issues.push(`line ${r.line}: empty Contraseña`);
      continue;
    }
    records.push({ fichaId: get('Num F.R.'), tan: normalizeTan(tanRaw), tanRaw, type: get('Tipo').toUpperCase(), brands: get('Marcas').split(';').map((b) => b.trim()).filter(Boolean), line: r.line });
  }
  return { records, rows, issues };
}

/** ¿Consta el TAN completo en GIAVEH, y con qué `Tipo`? */
export function giavehLookup(index: ReadonlyMap<string, GiavehRecord[]>, tan: string, eeaTypes: readonly string[]): { status: 'TAN_AND_TYPE' | 'TAN_TYPE_DIFFERS' | 'TAN_NOT_FOUND'; records: GiavehRecord[] } {
  const recs = index.get(normalizeTan(tan)) ?? [];
  if (!recs.length) return { status: 'TAN_NOT_FOUND', records: [] };
  const types = new Set(eeaTypes.map((t) => t.toUpperCase()));
  return { status: recs.some((r) => types.has(r.type)) ? 'TAN_AND_TYPE' : 'TAN_TYPE_DIFFERS', records: recs };
}

export function indexGiaveh(records: readonly GiavehRecord[]): Map<string, GiavehRecord[]> {
  const m = new Map<string, GiavehRecord[]>();
  for (const r of records) m.set(r.tan, [...(m.get(r.tan) ?? []), r]);
  return m;
}
