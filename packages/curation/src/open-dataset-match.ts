import { z } from 'zod';
import { GOR3A_FUEL, GOR3A_SPEC, gor3aBodyFromName, gor3aDrive, gor3aKg, gor3aKmh, gor3aLitres, gor3aMillimetres, gor3aPowerKw, gor3aTransmission, type Gor3aEngineRow } from '@vscar/data-connectors';

/**
 * Step D1.4 — correspondencia candidata ↔ dataset abierto (gor3a, S14). Reglas documentadas antes de implementar en
 * docs/data/D1_4_TWENTY_VARIANT_MATCHING.md §2.
 *
 * Niveles de identidad:
 * - L1 `MODEL_GENERATION`: familia + "generación" del dataset cuyo intervalo de años cubre el año de matriculación EEA.
 * - L2 `ENGINE_CONFIGURATION`: L1 + motor compatible (combustible/tren motriz, kW, cilindrada) sin contradicción RDW.
 * - L3 `HOMOLOGATION`: TAN completo + Va + Ve. **El dataset no lo publica** → nunca alcanzable con S14.
 *
 * Estados (equivalencia con `IdentityStatus`): EXACT_DOCUMENTED_LINK ≈ EXACT (inalcanzable sin L3) ·
 * STRONG_COMPATIBLE_MATCH / WEAK_COMPATIBLE_MATCH ≈ UNCONFIRMED · AMBIGUOUS ≈ AMBIGUOUS · REJECTED · NOT_FOUND.
 * Ningún estado convierte valores del dataset en valores de la ReferenceVariant.
 */
export const OpenDatasetMatchStatus = z.enum(['EXACT_DOCUMENTED_LINK', 'STRONG_COMPATIBLE_MATCH', 'WEAK_COMPATIBLE_MATCH', 'AMBIGUOUS', 'REJECTED', 'NOT_FOUND']);
export type OpenDatasetMatchStatus = z.infer<typeof OpenDatasetMatchStatus>;
export const IdentityLevel = z.enum(['NONE', 'MODEL_GENERATION', 'ENGINE_CONFIGURATION', 'HOMOLOGATION']);
export type IdentityLevel = z.infer<typeof IdentityLevel>;

/** Familia VScar → modelos del dataset (lista cerrada; un modelo distinto — Yaris Cross, Corolla Cross, Sealion — no entra). */
export const GOR3A_FAMILY_MODELS: Readonly<Record<string, { make: string; models: readonly string[] }>> = {
  'vw-golf': { make: 'Volkswagen', models: ['Golf', 'Golf Variant', 'Golf Alltrack', 'Golf GTI / GTD / GTE', 'Golf R', 'Golf R Variant', 'Golf GTD Variant', 'Golf Cabrio'] },
  'byd-seal': { make: 'BYD', models: [] },
  'kia-sportage': { make: 'Kia', models: ['Sportage'] },
  'renault-clio': { make: 'Renault', models: ['Clio', 'Clio RS'] },
  'nissan-qashqai': { make: 'Nissan', models: ['Qashqai'] },
  'hyundai-tucson': { make: 'Hyundai', models: ['ix35 / Tucson'] },
  'dacia-sandero': { make: 'Dacia', models: ['Sandero', 'Sandero Stepway'] },
  'hyundai-kona': { make: 'Hyundai', models: ['Kona', 'Kona Electric', 'Kona N'] },
  'peugeot-3008': { make: 'Peugeot', models: ['3008'] },
  'peugeot-208': { make: 'Peugeot', models: ['208', '208 GTI', '208 XY'] },
  'peugeot-308': { make: 'Peugeot', models: ['308', '308 SW', '308 CC'] },
  'toyota-yaris': { make: 'Toyota', models: ['Yaris', 'GR Yaris'] },
  'mercedes-a': { make: 'Mercedes-Benz', models: ['MERCEDES BENZ A-Class'] },
  'skoda-octavia': { make: 'Škoda', models: ['SKODA Octavia', 'SKODA Octavia Combi', 'SKODA Octavia Combi 4x4', 'SKODA Octavia Combi RS', 'SKODA Octavia RS', 'SKODA Octavia Scout'] },
  'audi-a3': { make: 'Audi', models: ['A3'] },
  'toyota-corolla': { make: 'Toyota', models: ['Corolla', 'GR Corolla'] },
  'renault-megane': { make: 'Renault', models: ['Megane', 'Megane E-Tech'] },
  'toyota-rav4': { make: 'Toyota', models: ['RAV4'] },
  'kia-niro': { make: 'Kia', models: ['Niro'] },
  'seat-leon': { make: 'SEAT', models: ['Leon', 'Leon ST', 'Leon SC', 'Leon Cupra', 'Leon Cupra R', 'Leon ST Cupra', 'Leon FR / Topsport', 'Leon X-Perience'] },
  'bmw-3': { make: 'BMW', models: ['3 Series'] },
  'cupra-formentor': { make: 'Cupra', models: ['Formentor'] },
  'bmw-x3': { make: 'BMW', models: ['X3', 'X3 M'] },
  'tesla-model-3': { make: 'Tesla', models: ['Model 3'] },
  'tesla-model-y': { make: 'Tesla', models: ['Model Y'] },
};

/** Clave técnica (inmutable) y evidencia oficial con la que se contrasta; nada de aquí se modifica. */
export interface MatchCandidate {
  rank: number;
  familyId: string;
  technicalKey: string;
  registrationYears: readonly number[];
  productClass: string;
  fuel?: string;
  powerKw?: number;
  displacementCc?: number;
}
export interface RdwEvidence {
  drivetrain?: 'FWD' | 'RWD' | 'AWD';
  doors?: number;
  length?: { min: number; max: number };
  width?: { min: number; max: number };
  height?: { min: number; max: number };
  wheelbase?: number;
  topSpeed?: number;
  massRunningOrder?: number;
  /** Fecha de la primera revisión RDW de la extensión exacta del TAN. */
  approvalFrom?: string;
}
export type TransmissionEvidence = 'manual' | 'automatic' | 'single_speed' | undefined;

export const POWER_TOLERANCE = (kw: number) => Math.max(1.5, kw * 0.02);
export const DISPLACEMENT_TOLERANCE = (cc: number) => Math.max(15, cc * 0.01);
export const DIMENSION_TOLERANCE_MM = 15;
/** Margen de años: un coche se matricula en el año de producción o en el siguiente. */
export const YEAR_SLACK = 1;

type Reason = 'fuel_or_powertrain' | 'power_kw' | 'displacement' | 'drivetrain' | 'doors' | 'transmission' | 'length' | 'wheelbase';

export interface RowAssessment {
  rowId: string;
  generationId: string;
  generation: string;
  checks: Partial<Record<Reason | 'power_unverifiable', boolean>>;
  contradictions: Reason[];
}

export interface DimensionCrossCheck {
  field: 'length' | 'width' | 'height' | 'wheelbase' | 'top_speed' | 'mass';
  compared: number;
  agree: number;
  disagree: number;
}

export interface OpenDatasetMatch {
  rank: number;
  technicalKey: string;
  source: 'S14';
  status: OpenDatasetMatchStatus;
  level: IdentityLevel;
  basis: string[];
  generationsInWindow: number;
  compatibleGenerations: { id: string; name: string; yearStart: number | null; yearEnd: number | null }[];
  compatibleRowIds: string[];
  rejectedRowReasons: Partial<Record<Reason, number>>;
  /** Presencia de campos en las filas compatibles; `distinct` = nº de valores distintos (1 = coherente). Sin valores. */
  fields: Record<'generation' | 'body' | 'transmission' | 'boot' | 'accel_0_100' | 'battery' | 'charging' | 'top_speed' | 'dimensions', { found: boolean; distinct: number }>;
  rdwCrossCheck: DimensionCrossCheck[];
  identityVerified: false;
  reusableInVscar: false;
  valuesStored: false;
}

const within = (v: number, r: { min: number; max: number }, tol: number) => v >= r.min - tol && v <= r.max + tol;

/** Evalúa cada fila del dataset contra la clave técnica. Solo descarta por contradicción; la ausencia no confirma. */
export function assessRow(c: MatchCandidate, row: Gor3aEngineRow, rdw: RdwEvidence, tx: TransmissionEvidence, opts: { dimensions: boolean } = { dimensions: true }): RowAssessment {
  const e = row.engine;
  const checks: RowAssessment['checks'] = {};
  const contradictions: Reason[] = [];
  const check = (k: Reason, ok: boolean | undefined) => {
    if (ok === undefined) return;
    checks[k] = ok;
    if (!ok) contradictions.push(k);
  };
  const fuel = GOR3A_FUEL[e.fuelType ?? ''];
  check('fuel_or_powertrain', !!fuel && fuel.classes.includes(c.productClass) && (c.productClass === 'BEV' || c.productClass === 'PHEV' || !c.fuel || fuel.fuel === c.fuel));
  const p = gor3aPowerKw(e);
  // EEA `Ep` es la potencia del motor térmico en HEV/PHEV/MHEV: una potencia de sistema no es comparable (no contradice).
  const comparable = p.kw !== undefined && !(p.basis === 'SYSTEM' && c.productClass !== 'BEV');
  if (c.powerKw !== undefined && comparable) check('power_kw', Math.abs(p.kw! - c.powerKw) <= POWER_TOLERANCE(c.powerKw));
  else checks.power_unverifiable = true;
  if (c.displacementCc !== undefined && e.displacementCc !== null) check('displacement', Math.abs(e.displacementCc - c.displacementCc) <= DISPLACEMENT_TOLERANCE(c.displacementCc));
  const d = gor3aDrive(e.drivetrain);
  if (rdw.drivetrain && d) check('drivetrain', d === rdw.drivetrain);
  const body = gor3aBodyFromName(row.model, row.generation);
  // RDW cuenta el portón de forma irregular (Golf 5, RAV4 4): solo 3 frente a 5 puertas (diferencia ≥ 2) es contradicción.
  if (rdw.doors !== undefined && body.doors !== undefined) check('doors', Math.abs(body.doors - rdw.doors) < 2);
  const t = gor3aTransmission(e.transmission ?? e.specs[GOR3A_SPEC.gearbox]);
  // CVT no se equipara a "automático" (como el código 3 de Traficom): solo contradice una evidencia manual o de 1 marcha.
  if (tx && t.kind) check('transmission', t.kind === 'cvt' ? (tx === 'automatic' ? undefined : false) : t.kind === tx);
  if (opts.dimensions) {
    const len = e.lengthMm ?? gor3aMillimetres(e.specs[GOR3A_SPEC.length]);
    if (rdw.length && len !== undefined && len !== null) check('length', within(len, rdw.length, DIMENSION_TOLERANCE_MM));
    const wb = e.wheelbaseMm ?? gor3aMillimetres(e.specs[GOR3A_SPEC.wheelbase]);
    if (rdw.wheelbase !== undefined && wb !== undefined && wb !== null) check('wheelbase', Math.abs(wb - rdw.wheelbase) <= DIMENSION_TOLERANCE_MM);
  }
  return { rowId: row.id, generationId: row.generationId, generation: row.generation, checks, contradictions };
}

const distinct = (vals: readonly (string | number | undefined | null)[]) => new Set(vals.filter((v) => v !== undefined && v !== null && v !== '')).size;

export function matchGor3a(c: MatchCandidate, rows: readonly Gor3aEngineRow[], rdw: RdwEvidence, tx: TransmissionEvidence): OpenDatasetMatch {
  const fam = GOR3A_FAMILY_MODELS[c.familyId];
  const minY = Math.min(...c.registrationYears) - YEAR_SLACK;
  const maxY = Math.max(...c.registrationYears);
  const familyRows = fam ? rows.filter((r) => r.make === fam.make && fam.models.includes(r.model)) : [];
  const inWindow = familyRows.filter((r) => r.genYearStart !== null && r.genYearStart <= maxY && (r.genYearEnd ?? Number.POSITIVE_INFINITY) >= minY);
  const generationsInWindow = new Set(inWindow.map((r) => r.generationId)).size;
  const base = { rank: c.rank, technicalKey: c.technicalKey, source: 'S14' as const, identityVerified: false as const, reusableInVscar: false as const, valuesStored: false as const };
  const emptyFields = Object.fromEntries(['generation', 'body', 'transmission', 'boot', 'accel_0_100', 'battery', 'charging', 'top_speed', 'dimensions'].map((k) => [k, { found: false, distinct: 0 }])) as OpenDatasetMatch['fields'];

  /* Contraste con RDW antes del filtro dimensional (para no medir una concordancia que el propio filtro fuerza). */
  const engineOk = inWindow.filter((r) => assessRow(c, r, rdw, tx, { dimensions: false }).contradictions.length === 0);
  const rdwCrossCheck = crossCheckRdw(engineOk, rdw);

  const assessed = inWindow.map((r) => ({ r, a: assessRow(c, r, rdw, tx) }));
  const ok = assessed.filter((x) => x.a.contradictions.length === 0);
  const rejectedRowReasons: OpenDatasetMatch['rejectedRowReasons'] = {};
  for (const x of assessed) for (const k of x.a.contradictions) rejectedRowReasons[k] = (rejectedRowReasons[k] ?? 0) + 1;

  if (!fam || !familyRows.length) return { ...base, status: 'NOT_FOUND', level: 'NONE', basis: [fam ? `family models ${fam.models.join(', ') || '(none)'} not in dataset` : 'family not mapped'], generationsInWindow: 0, compatibleGenerations: [], compatibleRowIds: [], rejectedRowReasons, fields: emptyFields, rdwCrossCheck };
  if (!inWindow.length) return { ...base, status: 'NOT_FOUND', level: 'NONE', basis: [`no dataset generation covers registration years ${c.registrationYears.join('/')} (±${YEAR_SLACK})`], generationsInWindow, compatibleGenerations: [], compatibleRowIds: [], rejectedRowReasons, fields: emptyFields, rdwCrossCheck };
  if (!ok.length) {
    /* Casi-coincidencias (mismo combustible, kW y cilindrada) descartadas por un hecho duro (tracción, puertas, caja, dimensiones RDW) → falso positivo evitado. */
    const near = assessed.filter((x) => !x.a.contradictions.some((k) => k === 'fuel_or_powertrain' || k === 'power_kw' || k === 'displacement'));
    return near.length
      ? { ...base, status: 'REJECTED', level: 'MODEL_GENERATION', basis: [`${near.length} engine row(s) match fuel/kW/displacement but contradict a hard fact (${[...new Set(near.flatMap((x) => x.a.contradictions))].join(', ')})`], generationsInWindow, compatibleGenerations: [], compatibleRowIds: [], rejectedRowReasons, fields: emptyFields, rdwCrossCheck }
      : { ...base, status: 'NOT_FOUND', level: 'MODEL_GENERATION', basis: [`${inWindow.length} engine rows in ${generationsInWindow} generation(s) of the year window, none with this fuel/kW/displacement → engine not in dataset`], generationsInWindow, compatibleGenerations: [], compatibleRowIds: [], rejectedRowReasons, fields: emptyFields, rdwCrossCheck };
  }

  const gens = [...new Map(ok.map(({ r }) => [r.generationId, { id: r.generationId, name: r.generation, yearStart: r.genYearStart, yearEnd: r.genYearEnd }])).values()].sort((a, b) => a.id.localeCompare(b.id));
  const e = ok.map(({ r }) => r.engine);
  const fields: OpenDatasetMatch['fields'] = {
    generation: { found: true, distinct: gens.length },
    body: { found: ok.some(({ r }) => !!gor3aBodyFromName(r.model, r.generation).body || gor3aBodyFromName(r.model, r.generation).doors !== undefined), distinct: distinct(ok.map(({ r }) => JSON.stringify(gor3aBodyFromName(r.model, r.generation)))) },
    transmission: { found: e.some((x) => !!gor3aTransmission(x.transmission).kind), distinct: distinct(e.map((x) => gor3aTransmission(x.transmission).kind)) },
    boot: { found: e.some((x) => gor3aLitres(x.specs[GOR3A_SPEC.cargo]) !== undefined), distinct: distinct(e.map((x) => gor3aLitres(x.specs[GOR3A_SPEC.cargo]))) },
    accel_0_100: { found: e.some((x) => x.zeroToHundredKmhS !== null), distinct: distinct(e.map((x) => x.zeroToHundredKmhS)) },
    battery: { found: e.some((x) => !!x.specs[GOR3A_SPEC.batteryNominal] || !!x.specs[GOR3A_SPEC.batteryMax]), distinct: distinct(e.map((x) => x.specs[GOR3A_SPEC.batteryNominal] ?? x.specs[GOR3A_SPEC.batteryMax])) },
    charging: { found: e.some((x) => !!x.specs[GOR3A_SPEC.chargeNormal] || !!x.specs[GOR3A_SPEC.chargeQuick]), distinct: distinct(e.map((x) => x.specs[GOR3A_SPEC.chargeQuick] ?? x.specs[GOR3A_SPEC.chargeNormal])) },
    top_speed: { found: e.some((x) => x.topSpeedKmh !== null), distinct: distinct(e.map((x) => x.topSpeedKmh)) },
    dimensions: { found: e.some((x) => x.lengthMm !== null), distinct: distinct(e.map((x) => `${x.lengthMm}|${x.widthMm}|${x.heightMm}`)) },
  };
  /* La generación compatible debe cubrir TODOS los años de matriculación (producción = año o año anterior); y una
     extensión de homologación anterior al inicio de la generación (−1 año) es una señal en contra. Ambas solo rebajan a WEAK. */
  const g0 = gens[0]!;
  const coversYears = gens.length === 1 && c.registrationYears.every((y) => (g0.yearStart ?? Infinity) <= y && (g0.yearEnd ?? Infinity) >= y - YEAR_SLACK);
  const approvalYear = rdw.approvalFrom ? Number(rdw.approvalFrom.slice(0, 4)) : undefined;
  const approvalConflict = gens.length === 1 && approvalYear !== undefined && g0.yearStart !== null && approvalYear < g0.yearStart - YEAR_SLACK;
  const allChecked = coversYears && !approvalConflict && ok.every(({ a }) => a.checks.fuel_or_powertrain && a.checks.power_kw && (c.displacementCc === undefined || a.checks.displacement) && (!rdw.drivetrain || a.checks.drivetrain !== false) && a.checks.length === true);
  const status: OpenDatasetMatchStatus = gens.length > 1 ? 'AMBIGUOUS' : allChecked ? 'STRONG_COMPATIBLE_MATCH' : 'WEAK_COMPATIBLE_MATCH';
  const basis = [
    `${ok.length} compatible engine row(s) in ${gens.length} generation(s) of ${generationsInWindow} in the year window`,
    gens.length > 1
      ? 'several generations remain compatible (facelift/body/transition) → none chosen'
      : !coversYears
        ? `generation interval ${g0.yearStart}–${g0.yearEnd ?? ''} does not cover every registration year ${c.registrationYears.join('/')}`
        : approvalConflict
          ? `RDW approval extension ${rdw.approvalFrom} predates the generation start ${g0.yearStart}`
          : allChecked
            ? 'fuel, kW, displacement and the RDW length envelope checked and compatible (drivetrain too when both sources state it)'
            : 'some attributes unverifiable (kW not explicit or system power, or no RDW length envelope to check)',
    'no TAN/Va/Ve in the dataset → homologation link impossible (level ≤ 2)',
  ];
  return { ...base, status, level: 'ENGINE_CONFIGURATION', basis, generationsInWindow, compatibleGenerations: gens, compatibleRowIds: ok.map(({ r }) => r.id).sort(), rejectedRowReasons, fields, rdwCrossCheck };
}

/** Concordancia de campos compartidos con RDW (solo estadística; los conflictos se conservan, nada se corrige). */
export function crossCheckRdw(rows: readonly Gor3aEngineRow[], rdw: RdwEvidence): DimensionCrossCheck[] {
  const out: DimensionCrossCheck[] = [];
  const add = (field: DimensionCrossCheck['field'], vals: (number | null | undefined)[], ok: (v: number) => boolean) => {
    const v = vals.filter((x): x is number => typeof x === 'number');
    if (!v.length) return;
    const agree = v.filter(ok).length;
    out.push({ field, compared: v.length, agree, disagree: v.length - agree });
  };
  const e = rows.map((r) => r.engine);
  if (rdw.length) add('length', e.map((x) => x.lengthMm), (v) => within(v, rdw.length!, DIMENSION_TOLERANCE_MM));
  if (rdw.width) add('width', e.map((x) => x.widthMm), (v) => within(v, rdw.width!, DIMENSION_TOLERANCE_MM));
  if (rdw.height) add('height', e.map((x) => x.heightMm), (v) => within(v, rdw.height!, DIMENSION_TOLERANCE_MM));
  if (rdw.wheelbase !== undefined) add('wheelbase', e.map((x) => x.wheelbaseMm), (v) => Math.abs(v - rdw.wheelbase!) <= DIMENSION_TOLERANCE_MM);
  if (rdw.topSpeed !== undefined) add('top_speed', e.map((x) => x.topSpeedKmh ?? gor3aKmh(x.specs[GOR3A_SPEC.topSpeed])), (v) => Math.abs(v - rdw.topSpeed!) <= 2);
  /* Masa: RDW/EEA "en orden de marcha" (incluye 75 kg de conductor) ≠ "unladen" del origen → se compara solo con esa diferencia declarada (±40 kg). */
  if (rdw.massRunningOrder !== undefined) add('mass', e.map((x) => x.curbWeightKg ?? gor3aKg(x.specs[GOR3A_SPEC.unladen])), (v) => Math.abs(v + 75 - rdw.massRunningOrder!) <= 40);
  return out;
}

export function validateOpenDatasetMatch(m: OpenDatasetMatch): string[] {
  const issues: string[] = [];
  if (m.status === 'EXACT_DOCUMENTED_LINK' && m.level !== 'HOMOLOGATION') issues.push('EXACT_DOCUMENTED_LINK requires a documented homologation link (TAN + Va + Ve)');
  if (m.level === 'HOMOLOGATION' && m.source === 'S14') issues.push('S14 has no homologation identifiers: level HOMOLOGATION is impossible');
  if (m.status === 'REJECTED' && !Object.keys(m.rejectedRowReasons).some((k) => !['fuel_or_powertrain', 'power_kw', 'displacement'].includes(k))) issues.push('REJECTED must state a contradicting hard fact');
  if (m.status === 'STRONG_COMPATIBLE_MATCH' && m.compatibleGenerations.length !== 1) issues.push('STRONG_COMPATIBLE_MATCH requires a single compatible generation');
  if (m.identityVerified || m.reusableInVscar || m.valuesStored) issues.push('open-dataset matches never verify identity, grant reuse or store values');
  return issues;
}
