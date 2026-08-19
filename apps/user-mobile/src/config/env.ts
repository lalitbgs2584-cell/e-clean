
export const config = {
    expoPublicBaseURL: process.env.EXPO_PUBLIC_API_URL || "http://[IP_ADDRESS]:8081",
    backendURL: process.env.EXPO_PUBLIC_BACKEND_BASE_URL || process.env.EXPO_PUBLIC_API_URL || "http://[IP_ADDRESS]:7000",
    cloudfrontDomain: process.env.CLOUDFRONT_DOMAIN || "",
}
    