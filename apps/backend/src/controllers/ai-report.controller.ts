import type { Response } from "express";
import { prisma } from "db/client";
import type { AuthenticatedRequest } from "../middlewares/auth.middleware";
import { enqueueAIClassification } from "../queues/ai-classification.queues";
import {
  deleteFinalReportImages,
  deleteStagedReportImages,
  isExpectedStagingImageKey,
  promoteReportImages,
  type ReportImageSlot,
} from "../services/report-images.service";
import { randomUUID } from "node:crypto";
import { config } from "../config/env";

interface GenerateReportBody {
  reportId?: string;
  originalImageKey?: string;
  supportImageKey?: string | null;
  location?: string;
  latitude: number;
  longitude: number;
  duplicateResolution?: "same_issue" | "new_issue";
  isLittererReport?: boolean;
  littererDetails?: {
    gender?: "MALE" | "FEMALE" | "OTHER" | "UNKNOWN";
    approxAge?: string;
    clothingDescription?: string;
  };
}

interface NearbyReportRow {
  id: string;
  status: string;
  dumpType: string | null;
  wasteCategory: string | null;
  createdAt: Date;
  distance_m: number;
}

const DUPLICATE_RADIUS_METERS = 50;

const isUuid = (value: unknown): value is string =>
  typeof value === "string" &&
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value,
  );

async function findNearbyReport(
  latitude: number,
  longitude: number,
): Promise<NearbyReportRow | null> {
  const rows = await prisma.$queryRaw<NearbyReportRow[]>`
    SELECT id, status, "dumpType", "wasteCategory", "createdAt",
      ST_Distance(
        ST_SetSRID(ST_MakePoint(longitude, latitude), 4326)::geography,
        ST_SetSRID(ST_MakePoint(${longitude}, ${latitude}), 4326)::geography
      ) AS distance_m
    FROM "reports"
    WHERE ST_DWithin(
      ST_SetSRID(ST_MakePoint(longitude, latitude), 4326)::geography,
      ST_SetSRID(ST_MakePoint(${longitude}, ${latitude}), 4326)::geography,
      ${DUPLICATE_RADIUS_METERS}
    )
      AND status NOT IN ('RESOLVED', 'VERIFIED', 'CANCELLED')
      AND "createdAt" > NOW() - INTERVAL '14 days'
    ORDER BY distance_m ASC
    LIMIT 1;
  `;

  return rows[0] ?? null;
}

export const generateAIBasedReport = async (
  req: AuthenticatedRequest,
  res: Response,
) => {
  const userId = req.user?.id;
  if (!userId) {
    return res.status(401).json({ success: false, error: "Unauthorized" });
  }

  const {
    reportId,
    originalImageKey,
    supportImageKey,
    location,
    latitude,
    longitude,
    duplicateResolution,
    isLittererReport,
    littererDetails,
  }: GenerateReportBody = req.body;

  if (!isUuid(reportId)) {
    return res
      .status(400)
      .json({ success: false, error: "reportId must be a UUID" });
  }
  if (
    !originalImageKey ||
    !isExpectedStagingImageKey(reportId, "original", originalImageKey) ||
    (supportImageKey != null &&
      !isExpectedStagingImageKey(reportId, "support", supportImageKey))
  ) {
    return res.status(400).json({
      success: false,
      error: "Report images must use the expected staged S3 keys",
    });
  }
  if (typeof latitude !== "number" || typeof longitude !== "number") {
    return res.status(400).json({
      success: false,
      error: "latitude and longitude are required",
    });
  }
  if (isLittererReport !== undefined && typeof isLittererReport !== "boolean") {
    return res
      .status(400)
      .json({ success: false, error: "isLittererReport must be a boolean" });
  }
  if (
    littererDetails?.gender &&
    !["MALE", "FEMALE", "OTHER", "UNKNOWN"].includes(littererDetails.gender)
  ) {
    return res
      .status(400)
      .json({ success: false, error: "Unsupported litterer gender" });
  }
  if (
    littererDetails?.approxAge !== undefined &&
    typeof littererDetails.approxAge !== "string"
  ) {
    return res
      .status(400)
      .json({ success: false, error: "litterer approxAge must be text" });
  }
  if (
    littererDetails?.clothingDescription !== undefined &&
    typeof littererDetails.clothingDescription !== "string"
  ) {
    return res.status(400).json({
      success: false,
      error: "litterer clothingDescription must be text",
    });
  }

  try {
    if (duplicateResolution === "same_issue") {
      const nearbyReport = await findNearbyReport(latitude, longitude);
      if (nearbyReport) {
        const updatedReport = await prisma.report.update({
          where: { id: nearbyReport.id },
          data: { upvoteCount: { increment: 1 } },
        });
        await deleteStagedReportImages(reportId).catch((error) =>
          console.warn(
            "Could not delete duplicate report staging images:",
            error,
          ),
        );

        return res.status(200).json({
          success: true,
          isDuplicate: true,
          reportId: nearbyReport.id,
          distanceMeters: Math.round(nearbyReport.distance_m),
          upvoteCount: updatedReport.upvoteCount,
          message: "Upvoted existing nearby report.",
        });
      }
    }

    const imageSlots: ReportImageSlot[] = supportImageKey
      ? ["original", "support"]
      : ["original"];
    const newReport = await prisma.report.create({
      data: {
        id: reportId,
        userId,
        location: location || null,
        description: null,
        latitude,
        longitude,
        status: "PENDING",
        isLittererReport: Boolean(isLittererReport),
        ...(isLittererReport
          ? {
              dumpType: "ILLEGAL_DUMPING",
              littererGender: littererDetails?.gender ?? "UNKNOWN",
              littererApproxAge: littererDetails?.approxAge?.trim() || null,
              littererClothingDescription:
                littererDetails?.clothingDescription?.trim() || null,
            }
          : {}),
      },
    });

    try {
      const imagePaths = await promoteReportImages(reportId, imageSlots);
      const imageRows = imagePaths.map((storagePath) => ({
        id: randomUUID(),
        reportId,
        uploadedBy: userId,
        storagePath,
        type: "REPORT" as const,
        mediaType: "PHOTO" as const,
      }));
      await prisma.$transaction(async (tx) => {
        await tx.reportImage.createMany({ data: imageRows });
        const ledger = await tx.pointTransaction.createMany({
          data: imageRows.map((image) => ({
            userId,
            reportId,
            imageId: image.id,
            points: config.reportImagePoints,
            // Small flat participation reward for submitting a report image.
            // The main quality-based reward is awarded later on REPORT_VERIFIED.
            reason: "REPORT_SUBMITTED_PARTICIPATION",
          })),
          skipDuplicates: true,
        });
        if (ledger.count && config.reportImagePoints) {
          await tx.user.update({
            where: { id: userId },
            data: {
              points: { increment: ledger.count * config.reportImagePoints },
            },
          });
        }
      });
      await enqueueAIClassification({
        reportId,
        imagePaths,
        location: location || null,
        latitude,
        longitude,
      });
    } catch (error) {
      await deleteFinalReportImages(reportId, imageSlots).catch(
        () => undefined,
      );
      await prisma.report
        .delete({ where: { id: newReport.id } })
        .catch(() => undefined);
      throw error;
    }

    return res.status(201).json({
      success: true,
      isDuplicate: false,
      reportId: newReport.id,
      status: "PENDING",
      message: "Report created and queued for AI assessment.",
    });
  } catch (error: unknown) {
    if ((error as { code?: string }).code === "P2002") {
      return res
        .status(409)
        .json({ success: false, error: "Report is already being processed" });
    }
    console.error("generateAIBasedReport error:", error);
    return res.status(500).json({
      success: false,
      error: "Failed to create and queue AI report",
    });
  }
};
