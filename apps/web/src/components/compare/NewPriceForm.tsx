'use client';
import { useState, type FormEvent } from 'react';
import { USED_LIMITS } from '@/domain/used-params';

/**
 * Step D1.6 — precio de compra de un coche NUEVO introducido por el usuario. Se guarda solo en la URL (`{lado}_price`),
 * se etiqueta como "precio indicado" (USER_PROVIDED), nunca como precio oficial ni del fabricante, y vacío = sin precio.
 * Afecta al desembolso inicial, al coste conocido y al punto de equilibrio; el encaje económico (coste de uso) no cambia.
 */
export interface NewPriceSide {
  side: 'a' | 'b';
  name: string;
  /** Precio indicado vigente (EUR enteros), si lo hay. */
  current?: number;
}

export interface NewPriceLabels {
  title: string;
  label: string;
  apply: string;
  clear: string;
  note: string;
  invalid: string;
}

export function NewPriceForm({ sides, labels }: { sides: readonly NewPriceSide[]; labels: NewPriceLabels }) {
  if (!sides.length) return null;
  return (
    <section className="new-price" aria-labelledby="new-price-title" data-testid="new-price">
      <h3 id="new-price-title" className="label">
        {labels.title}
      </h3>
      {sides.map((s) => (
        <SidePriceForm key={s.side} side={s} labels={labels} />
      ))}
      <p className="muted small">{labels.note}</p>
    </section>
  );
}

function SidePriceForm({ side, labels }: { side: NewPriceSide; labels: NewPriceLabels }) {
  const [value, setValue] = useState(side.current !== undefined ? String(side.current) : '');
  const [error, setError] = useState(false);
  const go = (price: number | undefined) => {
    const url = new URL(window.location.href);
    if (price === undefined) url.searchParams.delete(`${side.side}_price`);
    else url.searchParams.set(`${side.side}_price`, String(price));
    // Navegación normal: el servidor recalcula con el nuevo precio (sin depender del router en el render).
    window.location.assign(`${url.pathname}${url.search}`);
  };
  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    const raw = value.replace(/[.\s€]/g, '');
    const n = /^\d{1,9}$/.test(raw) ? Number(raw) : NaN;
    if (!Number.isInteger(n) || n < USED_LIMITS.price.min || n > USED_LIMITS.price.max) {
      setError(true);
      return;
    }
    setError(false);
    go(n);
  };
  const id = `new-price-${side.side}`;
  return (
    <form onSubmit={onSubmit} className="new-price__row" data-testid={`new-price-${side.side}`} noValidate>
      <label htmlFor={id}>
        {side.name} · {labels.label}
      </label>
      <input id={id} name={`${side.side}_price`} inputMode="numeric" autoComplete="off" value={value} onChange={(e) => setValue(e.target.value)} aria-invalid={error} aria-describedby={error ? `${id}-error` : undefined} />
      <button type="submit" className="vs-button vs-button--quiet vs-button--sm">
        {labels.apply}
      </button>
      {side.current !== undefined ? (
        <button type="button" className="vs-button vs-button--ghost vs-button--sm" onClick={() => go(undefined)}>
          {labels.clear}
        </button>
      ) : null}
      {error ? (
        <p id={`${id}-error`} role="alert" className="small">
          {labels.invalid}
        </p>
      ) : null}
    </form>
  );
}
