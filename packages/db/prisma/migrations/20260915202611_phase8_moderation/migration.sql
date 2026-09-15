-- AlterTable
ALTER TABLE "reports" ADD COLUMN     "resolution" TEXT,
ADD COLUMN     "reviewed_by_id" TEXT;

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "suspended_reason" TEXT,
ADD COLUMN     "suspended_until" TIMESTAMP(3);

-- AddForeignKey
ALTER TABLE "reports" ADD CONSTRAINT "reports_reviewed_by_id_fkey" FOREIGN KEY ("reviewed_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
