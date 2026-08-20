import {
  DeleteObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { randomUUID } from "node:crypto";
import { env } from "@/config/env";

// All profile avatars (citizen, worker, authority) live in ONE shared bucket
// under the `profile/` prefix. The `profile` bucket is exposed through the
// Profile CDN domain — raw URLs are never stored; the DB holds only the key.

const PROFILE_IMAGE_PREFIX = "profile/";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

let cachedClient: S3Client | null = null;

export function getS3Client() {
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

export const profileImageKey = (userId: string, uploadId: string) =>
  `${PROFILE_IMAGE_PREFIX}${userId}/avatar-${uploadId}.jpg`;

export const isOwnProfileImageKey = (userId: string, key: string) => {
  const prefix = `${PROFILE_IMAGE_PREFIX}${userId}/avatar-`;
  if (!key.startsWith(prefix)) return false;
  const rest = key.slice(prefix.length);
  return rest.endsWith(".jpg") && UUID_RE.test(rest.slice(0, -4));
};

/** Derives the Profile CDN URL for a key. Keys stay in the DB; URLs don't. */
export function profileImageUrl(imageKey?: string | null): string | null {
  if (!imageKey) return null;
  const domain = env.cloudfrontProfileDomain
    .replace(/^https?:\/\//, "")
    .replace(/\/$/, "");
  if (!domain) return null;
  return `https://${domain}/${imageKey.replace(/^\//, "")}`;
}

export async function presignProfileImagePut(key: string, mime: string) {
  return getSignedUrl(
    getS3Client(),
    new PutObjectCommand({
      Bucket: env.s3Bucket,
      Key: key,
      ContentType: mime,
    }),
    { expiresIn: 60 * 15 },
  );
}

export async function profileImageObjectExists(key: string) {
  try {
    await getS3Client().send(
      new HeadObjectCommand({ Bucket: env.s3Bucket, Key: key }),
    );
    return true;
  } catch (error) {
    const status = (error as { $metadata?: { httpStatusCode?: number } })
      ?.$metadata?.httpStatusCode;
    if (status === 404 || status === 403) return false;
    throw error;
  }
}

export async function deleteProfileImageObject(key: string) {
  await getS3Client()
    .send(new DeleteObjectCommand({ Bucket: env.s3Bucket, Key: key }))
    .catch(() => undefined);
}

export const generateUploadId = () => randomUUID();
