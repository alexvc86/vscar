'use client';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { pairSlug, type VehicleOption } from '@/domain/catalog';
import { optionText, type PairLabels, type SelectorLabels } from './labels';

const VehicleSelector = dynamic(() => import('./VehicleSelector'), { ssr: false });

/**
 * Home (Step 7b §62–63): elige el primer coche → el segundo → Comparar. Sin pedir escenario antes.
 * El selector es un chunk diferido que se monta en la primera apertura. Comparar solo con A y B distintos.
 */
export function CompareBuilder({ locale, market, labels, selector }: { locale: string; market: string; labels: PairLabels; selector: SelectorLabels }) {
  const router = useRouter();
  const [pick, setPick] = useState<{ a?: VehicleOption; b?: VehicleOption }>({});
  const [side, setSide] = useState<'a' | 'b' | undefined>();
  const [mounted, setMounted] = useState(false);
  const ready = !!pick.a && !!pick.b && pick.a.id !== pick.b.id;

  const open = (s: 'a' | 'b') => {
    setMounted(true);
    setSide(s);
  };
  // El CTA de la home (`#compare`, funciona sin JS) abre el selector del primer coche que falte.
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      const cta = (e.target as HTMLElement).closest('[data-open-picker]');
      if (!cta || e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
      e.preventDefault();
      document.getElementById('compare')?.scrollIntoView({ block: 'start' });
      setMounted(true);
      setSide((cur) => cur ?? 'a');
    };
    document.addEventListener('click', onClick);
    return () => document.removeEventListener('click', onClick);
  }, []);
  const onSelect = (o: VehicleOption) => {
    const next = { ...pick, [side!]: o };
    setPick(next);
    // Flujo guiado: tras el primero, el segundo.
    setSide(side === 'a' && !next.b ? 'b' : undefined);
  };

  const slot = (s: 'a' | 'b') => {
    const o = pick[s];
    const text = o ? optionText(o, selector) : undefined;
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
          onClick={() => ready && router.push(`/${locale}/compare/${pairSlug(pick.a!.slug, pick.b!.slug)}`)}
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
      {mounted ? (
        <VehicleSelector
          open={!!side}
          onOpenChange={(o) => !o && setSide(undefined)}
          side={side ?? 'a'}
          market={market}
          labels={selector}
          current={side ? pick[side] : undefined}
          other={side === 'a' ? pick.b : side === 'b' ? pick.a : undefined}
          onSelect={onSelect}
        />
      ) : null}
    </div>
  );
}
