-- CreateEnum
CREATE TYPE "Role" AS ENUM ('CITIZEN', 'WORKER', 'AUTHORITY', 'RECYCLING_PARTNER');

-- CreateEnum
CREATE TYPE "ReportStatus" AS ENUM ('PENDING', 'AI_ASSESSED', 'ASSIGNED', 'IN_PROGRESS', 'CLEANUP_COMPLETED', 'RESOLVED', 'VERIFIED', 'DISPUTED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "AttentionLevel" AS ENUM ('NORMAL', 'URGENT');

-- CreateEnum
CREATE TYPE "DumpType" AS ENUM ('OVERFLOWING_BIN', 'OPEN_DUMP', 'ROAD_SIDE_DUMP', 'DRAIN_DUMP', 'VACANT_LAND', 'CONSTRUCTION_DUMP', 'ILLEGAL_DUMPING', 'OTHER');

-- CreateEnum
CREATE TYPE "WasteCategory" AS ENUM ('HOUSEHOLD', 'PLASTIC', 'ORGANIC', 'CONSTRUCTION', 'ELECTRONIC', 'MEDICAL', 'HAZARDOUS', 'MIXED', 'OTHER');

-- CreateEnum
CREATE TYPE "WasteVolume" AS ENUM ('SMALL', 'MEDIUM', 'LARGE', 'VERY_LARGE');

-- CreateEnum
CREATE TYPE "TruckSize" AS ENUM ('SMALL', 'MEDIUM', 'LARGE');

-- CreateEnum
CREATE TYPE "InterventionType" AS ENUM ('MANUAL_CLEANUP', 'WORKER_TRUCK_DISPATCH', 'RECYCLING_PARTNER', 'ESCALATION');

-- CreateEnum
CREATE TYPE "MediaType" AS ENUM ('PHOTO', 'VIDEO');

-- CreateEnum
CREATE TYPE "ReportImageType" AS ENUM ('REPORT', 'BEFORE_CLEANUP', 'AFTER_CLEANUP', 'COLLECTION_PROOF');

-- CreateEnum
CREATE TYPE "CleanupStatus" AS ENUM ('ASSIGNED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "VerificationResult" AS ENUM ('VERIFIED', 'DISPUTED');

-- CreateEnum
CREATE TYPE "RecyclingStatus" AS ENUM ('ROUTED', 'COLLECTED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('REPORT_ASSIGNED', 'REPORT_IN_PROGRESS', 'REPORT_CLEANUP_COMPLETED', 'REPORT_RESOLVED', 'REPORT_VERIFIED', 'REPORT_DISPUTED');

-- CreateTable
CREATE TABLE "user" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "emailVerified" BOOLEAN NOT NULL DEFAULT false,
    "image" TEXT,
    "phone" TEXT,
    "role" "Role" NOT NULL DEFAULT 'CITIZEN',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "zone" TEXT,
    "recyclingPartnerId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "session" (
    "id" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "token" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "userId" TEXT NOT NULL,

    CONSTRAINT "session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "account" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "accessToken" TEXT,
    "refreshToken" TEXT,
    "idToken" TEXT,
    "accessTokenExpiresAt" TIMESTAMP(3),
    "refreshTokenExpiresAt" TIMESTAMP(3),
    "scope" TEXT,
    "password" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "account_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "verification" (
    "id" TEXT NOT NULL,
    "identifier" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "verification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reports" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "description" TEXT,
    "latitude" DOUBLE PRECISION NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,
    "location" TEXT,
    "zone" TEXT,
    "dumpType" "DumpType",
    "wasteCategory" "WasteCategory",
    "wasteVolume" "WasteVolume",
    "truckSize" "TruckSize",
    "workersNeeded" INTEGER,
    "recommendedAction" "InterventionType",
    "attention" "AttentionLevel" NOT NULL DEFAULT 'NORMAL',
    "nearSensitiveLocation" BOOLEAN NOT NULL DEFAULT false,
    "severityScore" DOUBLE PRECISION,
    "aiConfidence" DOUBLE PRECISION,
    "aiProcessedAt" TIMESTAMP(3),
    "duplicateOfId" TEXT,
    "upvoteCount" INTEGER NOT NULL DEFAULT 0,
    "recyclingPartnerId" TEXT,
    "recyclingStatus" "RecyclingStatus",
    "routedToRecyclingAt" TIMESTAMP(3),
    "recyclingCollectedAt" TIMESTAMP(3),
    "status" "ReportStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "resolvedAt" TIMESTAMP(3),

    CONSTRAINT "reports_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "report_upvotes" (
    "id" TEXT NOT NULL,
    "reportId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "report_upvotes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "report_images" (
    "id" TEXT NOT NULL,
    "reportId" TEXT NOT NULL,
    "uploadedBy" TEXT NOT NULL,
    "storagePath" TEXT NOT NULL,
    "mediaType" "MediaType" NOT NULL DEFAULT 'PHOTO',
    "type" "ReportImageType" NOT NULL DEFAULT 'REPORT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "report_images_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "recycling_partners" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "contactPhone" TEXT,
    "contactEmail" TEXT,
    "city" TEXT,
    "area" TEXT,
    "acceptedCategories" "WasteCategory"[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "recycling_partners_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cleanups" (
    "id" TEXT NOT NULL,
    "reportId" TEXT NOT NULL,
    "workerId" TEXT NOT NULL,
    "assignedBy" TEXT NOT NULL,
    "status" "CleanupStatus" NOT NULL DEFAULT 'ASSIGNED',
    "beforeImageId" TEXT,
    "afterImageId" TEXT,
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "cleanups_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "report_verifications" (
    "id" TEXT NOT NULL,
    "reportId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "result" "VerificationResult" NOT NULL,
    "comment" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "report_verifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "reportId" TEXT NOT NULL,
    "type" "NotificationType" NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "user_email_key" ON "user"("email");

-- CreateIndex
CREATE INDEX "user_role_idx" ON "user"("role");

-- CreateIndex
CREATE INDEX "user_zone_idx" ON "user"("zone");

-- CreateIndex
CREATE INDEX "user_recyclingPartnerId_idx" ON "user"("recyclingPartnerId");

-- CreateIndex
CREATE UNIQUE INDEX "session_token_key" ON "session"("token");

-- CreateIndex
CREATE INDEX "session_userId_idx" ON "session"("userId");

-- CreateIndex
CREATE INDEX "account_userId_idx" ON "account"("userId");

-- CreateIndex
CREATE INDEX "verification_identifier_idx" ON "verification"("identifier");

-- CreateIndex
CREATE INDEX "reports_userId_idx" ON "reports"("userId");

-- CreateIndex
CREATE INDEX "reports_status_idx" ON "reports"("status");

-- CreateIndex
CREATE INDEX "reports_status_createdAt_idx" ON "reports"("status", "createdAt");

-- CreateIndex
CREATE INDEX "reports_dumpType_idx" ON "reports"("dumpType");

-- CreateIndex
CREATE INDEX "reports_wasteCategory_idx" ON "reports"("wasteCategory");

-- CreateIndex
CREATE INDEX "reports_attention_idx" ON "reports"("attention");

-- CreateIndex
CREATE INDEX "reports_zone_idx" ON "reports"("zone");

-- CreateIndex
CREATE INDEX "reports_recyclingPartnerId_idx" ON "reports"("recyclingPartnerId");

-- CreateIndex
CREATE INDEX "reports_createdAt_idx" ON "reports"("createdAt");

-- CreateIndex
CREATE INDEX "report_upvotes_reportId_idx" ON "report_upvotes"("reportId");

-- CreateIndex
CREATE UNIQUE INDEX "report_upvotes_reportId_userId_key" ON "report_upvotes"("reportId", "userId");

-- CreateIndex
CREATE INDEX "report_images_reportId_idx" ON "report_images"("reportId");

-- CreateIndex
CREATE INDEX "report_images_uploadedBy_idx" ON "report_images"("uploadedBy");

-- CreateIndex
CREATE INDEX "report_images_type_idx" ON "report_images"("type");

-- CreateIndex
CREATE INDEX "recycling_partners_city_area_idx" ON "recycling_partners"("city", "area");

-- CreateIndex
CREATE UNIQUE INDEX "cleanups_reportId_key" ON "cleanups"("reportId");

-- CreateIndex
CREATE UNIQUE INDEX "cleanups_beforeImageId_key" ON "cleanups"("beforeImageId");

-- CreateIndex
CREATE UNIQUE INDEX "cleanups_afterImageId_key" ON "cleanups"("afterImageId");

-- CreateIndex
CREATE INDEX "cleanups_workerId_idx" ON "cleanups"("workerId");

-- CreateIndex
CREATE INDEX "cleanups_assignedBy_idx" ON "cleanups"("assignedBy");

-- CreateIndex
CREATE INDEX "cleanups_status_idx" ON "cleanups"("status");

-- CreateIndex
CREATE UNIQUE INDEX "report_verifications_reportId_key" ON "report_verifications"("reportId");

-- CreateIndex
CREATE INDEX "report_verifications_userId_idx" ON "report_verifications"("userId");

-- CreateIndex
CREATE INDEX "notifications_userId_isRead_idx" ON "notifications"("userId", "isRead");

-- CreateIndex
CREATE INDEX "notifications_reportId_idx" ON "notifications"("reportId");

-- AddForeignKey
ALTER TABLE "user" ADD CONSTRAINT "user_recyclingPartnerId_fkey" FOREIGN KEY ("recyclingPartnerId") REFERENCES "recycling_partners"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "session" ADD CONSTRAINT "session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "account" ADD CONSTRAINT "account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reports" ADD CONSTRAINT "reports_duplicateOfId_fkey" FOREIGN KEY ("duplicateOfId") REFERENCES "reports"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reports" ADD CONSTRAINT "reports_recyclingPartnerId_fkey" FOREIGN KEY ("recyclingPartnerId") REFERENCES "recycling_partners"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reports" ADD CONSTRAINT "reports_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "report_upvotes" ADD CONSTRAINT "report_upvotes_reportId_fkey" FOREIGN KEY ("reportId") REFERENCES "reports"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "report_upvotes" ADD CONSTRAINT "report_upvotes_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "report_images" ADD CONSTRAINT "report_images_reportId_fkey" FOREIGN KEY ("reportId") REFERENCES "reports"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "report_images" ADD CONSTRAINT "report_images_uploadedBy_fkey" FOREIGN KEY ("uploadedBy") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cleanups" ADD CONSTRAINT "cleanups_reportId_fkey" FOREIGN KEY ("reportId") REFERENCES "reports"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cleanups" ADD CONSTRAINT "cleanups_workerId_fkey" FOREIGN KEY ("workerId") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cleanups" ADD CONSTRAINT "cleanups_assignedBy_fkey" FOREIGN KEY ("assignedBy") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cleanups" ADD CONSTRAINT "cleanups_beforeImageId_fkey" FOREIGN KEY ("beforeImageId") REFERENCES "report_images"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cleanups" ADD CONSTRAINT "cleanups_afterImageId_fkey" FOREIGN KEY ("afterImageId") REFERENCES "report_images"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "report_verifications" ADD CONSTRAINT "report_verifications_reportId_fkey" FOREIGN KEY ("reportId") REFERENCES "reports"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "report_verifications" ADD CONSTRAINT "report_verifications_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_reportId_fkey" FOREIGN KEY ("reportId") REFERENCES "reports"("id") ON DELETE CASCADE ON UPDATE CASCADE;
