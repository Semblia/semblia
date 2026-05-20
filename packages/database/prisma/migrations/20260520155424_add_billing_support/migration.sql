-- AlterTable
ALTER TABLE "ProjectMemberInvite" ALTER COLUMN "expiresAt" SET DEFAULT (now() + interval '14 days');
