import {
  fuelClassCompatible,
  kilowattDrive,
  odbDoors,
  odbDrive,
  odbFuel,
  odbPowerKw,
  odbTransmission,
  psToKw,
  type AutoseekerRecord,
  type DataGranularity,
  type KwRecord,
  type OdbRecord,
  type OevRecord,
  type VdbModel,
} from '@vscar/data-connectors';
import { DIMENSION_TOLERANCE_MM, POWER_TOLERANCE, DISPLACEMENT_TOLERANCE, YEAR_SLACK, type MatchCandidate, type OpenDatasetMatchStatus, type RdwEvidence, type TransmissionEvidence } from './open-dataset-match.ts';

/**
 * Step D1.5 — matching multi-fuente. Reglas en docs/data/D1_5_MULTI_SOURCE_MATCHING.md §2 (documentadas antes de
 * implementar). Reutiliza los estados de D1.4 (`OpenDatasetMatchStatus`): EXACT_DOCUMENTED_LINK ≈ EXACT_DOCUMENTED ·
 * STRONG/WEAK_COMPATIBLE_MATCH ≈ COMPATIBLE_STRONG/WEAK · AMBIGUOUS · REJECTED · NOT_FOUND. Ninguna fuente abierta
 * publica TAN/Va/Ve → EXACT es inalcanzable; la clave técnica EEA/RDW nunca se sustituye.
 */

export interface FamilyNames {
  odb: readonly string[];
  autoseeker: readonly string[];
  openev: readonly string[];
  vehiclesdb: readonly string[];
  kilowatt?: RegExp;
  make: { odb: string; autoseeker: string; openev: string; vehiclesdb: readonly string[]; kilowatt: string };
}

const fam = (make: string, odb: string[], as: string[], oev: string[], vdb: string[], kw?: RegExp, makes: Partial<FamilyNames['make']> = {}): FamilyNames => ({
  odb,
  autoseeker: as,
  openev: oev,
  vehiclesdb: vdb,
  ...(kw ? { kilowatt: kw } : {}),
  make: { odb: make, autoseeker: make, openev: make, vehiclesdb: [make], kilowatt: make, ...makes },
});

/** Familia VScar → nombres exactos de cada fuente (lista cerrada; un modelo distinto —Qashqai+2, Golf Sportsvan, Yaris Cross— no entra). */
export const FAMILY_SOURCE_NAMES: Readonly<Record<string, FamilyNames>> = {
  'vw-golf': fam('Volkswagen', ['Golf', 'Golf GTI', 'Golf R'], ['Golf', 'Golf GTE'], [], ['Golf', 'E-Golf'], /^e-golf/i),
  'byd-seal': fam('BYD', [], ['Seal'], ['Seal'], ['Seal'], /^seal$/i),
  'kia-sportage': fam('Kia', ['Sportage'], ['Sportage'], [], ['Sportage']),
  'renault-clio': fam('Renault', ['Clio', 'Clio RS'], ['Clio'], [], ['Clio']),
  'nissan-qashqai': fam('Nissan', ['Qashqai'], ['Qashqai'], [], ['Qashqai']),
  'hyundai-tucson': fam('Hyundai', ['Tucson'], ['Tucson'], [], ['Tucson']),
  'dacia-sandero': fam('Dacia', ['Sandero'], ['Sandero'], [], ['Sandero', 'Sandero Stepway']),
  'hyundai-kona': fam('Hyundai', ['Kona'], ['Kona Electric'], ['Kona Electric'], ['Kona'], /^kona( electric.*)?$/i),
  'peugeot-3008': fam('Peugeot', ['3008'], ['3008', 'E-3008'], ['e-3008'], ['3008'], /^e-3008/i),
  'peugeot-208': fam('Peugeot', ['208', '208 GTi'], ['208 Hybrid', 'e-208'], ['e-208'], ['208', 'E-208'], /^e-208/i),
  'peugeot-308': fam('Peugeot', ['308'], ['308', '308 SW'], [], ['308'], /^e-308/i),
  'toyota-yaris': fam('Toyota', ['Yaris'], ['Yaris'], [], ['Yaris']),
  'mercedes-a': fam('Mercedes-Benz', ['A-Class', 'A-Class AMG'], ['A-Klasse'], [], ['A-Class']),
  'skoda-octavia': fam('Skoda', ['Octavia', 'Octavia RS'], ['Octavia'], [], ['Octavia'], undefined, { vehiclesdb: ['Škoda'] }),
  'audi-a3': fam('Audi', ['A3'], ['A3 Sportback'], [], ['A3']),
  'toyota-corolla': fam('Toyota', ['Corolla'], ['Corolla', 'Corolla Touring Sports'], [], ['Corolla']),
  'renault-megane': fam('Renault', ['Megane', 'Megane RS'], ['Megane E-Tech'], ['Megane E-Tech Electric'], ['Megane', 'Megane E Tech'], /^megane e-tech/i),
  'toyota-rav4': fam('Toyota', ['RAV4'], ['RAV4 Plug-in Hybrid'], [], ['RAV4']),
  'kia-niro': fam('Kia', ['Niro'], ['Niro'], [], ['Niro', 'Niro EV', 'E-Niro'], /^(niro ev|e-niro.*)$/i),
  'seat-leon': fam('SEAT', ['Leon', 'Leon Cupra'], ['Leon'], [], ['Leon'], undefined, { vehiclesdb: ['SEAT', 'Cupra'] }),
  'bmw-3': fam('BMW', ['3 Series'], ['3-serie'], [], ['3 Series']),
  'cupra-formentor': fam('Cupra', [], ['Formentor'], [], ['Formentor']),
  'bmw-x3': fam('BMW', ['X3', 'X3 M'], ['X3', 'iX3'], ['iX3'], ['X3', 'iX3'], /^ix3$/i),
  'tesla-model-3': fam('Tesla', ['Model 3'], ['Model 3'], ['Model 3'], ['Model 3'], /^model 3/i),
  'tesla-model-y': fam('Tesla', [], ['Model Y'], ['Model Y'], ['Model Y'], /^model y/i),
};

export interface SourceMatch {
  source: 'S15' | 'S16' | 'S17' | 'S19';
  status: OpenDatasetMatchStatus;
  /** Nivel más específico realmente justificado por la coincidencia. Nunca TECHNICAL_VARIANT. */
  granularity: DataGranularity | 'NONE';
  basis: string[];
  recordIds: string[];
  /** Grupos de generación (y carrocería) compatibles. */
  generations: string[];
  rejectedReasons: Record<string, number>;
}

const yearsWindow = (c: MatchCandidate) => ({ min: Math.min(...c.registrationYears) - YEAR_SLACK, max: Math.max(...c.registrationYears) });
const within = (v: number, r: { min: number; max: number }, tol: number) => v >= r.min - tol && v <= r.max + tol;
const count = (m: Record<string, number>, k: string) => (m[k] = (m[k] ?? 0) + 1);

/* ───────────────────────── S15 Opendatabay (fila = motor-caja de una serie/carrocería) ───────────────────────── */

export function odbChecks(c: MatchCandidate, r: OdbRecord, rdw: RdwEvidence, tx: TransmissionEvidence): { contradictions: string[]; checked: Set<string> } {
  const contradictions: string[] = [];
  const checked = new Set<string>();
  const chk = (k: string, ok: boolean | undefined) => {
    if (ok === undefined) return;
    checked.add(k);
    if (!ok) contradictions.push(k);
  };
  const f = odbFuel(r.raw.engine_type);
  chk('fuel_or_powertrain', f ? fuelClassCompatible(f, c.productClass, c.fuel) : false);
  const p = odbPowerKw(r.raw);
  // Electrificados: el origen no dice si `engine_hp` es térmica o de sistema (EEA `Ep` es térmica) → no comparable.
  const electrified = c.productClass !== 'BEV' && c.productClass !== 'ICE_OR_MHEV';
  if (c.powerKw !== undefined && p.kw !== undefined && !electrified) chk('power_kw', Math.abs(p.kw - c.powerKw) <= POWER_TOLERANCE(c.powerKw));
  const cc = Number(r.raw.capacity_cm3) || undefined;
  if (c.displacementCc !== undefined && cc !== undefined) chk('displacement', Math.abs(cc - c.displacementCc) <= DISPLACEMENT_TOLERANCE(c.displacementCc));
  const d = odbDrive(r.raw.drive_wheels);
  if (rdw.drivetrain && d) chk('drivetrain', d === rdw.drivetrain);
  const doors = odbDoors(r.series);
  if (rdw.doors !== undefined && doors !== undefined) chk('doors', Math.abs(doors - rdw.doors) < 2);
  const t = odbTransmission(r.raw.transmission);
  if (tx && t) chk('transmission', t === 'cvt' ? (tx === 'automatic' ? undefined : false) : t === tx);
  const len = Number(r.raw.length_mm) || undefined;
  if (rdw.length && len !== undefined) chk('length', within(len, rdw.length, DIMENSION_TOLERANCE_MM));
  const wb = Number(r.raw.wheelbase_mm) || undefined;
  if (rdw.wheelbase !== undefined && wb !== undefined) chk('wheelbase', Math.abs(wb - rdw.wheelbase) <= DIMENSION_TOLERANCE_MM);
  return { contradictions, checked };
}

const odbGenKey = (r: OdbRecord) => `${r.make}|${r.model}|${r.generation}`;

export function matchOdb(c: MatchCandidate, names: FamilyNames | undefined, rows: readonly OdbRecord[], rdw: RdwEvidence, tx: TransmissionEvidence): SourceMatch {
  const base = { source: 'S15' as const, rejectedReasons: {} as Record<string, number> };
  const fam = names ? rows.filter((r) => r.make === names.make.odb && names.odb.includes(r.model)) : [];
  if (!fam.length) return { ...base, status: 'NOT_FOUND', granularity: 'NONE', basis: ['family not in dataset'], recordIds: [], generations: [] };
  const w = yearsWindow(c);
  const inWin = fam.filter((r) => r.yearFrom !== undefined && r.yearFrom <= w.max && (r.yearTo ?? Number.POSITIVE_INFINITY) >= w.min);
  if (!inWin.length) return { ...base, status: 'NOT_FOUND', granularity: 'NONE', basis: [`no generation covers ${c.registrationYears.join('/')} (dataset ends 2020)`], recordIds: [], generations: [] };
  const assessed = inWin.map((r) => ({ r, a: odbChecks(c, r, rdw, tx) }));
  for (const x of assessed) for (const k of x.a.contradictions) count(base.rejectedReasons, k);
  const ok = assessed.filter((x) => !x.a.contradictions.length);
  const gensInWin = new Set(inWin.map(odbGenKey)).size;
  if (!ok.length) {
    const near = assessed.filter((x) => !x.a.contradictions.some((k) => ['fuel_or_powertrain', 'power_kw', 'displacement'].includes(k)));
    return near.length
      ? { ...base, status: 'REJECTED', granularity: 'GENERATION', basis: [`${near.length} row(s) with the same fuel/kW/displacement contradict a hard fact (${[...new Set(near.flatMap((x) => x.a.contradictions))].join(', ')})`], recordIds: [], generations: [] }
      : { ...base, status: 'NOT_FOUND', granularity: 'GENERATION', basis: [`${inWin.length} rows in ${gensInWin} generation(s), none with this fuel/kW/displacement`], recordIds: [], generations: [] };
  }
  const gens = [...new Set(ok.map((x) => odbGenKey(x.r)))].sort();
  const g0 = ok.filter((x) => odbGenKey(x.r) === gens[0]).map((x) => x.r);
  const ys = Math.min(...g0.map((r) => r.yearFrom!));
  const ye = g0.some((r) => r.yearTo === undefined) ? Number.POSITIVE_INFINITY : Math.max(...g0.map((r) => r.yearTo!));
  const covers = gens.length === 1 && c.registrationYears.every((y) => ys <= y && ye >= y - YEAR_SLACK);
  const approvalConflict = gens.length === 1 && !!rdw.approvalFrom && Number(rdw.approvalFrom.slice(0, 4)) < ys - YEAR_SLACK;
  const allChecked = ok.every((x) => x.a.checked.has('fuel_or_powertrain') && x.a.checked.has('power_kw') && (c.displacementCc === undefined || x.a.checked.has('displacement')) && x.a.checked.has('length'));
  const status: OpenDatasetMatchStatus = gens.length > 1 ? 'AMBIGUOUS' : covers && !approvalConflict && allChecked ? 'STRONG_COMPATIBLE_MATCH' : 'WEAK_COMPATIBLE_MATCH';
  return {
    ...base,
    status,
    granularity: 'POWERTRAIN',
    basis: [
      `${ok.length} compatible engine/gearbox row(s) in ${gens.length} generation(s) of ${gensInWin}`,
      gens.length > 1 ? 'several generations/restylings compatible → none chosen' : !covers ? 'generation period does not cover every registration year' : approvalConflict ? 'RDW approval extension predates generation start' : allChecked ? 'fuel, kW, displacement and RDW length checked' : 'some checks not possible (no RDW length or no kW/PS)',
    ],
    recordIds: ok.map((x) => x.r.id).sort((a, b) => Number(a) - Number(b)),
    generations: gens,
  };
}

/* ───────────────────────── S16 autoseeker (fila = modelo / generación / motorización representativa) ───────────────────────── */

export function matchAutoseeker(c: MatchCandidate, names: FamilyNames | undefined, rows: readonly AutoseekerRecord[]): SourceMatch {
  const base = { source: 'S16' as const, rejectedReasons: {} as Record<string, number> };
  const fam = names ? rows.filter((r) => r.make === names.make.autoseeker && names.autoseeker.includes(r.model)) : [];
  if (!fam.length) return { ...base, status: 'NOT_FOUND', granularity: 'NONE', basis: ['family not in dataset'], recordIds: [], generations: [] };
  const w = yearsWindow(c);
  const inWin = fam.filter((r) => r.yearFrom !== undefined && r.yearFrom <= w.max && (r.yearTo ?? Number.POSITIVE_INFINITY) >= w.min);
  if (!inWin.length) return { ...base, status: 'NOT_FOUND', granularity: 'NONE', basis: [`only later/earlier generations listed (${fam.map((r) => `${r.generation} ${r.yearFrom}–${r.yearTo ?? ''}`).join('; ')})`], recordIds: [], generations: [] };
  const fuelOk = inWin.filter((r) => r.fuels.some((f) => fuelClassCompatible(f, c.productClass, c.fuel)));
  for (const r of inWin) if (!fuelOk.includes(r)) count(base.rejectedReasons, 'fuel_or_powertrain');
  if (!fuelOk.length) return { ...base, status: 'NOT_FOUND', granularity: 'GENERATION', basis: ['generation listed, but not with this powertrain'], recordIds: [], generations: [] };
  /* Una fila POWERTRAIN describe UNA motorización: si su potencia (PS → kW) no es la de la clave, sus cifras no aplican. */
  const assessed = fuelOk.map((r) => {
    const kw = r.values.powerPs !== undefined ? psToKw(r.values.powerPs) : undefined;
    // `vermogen_pk` de un híbrido es potencia de sistema; EEA `Ep` es la térmica → no comparable (no contradice).
    const electrified = c.productClass !== 'BEV' && c.productClass !== 'ICE_OR_MHEV';
    const powerOk = c.powerKw !== undefined && kw !== undefined && !electrified ? Math.abs(kw - c.powerKw) <= POWER_TOLERANCE(c.powerKw) : undefined;
    if (powerOk === false && r.granularity === 'POWERTRAIN') count(base.rejectedReasons, 'power_kw');
    return { r, powerOk };
  });
  const usable = assessed.filter((x) => !(x.r.granularity === 'POWERTRAIN' && x.powerOk === false));
  const ids = usable.map((x) => x.r.slug).sort();
  if (!usable.length) return { ...base, status: 'REJECTED', granularity: 'GENERATION', basis: ['the listed powertrain of this generation has a different power than the technical key'], recordIds: [], generations: [] };
  if (usable.length > 1) return { ...base, status: 'AMBIGUOUS', granularity: 'GENERATION', basis: [`${usable.length} rows compatible (${ids.join(', ')})`], recordIds: ids, generations: ids };
  const x = usable[0]!;
  if (x.r.granularity === 'MODEL') return { ...base, status: 'AMBIGUOUS', granularity: 'MODEL', basis: [`row groups ${x.r.fuels.length} powertrains (${x.r.raw.fuels}); its figures describe one unspecified powertrain`], recordIds: ids, generations: ids };
  if (x.r.granularity === 'POWERTRAIN' && x.powerOk) return { ...base, status: 'STRONG_COMPATIBLE_MATCH', granularity: 'POWERTRAIN', basis: ['single powertrain row, fuel and power (PS→kW) compatible; generation period covers the registration years'], recordIds: ids, generations: ids };
  /* Sin potencia comprobada, las cifras de la fila describen UNA configuración no identificada de la generación → nivel MODEL para los valores. */
  return { ...base, status: 'WEAK_COMPATIBLE_MATCH', granularity: 'MODEL', basis: [x.r.granularity === 'POWERTRAIN' ? 'powertrain row whose power cannot be compared (system vs ICE power) → values describe an unconfirmed configuration' : 'generation-level row: its figures describe one representative, unspecified configuration'], recordIds: ids, generations: ids };
}

/* ───────────────────────── S17 OpenEV / S19 Kilowatt (BEV) ───────────────────────── */

export function matchOpenEv(c: MatchCandidate, names: FamilyNames | undefined, rows: readonly OevRecord[], rdw: RdwEvidence): SourceMatch {
  const base = { source: 'S17' as const, rejectedReasons: {} as Record<string, number> };
  if (c.productClass !== 'BEV') return { ...base, status: 'NOT_FOUND', granularity: 'NONE', basis: ['BEV-only dataset'], recordIds: [], generations: [] };
  const fam = names ? rows.filter((r) => r.make === names.make.openev && names.openev.includes(r.model)) : [];
  if (!fam.length) return { ...base, status: 'NOT_FOUND', granularity: 'NONE', basis: ['model not in dataset'], recordIds: [], generations: [] };
  const w = yearsWindow(c);
  const inWin = fam.filter((r) => r.year >= w.min && r.year <= w.max + 1);
  if (!inWin.length) return { ...base, status: 'NOT_FOUND', granularity: 'NONE', basis: [`no record for years ${w.min}–${w.max + 1} (dataset years ${[...new Set(fam.map((r) => r.year))].join(', ')})`], recordIds: [], generations: [] };
  const assessed = inWin.map((r) => {
    const contra: string[] = [];
    const checked: string[] = [];
    if (rdw.drivetrain && r.drivetrain) {
      checked.push('drivetrain');
      if (r.drivetrain !== rdw.drivetrain) contra.push('drivetrain');
    }
    if (c.powerKw !== undefined && r.systemPowerKw !== undefined) {
      checked.push('power_kw');
      if (Math.abs(r.systemPowerKw - c.powerKw) > POWER_TOLERANCE(c.powerKw)) contra.push('power_kw');
    }
    for (const k of contra) count(base.rejectedReasons, k);
    return { r, contra, checked };
  });
  const ok = assessed.filter((x) => !x.contra.length);
  if (!ok.length) return { ...base, status: assessed.some((x) => !x.contra.includes('power_kw')) ? 'REJECTED' : 'NOT_FOUND', granularity: 'MODEL', basis: [`${inWin.length} record(s) in the year window contradict drivetrain/power`], recordIds: [], generations: [] };
  const trims = [...new Set(ok.map((x) => `${x.r.trim}|${x.r.variant ?? ''}`))];
  const ids = ok.map((x) => x.r.id).sort();
  if (trims.length > 1) return { ...base, status: 'AMBIGUOUS', granularity: 'COMMERCIAL_TRIM', basis: [`${trims.length} compatible trims`], recordIds: ids, generations: trims };
  const strong = ok.every((x) => x.checked.includes('drivetrain') && x.checked.includes('power_kw'));
  return { ...base, status: strong ? 'STRONG_COMPATIBLE_MATCH' : 'WEAK_COMPATIBLE_MATCH', granularity: 'COMMERCIAL_TRIM', basis: [strong ? 'one trim; drivetrain (RDW) and power (EEA) compatible across model years' : 'one trim, drivetrain or power not checkable'], recordIds: ids, generations: trims };
}

export function matchKilowatt(c: MatchCandidate, names: FamilyNames | undefined, rows: readonly KwRecord[], rdw: RdwEvidence): SourceMatch {
  const base = { source: 'S19' as const, rejectedReasons: {} as Record<string, number> };
  if (c.productClass !== 'BEV') return { ...base, status: 'NOT_FOUND', granularity: 'NONE', basis: ['BEV-only dataset'], recordIds: [], generations: [] };
  const fam = names?.kilowatt ? rows.filter((r) => r.brand.toLowerCase() === names.make.kilowatt.toLowerCase() && names.kilowatt!.test(r.model)) : [];
  if (!fam.length) return { ...base, status: 'NOT_FOUND', granularity: 'NONE', basis: ['model not in dataset'], recordIds: [], generations: [] };
  const w = yearsWindow(c);
  const inWin = fam.filter((r) => r.year !== undefined && r.year >= w.min - 1 && r.year <= w.max);
  const ok = inWin.filter((r) => {
    const d = kilowattDrive(`${r.model} ${r.variant}`);
    const bad = !!(rdw.drivetrain && d && d !== rdw.drivetrain);
    if (bad) count(base.rejectedReasons, 'drivetrain');
    return !bad;
  });
  if (!ok.length) return { ...base, status: inWin.length ? 'REJECTED' : 'NOT_FOUND', granularity: 'MODEL', basis: [inWin.length ? 'records contradict the RDW drivetrain' : 'no record in the year window'], recordIds: [], generations: [] };
  const ids = ok.map((r) => r.id).sort();
  return ok.length > 1
    ? { ...base, status: 'AMBIGUOUS', granularity: 'COMMERCIAL_TRIM', basis: [`${ok.length} variants compatible (no power/TAN to separate them)`], recordIds: ids, generations: [...new Set(ok.map((r) => r.variant))] }
    : { ...base, status: 'WEAK_COMPATIBLE_MATCH', granularity: 'COMMERCIAL_TRIM', basis: ['single variant by name/drivetrain; no power to check'], recordIds: ids, generations: [ok[0]!.variant] };
}

/* ───────────────────────── S18 VehiclesDB (solo nomenclatura) ───────────────────────── */

export function vehiclesDbTaxonomy(names: FamilyNames | undefined, models: readonly VdbModel[]): { found: boolean; availableEs: boolean; canonical: string[]; aliases: string[] } {
  if (!names) return { found: false, availableEs: false, canonical: [], aliases: [] };
  const m = models.filter((x) => x.kind === 'car' && names.make.vehiclesdb.includes(x.make) && names.vehiclesdb.includes(x.model));
  return { found: m.length > 0, availableEs: m.some((x) => x.availability.includes('es')), canonical: [...new Set(m.map((x) => `${x.make} ${x.model}`))].sort(), aliases: [...new Set(m.flatMap((x) => x.aliases))].sort() };
}

/* ───────────────────────── Campos: disponibilidad ≠ elegibilidad ───────────────────────── */

export const GRANULARITY_RANK: Readonly<Record<DataGranularity | 'NONE', number>> = { NONE: -1, MODEL: 0, GENERATION: 1, POWERTRAIN: 2, COMMERCIAL_TRIM: 3, TECHNICAL_VARIANT: 4 };

/** Campo → granularidad mínima para que un valor externo describa la variante, clave crítica D1 y tolerancia de conflicto. */
export const FIELD_RULES = {
  generation: { min: 'GENERATION', critical: null, tol: 0 },
  body: { min: 'GENERATION', critical: null, tol: 0 },
  transmission: { min: 'POWERTRAIN', critical: null, tol: 0 },
  seats: { min: 'GENERATION', critical: 'seats', tol: 0 },
  boot: { min: 'GENERATION', critical: 'cap.boot_l', tol: 10 },
  length: { min: 'GENERATION', critical: 'dim.length_mm', tol: DIMENSION_TOLERANCE_MM },
  width: { min: 'GENERATION', critical: 'dim.width_mm', tol: DIMENSION_TOLERANCE_MM },
  height: { min: 'GENERATION', critical: 'dim.height_mm', tol: DIMENSION_TOLERANCE_MM },
  power: { min: 'POWERTRAIN', critical: 'perf.power_max_kw', tol: 2 },
  torque: { min: 'POWERTRAIN', critical: null, tol: 5 },
  accel_0_100: { min: 'POWERTRAIN', critical: 'perf.accel_0_100_s', tol: 0.2 },
  top_speed: { min: 'POWERTRAIN', critical: 'perf.top_speed_kmh', tol: 2 },
  drivetrain: { min: 'POWERTRAIN', critical: null, tol: 0 },
  battery_gross: { min: 'POWERTRAIN', critical: null, tol: 1 },
  battery_usable: { min: 'POWERTRAIN', critical: null, tol: 1 },
  ac_charging: { min: 'COMMERCIAL_TRIM', critical: 'chg.ac_max_kw', tol: 0.5 },
  dc_charging: { min: 'COMMERCIAL_TRIM', critical: 'chg.dc_max_kw', tol: 5 },
  electric_range: { min: 'COMMERCIAL_TRIM', critical: 'rng.electric_combined_km', tol: 0.03 },
  fuel_tank: { min: 'POWERTRAIN', critical: 'pt.fuel_tank_l', tol: 1 },
  warranty: { min: 'TECHNICAL_VARIANT', critical: 'war.years', tol: 0 },
  price: { min: 'TECHNICAL_VARIANT', critical: 'price', tol: 0 },
} as const satisfies Record<string, { min: DataGranularity; critical: string | null; tol: number }>;
export type FieldKey = keyof typeof FIELD_RULES;

export interface FieldEvidence {
  source: string;
  /** Valores observados (solo en memoria; los artefactos versionados guardan recuentos, nunca valores). */
  values: readonly (number | string)[];
  status?: OpenDatasetMatchStatus;
  granularity: DataGranularity | 'NONE';
  /** Fuente oficial con clave técnica exacta (EEA/RDW/Traficom). */
  officialExactKey?: boolean;
  /** Envolvente oficial (RDW: todas las versiones de la variante). Cuenta como un valor; un externo fuera de ella es conflicto. */
  envelope?: { min: number; max: number };
  /** Motivo explícito por el que el valor no describe la variante (p. ej. batería sin base bruta/útil declarada). */
  notApplicableReason?: string;
}

export interface FieldAssessment {
  field: FieldKey;
  found: boolean;
  matched: boolean;
  identityVerified: boolean;
  rightsApproved: boolean;
  usable: boolean;
  sources: { source: string; found: boolean; applicable: boolean; distinct: number; reason?: string }[];
  conflicts: { between: [string, string]; kind: 'OFFICIAL_VS_EXTERNAL' | 'EXTERNAL_VS_EXTERNAL' | 'PRESERVED_OFFICIAL' }[];
}

const MATCHED_STATUSES: readonly OpenDatasetMatchStatus[] = ['STRONG_COMPATIBLE_MATCH', 'WEAK_COMPATIBLE_MATCH', 'EXACT_DOCUMENTED_LINK'];

function differs(field: FieldKey, a: number | string, b: number | string): boolean {
  if (typeof a === 'string' || typeof b === 'string') return String(a) !== String(b);
  const tol = FIELD_RULES[field].tol;
  return field === 'electric_range' ? Math.abs(a - b) / Math.max(a, b) > tol : Math.abs(a - b) > tol;
}

/**
 * Regla (D1.5 §3): FOUND = algún valor en un registro de la familia/periodo; MATCHED = valor único en una coincidencia
 * STRONG/WEAK con granularidad suficiente (o fuente oficial exacta); IDENTITY_VERIFIED = solo fuente oficial con clave
 * exacta; RIGHTS_APPROVED = derechos de esa fuente publicables; USABLE = verificado ∧ derechos ∧ sin conflicto abierto.
 * Dos fuentes no oficiales que coinciden NO verifican nada; las que discrepan abren un conflicto que se conserva.
 */
export function assessField(field: FieldKey, evidence: readonly FieldEvidence[], rightsApproved: (source: string) => boolean, preservedConflict = false): FieldAssessment {
  const rule = FIELD_RULES[field];
  const sources = evidence.map((e) => {
    const distinct = e.envelope ? 1 : new Set(e.values.map(String)).size;
    const enough = !!e.officialExactKey || GRANULARITY_RANK[e.granularity] >= GRANULARITY_RANK[rule.min];
    const matched = !!e.officialExactKey || (!!e.status && MATCHED_STATUSES.includes(e.status));
    const applicable = distinct === 1 && enough && matched && !e.notApplicableReason;
    const reason = !distinct ? undefined : e.notApplicableReason ? e.notApplicableReason : !matched ? `match ${e.status ?? 'none'}` : !enough ? `granularity ${e.granularity} < ${rule.min}` : distinct > 1 ? `${distinct} distinct values` : undefined;
    return { source: e.source, found: distinct > 0, applicable, distinct, ...(reason ? { reason } : {}), value: applicable ? e.values[0] : undefined, envelope: e.envelope, official: !!e.officialExactKey };
  });
  const conflicts: FieldAssessment['conflicts'] = [];
  const app = sources.filter((s) => s.applicable);
  const clash = (a: (typeof app)[number], b: (typeof app)[number]) => {
    const env = a.envelope ?? b.envelope;
    const other = a.envelope ? b : a;
    if (env && !(a.envelope && b.envelope)) return typeof other.value !== 'number' || other.value < env.min - FIELD_RULES[field].tol || other.value > env.max + FIELD_RULES[field].tol;
    if (a.envelope && b.envelope) return false;
    return differs(field, a.value!, b.value!);
  };
  for (let i = 0; i < app.length; i++)
    for (let j = i + 1; j < app.length; j++)
      if (clash(app[i]!, app[j]!)) conflicts.push({ between: [app[i]!.source, app[j]!.source], kind: app[i]!.official || app[j]!.official ? 'OFFICIAL_VS_EXTERNAL' : 'EXTERNAL_VS_EXTERNAL' });
  if (preservedConflict) conflicts.push({ between: ['S01', 'S11'], kind: 'PRESERVED_OFFICIAL' });
  const official = app.filter((s) => s.official);
  const identityVerified = official.length > 0;
  const approved = official.some((s) => rightsApproved(s.source));
  const conflicted = conflicts.some((c) => c.kind !== 'EXTERNAL_VS_EXTERNAL');
  return {
    field,
    found: sources.some((s) => s.found),
    matched: app.length > 0,
    identityVerified,
    rightsApproved: approved,
    usable: identityVerified && approved && !conflicted,
    sources: sources.map(({ value: _v, official: _o, envelope: _e, ...s }) => s),
    conflicts,
  };
}

/* ───────────────────────── Niveles: Research → Curated Technical → Selectable ───────────────────────── */

export type DatasetTier = 'RESEARCH' | 'CURATED_TECHNICAL_PROPOSED' | 'SELECTABLE_PREVIEW' | 'SELECTABLE_PUBLIC';

/**
 * Propuesta ADR-019 (no aprobada, no implementada): una candidata entra en la base de curación técnica si su identidad
 * técnica es exacta (EEA) y RDW la corrobora, y no es un duplicado. Los conflictos no impiden guardar observaciones: se
 * guardan como conflicto. El selector (PREVIEW/PUBLIC) mantiene las exigencias actuales.
 */
export function readinessTier(x: { technicalExact: boolean; rdwExact: boolean; duplicate: boolean; generationVerified: boolean; modelYearVerified: boolean; commercialExact: boolean; criticalComplete: boolean; rightsPublishable: boolean }): { tier: DatasetTier; curatedTechnicalEligible: boolean; previewReady: boolean; publicReady: boolean; blockers: string[] } {
  const blockers: string[] = [];
  if (!x.technicalExact) blockers.push('technical identity not exact');
  if (!x.rdwExact) blockers.push('RDW does not corroborate the exact key');
  if (x.duplicate) blockers.push('probable duplicate of an existing catalogue variant (reconcile, do not insert)');
  const curated = x.technicalExact && x.rdwExact && !x.duplicate;
  if (!x.generationVerified) blockers.push('generation not verified');
  if (!x.modelYearVerified) blockers.push('model year not verified');
  if (!x.commercialExact) blockers.push('commercial identity (trim) not exact');
  if (!x.criticalComplete) blockers.push('critical keys missing');
  if (!x.rightsPublishable) blockers.push('rights pending');
  const preview = curated && x.generationVerified && x.modelYearVerified && x.commercialExact && x.criticalComplete;
  const pub = preview && x.rightsPublishable;
  return { tier: pub ? 'SELECTABLE_PUBLIC' : preview ? 'SELECTABLE_PREVIEW' : curated ? 'CURATED_TECHNICAL_PROPOSED' : 'RESEARCH', curatedTechnicalEligible: curated, previewReady: preview, publicReady: pub, blockers };
}
