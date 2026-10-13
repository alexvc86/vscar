'use client';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import { useEffect, useState, type MouseEvent } from 'react';
import { useUi } from '@/client/store';
import { pairSlug, type VehicleOption } from '@/domain/catalog';
import type { SelectorLabels } from './labels';

const VehicleSelector = dynamic(() => import('./VehicleSelector'), { ssr: false });

/**
 * Controles del par en la comparación (Step 7b §56–60). Cambiar un coche o intercambiarlos NAVEGA a la nueva URL
 * con el router (el servidor resuelve los datos y la decisión inicial); el escenario actual de la URL se conserva.
 */
function navigate(router: ReturnType<typeof useRouter>, locale: string, slug: string) {
  router.push(`/${locale}/compare/${slug}${window.location.search}`);
}

export function ChangeCarButton({ side, label, ariaLabel }: { side: 'a' | 'b'; label: string; ariaLabel: string }) {
  const openPicker = useUi((s) => s.openPicker);
  return (
    <button type="button" className="vs-button vs-button--quiet vs-button--sm change-car" onClick={() => openPicker(side)} aria-label={ariaLabel} data-testid={`change-${side}`} data-picker-trigger={side}>
      {label}
    </button>
  );
}

/** Enlace normal (sin JS navega igual); con JS conserva el escenario vigente de la URL. */
export function SwapCarsLink({ href, locale, slug, label }: { href: string; locale: string; slug: string; label: string }) {
  const router = useRouter();
  const onClick = (e: MouseEvent<HTMLAnchorElement>) => {
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
    e.preventDefault();
    navigate(router, locale, slug);
  };
  return (
    <a href={href} className="vs-button vs-button--ghost" onClick={onClick} data-testid="swap-cars">
      <span aria-hidden="true">⇄ </span>
      {label}
    </a>
  );
}

export function PairPickerHost({ locale, market, labels, a, b }: { locale: string; market: string; labels: SelectorLabels; a: VehicleOption; b: VehicleOption }) {
  const router = useRouter();
  const side = useUi((s) => s.pickerSide);
  const closePicker = useUi((s) => s.closePicker);
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    if (side) setMounted(true);
  }, [side]);
  // Al navegar a otro par, el selector se cierra.
  useEffect(() => closePicker, [closePicker, a.id, b.id]);
  if (!mounted) return null;
  return (
    <VehicleSelector
      open={!!side}
      onOpenChange={(o) => !o && closePicker()}
      side={side ?? 'a'}
      market={market}
      labels={labels}
      current={side === 'a' ? a : side === 'b' ? b : undefined}
      other={side === 'a' ? b : side === 'b' ? a : undefined}
      onSelect={(o) => {
        closePicker();
        if ((side === 'a' && o.id === a.id) || (side === 'b' && o.id === b.id)) return;
        navigate(router, locale, side === 'a' ? pairSlug(o.slug, b.slug) : pairSlug(a.slug, o.slug));
      }}
    />
  );
}
