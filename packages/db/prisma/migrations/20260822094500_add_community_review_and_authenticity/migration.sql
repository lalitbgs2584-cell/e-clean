CREATE TYPE "CommunityReviewStatus" AS ENUM ('PENDING', 'CONFIRMED_DIRTY', 'CONFIRMED_CLEAN', 'INCONCLUSIVE');
CREATE TYPE "CommunityVoteChoice" AS ENUM ('CLEAN', 'NOT_CLEAN');
CREATE TYPE "NotificationAudience" AS ENUM ('CITIZEN', 'WORKER', 'AUTHORITY');

ALTER TYPE "ReportImageType" ADD VALUE IF NOT EXISTS 'DISPUTE_EVIDENCE';
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'COMMUNITY_VERIFICATION_REQUEST';
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'DISPUTE_CONFIRMED_DIRTY';
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'DISPUTE_REJECTED_BY_COMMUNITY';
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'CLEANUP_DISPUTE_UPHELD';
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'IMAGE_FLAGGED_FOR_REVIEW';
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'NEW_REPORT_NEEDS_ASSIGNMENT';
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'DISPUTE_OPENED';
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'WORKER_AUTO_BLOCKED';

ALTER TABLE "user" ADD COLUMN "workerStrikeCount" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "reports"
  ADD COLUMN "communityReviewStatus" "CommunityReviewStatus",
  ADD COLUMN "communityReviewOpensAt" TIMESTAMP(3),
  ADD COLUMN "communityReviewClosesAt" TIMESTAMP(3),
  ADD COLUMN "flaggedForManualReview" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "flagReason" TEXT;
ALTER TABLE "report_images"
  ADD COLUMN "isSuspectedAIGenerated" BOOLEAN,
  ADD COLUMN "aiGeneratedConfidence" DOUBLE PRECISION,
  ADD COLUMN "authenticityCheckedAt" TIMESTAMP(3);
ALTER TABLE "notifications" ALTER COLUMN "userId" DROP NOT NULL;
ALTER TABLE "notifications" ADD COLUMN "audience" "NotificationAudience" NOT NULL DEFAULT 'CITIZEN';

CREATE TABLE "community_votes" (
  "id" TEXT NOT NULL,
  "reportId" TEXT NOT NULL,
  "voterId" TEXT NOT NULL,
  "vote" "CommunityVoteChoice" NOT NULL,
  "distanceMeters" DOUBLE PRECISION NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "community_votes_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "community_votes_reportId_voterId_key" ON "community_votes"("reportId", "voterId");
CREATE INDEX "community_votes_voterId_idx" ON "community_votes"("voterId");
CREATE INDEX "reports_communityReviewStatus_communityReviewClosesAt_idx" ON "reports"("communityReviewStatus", "communityReviewClosesAt");
CREATE INDEX "notifications_audience_isRead_idx" ON "notifications"("audience", "isRead");
ALTER TABLE "community_votes" ADD CONSTRAINT "community_votes_reportId_fkey" FOREIGN KEY ("reportId") REFERENCES "reports"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "community_votes" ADD CONSTRAINT "community_votes_voterId_fkey" FOREIGN KEY ("voterId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;
