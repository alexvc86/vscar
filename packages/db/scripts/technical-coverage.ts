/**
 * Step D1.7 — cobertura real del catálogo técnico y diagnóstico de preparación para D1.8 (SOLO LECTURA, sin valores).
 *
 *   node --env-file=.env packages/db/scripts/technical-coverage.ts [--out docs/data/d17/technical-catalog-coverage.json]
 *
 * Embudo por campo (acumulativo, por vehículo):
 *   FOUND → IDENTITY_VERIFIED (clave TAN+Va+Ve exacta) → TECHNICALLY_USABLE (Quality) → RIGHTS_APPROVED (APPROVED)
 *   → UNCONFLICTED → SELECTABLE_ELIGIBLE (+ identidad comercial EXACT y generación/año-modelo verificados).
 * En paralelo: "usable sin conflicto" (con independencia de derechos) y "con derechos condicionales" (S01, CC BY).
 *
 * Categorías: los requisitos de `CATEGORY_REQUIREMENTS`, con una excepción. En Economy el precio de tarifa no se exige
 * (lo aporta el usuario desde D1.6), y solo se evalúa el consumo. Es un diagnóstico; el gate del selector no cambia.
 *
 * Clasificación (diagnóstico, nunca autorización), por precedencia:
 *   1. CONFLICTED: conflicto en una clave que exige alguna categoría.
 *   2. NEEDS_IDENTITY: identidad comercial UNCONFIRMED o relación con el catálogo sin reconciliar.
 *   3. NEEDS_DATA: ninguna categoría técnicamente activable.
 *   4. NEEDS_RIGHTS: ninguna categoría activable solo con datos APPROVED/CONDITIONAL.
 *   5. READY_FOR_PROMOTION_REVIEW.
 */
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';
import { CATEGORY_REQUIREMENTS, type AlphaCategory, type PowertrainType, type Requirement } from '@vscar/vehicle-schema';
import { createDb, createTechnicalCurationRepository, type CuratedVehicleDetail } from '../src/index.ts';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');
const { values: args } = parseArgs({ options: { out: { type: 'string', default: 'docs/data/d17/technical-catalog-coverage.json' } } });
const url = process.env.DATABASE_URL;
if (!url) throw new Error('DATABASE_URL is not set (see .env.example)');

/** Relaciones con el catálogo seleccionable detectadas por el validador D1.7 (no son duplicados técnicos). */
const CATALOG_RELATIONS: Record<number, string> = { 88: 'same base TAN + Va as selectable variant tesla-model-3-2021-traccion-trasera (catalogue identity PARTIAL) — reconcile before promotion' };

const productPowertrain = (pc: string): PowertrainType => (pc === 'ICE_OR_MHEV' ? 'ICE' : pc === 'HEV_OR_MHEV' ? 'HEV' : (pc as PowertrainType));
const ELECTRIC = new Set(['BEV', 'PHEV']);

type Level = 'found' | 'usable' | 'usableUnconflicted' | 'authorized' | 'approved';
const FIELDS: Array<{ field: string; keys?: string[]; attribute?: string; commercial?: string; applies: (pt: PowertrainType) => boolean; all?: boolean }> = [
  { field: 'Potencia', keys: ['perf.power_max_kw', 'perf.power_ice_kw', 'perf.power_electric_kw'], applies: () => true },
  { field: 'Consumo de combustible', keys: ['nrg.fuel_combined_l100', 'nrg.fuel_charge_sustaining_l100', 'nrg.phev_weighted_fuel_l100'], applies: (pt) => pt !== 'BEV' },
  { field: 'Consumo eléctrico', keys: ['nrg.electric_combined_kwh100'], applies: (pt) => ELECTRIC.has(pt) },
  { field: 'Autonomía eléctrica', keys: ['rng.electric_combined_km'], applies: (pt) => ELECTRIC.has(pt) },
  { field: 'Dimensiones', keys: ['dim.length_mm', 'dim.width_mm', 'dim.height_mm'], all: true, applies: () => true },
  { field: 'Plazas', attribute: 'seats', applies: () => true },
  { field: 'Carrocería', attribute: 'body_type', applies: () => true },
  { field: 'Transmisión', attribute: 'transmission', applies: () => true },
  { field: 'Maletero', keys: ['cap.boot_l'], applies: () => true },
  { field: '0–100 km/h', keys: ['perf.accel_0_100_s'], applies: () => true },
  { field: 'Batería útil', keys: ['bat.capacity_kwh'], applies: (pt) => ELECTRIC.has(pt) },
  { field: 'Carga AC', keys: ['chg.ac_max_kw'], applies: (pt) => ELECTRIC.has(pt) },
  { field: 'Carga DC', keys: ['chg.dc_max_kw'], applies: (pt) => pt === 'BEV' },
  { field: 'Depósito', keys: ['pt.fuel_tank_l'], applies: (pt) => pt !== 'BEV' },
  { field: 'Generación confirmada', commercial: 'generation', applies: () => true },
  { field: 'Acabado comercial confirmado', commercial: 'trim', applies: () => true },
];
const CATEGORIES: AlphaCategory[] = ['Economy', 'Range', 'Size', 'Practicality', 'Performance', 'Charging'];

function keySets(d: CuratedVehicleDetail) {
  const sets: Record<Level, Set<string>> = { found: new Set(), usable: new Set(), usableUnconflicted: new Set(), authorized: new Set(), approved: new Set() };
  const conflicted = new Set<string>();
  for (const o of d.observations) {
    const k = o.value.spec_key;
    sets.found.add(k);
    if (o.conflict_status === 'IN_CONFLICT') conflicted.add(k);
  }
  for (const o of d.observations) {
    const k = o.value.spec_key;
    if (o.quality_status !== 'USABLE') continue;
    sets.usable.add(k);
    if (conflicted.has(k)) continue;
    sets.usableUnconflicted.add(k);
    if (o.rights_status === 'APPROVED' || o.rights_status === 'CONDITIONAL') sets.authorized.add(k);
    if (o.rights_status === 'APPROVED') sets.approved.add(k);
  }
  // Atributos técnicos OBSERVED (fuente oficial con clave exacta): seats, body_type, transmission…
  for (const a of d.attributes.filter((x) => x.kind === 'TECHNICAL')) {
    sets.found.add(`attr:${a.attribute}`);
    sets.usable.add(`attr:${a.attribute}`);
    sets.usableUnconflicted.add(`attr:${a.attribute}`);
    if (a.rights_status === 'APPROVED' || a.rights_status === 'CONDITIONAL') sets.authorized.add(`attr:${a.attribute}`);
    if (a.rights_status === 'APPROVED') sets.approved.add(`attr:${a.attribute}`);
  }
  return { sets, conflicted };
}

const reqLabel = (r: Requirement) => (r.kind === 'spec' ? r.key : r.kind === 'seats' ? 'attr:seats' : 'price');
function categoryStatus(pt: PowertrainType, cat: AlphaCategory, available: Set<string>): 'AVAILABLE' | 'MISSING' | 'NOT_APPLICABLE' {
  const alts = CATEGORY_REQUIREMENTS[pt][cat].filter((a) => !a.market || a.market === 'ES');
  if (!alts.length) return 'NOT_APPLICABLE';
  // Economy: sin precio de tarifa (lo introduce el usuario, D1.6).
  const ok = alts.some((a) => a.all.filter((r) => !(cat === 'Economy' && r.kind === 'price')).every((r) => available.has(reqLabel(r))));
  return ok ? 'AVAILABLE' : 'MISSING';
}
const categoryKeys = (pt: PowertrainType) => new Set(CATEGORIES.flatMap((c) => CATEGORY_REQUIREMENTS[pt][c].filter((a) => !a.market || a.market === 'ES').flatMap((a) => a.all.map(reqLabel))));

/** Completitud crítica (como D1.1–D1.6): requisitos de la primera alternativa ES (o la cumplida) de las 8 categorías. */
function criticalCompleteness(pt: PowertrainType, available: Set<string>) {
  const critical = new Set<string>();
  for (const alts of Object.values(CATEGORY_REQUIREMENTS[pt])) {
    const es = alts.filter((a) => !a.market || a.market === 'ES');
    if (!es.length) continue;
    const ok = es.find((a) => a.all.every((r) => available.has(reqLabel(r))));
    for (const r of (ok ?? es[0]!).all) critical.add(reqLabel(r));
  }
  critical.delete('emi.dgt_label_es'); // la etiqueta DGT se calcula, no es una observación (D1.6)
  return critical.size ? [...critical].filter((k) => available.has(k)).length / critical.size : 0;
}

const handle = createDb(url);
try {
  const repo = createTechnicalCurationRepository(handle.db);
  const list = await repo.listVehicles('ES');
  const details = await repo.loadVehicles(list.map((v) => v.id));
  const vehicles = details.map((d) => {
    const v = d.vehicle;
    const pt = productPowertrain(v.product_class);
    const { sets, conflicted } = keySets(d);
    const commercial = (a: string) => d.attributes.find((x) => x.kind === 'COMMERCIAL' && x.attribute === a);
    const fieldLevels = Object.fromEntries(
      FIELDS.filter((f) => f.applies(pt)).map((f) => {
        if (f.commercial) {
          const a = commercial(f.commercial);
          const verified = a?.status === 'EXACT';
          return [f.field, { found: !!a, identityVerified: !!a, usable: verified, approved: verified && a!.rights_status === 'APPROVED', unconflicted: verified && a!.rights_status === 'APPROVED', selectableEligible: false, usableUnconflicted: verified, authorized: verified && (a!.rights_status === 'APPROVED' || a!.rights_status === 'CONDITIONAL'), status: a?.status ?? 'NONE' }];
        }
        const keys = f.attribute ? [`attr:${f.attribute}`] : f.keys!;
        const has = (s: Set<string>) => (f.all ? keys.every((k) => s.has(k)) : keys.some((k) => s.has(k)));
        const found = has(sets.found);
        const usable = has(sets.usable);
        const approved = has(sets.approved);
        return [f.field, { found, identityVerified: found, usable, approved, unconflicted: approved && has(sets.usableUnconflicted), selectableEligible: false, usableUnconflicted: has(sets.usableUnconflicted), authorized: has(sets.authorized) }];
      }),
    );
    const cats = Object.fromEntries(CATEGORIES.map((c) => [c, { technical: categoryStatus(pt, c, sets.usableUnconflicted), authorized: categoryStatus(pt, c, sets.authorized), approved: categoryStatus(pt, c, sets.approved) }]));
    const important = [...conflicted].filter((k) => categoryKeys(pt).has(k));
    const technicalCats = CATEGORIES.filter((c) => cats[c]!.technical === 'AVAILABLE');
    const authorizedCats = CATEGORIES.filter((c) => cats[c]!.authorized === 'AVAILABLE');
    const relation = CATALOG_RELATIONS[v.d1_rank ?? -1];
    const blockers: string[] = [];
    if (important.length) blockers.push(`conflict in category key(s): ${important.join(', ')}`);
    if (v.commercial_identity_status === 'UNCONFIRMED') blockers.push('commercial identity UNCONFIRMED (no designation/trim)');
    if (relation) blockers.push(relation);
    if (!technicalCats.length) blockers.push('no comparison category technically activatable');
    if (technicalCats.length && !authorizedCats.length) blockers.push('activatable categories rely only on PENDING-rights sources');
    blockers.push('generation not verified (no source)', 'model_year not verified (no source)');
    if (v.commercial_identity_status !== 'EXACT') blockers.push('trim not confirmed');
    const status = important.length
      ? 'CONFLICTED'
      : v.commercial_identity_status === 'UNCONFIRMED' || relation
        ? 'NEEDS_IDENTITY'
        : !technicalCats.length
          ? 'NEEDS_DATA'
          : !authorizedCats.length
            ? 'NEEDS_RIGHTS'
            : 'READY_FOR_PROMOTION_REVIEW';
    return {
      rank: v.d1_rank ?? null,
      id: v.id,
      label: `${v.brand} ${v.model}`,
      technicalKey: v.technical_key,
      productClass: v.product_class,
      powertrain: pt,
      registration: v.registration_period,
      commercialIdentity: v.commercial_identity_status,
      observations: d.observations.length,
      usable: d.observations.filter((o) => o.quality_status === 'USABLE').length,
      conflictingValues: d.observations.filter((o) => o.conflict_status === 'IN_CONFLICT').length,
      conflictKeys: [...conflicted],
      importantConflictKeys: important,
      criticalCompleteness: Math.round(criticalCompleteness(pt, sets.usable) * 1000) / 1000,
      categories: cats,
      technicalCategories: technicalCats,
      authorizedCategories: authorizedCats,
      fields: fieldLevels,
      status,
      blockers,
    };
  });

  // Embudo por campo.
  const funnel = FIELDS.map((f) => {
    const vs = vehicles.filter((v) => v.fields[f.field]);
    const c = (k: string) => vs.filter((v) => (v.fields[f.field] as Record<string, unknown>)[k]).length;
    return { field: f.field, applicable: vs.length, FOUND: c('found'), IDENTITY_VERIFIED: c('identityVerified'), TECHNICALLY_USABLE: c('usable'), RIGHTS_APPROVED: c('approved'), UNCONFLICTED: c('unconflicted'), SELECTABLE_ELIGIBLE: 0, usableUnconflicted_anyRights: c('usableUnconflicted'), withConditionalRights_S01: c('authorized') };
  });
  const byPt = (k: string) => vehicles.filter((v) => v.productClass === k).length;
  const statusCount = Object.fromEntries(['READY_FOR_PROMOTION_REVIEW', 'NEEDS_IDENTITY', 'NEEDS_DATA', 'NEEDS_RIGHTS', 'CONFLICTED'].map((s) => [s, vehicles.filter((v) => v.status === s).length]));
  const catSummary = Object.fromEntries(CATEGORIES.map((c) => [c, { applicable: vehicles.filter((v) => v.categories[c]!.technical !== 'NOT_APPLICABLE').length, technicallyActivatable: vehicles.filter((v) => v.categories[c]!.technical === 'AVAILABLE').length, withConditionalRights: vehicles.filter((v) => v.categories[c]!.authorized === 'AVAILABLE').length, withApprovedRights: vehicles.filter((v) => v.categories[c]!.approved === 'AVAILABLE').length }]));

  // Candidatos para una demo privada: al menos una categoría activable, sin conflictos importantes, identidad comercial conocida, más categorías con derechos
  // compatibles, más completitud; desempate por rank. Diversidad: como mucho 2 por marca+modelo.
  const ID_SCORE: Record<string, number> = { EXACT: 2, PARTIAL: 1, UNCONFIRMED: 0 };
  const ranked = vehicles
    .filter((v) => !v.importantConflictKeys.length && !CATALOG_RELATIONS[v.rank ?? -1] && v.technicalCategories.length > 0)
    .sort((a, b) => ID_SCORE[b.commercialIdentity]! - ID_SCORE[a.commercialIdentity]! || b.authorizedCategories.length - a.authorizedCategories.length || b.technicalCategories.length - a.technicalCategories.length || b.criticalCompleteness - a.criticalCompleteness || (a.rank ?? 0) - (b.rank ?? 0));
  const perModel = new Map<string, number>();
  const demo = [];
  for (const v of ranked) {
    if (demo.length >= 20) break;
    if ((perModel.get(v.label) ?? 0) >= 2) continue;
    perModel.set(v.label, (perModel.get(v.label) ?? 0) + 1);
    demo.push({ rank: v.rank, label: v.label, powertrain: v.productClass, registration: v.registration, commercialIdentity: v.commercialIdentity, status: v.status, technicalCategories: v.technicalCategories, authorizedCategories: v.authorizedCategories, criticalCompleteness: v.criticalCompleteness });
  }

  const report = {
    step: 'D1.7',
    database: new URL(url).pathname.replace(/^\//, ''),
    note: 'Presence flags only — no values. Research datasets (S14–S19) are not in the curated layer and are never counted.',
    catalog: {
      totalVehicles: vehicles.length,
      distinctMakes: new Set(details.map((d) => d.vehicle.brand)).size,
      distinctModels: new Set(details.map((d) => `${d.vehicle.brand}|${d.vehicle.model}`)).size,
      fullTanIdentities: new Set(details.map((d) => d.vehicle.technical_key.toUpperCase())).size,
      byProductClass: { ICE_OR_MHEV: byPt('ICE_OR_MHEV'), MHEV: byPt('MHEV'), HEV_OR_MHEV: byPt('HEV_OR_MHEV'), PHEV: byPt('PHEV'), BEV: byPt('BEV') },
      commercialIdentity: Object.fromEntries(['EXACT', 'PARTIAL', 'UNCONFIRMED'].map((s) => [s, vehicles.filter((v) => v.commercialIdentity === s).length])),
      meanCriticalCompleteness: Math.round((vehicles.reduce((s, v) => s + v.criticalCompleteness, 0) / vehicles.length) * 1000) / 1000,
    },
    funnel,
    categories: catSummary,
    readiness: statusCount,
    demoCandidates: demo,
    vehicles,
  };
  await mkdir(dirname(join(ROOT, args.out!)), { recursive: true });
  await writeFile(join(ROOT, args.out!), `${JSON.stringify(report, null, 2)}\n`);
  const { vehicles: _v, ...summary } = report;
  console.log(JSON.stringify(summary, null, 2));
} finally {
  await handle.close();
}
