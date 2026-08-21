import { config } from "@/config/env";

/**
 * ONE CloudFront distribution (config.cloudfrontDomain) serves the whole
 * bucket. Stored keys already include their folder prefix (reports/,
 * cleanups/, profiles/), so the URL is simply domain + key. Keys stay in the
 * DB; URLs are never persisted.
 */
function toCdnUrl(storagePath?: string | null): string | undefined {
  if (!storagePath) return undefined;
  if (/^https?:\/\//i.test(storagePath) || storagePath.startsWith("file:")) {
    return storagePath;
  }
  let domain = config.cloudfrontDomain
    .replace(/^https?:\/\//, "")
    .replace(/\/+$/, "");
  
  if (!domain && config.s3Bucket) {
    domain = `${config.s3Bucket}.s3.${config.s3Region}.amazonaws.com`;
  }

  return domain
    ? `https://${domain}/${storagePath.replace(/^\/+/, "")}`
    : undefined;
}

/** Turns a persisted S3 object key into its CloudFront URL. */
export const getCdnUrl = toCdnUrl;

/**
 * Turns a profile image S3 object key into its CloudFront URL. Same single
 * distribution as report/cleanup media — profiles are served from the
 * profiles/ prefix.
 */
export const getCdnProfileUrl = toCdnUrl;
