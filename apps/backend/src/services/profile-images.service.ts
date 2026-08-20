import {
  DeleteObjectCommand,
  HeadObjectCommand,
} from "@aws-sdk/client-s3";
import { config } from "../config/env";
import client from "./s3.service";

export const PROFILE_IMAGE_PREFIX = "profile/";

/** Final object key for a user's avatar in the shared `profile` bucket. */
export const profileImageKey = (userId: string, uploadId: string) =>
  `${PROFILE_IMAGE_PREFIX}${userId}/avatar-${uploadId}.jpg`;

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export const isUuid = (value: unknown): value is string =>
  typeof value === "string" && UUID_RE.test(value);

export const isOwnProfileImageKey = (userId: string, key: string) => {
  const prefix = `${PROFILE_IMAGE_PREFIX}${userId}/avatar-`;
  if (!key.startsWith(prefix)) return false;
  const rest = key.slice(prefix.length);
  return rest.endsWith(".jpg") && isUuid(rest.slice(0, -4));
};

/** Derives the Profile CDN URL for a stored key; never persisted in the DB. */
export const profileImageUrl = (imageKey?: string | null): string | null => {
  if (!imageKey) return null;
  const domain = config.cloudfrontProfileDomain
    .replace(/^https?:\/\//, "")
    .replace(/\/$/, "");
  if (!domain) return null;
  return `https://${domain}/${imageKey.replace(/^\//, "")}`;
};

/** True only once the client's PUT to the presigned URL has landed in S3. */
export async function profileImageObjectExists(key: string) {
  try {
    await client.send(
      new HeadObjectCommand({ Bucket: config.s3Bucket, Key: key }),
    );
    return true;
  } catch (error) {
    const status = (error as { $metadata?: { httpStatusCode?: number } })
      ?.$metadata?.httpStatusCode;
    if (status === 404 || status === 403) return false;
    throw error;
  }
}

/** Best-effort cleanup of a replaced avatar; failures are non-fatal. */
export async function deleteProfileImageObject(key: string) {
  await client
    .send(new DeleteObjectCommand({ Bucket: config.s3Bucket, Key: key }))
    .catch(() => undefined);
}
