import { Router } from "express";
import { requireAuth } from "../middlewares/auth.middleware";
import { requireRole } from "../middlewares/role.middleware";
import {
  listReports,
  getReportById,
  createReport,
  checkNearbyReport,
  updateCitizenReport,
  verifyResolvedReport,
  submitCommunityVote,
  getCommunityReviewReport,
  resolveExpiredCommunityReviewsEndpoint,
  upvoteReport,
} from "../controllers/report.controller";

const reportRouter = Router();

reportRouter.get("/", requireAuth, listReports);
reportRouter.post(
  "/community-reviews/resolve-expired",
  requireAuth,
  requireRole("AUTHORITY"),
  resolveExpiredCommunityReviewsEndpoint,
);
reportRouter.get("/:id", requireAuth, getReportById);
reportRouter.patch("/:id", requireAuth, updateCitizenReport);
reportRouter.post("/:id/upvote", requireAuth, upvoteReport);
reportRouter.post("/:id/verification", requireAuth, verifyResolvedReport);
reportRouter.get(
  "/:id/community-review",
  requireAuth,
  getCommunityReviewReport,
);
reportRouter.post("/:id/community-vote", requireAuth, submitCommunityVote);
reportRouter.post("/create-report", requireAuth, createReport);
reportRouter.post("/nearby-reports", requireAuth, checkNearbyReport);

export { reportRouter };
