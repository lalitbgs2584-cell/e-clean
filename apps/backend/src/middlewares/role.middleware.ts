import type { Response, NextFunction } from "express";
import type { AuthenticatedRequest } from "./auth.middleware";

/**
 * Authorization middleware factory.
 *
 * Usage:
 *   router.get("/worker/cleanups", requireAuth, requireRole("WORKER"), handler);
 *
 * Must be placed AFTER requireAuth (which populates req.user).
 * Returns 401 if req.user is missing, 403 if the role doesn't match.
 */
export function requireRole(...roles: string[]) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: "Unauthorized: authentication required",
      });
    }

    const userRole: string = (req.user as { role?: string }).role ?? "";

    if (!roles.includes(userRole)) {
      return res.status(403).json({
        success: false,
        error: `Forbidden: requires role ${roles.join(" or ")}`,
      });
    }

    return next();
  };
}
