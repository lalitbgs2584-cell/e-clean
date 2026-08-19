/**
 * Authenticated fetch helper for the e-clean API.
 * Attaches the Better Auth session cookie stored in SecureStore.
 */
import { authClient } from './auth-client';

const API_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:7000';

export interface PresignedUpload {
  key: string;
  uploadUrl: string;
  url: string;
}

interface ApiError {
  error: string;
}

export async function requestPresignedUploads(params: {
  contentType: string;
  count: number;
}): Promise<PresignedUpload[]> {
  const res = await fetch(`${API_URL}/api/upload/presign`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      cookie: authClient.getCookie(),
    },
    body: JSON.stringify(params),
  });

  if (!res.ok) {
    const data = (await res.json().catch(() => null)) as ApiError | null;
    throw new Error(data?.error ?? `Upload failed (${res.status})`);
  }

  const data = (await res.json()) as { uploads: PresignedUpload[] };
  return data.uploads;
}

export async function uploadToS3(
  presigned: PresignedUpload,
  fileUri: string,
  contentType: string
): Promise<void> {
  const file = await fetch(fileUri).then((r) => r.blob());
  const res = await fetch(presigned.uploadUrl, {
    method: 'PUT',
    headers: { 'Content-Type': contentType },
    body: file,
  });
  if (!res.ok) {
    throw new Error(`Upload to S3 failed (${res.status})`);
  }
}

/**
 * Uploads local (file://) photos to S3 and returns public URLs in the same
 * order. Remote http(s) URLs are passed through untouched. Throws if S3 is
 * not configured on the API — callers may fall back to the original URIs.
 */
export async function uploadPhotos(photoUris: string[]): Promise<string[]> {
  const local = photoUris
    .filter((u) => !/^https?:\/\//.test(u))
    .slice(0, 2);
  if (local.length === 0) return photoUris;

  const presigned = await requestPresignedUploads({
    contentType: 'image/jpeg',
    count: local.length,
  });

  const localToUrl = new Map<string, string>();
  for (let i = 0; i < local.length; i++) {
    await uploadToS3(presigned[i], local[i], 'image/jpeg');
    localToUrl.set(local[i], presigned[i].url);
  }

  return photoUris.map((u) => localToUrl.get(u) ?? u);
}
