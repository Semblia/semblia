CREATE UNIQUE INDEX "ImportConnection_public_url_identity_key"
  ON "ImportConnection"("projectId", "sourceKey", "publicUrl")
  WHERE "authStrategy" = 'PUBLIC_URL'::"ImportConnectionAuthStrategy"
    AND "publicUrl" IS NOT NULL;
