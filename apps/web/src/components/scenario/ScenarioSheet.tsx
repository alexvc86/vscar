'use client';
import { zodResolver } from '@hookform/resolvers/zod';
import { Sheet } from '@vscar/ui/sheet';
import { NextIntlClientProvider, useTranslations } from 'next-intl';
import { useSearchParams } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { loadMessages } from '@/client/messages';
import { pushScenario, revealResult } from '@/client/scenario-nav';
import { useUi } from '@/client/store';
import { DEFAULT_SCENARIO, parseScenarioFromSearchParams, REQUIREMENT_LIMITS, Scenario, SCENARIO_LIMITS } from '@/domain/scenario';
import { MARKETS, parseLocaleSegment, type LanguageCode } from '@/i18n/locales';

/**
 * Hoja "Cambiar tu uso" (chunk diferido). Formulario con react-hook-form + el MISMO esquema Zod del
 * parser de URL. Al aplicar, el escenario se escribe en la URL; el recálculo lo hace LiveDecision.
 */
export default function ScenarioSheet(props: { pathname: string; slug: string; locale: string; language: LanguageCode; hasUsed?: boolean }) {
  const [messages, setMessages] = useState<Record<string, unknown>>();
  useEffect(() => {
    let alive = true;
    loadMessages(props.language).then((m) => alive && setMessages(m));
    return () => {
      alive = false;
    };
  }, [props.language]);
  if (!messages) return null;
  const market = MARKETS[parseLocaleSegment(props.locale)?.market ?? 'ES'];
  return (
    <NextIntlClientProvider locale={props.locale} messages={messages} timeZone={market.timeZone}>
      <ScenarioForm pathname={props.pathname} hasUsed={!!props.hasUsed} />
    </NextIntlClientProvider>
  );
}

type FieldKey = keyof Scenario;
const NUMERIC: { key: FieldKey; label: string; limit: keyof typeof SCENARIO_LIMITS; suffix?: string }[] = [
  { key: 'km', label: 'scenario.annualKm', limit: 'km', suffix: 'km' },
  { key: 'daily', label: 'scenario.dailyKm', limit: 'daily', suffix: 'km' },
  { key: 'trips', label: 'scenario.longTrips', limit: 'trips' },
  { key: 'home', label: 'scenario.homeCharging', limit: 'home', suffix: '%' },
  { key: 'years', label: 'scenario.horizon', limit: 'years' },
];
const PRIORITIES: FieldKey[] = ['cost', 'space', 'performance'];
/** Step 8b: requisitos para usados (vacío = sin requisito; solo se evalúan en unidades usadas). */
const REQUIREMENTS: { key: 'maxkm' | 'maxage' | 'minsoh' | 'minwarranty'; suffix?: string }[] = [{ key: 'maxkm', suffix: 'km' }, { key: 'maxage' }, { key: 'minsoh', suffix: '%' }, { key: 'minwarranty' }];
/** Formulario = mismo contrato Zod que la URL; la casilla (booleano) se traduce a `fullhistory=1` o ausente. */
const FormScenario = Scenario.extend({ fullhistory: z.union([z.boolean(), z.number()]).optional().transform((v) => (v === true || v === 1 ? 1 : undefined)) });
type FormValues = z.input<typeof FormScenario>;
const toForm = (s: Scenario): FormValues => ({ ...s, fullhistory: s.fullhistory === 1 });
const optionalNumber = (v: unknown) => (v === '' || v === null || v === undefined || (typeof v === 'number' && Number.isNaN(v)) ? undefined : Number(v));

function ScenarioForm({ pathname, hasUsed }: { pathname: string; hasUsed: boolean }) {
  const t = useTranslations();
  const open = useUi((s) => s.sheetOpen);
  const setOpen = useUi((s) => s.setSheetOpen);
  const params = useSearchParams();
  const current = parseScenarioFromSearchParams(new URLSearchParams(params.toString())).scenario;
  const form = useForm<FormValues, unknown, Scenario>({ resolver: zodResolver(FormScenario), defaultValues: toForm(current), mode: 'onChange' });
  const { register, handleSubmit, reset, formState } = form;

  // Al reabrir, el formulario parte del escenario de la URL (fuente de verdad).
  useEffect(() => {
    if (open) reset(toForm(parseScenarioFromSearchParams(new URLSearchParams(params.toString())).scenario));
  }, [open, params, reset]);

  const applied = useRef(false);
  const submit = handleSubmit((values) => {
    applied.current = true;
    setOpen(false);
    pushScenario(pathname, values);
  });
  // Tras aplicar, el foco va al resultado (no de vuelta al botón que abrió la hoja).
  const onCloseAutoFocus = (e: Event) => {
    if (!applied.current) return;
    applied.current = false;
    e.preventDefault();
    revealResult();
  };

  return (
    <Sheet open={open} onOpenChange={setOpen} title={t('scenario.title')} description={t('scenario.description')} closeLabel={t('common.close')} onCloseAutoFocus={onCloseAutoFocus}>
      <form className="scenario-form" onSubmit={submit} noValidate>
        {NUMERIC.map((f) => {
          const lim = SCENARIO_LIMITS[f.limit];
          const err = formState.errors[f.key];
          const id = `sc-${f.key}`;
          return (
            <div key={f.key} className="field">
              <label htmlFor={id}>{t(f.label)}</label>
              <div className="field__control">
                <input
                  id={id}
                  type="number"
                  inputMode="numeric"
                  min={lim.min}
                  max={lim.max}
                  step={lim.step}
                  aria-invalid={err ? 'true' : undefined}
                  aria-describedby={err ? `${id}-err` : f.key === 'home' ? `${id}-hint` : undefined}
                  {...register(f.key, { valueAsNumber: true })}
                />
                {f.suffix ? <span className="field__suffix mono">{f.suffix}</span> : null}
              </div>
              {f.key === 'home' ? (
                <p id={`${id}-hint`} className="field__hint">
                  {t('scenario.homeChargingHint')}
                </p>
              ) : null}
              {err ? (
                <p id={`${id}-err`} className="field__error" role="alert">
                  {t('scenario.invalidField', { min: lim.min, max: lim.max })}
                </p>
              ) : null}
            </div>
          );
        })}
        <fieldset className="field field--priorities">
          <legend>{t('scenario.priorities')}</legend>
          {PRIORITIES.map((key) => (
            <div key={key} className="priority">
              <label htmlFor={`sc-${key}`}>{t(`scenario.${key}`)}</label>
              <select id={`sc-${key}`} {...register(key, { valueAsNumber: true })}>
                {[1, 2, 3].map((n) => (
                  <option key={n} value={n}>
                    {t(`scenario.priorityLevel.${n}`)}
                  </option>
                ))}
              </select>
            </div>
          ))}
        </fieldset>
        {hasUsed ? (
          <fieldset className="field field--requirements" data-testid="used-requirements">
            <legend>{t('scenario.requirements.title')}</legend>
            <p className="field__hint">{t('scenario.requirements.lead')}</p>
            {REQUIREMENTS.map((f) => {
              const lim = REQUIREMENT_LIMITS[f.key];
              const err = formState.errors[f.key];
              const id = `sc-${f.key}`;
              return (
                <div key={f.key} className="field">
                  <label htmlFor={id}>{t(`scenario.requirements.${f.key}`)}</label>
                  <div className="field__control">
                    <input
                      id={id}
                      type="number"
                      inputMode="numeric"
                      min={lim.min}
                      max={lim.max}
                      step={lim.step}
                      placeholder={t('scenario.requirements.none')}
                      aria-invalid={err ? 'true' : undefined}
                      aria-describedby={err ? `${id}-err` : undefined}
                      {...register(f.key, { setValueAs: optionalNumber })}
                    />
                    {f.suffix ? <span className="field__suffix mono">{f.suffix}</span> : null}
                  </div>
                  {err ? (
                    <p id={`${id}-err`} className="field__error" role="alert">
                      {t('scenario.invalidField', { min: lim.min, max: lim.max })}
                    </p>
                  ) : null}
                </div>
              );
            })}
            <div className="field field--check">
              <input id="sc-fullhistory" type="checkbox" {...register('fullhistory')} />
              <label htmlFor="sc-fullhistory">{t('scenario.requirements.fullhistory')}</label>
            </div>
          </fieldset>
        ) : null}
        <div className="scenario-form__actions">
          <button type="submit" className="vs-button vs-button--solid" disabled={!formState.isValid}>
            {t('scenario.apply')}
          </button>
          <button type="button" className="vs-button vs-button--quiet" onClick={() => reset(toForm({ ...DEFAULT_SCENARIO }))}>
            {t('scenario.reset')}
          </button>
        </div>
      </form>
    </Sheet>
  );
}
