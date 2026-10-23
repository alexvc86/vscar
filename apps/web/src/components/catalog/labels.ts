import { buildVehicleDisplayLabel, POWERTRAINS, type VehicleOption } from '@/domain/catalog';

const TRANSMISSIONS = ['manual', 'automatic', 'dct', 'cvt', 'ecvt', 'single_speed'] as const;
const DRIVETRAINS = ['FWD', 'RWD', 'AWD'] as const;
const YEAR_BASES = ['MODEL_YEAR', 'REGISTRATION_OBSERVED'] as const;
const REASONS = ['COMMERCIAL_IDENTITY_UNCONFIRMED', 'GENERATION_NOT_VERIFIED', 'MODEL_YEAR_NOT_VERIFIED', 'TRIM_NOT_CONFIRMED', 'NOT_PROMOTED'] as const;
const FUELS = ['petrol', 'diesel', 'lpg', 'cng', 'hydrogen', 'electric'] as const;
import type { I18n } from '@/i18n/use-i18n';

/**
 * Textos del selector, ya traducidos en el servidor y pasados a las islas como datos (sin next-intl en el JS
 * inicial). Las plantillas con `{…}` se rellenan en el cliente con `fill()`.
 */
export interface SelectorLabels {
  pickerTitleA: string;
  pickerTitleB: string;
  searchLabel: string;
  placeholder: string;
  hint: string;
  browseTitle: string;
  /** Formas plurales ya resueltas: `{count}` se sustituye. */
  resultsOne: string;
  resultsOther: string;
  loading: string;
  empty: string;
  error: string;
  retry: string;
  clear: string;
  close: string;
  sameCar: string;
  otherSide: string;
  current: string;
  preview: string;
  previewNote: string;
  periodRange: string;
  periodFrom: string;
  /** `{cycle}` */
  cycle: string;
  powertrain: Record<string, string>;
  formatLocale: string;
  /** Step 7b.2: navegación Marca → Modelo → Año → Versión. */
  picker: PickerLabels;
}

export interface PickerLabels {
  carA: string;
  carB: string;
  stepsLabel: string;
  brand: string;
  model: string;
  year: string;
  version: string;
  chooseBrand: string;
  chooseModel: string;
  chooseYear: string;
  chooseVersion: string;
  summary: string;
  back: string;
  searchDirect: string;
  browse: string;
  modelsOne: string;
  modelsOther: string;
  yearUnknown: string;
  noVersions: string;
  chooseThisCar: string;
  technicalDetails: string;
  identityStatus: string;
  identityUnconfirmed: string;
  previewNotice: string;
  emptyPublic: string;
  loading: string;
  imagePreview: string;
  powertrainLabel: string;
  transmission: Record<string, string>;
  drivetrain: Record<string, string>;
  /** D1.8 (ADR-020): aclaración contextual y estados de disponibilidad. */
  configurationTitle: string;
  configurationQuestion: string;
  dontKnow: string;
  dontKnowTitle: string;
  dontKnowNote: string;
  chooseConfiguration: string;
  unavailableTitle: string;
  unavailableNote: string;
  technicalConfigurations: string;
  insufficientData: string;
  trimNotConfirmed: string;
  comparisonUnavailable: string;
  technicalOnly: string;
  /** Plurales ya resueltos: `{count}` se sustituye. */
  equivalentOne: string;
  equivalentOther: string;
  technicalOnlyOne: string;
  technicalOnlyOther: string;
  yearBasis: Record<string, string>;
  reasons: Record<string, string>;
  fuel: Record<string, string>;
  /** Plantillas: `{kw}`, `{km}`. */
  powerThermal: string;
  powerElectric: string;
  rangeKm: string;
}

export interface PairLabels {
  change: string;
  /** `{name}` */
  changeCar: string;
  swap: string;
  compareTitle: string;
  compareLead: string;
  chooseFirst: string;
  chooseSecond: string;
  slotA: string;
  slotB: string;
  compare: string;
  compareHint: string;
}

export function selectorLabels({ t, locale }: Pick<I18n, 't' | 'locale'>): SelectorLabels {
  return {
    pickerTitleA: t('catalog.pickerTitleA'),
    pickerTitleB: t('catalog.pickerTitleB'),
    searchLabel: t('catalog.searchLabel'),
    placeholder: t('catalog.placeholder'),
    hint: t('catalog.hint'),
    browseTitle: t('catalog.browseTitle'),
    resultsOne: t('catalog.resultsCount', { count: 1 }).replace('1', '{count}'),
    resultsOther: t('catalog.resultsCount', { count: 7 }).replace('7', '{count}'),
    loading: t('catalog.loading'),
    empty: t('catalog.empty'),
    error: t('catalog.error'),
    retry: t('catalog.retry'),
    clear: t('catalog.clear'),
    close: t('catalog.close'),
    sameCar: t('catalog.sameCar'),
    otherSide: t('catalog.otherSide'),
    current: t('catalog.current'),
    preview: t('catalog.preview'),
    previewNote: t('catalog.previewNote'),
    periodRange: (t.raw?.('catalog.periodRange') as string | undefined) ?? '',
    periodFrom: (t.raw?.('catalog.periodFrom') as string | undefined) ?? '',
    cycle: (t.raw?.('catalog.cycle') as string | undefined) ?? '',
    powertrain: Object.fromEntries(POWERTRAINS.map((p) => [p, t(`catalog.powertrain.${p}`)])),
    formatLocale: locale.formatLocale,
    picker: {
      carA: t('catalog.slotA'),
      carB: t('catalog.slotB'),
      ...Object.fromEntries(
        (['stepsLabel', 'brand', 'model', 'year', 'version', 'chooseBrand', 'chooseModel', 'chooseYear', 'chooseVersion', 'summary', 'back', 'searchDirect', 'browse', 'yearUnknown', 'noVersions', 'chooseThisCar', 'technicalDetails', 'identityStatus', 'identityUnconfirmed', 'previewNotice', 'emptyPublic', 'loading', 'imagePreview', 'powertrainLabel'] as const).map((k) => [k, t(`catalog.picker.${k}`)]),
      ),
      modelsOne: t('catalog.picker.modelsCount', { count: 1 }).replace('1', '{count}'),
      modelsOther: t('catalog.picker.modelsCount', { count: 7 }).replace('7', '{count}'),
      transmission: Object.fromEntries(TRANSMISSIONS.map((x) => [x, t(`catalog.picker.transmission.${x}`)])),
      drivetrain: Object.fromEntries(DRIVETRAINS.map((x) => [x, t(`catalog.picker.drivetrain.${x}`)])),
      ...Object.fromEntries(
        (['configurationTitle', 'configurationQuestion', 'dontKnow', 'dontKnowTitle', 'dontKnowNote', 'chooseConfiguration', 'unavailableTitle', 'unavailableNote', 'technicalConfigurations', 'insufficientData', 'trimNotConfirmed', 'comparisonUnavailable', 'technicalOnly'] as const).map((k) => [k, t(`catalog.picker.${k}`)]),
      ),
      equivalentOne: t('catalog.picker.equivalentCount', { count: 1 }).replace('1', '{count}'),
      equivalentOther: t('catalog.picker.equivalentCount', { count: 7 }).replace('7', '{count}'),
      technicalOnlyOne: t('catalog.picker.technicalOnlyCount', { count: 1 }).replace('1', '{count}'),
      technicalOnlyOther: t('catalog.picker.technicalOnlyCount', { count: 7 }).replace('7', '{count}'),
      yearBasis: Object.fromEntries(YEAR_BASES.map((x) => [x, t(`catalog.picker.yearBasis.${x}`)])),
      reasons: Object.fromEntries(REASONS.map((x) => [x, t(`catalog.picker.reasons.${x}`)])),
      fuel: Object.fromEntries(FUELS.map((x) => [x, t(`catalog.picker.fuel.${x}`)])),
      powerThermal: (t.raw?.('catalog.picker.powerThermal') as string | undefined) ?? '',
      powerElectric: (t.raw?.('catalog.picker.powerElectric') as string | undefined) ?? '',
      rangeKm: (t.raw?.('catalog.picker.rangeKm') as string | undefined) ?? '',
    } as PickerLabels,
  };
}

export function pairLabels({ t }: Pick<I18n, 't'>): PairLabels {
  return {
    change: t('catalog.change'),
    changeCar: (t.raw?.('catalog.changeCar') as string | undefined) ?? '',
    swap: t('catalog.swap'),
    compareTitle: t('catalog.compareTitle'),
    compareLead: t('catalog.compareLead'),
    chooseFirst: t('catalog.chooseFirst'),
    chooseSecond: t('catalog.chooseSecond'),
    slotA: t('catalog.slotA'),
    slotB: t('catalog.slotB'),
    compare: t('catalog.compare'),
    compareHint: t('catalog.compareHint'),
  };
}

/** Step 8b: textos de Nuevo/Usado y del formulario de la unidad (datos para la isla del selector). */
export interface UsedLabels {
  question: string;
  isNew: string;
  isUsed: string;
  newHint: string;
  usedHint: string;
  sameCarNew: string;
  step: string;
  /** `{side}` + `{condition}` ya resueltos por lado/condición: `badge.a.used`… */
  badge: Record<'a' | 'b', Record<'new' | 'used', string>>;
  form: Record<(typeof FORM_KEYS)[number], string> & {
    serviceOptions: Record<'full' | 'partial' | 'none' | 'unknown', string>;
    stateOptions: Record<'ok' | 'issues' | 'unknown', string>;
    damageOptions: Record<'none' | 'declared' | 'unknown', string>;
    errors: Record<string, string>;
  };
  review: { title: string; choose: string; notProvided: string; monthsOne: string; monthsOther: string; privacy: string };
  summary: Record<string, string>;
  shareNote: string;
}

const FORM_KEYS = ['title', 'lead', 'essentials', 'additional', 'optional', 'price', 'priceHint', 'km', 'kmHint', 'reg', 'regHint', 'month', 'year', 'monthUnknown', 'warranty', 'warrantyUnit', 'warrantyUnknown', 'warrantyHint', 'service', 'state', 'stateHint', 'soh', 'sohUnknown', 'sohHint', 'damage', 'review', 'back'] as const;

export function usedLabels({ t }: Pick<I18n, 't'>): UsedLabels {
  const raw = (k: string) => (t.raw?.(k) as string | undefined) ?? '';
  const group = (k: string, keys: readonly string[]) => Object.fromEntries(keys.map((x) => [x, t(`${k}.${x}`)]));
  return {
    question: t('used.condition.question'),
    isNew: t('used.condition.new'),
    isUsed: t('used.condition.used'),
    newHint: t('used.condition.newHint'),
    usedHint: t('used.condition.usedHint'),
    sameCarNew: t('used.condition.sameCarNew'),
    step: t('used.condition.step'),
    badge: {
      a: { new: t('used.badge', { side: 'A', condition: 'new' }), used: t('used.badge', { side: 'A', condition: 'used' }) },
      b: { new: t('used.badge', { side: 'B', condition: 'new' }), used: t('used.badge', { side: 'B', condition: 'used' }) },
    },
    form: {
      ...group('used.form', FORM_KEYS),
      serviceOptions: group('used.form.serviceOptions', ['full', 'partial', 'none', 'unknown']),
      stateOptions: group('used.form.stateOptions', ['ok', 'issues', 'unknown']),
      damageOptions: group('used.form.damageOptions', ['none', 'declared', 'unknown']),
      // Plantillas con `{min}`/`{max}`: se rellenan en el cliente con `fill()`.
      errors: Object.fromEntries(['integer', 'price', 'km', 'regYear', 'regFuture', 'regMonth', 'warranty', 'soh'].map((x) => [x, raw(`used.form.errors.${x}`)])),
    } as UsedLabels['form'],
    review: {
      title: t('used.review.title'),
      choose: t('used.review.choose'),
      notProvided: t('used.review.notProvided'),
      monthsOne: t('used.review.months', { count: 1 }).replace('1', '{count}'),
      monthsOther: t('used.review.months', { count: 7 }).replace('7', '{count}'),
      privacy: t('used.review.privacy'),
    },
    summary: group('used.summary', ['price', 'km', 'reg', 'service']),
    shareNote: t('used.shareNote'),
  };
}

export const fill = (template: string, values: Record<string, string | number>) => template.replace(/\{(\w+)\}/g, (_, k: string) => String(values[k] ?? ''));

/** Texto de una opción: nombre comercial + "año · powertrain" (+ periodo si distingue variants técnicas). */
export function optionText(o: VehicleOption, labels: Pick<SelectorLabels, 'powertrain' | 'periodRange' | 'periodFrom' | 'cycle' | 'formatLocale'>) {
  const l = buildVehicleDisplayLabel(o);
  const month = (iso: string) => new Intl.DateTimeFormat(labels.formatLocale, { month: 'short', year: 'numeric', timeZone: 'UTC' }).format(new Date(`${iso}T00:00:00Z`));
  const powertrain = labels.powertrain[l.powertrain] ? `${labels.powertrain[l.powertrain]} (${l.powertrain})` : l.powertrain;
  const dated = l.period ? (l.period.to ? fill(labels.periodRange, { from: month(l.period.from), to: month(l.period.to) }) : fill(labels.periodFrom, { from: month(l.period.from) })) : undefined;
  const cycle = l.cycle ? fill(labels.cycle, { cycle: l.cycle }) : undefined;
  const period = [dated, cycle].filter(Boolean).join(' · ') || undefined;
  return { brand: l.brand, name: l.name, short: l.short, meta: [l.year ?? undefined, powertrain].filter(Boolean).join(' · '), ...(period ? { period } : {}) };
}
