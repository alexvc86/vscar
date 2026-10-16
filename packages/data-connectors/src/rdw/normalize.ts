import { z } from 'zod';
import { tanBaseOf } from '../eea/survey.ts';
import { normalizeTan } from '../eea/normalize.ts';
import type { RdwDatasetName } from './fields.ts';

/**
 * Normalización de filas TGK de RDW. Socrata devuelve todo como texto: los números se parsean aquí (nunca se
 * convierte texto vacío en 0) y los códigos se normalizan solo para comparar (el original se conserva).
 */
const row = z.record(z.string(), z.union([z.string(), z.number(), z.boolean(), z.null()]).optional());
export type RdwRawRow = Record<string, string>;

export interface RdwVersion {
  /** `TAN|Va|Ve|rRevisión` normalizado. */
  key: string;
  tan: string;
  tanRaw: string;
  tanBase: string;
  variant: string;
  version: string;
  revision: number;
  validFrom?: string;
  validTo?: string;
  basis?: RdwRawRow;
  energy: RdwRawRow[];
  drive: RdwRawRow[];
  body: RdwRawRow[];
  gearbox: RdwRawRow[];
  axles: RdwRawRow[];
  names: RdwRawRow[];
}

export const normCode = (s: string | undefined) => (s ?? '').trim().toUpperCase().replace(/\s+/g, '');

/** Número de un campo RDW: '' / ausente → undefined (nunca 0); texto ilegible → undefined + issue. */
export function rdwNumber(r: RdwRawRow | undefined, field: string, issues?: string[]): number | undefined {
  const v = r?.[field];
  if (v === undefined || v === null || String(v).trim() === '') return undefined;
  const n = Number(String(v).trim());
  if (!Number.isFinite(n)) {
    issues?.push(`${field}: not a number "${v}"`);
    return undefined;
  }
  return n;
}

const asText = (r: Record<string, unknown>): RdwRawRow => Object.fromEntries(Object.entries(r).filter(([, v]) => v !== null && v !== undefined).map(([k, v]) => [k, String(v)]));

const SECTION: Record<Exclude<RdwDatasetName, 'basis'>, keyof Pick<RdwVersion, 'energy' | 'drive' | 'body' | 'gearbox' | 'axles' | 'names'>> = {
  energiebron: 'energy',
  aandrijving: 'drive',
  carrosserie: 'body',
  versnelling: 'gearbox',
  as: 'axles',
  handelsbenaming: 'names',
};

/** Une las filas de los conjuntos TGK por versión técnica (TAN + Va + Ve + revisión). */
export function groupRdwRows(byDataset: Partial<Record<RdwDatasetName, readonly unknown[]>>): { versions: RdwVersion[]; issues: string[] } {
  const issues: string[] = [];
  const map = new Map<string, RdwVersion>();
  const get = (r: RdwRawRow, variantField: string): RdwVersion | undefined => {
    const tanRaw = r.typegoedkeuringsnummer;
    const variant = normCode(r[variantField]);
    const version = normCode(r.codeuitvoeringtgk);
    const revision = Number(r.volgnummerrevisieuitvoering ?? 'NaN');
    if (!tanRaw || !variant || !version || !Number.isInteger(revision)) {
      issues.push(`row without full key (${tanRaw ?? '?'} ${variant || '?'} ${version || '?'})`);
      return undefined;
    }
    const tan = normalizeTan(tanRaw);
    const key = `${tan}|${variant}|${version}|r${revision}`;
    let v = map.get(key);
    if (!v) {
      v = { key, tan, tanRaw, tanBase: tanBaseOf(tan), variant, version, revision, energy: [], drive: [], body: [], gearbox: [], axles: [], names: [] };
      map.set(key, v);
    }
    return v;
  };
  for (const [name, rows] of Object.entries(byDataset) as Array<[RdwDatasetName, readonly unknown[]]>) {
    rows.forEach((raw, i) => {
      const p = row.safeParse(raw);
      if (!p.success) {
        issues.push(`${name} row ${i}: invalid`);
        return;
      }
      const r = asText(p.data);
      const v = get(r, name === 'handelsbenaming' ? 'codevariantgk' : 'codevarianttgk');
      if (!v) return;
      if (name === 'basis') {
        if (v.basis && JSON.stringify(v.basis) !== JSON.stringify(r)) issues.push(`${v.key}: duplicated basis row with different values`);
        v.basis ??= r;
        if (r.begindatumrevisieuitvoering) v.validFrom = r.begindatumrevisieuitvoering.slice(0, 10);
        if (r.einddatumrevisieuitvoering) v.validTo = r.einddatumrevisieuitvoering.slice(0, 10);
      } else {
        const list = v[SECTION[name]];
        // Filas idénticas repetidas en la fuente: se cuentan una vez.
        if (!list.some((x) => JSON.stringify(x) === JSON.stringify(r))) list.push(r);
      }
    });
  }
  return { versions: [...map.values()].sort((a, b) => a.key.localeCompare(b.key)), issues };
}
