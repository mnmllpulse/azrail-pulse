type Api = (path: string, init?: RequestInit) => Promise<any>;

const REFERENCE_SIDE = 480;

export const isImageFile = (file: File) => /^image\//i.test(file.type) || /\.(png|jpe?g|webp|gif)$/i.test(file.name);

/** Образец для рисования: уменьшенная JPEG-копия, чтобы загрузка и разбор шли быстро. */
export async function shrinkReference(file: Blob): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  try {
    const scale = Math.min(1, REFERENCE_SIDE / Math.max(bitmap.width, bitmap.height));
    const width = Math.max(1, Math.round(bitmap.width * scale));
    const height = Math.max(1, Math.round(bitmap.height * scale));
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext('2d');
    if (!context) throw Error('Образец не удалось подготовить.');
    context.drawImage(bitmap, 0, 0, width, height);
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob((result) => resolve(result), 'image/jpeg', 0.85));
    if (!blob || blob.size < 1) throw Error('Образец не удалось подготовить.');
    return blob;
  } finally {
    bitmap.close();
  }
}

/** Загрузка вложений чата: оригинал для разметки сообщения и отдельная уменьшенная копия для образца. Каждый файл грузится один раз. */
export function createAttachmentUploads(api: Api, files: () => File[]) {
  const originals = new WeakMap<File, string>();
  const shrunkReferences = new WeakMap<File, string>();

  async function uploadedAttachment(file: File): Promise<string> {
    const known = originals.get(file);
    if (known) return known;
    if (file.size > 12 * 1024 * 1024) return '';
    const image = isImageFile(file);
    const headers: Record<string, string> = { 'Content-Type': file.type || (image ? 'image/png' : 'application/octet-stream'), 'X-Filename': encodeURIComponent(file.name.slice(0, 120)), 'X-Studio-Id': image ? 'image' : 'data' };
    const saved = (await api('/api/studio/artifacts', { method: 'POST', headers, body: file })) as { id?: string };
    if (!saved?.id) return '';
    originals.set(file, saved.id);
    return saved.id;
  }

  async function attachedImageReference(): Promise<string> {
    const file = files().find(isImageFile);
    if (!file) return '';
    const known = shrunkReferences.get(file);
    if (known) return known;
    const fitted = await shrinkReference(file);
    const headers: Record<string, string> = { 'Content-Type': 'image/jpeg', 'X-Filename': encodeURIComponent(file.name.replace(/\.\w+$/, '.jpg').slice(0, 120)), 'X-Studio-Id': 'image' };
    const saved = (await api('/api/studio/artifacts', { method: 'POST', headers, body: fitted })) as { id?: string };
    if (!saved?.id) throw Error('Вложенная картинка не сохранилась, поэтому рисовать по ней нельзя.');
    shrunkReferences.set(file, saved.id);
    return saved.id;
  }

  return { uploadedAttachment, attachedImageReference };
}
