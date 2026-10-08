'use client';
import { useUi } from '@/client/store';

/** CTA "Cambiar tu uso": solo abre la hoja (el formulario y sus dependencias se cargan al abrir). */
export function ScenarioTrigger({ label, variant = 'solid' }: { label: string; variant?: 'solid' | 'ghost' }) {
  const openSheet = useUi((s) => s.openSheet);
  return (
    <button type="button" className={`vs-button vs-button--${variant}`} onClick={openSheet} aria-haspopup="dialog">
      {label}
    </button>
  );
}
