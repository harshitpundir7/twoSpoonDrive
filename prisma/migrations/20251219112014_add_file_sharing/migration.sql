-- AlterTable
ALTER TABLE "FileShare" ADD COLUMN     "accessLevel" TEXT NOT NULL DEFAULT 'restricted',
ADD COLUMN     "sharedWithEmail" TEXT,
ALTER COLUMN "permission" SET DEFAULT 'viewer';

-- CreateIndex
CREATE INDEX "FileShare_sharedWithEmail_idx" ON "FileShare"("sharedWithEmail");
