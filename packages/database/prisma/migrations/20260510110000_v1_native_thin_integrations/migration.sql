-- V1 Task 5: native thin integration connections.

CREATE TYPE "IntegrationProvider" AS ENUM ('SLACK', 'NOTION', 'LINEAR', 'GITHUB');

CREATE TYPE "IntegrationAuthStrategy" AS ENUM ('CLERK_OAUTH', 'NATIVE_OAUTH', 'MANUAL_SECRET');

CREATE TABLE "IntegrationConnection" (
  "id" TEXT NOT NULL,
  "projectId" TEXT NOT NULL,
  "provider" "IntegrationProvider" NOT NULL,
  "authStrategy" "IntegrationAuthStrategy" NOT NULL,
  "connectedByUserId" TEXT,
  "clerkProvider" VARCHAR(120),
  "externalAccountId" VARCHAR(255),
  "status" VARCHAR(32) NOT NULL DEFAULT 'ACTIVE',
  "scopes" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "config" JSONB,
  "lastCheckedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "IntegrationConnection_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "IntegrationConnection_projectId_provider_idx" ON "IntegrationConnection"("projectId", "provider");
CREATE INDEX "IntegrationConnection_projectId_status_idx" ON "IntegrationConnection"("projectId", "status");
CREATE INDEX "IntegrationConnection_connectedByUserId_idx" ON "IntegrationConnection"("connectedByUserId");

ALTER TABLE "IntegrationConnection"
  ADD CONSTRAINT "IntegrationConnection_projectId_fkey"
  FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "IntegrationConnection"
  ADD CONSTRAINT "IntegrationConnection_connectedByUserId_fkey"
  FOREIGN KEY ("connectedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
