import { Router } from "express";
import { requireAuth } from "../middlewares/auth.middleware";
import { requireRole } from "../middlewares/role.middleware";
import {
  getWorkerMe,
  getWorkerStats,
  getWorkerCleanups,
  getWorkerHistory,
  getWorkerCleanupById,
  startWorkerCleanup,
  presignWorkerImage,
  completeWorkerCleanup,
} from "../controllers/worker.controller";

const workerRouter = Router();

// All worker routes require authentication AND the WORKER role.
// requireAuth is applied per-route (not globally) to keep it explicit.

workerRouter.get("/me", requireAuth, requireRole("WORKER"), getWorkerMe);
workerRouter.get("/stats", requireAuth, requireRole("WORKER"), getWorkerStats);

// NOTE: /cleanups/history MUST be declared before /cleanups/:id to avoid
// "history" being treated as the :id parameter.
workerRouter.get(
  "/cleanups/history",
  requireAuth,
  requireRole("WORKER"),
  getWorkerHistory
);
workerRouter.get(
  "/cleanups",
  requireAuth,
  requireRole("WORKER"),
  getWorkerCleanups
);
workerRouter.get(
  "/cleanups/:id",
  requireAuth,
  requireRole("WORKER"),
  getWorkerCleanupById
);
workerRouter.patch(
  "/cleanups/:id/start",
  requireAuth,
  requireRole("WORKER"),
  startWorkerCleanup
);
workerRouter.post(
  "/cleanups/:id/images/presign",
  requireAuth,
  requireRole("WORKER"),
  presignWorkerImage
);
workerRouter.patch(
  "/cleanups/:id/complete",
  requireAuth,
  requireRole("WORKER"),
  completeWorkerCleanup
);

export { workerRouter };
