const apiUrl = process.env.EXPO_PUBLIC_API_URL ?? "http://192.168.1.4:7000";

/** Values exposed to the Expo app must use the EXPO_PUBLIC_ prefix. */
export const config = {
  apiUrl,
  // Compatibility aliases while callers are moved to apiUrl.
  expoPublicBaseURL: apiUrl,
  backendURL: apiUrl,
  cloudfrontDomain: process.env.EXPO_PUBLIC_CLOUDFRONT_DOMAIN ?? "",
};
