-- AlterTable
ALTER TABLE "user" ADD COLUMN     "profileImageAssignedAt" TIMESTAMP(3),
ADD COLUMN     "profileImageUploadedById" TEXT;

-- AddForeignKey
ALTER TABLE "user" ADD CONSTRAINT "user_profileImageUploadedById_fkey" FOREIGN KEY ("profileImageUploadedById") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;
