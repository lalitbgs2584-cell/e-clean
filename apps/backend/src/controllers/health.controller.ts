import type { Request, Response } from "express";

export class HealthController {
  public static getHealth(req: Request, res: Response) {
    return res.json({
      status: "ok",
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
    });
  }

  public static getRoot(req: Request, res: Response) {
    return res.json({
      name: "e-clean Backend API",
      status: "online",
      version: "1.0.0",
      endpoints: {
        auth: "/api/auth",
        health: "/api/health",
        users: "/api/users",
        reports: "/api/reports",
        upload: "/api/upload",
      },
    });
  }
}
