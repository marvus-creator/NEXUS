-- CreateEnum
CREATE TYPE "WalletKind" AS ENUM ('USER', 'TREASURY');

-- AlterTable
ALTER TABLE "wallets" ADD COLUMN     "kind" "WalletKind" NOT NULL DEFAULT 'USER',
ADD COLUMN     "label" TEXT,
ALTER COLUMN "profile_id" DROP NOT NULL;

-- CreateIndex
CREATE INDEX "wallets_kind_idx" ON "wallets"("kind");
