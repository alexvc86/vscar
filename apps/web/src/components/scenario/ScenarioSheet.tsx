'use client';
import { zodResolver } from '@hookform/resolvers/zod';
import { Sheet } from '@vscar/ui/sheet';
import { NextIntlClientProvider, useTranslations } from 'next-intl';
import { useSearchParams } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { loadMessages } from '@/client/messages';
import { pushScenario, revealResult } from '@/client/scenario-nav';
import { useUi } from '@/client/store';
import { DEFAULT_SCENARIO, parseScenarioFromSearchParams, Scenario, SCENARIO_LIMITS } from '@/domain/scenario';
import { MARKETS, parseLocaleSegment, type LanguageCode } from '@/i18n/locales';

/**
 * Hoja "Cambiar tu uso" (chunk diferido). Formulario con react-hook-form + el MISMO esquema Zod del
 * parser de URL. Al aplicar, el escenario se escribe en la URL; el recálculo lo hace LiveDecision.
 */
export default function ScenarioSheet(props: { pathname: string; slug: string; locale: string; language: LanguageCode }) {
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
      <ScenarioForm pathname={props.pathname} />
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

function ScenarioForm({ pathname }: { pathname: string }) {
  const t = useTranslations();
  const open = useUi((s) => s.sheetOpen);
  const setOpen = useUi((s) => s.setSheetOpen);
  const params = useSearchParams();
  const current = parseScenarioFromSearchParams(new URLSearchParams(params.toString())).scenario;
  const form = useForm<Scenario>({ resolver: zodResolver(Scenario), defaultValues: current, mode: 'onChange' });
  const { register, handleSubmit, reset, formState } = form;

  // Al reabrir, el formulario parte del escenario de la URL (fuente de verdad).
  useEffect(() => {
    if (open) reset(parseScenarioFromSearchParams(new URLSearchParams(params.toString())).scenario);
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
        <div className="scenario-form__actions">
          <button type="submit" className="vs-button vs-button--solid" disabled={!formState.isValid}>
            {t('scenario.apply')}
          </button>
          <button type="button" className="vs-button vs-button--quiet" onClick={() => reset(DEFAULT_SCENARIO)}>
            {t('scenario.reset')}
          </button>
        </div>
      </form>
    </Sheet>
  );
}
