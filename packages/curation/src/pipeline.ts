import { createHash } from 'node:crypto';
import type { EeaTechnicalGroup, IdaeRecord } from '@vscar/data-connectors';
import { assignFamilies, buildClusters, buildTechnicalIdentities, valueTwins, withRepresentative, type CurationCluster } from './clusters.ts';
import { assessIdentity, curationStatus, d1Coverage, eeaSpecValues, idaeFieldsPresent, priority, productClass, productPowertrain, rightsDecision, type CuratedExact } from './assess.ts';
import { linkIdae } from './link.ts';
import { CurationCandidate, type RightsDecision } from './schema.ts';

/**
 * Pipeline D1 (puro, determinista): grupos EEA + registros IDAE → candidatos de curación validados.
 * Official Source → Raw → Checksum → Schema Inspection → Normalization → **Identity Candidate → Quality → Curation Queue**.
 */
export interface BuildInput {
  groups: readonly EeaTechnicalGroup[];
  idae: readonly IdaeRecord[];
  /** SHA-256 de los brutos usados, por fuente (trazabilidad). */
  rawSha256: { S01: string[]; S02: string[] };
  curatedExact?: CuratedExact;
  /** `TAN|Va` → id de una variant existente del catálogo (no se modifica; solo se señala). */
  existingCatalog?: ReadonlyMap<string, string>;
}

const uuid = (s: string) => {
  const h = createHash('sha256').update(s).digest('hex');
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-5${h.slice(13, 16)}-${((parseInt(h.slice(16, 18), 16) & 0x3f) | 0x80).toString(16)}${h.slice(18, 20)}-${h.slice(20, 32)}`;
};

/** Valores con base o ciclo sin declarar: la elegibilidad los trata como PARTIAL. */
const PARTIAL_KEYS = new Set(['rng.electric_combined_km', 'nrg.electric_combined_kwh100', 'nrg.fuel_combined_l100']);

export function buildCandidates(input: BuildInput): { clusters: CurationCluster[]; candidates: CurationCandidate[] } {
  const clusters = buildClusters(buildTechnicalIdentities(assignFamilies(input.groups)));
  const candidates = clusters.map((base) => {
    const link = linkIdae(base, input.idae);
    // Una versión con identidad oficial (código IDAE o curación EXACT existente) pasa a ser el representante.
    const curatedMember = [base.representative, ...base.siblings].find((m) => input.curatedExact?.has(m.id));
    const promoted = link.matchedIdentityId ?? curatedMember?.id;
    const cluster = promoted ? withRepresentative(base, promoted) : base;
    const rep = cluster.representative;
    const twins = valueTwins(base, clusters).length;
    const identity = assessIdentity(cluster, link, twins, input.curatedExact ?? new Map());
    const specValues = eeaSpecValues(cluster);
    const idaeFields = link.method === 'NONE' ? [] : idaeFieldsPresent(link.records);
    const pc = productClass(cluster, link.records);
    const available = new Set([...specValues.map((v) => v.specKey), ...idaeFields.map((f) => f.split(' ')[0]!)]);
    const coverage = d1Coverage(productPowertrain(pc.productClass), available, PARTIAL_KEYS);
    const rights: Record<string, RightsDecision> = { S01: rightsDecision('S01'), ...(link.method !== 'NONE' ? { S02: rightsDecision('S02') } : {}), S08: rightsDecision('S08') };
    const conflicts = [...rep.byYear.flatMap((g) => g.conflicts), ...rep.crossYearDifferences, ...link.conflicts];
    const latest = rep.byYear[rep.byYear.length - 1]!;
    const status = curationStatus({ identity: identity.status, missingCritical: coverage.missingCritical, rights });
    const prio = priority({
      identity: identity.status,
      linked: link.method !== 'NONE',
      criticalCompleteness: coverage.criticalCompleteness,
      registrations: cluster.registrations,
      finalData: latest.status === 'F',
      crossChecks: link.checks.length,
      conflicts: conflicts.length,
      rights,
    });
    const byYear: Record<string, number> = {};
    for (const m of [rep, ...cluster.siblings]) for (const g of m.byYear) byYear[g.year] = (byYear[g.year] ?? 0) + g.registrations;
    const periods = rep.byYear.map((g) => g.registrationPeriod).filter((p): p is { from: string; to: string } => !!p);
    const overlap = input.existingCatalog?.get(`${latest.tan}|${latest.variant}`);
    // Elegibilidad PREVIEW tras importar SOLO datos D1: alguna categoría comparable con fuentes no denegadas.
    const previewEligible = Object.values(coverage.categories).some((c) => c === 'AVAILABLE_FROM_D1' || c === 'PARTIAL_FROM_D1');

    const candidate: CurationCandidate = {
      formatVersion: 1,
      candidateId: uuid(`d1:${rep.id}`),
      shortlisted: false,
      pilot: false,
      familyId: cluster.family.id,
      sourceRefs: [
        { sourceId: 'S01', rawSha256: input.rawSha256.S01, records: [rep, ...cluster.siblings].flatMap((m) => m.byYear.map((g) => `${g.year}${g.status}:${g.tan}|${g.variant}|${g.version}`)).slice(0, 50) },
        ...(link.method !== 'NONE' ? [{ sourceId: 'S02', rawSha256: input.rawSha256.S02, records: link.records.map((r) => r.sourceRecordId).slice(0, 50) }] : []),
      ],
      commercialIdentity: { make: cluster.family.brand, family: cluster.family.label, eeaCommercialNames: [...new Set(rep.byYear.flatMap((g) => g.commercialNames))], idaeLinkedVersions: link.distinctVersions, trim: 'UNRESOLVED', generation: 'UNRESOLVED' },
      technicalIdentity: {
        typeApprovalNumber: latest.tan,
        typeApprovalBase: latest.tanBase,
        types: latest.types,
        variant: latest.variant,
        version: latest.version,
        siblingVersions: cluster.siblings.length,
        homologationPowertrain: cluster.homologationPowertrain,
        ...(cluster.fuel ? { fuel: cluster.fuel } : {}),
        ...(cluster.engineCapacityCc !== undefined ? { engineCapacityCc: cluster.engineCapacityCc } : {}),
        ...(cluster.enginePowerKw !== undefined ? { enginePowerKw: cluster.enginePowerKw } : {}),
      },
      modelYear: {
        eeaYears: rep.byYear.map((g) => g.year),
        ...(periods.length ? { firstRegistration: periods.map((p) => p.from).sort()[0]!, lastRegistration: periods.map((p) => p.to).sort().at(-1)! } : {}),
        period: cluster.period,
        declared: 'UNRESOLVED',
      },
      powertrain: { homologation: cluster.homologationPowertrain, productClass: pc.productClass, ...(pc.note ? { note: pc.note } : {}) },
      specValues,
      idaeFieldsPresent: idaeFields,
      registrationsEs: { total: cluster.registrations, byYear },
      identityStatus: identity.status,
      identityEvidence: identity.evidence,
      qualitySummary: { categories: coverage.categories, criticalCompleteness: Math.round(coverage.criticalCompleteness * 1000) / 1000, missingCritical: coverage.missingCritical, conflicts, crossChecks: link.checks },
      rightsSummary: {
        bySource: rights,
        attribution: ['European Environment Agency (EEA) — data: DG CLIMA, CC BY 4.0'],
        humanApproval: 'PENDING',
        // PUBLIC exige registro publicado + identidad EXACT + derechos verificados/condicionados de cada campo (ADR-013).
        publicEligible: false,
        previewEligible,
      },
      curationStatus: status.status,
      blockers: status.blockers,
      priority: prio,
      ...(overlap ? { existingCatalogOverlap: overlap } : {}),
    };
    return CurationCandidate.parse(candidate);
  });
  return { clusters, candidates };
}

/* ───────────────────────── Selección (Step D1 §13) ───────────────────────── */

export const POWERTRAIN_TARGETS = { ICE: 35, MHEV: 15, HEV: 20, PHEV: 10, BEV: 20 } as const;
type Bucket = keyof typeof POWERTRAIN_TARGETS;
export const bucketOf = (c: CurationCandidate): Bucket => {
  const p = c.powertrain.productClass;
  return p === 'ICE_OR_MHEV' || p === 'ICE' ? 'ICE' : p === 'HEV_OR_MHEV' ? 'HEV' : p === 'EREV' ? 'PHEV' : p === 'FCEV' ? 'BEV' : p;
};

export interface SelectionOptions {
  total: number;
  /** Mínimo de matriculaciones ES en los años encuestados (evita nichos sin relevancia de mercado). */
  minRegistrations: number;
  perFamilyCap: number;
}

/**
 * Lista priorizada: orden por prioridad de curación, con cuotas orientativas por powertrain (MHEV se reparte con
 * ICE porque no es distinguible en las fuentes), tope por familia y al menos un candidato por familia y periodo
 * cuando existe. Nunca se rellena con candidatos inexistentes: si no hay suficientes, el déficit se informa.
 */
export function selectShortlist(all: readonly CurationCandidate[], opts: SelectionOptions = { total: 100, minRegistrations: 100, perFamilyCap: 7 }): CurationCandidate[] {
  const pool = all.filter((c) => c.registrationsEs.total >= opts.minRegistrations && c.identityStatus !== 'CONFLICTED').sort((a, b) => b.priority.score - a.priority.score || b.registrationsEs.total - a.registrationsEs.total || a.candidateId.localeCompare(b.candidateId));
  const chosen = new Map<string, CurationCandidate>();
  const famCount = new Map<string, number>();
  const bucketCount = new Map<Bucket, number>();
  const quota = (b: Bucket) => (b === 'ICE' ? POWERTRAIN_TARGETS.ICE + POWERTRAIN_TARGETS.MHEV : b === 'MHEV' ? POWERTRAIN_TARGETS.MHEV + POWERTRAIN_TARGETS.ICE : POWERTRAIN_TARGETS[b]);
  const take = (c: CurationCandidate) => {
    chosen.set(c.candidateId, c);
    famCount.set(c.familyId, (famCount.get(c.familyId) ?? 0) + 1);
    const b = bucketOf(c);
    bucketCount.set(b, (bucketCount.get(b) ?? 0) + 1);
  };
  const iceLike = () => (bucketCount.get('ICE') ?? 0) + (bucketCount.get('MHEV') ?? 0);
  const fits = (c: CurationCandidate, strict: boolean) => {
    if (chosen.has(c.candidateId) || (famCount.get(c.familyId) ?? 0) >= opts.perFamilyCap) return false;
    if (!strict) return true;
    const b = bucketOf(c);
    if (b === 'ICE' || b === 'MHEV') return iceLike() < POWERTRAIN_TARGETS.ICE + POWERTRAIN_TARGETS.MHEV;
    return (bucketCount.get(b) ?? 0) < quota(b);
  };
  // 0) Cada familia con candidatos tiene al menos su mejor candidato (antes de las cuotas).
  const families = new Set<string>();
  for (const c of pool) {
    if (families.has(c.familyId) || chosen.size >= opts.total) continue;
    families.add(c.familyId);
    take(c);
  }
  // 1) Cobertura mínima: mejor candidato por familia × periodo × powertrain.
  const seen = new Set<string>();
  for (const c of pool) {
    const k = `${c.familyId}|${c.modelYear.period}|${bucketOf(c)}`;
    if (seen.has(k) || chosen.size >= opts.total || !fits(c, true)) continue;
    seen.add(k);
    take(c);
  }
  // 2) Cuotas por powertrain.
  for (const c of pool) if (chosen.size < opts.total && fits(c, true)) take(c);
  // 3) Resto sin cuota (déficit de un powertrain no se inventa: se cubre con otros y se informa).
  for (const c of pool) if (chosen.size < opts.total && fits(c, false)) take(c);
  return [...chosen.values()].sort((a, b) => b.priority.score - a.priority.score || a.candidateId.localeCompare(b.candidateId));
}

/**
 * Piloto D2 (20): los mejores de la lista con diversidad — cada powertrain presente, como máximo 2 por familia,
 * todos los periodos representados si existen, primero las identidades más cercanas a EXACT, ≥ 1.000 matriculaciones
 * ES en los años encuestados (salvo EXACT) y nunca una variant que ya está en el catálogo.
 */
export const PILOT_MIN_REGISTRATIONS = 1000;

export function selectPilot(shortlist: readonly CurationCandidate[], size = 20): CurationCandidate[] {
  const order = [...shortlist].sort((a, b) => {
    const rank = (c: CurationCandidate) => ({ EXACT: 0, PARTIAL: 1, UNCONFIRMED: 2, AMBIGUOUS: 3, CONFLICTED: 4 })[c.identityStatus];
    return rank(a) - rank(b) || b.priority.score - a.priority.score || a.candidateId.localeCompare(b.candidateId);
  });
  const out: CurationCandidate[] = [];
  const fam = new Map<string, number>();
  // Las variants que ya existen en el catálogo (9 PREVIEW) no se re-curan en el piloto: no se alteran sin migración explícita.
  // Presencia de mercado mínima para un piloto útil (salvo identidad EXACT ya demostrada).
  const ok = (c: CurationCandidate) =>
    !c.existingCatalogOverlap && !out.includes(c) && (fam.get(c.familyId) ?? 0) < 2 && (c.identityStatus === 'EXACT' || c.registrationsEs.total >= PILOT_MIN_REGISTRATIONS);
  const add = (c: CurationCandidate) => {
    out.push(c);
    fam.set(c.familyId, (fam.get(c.familyId) ?? 0) + 1);
  };
  for (const b of ['BEV', 'PHEV', 'HEV', 'MHEV', 'ICE'] as Bucket[]) {
    for (const p of ['2015–2018', '2019–2021', '2022–2024', '2025–2026']) {
      const c = order.find((x) => bucketOf(x) === b && x.modelYear.period === p && ok(x));
      if (c && out.length < size) add(c);
    }
  }
  for (const c of order) if (out.length < size && ok(c)) add(c);
  return out;
}
