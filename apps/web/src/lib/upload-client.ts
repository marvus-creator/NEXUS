'use client';

import { API_BASE } from './api';

export type UploadFolder = 'posts' | 'covers' | 'events' | 'places' | 'circles' | 'listings' | 'businesses';

const MAX_EDGE = 1920;

async function shrink(file: File): Promise<Blob> {
  if (!file.type.startsWith('image/') || file.type === 'image/gif') return file;

  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height));

    if (scale === 1 && file.size < 1_500_000) {
      bitmap.close();
      return file;
    }

    const canvas = document.createElement('canvas');
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    canvas.getContext('2d')?.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close();

    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.86));
    return blob ?? file;
  } catch {
    return file;
  }
}

export async function uploadImage(file: File, folder: UploadFolder) {
  const blob = await shrink(file);
  const form = new FormData();
  const name = blob === file ? file.name : file.name.replace(/\.\w+$/, '') + '.jpg';
  form.append('file', blob, name);

  const response = await fetch(`${API_BASE}/uploads/image?folder=${folder}`, {
    method: 'POST',
    credentials: 'include',
    body: form,
  });

  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    const message = Array.isArray(payload?.message) ? payload.message[0] : payload?.message;
    throw new Error(message ?? 'Could not upload that image.');
  }

  return (payload as { url: string }).url;
}
