const defaultAuthUrl = "http://localhost:7000";

/** Shared Better Auth settings. Each server app must provide the same secret. */
export const env = {
  betterAuthUrl: process.env.BETTER_AUTH_URL ?? defaultAuthUrl,
  betterAuthSecret: process.env.BETTER_AUTH_SECRET,
  nodeEnv: process.env.NODE_ENV ?? "development",
};
