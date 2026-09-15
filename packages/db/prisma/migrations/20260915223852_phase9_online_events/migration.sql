-- AlterTable
ALTER TABLE "events" ADD COLUMN     "is_online" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "join_url" TEXT;
