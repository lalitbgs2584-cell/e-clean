// services/queueService.ts

import { v4 as uuidv4 } from "uuid";
import { redis } from "../lib/redis";

export interface AIClassificationJob {
  reportId: string;
  imagePaths: string[];
  location?: string | null;
  latitude: number;
  longitude: number;
}

const AI_QUEUE = "queue:ai-classification";

export async function enqueueAIClassification(job: AIClassificationJob) {
  const jobId = uuidv4();

  const payload = {
    id: jobId,
    type: "AI_CLASSIFICATION",
    createdAt: new Date().toISOString(),
    data: job,
  };

  await redis.lPush(AI_QUEUE, JSON.stringify(payload));

  return {
    jobId,
    queue: AI_QUEUE,
  };
}
