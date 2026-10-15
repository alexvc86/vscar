'use client';
import { useCallback, useEffect, useId, useRef, useState, type KeyboardEvent } from 'react';
import { SEARCH_MAX_CHARS, SEARCH_MIN_CHARS, type MediaView, type VehicleOption } from '@/domain/catalog';
import { ModelVisual } from '../vehicle/ModelVisual';
import { fill, optionText, type SelectorLabels } from './labels';

/**
 * Modo "Buscar directamente" del VehiclePicker (Step 7b → 7b.2): búsqueda incremental de ReferenceVariants.
 * Patrón combobox ARIA 1.2: el foco se queda en el input y la opción activa se anuncia con `aria-activedescendant`;
 * ↑ ↓ Intro. Solo busca vehículos: no calcula nada. Resultados con miniatura ligera (nunca hero).
 */
export interface VehiclePickerSearchProps {
  market: string;
  labels: SelectorLabels;
  current?: VehicleOption | undefined;
  /** El coche del otro lado: no se puede elegir (A ≠ B). */
  other?: VehicleOption | undefined;
  onSelect: (option: VehicleOption) => void;
  inputRef?: React.RefObject<HTMLInputElement | null>;
}

type Status = 'loading' | 'ready' | 'error';
type Hit = VehicleOption & { media?: MediaView };
interface Response {
  mode: 'search' | 'browse';
  results: Hit[];
}

const DEBOUNCE_MS = 200;
const browseCache = new Map<string, Response>();

export function VehiclePickerSearch({ market, labels, current, other, onSelect, inputRef }: VehiclePickerSearchProps) {
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState<Status>('loading');
  const [data, setData] = useState<Response>({ mode: 'browse', results: [] });
  const [active, setActive] = useState(0);
  const [notice, setNotice] = useState('');
  const [attempt, setAttempt] = useState(0);
  const listId = useId();
  const ownRef = useRef<HTMLInputElement>(null);
  const input = inputRef ?? ownRef;
  const listRef = useRef<HTMLUListElement>(null);

  useEffect(() => {
    const q = query.trim();
    const browse = q.length < SEARCH_MIN_CHARS;
    const cached = browse ? browseCache.get(market) : undefined;
    if (cached) {
      setData(cached);
      setStatus('ready');
      return;
    }
    const controller = new AbortController();
    setStatus('loading');
    const timer = setTimeout(
      () => {
        const params = new URLSearchParams({ market, q: browse ? '' : q });
        fetch(`/api/catalog/search?${params}`, { signal: controller.signal, headers: { accept: 'application/json' } })
          .then((r) => (r.ok ? (r.json() as Promise<Response>) : Promise.reject(new Error(String(r.status)))))
          .then((r) => {
            if (browse) browseCache.set(market, r);
            setData(r);
            setActive(0);
            setStatus('ready');
          })
          .catch((e: unknown) => {
            if ((e as Error).name !== 'AbortError') setStatus('error');
          });
      },
      browse ? 0 : DEBOUNCE_MS,
    );
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query, market, attempt]);

  const results = status === 'ready' ? data.results : [];

  const choose = useCallback(
    (o: VehicleOption | undefined) => {
      if (!o) return;
      // Step 8b: la misma variant que el otro lado es válida si uno de los dos es usado (se decide en el paso
      // Nuevo/Usado del selector, que conoce la condición del otro lado).
      onSelect(o);
    },
    [onSelect],
  );

  useEffect(() => {
    listRef.current?.querySelector('[data-active="true"]')?.scrollIntoView({ block: 'nearest' });
  }, [active]);

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (!results.length) return;
    const last = results.length - 1;
    if (e.key === 'ArrowDown') setActive((i) => (i >= last ? 0 : i + 1));
    else if (e.key === 'ArrowUp') setActive((i) => (i <= 0 ? last : i - 1));
    else if (e.key === 'Enter') choose(results[active]);
    else return;
    e.preventDefault();
  };

  const count = results.length === 1 ? fill(labels.resultsOne, { count: 1 }) : fill(labels.resultsOther, { count: results.length });
  const activeId = results[active] ? `${listId}-opt-${active}` : undefined;

  return (
    <div className="picker">
      <div className="picker__search">
        <label className="sr-only" htmlFor={`${listId}-input`}>
          {labels.searchLabel}
        </label>
        <input
          ref={input}
          id={`${listId}-input`}
          className="picker__input"
          type="text"
          role="combobox"
          autoComplete="off"
          autoCapitalize="off"
          spellCheck={false}
          maxLength={SEARCH_MAX_CHARS}
          placeholder={labels.placeholder}
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setNotice('');
          }}
          onKeyDown={onKeyDown}
          aria-expanded={results.length > 0}
          aria-controls={listId}
          aria-autocomplete="list"
          {...(activeId ? { 'aria-activedescendant': activeId } : {})}
          aria-describedby={`${listId}-status`}
          data-testid="vehicle-search"
        />
        {query ? (
          <button
            type="button"
            className="vs-button vs-button--quiet vs-button--sm picker__clear"
            onClick={() => {
              setQuery('');
              input.current?.focus();
            }}
          >
            {labels.clear}
          </button>
        ) : null}
      </div>

      <p id={`${listId}-status`} className="picker__status muted small" role="status" aria-live="polite">
        {status === 'loading' ? labels.loading : status === 'error' ? '' : data.mode === 'browse' ? labels.hint : results.length ? count : ''}
      </p>
      {notice ? (
        <p className="picker__notice" role="alert">
          {notice}
        </p>
      ) : null}

      {status === 'error' ? (
        <div className="picker__error" role="alert">
          <p>{labels.error}</p>
          <button type="button" className="vs-button vs-button--ghost vs-button--sm" onClick={() => setAttempt((n) => n + 1)}>
            {labels.retry}
          </button>
        </div>
      ) : status === 'ready' && results.length === 0 ? (
        <p className="picker__empty">{data.mode === 'browse' ? labels.picker.emptyPublic : labels.empty}</p>
      ) : null}

      {data.mode === 'browse' && status === 'ready' && results.length ? <h3 className="label picker__group">{labels.browseTitle}</h3> : null}
      <ul ref={listRef} id={listId} role="listbox" aria-label={labels.searchLabel} className="picker__list" aria-busy={status === 'loading'}>
        {results.map((o, i) => {
          const text = optionText(o, labels);
          const isOther = other?.id === o.id;
          const isCurrent = current?.id === o.id;
          return (
            <li
              key={o.id}
              id={`${listId}-opt-${i}`}
              role="option"
              aria-selected={i === active}
              data-active={i === active}
              data-slug={o.slug}
              className="picker__option picker__option--thumb"
              onMouseDown={(e) => e.preventDefault()}
              onMouseEnter={() => setActive(i)}
              onClick={() => choose(o)}
            >
              <ModelVisual media={o.media} bodyType={o.bodyType} name={`${o.brand} ${o.model}`} sizes="96px" className="model-visual--thumb" />
              <span className="picker__option-text">
                <span className="picker__brand label">{text.brand}</span>
                <span className="picker__name">{text.name}</span>
                <span className="picker__meta mono small">
                  {text.meta}
                  {text.period ? ` · ${text.period}` : ''}
                  {isCurrent ? <span className="picker__badge picker__badge--current">{labels.current}</span> : null}
                  {isOther ? <span className="picker__badge">{labels.otherSide}</span> : null}
                </span>
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
