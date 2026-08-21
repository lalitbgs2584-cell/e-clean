ALTER TYPE "ReportStatus" ADD VALUE IF NOT EXISTS 'CLOSED_NO_WASTE';
ALTER TYPE "CleanupStatus" ADD VALUE IF NOT EXISTS 'NO_WASTE_FOUND';
ALTER TYPE "ReportImageType" ADD VALUE IF NOT EXISTS 'NO_WASTE_PROOF';
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'ACCOUNT_BLOCKED';
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'ACCOUNT_UNBLOCKED';
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'REPORT_NO_WASTE_FOUND';

CREATE TYPE "LittererGender" AS ENUM ('MALE', 'FEMALE', 'OTHER', 'UNKNOWN');

ALTER TABLE "user"
  ADD COLUMN "wrongReportsCount" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "blockedAt" TIMESTAMP(3),
  ADD COLUMN "blockedReason" TEXT;

ALTER TABLE "reports"
  ADD COLUMN "littererGender" "LittererGender",
  ADD COLUMN "littererApproxAge" TEXT,
  ADD COLUMN "littererClothingDescription" TEXT;

ALTER TABLE "cleanups"
  ADD COLUMN "noWasteImageId" TEXT,
  ADD COLUMN "noWasteFoundAt" TIMESTAMP(3),
  ADD COLUMN "noWasteFoundNotes" TEXT;

ALTER TABLE "cleanups"
  ADD CONSTRAINT "cleanups_noWasteImageId_key" UNIQUE ("noWasteImageId");

ALTER TABLE "cleanups"
  ADD CONSTRAINT "cleanups_noWasteImageId_fkey"
  FOREIGN KEY ("noWasteImageId") REFERENCES "report_images"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "notifications"
  ALTER COLUMN "reportId" DROP NOT NULL;
