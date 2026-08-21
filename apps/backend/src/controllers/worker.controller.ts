import type { Response } from "express";
import type { AuthenticatedRequest } from "../middlewares/auth.middleware";
import { prisma } from "db/client";
import { config } from "../config/env";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import s3Client from "../services/s3.service";
import { profileImageUrl } from "../services/profile-images.service";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const isUuid = (v: unknown): v is string =>
  typeof v === "string" &&
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    v
  );

/** Derive a stable S3 key for worker cleanup evidence. */
const workerImageKey = (
  cleanupId: string,
  slot: "before" | "after"
): string => `cleanups/${cleanupId}/${slot}.jpg`;

// ---------------------------------------------------------------------------
// GET /api/worker/me
// ---------------------------------------------------------------------------
export const getWorkerMe = async (
  req: AuthenticatedRequest,
  res: Response
) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.id },
      select: {
        id: true,
        name: true,
        email: true,
        image: true,
        role: true,
        zone: true,
        isActive: true,
        profileImageUploadedById: true,
        profileImageAssignedAt: true,
        profileImageUploadedBy: {
          select: { id: true, name: true },
        },
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
        // Official avatar is assigned by an authority — the worker only reads
        // it, so the URL is derived from the stored key via the Profile CDN.
        profileImageUrl: profileImageUrl(user.image),
      },
    });
  } catch (err) {
    console.error("[worker/me]", err);
    return res.status(500).json({ success: false, error: "Server error" });
  }
};

// ---------------------------------------------------------------------------
// GET /api/worker/stats
// ---------------------------------------------------------------------------
export const getWorkerStats = async (
  req: AuthenticatedRequest,
  res: Response
) => {
  try {
    const workerId = req.user!.id;

    const [assigned, inProgress, completed, cancelled, verifiedCount, disputedCount] =
      await Promise.all([
        prisma.cleanup.count({ where: { workerId, status: "ASSIGNED" } }),
        prisma.cleanup.count({ where: { workerId, status: "IN_PROGRESS" } }),
        prisma.cleanup.count({ where: { workerId, status: "COMPLETED" } }),
        prisma.cleanup.count({ where: { workerId, status: "CANCELLED" } }),
        // Verified = cleanup's parent report has a VERIFIED verification result
        prisma.cleanup.count({
          where: {
            workerId,
            report: {
              verification: { result: "VERIFIED" },
            },
          },
        }),
        prisma.cleanup.count({
          where: {
            workerId,
            report: {
              verification: { result: "DISPUTED" },
            },
          },
        }),
      ]);

    return res.json({
      success: true,
      data: {
        assigned,
        inProgress,
        completed,
        cancelled,
        verified: verifiedCount,
        disputed: disputedCount,
      },
    });
  } catch (err) {
    console.error("[worker/stats]", err);
    return res.status(500).json({ success: false, error: "Server error" });
  }
};

// ---------------------------------------------------------------------------
// GET /api/worker/cleanups
// Supports optional ?status=ASSIGNED|IN_PROGRESS|COMPLETED|CANCELLED
// ---------------------------------------------------------------------------
export const getWorkerCleanups = async (
  req: AuthenticatedRequest,
  res: Response
) => {
  try {
    const workerId = req.user!.id;
    const { status } = req.query as { status?: string };

    const allowedStatuses = ["ASSIGNED", "IN_PROGRESS", "COMPLETED", "CANCELLED"];
    const statusFilter =
      status && allowedStatuses.includes(status.toUpperCase())
        ? (status.toUpperCase() as "ASSIGNED" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED")
        : undefined;

    const cleanups = await prisma.cleanup.findMany({
      where: {
        workerId,
        ...(statusFilter ? { status: statusFilter } : {}),
      },
      orderBy: [{ assignedAt: "desc" }],
      include: {
        report: {
          include: {
            images: {
              where: { type: "REPORT" },
              take: 1,
            },
          },
        },
        assignedByRef: {
          select: { id: true, name: true },
        },
        beforeImage: true,
        afterImage: true,
      },
    });

    return res.json({ success: true, count: cleanups.length, data: cleanups });
  } catch (err) {
    console.error("[worker/cleanups]", err);
    return res.status(500).json({ success: false, error: "Server error" });
  }
};

// ---------------------------------------------------------------------------
// GET /api/worker/cleanups/history
// Supports ?status= and ?timeFilter=week|month
// ---------------------------------------------------------------------------
export const getWorkerHistory = async (
  req: AuthenticatedRequest,
  res: Response
) => {
  try {
    const workerId = req.user!.id;
    const { status, timeFilter } = req.query as {
      status?: string;
      timeFilter?: string;
    };

    // Determine date lower bound
    let dateFrom: Date | undefined;
    const now = new Date();
    if (timeFilter === "week") {
      dateFrom = new Date(now);
      dateFrom.setDate(dateFrom.getDate() - 7);
    } else if (timeFilter === "month") {
      dateFrom = new Date(now);
      dateFrom.setMonth(dateFrom.getMonth() - 1);
    }

    const allowedStatuses = ["COMPLETED", "CANCELLED"];
    const statusFilter =
      status && allowedStatuses.includes(status.toUpperCase())
        ? (status.toUpperCase() as "COMPLETED" | "CANCELLED")
        : undefined;

    const cleanups = await prisma.cleanup.findMany({
      where: {
        workerId,
        status: statusFilter ?? { in: ["COMPLETED", "CANCELLED"] },
        ...(dateFrom ? { completedAt: { gte: dateFrom } } : {}),
      },
      orderBy: { completedAt: "desc" },
      include: {
        report: {
          include: {
            images: { where: { type: "REPORT" }, take: 1 },
            verification: true,
          },
        },
        beforeImage: true,
        afterImage: true,
      },
    });

    // Post-process: add a computed `verificationResult` field for the UI
    const data = cleanups.map((c) => ({
      ...c,
      verificationResult: (c.report as any).verification?.result ?? null,
    }));

    return res.json({ success: true, count: data.length, data });
  } catch (err) {
    console.error("[worker/history]", err);
    return res.status(500).json({ success: false, error: "Server error" });
  }
};

// ---------------------------------------------------------------------------
// GET /api/worker/cleanups/:id
// ---------------------------------------------------------------------------
export const getWorkerCleanupById = async (
  req: AuthenticatedRequest,
  res: Response
) => {
  try {
    const id = req.params.id as string;
    const workerId = req.user!.id;
    if (!id) {
      return res
        .status(400)
        .json({ success: false, error: "Cleanup ID is required" });
    }

    const cleanup = await prisma.cleanup.findFirst({
      where: { id, workerId },
      include: {
        report: {
          include: {
            images: true,
          },
        },
        assignedByRef: { select: { id: true, name: true } },
        beforeImage: true,
        afterImage: true,
      },
    });

    if (!cleanup) {
      return res
        .status(404)
        .json({ success: false, error: "Cleanup not found or not authorized" });
    }

    return res.json({ success: true, data: cleanup });
  } catch (err) {
    console.error("[worker/cleanups/:id]", err);
    return res.status(500).json({ success: false, error: "Server error" });
  }
};

// ---------------------------------------------------------------------------
// PATCH /api/worker/cleanups/:id/accept
// Transition: ASSIGNED → ACCEPTED. Starting work remains a separate action.
// ---------------------------------------------------------------------------
export const acceptWorkerCleanup = async (
  req: AuthenticatedRequest,
  res: Response
) => {
  try {
    const id = req.params.id as string;
    const workerId = req.user!.id;
    const cleanup = await prisma.cleanup.findFirst({ where: { id, workerId } });

    if (!cleanup) {
      return res.status(404).json({ success: false, error: "Cleanup not found or not authorized" });
    }
    if (cleanup.status !== "ASSIGNED") {
      return res.status(409).json({
        success: false,
        error: `Only assigned cleanups can be accepted. Current status: ${cleanup.status}`,
      });
    }

    const updated = await prisma.cleanup.update({
      where: { id },
      data: { status: "ACCEPTED", acceptedAt: new Date(), rejectedAt: null, rejectionReason: null },
      include: { report: true, assignedByRef: { select: { id: true, name: true } } },
    });
    return res.json({ success: true, data: updated });
  } catch (err) {
    console.error("[worker/cleanups/:id/accept]", err);
    return res.status(500).json({ success: false, error: "Server error" });
  }
};

// ---------------------------------------------------------------------------
// PATCH /api/worker/cleanups/:id/reject body: { reason }
// ---------------------------------------------------------------------------
export const rejectWorkerCleanup = async (
  req: AuthenticatedRequest,
  res: Response
) => {
  try {
    const id = req.params.id as string;
    const workerId = req.user!.id;
    const reason = typeof req.body?.reason === "string" ? req.body.reason.trim() : "";
    if (!reason) {
      return res.status(400).json({ success: false, error: "A rejection reason is required" });
    }

    const cleanup = await prisma.cleanup.findFirst({ where: { id, workerId } });
    if (!cleanup) {
      return res.status(404).json({ success: false, error: "Cleanup not found or not authorized" });
    }
    if (cleanup.status !== "ASSIGNED") {
      return res.status(409).json({ success: false, error: "Only pending assignments can be rejected" });
    }

    const updated = await prisma.$transaction(async (tx) => {
      const rejected = await tx.cleanup.update({
        where: { id },
        data: { status: "REJECTED", rejectedAt: new Date(), rejectionReason: reason },
        include: { report: true, assignedByRef: { select: { id: true, name: true } } },
      });
      await tx.report.update({ where: { id: cleanup.reportId }, data: { status: "AI_ASSESSED" } });
      return rejected;
    });
    return res.json({ success: true, data: updated });
  } catch (err) {
    console.error("[worker/cleanups/:id/reject]", err);
    return res.status(500).json({ success: false, error: "Server error" });
  }
};

// ---------------------------------------------------------------------------
// PATCH /api/worker/cleanups/:id/start
// Transition: ACCEPTED → IN_PROGRESS
// ---------------------------------------------------------------------------
export const startWorkerCleanup = async (
  req: AuthenticatedRequest,
  res: Response
) => {
  try {
    const id = req.params.id as string;
    const workerId = req.user!.id;
    if (!id) {
      return res
        .status(400)
        .json({ success: false, error: "Cleanup ID is required" });
    }

    const cleanup = await prisma.cleanup.findFirst({
      where: { id, workerId },
    });

    if (!cleanup) {
      return res
        .status(404)
        .json({ success: false, error: "Cleanup not found or not authorized" });
    }

    if (cleanup.status === "CANCELLED") {
      return res
        .status(409)
        .json({ success: false, error: "Cancelled cleanup cannot be started" });
    }

    if (cleanup.status !== "ACCEPTED") {
      return res.status(409).json({
        success: false,
        error: `Cannot start a cleanup with status ${cleanup.status}`,
      });
    }

    const [updated] = await prisma.$transaction([
      prisma.cleanup.update({
        where: { id },
        data: { status: "IN_PROGRESS", startedAt: new Date() },
        include: { report: true },
      }),
      prisma.report.update({
        where: { id: cleanup.reportId },
        data: { status: "IN_PROGRESS" },
      }),
    ]);

    return res.json({ success: true, data: updated });
  } catch (err) {
    console.error("[worker/cleanups/:id/start]", err);
    return res.status(500).json({ success: false, error: "Server error" });
  }
};

// ---------------------------------------------------------------------------
// POST /api/worker/cleanups/:id/images/presign
// body: { slot: "before" | "after", mime: "image/jpeg" }
// ---------------------------------------------------------------------------
export const presignWorkerImage = async (
  req: AuthenticatedRequest,
  res: Response
) => {
  try {
    const id = req.params.id as string;
    const workerId = req.user!.id;
    if (!id) {
      return res
        .status(400)
        .json({ success: false, error: "Cleanup ID is required" });
    }

    const { slot, mime } = req.body as {
      slot?: "before" | "after";
      mime?: string;
    };

    if (!slot || !["before", "after"].includes(slot)) {
      return res
        .status(400)
        .json({ success: false, error: "slot must be 'before' or 'after'" });
    }

    if (mime !== "image/jpeg") {
      return res
        .status(400)
        .json({ success: false, error: "Only image/jpeg is supported" });
    }

    // Verify ownership
    const cleanup = await prisma.cleanup.findFirst({ where: { id, workerId } });
    if (!cleanup) {
      return res
        .status(404)
        .json({ success: false, error: "Cleanup not found or not authorized" });
    }

    if (!["ACCEPTED", "IN_PROGRESS"].includes(cleanup.status)) {
      return res
        .status(409)
        .json({ success: false, error: "Accept and start the cleanup before uploading evidence" });
    }

    const key = workerImageKey(id, slot);

    const command = new PutObjectCommand({
      Bucket: config.s3Bucket,
      Key: key,
      ContentType: mime,
    });

    const url = await getSignedUrl(s3Client, command, { expiresIn: 60 * 15 });

    return res.json({ success: true, url, key });
  } catch (err) {
    console.error("[worker/cleanups/:id/images/presign]", err);
    return res.status(500).json({ success: false, error: "Server error" });
  }
};

// ---------------------------------------------------------------------------
// PATCH /api/worker/cleanups/:id/complete
// body: { beforeImageKey: string, afterImageKey: string, notes?: string }
// ---------------------------------------------------------------------------
export const completeWorkerCleanup = async (
  req: AuthenticatedRequest,
  res: Response
) => {
  try {
    const id = req.params.id as string;
    const workerId = req.user!.id;
    if (!id) {
      return res
        .status(400)
        .json({ success: false, error: "Cleanup ID is required" });
    }

    const {
      beforeImageKey,
      afterImageKey,
      notes: _notes,
    } = req.body as {
      beforeImageKey?: string;
      afterImageKey?: string;
      notes?: string;
    };

    if (!beforeImageKey || !afterImageKey) {
      return res.status(422).json({
        success: false,
        error: "beforeImageKey and afterImageKey are required",
      });
    }
    if (
      beforeImageKey !== workerImageKey(id, "before") ||
      afterImageKey !== workerImageKey(id, "after")
    ) {
      return res.status(400).json({ success: false, error: "Cleanup evidence keys are invalid" });
    }

    // Verify ownership and current status
    const cleanup = await prisma.cleanup.findFirst({
      where: { id, workerId },
    });

    if (!cleanup) {
      return res
        .status(404)
        .json({ success: false, error: "Cleanup not found or not authorized" });
    }

    if (cleanup.status !== "IN_PROGRESS") {
      return res.status(409).json({
        success: false,
        error: `Cleanup must be IN_PROGRESS to complete. Current status: ${cleanup.status}`,
      });
    }

    // Atomic transaction
    const [beforeImage, afterImage, updatedCleanup] = await prisma.$transaction(
      async (tx) => {
        // 1. Create BEFORE_CLEANUP ReportImage
        const before = await tx.reportImage.create({
          data: {
            reportId: cleanup.reportId,
            uploadedBy: workerId,
            storagePath: beforeImageKey,
            type: "BEFORE_CLEANUP",
          },
        });

        // 2. Create AFTER_CLEANUP ReportImage
        const after = await tx.reportImage.create({
          data: {
            reportId: cleanup.reportId,
            uploadedBy: workerId,
            storagePath: afterImageKey,
            type: "AFTER_CLEANUP",
          },
        });

        // 3. Update Cleanup
        const updated = await tx.cleanup.update({
          where: { id },
          data: {
            status: "COMPLETED",
            completedAt: new Date(),
            completionNotes: _notes?.trim() || null,
            beforeImageId: before.id,
            afterImageId: after.id,
          },
          include: {
            beforeImage: true,
            afterImage: true,
            report: true,
          },
        });

        // 4. Update parent Report status
        await tx.report.update({
          where: { id: cleanup.reportId },
          data: { status: "CLEANUP_COMPLETED" },
        });

        return [before, after, updated];
      }
    );

    return res.json({
      success: true,
      data: {
        cleanup: updatedCleanup,
        beforeImage,
        afterImage,
      },
    });
  } catch (err) {
    console.error("[worker/cleanups/:id/complete]", err);
    return res.status(500).json({ success: false, error: "Server error" });
  }
};
