'use client';
import { Sheet } from '@vscar/ui/sheet';
import { motion, MotionConfig } from 'motion/react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { yearParam, type BrandOption, type ModelCard, type VariantRow, type VehicleOption, type YearOption } from '@/domain/catalog';
import { ModelVisual } from '../vehicle/ModelVisual';
import { fill, optionText, type SelectorLabels } from './labels';
import { VehiclePickerSearch } from './VehiclePickerSearch';

/**
 * VehiclePicker (Step 7b.2): el usuario piensa en lenguaje comercial — Marca → Modelo → Año → Versión — y el último
 * paso resuelve SIEMPRE una ReferenceVariant concreta (`VariantRow.id`, ADR-007). "Buscar directamente" es el atajo.
 *
 * Chunk DIFERIDO. Datos por paso desde `/api/catalog/browse` (derechos de datos y de media ya aplicados en servidor);
 * al elegir marca se piden sus modelos y al elegir modelo sus años (prefetch del paso siguiente), nunca el catálogo
 * entero. Estado temporal local: la URL solo cambia cuando hay una variant válida (al confirmar).
 * Accesibilidad: diálogo Radix, pasos con `aria-current="step"`, foco en el título de cada paso al avanzar o volver,
 * botones nativos (teclado), objetivos ≥ 44 px. Motion solo para transición de paso, hover y selección.
 */
export interface VehiclePickerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  side: 'a' | 'b';
  market: string;
  labels: SelectorLabels;
  current?: VehicleOption | undefined;
  /** El coche del otro lado: no se puede elegir (A ≠ B). */
  other?: VehicleOption | undefined;
  onSelect: (option: VehicleOption) => void;
}

type Step = 'brand' | 'model' | 'year' | 'version' | 'summary';
const STEPS = ['brand', 'model', 'year', 'version'] as const;
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

export default function VehiclePicker({ open, onOpenChange, side, market, labels, current, other, onSelect }: VehiclePickerProps) {
  const L = labels.picker;
  const [mode, setMode] = useState<'browse' | 'search'>('browse');
  const [step, setStep] = useState<Step>('brand');
  const [brand, setBrand] = useState<string>();
  const [model, setModel] = useState<ModelCard>();
  /** `undefined` = sin elegir; `null` = año desconocido elegido. */
  const [year, setYear] = useState<number | null | undefined>(undefined);
  const [variant, setVariant] = useState<VariantRow>();
  const [brands, setBrands] = useState<BrandOption[]>();
  const [models, setModels] = useState<ModelCard[]>();
  const [years, setYears] = useState<YearOption[]>();
  const [variants, setVariants] = useState<VariantRow[]>();
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
    setVariant(undefined);
    setVariants(undefined);
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

  useEffect(() => {
    if (!open || !brand || !model || year === undefined) return;
    setVariants(undefined);
    browse<{ variants: VariantRow[] }>(market, { level: 'variants', brand, model: model.model, year: yearParam(year) })
      .then((r) => setVariants(r.variants))
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
  const pickBrand = (b: string) => {
    if (b !== brand) {
      setModel(undefined);
      setYear(undefined);
      setVariant(undefined);
    }
    setBrand(b);
    go('model');
  };
  const pickModel = (m: ModelCard) => {
    if (m.model !== model?.model) {
      setYear(undefined);
      setVariant(undefined);
    }
    setModel(m);
    go('year');
  };
  const pickYear = (y: number | null) => {
    if (y !== year) setVariant(undefined);
    setYear(y);
    go('version');
  };
  const pickVariant = (v: VariantRow) => {
    if (other && v.id === other.id) {
      setNotice(labels.sameCar);
      return;
    }
    setVariant(v);
    go('summary');
  };
  const back = () => go(step === 'summary' ? 'version' : step === 'version' ? 'year' : step === 'year' ? 'model' : 'brand');
  const reachable = (s: (typeof STEPS)[number]) => s === 'brand' || (s === 'model' && !!brand) || (s === 'year' && !!model) || (s === 'version' && year !== undefined);
  const valueOf = (s: (typeof STEPS)[number]) => (s === 'brand' ? brand : s === 'model' ? model?.model : s === 'year' ? (year === undefined ? undefined : year === null ? L.yearUnknown : String(year)) : variant?.variant);
  const titleOf: Record<Step, string> = { brand: L.chooseBrand, model: L.chooseModel, year: L.chooseYear, version: L.chooseVersion, summary: L.summary };
  const stepIndex = step === 'summary' ? 4 : STEPS.indexOf(step) + 1;
  const yearLabel = (y: number | null) => (y === null ? L.yearUnknown : String(y));
  const multiGen = (model?.generations.length ?? 0) > 1;

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
              <motion.button type="button" className="vp-brand" aria-pressed={b.brand === brand} onClick={() => pickBrand(b.brand)} whileHover={{ y: -2 }} whileTap={{ scale: 0.98 }} data-testid={`brand-${b.brand}`}>
                <span className="vp-brand__name">{b.brand}</span>
                <span className="muted small">{fill(b.models === 1 ? L.modelsOne : L.modelsOther, { count: b.models })}</span>
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
              <motion.button type="button" className="vp-model" aria-pressed={m.model === model?.model} onClick={() => pickModel(m)} whileHover={{ y: -3 }} whileTap={{ scale: 0.98 }} data-testid={`model-${m.model}`}>
                <ModelVisual media={m.media} bodyType={m.bodyType} name={`${m.brand} ${m.model}`} eager={i < 4} />
                <span className="vp-model__name">{m.model}</span>
                <span className="mono small muted">{m.years.map(yearLabel).join(' · ')}</span>
                {m.generations.length > 1 ? <span className="mono small subtle">{m.generations.join(' · ')}</span> : null}
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
              <motion.button type="button" className={chips ? 'vp-chip' : 'vp-row'} aria-pressed={y.year === year} onClick={() => pickYear(y.year)} whileTap={{ scale: 0.97 }} data-testid={`year-${yearParam(y.year)}`}>
                <span className="vp-chip__year">{yearLabel(y.year)}</span>
                {multiGen && y.generations.length ? <span className="mono small muted">{y.generations.join(' · ')}</span> : null}
              </motion.button>
            </li>
          ))}
        </ul>
      );
    }
    if (step === 'version') {
      if (!variants) return <p className="muted">{L.loading}</p>;
      if (!variants.length) return <p className="vp__empty">{L.noVersions}</p>;
      return (
        <ul className="vp__list">
          {variants.map((v) => {
            const text = optionText(v, labels);
            const meta = [
              labels.powertrain[v.powertrainType] ?? v.powertrainType,
              v.powerKw ? (v.powerKw.min === v.powerKw.max ? `${v.powerKw.min} kW` : `${v.powerKw.min}–${v.powerKw.max} kW`) : undefined,
              L.transmission[v.transmission] ?? v.transmission,
            ].filter(Boolean);
            const isOther = other?.id === v.id;
            return (
              <li key={v.id} className="vp-variant">
                <motion.button
                  type="button"
                  className="vp-row vp-variant__row"
                  aria-pressed={v.id === variant?.id}
                  aria-disabled={isOther || undefined}
                  onClick={() => pickVariant(v)}
                  whileTap={{ scale: 0.99 }}
                  data-testid={`variant-${v.slug}`}
                  data-variant-id={v.id}
                >
                  <span className="vp-variant__name">{v.variant}</span>
                  <span className="mono small muted">{meta.join(' · ')}</span>
                  {text.period ? <span className="mono small subtle">{text.period}</span> : null}
                  <span className="vp-variant__badges">
                    {current?.id === v.id ? <span className="picker__badge picker__badge--current">{labels.current}</span> : null}
                    {isOther ? <span className="picker__badge">{labels.otherSide}</span> : null}
                    {v.identity && v.identity.status !== 'EXACT' ? <span className="picker__badge picker__badge--dev">{L.identityUnconfirmed}</span> : null}
                  </span>
                </motion.button>
                {v.identity ? (
                  <details className="vp-variant__tech">
                    <summary className="small muted">{L.technicalDetails}</summary>
                    <dl className="mono small">
                      <dt>ReferenceVariant</dt>
                      <dd>{v.identity.referenceVariantId}</dd>
                      <dt>{L.identityStatus}</dt>
                      <dd>{v.identity.status}</dd>
                      {v.identity.tan ? (
                        <>
                          <dt>TAN</dt>
                          <dd>{v.identity.tan}</dd>
                        </>
                      ) : null}
                      {v.identity.va ? (
                        <>
                          <dt>Va</dt>
                          <dd>{v.identity.va}</dd>
                        </>
                      ) : null}
                      {v.identity.ve ? (
                        <>
                          <dt>Ve</dt>
                          <dd>{v.identity.ve}</dd>
                        </>
                      ) : null}
                    </dl>
                  </details>
                ) : null}
              </li>
            );
          })}
        </ul>
      );
    }
    // Resumen: visual + identidad comercial + CTA. Resuelve la ReferenceVariant exacta.
    if (!variant || !model) return null;
    return (
      <div className="vp-summary" data-variant-id={variant.id}>
        <ModelVisual media={variant.media ?? model.media} bodyType={variant.bodyType} name={`${variant.brand} ${variant.model}`} eager sizes="(max-width: 699px) 90vw, 440px" className="model-visual--summary" />
        <dl className="vp-summary__facts">
          <div>
            <dt>{L.brand}</dt>
            <dd>{variant.brand}</dd>
          </div>
          <div>
            <dt>{L.model}</dt>
            <dd>{variant.model}</dd>
          </div>
          <div>
            <dt>{L.year}</dt>
            <dd>{yearLabel(variant.year)}</dd>
          </div>
          <div>
            <dt>{L.version}</dt>
            <dd>
              {variant.variant}
              {optionText(variant, labels).period ? <span className="mono small muted vp-summary__distinct">{optionText(variant, labels).period}</span> : null}
            </dd>
          </div>
          <div>
            <dt>{L.powertrainLabel}</dt>
            <dd>{labels.powertrain[variant.powertrainType] ? `${labels.powertrain[variant.powertrainType]} (${variant.powertrainType})` : variant.powertrainType}</dd>
          </div>
        </dl>
        <button type="button" className="vs-button vs-button--solid vs-button--lg" onClick={() => onSelect(variant)} data-testid="choose-car">
          {L.chooseThisCar}
        </button>
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
            <VehiclePickerSearch market={market} labels={labels} current={current} other={other} onSelect={onSelect} inputRef={searchInput} />
          ) : (
            <div className="vp__layout">
              <nav className="vp__steps" aria-label={L.stepsLabel}>
                <ol>
                  {STEPS.map((s, i) => (
                    <li key={s}>
                      <button type="button" className="vp-step" disabled={!reachable(s)} aria-current={step === s || (step === 'summary' && s === 'version') ? 'step' : undefined} onClick={() => go(s)} data-testid={`step-${s}`}>
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
                  {Math.min(stepIndex, 4)} / 4
                </p>
                <h3 id="vp-step-title" ref={heading} tabIndex={-1} className="vp__title">
                  {titleOf[step]}
                  {step === 'year' && model ? <span className="muted"> · {model.brand} {model.model}</span> : null}
                  {step === 'version' && model && year !== undefined ? (
                    <span className="muted">
                      {' '}
                      · {model.model} {yearLabel(year)}
                    </span>
                  ) : null}
                </h3>
                {notice ? (
                  <p className="picker__notice" role="alert">
                    {notice}
                  </p>
                ) : null}
                {/* Solo entrada (sin esperar a la salida del paso anterior): el contenido nuevo está desde el primer frame. */}
                <motion.div key={step} initial={{ opacity: 0, x: 8 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.14, ease }} className="vp__content">
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
