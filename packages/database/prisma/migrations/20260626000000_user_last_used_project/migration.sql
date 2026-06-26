-- AlterTable
ALTER TABLE "User" ADD COLUMN "lastUsedProjectId" TEXT;

-- CreateIndex
CREATE INDEX "User_lastUsedProjectId_idx" ON "User"("lastUsedProjectId");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_lastUsedProjectId_fkey" FOREIGN KEY ("lastUsedProjectId") REFERENCES "Project"("id") ON DELETE SET NULL ON UPDATE CASCADE;
