import Image from 'next/image';
import type { MediaView } from '@/domain/catalog';
import { BodySilhouette } from './BodySilhouette';

/**
 * Visual de una tarjeta de modelo / versión (Step 7b.2): imagen autorizada para el canal (next/image, AVIF/WebP,
 * tamaño fijo, perezosa salvo las primeras) o, si no hay, silueta genérica de su carrocería. Nunca vacío.
 * Caja de proporción fija (16:9) → sin CLS. Las URLs que llegan ya han pasado el control de derechos en el servidor.
 */
export function ModelVisual({ media, bodyType, name, eager = false, sizes = '(max-width: 699px) 50vw, 220px', className }: { media?: MediaView | undefined; bodyType: string; name: string; eager?: boolean; sizes?: string; className?: string }) {
  return (
    <div className={`model-visual${className ? ` ${className}` : ''}`} data-visual={media ? 'image' : 'silhouette'}>
      {media ? (
        <Image
          src={media.src}
          width={media.width}
          height={media.height}
          sizes={sizes}
          alt={media.alt === 'DECORATIVE' ? '' : name}
          loading={eager ? 'eager' : 'lazy'}
          className="model-visual__img"
        />
      ) : (
        <BodySilhouette bodyType={bodyType} />
      )}
      {/* Derechos CONDITIONAL: la atribución obligatoria acompaña siempre a la imagen (VEHICLE_MEDIA_POLICY §7). */}
      {media?.attribution ? <span className="model-visual__credit">{media.attribution}</span> : null}
    </div>
  );
}
