const fallbackAuthUrl = "http://localhost:3000";

/** Server-only environment used by the authority portal. */
export const env = {
  betterAuthUrl: process.env.BETTER_AUTH_URL ?? fallbackAuthUrl,
  betterAuthSecret: process.env.BETTER_AUTH_SECRET ?? "",
  databaseUrl: process.env.DATABASE_URL ?? "",
};
