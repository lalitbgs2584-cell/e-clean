import type { Response } from "express";
import type { AuthenticatedRequest } from "../middlewares/auth.middleware";
import { prisma } from "db/client";
import { config } from "../config/env";
import { createNotification } from "../services/notification.service";
import { checkImageAuthenticity } from "../services/ai.service";
import {
  isDisputeEvidenceImageKey,
  loadReportImagesForAI,
} from "../services/report-images.service";
import {
  findNearbyEligibleCitizens,
  notifyForCommunityReview,
  resolveCommunityReview,
  resolveExpiredCommunityReviews,
} from "../services/community-review.service";

export const listReports = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const reports = await prisma.report.findMany({
      where: userId ? { userId } : undefined,
      orderBy: { createdAt: "desc" },
      include: {
        images: true,
        cleanup: true,
        verification: true,
      },
    });

    return res.json({ success: true, count: reports.length, data: reports });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
};

export const getReportById = async (
  req: AuthenticatedRequest,
  res: Response,
) => {
  try {
    const { id } = req.params;
    const report = await prisma.report.findFirst({
      where: { id: id as string, userId: req.user?.id },
      include: {
        images: true,
        cleanup: true,
        verification: true,
      },
    });

    if (!report) {
      return res
        .status(404)
        .json({ success: false, error: "Report not found" });
    }

    return res.json({ success: true, data: report });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
};

const WASTE_TYPE_TO_ENUM: Record<string, string> = {
  "Mixed Waste": "MIXED",
  "Plastic / Packaging": "PLASTIC",
  "Organic / Food Waste": "ORGANIC",
  "Hazardous / Chemical": "HAZARDOUS",
  "Construction Debris": "CONSTRUCTION",
  "Electronic Waste": "ELECTRONIC",
};

const SEVERITY_TO_SCORE: Record<string, number> = {
  Low: 25,
  Medium: 50,
  High: 75,
};

export const updateCitizenReport = async (
  req: AuthenticatedRequest,
  res: Response,
) => {
  const userId = req.user?.id;
  if (!userId) {
    return res.status(401).json({ success: false, error: "Unauthorized" });
  }

  const { id } = req.params;
  const {
    isRecurring,
    wasteType,
    severity,
    description,
    isLitterer,
    littererGender,
    littererApproxAge,
    littererClothingDescription,
  } = req.body as {
    isRecurring?: boolean;
    wasteType?: string;
    severity?: string;
    description?: string;
    isLitterer?: boolean;
    littererGender?: "MALE" | "FEMALE" | "OTHER" | "UNKNOWN" | null;
    littererApproxAge?: string | null;
    littererClothingDescription?: string | null;
  };

  if (isRecurring !== undefined && typeof isRecurring !== "boolean") {
    return res
      .status(400)
      .json({ success: false, error: "isRecurring must be a boolean" });
  }
  if (isLitterer !== undefined && typeof isLitterer !== "boolean") {
    return res
      .status(400)
      .json({ success: false, error: "isLitterer must be a boolean" });
  }
  if (wasteType !== undefined && !WASTE_TYPE_TO_ENUM[wasteType]) {
    return res
      .status(400)
      .json({ success: false, error: "Unsupported waste type" });
  }
  if (severity !== undefined && !SEVERITY_TO_SCORE[severity]) {
    return res
      .status(400)
      .json({ success: false, error: "Unsupported severity" });
  }
  if (description !== undefined && typeof description !== "string") {
    return res
      .status(400)
      .json({ success: false, error: "description must be text" });
  }
  if (
    littererGender !== undefined &&
    littererGender !== null &&
    !["MALE", "FEMALE", "OTHER", "UNKNOWN"].includes(littererGender)
  ) {
    return res
      .status(400)
      .json({ success: false, error: "Unsupported litterer gender" });
  }
  if (
    littererApproxAge !== undefined &&
    littererApproxAge !== null &&
    typeof littererApproxAge !== "string"
  ) {
    return res
      .status(400)
      .json({ success: false, error: "littererApproxAge must be text" });
  }
  if (
    littererClothingDescription !== undefined &&
    littererClothingDescription !== null &&
    typeof littererClothingDescription !== "string"
  ) {
    return res.status(400).json({
      success: false,
      error: "littererClothingDescription must be text",
    });
  }

  try {
    const report = await prisma.report.update({
      where: { id: id as string, userId },
      data: {
        ...(isRecurring !== undefined ? { isRecurring } : {}),
        ...(isLitterer !== undefined ? { isLittererReport: isLitterer } : {}),
        ...(wasteType !== undefined
          ? { wasteCategory: WASTE_TYPE_TO_ENUM[wasteType] as never }
          : {}),
        ...(severity !== undefined
          ? { severityScore: SEVERITY_TO_SCORE[severity] }
          : {}),
        ...(description !== undefined
          ? { description: description.trim() || null }
          : {}),
        ...(littererGender !== undefined
          ? { littererGender: littererGender as never }
          : {}),
        ...(littererApproxAge !== undefined
          ? { littererApproxAge: littererApproxAge?.trim() || null }
          : {}),
        ...(littererClothingDescription !== undefined
          ? {
              littererClothingDescription:
                littererClothingDescription?.trim() || null,
            }
          : {}),
      },
      include: { images: true },
    });

    return res.json({ success: true, data: report });
  } catch (error: unknown) {
    if ((error as { code?: string }).code === "P2025") {
      return res
        .status(404)
        .json({ success: false, error: "Report not found" });
    }
    console.error("updateCitizenReport error:", error);
    return res
      .status(500)
      .json({ success: false, error: "Failed to update report" });
  }
};

export const verifyResolvedReport = async (
  req: AuthenticatedRequest,
  res: Response,
) => {
  const userId = req.user?.id;
  if (!userId) {
    return res.status(401).json({ success: false, error: "Unauthorized" });
  }

  const { id } = req.params;
  const { result, comment, evidenceImageKeys } = req.body as {
    result?: "VERIFIED" | "DISPUTED";
    comment?: string;
    evidenceImageKeys?: string[];
  };
  if (result !== "VERIFIED" && result !== "DISPUTED") {
    return res
      .status(400)
      .json({ success: false, error: "result must be VERIFIED or DISPUTED" });
  }
  if (comment !== undefined && typeof comment !== "string") {
    return res
      .status(400)
      .json({ success: false, error: "comment must be text" });
  }
  if (
    evidenceImageKeys !== undefined &&
    (!Array.isArray(evidenceImageKeys) ||
      evidenceImageKeys.some((key) => typeof key !== "string" || !key.trim()))
  ) {
    return res.status(400).json({
      success: false,
      error: "evidenceImageKeys must be an array of image keys",
    });
  }
  if (result === "DISPUTED" && !comment?.trim() && !evidenceImageKeys?.length) {
    return res.status(400).json({
      success: false,
      error: "A comment or photo evidence is required to dispute cleanup",
    });
  }
  if (
    evidenceImageKeys?.some(
      (key) => !isDisputeEvidenceImageKey(id as string, key.trim()),
    )
  ) {
    return res.status(400).json({
      success: false,
      error: "One or more dispute evidence image keys are invalid",
    });
  }

  try {
    const report = await prisma.report.findFirst({
      where: { id: id as string, userId },
    });
    if (!report) {
      return res
        .status(404)
        .json({ success: false, error: "Report not found" });
    }
    if (report.status !== "RESOLVED") {
      return res.status(409).json({
        success: false,
        error: "Only authority-resolved reports can be verified",
      });
    }

    const { updated, evidenceImages } = await prisma.$transaction(
      async (tx) => {
        await tx.reportVerification.upsert({
          where: { reportId: report.id },
          create: {
            reportId: report.id,
            userId,
            result,
            comment: comment?.trim() || null,
          },
          update: { result, comment: comment?.trim() || null },
        });

        if (result === "VERIFIED") {
          const verifiedPoints = report.isLittererReport ? 50 : 10;
          // Write a ledger row first — the balance increment is inside the
          // same transaction so they always stay in sync.
          await tx.pointTransaction.create({
            data: {
              userId: report.userId,
              reportId: report.id,
              points: verifiedPoints,
              reason: report.isLittererReport
                ? "LITTERER_REPORT_VERIFIED"
                : "REPORT_VERIFIED",
            },
          });
          await tx.user.update({
            where: { id: report.userId },
            data: { points: { increment: verifiedPoints } },
          });
        }

        const reviewClosesAt = new Date(
          Date.now() + config.communityReviewWindowHours * 3_600_000,
        );
        const createdEvidence =
          result === "DISPUTED" && evidenceImageKeys?.length
            ? await Promise.all(
                evidenceImageKeys.map((storagePath) =>
                  tx.reportImage.create({
                    data: {
                      reportId: report.id,
                      uploadedBy: userId,
                      storagePath: storagePath.trim(),
                      type: "DISPUTE_EVIDENCE",
                    },
                  }),
                ),
              )
            : [];
        const nextReport = await tx.report.update({
          where: { id: report.id },
          data:
            result === "VERIFIED"
              ? { status: "VERIFIED" }
              : {
                  status: "DISPUTED",
                  communityReviewStatus: "PENDING",
                  communityReviewOpensAt: new Date(),
                  communityReviewClosesAt: reviewClosesAt,
                },
          include: {
            images: true,
            cleanup: { include: { beforeImage: true, afterImage: true } },
            verification: true,
          },
        });
        return { updated: nextReport, evidenceImages: createdEvidence };
      },
    );

    if (result === "VERIFIED") {
      await createNotification({
        userId: report.userId,
        reportId: report.id,
        type: "REPORT_VERIFIED",
        title: "Cleanup verified",
        message: "Thank you for confirming that the area is clean.",
      });
    } else {
      await prisma.notification.create({
        data: {
          audience: "AUTHORITY",
          type: "DISPUTE_OPENED",
          title: "Cleanup dispute opened",
          message: `Report ${report.id} has entered community review.`,
        },
      });
      await createNotification({
        userId: report.userId,
        reportId: report.id,
        type: "REPORT_DISPUTED",
        title: "Dispute submitted",
        message: "Your dispute has been sent to the authority for review.",
      });
      await notifyForCommunityReview(report.id);
      if (evidenceImages.length) {
        const authenticity = await loadReportImagesForAI(
          evidenceImages.map((image) => image.storagePath),
        )
          .then((images) => Promise.all(images.map(checkImageAuthenticity)))
          .catch(() => []);
        const flagged = authenticity.some(
          (assessment) => assessment.aiGeneratedConfidence >= 0.7,
        );
        await prisma.$transaction(async (tx) => {
          await Promise.all(
            evidenceImages.map((image, index) =>
              tx.reportImage.update({
                where: { id: image.id },
                data: {
                  isSuspectedAIGenerated:
                    authenticity[index]?.isLikelyAIGenerated ?? false,
                  aiGeneratedConfidence:
                    authenticity[index]?.aiGeneratedConfidence ?? 0,
                  authenticityCheckedAt: new Date(),
                },
              }),
            ),
          );
          if (flagged) {
            await tx.report.update({
              where: { id: report.id },
              data: {
                flaggedForManualReview: true,
                flagReason: "Dispute evidence may be AI-generated",
              },
            });
            await tx.notification.create({
              data: {
                audience: "AUTHORITY",
                type: "IMAGE_FLAGGED_FOR_REVIEW",
                title: "Dispute evidence flagged",
                message: `Report ${report.id} requires manual image review.`,
              },
            });
          }
        });
      }
    }

    return res.json({ success: true, data: updated });
  } catch (error) {
    console.error("verifyResolvedReport error:", error);
    return res
      .status(500)
      .json({ success: false, error: "Failed to save verification" });
  }
};

export const submitCommunityVote = async (
  req: AuthenticatedRequest,
  res: Response,
) => {
  const voterId = req.user?.id;
  const { id } = req.params;
  const { vote } = req.body as { vote?: "CLEAN" | "NOT_CLEAN" };
  if (!voterId) {
    return res.status(401).json({ success: false, error: "Unauthorized" });
  }
  if (vote !== "CLEAN" && vote !== "NOT_CLEAN") {
    return res.status(400).json({
      success: false,
      error: "vote must be CLEAN or NOT_CLEAN",
    });
  }

  try {
    const report = await prisma.report.findUnique({
      where: { id: id as string },
      include: { cleanup: { select: { workerId: true } } },
    });
    if (
      !report ||
      report.communityReviewStatus !== "PENDING" ||
      !report.communityReviewClosesAt ||
      report.communityReviewClosesAt <= new Date()
    ) {
      return res.status(409).json({
        success: false,
        error: "This community review is not open",
      });
    }

    const eligible = await findNearbyEligibleCitizens(
      report.latitude,
      report.longitude,
      [report.userId, report.cleanup?.workerId].filter(
        (value): value is string => Boolean(value),
      ),
    );
    if (!eligible.some((citizen) => citizen.id === voterId)) {
      return res.status(403).json({
        success: false,
        error: "You are not eligible to review this cleanup",
      });
    }

    await prisma.communityVote.create({
      data: {
        reportId: report.id,
        voterId,
        vote,
        distanceMeters:
          eligible.find((citizen) => citizen.id === voterId)?.distanceMeters ??
          0,
      },
    });
    const resolution = await resolveCommunityReview(report.id);
    return res.status(201).json({
      success: true,
      data: { vote, resolution },
    });
  } catch (error: unknown) {
    if ((error as { code?: string }).code === "P2002") {
      return res.status(409).json({
        success: false,
        error: "You have already voted on this cleanup",
      });
    }
    console.error("submitCommunityVote error:", error);
    return res
      .status(500)
      .json({ success: false, error: "Could not save vote" });
  }
};

export const getCommunityReviewReport = async (
  req: AuthenticatedRequest,
  res: Response,
) => {
  const voterId = req.user?.id;
  const { id } = req.params;
  if (!voterId) {
    return res.status(401).json({ success: false, error: "Unauthorized" });
  }

  try {
    const report = await prisma.report.findUnique({
      where: { id: id as string },
      include: {
        images: true,
        cleanup: {
          include: { beforeImage: true, afterImage: true, noWasteImage: true },
        },
        communityVotes: { select: { vote: true } },
      },
    });
    if (
      !report ||
      report.communityReviewStatus !== "PENDING" ||
      !report.communityReviewClosesAt ||
      report.communityReviewClosesAt <= new Date()
    ) {
      return res.status(404).json({
        success: false,
        error: "Community review not found or no longer open",
      });
    }
    const excludedUserIds = [report.userId, report.cleanup?.workerId].filter(
      (value): value is string => Boolean(value),
    );
    const eligible = await findNearbyEligibleCitizens(
      report.latitude,
      report.longitude,
      excludedUserIds,
    );
    if (!eligible.some((citizen) => citizen.id === voterId)) {
      return res.status(403).json({
        success: false,
        error: "You are not eligible to review this cleanup",
      });
    }
    return res.json({
      success: true,
      data: {
        ...report,
        communityVotes: undefined,
        voteCount: report.communityVotes.length,
        hasVoted: await prisma.communityVote
          .findUnique({
            where: { reportId_voterId: { reportId: report.id, voterId } },
            select: { id: true },
          })
          .then(Boolean),
      },
    });
  } catch (error) {
    console.error("getCommunityReviewReport error:", error);
    return res.status(500).json({
      success: false,
      error: "Could not load community review",
    });
  }
};

export const resolveExpiredCommunityReviewsEndpoint = async (
  _req: AuthenticatedRequest,
  res: Response,
) => {
  try {
    return res.json({
      success: true,
      data: await resolveExpiredCommunityReviews(),
    });
  } catch (error) {
    console.error("resolveExpiredCommunityReviews error:", error);
    return res.status(500).json({
      success: false,
      error: "Could not resolve expired community reviews",
    });
  }
};

export const createReport = async (
  req: AuthenticatedRequest,
  res: Response,
) => {
  try {
    // const report = await prisma.report.create({
    // })
  } catch (error: any) {}
};

const DUPLICATE_RADIUS_METERS = 50;
const DUPLICATE_WINDOW_DAYS = 14;

interface NearbyReport {
  id: string;
  status: string;
  description: string | null;
  dumpType: string | null;
  wasteCategory: string | null;
  wasteVolume: string | null;
  attention: string;
  latitude: number;
  longitude: number;
  createdAt: Date;
  distanceMeters: number;
  upvoteCount: number;
}

export const checkNearbyReport = async (
  req: AuthenticatedRequest,
  res: Response,
) => {
  try {
    const { latitude, longitude } = req.body;

    // ---------------------------------------------
    // Validate location
    // ---------------------------------------------

    if (typeof latitude !== "number" || typeof longitude !== "number") {
      return res.status(400).json({
        success: false,
        error: "latitude and longitude are required",
      });
    }

    if (latitude < -90 || latitude > 90) {
      return res.status(400).json({
        success: false,
        error: "Invalid latitude",
      });
    }

    if (longitude < -180 || longitude > 180) {
      return res.status(400).json({
        success: false,
        error: "Invalid longitude",
      });
    }

    // ---------------------------------------------
    // Find reports within 50 meters
    // (computed on-the-fly from latitude/longitude columns —
    // the "location" column is a plain text address field,
    // not a PostGIS geography column, so it's never used here)
    // ---------------------------------------------

    const reports = await prisma.$queryRaw<NearbyReport[]>`
      SELECT
        id,
        status,
        description,
        "dumpType",
        "wasteCategory",
        "wasteVolume",
        attention,
        latitude,
        longitude,
        "createdAt",
        "upvoteCount",

        ST_Distance(
          ST_SetSRID(
            ST_MakePoint(longitude, latitude),
            4326
          )::geography,
          ST_SetSRID(
            ST_MakePoint(${longitude}, ${latitude}),
            4326
          )::geography
        ) AS "distanceMeters"

      FROM "reports"

      WHERE ST_DWithin(
        ST_SetSRID(
          ST_MakePoint(longitude, latitude),
          4326
        )::geography,
        ST_SetSRID(
          ST_MakePoint(${longitude}, ${latitude}),
          4326
        )::geography,
        ${DUPLICATE_RADIUS_METERS}
      )

      AND status NOT IN (
        'RESOLVED',
        'VERIFIED',
        'CANCELLED'
      )

      AND "createdAt" > NOW() - INTERVAL '14 days'

      ORDER BY "distanceMeters" ASC

      LIMIT 5;
    `;

    // ---------------------------------------------
    // Nothing nearby
    // ---------------------------------------------

    if (reports.length === 0) {
      return res.status(200).json({
        success: true,
        isNearbyReport: false,
        hasNearbyReport: false,
        message: "No active report found nearby.",
        location: {
          latitude,
          longitude,
        },
        radiusMeters: DUPLICATE_RADIUS_METERS,
        reports: [],
      });
    }

    // ---------------------------------------------
    // Closest report
    // ---------------------------------------------

    const closestReport = reports[0];

    return res.status(200).json({
      success: true,

      isNearbyReport: true,
      hasNearbyReport: true,

      location: {
        latitude,
        longitude,
      },

      radiusMeters: DUPLICATE_RADIUS_METERS,

      closestReport: {
        id: closestReport?.id,

        distanceMeters: Math.round(closestReport?.distanceMeters || 0),

        status: closestReport?.status,

        description: closestReport?.description,

        dumpType: closestReport?.dumpType,

        wasteCategory: closestReport?.wasteCategory,

        wasteVolume: closestReport?.wasteVolume,

        attention: closestReport?.attention,

        upvoteCount: closestReport?.upvoteCount,

        createdAt: closestReport?.createdAt,
      },

      // Useful if you want to display
      // multiple nearby reports on a map/list.
      reports: reports.map((report) => ({
        id: report?.id,
        distanceMeters: Math.round(report?.distanceMeters),
        status: report?.status,
        description: report?.description,
        dumpType: report?.dumpType,
        wasteCategory: report?.wasteCategory,
        wasteVolume: report?.wasteVolume,
        attention: report?.attention,
        upvoteCount: report?.upvoteCount,
        createdAt: report?.createdAt,
      })),
      message: "An active report already exists near this location.",
    });
  } catch (error) {
    console.error("checkNearbyReport error:", error);

    return res.status(500).json({
      success: false,
      error: "Failed to check nearby reports",
    });
  }
};

export const upvoteReport = async (
  req: AuthenticatedRequest,
  res: Response,
) => {
  const userId = req.user?.id;
  if (!userId) {
    return res.status(401).json({ success: false, error: "Unauthorized" });
  }

  const { id } = req.params;
  try {
    const report = await prisma.report.findUnique({
      where: { id: id as string },
      select: { id: true },
    });
    if (!report) {
      return res
        .status(404)
        .json({ success: false, error: "Report not found" });
    }

    const existing = await prisma.reportUpvote.findUnique({
      where: {
        reportId_userId: { reportId: id as string, userId },
      },
    });

    let upvoted = false;
    const result = await prisma.$transaction(async (tx) => {
      if (existing) {
        await tx.reportUpvote.delete({
          where: { id: existing.id },
        });
        return tx.report.update({
          where: { id: id as string },
          data: { upvoteCount: { decrement: 1 } },
          select: { id: true, upvoteCount: true },
        });
      } else {
        await tx.reportUpvote.create({
          data: { reportId: id as string, userId },
        });
        upvoted = true;
        return tx.report.update({
          where: { id: id as string },
          data: { upvoteCount: { increment: 1 } },
          select: { id: true, upvoteCount: true },
        });
      }
    });

    return res.json({
      success: true,
      upvoted,
      upvoteCount: Math.max(0, result.upvoteCount),
    });
  } catch (error) {
    console.error("upvoteReport error:", error);
    return res
      .status(500)
      .json({ success: false, error: "Failed to update upvote" });
  }
};
