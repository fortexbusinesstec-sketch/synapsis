import { S3Client, PutObjectCommand, DeleteObjectCommand, DeleteObjectsCommand } from '@aws-sdk/client-s3';

/**
 * CONFIGURACIÓN DE CLOUDFLARE R2 (S3 Compatible)
 */

const R2_ACCOUNT_ID    = process.env.R2_ACCOUNT_ID!;
const R2_ACCESS_KEY    = process.env.R2_ACCESS_KEY_ID!;
const R2_SECRET_KEY    = process.env.R2_SECRET_ACCESS_KEY!;
const R2_PUBLIC_URL    = process.env.R2_PUBLIC_URL!; // Ejemplo: https://pub-xxx.r2.dev

// El nombre del bucket suele ser el subdominio de r2.dev si se usa el dominio público de CF
const BUCKET_NAME = process.env.R2_BUCKET_NAME!;

const s3 = new S3Client({
  region: 'auto',
  endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId:     R2_ACCESS_KEY,
    secretAccessKey: R2_SECRET_KEY,
  },
});

/**
 * S3 NO añade sufijos aleatorios automáticamente. 
 * Implementamos una pequeña utilidad para evitar colisiones.
 */
function addRandomSuffix(filename: string): string {
  const parts = filename.split('.');
  const ext   = parts.pop();
  const name  = parts.join('.');
  const rand  = Math.random().toString(36).substring(2, 8);
  return `${name}-${rand}.${ext}`;
}

/**
 * Sube un PDF a Cloudflare R2 y retorna la URL pública.
 */
export async function uploadPdf(filename: string, data: File | Blob): Promise<string> {
  const key = addRandomSuffix(filename);
  const arrayBuffer = await data.arrayBuffer();

  await s3.send(new PutObjectCommand({
    Bucket:      BUCKET_NAME,
    Key:         key,
    Body:        Buffer.from(arrayBuffer),
    ContentType: 'application/pdf',
  }));

  return `${R2_PUBLIC_URL}/${key}`;
}

/**
 * Sube una imagen (Buffer) a Cloudflare R2 y retorna la URL pública.
 */
export async function uploadImage(
  filename:    string,
  buffer:      Buffer,
  contentType: string,
): Promise<string> {
  const key = addRandomSuffix(filename);

  await s3.send(new PutObjectCommand({
    Bucket:      BUCKET_NAME,
    Key:         key,
    Body:        buffer,
    ContentType: contentType,
  }));

  return `${R2_PUBLIC_URL}/${key}`;
}

/**
 * Elimina un objeto de R2 por su URL.
 */
export async function deleteBlob(url: string): Promise<void> {
  try {
    const key = url.split('/').pop();
    if (!key) return;

    await s3.send(new DeleteObjectCommand({
      Bucket: BUCKET_NAME,
      Key:    key,
    }));
  } catch (error) {
    console.error('[R2] Error deleting object:', error);
  }
}

/**
 * Elimina múltiples objetos de R2 por sus URLs (Borrado Masivo).
 */
export async function deleteBlobs(urls: string[]): Promise<void> {
  try {
    const keys = urls
      .map(url => url.split('/').pop())
      .filter((key): key is string => !!key);

    if (keys.length === 0) return;

    await s3.send(new DeleteObjectsCommand({
      Bucket: BUCKET_NAME,
      Delete: {
        Objects: keys.map(Key => ({ Key })),
        Quiet:   true,
      },
    }));
  } catch (error) {
    console.error('[R2] Error deleting objects:', error);
  }
}
