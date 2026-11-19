const MAX_BYTES = 110_000;

export async function shrinkAvatar(file: File, size = 256): Promise<Blob> {
  if (!/^image\//i.test(file.type)) throw new Error('Нужен файл изображения.');
  const bitmap = await createImageBitmap(file);
  const side = Math.min(bitmap.width, bitmap.height);
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Браузер не смог подготовить фото.');
  ctx.drawImage(bitmap, (bitmap.width - side) / 2, (bitmap.height - side) / 2, side, side, 0, 0, size, size);
  bitmap.close?.();
  for (const quality of [0.88, 0.78, 0.66, 0.5]) {
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', quality));
    if (blob && blob.size <= MAX_BYTES) return blob;
  }
  throw new Error('Фото не удалось сжать до допустимого размера.');
}

export async function uploadAvatar(file: File): Promise<string> {
  const blob = await shrinkAvatar(file);
  const response = await fetch('/auth/avatar', { method: 'POST', headers: { 'Content-Type': blob.type }, body: blob });
  const data = (await response.json().catch(() => ({}))) as { picture?: string; error?: string };
  if (!response.ok || !data.picture) throw new Error(data.error || 'Не удалось сохранить фото.');
  return data.picture;
}

export async function removeAvatar(): Promise<void> {
  const response = await fetch('/auth/avatar', { method: 'DELETE' });
  if (!response.ok) throw new Error('Не удалось удалить фото.');
}
