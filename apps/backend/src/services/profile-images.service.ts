import {
  DeleteObjectCommand,
  HeadObjectCommand,
} from "@aws-sdk/client-s3";
import { config } from "../config/env";
import client from "./s3.service";

export const PROFILE_IMAGE_PREFIX = "profiles/";

/**
 * Supported profile image MIME types and their corresponding
 * file extensions.
 */
const PROFILE_IMAGE_TYPES = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
} as const;

export type ProfileImageMime =
  keyof typeof PROFILE_IMAGE_TYPES;

/**
 * Final object key for a user's avatar.
 *
 * Example:
 *
 * profiles/userId/avatar-uuid.jpg
 * profiles/userId/avatar-uuid.png
 * profiles/userId/avatar-uuid.webp
 */
export const profileImageKey = (
  userId: string,
  uploadId: string,
  mime: string,
) => {
  const extension = PROFILE_IMAGE_TYPES[
    mime as ProfileImageMime
  ];

  if (!extension) {
    throw new Error(`Unsupported profile image MIME type: ${mime}`);
  }

  return `${PROFILE_IMAGE_PREFIX}${userId}/avatar-${uploadId}.${extension}`;
};

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * Check whether a value is a valid UUID.
 */
export const isUuid = (
  value: unknown,
): value is string =>
  typeof value === "string" && UUID_RE.test(value);

/**
 * Check whether a profile image key belongs to the given user.
 *
 * Supports:
 *
 * .jpg
 * .png
 * .webp
 */
export const isOwnProfileImageKey = (
  userId: string,
  key: string,
) => {
  const prefix =
    `${PROFILE_IMAGE_PREFIX}${userId}/avatar-`;

  if (!key.startsWith(prefix)) {
    return false;
  }

  const rest = key.slice(prefix.length);

  const match = rest.match(
    /^([0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12})\.(jpg|png|webp)$/i,
  );

  if (!match) {
    return false;
  }

  return isUuid(match[1]);
};

/**
 * Derives the CDN URL for a stored key.
 *
 * The URL is never persisted in the DB.
 * Only the S3 object key should be stored.
 */
export const profileImageUrl = (
  imageKey?: string | null,
): string | null => {
  if (!imageKey) {
    return null;
  }

  let domain = config.cloudfrontDomain
    .replace(/^https?:\/\//, "")
    .replace(/\/+$/, "");

  if (!domain && config.s3Bucket) {
    domain = `${config.s3Bucket}.s3.${config.s3Region}.amazonaws.com`;
  }

  if (!domain) {
    return null;
  }

  return `https://${domain}/${imageKey.replace(/^\/+/, "")}`;
};

/**
 * True only once the client's PUT to the presigned URL
 * has landed in S3.
 */
export async function profileImageObjectExists(
  key: string,
) {
  try {
    await client.send(
      new HeadObjectCommand({
        Bucket: config.s3Bucket,
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

    /**
     * 404 = object does not exist.
     *
     * Do NOT treat 403 as "not found".
     * 403 can mean an IAM/S3 permission problem.
     */
    if (status === 404) {
      return false;
    }

    throw error;
  }
}

/**
 * Best-effort cleanup of a replaced avatar.
 *
 * DeleteObject is idempotent in S3, so deleting an object
 * that doesn't exist is normally safe.
 */
export async function deleteProfileImageObject(
  key: string,
) {
  await client
    .send(
      new DeleteObjectCommand({
        Bucket: config.s3Bucket,
        Key: key,
      }),
    )
    .catch(() => undefined);
}