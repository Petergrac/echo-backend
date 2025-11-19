-- DropIndex
DROP INDEX "Echo_createdAt_idx";

-- CreateIndex
CREATE INDEX "Echo_createdAt_id_idx" ON "Echo"("createdAt", "id");
