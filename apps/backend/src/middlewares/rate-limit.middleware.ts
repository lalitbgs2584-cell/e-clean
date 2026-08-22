import type { Response, NextFunction } from "express";
import type { AuthenticatedRequest } from "./auth.middleware";

interface RateLimitOptions {
  windowMs: number;
  maxRequests: number;
  message?: string;
}

export function createRateLimiter(options: RateLimitOptions) {
  const {
    windowMs,
    maxRequests,
    message = "Too many requests, please try again later.",
  } = options;
  const requests = new Map<string, number[]>();

  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    const key = req.user?.id || req.ip || "anonymous";
    const now = Date.now();
    const timestamps = requests.get(key) ?? [];

    // Filter timestamps within the sliding window
    const validTimestamps = timestamps.filter((t) => now - t < windowMs);

    if (validTimestamps.length >= maxRequests) {
      const oldest = validTimestamps[0] ?? now;
      const retryAfterSeconds = Math.ceil((windowMs - (now - oldest)) / 1000);
      res.setHeader("Retry-After", retryAfterSeconds);
      return res.status(429).json({
        success: false,
        error: message,
        retryAfter: retryAfterSeconds,
      });
    }

    validTimestamps.push(now);
    requests.set(key, validTimestamps);

    // Periodically clean up idle keys to prevent memory leaks
    if (requests.size > 2000) {
      for (const [k, ts] of requests.entries()) {
        if (ts.every((t) => now - t >= windowMs)) {
          requests.delete(k);
        }
      }
    }

    next();
  };
}
