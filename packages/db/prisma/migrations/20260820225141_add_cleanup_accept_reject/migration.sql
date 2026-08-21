-- AlterTable
ALTER TABLE "reports" ADD COLUMN     "isLittererReport" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "user" ADD COLUMN     "points" INTEGER NOT NULL DEFAULT 0;
