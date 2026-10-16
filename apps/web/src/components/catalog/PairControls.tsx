'use client';
import { useRouter } from 'next/navigation';
import { startTransition, useEffect, useState, type MouseEvent } from 'react';
import { useUi } from '@/client/store';
import { pairSlug, type VehicleOption } from '@/domain/catalog';
import { isUsedParam, joinQuery, swapSearch, todayIn, withSide, type PairConditions } from '@/domain/used-params';
import type { SelectorLabels, UsedLabels } from './labels';
import { useVehiclePicker } from './picker-loader';




/**
 * Controles del par en la comparación (Step 7b §56–60). Cambiar un coche o intercambiarlos NAVEGA a la nueva URL
 * con el router (el servidor resuelve los datos y la decisión inicial); el escenario actual de la URL se conserva.
 */

export function ChangeCarButton({ side, label, ariaLabel }: { side: 'a' | 'b'; label: string; ariaLabel: string }) {
  const openPicker = useUi((s) => s.openPicker);
  return (
    <button type="button" className="vs-button vs-button--quiet vs-button--sm change-car" onClick={() => startTransition(() => openPicker(side))} aria-label={ariaLabel} data-testid={`change-${side}`} data-picker-trigger={side}>
      {label}
    </button>
  );
}

/**
 * Enlace normal (sin JS navega igual: el servidor ya calculó la query intercambiada); con JS conserva el escenario
 * vigente de la URL y mueve condición + hechos de cada unidad con su vehículo (Step 8b).
 */
export function SwapCarsLink({ href, locale, slug, label, timeZone }: { href: string; locale: string; slug: string; label: string; timeZone: string }) {
  const router = useRouter();
  const onClick = (e: MouseEvent<HTMLAnchorElement>) => {
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
    e.preventDefault();
    router.push(`/${locale}/compare/${slug}${swapSearch(window.location.search, todayIn(timeZone))}`);
  };
  return (
    <a href={href} className="vs-button vs-button--ghost" onClick={onClick} data-testid="swap-cars">
      <span aria-hidden="true">⇄ </span>
      {label}
    </a>
  );
}

/**
 * Cambiar un coche (Step 8b): el lado recibe su NUEVA condición y, si es usado, los hechos de la NUEVA unidad (nunca
 * los de la anterior). El otro lado, el escenario y la fecha de evaluación se conservan.
 */
export function PairPickerHost({ locale, market, labels, used, a, b, conditions, timeZone }: { locale: string; market: string; labels: SelectorLabels; used: UsedLabels; a: VehicleOption; b: VehicleOption; conditions: PairConditions; timeZone: string }) {
  const router = useRouter();
  const side = useUi((s) => s.pickerSide);
  const closePicker = useUi((s) => s.closePicker);
  const [mounted, setMounted] = useState(false);
  const { Picker, ensure } = useVehiclePicker(market);
  useEffect(() => {
    if (!side) return;
    ensure();
    setMounted(true);
  }, [side, ensure]);
  // Al navegar a otro par, el selector se cierra.
  useEffect(() => closePicker, [closePicker, a.id, b.id]);
  if (!mounted || !Picker) return null;
  const today = todayIn(timeZone);
  return (
    <Picker
      open={!!side}
      onOpenChange={(o) => !o && closePicker()}
      side={side ?? 'a'}
      market={market}
      labels={labels}
      used={used}
      today={today}
      current={side === 'a' ? a : side === 'b' ? b : undefined}
      other={side === 'a' ? b : side === 'b' ? a : undefined}
      currentCondition={side ? conditions[side] : undefined}
      otherCondition={side === 'a' ? conditions.b : side === 'b' ? conditions.a : undefined}
      onSelect={({ option, condition }) => {
        closePicker();
        if (!side) return;
        const pair = withSide(conditions, side, condition, today);
        const slug = side === 'a' ? pairSlug(option.slug, b.slug) : pairSlug(a.slug, option.slug);
        // Escenario de la URL actual intacto; bloque usado reconstruido con la nueva condición de este lado.
        const scenario = new URLSearchParams([...new URLSearchParams(window.location.search).entries()].filter(([k]) => !isUsedParam(k))).toString();
        // Step 8c: tras cambiar una unidad, la atención va al resultado actualizado (`#result` + foco en su titular).
        router.push(`/${locale}/compare/${slug}${joinQuery(scenario ? `?${scenario}` : '', pair)}#result`);
      }}
    />
  );
}
