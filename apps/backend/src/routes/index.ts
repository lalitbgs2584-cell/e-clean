import { Router } from "express";
import { healthRouter } from "./health.routes";
import { userRouter } from "./user.routes";
import { reportRouter } from "./report.routes";
import { uploadRouter } from "./upload.routes";
import { aiReportRouter } from "./ai-report.routes";
const apiRouter = Router();

// NOTE: /api/auth is NOT mounted here — Better Auth is mounted directly in
// app.ts before express.json() so its body streaming works correctly.
apiRouter.use("/health", healthRouter);
apiRouter.use("/users", userRouter);
apiRouter.use("/reports", reportRouter);
apiRouter.use("/upload", uploadRouter);
apiRouter.use("/ai-reports", aiReportRouter);


export { apiRouter };
