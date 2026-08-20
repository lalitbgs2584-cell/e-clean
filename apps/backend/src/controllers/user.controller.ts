import type { Response } from "express";
import type { AuthenticatedRequest } from "../middlewares/auth.middleware";
import { prisma } from "db/client";
import { config } from "../config/env";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import s3Client from "../services/s3.service";
import {
  deleteProfileImageObject,
  isOwnProfileImageKey,
  profileImageKey,
  profileImageUrl,
  profileImageObjectExists,
} from "../services/profile-images.service";

// Roles that manage their own profile image. WORKER images are assigned by an
// AUTHORITY (see apps/authority-web /api/authority/workers/...), so workers are
// excluded here even if they call these endpoints directly.
const SELF_MANAGED_ROLES = ["CITIZEN", "AUTHORITY"];

export class UserController {
  public static async getProfile(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ success: false, error: "Unauthorized" });
      }

      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          name: true,
          email: true,
          image: true,
          emailVerified: true,
          role: true,
          profileImageUploadedById: true,
          profileImageAssignedAt: true,
          createdAt: true,
        },
      });

      if (!user) {
        return res.status(404).json({ success: false, error: "User not found" });
      }

      return res.json({
        success: true,
        data: {
          ...user,
          profileImageUrl: profileImageUrl(user.image),
        },
      });
    } catch (error: any) {
      return res.status(500).json({ success: false, error: error.message });
    }
  }

  // -------------------------------------------------------------------------
  // POST /api/users/me/profile-image/presign
  // Body: { mime: "image/jpeg" }
  //
  // Issues a presigned PUT for the caller's OWN avatar key in the shared
  // `profile` bucket. Ownership comes from the session (req.user.id) — the
  // client can never choose the target user or storage key.
  // -------------------------------------------------------------------------
  public static async presignOwnProfileImage(
    req: AuthenticatedRequest,
    res: Response,
  ) {
    try {
      const userId = req.user?.id as string | undefined;
      if (!userId) {
        return res.status(401).json({ success: false, error: "Unauthorized" });
      }

      if (!SELF_MANAGED_ROLES.includes(req.user?.role)) {
        return res.status(403).json({
          success: false,
          error:
            req.user?.role === "WORKER"
              ? "Workers cannot upload their official profile image. It is assigned by your authority."
              : "Your account role cannot self-manage a profile image",
        });
      }

      const { mime } = req.body as { mime?: string };
      if (mime !== "image/jpeg") {
        return res
          .status(400)
          .json({ success: false, error: "Only image/jpeg is supported" });
      }

      const uploadId = crypto.randomUUID();
      const key = profileImageKey(userId, uploadId);

      const url = await getSignedUrl(
        s3Client,
        new PutObjectCommand({
          Bucket: config.s3Bucket,
          Key: key,
          ContentType: mime,
        }),
        { expiresIn: 60 * 15 },
      );

      return res.json({ success: true, url, key });
    } catch (error) {
      console.error("[users/me/profile-image/presign]", error);
      return res
        .status(500)
        .json({ success: false, error: "Failed to create upload URL" });
    }
  }

  // -------------------------------------------------------------------------
  // PATCH /api/users/me/profile-image
  // Body: { key: string } — must be the key returned by the presign endpoint.
  //
  // Finalizes the upload AFTER the object is confirmed present in S3, so the
  // DB never points at a nonexistent image. Replaces the previous image
  // (old object removed only after the new one is live).
  // -------------------------------------------------------------------------
  public static async confirmOwnProfileImage(
    req: AuthenticatedRequest,
    res: Response,
  ) {
    try {
      const userId = req.user?.id as string | undefined;
      if (!userId) {
        return res.status(401).json({ success: false, error: "Unauthorized" });
      }

      if (!SELF_MANAGED_ROLES.includes(req.user?.role)) {
        return res.status(403).json({
          success: false,
          error:
            req.user?.role === "WORKER"
              ? "Workers cannot replace their official profile image. It is assigned by your authority."
              : "Your account role cannot self-manage a profile image",
        });
      }

      const { key } = req.body as { key?: string };
      if (!key) {
        return res
          .status(400)
          .json({ success: false, error: "key is required" });
      }

      if (!isOwnProfileImageKey(userId, key)) {
        return res.status(403).json({
          success: false,
          error: "Profile image key does not belong to the signed-in user",
        });
      }

      const exists = await profileImageObjectExists(key);
      if (!exists) {
        return res.status(409).json({
          success: false,
          error: "Upload has not completed. Upload to the presigned URL first.",
        });
      }

      const current = await prisma.user.findUnique({
        where: { id: userId },
        select: { image: true },
      });
      if (!current) {
        return res.status(404).json({ success: false, error: "User not found" });
      }

      const user = await prisma.user.update({
        where: { id: userId },
        data: {
          image: key,
          profileImageUploadedById: userId,
          profileImageAssignedAt: new Date(),
        },
        select: {
          id: true,
          name: true,
          email: true,
          image: true,
          role: true,
          profileImageUploadedById: true,
          profileImageAssignedAt: true,
        },
      });

      // Best-effort cleanup of the replaced object, only after the new image
      // is live in the DB. No-op for first-time uploads.
      if (current.image && current.image !== key) {
        await deleteProfileImageObject(current.image);
      }

      return res.json({
        success: true,
        data: {
          ...user,
          profileImageUrl: profileImageUrl(user.image),
        },
      });
    } catch (error) {
      console.error("[users/me/profile-image confirm]", error);
      return res
        .status(500)
        .json({ success: false, error: "Failed to update profile image" });
    }
  }
}
