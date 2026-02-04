-- AlterTable
ALTER TABLE "File" ALTER COLUMN "size" SET DEFAULT 0,
ALTER COLUMN "path" DROP NOT NULL;

-- CreateIndex
CREATE INDEX "File_userId_parentId_deletedAt_idx" ON "File"("userId", "parentId", "deletedAt");

-- AddForeignKey
ALTER TABLE "File" ADD CONSTRAINT "File_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "File"("id") ON DELETE CASCADE ON UPDATE CASCADE;
