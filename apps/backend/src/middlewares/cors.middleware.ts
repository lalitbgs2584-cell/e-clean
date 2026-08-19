import cors from "cors";

/**
 * CORS middleware configured for:
 * - Mobile devices on LAN (192.168.1.1 through 192.168.1.5 or any 192.168.1.*)
 * - Expo Go (exp://) and standalone app schemes (eclean://)
 * - Local development (localhost, 127.0.0.1)
 */
export const corsMiddleware = cors({
  origin: (origin, callback) => {
    // Mobile apps, native requests, Postman/curl don't send an Origin header
    if (!origin) {
      return callback(null, true);
    }

    // In development, allow all LAN IPs (192.168.1.x), localhost, and app schemes
    const allowedPatterns = [
      /^http:\/\/localhost(:\d+)?$/,
      /^http:\/\/127\.0\.0\.1(:\d+)?$/,
      /^http:\/\/192\.168\.1\.\d+(:\d+)?$/,
      /^exp:\/\//,
      /^eclean:\/\//,
    ];

    const isAllowed = allowedPatterns.some((pattern) => pattern.test(origin));
    if (isAllowed || process.env.NODE_ENV === "development") {
      return callback(null, true);
    }

    return callback(new Error(`CORS blocked for origin: ${origin}`));
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "Cookie", "x-requested-with"],
  exposedHeaders: ["Set-Cookie"],
});
