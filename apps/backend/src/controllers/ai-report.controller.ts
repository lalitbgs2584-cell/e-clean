import type { Response } from "express";
import { prisma } from "db/client";
import type { AuthenticatedRequest } from "../middlewares/auth.middleware";
import { enqueueAIClassification } from "../queues/ai-classification.queues";
import { processAIClassificationJob } from "../workers/ai.workers";

interface GenerateReportBody {
  originalImage?: string | null;
  supportImage?: string | null;
  location?: string;
  latitude: number;
  longitude: number;
  duplicateResolution?: string;
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

async function findNearbyReport(
  latitude: number,
  longitude: number
): Promise<NearbyReportRow | null> {
  const rows = await prisma.$queryRaw<NearbyReportRow[]>`
    SELECT
      id,
      status,
      "dumpType",
      "wasteCategory",
      "createdAt",
      ST_Distance(
        ST_SetSRID(
          ST_MakePoint(longitude, latitude),
          4326
        )::geography,
        ST_SetSRID(
          ST_MakePoint(${longitude}, ${latitude}),
          4326
        )::geography
      ) AS distance_m
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
    ORDER BY distance_m ASC
    LIMIT 1;
  `;

  return rows[0] ?? null;
}

export const generateAIBasedReport = async (
  req: AuthenticatedRequest,
  res: Response
) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: "Unauthorized",
      });
    }

    const {
      originalImage,
      supportImage,
      location,
      latitude,
      longitude,
      duplicateResolution,
    }: GenerateReportBody = req.body;

    if (!originalImage) {
      return res.status(400).json({
        success: false,
        error: "originalImage is required",
      });
    }

    if (
      typeof latitude !== "number" ||
      typeof longitude !== "number"
    ) {
      return res.status(400).json({
        success: false,
        error: "latitude and longitude are required",
      });
    }

    // --------------------------------------------------
    // 1. CHECK DUPLICATE IF NOT FORCED NEW ISSUE
    // --------------------------------------------------
    if (duplicateResolution === "same_issue") {
      const nearbyReport = await findNearbyReport(latitude, longitude);
      if (nearbyReport) {
        const updatedReport = await prisma.report.update({
          where: { id: nearbyReport.id },
          data: {
            upvoteCount: {
              increment: 1,
            },
          },
        });

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

    // --------------------------------------------------
    // 2. CREATE NEW REPORT RECORD
    // --------------------------------------------------
    const newReport = await prisma.report.create({
      data: {
        userId,
        location: location || null,
        description: null,
        latitude,
        longitude,
        status: "PENDING",
      },
    });

    console.log(`\n======================================================`);
    console.log(`📝 [AI Report Created] ID: ${newReport.id}`);
    console.log(`📍 Location: ${location || "N/A"} (${latitude}, ${longitude})`);
    console.log(`👤 User: ${userId}`);
    console.log(`⏳ Initial Status: ${newReport.status}`);
    console.log(`======================================================\n`);

    // --------------------------------------------------
    // 3. PUSH JOB TO REDIS QUEUE
    // --------------------------------------------------
    const jobPayload = {
      reportId: newReport.id,
      originalImage,
      supportImage,
      location: location || null,
      latitude,
      longitude,
    };

    try {
      const queueRes = await enqueueAIClassification(jobPayload);
      console.log(`📥 [Queue] Pushed Job ID: ${queueRes.jobId} -> ${queueRes.queue}`);
    } catch (queueErr) {
      console.warn("⚠️ [Queue Push Warning]:", queueErr);
    }

    // --------------------------------------------------
    // 4. PROCESS AI CLASSIFICATION DIRECTLY VIA WORKER
    // --------------------------------------------------
    const workerResult = await processAIClassificationJob(jobPayload);

    console.log(`\n======================================================`);
    console.log(`🤖 [AI Classification Result] for Report ${newReport.id}`);
    console.log(`🏷️  Category: ${workerResult.uiCategory} (${workerResult.assessment.wasteCategory})`);
    console.log(`⚠️  Severity: ${workerResult.uiSeverity} (Score: ${workerResult.assessment.severityScore}/100)`);
    console.log(`🚚 Truck: ${workerResult.assessment.truckSize} | 👷 Workers: ${workerResult.assessment.workersNeeded}`);
    console.log(`🎯 Action: ${workerResult.assessment.recommendedAction}`);
    console.log(`🚨 Attention: ${workerResult.assessment.attention}`);
    console.log(`📄 Description: "${workerResult.assessment.description}"`);
    console.log(`======================================================\n`);

    // --------------------------------------------------
    // 5. RETURN SUCCESSFUL AI ASSESSMENT
    // --------------------------------------------------
    return res.status(201).json({
      success: true,
      isDuplicate: false,
      reportId: newReport.id,
      status: "AI_ASSESSED",
      assessment: {
        wasteType: workerResult.uiCategory,
        severity: workerResult.uiSeverity,
        description: workerResult.assessment.description,
        confidence: workerResult.assessment.aiConfidence,
        dumpType: workerResult.assessment.dumpType,
        wasteCategory: workerResult.assessment.wasteCategory,
        wasteVolume: workerResult.assessment.wasteVolume,
        truckSize: workerResult.assessment.truckSize,
        workersNeeded: workerResult.assessment.workersNeeded,
        recommendedAction: workerResult.assessment.recommendedAction,
        attention: workerResult.assessment.attention,
      },
      message: "Report created and classified by AI successfully.",
    });
  } catch (error: any) {
    console.error("generateAIBasedReport error:", error);

    return res.status(500).json({
      success: false,
      error: error.message || "Failed to process AI report",
    });
  }
};