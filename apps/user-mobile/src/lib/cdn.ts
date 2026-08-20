import { config } from "@/config/env";

/** Turns a persisted S3 object key into its CloudFront URL. */
export function getCdnUrl(storagePath?: string | null) {
  if (!storagePath) return undefined;
  if (/^https?:\/\//i.test(storagePath) || storagePath.startsWith("file:")) {
    return storagePath;
  }
  const domain = config.cloudfrontDomain
    .replace(/^https?:\/\//, "")
    .replace(/\/$/, "");
  return domain
    ? `https://${domain}/${storagePath.replace(/^\//, "")}`
    : undefined;
}

/** Turns a profile image S3 object key or filename into its CloudFront profile URL. */
export function getCdnProfileUrl(storagePath?: string | null) {
  if (!storagePath) return undefined;
  if (/^https?:\/\//i.test(storagePath) || storagePath.startsWith("file:")) {
    return storagePath;
  }
  const domain = (config.cloudfrontProfileDomain || config.cloudfrontDomain)
    .replace(/^https?:\/\//, "")
    .replace(/\/$/, "");
  return domain
    ? `https://${domain}/${storagePath.replace(/^\//, "")}`
    : undefined;
}
