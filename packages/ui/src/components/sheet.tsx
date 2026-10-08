'use client';
import * as Dialog from '@radix-ui/react-dialog';
import type { ReactNode } from 'react';
import { cn } from '../cn.ts';

/**
 * Sheet (patrón shadcn sobre Radix Dialog): lateral derecha en escritorio, inferior en móvil (CSS).
 * Foco atrapado, Escape y retorno del foco los da Radix. Estilos en `vs-sheet*`.
 */
export interface SheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  closeLabel: string;
  children: ReactNode;
  className?: string;
  /** Al cerrar, Radix devuelve el foco al disparador; `preventDefault()` permite enviarlo a otro sitio. */
  onCloseAutoFocus?: (event: Event) => void;
}

export function Sheet({ open, onOpenChange, title, description, closeLabel, children, className, onCloseAutoFocus }: SheetProps) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="vs-sheet__overlay" />
        <Dialog.Content className={cn('vs-sheet', className)} {...(description ? {} : { 'aria-describedby': undefined })} {...(onCloseAutoFocus ? { onCloseAutoFocus } : {})}>
          <header className="vs-sheet__header">
            <Dialog.Title className="vs-sheet__title">{title}</Dialog.Title>
            <Dialog.Close className="vs-button vs-button--quiet vs-button--sm" aria-label={closeLabel}>
              ✕
            </Dialog.Close>
          </header>
          {description ? <Dialog.Description className="vs-sheet__description">{description}</Dialog.Description> : null}
          <div className="vs-sheet__body">{children}</div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
