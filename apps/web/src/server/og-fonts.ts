import 'server-only';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

/**
 * Fuentes Geist (TTF del paquete `geist`) para las imágenes OG generadas con next/og (Satori no admite WOFF2).
 * Se leen una vez por proceso; si no están disponibles, next/og usa su fuente por defecto.
 */
type OgFont = { name: string; data: Buffer; weight: 400 | 600; style: 'normal' };
let cached: Promise<OgFont[] | undefined> | undefined;

export function ogFonts(): Promise<OgFont[] | undefined> {
  cached ??= (async () => {
    const dir = join(process.cwd(), 'node_modules', 'geist', 'dist', 'fonts');
    try {
      const [semi, mono] = await Promise.all([readFile(join(dir, 'geist-sans', 'Geist-SemiBold.ttf')), readFile(join(dir, 'geist-mono', 'GeistMono-Regular.ttf'))]);
      return [
        { name: 'Geist', data: semi, weight: 600, style: 'normal' },
        { name: 'GeistMono', data: mono, weight: 400, style: 'normal' },
      ];
    } catch {
      return undefined;
    }
  })();
  return cached;
}
