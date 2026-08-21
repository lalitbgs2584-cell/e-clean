import { Router } from "express";
import { requireAuth } from "../middlewares/auth.middleware";
import {
  listReports,
  getReportById,
  createReport,
  checkNearbyReport,
  updateCitizenReport,
  verifyResolvedReport,
} from "../controllers/report.controller";

const reportRouter = Router();

reportRouter.get("/", requireAuth, listReports);
reportRouter.get("/:id", requireAuth, getReportById);
reportRouter.patch("/:id", requireAuth, updateCitizenReport);
reportRouter.post("/:id/verification", requireAuth, verifyResolvedReport);
reportRouter.post("/create-report", requireAuth, createReport);
reportRouter.post("/nearby-reports", requireAuth, checkNearbyReport);

export { reportRouter };
