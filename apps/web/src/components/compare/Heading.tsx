import type { ReactNode } from 'react';

/**
 * Titular con patrón SplitText accesible: la frase completa va en `sr-only` y la copia visual es
 * `aria-hidden` con `data-split` (GSAP la divide por líneas solo si el tier lo permite). Sin JS, se ve igual.
 */
export function SplitHeading({ as: Tag = 'h2', id, text, className, eyebrow }: { as?: 'h1' | 'h2' | 'h3'; id?: string; text: string; className?: string; eyebrow?: ReactNode }) {
  return (
    <>
      {eyebrow}
      <Tag id={id} className={className}>
        <span className="sr-only">{text}</span>
        <span aria-hidden="true" data-split="" className="split-copy">
          {text}
        </span>
      </Tag>
    </>
  );
}

export function Chapter({ id, labelledBy, className, children, index }: { id: string; labelledBy: string; className?: string; children: ReactNode; index: number }) {
  return (
    <section id={id} aria-labelledby={labelledBy} className={`chapter ${className ?? ''}`} data-chapter={id} data-chapter-index={index}>
      <div className="chapter__inner">{children}</div>
    </section>
  );
}
