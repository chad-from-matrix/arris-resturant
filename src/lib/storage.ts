import { getDownloadURL, ref, uploadBytes } from 'firebase/storage';
import { getStorageClient } from './firebase';

/** Uploads to Firebase Storage and returns the public download URL. */
export async function uploadImage(path: string, file: File): Promise<string> {
  const storageRef = ref(getStorageClient(), path);
  await uploadBytes(storageRef, file, { contentType: file.type });
  return getDownloadURL(storageRef);
}

export function menuItemImagePath(itemId: string, file: File): string {
  const ext = file.name.split('.').pop()?.toLowerCase() ?? 'jpg';
  return `menu-items/${itemId}-${Date.now()}.${ext}`;
}

export function brandImagePath(kind: 'logo' | 'hero', file: File): string {
  const ext = file.name.split('.').pop()?.toLowerCase() ?? 'png';
  return `brand/${kind}-${Date.now()}.${ext}`;
}

export function categoryImagePath(slug: string, file: File): string {
  const ext = file.name.split('.').pop()?.toLowerCase() ?? 'jpg';
  return `categories/${slug}-${Date.now()}.${ext}`;
}
