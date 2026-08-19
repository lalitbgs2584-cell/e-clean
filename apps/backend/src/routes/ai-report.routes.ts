import { Router } from "express";
import { requireAuth } from "../middlewares/auth.middleware";
import { generateAIBasedReport } from "../controllers/ai-report.controller";

const aiReportRouter = Router();

aiReportRouter.post("/", requireAuth , generateAIBasedReport);

export { aiReportRouter };
