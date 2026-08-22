import { Router } from "express";
import { requireAuth } from "../middlewares/auth.middleware";
import { createRateLimiter } from "../middlewares/rate-limit.middleware";
import { generateAIBasedReport } from "../controllers/ai-report.controller";

const aiReportRouter = Router();

// Max 6 AI report generations per minute per citizen
const reportRateLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  maxRequests: 6,
  message: "Too many report assessments submitted. Please wait a minute before submitting again.",
});

aiReportRouter.post("/", requireAuth, reportRateLimiter, generateAIBasedReport);

export { aiReportRouter };
