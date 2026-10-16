import { co2ByCycle, type EeaTechnicalGroup, type SurveyValueField } from '@vscar/data-connectors';
import { FAMILIES, familyOfEeaRow, periodOfYear, type FamilyDefinition } from './families.ts';

/**
 * Deduplicación (Step D1 §11): matriculaciones → grupos técnicos (TAN/Va/Ve por año, en data-connectors) →
 * identidades técnicas (mismo TAN/Va/Ve en varios años) → clústeres de curación.
 *
 * Un clúster es la PROPUESTA de una ReferenceVariant: misma familia, homologación base (TAN sin extensión),
 * variante (Va), powertrain, combustible, cilindrada, potencia y ciclo de homologación (NEDC ≠ WLTP). Su representante es la versión (Ve) con más
 * matriculaciones; las demás versiones son hermanas (se cuentan, nunca se fusionan sus valores).
 */
export interface TechnicalIdentity {
  /** `TAN|Va|Ve` normalizados. */
  id: string;
  family: FamilyDefinition;
  /** Familias que también reclaman el `Cn` (ambigüedad comercial). */
  familyAmbiguity: string[];
  byYear: EeaTechnicalGroup[];
  registrations: number;
  /** Valores que cambian entre años para la misma identidad: se conservan por año y se señalan. */
  crossYearDifferences: string[];
}

export interface CurationCluster {
  key: string;
  family: FamilyDefinition;
  representative: TechnicalIdentity;
  siblings: TechnicalIdentity[];
  homologationPowertrain: string;
  fuel?: string;
  engineCapacityCc?: number;
  enginePowerKw?: number;
  registrations: number;
  years: number[];
  period: string;
}

const mode = (d: Array<[number, number]> | undefined) => (d && d.length ? [...d].sort((a, b) => b[1] - a[1] || a[0] - b[0])[0]![0] : undefined);

export function assignFamilies(groups: readonly EeaTechnicalGroup[], families: readonly FamilyDefinition[] = FAMILIES): Array<{ group: EeaTechnicalGroup; family: FamilyDefinition; ambiguity: string[] }> {
  const out: Array<{ group: EeaTechnicalGroup; family: FamilyDefinition; ambiguity: string[] }> = [];
  for (const g of groups) {
    const names = g.commercialNames.length ? g.commercialNames : [''];
    const matches = families.filter((f) => f.eeaMakes.includes(g.make) && names.some((cn) => g.types.some((t) => familyOfEeaRow(f, cn, t)) || (g.types.length === 0 && familyOfEeaRow(f, cn, ''))));
    if (matches.length === 0) continue;
    out.push({ group: g, family: matches[0]!, ambiguity: matches.slice(1).map((f) => f.id) });
  }
  return out;
}

const COMPARED: readonly SurveyValueField[] = ['Ec (cm3)', 'Ep (KW)', 'Ewltp (g/km)', 'Enedc (g/km)', 'E (g/km)', 'Z (Wh/km)', 'Zr', 'Fc'];

export function buildTechnicalIdentities(assigned: ReturnType<typeof assignFamilies>): TechnicalIdentity[] {
  const map = new Map<string, TechnicalIdentity>();
  for (const { group, family, ambiguity } of assigned) {
    const id = `${group.tan}|${group.variant}|${group.version}`;
    const t = map.get(id) ?? { id, family, familyAmbiguity: [], byYear: [], registrations: 0, crossYearDifferences: [] };
    t.byYear.push(group);
    t.registrations += group.registrations;
    t.familyAmbiguity = [...new Set([...t.familyAmbiguity, ...ambiguity])];
    map.set(id, t);
  }
  for (const t of map.values()) {
    t.byYear.sort((a, b) => a.year - b.year);
    for (const f of COMPARED) {
      const sets = t.byYear.map((g) => JSON.stringify((g.distributions[f] ?? []).map(([v]) => v)));
      if (new Set(sets.filter((s) => s !== '[]')).size > 1) t.crossYearDifferences.push(`${f} differs between years ${t.byYear.map((g) => g.year).join('/')}`);
    }
  }
  return [...map.values()];
}

function signature(t: TechnicalIdentity) {
  const all = (f: SurveyValueField) => {
    const merged = new Map<number, number>();
    for (const g of t.byYear) for (const [v, n] of g.distributions[f] ?? []) merged.set(v, (merged.get(v) ?? 0) + n);
    return [...merged.entries()];
  };
  const g0 = t.byYear[0]!;
  // Ciclo de homologación: una identidad solo NEDC y otra con WLTP nunca comparten clúster (ADR-007, Golf 2018 *33/*35).
  const cycle = all('Ewltp (g/km)').length > 0 ? 'WLTP' : all('Enedc (g/km)').length > 0 || all('E (g/km)').length > 0 ? 'NEDC' : 'NONE';
  return { hp: g0.homologationPowertrain, fuel: g0.fuel, ec: mode(all('Ec (cm3)')), ep: mode(all('Ep (KW)')), tanBase: g0.tanBase, va: g0.variant, cycle };
}

export function buildClusters(identities: readonly TechnicalIdentity[]): CurationCluster[] {
  const map = new Map<string, TechnicalIdentity[]>();
  for (const t of identities) {
    const s = signature(t);
    const key = [t.family.id, s.hp, s.fuel ?? '?', s.ec ?? '-', s.ep ?? '?', s.tanBase, s.va, s.cycle].join('|');
    map.set(key, [...(map.get(key) ?? []), t]);
  }
  return [...map.entries()]
    .map(([key, members]) => {
      const sorted = [...members].sort((a, b) => b.registrations - a.registrations || a.id.localeCompare(b.id));
      const rep = sorted[0]!;
      const s = signature(rep);
      const years = [...new Set(members.flatMap((m) => m.byYear.map((g) => g.year)))].sort();
      return {
        key,
        family: rep.family,
        representative: rep,
        siblings: sorted.slice(1),
        homologationPowertrain: s.hp,
        ...(s.fuel ? { fuel: s.fuel } : {}),
        ...(s.ec !== undefined ? { engineCapacityCc: s.ec } : {}),
        ...(s.ep !== undefined ? { enginePowerKw: s.ep } : {}),
        registrations: members.reduce((n, m) => n + m.registrations, 0),
        years,
        period: periodOfYear(rep.byYear[rep.byYear.length - 1]!.year),
      };
    })
    .sort((a, b) => b.registrations - a.registrations || a.key.localeCompare(b.key));
}

/**
 * Gemelos por valores: otros clústeres de la misma familia y año con el mismo powertrain, combustible, cilindrada
 * y potencia. Si existen, un enlace comercial por valores no puede decidir cuál es (AMBIGUOUS).
 */
export function valueTwins(cluster: CurationCluster, all: readonly CurationCluster[]): CurationCluster[] {
  return all.filter(
    (c) =>
      c !== cluster &&
      c.family.id === cluster.family.id &&
      c.homologationPowertrain === cluster.homologationPowertrain &&
      c.fuel === cluster.fuel &&
      c.engineCapacityCc === cluster.engineCapacityCc &&
      c.enginePowerKw === cluster.enginePowerKw &&
      c.years.some((y) => cluster.years.includes(y)),
  );
}

/** Mismo clúster con otro representante (versión identificada por un código oficial). */
export function withRepresentative(cluster: CurationCluster, identityId: string): CurationCluster {
  if (cluster.representative.id === identityId) return cluster;
  const members = [cluster.representative, ...cluster.siblings];
  const rep = members.find((m) => m.id === identityId);
  if (!rep) throw new Error(`identity ${identityId} is not part of cluster ${cluster.key}`);
  return {
    ...cluster,
    representative: rep,
    siblings: members.filter((m) => m !== rep).sort((a, b) => b.registrations - a.registrations || a.id.localeCompare(b.id)),
    period: periodOfYear(rep.byYear[rep.byYear.length - 1]!.year),
  };
}

export { co2ByCycle };
