import { Router } from "express";
import { requireAuth } from "../middlewares/auth.middleware";
import { listReports, getReportById, createReport, checkNearbyReport } from "../controllers/report.controller";

const reportRouter = Router();

reportRouter.get("/", requireAuth, listReports);
reportRouter.get("/:id", requireAuth, getReportById);
reportRouter.post("/create-report", requireAuth, createReport);
reportRouter.post("/nearby-reports", requireAuth, checkNearbyReport);

export { reportRouter };
