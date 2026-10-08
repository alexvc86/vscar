import type { ReactNode } from 'react';
import { cn } from '../cn.ts';

/**
 * Disclosure / Accordion item sobre `<details>` nativo: accesible, funciona sin JS y no añade bundle.
 * Se prefiere a Radix Accordion para la capa de detalles (contenido server-rendered e indexable).
 */
export function Disclosure({ summary, children, className, id, defaultOpen }: { summary: ReactNode; children: ReactNode; className?: string; id?: string; defaultOpen?: boolean }) {
  return (
    <details className={cn('vs-disclosure', className)} id={id} open={defaultOpen}>
      <summary className="vs-disclosure__summary">{summary}</summary>
      <div className="vs-disclosure__body">{children}</div>
    </details>
  );
}
