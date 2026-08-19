import { prisma } from "db/client";
import {
  assessWasteImages,
  fallbackAssessment,
  CATEGORY_LABELS,
  severityFromScore,
  type WasteAssessment,
} from "../services/ai.service";
import type { AIClassificationJob } from "../queues/ai-classification.queues";
import { redis } from "../lib/redis";

export async function processAIClassificationJob(
  job: AIClassificationJob
): Promise<{
  assessment: WasteAssessment;
  uiCategory: string;
  uiSeverity: "Low" | "Medium" | "High";
}> {
  console.log(`[AI Worker] Processing job for report ${job.reportId}...`);

  const images: { base64: string; mimeType: string }[] = [];
  if (job.originalImage) {
    images.push({ base64: job.originalImage, mimeType: "image/jpeg" });
  }
  if (job.supportImage) {
    images.push({ base64: job.supportImage, mimeType: "image/jpeg" });
  }

  // Assess images using AI or fallback
  let assessment: WasteAssessment | null = null;
  if (images.length > 0) {
    assessment = await assessWasteImages(images, job.location);
  }

  if (!assessment) {
    console.log(`[AI Worker] Using fallback assessment for report ${job.reportId}`);
    assessment = fallbackAssessment(null, job.location);
  }

  // Update Report record in DB
  await prisma.report.update({
    where: { id: job.reportId },
    data: {
      status: "AI_ASSESSED",
      dumpType: assessment.dumpType,
      wasteCategory: assessment.wasteCategory,
      wasteVolume: assessment.wasteVolume,
      truckSize: assessment.truckSize,
      workersNeeded: assessment.workersNeeded,
      recommendedAction: assessment.recommendedAction,
      attention: assessment.attention,
      severityScore: assessment.severityScore,
      aiConfidence: assessment.aiConfidence,
      description: assessment.description,
    },
  });

  const uiCategory = CATEGORY_LABELS[assessment.wasteCategory] || "Mixed Waste";
  const uiSeverity = severityFromScore(assessment.severityScore);

  console.log(
    `[AI Worker] Successfully classified report ${job.reportId}: ${uiCategory}, ${uiSeverity} severity.`
  );

  return {
    assessment,
    uiCategory,
    uiSeverity,
  };
}

const AI_QUEUE = "queue:ai-classification";

export async function startAIWorker() {
  console.log(`[AI Worker] Worker listening on ${AI_QUEUE}...`);
  while (true) {
    try {
      if (!redis.isOpen) {
        await new Promise((res) => setTimeout(res, 2000));
        continue;
      }
      const item = await redis.brPop(AI_QUEUE, 0);
      if (item?.element) {
        const payload = JSON.parse(item.element);
        if (payload?.data) {
          await processAIClassificationJob(payload.data);
        }
      }
    } catch (err) {
      console.error("[AI Worker Error]:", err);
      await new Promise((res) => setTimeout(res, 3000));
    }
  }
}
