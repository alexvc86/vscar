import {
  isUnspecifiedBasis,
  type MappingConfidence,
  type MeasurementBasisField,
  type SourceAuthority,
  type SpecValue,
} from '@vscar/vehicle-schema';

/**
 * Conflict Engine P0 (Catalog v0.2 §15). Multi-criterio: no resuelve por jerarquía fija.
 * Todos los valores se conservan (append-only); el resultado es una propuesta o una revisión humana.
 */

export interface ConflictCandidate {
  value_id: string;
  score: number;
  criteria: Record<string, number>;
}

export interface Conflict {
  variant_id: string;
  spec_key: string;
  value_ids: string[];
  candidates: ConflictCandidate[];
  /** Solo si un candidato destaca con margen suficiente. Nunca implica que el resto se borre. */
  proposed_value_id?: string;
  requires_human_review: boolean;
  rationale: string[];
}

export interface ConflictOptions {
  /** Tolerancia relativa para considerar dos números iguales. */
  relativeTolerance?: number;
  /** Margen mínimo de score para proponer un valor. */
  proposalMargin?: number;
}

const AUTHORITY_SCORE: Record<SourceAuthority, number> = {
  // Las dos autoridades oficiales puntúan igual a propósito: pueden estar en conflicto real.
  OFFICIAL_AUTHORITY: 3,
  OFFICIAL_MANUFACTURER: 3,
  VERIFIED_EDITORIAL: 2,
  CALCULATED: 1.5,
  ESTIMATED: 0.5,
  USER_PROVIDED: 0.5,
  SECONDARY_REFERENCE: 0,
};

const MAPPING_SCORE: Record<MappingConfidence, number> = {
  EXACT: 3,
  TRIM_LEVEL: 2.5,
  CROSS_MARKET_EXACT_HOMOLOGATION: 2.5,
  POWERTRAIN_LEVEL: 2,
  GENERATION_LEVEL: 1,
  INFERRED: 0.5,
  UNCONFIRMED: 0,
};

const HOMOLOGATION_SCORE = { NOT_APPLICABLE: 1, EXACT: 1, PARTIAL: 0.3, UNCONFIRMED: 0 } as const;

/** Ciclo efectivo para comparar: el inferido cuenta (no se muestra como declarado, pero no es un comodín). */
function effectiveCycle(v: SpecValue): string | undefined {
  if (v.test_cycle === 'UNDECLARED') return v.test_cycle_inferred;
  return v.test_cycle;
}

function cyclesCompatible(a: SpecValue, b: SpecValue): boolean {
  const x = effectiveCycle(a);
  const y = effectiveCycle(b);
  // Sin ciclo (clave sin ciclo) o UNDECLARED sin inferencia: podría ser la misma medida.
  if (x === undefined || y === undefined) return true;
  return x === y;
}

/** Dos bases son compatibles si coinciden o si alguna no está especificada (podría ser la misma medida). */
function basesCompatible(a: SpecValue, b: SpecValue): boolean {
  const fields = new Set([...Object.keys(a.measurement_basis ?? {}), ...Object.keys(b.measurement_basis ?? {})]) as Set<MeasurementBasisField>;
  for (const f of fields) {
    const x = a.measurement_basis?.[f];
    const y = b.measurement_basis?.[f];
    if (isUnspecifiedBasis(x) || isUnspecifiedBasis(y)) continue;
    if (x !== y) return false;
  }
  return true;
}

function periodsOverlap(a: SpecValue, b: SpecValue): boolean {
  const aFrom = a.valid_from ?? '0000-01-01';
  const aTo = a.valid_to ?? '9999-12-31';
  const bFrom = b.valid_from ?? '0000-01-01';
  const bTo = b.valid_to ?? '9999-12-31';
  return aFrom <= bTo && bFrom <= aTo;
}

function interval(v: SpecValue): [number, number] | undefined {
  if (typeof v.value === 'number') return [v.value, v.value];
  if (v.value_min !== undefined && v.value_max !== undefined) return [v.value_min, v.value_max];
  return undefined;
}

function valuesAgree(a: SpecValue, b: SpecValue, tol: number): boolean {
  const ia = interval(a);
  const ib = interval(b);
  if (ia && ib) {
    const slack = tol * Math.max(Math.abs(ia[1]), Math.abs(ib[1]), 1);
    return ia[0] <= ib[1] + slack && ib[0] <= ia[1] + slack;
  }
  return a.value === b.value;
}

function comparable(a: SpecValue, b: SpecValue): boolean {
  return a.variant_id === b.variant_id && a.spec_key === b.spec_key && cyclesCompatible(a, b) && basesCompatible(a, b) && periodsOverlap(a, b);
}

function score(v: SpecValue): ConflictCandidate {
  const criteria: Record<string, number> = {
    source_authority: AUTHORITY_SCORE[v.source_authority],
    mapping_confidence: MAPPING_SCORE[v.mapping_confidence],
    homologation_match: HOMOLOGATION_SCORE[v.homologation_match],
    market_match: v.source_market === v.reference_market ? 0.5 : 0,
    cycle_declared: v.test_cycle === undefined || v.test_cycle !== 'UNDECLARED' ? 0.5 : 0,
    basis_specified: Object.values(v.measurement_basis ?? {}).some((x) => x === 'UNSPECIFIED') ? 0 : 0.5,
    not_provisional: v.provisional ? 0 : 0.25,
  };
  return { value_id: v.id, score: Object.values(criteria).reduce((s, x) => s + x, 0), criteria };
}

/**
 * Detecta conflictos entre valores de la misma (variant técnica, clave, ciclo, base, periodo).
 * Determinista e independiente del orden de entrada.
 */
export function detectConflicts(values: readonly SpecValue[], options: ConflictOptions = {}): Conflict[] {
  const tol = options.relativeTolerance ?? 0.01;
  const margin = options.proposalMargin ?? 1.5;
  const sorted = [...values].sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));

  // Grafo de desacuerdos entre valores comparables; cada componente conexo es un conflicto.
  const parent = new Map(sorted.map((v) => [v.id, v.id]));
  const find = (id: string): string => {
    let root = id;
    while (parent.get(root) !== root) root = parent.get(root)!;
    parent.set(id, root);
    return root;
  };
  const inConflict = new Set<string>();
  for (let i = 0; i < sorted.length; i++) {
    for (let j = i + 1; j < sorted.length; j++) {
      const a = sorted[i]!;
      const b = sorted[j]!;
      if (comparable(a, b) && !valuesAgree(a, b, tol)) {
        inConflict.add(a.id);
        inConflict.add(b.id);
        parent.set(find(a.id), find(b.id));
      }
    }
  }

  const groups = new Map<string, SpecValue[]>();
  for (const v of sorted) {
    if (!inConflict.has(v.id)) continue;
    const root = find(v.id);
    groups.set(root, [...(groups.get(root) ?? []), v]);
  }

  const conflicts: Conflict[] = [];
  for (const group of groups.values()) {
    const candidates = group.map(score).sort((a, b) => b.score - a.score || (a.value_id < b.value_id ? -1 : 1));
    const [best, second] = candidates;
    const rationale: string[] = [];
    const officialKinds = new Set(group.filter((v) => v.source_authority.startsWith('OFFICIAL_')).map((v) => v.source_authority));
    const officialDisagreement = group.filter((v) => v.source_authority.startsWith('OFFICIAL_')).length >= 2;

    let proposed: string | undefined;
    if (best && second && best.score - second.score >= margin) {
      proposed = best.value_id;
      rationale.push(`candidate ${best.value_id} leads by ${(best.score - second.score).toFixed(2)} (margin ${margin})`);
    } else {
      rationale.push('no candidate leads by the required margin');
    }
    if (officialDisagreement) {
      rationale.push(officialKinds.size > 1 ? 'official authority and official manufacturer disagree' : 'two official sources disagree');
    }

    conflicts.push({
      variant_id: group[0]!.variant_id,
      spec_key: group[0]!.spec_key,
      value_ids: group.map((v) => v.id),
      candidates,
      ...(proposed ? { proposed_value_id: proposed } : {}),
      // Dos fuentes oficiales en desacuerdo siempre requieren revisión humana, aunque haya propuesta.
      requires_human_review: proposed === undefined || officialDisagreement,
      rationale,
    });
  }

  return conflicts.sort((a, b) => (a.spec_key < b.spec_key ? -1 : a.spec_key > b.spec_key ? 1 : a.value_ids[0]! < b.value_ids[0]! ? -1 : 1));
}
