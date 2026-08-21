import {
  DeleteObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { randomUUID } from "node:crypto";
import { env } from "@/config/env";

// ============================================================
// PROFILE IMAGE STORAGE
// ============================================================
//
// Bucket:
//   env.s3Bucket
//
// Object structure:
//
//   profiles/
//     <userId>/
//       avatar-<uuid>.jpg
//       avatar-<uuid>.png
//       avatar-<uuid>.webp
//
// The database stores ONLY the S3 object key.
// Raw S3 URLs are never stored.
//
// Example:
//
//   profiles/USER_ID/avatar-UUID.jpg
//
// CloudFront is used when the image needs to be displayed.
// ============================================================

const PROFILE_IMAGE_PREFIX = "profiles/";

/**
 * Allowed profile image MIME types.
 *
 * Keep this restrictive. Profile images do not need arbitrary
 * file formats.
 */
const PROFILE_IMAGE_TYPES = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
} as const;

type ProfileImageMime = keyof typeof PROFILE_IMAGE_TYPES;

/**
 * UUID validation.
 */
const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * Cache one S3 client for the lifetime of the process.
 */
let cachedClient: S3Client | null = null;

export function getS3Client(): S3Client {
  if (!cachedClient) {
    cachedClient = new S3Client({
      region: env.s3Region,

      credentials: {
        accessKeyId: env.s3AccessKeyId,
        secretAccessKey: env.s3SecretAccessKey,
      },
    });
  }

  return cachedClient;
}

/**
 * Check whether a MIME type is supported.
 */
export function isSupportedProfileImageMime(
  mime: string,
): mime is ProfileImageMime {
  return Object.prototype.hasOwnProperty.call(
    PROFILE_IMAGE_TYPES,
    mime,
  );
}

/**
 * Convert MIME type to a safe file extension.
 */
export function profileImageExtension(
  mime: string,
): string {
  if (!isSupportedProfileImageMime(mime)) {
    throw new Error(`Unsupported profile image MIME type: ${mime}`);
  }

  return PROFILE_IMAGE_TYPES[mime];
}

/**
 * Generate a profile image S3 key.
 *
 * IMPORTANT:
 * The extension is derived from a server-controlled allowlist.
 *
 * Never do:
 *
 *   `${uuid}.${clientProvidedValue}`
 */
export function profileImageKey(
  userId: string,
  uploadId: string,
  mime: string,
): string {
  if (!userId) {
    throw new Error("userId is required");
  }

  if (!UUID_RE.test(uploadId)) {
    throw new Error("Invalid uploadId");
  }

  const extension = profileImageExtension(mime);

  return `${PROFILE_IMAGE_PREFIX}${userId}/avatar-${uploadId}.${extension}`;
}

/**
 * Validate that an S3 key belongs to a particular user's
 * profile-image namespace.
 *
 * This prevents a user from deleting/accessing another user's
 * profile image through a user-scoped operation.
 */
export function isOwnProfileImageKey(
  userId: string,
  key: string,
): boolean {
  if (!userId || !key) {
    return false;
  }

  const prefix = `${PROFILE_IMAGE_PREFIX}${userId}/avatar-`;

  if (!key.startsWith(prefix)) {
    return false;
  }

  const filename = key.slice(prefix.length);

  const match = filename.match(
    /^([0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12})\.(jpg|png|webp)$/i,
  );

  return Boolean(match);
}

/**
 * Convert any stored S3 key into its CloudFront URL.
 *
 * One distribution (env.cloudfrontDomain) serves all three folders of the
 * shared bucket: reports/, cleanups/ and profiles/. The DB only ever stores
 * keys; URLs are derived on the fly and never persisted.
 */
export function cdnUrl(storageKey?: string | null): string | null {
  if (!storageKey) {
    return null;
  }

  if (/^https?:\/\//i.test(storageKey)) {
    return storageKey;
  }

  let domain = env.cloudfrontDomain
    .replace(/^https?:\/\//, "")
    .replace(/\/+$/, "");

  if (!domain && env.s3Bucket) {
    domain = `${env.s3Bucket}.s3.${env.s3Region}.amazonaws.com`;
  }

  if (!domain) {
    return null;
  }

  return `https://${domain}/${storageKey.replace(/^\/+/, "")}`;
}

/**
 * Convert a stored S3 key into the CloudFront URL.
 *
 * Database:
 *
 *   profiles/user123/avatar-uuid.jpg
 *
 * Returned:
 *
 *   https://cdn.example.com/profiles/user123/avatar-uuid.jpg
 */
export function profileImageUrl(
  imageKey?: string | null,
): string | null {
  if (!imageKey) {
    return null;
  }

  let domain = env.cloudfrontDomain
    .replace(/^https?:\/\//, "")
    .replace(/\/+$/, "");

  if (!domain && env.s3Bucket) {
    domain = `${env.s3Bucket}.s3.${env.s3Region}.amazonaws.com`;
  }

  if (!domain) {
    return null;
  }

  return `https://${domain}/${imageKey.replace(/^\/+/, "")}`;
}

/**
 * Generate a presigned PUT URL for a profile image.
 *
 * The mobile app uploads directly to S3 using this URL.
 */
export async function presignProfileImagePut(
  key: string,
  mime: string,
): Promise<string> {
  if (!isSupportedProfileImageMime(mime)) {
    throw new Error(`Unsupported profile image MIME type: ${mime}`);
  }

  return getSignedUrl(
    getS3Client(),
    new PutObjectCommand({
      Bucket: env.s3Bucket,
      Key: key,
      ContentType: mime,
    }),
    {
      expiresIn: 60 * 15,
    },
  );
}

/**
 * Check whether an S3 object exists.
 *
 * IMPORTANT:
 * A 403 is NOT necessarily "object does not exist".
 * It can mean that the credentials don't have permission.
 */
export async function profileImageObjectExists(
  key: string,
): Promise<boolean> {
  try {
    await getS3Client().send(
      new HeadObjectCommand({
        Bucket: env.s3Bucket,
        Key: key,
      }),
    );

    return true;
  } catch (error) {
    const status = (
      error as {
        $metadata?: {
          httpStatusCode?: number;
        };
      }
    )?.$metadata?.httpStatusCode;

    if (status === 404) {
      return false;
    }

    throw error;
  }
}

/**
 * Delete a profile image from S3.
 *
 * Do not silently swallow S3 errors.
 * The caller should know if deletion failed.
 */
export async function deleteProfileImageObject(
  key: string,
): Promise<void> {
  await getS3Client().send(
    new DeleteObjectCommand({
      Bucket: env.s3Bucket,
      Key: key,
    }),
  );
}

/**
 * Generate a unique upload ID.
 */
export const generateUploadId = (): string => {
  return randomUUID();
};