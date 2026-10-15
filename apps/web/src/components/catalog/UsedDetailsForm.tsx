'use client';
import { useRef, type ReactNode } from 'react';
import { EMPTY_USED_FORM, type UsedFormError, type UsedFormField, type UsedFormValues } from '@/domain/used-form';
import { fill, type UsedLabels } from './labels';

/**
 * Step 8b — datos de la unidad usada, como continuación del selector (no un formulario de concesionario).
 * Dos niveles: esenciales (precio, km, matriculación) e información adicional (garantía, historial, estado,
 * SOH si aplica, daños). Todo opcional. Los valores viven en el selector: volver atrás o plegar la sección no
 * los pierde. Se valida al avanzar ("Revisar"), con el error asociado a su campo y el foco en el primero.
 */
export interface UsedDetailsFormProps {
  values: UsedFormValues;
  onChange: (next: UsedFormValues) => void;
  errors: UsedFormError[];
  labels: UsedLabels;
  sohApplies: boolean;
  formatLocale: string;
  onReview: () => void;
}

const MONTHS = Array.from({ length: 12 }, (_, i) => i + 1);

export function UsedDetailsForm({ values, onChange, errors, labels, sohApplies, formatLocale, onReview }: UsedDetailsFormProps) {
  const L = labels.form;
  const root = useRef<HTMLFormElement>(null);
  const set = <K extends UsedFormField>(k: K, v: UsedFormValues[K]) => onChange({ ...values, [k]: v });
  const errorOf = (f: UsedFormField) => errors.find((e) => e.field === f);
  const errorText = (e: UsedFormError) => fill(L.errors[e.code] ?? '', Object.fromEntries(Object.entries(e.params ?? {}).map(([k, n]) => [k, new Intl.NumberFormat(formatLocale).format(n)])));
  const monthName = (m: number) => new Intl.DateTimeFormat(formatLocale, { month: 'long', timeZone: 'UTC' }).format(new Date(Date.UTC(2020, m - 1, 1)));
  const hasAdditional = errors.some((e) => ['warranty', 'soh'].includes(e.field)) || JSON.stringify({ ...values, price: '', km: '', regYear: '', regMonth: '' }) !== JSON.stringify({ ...EMPTY_USED_FORM });

  const describedBy = (f: UsedFormField, hint?: boolean) => [hint ? `uf-${f}-hint` : '', errorOf(f) ? `uf-${f}-err` : ''].filter(Boolean).join(' ') || undefined;
  const err = (f: UsedFormField) => {
    const e = errorOf(f);
    return e ? (
      <p id={`uf-${f}-err`} className="field__error" role="alert">
        {errorText(e)}
      </p>
    ) : null;
  };
  const numberField = ({ f, label, hint, suffix, disabled }: { f: 'price' | 'km' | 'warranty' | 'soh'; label: string; hint?: string; suffix?: string; disabled?: boolean }) => (
    <div className="field" key={`nf-${f}`}>
      <label htmlFor={`uf-${f}`}>
        {label} <span className="muted small">({L.optional})</span>
      </label>
      <div className="field__control">
        <input
          id={`uf-${f}`}
          name={f}
          type="text"
          inputMode="numeric"
          autoComplete="off"
          value={values[f]}
          disabled={disabled}
          onChange={(e) => set(f, e.target.value)}
          aria-invalid={errorOf(f) ? 'true' : undefined}
          aria-describedby={describedBy(f, !!hint)}
          data-testid={`used-${f}`}
        />
        {suffix ? <span className="field__suffix mono">{suffix}</span> : null}
      </div>
      {hint ? (
        <p id={`uf-${f}-hint`} className="field__hint">
          {hint}
        </p>
      ) : null}
      {err(f)}
    </div>
  );
  const radios = <K extends 'service' | 'state' | 'damage'>({ f, legend, options, hint }: { f: K; legend: string; options: Record<string, string>; hint?: string }) => (
    <fieldset key={`rf-${f}`} className="field uf-radios" aria-describedby={hint ? `uf-${f}-hint` : undefined}>
      <legend>{legend}</legend>
      {hint ? (
        <p id={`uf-${f}-hint`} className="field__hint">
          {hint}
        </p>
      ) : null}
      <div className="uf-radios__options">
        {Object.entries(options).map(([value, text]) => (
          <label key={value} className="uf-radio">
            <input type="radio" name={`uf-${f}`} value={value} checked={values[f] === value} onChange={() => set(f, value as UsedFormValues[K])} data-testid={`used-${f}-${value}`} />
            <span>{text}</span>
          </label>
        ))}
      </div>
    </fieldset>
  );
  const section = (title: string, children: ReactNode) => (
    <section className="uf-section">
      <h4 className="label">{title}</h4>
      {children}
    </section>
  );

  return (
    <form
      ref={root}
      className="used-form"
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        onReview();
      }}
      data-testid="used-form"
    >
      <p className="muted">{L.lead}</p>
      {section(
        L.essentials,
        <>
        {numberField({ f: 'price', label: L.price, hint: L.priceHint, suffix: '€' })}
        {numberField({ f: 'km', label: L.km, hint: L.kmHint, suffix: 'km' })}
        <fieldset className="field uf-reg" aria-describedby="uf-reg-hint">
          <legend>
            {L.reg} <span className="muted small">({L.optional})</span>
          </legend>
          <p id="uf-reg-hint" className="field__hint">
            {L.regHint}
          </p>
          <div className="uf-reg__row">
            <div className="field">
              <label htmlFor="uf-regMonth">{L.month}</label>
              <select id="uf-regMonth" value={values.regMonth} onChange={(e) => set('regMonth', e.target.value)} aria-invalid={errorOf('regMonth') ? 'true' : undefined} aria-describedby={describedBy('regMonth')} data-testid="used-regMonth">
                <option value="">{L.monthUnknown}</option>
                {MONTHS.map((m) => (
                  <option key={m} value={String(m)}>
                    {monthName(m)}
                  </option>
                ))}
              </select>
              {err('regMonth')}
            </div>
            <div className="field">
              <label htmlFor="uf-regYear">{L.year}</label>
              <input
                id="uf-regYear"
                type="text"
                inputMode="numeric"
                autoComplete="off"
                maxLength={4}
                value={values.regYear}
                onChange={(e) => set('regYear', e.target.value)}
                aria-invalid={errorOf('regYear') ? 'true' : undefined}
                aria-describedby={describedBy('regYear')}
                data-testid="used-regYear"
              />
              {err('regYear')}
            </div>
          </div>
        </fieldset>
        </>,
      )}

      <details className="uf-more" open={hasAdditional || undefined}>
        <summary>{L.additional}</summary>
        <div className="field">
          {numberField({ f: 'warranty', label: L.warranty, hint: L.warrantyHint, suffix: L.warrantyUnit, disabled: values.warrantyUnknown })}
          <label className="uf-check">
            <input type="checkbox" checked={values.warrantyUnknown} onChange={(e) => onChange({ ...values, warrantyUnknown: e.target.checked, ...(e.target.checked ? { warranty: '' } : {}) })} data-testid="used-warranty-unknown" />
            <span>{L.warrantyUnknown}</span>
          </label>
        </div>
        {radios({ f: 'service', legend: L.service, options: L.serviceOptions })}
        {radios({ f: 'state', legend: L.state, options: L.stateOptions, hint: L.stateHint })}
        {sohApplies ? (
          <div className="field">
            {numberField({ f: 'soh', label: L.soh, hint: L.sohHint, suffix: '%', disabled: values.sohUnknown })}
            <label className="uf-check">
              <input type="checkbox" checked={values.sohUnknown} onChange={(e) => onChange({ ...values, sohUnknown: e.target.checked, ...(e.target.checked ? { soh: '' } : {}) })} data-testid="used-soh-unknown" />
              <span>{L.sohUnknown}</span>
            </label>
          </div>
        ) : null}
        {radios({ f: 'damage', legend: L.damage, options: L.damageOptions })}
      </details>

      <div className="used-form__actions">
        <button type="submit" className="vs-button vs-button--solid vs-button--lg" data-testid="used-review">
          {L.review}
        </button>
      </div>
    </form>
  );
}
