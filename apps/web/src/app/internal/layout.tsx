import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import '../globals.css';

/** Step D1.6 — layout raíz de las rutas internas (protegidas en `proxy.ts` y en cada página). Nunca indexable. */
export const metadata: Metadata = { title: 'VScar · interno', robots: { index: false, follow: false, nocache: true, googleBot: { index: false, follow: false } } };
export const dynamic = 'force-dynamic';

export default function InternalLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="es">
      <body className="internal">{children}</body>
    </html>
  );
}
