CREATE UNIQUE INDEX "ImportConnection_projectId_sourceKey_externalAccountId_key"
  ON "ImportConnection"("projectId", "sourceKey", "externalAccountId");
