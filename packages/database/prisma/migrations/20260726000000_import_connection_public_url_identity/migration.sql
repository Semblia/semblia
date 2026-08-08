-- Not CONCURRENTLY: Prisma runs migration files inside a transaction, where
-- CREATE INDEX CONCURRENTLY is rejected by PostgreSQL. The table is empty at
-- deploy time, so a blocking index build is instantaneous.
CREATE UNIQUE INDEX "ImportConnection_public_url_identity_key"
  ON "ImportConnection"("projectId", "sourceKey", "publicUrl")
  WHERE "authStrategy" = 'PUBLIC_URL'::"ImportConnectionAuthStrategy"
    AND "publicUrl" IS NOT NULL;
