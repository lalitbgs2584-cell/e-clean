import {
  CopyObjectCommand,
  DeleteObjectCommand,
  GetBucketLifecycleConfigurationCommand,
  GetObjectCommand,
  PutBucketLifecycleConfigurationCommand,
} from "@aws-sdk/client-s3";
import type { LifecycleRule } from "@aws-sdk/client-s3";
import { config } from "../config/env";
import client from "./s3.service";

export type ReportImageSlot = "original" | "support";

const STAGING_PREFIX = "reports/staging/";
const LIFECYCLE_RULE_ID = "expire-report-staging-after-one-day";

export const stagingImageKey = (reportId: string, slot: ReportImageSlot) =>
  `${STAGING_PREFIX}${reportId}/${slot}.jpg`;

export const finalImageKey = (reportId: string, slot: ReportImageSlot) =>
  `reports/${reportId}/${slot}.jpg`;

export const isExpectedStagingImageKey = (
  reportId: string,
  slot: ReportImageSlot,
  key: string,
) => key === stagingImageKey(reportId, slot);

async function deleteKeys(keys: string[]) {
  await Promise.all(
    keys.map((Key) =>
      client.send(new DeleteObjectCommand({ Bucket: config.s3Bucket, Key })),
    ),
  );
}

export async function deleteStagedReportImages(
  reportId: string,
  slots: ReportImageSlot[] = ["original", "support"],
) {
  await deleteKeys(slots.map((slot) => stagingImageKey(reportId, slot)));
}

export async function deleteFinalReportImages(
  reportId: string,
  slots: ReportImageSlot[] = ["original", "support"],
) {
  await deleteKeys(slots.map((slot) => finalImageKey(reportId, slot)));
}

/** Copies completed staged uploads to their immutable report paths. */
export async function promoteReportImages(
  reportId: string,
  slots: ReportImageSlot[],
) {
  const copiedSlots: ReportImageSlot[] = [];

  try {
    for (const slot of slots) {
      const sourceKey = stagingImageKey(reportId, slot);
      await client.send(
        new CopyObjectCommand({
          Bucket: config.s3Bucket,
          Key: finalImageKey(reportId, slot),
          CopySource: `/${config.s3Bucket}/${encodeURIComponent(sourceKey).replace(/%2F/g, "/")}`,
          MetadataDirective: "COPY",
        }),
      );
      copiedSlots.push(slot);
    }
  } catch (error) {
    await deleteFinalReportImages(reportId, copiedSlots).catch(() => undefined);
    throw error;
  }

  await deleteStagedReportImages(reportId, slots);
  return slots.map((slot) => finalImageKey(reportId, slot));
}

async function bodyToBuffer(body: unknown): Promise<Buffer> {
  if (
    body &&
    typeof (body as { transformToByteArray?: unknown }).transformToByteArray ===
      "function"
  ) {
    return Buffer.from(
      await (
        body as { transformToByteArray: () => Promise<Uint8Array> }
      ).transformToByteArray(),
    );
  }

  const chunks: Uint8Array[] = [];
  for await (const chunk of body as AsyncIterable<Uint8Array>) {
    chunks.push(chunk);
  }
  return Buffer.concat(chunks);
}

/** Loads persisted S3 report images for the existing base64-only AI adapter. */
export async function loadReportImagesForAI(imagePaths: string[]) {
  return Promise.all(
    imagePaths.map(async (Key) => {
      const object = await client.send(
        new GetObjectCommand({ Bucket: config.s3Bucket, Key }),
      );
      const bytes = await bodyToBuffer(object.Body);
      return {
        base64: bytes.toString("base64"),
        mimeType: object.ContentType || "image/jpeg",
      };
    }),
  );
}

/** Ensures abandoned client uploads are expired by S3 after one day. */
export async function ensureStagingLifecycleRule() {
  if (!config.s3Bucket) {
    throw new Error(
      "S3_BUCKET is required to configure report image lifecycle rules",
    );
  }

  let rules: LifecycleRule[] = [];

  try {
    const response = await client.send(
      new GetBucketLifecycleConfigurationCommand({ Bucket: config.s3Bucket }),
    );
    rules = response.Rules ?? [];
  } catch (error: unknown) {
    const code = (error as { name?: string }).name;
    if (code !== "NoSuchLifecycleConfiguration") {
      throw error;
    }
  }

  const rule = {
    ID: LIFECYCLE_RULE_ID,
    Status: "Enabled" as const,
    Filter: { Prefix: STAGING_PREFIX },
    Expiration: { Days: 1 },
  };
  const existingIndex = rules.findIndex(
    (existing) => existing.ID === LIFECYCLE_RULE_ID,
  );
  const nextRules = [...rules];

  if (existingIndex >= 0) {
    nextRules[existingIndex] = rule;
  } else {
    nextRules.push(rule);
  }

  await client.send(
    new PutBucketLifecycleConfigurationCommand({
      Bucket: config.s3Bucket,
      LifecycleConfiguration: { Rules: nextRules },
    }),
  );
}
