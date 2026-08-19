import express from "express";
import { corsMiddleware } from "./middlewares/cors.middleware";
import { errorHandler } from "./middlewares/error.middleware";
import { apiRouter } from "./routes";
import { betterAuthHandler } from "./routes/auth.routes";
import { HealthController } from "./controllers/health.controller";

export function createApp() {
  const app = express();

  // 1. Global CORS (for Expo, mobile apps, LAN IPs, localhost)
  app.use(corsMiddleware);

  // 2. Health & Root Info Endpoints
  app.get("/", HealthController.getRoot);
  app.get("/health", HealthController.getHealth);

  // 3. Better Auth — MUST be mounted before express.json() (per Better Auth
  //    docs, otherwise the auth client API gets stuck on "pending").
  app.all("/api/auth/*splat", betterAuthHandler);

  // 4. Body Parsing Middleware (applied AFTER the Better Auth handler,
  //    only for the app's own routes below)
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));

  // 5. API Routes (/api/health, /api/users, /api/reports, /api/upload)
  app.use("/api", apiRouter);

  // 6. Global Error Handler
  app.use(errorHandler);

  return app;
}
