import type { Response } from "express";
import type { AuthenticatedRequest } from "../middlewares/auth.middleware";
import { config } from "../config/env";
import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import client from "../services/s3.service";
import { v4 as uuidv4 } from 'uuid';
const ALLOWED_TYPES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/heic": "heic",
  "video/mp4": "mp4",
  "video/quicktime": "mov",
};


export async function createPresignUrl(req: AuthenticatedRequest, res: Response) {
  try {
    const { mime, reportId } = req.body
    if (!mime || !reportId) {
      return res.status(400).json({ success: false, error: "Mime and reportId are required" });
    }
    const valid = mime in ALLOWED_TYPES
    if (!valid) {
      return res.status(400).json({ success: false, error: "Invalid mime type" });
    }
    const filename = uuidv4()
    const command = new PutObjectCommand({
      Bucket: config.s3Bucket,
      Key: `${reportId}/${filename}.${ALLOWED_TYPES[mime]}`,
      ContentType: mime,
    })
    const url = await getSignedUrl(client, command, {
      expiresIn: 60 * 15, // 15 minutes
    });
    console.log("presigned-url", url)
    return res.json({ success: true, url });
  } catch (error) {
    console.error("presign failed:", error);
    return res
      .status(500)
      .json({ success: false, error: "Failed to create upload URLs" });
  }
}

