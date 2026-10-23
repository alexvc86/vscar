'use client';
import { Sheet } from '@vscar/ui/sheet';
import { motion, MotionConfig } from 'motion/react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { yearParam, type BrandOption, type ModelCard, type VehicleOption, type YearOption } from '@/domain/catalog';
import type { ConfigurationChoice, Resolution } from '@/domain/model-selection';
import { EMPTY_USED_FORM, factsToForm, validateUsedForm, type UsedFormError, type UsedFormValues } from '@/domain/used-form';
import { sohApplies, type SideCondition, type UsedFacts } from '@/domain/used-params';
import { ModelVisual } from '../vehicle/ModelVisual';
import { fill, optionText, type SelectorLabels, type UsedLabels } from './labels';
import { UsedDetailsForm } from './UsedDetailsForm';
import { usedFactLines } from './used-text';
import { VehiclePickerSearch } from './VehiclePickerSearch';

/**
 * VehiclePicker (Step 7b.2 → D1.8, ADR-020): el usuario piensa en lenguaje comercial — Marca → Modelo → Año — y el
 * sistema resuelve internamente la homologación:
 * - una configuración (o un grupo de homologaciones equivalentes) → coche elegido sin más pasos;
 * - varias configuraciones reales → aclaración CONTEXTUAL de motorización (no es un cuarto paso fijo), con "No lo sé";
 * - solo homologaciones técnicas (sin ReferenceVariant seleccionable) → información disponible y "Comparación no
 *   disponible", sin cálculos.
 * Nunca se elige una variante arbitraria: la resolución viene del servidor (`level=configurations`).
 *
 * Chunk DIFERIDO. Datos por paso desde `/api/catalog/browse` (derechos de datos y de media ya aplicados en servidor).
 * Accesibilidad: diálogo Radix, pasos con `aria-current="step"`, foco en el título de cada paso al avanzar o volver,
 * botones nativos (teclado), objetivos ≥ 44 px. Motion solo para transición de paso, hover y selección.
 *
 * Step 8b: tras resolver el coche, "¿Cómo estás considerando este coche?" → Nuevo (listo) o Usado → datos de la unidad →
 * revisión → elegir. La misma ReferenceVariant que el otro lado es válida si alguno de los dos es usado. Cambiar de
 * vehículo nunca arrastra los hechos de la unidad anterior; volver atrás conserva lo escrito para la misma unidad.
 */
export type VehicleChoice = { option: VehicleOption; condition: SideCondition };

export interface VehiclePickerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  side: 'a' | 'b';
  market: string;
  labels: SelectorLabels;
  current?: VehicleOption | undefined;
  /** El coche del otro lado (A ≠ B salvo que uno de los dos sea una unidad usada). */
  other?: VehicleOption | undefined;
  /** Step 8b: condición actual de este lado (para reeditar la misma unidad) y del otro lado. */
  currentCondition?: SideCondition | undefined;
  otherCondition?: SideCondition | undefined;
  used: UsedLabels;
  /** Fecha de hoy en el mercado (validación de la matriculación). */
  today: string;
  onSelect: (choice: VehicleChoice) => void;
}

type Step = 'brand' | 'model' | 'year' | 'configuration' | 'unavailable' | 'summary' | 'used' | 'review';
const STEPS = ['brand', 'model', 'year'] as const;
type Status = 'loading' | 'ready' | 'error';

/** Caché de respuestas por mercado y parámetros (sesión). */
const responses = new Map<string, Promise<Record<string, unknown>>>();
function browse<T>(market: string, params: Record<string, string>): Promise<T> {
  const qs = new URLSearchParams({ market, ...params }).toString();
  let p = responses.get(qs);
  if (!p) {
    p = fetch(`/api/catalog/browse?${qs}`, { headers: { accept: 'application/json' } }).then((r) => (r.ok ? (r.json() as Promise<Record<string, unknown>>) : Promise.reject(new Error(String(r.status)))));
    p.catch(() => responses.delete(qs));
    responses.set(qs, p);
  }
  return p as Promise<T>;
}

const ease = [0.2, 0.8, 0.2, 1] as const;

/**
 * Precarga tras `load` + inactividad (la llaman las islas): con el chunk y las marcas ya en memoria, abrir el selector
 * no espera a la red. No afecta al JS inicial (este módulo es diferido).
 */
export function prefetchPicker(market: string): void {
  void browse(market, { level: 'brands' }).catch(() => undefined);
}

/** Texto breve de una configuración: solo hechos comprensibles (nunca códigos de homologación ni ciclos). */
export function configurationText(c: ConfigurationChoice, labels: SelectorLabels): string {
  const L = labels.picker;
  const num = new Intl.NumberFormat(labels.formatLocale, { maximumFractionDigits: 1 });
  const kw = (p: { min: number; max: number }) => (p.min === p.max ? num.format(p.min) : `${num.format(p.min)}–${num.format(p.max)}`);
  const power = c.powerKw ? fill(c.powertrainType === 'BEV' ? L.powerElectric : L.powerThermal, { kw: kw(c.powerKw) }) : undefined;
  return [
    labels.powertrain[c.powertrainType] ?? c.powertrainType,
    c.fuel && c.powertrainType !== 'BEV' ? (L.fuel[c.fuel] ?? c.fuel) : undefined,
    power,
    c.transmission ? (L.transmission[c.transmission] ?? c.transmission) : undefined,
    c.rangeKm ? fill(L.rangeKm, { km: kw(c.rangeKm) }) : undefined,
  ]
    .filter(Boolean)
    .join(' · ');
}

export default function VehiclePicker({ open, onOpenChange, side, market, labels, current, other, currentCondition, otherCondition, used, today, onSelect }: VehiclePickerProps) {
  const L = labels.picker;
  const [mode, setMode] = useState<'browse' | 'search'>('browse');
  const [step, setStep] = useState<Step>('brand');
  const [brand, setBrand] = useState<string>();
  const [model, setModel] = useState<ModelCard>();
  /** `undefined` = sin elegir; `null` = año desconocido elegido. */
  const [year, setYear] = useState<number | null | undefined>(undefined);
  const [resolution, setResolution] = useState<Resolution>();
  const [configuration, setConfiguration] = useState<ConfigurationChoice>();
  /** Por qué no hay comparación: solo datos técnicos, o el usuario no conoce la motorización. */
  const [unavailable, setUnavailable] = useState<'technical' | 'dontKnow'>('technical');
  /** Vehículo elegido (desde la navegación o la búsqueda directa). */
  const [chosen, setChosen] = useState<VehicleOption>();
  const [form, setForm] = useState<UsedFormValues>(EMPTY_USED_FORM);
  const [formErrors, setFormErrors] = useState<UsedFormError[]>([]);
  const [facts, setFacts] = useState<UsedFacts>();
  const [brands, setBrands] = useState<BrandOption[]>();
  const [models, setModels] = useState<ModelCard[]>();
  const [years, setYears] = useState<YearOption[]>();
  const [channel, setChannel] = useState<'PUBLIC' | 'PREVIEW'>();
  const [status, setStatus] = useState<Status>('loading');
  const [notice, setNotice] = useState('');
  const [attempt, setAttempt] = useState(0);
  const heading = useRef<HTMLHeadingElement>(null);
  const searchInput = useRef<HTMLInputElement>(null);
  const focusOnStep = useRef(false);

  const fail = useCallback(() => setStatus('error'), []);

  // Apertura: si el lado ya tiene coche, se parte de su modelo (paso Año); si no, de la marca.
  useEffect(() => {
    if (!open) return;
    setMode('browse');
    setNotice('');
    setResolution(undefined);
    setConfiguration(undefined);
    setChosen(undefined);
    setFacts(undefined);
    setFormErrors([]);
    if (current) {
      setBrand(current.brand);
      setYear(undefined);
      setStep('year');
    } else {
      setBrand(undefined);
      setModel(undefined);
      setYear(undefined);
      setStep('brand');
    }
  }, [open, side, current]);

  useEffect(() => {
    if (!open) return;
    browse<{ brands: BrandOption[]; channel: 'PUBLIC' | 'PREVIEW' }>(market, { level: 'brands' })
      .then((r) => {
        setBrands(r.brands);
        setChannel(r.channel);
        setStatus('ready');
      })
      .catch(fail);
  }, [open, market, attempt, fail]);

  // Prefetch: al elegir marca, sus modelos.
  useEffect(() => {
    if (!open || !brand) return;
    setModels(undefined);
    browse<{ models: ModelCard[] }>(market, { level: 'models', brand })
      .then((r) => {
        setModels(r.models);
        // Apertura sobre un coche existente: su tarjeta de modelo.
        if (current && current.brand === brand) setModel((m) => m ?? r.models.find((x) => x.model === current.model));
      })
      .catch(fail);
  }, [open, market, brand, current, attempt, fail]);

  // Prefetch: al elegir modelo, sus años.
  useEffect(() => {
    if (!open || !brand || !model) return;
    setYears(undefined);
    browse<{ years: YearOption[] }>(market, { level: 'years', brand, model: model.model })
      .then((r) => setYears(r.years))
      .catch(fail);
  }, [open, market, brand, model, attempt, fail]);

  // Al elegir año: resolución técnica en el servidor (nunca en el cliente).
  useEffect(() => {
    if (!open || !brand || !model || year === undefined) return;
    browse<{ resolution: Resolution }>(market, { level: 'configurations', brand, model: model.model, year: yearParam(year) })
      .then((r) => setResolution(r.resolution))
      .catch(fail);
  }, [open, market, brand, model, year, attempt, fail]);

  // Foco en el título del paso al avanzar/volver (no solo animación).
  useEffect(() => {
    if (!focusOnStep.current) return;
    focusOnStep.current = false;
    if (mode === 'search') searchInput.current?.focus();
    else heading.current?.focus();
  }, [step, mode]);

  const go = (s: Step) => {
    focusOnStep.current = true;
    setNotice('');
    setStep(s);
  };

  /**
   * Vehículo elegido → paso Nuevo/Usado. Otra unidad (otra variant) empieza con el formulario vacío: nunca se
   * reutiliza el historial, el precio ni el kilometraje de la anterior. La misma variant que ya tenía este lado como
   * usada se reabre con sus datos.
   */
  const choose = (o: VehicleOption) => {
    if (o.id !== chosen?.id) {
      const sameUnit = current?.id === o.id && currentCondition?.condition === 'used';
      setForm(sameUnit ? factsToForm(currentCondition.facts) : EMPTY_USED_FORM);
      setFacts(undefined);
      setFormErrors([]);
    }
    setChosen(o);
    go('summary');
  };

  // Resolución recibida mientras se espera (paso `configuration`): una sola configuración comparable → coche elegido;
  // ninguna comparable → información técnica; varias → aclaración contextual.
  useEffect(() => {
    if (step !== 'configuration' || !resolution || configuration) return;
    const comparable = resolution.configurations.filter((c) => c.availability === 'COMPARISON_ELIGIBLE' && c.option);
    if (resolution.status === 'UNRESOLVED' || !comparable.length) {
      setUnavailable('technical');
      go('unavailable');
    } else if (comparable.length === 1) {
      setConfiguration(comparable[0]);
      choose(comparable[0]!.option!);
    }
    // Reacciona solo a la llegada de la resolución (choose/go son funciones del render actual).
  }, [step, resolution, configuration]);

  const pickBrand = (b: string) => {
    if (b !== brand) {
      setModel(undefined);
      setYear(undefined);
      setResolution(undefined);
    }
    setBrand(b);
    go('model');
  };
  const pickModel = (m: ModelCard) => {
    if (m.model !== model?.model) {
      setYear(undefined);
      setResolution(undefined);
    }
    setModel(m);
    go('year');
  };
  const pickYear = (y: number | null) => {
    if (y !== year) setResolution(undefined);
    setConfiguration(undefined);
    setYear(y);
    go('configuration');
  };
  const pickConfiguration = (c: ConfigurationChoice) => {
    setConfiguration(c);
    if (c.option) choose(c.option);
  };
  const pickNew = () => {
    if (!chosen) return;
    // Nuevo vs nuevo de la misma variant no es una comparación.
    if (other && chosen.id === other.id && otherCondition?.condition !== 'used') {
      setNotice(used.sameCarNew);
      return;
    }
    onSelect({ option: chosen, condition: { condition: 'new' } });
  };
  const applies = !!chosen && sohApplies(chosen.powertrainType);
  const review = () => {
    const r = validateUsedForm(form, today, applies);
    if (!r.ok) {
      setFormErrors(r.errors);
      // Foco en el primer campo con error (el mensaje está asociado con aria-describedby).
      requestAnimationFrame(() => document.getElementById(`uf-${r.errors[0]!.field}`)?.focus());
      return;
    }
    setFormErrors([]);
    setFacts(r.facts);
    go('review');
  };
  const needsClarification = resolution?.status === 'NEEDS_CONFIGURATION';
  const back = () => {
    if (step === 'review') return go('used');
    if (step === 'used') return go('summary');
    // Elegido desde la búsqueda directa (sin modelo navegado): vuelve a la búsqueda.
    if (step === 'summary' && !model) {
      focusOnStep.current = true;
      setMode('search');
      return;
    }
    if (step === 'summary') {
      setConfiguration(undefined);
      return go(needsClarification ? 'configuration' : 'year');
    }
    if (step === 'unavailable' && unavailable === 'dontKnow') return go('configuration');
    if (step === 'configuration' || step === 'unavailable') {
      setConfiguration(undefined);
      return go('year');
    }
    go(step === 'year' ? 'model' : 'brand');
  };
  const reachable = (s: (typeof STEPS)[number]) => s === 'brand' || (s === 'model' && !!brand) || (s === 'year' && !!model);
  const yearLabel = (y: number | null) => (y === null ? L.yearUnknown : String(y));
  const valueOf = (s: (typeof STEPS)[number]) => (s === 'brand' ? brand : s === 'model' ? model?.model : year === undefined ? undefined : yearLabel(year));
  const titleOf: Record<Step, string> = {
    brand: L.chooseBrand,
    model: L.chooseModel,
    year: L.chooseYear,
    configuration: L.configurationQuestion,
    unavailable: unavailable === 'dontKnow' ? L.dontKnowTitle : L.unavailableTitle,
    summary: used.question,
    used: used.form.title,
    review: used.review.title,
  };
  const stepIndex = step === 'brand' ? 1 : step === 'model' ? 2 : 3;
  const multiGen = (model?.generations.length ?? 0) > 1;
  const carName = model && year !== undefined ? `${model.brand} ${model.model} ${yearLabel(year)}` : '';

  const content = () => {
    if (status === 'error')
      return (
        <div className="picker__error" role="alert">
          <p>{labels.error}</p>
          <button type="button" className="vs-button vs-button--ghost vs-button--sm" onClick={() => (setStatus('loading'), setAttempt((n) => n + 1))}>
            {labels.retry}
          </button>
        </div>
      );
    if (step === 'brand') {
      if (!brands) return <p className="muted">{L.loading}</p>;
      if (!brands.length) return <p className="vp__empty">{L.emptyPublic}</p>;
      return (
        <ul className="vp__grid vp__grid--brands">
          {brands.map((b) => (
            <li key={b.brand}>
              <motion.button type="button" className="vp-brand" aria-pressed={b.brand === brand} onClick={() => pickBrand(b.brand)} whileHover={{ y: -2 }} whileTap={{ scale: 0.98 }} data-testid={`brand-${b.brand}`} data-availability={b.availability}>
                <span className="vp-brand__name">{b.brand}</span>
                <span className="muted small">{fill(b.models === 1 ? L.modelsOne : L.modelsOther, { count: b.models })}</span>
                {b.availability !== 'COMPARISON_ELIGIBLE' ? <span className="picker__badge">{L.technicalOnly}</span> : null}
              </motion.button>
            </li>
          ))}
        </ul>
      );
    }
    if (step === 'model') {
      if (!models) return <p className="muted">{L.loading}</p>;
      return (
        <ul className="vp__grid vp__grid--models">
          {models.map((m, i) => (
            <li key={m.model}>
              <motion.button type="button" className="vp-model" aria-pressed={m.model === model?.model} onClick={() => pickModel(m)} whileHover={{ y: -3 }} whileTap={{ scale: 0.98 }} data-testid={`model-${m.model}`} data-availability={m.availability}>
                <ModelVisual media={m.media} bodyType={m.bodyType} name={`${m.brand} ${m.model}`} eager={i < 4} />
                <span className="vp-model__name">{m.model}</span>
                <span className="mono small muted">{m.years.map(yearLabel).join(' · ')}</span>
                {m.generations.length > 1 ? <span className="mono small subtle">{m.generations.join(' · ')}</span> : null}
                {m.availability !== 'COMPARISON_ELIGIBLE' ? <span className="picker__badge">{L.technicalOnly}</span> : null}
                {m.media?.preview ? <span className="picker__badge">{L.imagePreview}</span> : null}
              </motion.button>
            </li>
          ))}
        </ul>
      );
    }
    if (step === 'year') {
      if (!years) return <p className="muted">{L.loading}</p>;
      const chips = years.length <= 5;
      return (
        <ul className={chips ? 'vp__chips' : 'vp__list'}>
          {years.map((y) => (
            <li key={yearParam(y.year)}>
              <motion.button type="button" className={chips ? 'vp-chip' : 'vp-row'} aria-pressed={y.year === year} onClick={() => pickYear(y.year)} whileTap={{ scale: 0.97 }} data-testid={`year-${yearParam(y.year)}`} data-availability={y.availability}>
                <span className="vp-chip__year">{yearLabel(y.year)}</span>
                {multiGen && y.generations.length ? <span className="mono small muted">{y.generations.join(' · ')}</span> : null}
                {/* La base del año solo se señala cuando NO es año-modelo (matriculaciones observadas ≠ año-modelo). */}
                {!y.basis.includes('MODEL_YEAR') ? <span className="small subtle">{L.yearBasis.REGISTRATION_OBSERVED}</span> : null}
                {y.availability !== 'COMPARISON_ELIGIBLE' ? <span className="picker__badge">{L.technicalOnly}</span> : null}
              </motion.button>
            </li>
          ))}
        </ul>
      );
    }
    if (step === 'configuration') {
      if (!resolution) return <p className="muted">{L.loading}</p>;
      const comparable = resolution.configurations.filter((c) => c.availability === 'COMPARISON_ELIGIBLE' && c.option);
      if (comparable.length <= 1) return <p className="muted">{L.loading}</p>;
      return (
        <div className="vp-config" data-testid="configuration-panel">
          <p className="muted small">
            {L.configurationTitle} · {carName}
          </p>
          <ul className="vp__list">
            {comparable.map((c) => (
              <li key={c.key}>
                <motion.button type="button" className="vp-row" aria-pressed={c.key === configuration?.key} onClick={() => pickConfiguration(c)} whileTap={{ scale: 0.99 }} data-testid={`configuration-${c.key}`}>
                  <span className="vp-variant__name">{c.name}</span>
                  <span className="mono small muted">{configurationText(c, labels)}</span>
                  {c.members > 1 ? <span className="small subtle">{fill(L.equivalentOther, { count: c.members })}</span> : null}
                  {other && c.option?.id === other.id ? <span className="picker__badge">{labels.otherSide}</span> : null}
                </motion.button>
              </li>
            ))}
            <li>
              <button
                type="button"
                className="vp-row vp-row--quiet"
                onClick={() => {
                  setUnavailable('dontKnow');
                  go('unavailable');
                }}
                data-testid="configuration-dont-know"
              >
                <span className="vp-variant__name">{L.dontKnow}</span>
              </button>
            </li>
          </ul>
          {resolution.technicalOnly ? <p className="muted small">{fill(resolution.technicalOnly === 1 ? L.technicalOnlyOne : L.technicalOnlyOther, { count: resolution.technicalOnly })}</p> : null}
        </div>
      );
    }
    if (step === 'unavailable') {
      const technical = (resolution?.configurations ?? []).filter((c) => c.availability !== 'COMPARISON_ELIGIBLE');
      return (
        <div className="vp-unavailable" data-testid="unavailable-panel" data-reason={unavailable}>
          <p className="vp-review__name">{carName}</p>
          <p>{unavailable === 'dontKnow' ? L.dontKnowNote : L.unavailableNote}</p>
          {unavailable === 'technical' && technical.length ? (
            <>
              <h4 className="label">{L.technicalConfigurations}</h4>
              <ul className="vp-unavailable__list">
                {technical.map((c) => (
                  <li key={c.key} className="small">
                    <span className="mono">{configurationText(c, labels)}</span>
                    {c.members > 1 ? <span className="subtle"> · ×{c.members}</span> : null}
                    {c.reasons?.length ? <span className="muted"> — {c.reasons.map((r) => L.reasons[r] ?? r).join(' · ')}</span> : null}
                  </li>
                ))}
              </ul>
            </>
          ) : null}
          <p className="picker__badge">{L.comparisonUnavailable}</p>
          <div className="vp-unavailable__actions">
            {unavailable === 'dontKnow' ? (
              <button type="button" className="vs-button vs-button--solid vs-button--sm" onClick={() => go('configuration')} data-testid="choose-configuration">
                {L.chooseConfiguration}
              </button>
            ) : null}
            <button type="button" className="vs-button vs-button--ghost vs-button--sm" onClick={back}>
              ← {L.back}
            </button>
          </div>
        </div>
      );
    }
    // Paso 8b: datos de la unidad usada.
    if (step === 'used' && chosen) {
      return <UsedDetailsForm values={form} onChange={setForm} errors={formErrors} labels={used} sohApplies={applies} formatLocale={labels.formatLocale} onReview={review} />;
    }
    // Paso 8b: revisión de la unidad antes de elegir.
    if (step === 'review' && chosen && facts) {
      const text = optionText(chosen, labels);
      return (
        <div className="vp-review" data-testid="used-review-panel">
          <p className="vp-review__car">
            <span className="vp-review__name">
              {chosen.brand} {text.name}
            </span>
            <span className="mono small muted">{text.meta}</span>
            <span className={`condition-badge condition-badge--used tone-${side}`}>{used.badge[side].used}</span>
          </p>
          <dl className="vp-review__facts">
            {usedFactLines(facts, used, labels.formatLocale, { sohApplies: applies }).map((l) => (
              <div key={l.key} data-provided={l.provided}>
                <dt>{l.label}</dt>
                <dd className={l.provided ? 'mono' : 'muted'}>{l.value}</dd>
              </div>
            ))}
          </dl>
          <p className="muted small">{used.review.privacy}</p>
          <button type="button" className="vs-button vs-button--solid vs-button--lg" onClick={() => onSelect({ option: chosen, condition: { condition: 'used', facts } })} data-testid="choose-car">
            {used.review.choose}
          </button>
        </div>
      );
    }
    // Resumen: visual + identidad comercial + ¿Nuevo o Usado? Resuelve la ReferenceVariant exacta.
    if (!chosen) return null;
    const conf = configuration?.option?.id === chosen.id ? configuration : undefined;
    return (
      <div className="vp-summary" data-variant-id={chosen.id}>
        <ModelVisual media={model?.model === chosen.model ? model.media : undefined} bodyType={chosen.bodyType} name={`${chosen.brand} ${chosen.model}`} eager sizes="(max-width: 699px) 90vw, 440px" className="model-visual--summary" />
        <dl className="vp-summary__facts">
          <div>
            <dt>{L.brand}</dt>
            <dd>{chosen.brand}</dd>
          </div>
          <div>
            <dt>{L.model}</dt>
            <dd>{chosen.model}</dd>
          </div>
          <div>
            <dt>{L.year}</dt>
            <dd>{yearLabel(chosen.year)}</dd>
          </div>
          <div>
            <dt>{L.powertrainLabel}</dt>
            <dd>
              {chosen.variant}
              <span className="mono small muted vp-summary__distinct">{conf ? configurationText(conf, labels) : (labels.powertrain[chosen.powertrainType] ?? chosen.powertrainType)}</span>
            </dd>
          </div>
        </dl>
        <div className="vp-condition" role="group" aria-labelledby="vp-step-title">
          <button type="button" className="vp-condition__option" onClick={pickNew} data-testid="condition-new">
            <span className="vp-condition__name">{used.isNew}</span>
            <span className="muted small">{used.newHint}</span>
          </button>
          <button type="button" className="vp-condition__option" onClick={() => go('used')} data-testid="condition-used">
            <span className="vp-condition__name">{used.isUsed}</span>
            <span className="muted small">{used.usedHint}</span>
          </button>
        </div>
      </div>
    );
  };

  return (
    <Sheet
      open={open}
      onOpenChange={onOpenChange}
      title={side === 'a' ? labels.pickerTitleA : labels.pickerTitleB}
      closeLabel={labels.close}
      className="vs-picker vs-picker--browse"
      onOpenAutoFocus={(e) => {
        e.preventDefault();
        heading.current?.focus();
      }}
      onCloseAutoFocus={(e) => {
        const trigger = document.querySelector<HTMLElement>(`[data-picker-trigger="${side}"]`);
        if (trigger) {
          e.preventDefault();
          trigger.focus();
        }
      }}
    >
      <MotionConfig reducedMotion="user" transition={{ duration: 0.18, ease }}>
        <div className="vp" data-step={step} data-mode={mode} data-side={side}>
          <div className="vp__bar">
            <span className={`label tone-${side}`} data-testid="picker-side">
              {side === 'a' ? L.carA : L.carB}
            </span>
            {mode === 'browse' && step !== 'brand' ? (
              <button type="button" className="vs-button vs-button--quiet vs-button--sm vp__back" onClick={back} data-testid="picker-back">
                ← {L.back}
              </button>
            ) : null}
            <button
              type="button"
              className="vs-button vs-button--ghost vs-button--sm vp__mode"
              onClick={() => {
                focusOnStep.current = true;
                setMode((m) => (m === 'browse' ? 'search' : 'browse'));
              }}
              data-testid="picker-mode"
            >
              {mode === 'browse' ? L.searchDirect : L.browse}
            </button>
          </div>
          {channel === 'PREVIEW' ? <p className="vp__preview muted small">{L.previewNotice}</p> : null}

          {mode === 'search' ? (
            <VehiclePickerSearch
              market={market}
              labels={labels}
              current={current}
              other={other}
              onSelect={(o) => {
                setMode('browse');
                setModel(undefined);
                setConfiguration(undefined);
                choose(o);
              }}
              inputRef={searchInput}
            />
          ) : (
            <div className="vp__layout">
              <nav className="vp__steps" aria-label={L.stepsLabel}>
                <ol>
                  {STEPS.map((s, i) => (
                    <li key={s}>
                      <button type="button" className="vp-step" disabled={!reachable(s)} aria-current={step === s || (s === 'year' && stepIndex === 3 && step !== 'year') ? 'step' : undefined} onClick={() => go(s)} data-testid={`step-${s}`}>
                        <span className="mono small subtle">0{i + 1}</span>
                        <span className="vp-step__label">{L[s]}</span>
                        {valueOf(s) ? <span className="vp-step__value">{valueOf(s)}</span> : null}
                      </button>
                    </li>
                  ))}
                </ol>
              </nav>
              <section className="vp__panel" aria-labelledby="vp-step-title">
                <p className="vp__progress mono small subtle" aria-hidden="true">
                  {stepIndex} / 3
                </p>
                <h3 id="vp-step-title" ref={heading} tabIndex={-1} className="vp__title">
                  {titleOf[step]}
                  {step === 'year' && model ? <span className="muted"> · {model.brand} {model.model}</span> : null}
                  {step === 'configuration' && carName ? <span className="muted"> · {carName}</span> : null}
                </h3>
                {notice ? (
                  <p className="picker__notice" role="alert">
                    {notice}
                  </p>
                ) : null}
                {/* Solo entrada (sin esperar a la salida del paso anterior): el contenido nuevo está desde el primer frame. */}
                <motion.div key={step} initial={{ opacity: 0, x: 8 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.14, ease }} className="vp__content" aria-live="polite">
                  {content()}
                </motion.div>
              </section>
            </div>
          )}
        </div>
      </MotionConfig>
    </Sheet>
  );
}
