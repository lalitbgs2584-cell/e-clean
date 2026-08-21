ALTER TABLE "user"
  ADD COLUMN "workerLatitude" DOUBLE PRECISION,
  ADD COLUMN "workerLongitude" DOUBLE PRECISION,
  ADD COLUMN "workerLastSeenAt" TIMESTAMP(3);

CREATE INDEX "user_workerLatitude_workerLongitude_idx"
  ON "user"("workerLatitude", "workerLongitude");

CREATE TABLE "point_transactions" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "points" INTEGER NOT NULL,
  "reason" TEXT NOT NULL,
  "reportId" TEXT,
  "imageId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "point_transactions_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "point_transactions_userId_imageId_key" ON "point_transactions"("userId", "imageId");
CREATE INDEX "point_transactions_userId_createdAt_idx" ON "point_transactions"("userId", "createdAt");
ALTER TABLE "point_transactions" ADD CONSTRAINT "point_transactions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "point_transactions" ADD CONSTRAINT "point_transactions_reportId_fkey" FOREIGN KEY ("reportId") REFERENCES "reports"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "weekly_awards" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "weekStart" TIMESTAMP(3) NOT NULL,
  "weekEnd" TIMESTAMP(3) NOT NULL,
  "points" INTEGER NOT NULL,
  "awardType" TEXT NOT NULL DEFAULT 'PERSON_OF_THE_WEEK',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "weekly_awards_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "weekly_awards_weekStart_awardType_key" ON "weekly_awards"("weekStart", "awardType");
CREATE INDEX "weekly_awards_userId_idx" ON "weekly_awards"("userId");
ALTER TABLE "weekly_awards" ADD CONSTRAINT "weekly_awards_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;
