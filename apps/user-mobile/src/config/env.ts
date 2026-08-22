const apiUrl = process.env.EXPO_PUBLIC_API_URL ?? "http://10.191.92.130:7000";

/**
 * Values exposed to the Expo app must use the EXPO_PUBLIC_ prefix.
 *
 * ONE CloudFront distribution serves the whole bucket, with the three
 * folders kept as path prefixes: reports/, cleanups/ and profiles/.
 * Example: https://<domain>/reports/<reportId>/original.jpg
 */
export const config = {
  apiUrl,
  // Compatibility aliases while callers are moved to apiUrl.
  expoPublicBaseURL: apiUrl,
  backendURL: apiUrl,
  cloudfrontDomain: process.env.EXPO_PUBLIC_CLOUDFRONT_DOMAIN ?? "",
  s3Bucket: process.env.EXPO_PUBLIC_S3_BUCKET ?? "",
  s3Region: process.env.EXPO_PUBLIC_S3_REGION ?? "ap-south-1",
};
