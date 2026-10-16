import { createHash } from 'node:crypto';
import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import { basename } from 'node:path';
import { z } from 'zod';

/**
 * Manifiesto de adquisición (Step D1 §7): un registro por recurso bruto descargado.
 * El bruto nunca se modifica: el manifiesto lo identifica por SHA-256 y tamaño, y enlaza licencia y schema.
 * Los manifiestos van a Git; los brutos grandes no (`/data/` está en .gitignore).
 */
export const AcquisitionManifest = z
  .object({
    manifestVersion: z.literal(1),
    sourceId: z.string().regex(/^S\d{2}(-[A-Z]+)?$/),
    resourceTitle: z.string().min(1),
    resourceUrl: z.string().url(),
    /** URL de la petición exacta (consultas SQL de discodata incluidas). */
    requestUrl: z.string().url().optional(),
    retrievedAt: z.string().datetime({ offset: true }),
    originalFilename: z.string().min(1),
    /** Ruta relativa al directorio de datos (`data/`), nunca absoluta: el manifiesto es portable. */
    storedPath: z.string().min(1),
    contentType: z.string().min(1),
    fileSize: z.number().int().nonnegative(),
    sha256: z.string().regex(/^[0-9a-f]{64}$/),
    /** Fecha `Last-Modified` del servidor, si la envía. */
    sourceLastModified: z.string().optional(),
    licenseReference: z.string().min(1),
    /** Estado de derechos según la DATA_RIGHTS_MATRIX en el momento de la descarga (no se decide aquí). */
    rightsStatusAtRetrieval: z.enum(['CONDITIONAL', 'PENDING_REVIEW', 'RESTRICTED', 'PROHIBITED', 'VERIFIED_PUBLIC_USE']),
    /** Puede redistribuirse el bruto (subirse a Git, compartirse)? Por defecto no. */
    redistributable: z.boolean(),
    schemaVersion: z.string().min(1),
    recordCount: z.number().int().nonnegative(),
    notes: z.string().optional(),
  })
  .strict();
export type AcquisitionManifest = z.infer<typeof AcquisitionManifest>;

/** SHA-256 y tamaño de un fichero en streaming (no carga el fichero en memoria). */
export async function hashFile(path: string): Promise<{ sha256: string; fileSize: number }> {
  const hash = createHash('sha256');
  let fileSize = 0;
  for await (const chunk of createReadStream(path)) {
    hash.update(chunk as Buffer);
    fileSize += (chunk as Buffer).length;
  }
  const { size } = await stat(path);
  if (size !== fileSize) throw new Error(`file changed while hashing: ${path}`);
  return { sha256: hash.digest('hex'), fileSize };
}

export async function buildFileManifest(params: Omit<AcquisitionManifest, 'manifestVersion' | 'sha256' | 'fileSize' | 'originalFilename'> & { absolutePath: string; originalFilename?: string }): Promise<AcquisitionManifest> {
  const { absolutePath, originalFilename, ...rest } = params;
  const { sha256, fileSize } = await hashFile(absolutePath);
  return AcquisitionManifest.parse({ manifestVersion: 1, ...rest, originalFilename: originalFilename ?? basename(absolutePath), sha256, fileSize });
}

/** Verificación de auditoría: el bruto sigue siendo el que describe el manifiesto. */
export async function verifyFileManifest(m: Pick<AcquisitionManifest, 'sha256' | 'fileSize'>, absolutePath: string): Promise<boolean> {
  const { sha256, fileSize } = await hashFile(absolutePath);
  return sha256 === m.sha256 && fileSize === m.fileSize;
}
