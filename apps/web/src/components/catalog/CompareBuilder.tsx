'use client';
import { useRouter } from 'next/navigation';
import { startTransition, useEffect, useState } from 'react';
import { pairSlug } from '@/domain/catalog';
import { ALL_NEW, joinQuery, sohApplies, todayIn, withSide } from '@/domain/used-params';
import { optionText, type PairLabels, type SelectorLabels, type UsedLabels } from './labels';
import { useVehiclePicker } from './picker-loader';
import { usedFactLines } from './used-text';
import type { VehicleChoice } from './VehiclePicker';




/**
 * Home (Step 7b §62–63): elige el primer coche → el segundo → Comparar. Sin pedir escenario antes.
 * El selector es un chunk diferido que se monta en la primera apertura. Step 8b: cada hueco es un coche + su
 * condición (Nuevo / Usado con sus datos). La misma variant en los dos huecos solo si alguno es usado.
 */
export function CompareBuilder({ locale, market, labels, selector, used, timeZone }: { locale: string; market: string; labels: PairLabels; selector: SelectorLabels; used: UsedLabels; timeZone: string }) {
  const router = useRouter();
  const [pick, setPick] = useState<{ a?: VehicleChoice; b?: VehicleChoice }>({});
  const [side, setSide] = useState<'a' | 'b' | undefined>();
  const [mounted, setMounted] = useState(false);
  const ready = !!pick.a && !!pick.b && (pick.a.option.id !== pick.b.option.id || pick.a.condition.condition === 'used' || pick.b.condition.condition === 'used');
  const { Picker, ensure } = useVehiclePicker(market);

  // Abrir el selector es una actualización NO urgente: el clic pinta en el siguiente frame y la hoja se monta
  // después (INP; la hoja con su contenido es el render más caro de la home).
  const open = (s: 'a' | 'b') => {
    ensure();
    startTransition(() => {
      setMounted(true);
      setSide(s);
    });
  };
  // El CTA de la home (`#compare`, funciona sin JS) abre el selector del primer coche que falte.
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      const cta = (e.target as HTMLElement).closest('[data-open-picker]');
      if (!cta || e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
      e.preventDefault();
      document.getElementById('compare')?.scrollIntoView({ block: 'start' });
      ensure();
      startTransition(() => {
        setMounted(true);
        setSide((cur) => cur ?? 'a');
      });
    };
    document.addEventListener('click', onClick);
    return () => document.removeEventListener('click', onClick);
  }, [ensure]);
  const onSelect = (choice: VehicleChoice) => {
    const next = { ...pick, [side!]: choice };
    setPick(next);
    // Flujo guiado: tras el primero, el segundo.
    setSide(side === 'a' && !next.b ? 'b' : undefined);
  };

  const slot = (s: 'a' | 'b') => {
    const c = pick[s];
    const o = c?.option;
    const text = o ? optionText(o, selector) : undefined;
    const facts = c?.condition.condition === 'used' ? c.condition.facts : undefined;
    return (
      <button type="button" className={`pick-slot pick-slot--${s}`} onClick={() => open(s)} data-testid={`pick-${s}`} data-picker-trigger={s} aria-label={text ? `${s === 'a' ? labels.slotA : labels.slotB}: ${text.brand} ${text.name}` : s === 'a' ? labels.chooseFirst : labels.chooseSecond}>
        <span className={`label tone-${s}`}>{s === 'a' ? labels.slotA : labels.slotB}</span>
        {text ? (
          <>
            <span className="pick-slot__name">
              {text.brand} {text.name}
            </span>
            <span className="mono small muted">
              {text.meta}
              {text.period ? ` · ${text.period}` : ''}
            </span>
            <span className={`condition-badge condition-badge--${c!.condition.condition}`} data-testid={`pick-${s}-condition`}>
              {used.badge[s][c!.condition.condition]}
            </span>
            {facts ? (
              <span className="small muted pick-slot__facts">
                {usedFactLines(facts, used, selector.formatLocale, { sohApplies: sohApplies(o!.powertrainType), only: ['price', 'km', 'reg'] })
                  .filter((l) => l.provided)
                  .map((l) => l.value)
                  .join(' · ')}
              </span>
            ) : null}
          </>
        ) : (
          <span className="pick-slot__empty">{s === 'a' ? labels.chooseFirst : labels.chooseSecond}</span>
        )}
      </button>
    );
  };

  return (
    <div className="compare-builder">
      <div className="compare-builder__slots">
        {slot('a')}
        <span className="compare-builder__vs mono" aria-hidden="true">
          VS
        </span>
        {slot('b')}
      </div>
      <div className="compare-builder__actions">
        <button
          type="button"
          className="vs-button vs-button--solid vs-button--lg"
          disabled={!ready}
          aria-describedby={ready ? undefined : 'compare-hint'}
          onClick={() => {
            if (!ready) return;
            const today = todayIn(timeZone);
            const pair = withSide(withSide(ALL_NEW, 'a', pick.a!.condition, today), 'b', pick.b!.condition, today);
            router.push(`/${locale}/compare/${pairSlug(pick.a!.option.slug, pick.b!.option.slug)}${joinQuery('', pair)}`);
          }}
          data-testid="compare-go"
        >
          {labels.compare}
        </button>
        {!ready ? (
          <p id="compare-hint" className="muted small">
            {labels.compareHint}
          </p>
        ) : null}
      </div>
      {mounted && Picker ? (
        <Picker
          open={!!side}
          onOpenChange={(o) => !o && setSide(undefined)}
          side={side ?? 'a'}
          market={market}
          labels={selector}
          used={used}
          today={todayIn(timeZone)}
          current={side ? pick[side]?.option : undefined}
          other={side === 'a' ? pick.b?.option : side === 'b' ? pick.a?.option : undefined}
          currentCondition={side ? pick[side]?.condition : undefined}
          otherCondition={side === 'a' ? pick.b?.condition : side === 'b' ? pick.a?.condition : undefined}
          onSelect={onSelect}
        />
      ) : null}
    </div>
  );
}
