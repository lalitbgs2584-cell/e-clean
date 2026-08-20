import "dotenv/config";

export const config = {
  port: parseInt(process.env.PORT || "7000", 10),
  host: process.env.HOST || "0.0.0.0",
  nodeEnv: process.env.NODE_ENV || "development",
  betterAuthSecret: process.env.BETTER_AUTH_SECRET || "",
  betterAuthUrl: process.env.BETTER_AUTH_URL || "http://localhost:7000",
  directUrl: process.env.DATABASE_URL || "",
  s3Bucket: process.env.S3_BUCKET || "",
  s3Region: process.env.S3_REGION || "ap-south-1",
  s3AccessKeyId: process.env.S3_ACCESS_KEY_ID || "",
  s3SecretAccessKey: process.env.S3_SECRET_ACCESS_KEY || "",
  s3PublicUrl: process.env.S3_PUBLIC_URL || "",
  cloudfrontDomain: process.env.CLOUDFRONT_DOMAIN || "",
  cloudfrontProfileDomain: process.env.CLOUDFRONT_PROFILE_DOMAIN || "",
  redisUrl: process.env.REDIS_URL || "redis://localhost:6379",
  openaiApiKey: process.env.OPENAI_API_KEY || "",
};
