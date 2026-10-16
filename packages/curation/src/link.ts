import type { IdaeRecord, SurveyValueField } from '@vscar/data-connectors';
import { familyOfIdaeRecord } from './families.ts';
import type { CurationCluster, TechnicalIdentity } from './clusters.ts';

/**
 * Enlace EEA (identidad técnica) ↔ IDAE (versión comercial en España). Dos métodos, nunca mezclados:
 * - OFFICIAL_CODE: el texto de la versión IDAE contiene "(Va/Ve)" y coincide carácter a carácter con la EEA
 *   (Step 4c, BYD). Es evidencia oficial de identidad.
 * - VALUES: misma familia, powertrain, combustible, potencia (kW o CV del texto) y periodo; consumo coherente.
 *   Es una coincidencia de valores → nunca supera UNCONFIRMED (HOMOLOGATION_MATCH_REPORT).
 */
export interface IdaeLink {
  method: 'OFFICIAL_CODE' | 'VALUES' | 'NONE';
  records: IdaeRecord[];
  /** Versiones comerciales distintas (texto) enlazadas. */
  distinctVersions: number;
  /** Potencias distintas declaradas por las versiones enlazadas (señal de mezcla). */
  distinctPowersKw: number[];
  /** Código IDAE que coincide con Va pero no con ninguna Ve del clúster (→ PARTIAL). */
  variantOnlyCode?: string;
  /** Identidad técnica (`TAN|Va|Ve`) que el código oficial identifica (puede ser una versión hermana). */
  matchedIdentityId?: string;
  /** Enlace por valores descartado por un contraste fallido: el enlace era probablemente erróneo (no es un conflicto de fuentes). */
  rejected?: string;
  checks: string[];
  conflicts: string[];
}

const PT: Record<string, IdaeRecord['powertrain'][]> = {
  ICE: ['ICE'],
  NOVC_HEV: ['HEV'],
  OVC_HEV: ['PHEV', 'EREV'],
  BEV: ['BEV'],
  FCEV: ['FCEV'],
};
const CV_TO_KW = 0.7355;

function powerMatches(rec: IdaeRecord, kw: number | undefined, hybrid: boolean): boolean | undefined {
  if (kw === undefined) return undefined;
  const kws = rec.hints.kw;
  const cvs = rec.hints.cv.map((c) => c * CV_TO_KW);
  if (kws.length === 0 && cvs.length === 0) return undefined;
  // HEV/PHEV: la EEA da potencia térmica; el texto IDAE puede dar potencia de sistema → solo se acepta coincidencia exacta del térmico.
  const tol = hybrid ? 1 : 1.5;
  return [...kws, ...cvs].some((p) => Math.abs(p - kw) <= tol);
}

function yearsOf(rec: IdaeRecord): number[] {
  return [rec.dates.alta, rec.dates.actualizacion, rec.dates.comercializacion].filter((d): d is string => !!d).map((d) => Number(d.slice(0, 4)));
}

function fcRange(t: TechnicalIdentity): { min: number; max: number } | undefined {
  const vals = t.byYear.flatMap((g) => (g.distributions['Fc' as SurveyValueField] ?? []).map(([v]) => v)).filter((v) => v > 0);
  return vals.length ? { min: Math.min(...vals), max: Math.max(...vals) } : undefined;
}

export function linkIdae(cluster: CurationCluster, idae: readonly IdaeRecord[]): IdaeLink {
  const rep = cluster.representative;
  const members = [rep, ...cluster.siblings];
  const versions = new Set(members.map((t) => t.byYear[0]!.version));
  const variant = rep.byYear[0]!.variant;
  const family = idae.filter((r) => r.scope === 'MAINLAND' && r.category === 'M1' && familyOfIdaeRecord(cluster.family, r.make, r.model));

  // 1) Código oficial.
  const coded = family.filter((r) => r.hints.codeCandidate?.variant.toUpperCase() === variant);
  const exact = coded.filter((r) => versions.has(r.hints.codeCandidate!.version.toUpperCase()));
  if (exact.length > 0) {
    // La versión identificada manda: si es una hermana, el candidato pasa a representarla (nunca se transfiere la evidencia).
    const byVersion = new Map<string, IdaeRecord[]>();
    for (const r of exact) {
      const v = r.hints.codeCandidate!.version.toUpperCase();
      byVersion.set(v, [...(byVersion.get(v) ?? []), r]);
    }
    const matched = members.filter((m) => byVersion.has(m.byYear[0]!.version)).sort((a, b) => b.registrations - a.registrations)[0]!;
    const recs = byVersion.get(matched.byYear[0]!.version)!;
    return {
      method: 'OFFICIAL_CODE',
      records: recs,
      distinctVersions: new Set(recs.map((r) => r.version)).size,
      distinctPowersKw: [],
      checks: [`IDAE code ${variant}/${matched.byYear[0]!.version} = EEA Va/Ve (character by character)`],
      conflicts: [],
      matchedIdentityId: matched.id,
    };
  }

  // 2) Valores.
  const allowed = PT[cluster.homologationPowertrain] ?? [];
  const hybrid = cluster.homologationPowertrain === 'NOVC_HEV' || cluster.homologationPowertrain === 'OVC_HEV';
  const [y0, y1] = [Math.min(...cluster.years), Math.max(...cluster.years)];
  const checks: string[] = [];
  const conflicts: string[] = [];
  const candidates = family.filter((r) => {
    if (!r.powertrain || !allowed.includes(r.powertrain)) return false;
    if (cluster.fuel && r.fuel && r.fuel !== cluster.fuel) return false;
    const ys = yearsOf(r);
    if (ys.length && !ys.some((y) => y >= y0 - 1 && y <= y1 + 1)) return false;
    return powerMatches(r, cluster.enginePowerKw, hybrid) === true;
  });
  const result: IdaeLink = {
    method: candidates.length ? 'VALUES' : 'NONE',
    records: candidates,
    distinctVersions: new Set(candidates.map((r) => r.version)).size,
    distinctPowersKw: [...new Set(candidates.flatMap((r) => r.hints.kw))].sort((a, b) => a - b),
    checks,
    conflicts,
    ...(coded.length > 0 ? { variantOnlyCode: `${variant}/${coded[0]!.hints.codeCandidate!.version}` } : {}),
  };
  if (!candidates.length) return result;

  checks.push(`family+powertrain+fuel+power(${cluster.enginePowerKw} kW)+period ${y0}–${y1}: ${candidates.length} IDAE rows`);
  // Contraste de consumo: rango WLTP IDAE vs Fc EEA (solo con ambos datos).
  const fc = fcRange(rep);
  const idaeFuel = candidates.filter((r) => r.values.fuelWltpMin !== undefined && r.values.fuelWltpMax !== undefined);
  if (fc && idaeFuel.length) {
    const overlaps = idaeFuel.filter((r) => r.values.fuelWltpMin! - 0.05 <= fc.max && r.values.fuelWltpMax! + 0.05 >= fc.min);
    if (overlaps.length) {
      checks.push(`fuel consumption overlaps: EEA Fc ${fc.min}–${fc.max} vs IDAE WLTP range (${overlaps.length}/${idaeFuel.length} rows)`);
      result.records = overlaps;
      result.distinctVersions = new Set(overlaps.map((r) => r.version)).size;
    } else {
      // Un enlace por valores que no supera el contraste se descarta: no es un conflicto entre fuentes oficiales.
      return { ...result, method: 'NONE', records: [], distinctVersions: 0, distinctPowersKw: [], checks: [], rejected: `value link rejected: EEA Fc ${fc.min}–${fc.max} outside every IDAE WLTP range (${idaeFuel.length} rows)` };
    }
  }
  // Contraste eléctrico (BEV/PHEV): consumo kWh/100 km.
  const z = rep.byYear.flatMap((g) => (g.distributions['Z (Wh/km)'] ?? []).map(([v]) => v / 10));
  const idaeKwh = result.records.map((r) => r.values.electricKwh100).filter((v): v is number => v !== undefined);
  if (z.length && idaeKwh.length) {
    const lo = Math.min(...z), hi = Math.max(...z);
    const ok = idaeKwh.some((v) => v >= lo - 0.3 && v <= hi + 0.3);
    if (ok) checks.push(`electric consumption consistent: EEA ${lo}–${hi} kWh/100 km`);
    else return { ...result, method: 'NONE', records: [], distinctVersions: 0, distinctPowersKw: [], checks: [], rejected: `value link rejected: EEA ${lo}–${hi} vs IDAE ${Math.min(...idaeKwh)}–${Math.max(...idaeKwh)} kWh/100 km` };
  }
  return result;
}
