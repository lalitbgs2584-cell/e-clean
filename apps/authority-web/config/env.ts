const fallbackAuthUrl = "http://localhost:3000";

/** Server-only environment used by the authority portal. */
export const env = {
  betterAuthUrl: process.env.BETTER_AUTH_URL ?? fallbackAuthUrl,
  betterAuthSecret: process.env.BETTER_AUTH_SECRET ?? "",
  databaseUrl: process.env.DATABASE_URL ?? "",
  s3Bucket: process.env.S3_BUCKET ?? "",
  s3Region: process.env.S3_REGION ?? "ap-south-1",
  s3AccessKeyId: process.env.S3_ACCESS_KEY_ID ?? "",
  s3SecretAccessKey: process.env.S3_SECRET_ACCESS_KEY ?? "",
  cloudfrontDomain: process.env.NEXT_PUBLIC_CLOUDFRONT_DOMAIN ?? "",
  mapStyleUrl: process.env.NEXT_PUBLIC_MAP_STYLE_URL ?? "",
  mapDefaultLat: Number(process.env.NEXT_PUBLIC_MAP_DEFAULT_LAT ?? "20.2961"),
  mapDefaultLng: Number(process.env.NEXT_PUBLIC_MAP_DEFAULT_LNG ?? "85.8245"),
};
