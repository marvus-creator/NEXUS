ALTER TABLE "notifications" ADD COLUMN "key" TEXT,
ADD COLUMN "vars" JSONB,
ADD COLUMN "dedupe_key" TEXT;

CREATE UNIQUE INDEX "notifications_dedupe_key_key" ON "notifications"("dedupe_key");
