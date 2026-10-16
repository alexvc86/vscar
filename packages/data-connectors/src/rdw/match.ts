import { normalizeTan } from '../eea/normalize.ts';
import { tanBaseOf } from '../eea/survey.ts';
import { normCode, type RdwVersion } from './normalize.ts';

/**
 * Emparejamiento de identidad técnica EEA ↔ RDW (ADR-007, D1 de Step 2). Solo hay coincidencia con el TAN completo
 * (incluida la extensión `*NN`), la variante y la versión. Cualquier otra coincidencia parcial se registra como
 * evidencia y NO aporta valores:
 * - `TAN_EXTENSION_MISMATCH`: misma Va/Ve bajo otra extensión de la misma homologación base (otra revisión del TAN).
 * - `VARIANT_MISMATCH`: mismo TAN y Ve con otra Va (p. ej. 3 puertas vs 5 puertas del Golf).
 * - `OTHER_APPROVAL`: misma Va/Ve bajo otra homologación (otro Estado emisor o serie corta `KS`).
 * Varias revisiones RDW (`volgnummerrevisieuitvoering`) de la versión exacta se conservan todas.
 */
export type RdwMatchLevel = 'EXACT' | 'TAN_EXTENSION_MISMATCH' | 'VARIANT_MISMATCH' | 'OTHER_APPROVAL' | 'NONE';

export interface RdwMatch {
  level: RdwMatchLevel;
  /** Estado de identidad técnica en la escala del proyecto. */
  identity: 'EXACT' | 'PARTIAL' | 'UNCONFIRMED';
  /** Revisiones de la versión exacta (vacío si no hay EXACT). */
  versions: RdwVersion[];
  /** Evidencia no usada (otras extensiones, variantes u homologaciones). */
  nearMisses: Array<{ level: Exclude<RdwMatchLevel, 'EXACT' | 'NONE'>; tan: string; variant: string; version: string }>;
  notes: string[];
}

export function matchRdw(eea: { tan: string; variant: string; version: string }, versions: readonly RdwVersion[]): RdwMatch {
  const tan = normalizeTan(eea.tan);
  const va = normCode(eea.variant);
  const ve = normCode(eea.version);
  const base = tanBaseOf(tan);
  const exact = versions.filter((v) => v.tan === tan && v.variant === va && v.version === ve);
  const near: RdwMatch['nearMisses'] = [];
  for (const v of versions) {
    if (exact.includes(v)) continue;
    const level = v.version !== ve ? undefined : v.variant === va && v.tanBase === base ? 'TAN_EXTENSION_MISMATCH' : v.tan === tan ? 'VARIANT_MISMATCH' : v.variant === va ? 'OTHER_APPROVAL' : undefined;
    if (level && !near.some((n) => n.tan === v.tan && n.variant === v.variant && n.level === level)) near.push({ level, tan: v.tan, variant: v.variant, version: v.version });
  }
  const notes: string[] = [];
  if (exact.length) {
    const revs = exact.map((v) => v.revision).sort((a, b) => a - b);
    notes.push(`RDW TGK exact TAN+Va+Ve: ${tan} / ${va} / ${ve} (${exact.length} revision(s): ${revs.join(', ')})`);
    return { level: 'EXACT', identity: 'EXACT', versions: [...exact].sort((a, b) => a.revision - b.revision), nearMisses: near, notes };
  }
  const ext = near.filter((n) => n.level === 'TAN_EXTENSION_MISMATCH');
  if (ext.length) {
    notes.push(`same Va/Ve only under other TAN extension(s) ${ext.map((n) => n.tan).join(', ')}: a TAN revision is not assumed equivalent → values not used`);
    return { level: 'TAN_EXTENSION_MISMATCH', identity: 'PARTIAL', versions: [], nearMisses: near, notes };
  }
  if (near.some((n) => n.level === 'VARIANT_MISMATCH')) {
    notes.push('same TAN and version under another variant only → not used');
    return { level: 'VARIANT_MISMATCH', identity: 'UNCONFIRMED', versions: [], nearMisses: near, notes };
  }
  if (near.some((n) => n.level === 'OTHER_APPROVAL')) {
    notes.push(`same Va/Ve under another approval only (${[...new Set(near.map((n) => n.tan))].join(', ')}) → different homologation, not used`);
    return { level: 'OTHER_APPROVAL', identity: 'UNCONFIRMED', versions: [], nearMisses: near, notes };
  }
  notes.push('no RDW TGK record for this Va/Ve');
  return { level: 'NONE', identity: 'UNCONFIRMED', versions: [], nearMisses: near, notes };
}
