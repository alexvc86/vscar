'use client';
import { Sheet } from '@vscar/ui/sheet';
import { useCallback, useEffect, useId, useRef, useState, type KeyboardEvent } from 'react';
import { SEARCH_MAX_CHARS, SEARCH_MIN_CHARS, type VehicleOption } from '@/domain/catalog';
import { fill, optionText, type SelectorLabels } from './labels';

/**
 * VehicleSelector (Step 7b): búsqueda-primero sobre el catálogo de ReferenceVariants del mercado.
 * Chunk DIFERIDO (se carga al abrirlo por primera vez). Patrón combobox ARIA 1.2: el foco se queda en el input,
 * la opción activa se anuncia con `aria-activedescendant`; ↑ ↓ Intro; Escape cierra (Radix) y
 * devuelve el foco al botón que lo abrió. No calcula nada: solo busca vehículos.
 */
export interface VehicleSelectorProps {
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

type Status = 'loading' | 'ready' | 'error';
interface Response {
  mode: 'search' | 'browse';
  results: VehicleOption[];
}

const DEBOUNCE_MS = 200;
const browseCache = new Map<string, Response>();

export default function VehicleSelector({ open, onOpenChange, side, market, labels, current, other, onSelect }: VehicleSelectorProps) {
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState<Status>('loading');
  const [data, setData] = useState<Response>({ mode: 'browse', results: [] });
  const [active, setActive] = useState(0);
  const [notice, setNotice] = useState('');
  const [attempt, setAttempt] = useState(0);
  const listId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  // Al abrir: búsqueda vacía (navegación por el catálogo) y foco en el input.
  useEffect(() => {
    if (!open) return;
    setQuery('');
    setNotice('');
    setActive(0);
  }, [open, side]);

  useEffect(() => {
    if (!open) return;
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
  }, [open, query, market, attempt]);

  const results = status === 'ready' ? data.results : [];
  // Si TODO el catálogo visible es vista previa (canal PREVIEW), un único aviso; distintivo por fila solo si se mezclan.
  const allPreview = results.length > 0 && results.every((o) => o.preview);

  const choose = useCallback(
    (o: VehicleOption | undefined) => {
      if (!o) return;
      if (other && o.id === other.id) {
        setNotice(labels.sameCar);
        return;
      }
      onSelect(o);
    },
    [other, labels.sameCar, onSelect],
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
    <Sheet
      open={open}
      onOpenChange={onOpenChange}
      title={side === 'a' ? labels.pickerTitleA : labels.pickerTitleB}
      closeLabel={labels.close}
      className="vs-picker"
      onOpenAutoFocus={(e) => {
        e.preventDefault();
        inputRef.current?.focus();
      }}
      // Al cerrar (Escape, ✕ o selección), el foco vuelve al botón que abrió este lado (`data-picker-trigger`).
      onCloseAutoFocus={(e) => {
        const trigger = document.querySelector<HTMLElement>(`[data-picker-trigger="${side}"]`);
        if (trigger) {
          e.preventDefault();
          trigger.focus();
        }
      }}
    >
      <div className="picker">
        <div className="picker__search">
          <label className="sr-only" htmlFor={`${listId}-input`}>
            {labels.searchLabel}
          </label>
          <input
            ref={inputRef}
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
                inputRef.current?.focus();
              }}
            >
              {labels.clear}
            </button>
          ) : null}
        </div>

        <p id={`${listId}-status`} className="picker__status muted small" role="status" aria-live="polite">
          {status === 'loading' ? labels.loading : status === 'error' ? '' : data.mode === 'browse' ? labels.hint : results.length ? count : ''}
        </p>
        {allPreview ? <p className="picker__preview muted small">{labels.previewNote}</p> : null}
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
          <p className="picker__empty">{labels.empty}</p>
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
                aria-disabled={isOther || undefined}
                data-active={i === active}
                data-slug={o.slug}
                className="picker__option"
                onMouseDown={(e) => e.preventDefault()}
                onMouseEnter={() => setActive(i)}
                onClick={() => choose(o)}
              >
                <span className="picker__brand label">{text.brand}</span>
                <span className="picker__name">{text.name}</span>
                <span className="picker__meta mono small">
                  {text.meta}
                  {text.period ? ` · ${text.period}` : ''}
                  {o.preview && !allPreview ? (
                    <span className="picker__badge" title={labels.previewNote}>
                      {labels.preview}
                    </span>
                  ) : null}
                  {isCurrent ? <span className="picker__badge picker__badge--current">{labels.current}</span> : null}
                  {isOther ? <span className="picker__badge">{labels.otherSide}</span> : null}
                </span>
              </li>
            );
          })}
        </ul>
      </div>
    </Sheet>
  );
}
