import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { ModelVisual } from '../src/components/vehicle/ModelVisual';
import { profileFor } from '../src/components/vehicle/silhouette.ts';

/** Step 7b.2 — visual de tarjeta: imagen autorizada (next/image) o silueta genérica; nunca vacío. Media SINTÉTICA. */
const media = { src: '/media/synthetic/golf.webp', width: 640, height: 360, alt: 'IDENTIFYING' as const, match: 'MODEL' as const };

describe('ModelVisual', () => {
  it('image: next/image, fixed size (no CLS), lazy by default, identifying alt = "Brand Model"', () => {
    const html = renderToStaticMarkup(<ModelVisual media={media} bodyType="hatchback" name="Volkswagen Golf" />);
    expect(html).toContain('data-visual="image"');
    expect(html).toMatch(/alt="Volkswagen Golf"/);
    expect(html).toMatch(/loading="lazy"/);
    expect(html).toMatch(/width="640"/);
    expect(html).toMatch(/height="360"/);
    expect(html).toContain('/_next/image?url=%2Fmedia%2Fsynthetic%2Fgolf.webp');
  });
  it('first visible cards load eagerly; decorative media gets alt=""', () => {
    const html = renderToStaticMarkup(<ModelVisual media={{ ...media, alt: 'DECORATIVE' }} bodyType="hatchback" name="Volkswagen Golf" eager />);
    expect(html).toMatch(/alt=""/);
    expect(html).not.toMatch(/loading="lazy"/);
  });
  it('conditional rights: the mandatory attribution travels with the image', () => {
    const html = renderToStaticMarkup(<ModelVisual media={{ ...media, attribution: 'Foto: Ejemplo, CC BY 4.0' }} bodyType="hatchback" name="Volkswagen Golf" />);
    expect(html).toContain('Foto: Ejemplo, CC BY 4.0');
  });
  it('no media: generic body-type silhouette, decorative (never pretends to be the model)', () => {
    const html = renderToStaticMarkup(<ModelVisual bodyType="suv" name="BMW X3" />);
    expect(html).toContain('data-visual="silhouette"');
    expect(html).toContain('data-silhouette="suv"');
    expect(html).toContain('aria-hidden="true"');
    expect(html).not.toContain('<img');
  });
  it('every body type maps to a generic class', () => {
    expect(['hatchback', 'estate', 'mpv', 'van'].map(profileFor)).toEqual(['hatchback', 'hatchback', 'hatchback', 'hatchback']);
    expect(['suv', 'pickup'].map(profileFor)).toEqual(['suv', 'suv']);
    expect(['sedan', 'coupe', 'convertible'].map(profileFor)).toEqual(['sedan', 'sedan', 'sedan']);
  });
});
