import type { Response } from "express";
import type { AuthenticatedRequest } from "../middlewares/auth.middleware";
import { config } from "../config/env";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import client from "../services/s3.service";
import {
  isExpectedStagingImageKey,
  stagingImageKey,
  type ReportImageSlot,
} from "../services/report-images.service";

const ALLOWED_TYPES: Record<string, string> = {
  "image/jpeg": "jpg",
};

const isUuid = (value: unknown): value is string =>
  typeof value === "string" &&
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value,
  );

export async function createPresignUrl(
  req: AuthenticatedRequest,
  res: Response,
) {
  try {
    const { mime, reportId, slot } = req.body as {
      mime?: string;
      reportId?: string;
      slot?: ReportImageSlot;
    };
    if (!mime || !reportId || !slot) {
      return res
        .status(400)
        .json({
          success: false,
          error: "mime, reportId, and slot are required",
        });
    }
    if (!isUuid(reportId)) {
      return res
        .status(400)
        .json({ success: false, error: "reportId must be a UUID" });
    }
    if (
      !(mime in ALLOWED_TYPES) ||
      (slot !== "original" && slot !== "support")
    ) {
      return res
        .status(400)
        .json({ success: false, error: "Invalid mime type" });
    }
    const key = stagingImageKey(reportId, slot);
    if (!isExpectedStagingImageKey(reportId, slot, key)) {
      return res
        .status(400)
        .json({ success: false, error: "Invalid staging image key" });
    }
    const command = new PutObjectCommand({
      Bucket: config.s3Bucket,
      Key: key,
      ContentType: mime,
    });
    const url = await getSignedUrl(client, command, {
      expiresIn: 60 * 15,
    });
    return res.json({ success: true, url, key });
  } catch (error) {
    console.error("presign failed:", error);
    return res
      .status(500)
      .json({ success: false, error: "Failed to create upload URLs" });
  }
}
