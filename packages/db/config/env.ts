/** Database configuration shared by all server-side workspace packages. */
export const env = {
  databaseUrl: process.env.DATABASE_URL,
  nodeEnv: process.env.NODE_ENV ?? "development",
};
