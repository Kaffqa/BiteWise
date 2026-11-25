import imageCompression from 'browser-image-compression';
import { supabase } from './supabase';

/** Maximum image dimension (width or height) before compression */
const MAX_IMAGE_SIZE_PX = 1600;
/** Target file size after compression */
const MAX_FILE_SIZE_MB = 1;
/** JPEG quality after compression */
const INITIAL_QUALITY = 0.8;
const SCAN_BUCKET = 'food-scans';

/**
 * Compresses an image file to reduce upload size and AI processing time.
 * Targets max 1600px dimensions and ~1MB file size.
 */
export async function compressImage(file: File | Blob): Promise<File> {
  const imageFile =
    file instanceof File
      ? file
      : new File([file], 'capture.jpg', { type: file.type || 'image/jpeg' });

  const options = {
    maxSizeMB: MAX_FILE_SIZE_MB,
    maxWidthOrHeight: MAX_IMAGE_SIZE_PX,
    initialQuality: INITIAL_QUALITY,
    useWebWorker: true,
    fileType: 'image/jpeg' as const,
  };

  try {
    return await imageCompression(imageFile, options);
  } catch (error) {
    console.warn('Image compression failed, using original:', error);
    return imageFile;
  }
}

/**
 * Uploads a food scan image to Supabase Storage.
 * Images are stored in the `food-scans` bucket under `{userId}/{scanId}.jpg`.
 */
export async function uploadScanImage(
  userId: string,
  imageFile: File | Blob,
  skipCompression: boolean = false
): Promise<string> {
  const fileToUpload = skipCompression
    ? imageFile instanceof File
      ? imageFile
      : new File([imageFile], 'capture.jpg', { type: imageFile.type || 'image/jpeg' })
    : await compressImage(imageFile);

  const scanId = crypto.randomUUID();
  const filePath = `${userId}/${scanId}.jpg`;

  const { data, error } = await supabase.storage
    .from(SCAN_BUCKET)
    .upload(filePath, fileToUpload, {
      contentType: 'image/jpeg',
      cacheControl: '3600',
      upsert: false,
    });

  if (error) {
    throw new Error(`Failed to upload scan image: ${error.message}`);
  }

  const { data: urlData } = supabase.storage
    .from(SCAN_BUCKET)
    .getPublicUrl(data.path);

  return urlData.publicUrl;
}

/**
 * Extracts the bucket-relative object path from a Supabase Storage public URL.
 */
export function extractScanStoragePath(imageUrl: string | null | undefined): string | null {
  if (!imageUrl) return null;
  const marker = `/${SCAN_BUCKET}/`;
  const idx = imageUrl.indexOf(marker);
  if (idx === -1) return null;
  return decodeURIComponent(imageUrl.slice(idx + marker.length).split('?')[0]);
}

/**
 * Deletes a single scan image from Supabase Storage (best-effort).
 */
export async function deleteScanImage(imageUrl: string | null | undefined): Promise<void> {
  const path = extractScanStoragePath(imageUrl);
  if (!path) return;
  const { error } = await supabase.storage.from(SCAN_BUCKET).remove([path]);
  if (error) {
    console.warn('Failed to delete scan image from storage:', error.message);
  }
}

/**
 * Deletes all stored scan images belonging to a user.
 */
export async function deleteAllUserScanImages(userId: string): Promise<void> {
  const { data: files, error } = await supabase.storage.from(SCAN_BUCKET).list(userId, { limit: 1000 });
  if (error || !files || files.length === 0) return;

  const paths = files.filter((f) => f.name).map((f) => `${userId}/${f.name}`);
  if (paths.length > 0) {
    await supabase.storage.from(SCAN_BUCKET).remove(paths);
  }
}

/**
 * Converts a File/Blob to a base64-encoded string for AI API calls.
 */
export async function fileToBase64(file: File | Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result as string;
      const base64 = result.split(',')[1];
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
