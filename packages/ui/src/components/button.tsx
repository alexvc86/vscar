import { Slot } from '@radix-ui/react-slot';
import { forwardRef, type ButtonHTMLAttributes } from 'react';
import { cn } from '../cn.ts';

/** Button (patrón shadcn): `asChild` para enlaces; objetivo táctil ≥ 44 px. Estilos en `vs-button*`. */
export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'solid' | 'ghost' | 'quiet';
  size?: 'md' | 'sm';
  asChild?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button({ variant = 'solid', size = 'md', asChild, className, type, ...props }, ref) {
  const Comp = asChild ? Slot : 'button';
  return <Comp ref={ref} className={cn('vs-button', `vs-button--${variant}`, size === 'sm' && 'vs-button--sm', className)} {...(asChild ? {} : { type: type ?? 'button' })} {...props} />;
});
