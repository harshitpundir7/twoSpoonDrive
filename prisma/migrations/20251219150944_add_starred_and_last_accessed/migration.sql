-- AlterTable
ALTER TABLE "File" ADD COLUMN     "isStarred" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "lastAccessedAt" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "File_isStarred_idx" ON "File"("isStarred");

-- CreateIndex
CREATE INDEX "File_lastAccessedAt_idx" ON "File"("lastAccessedAt");
