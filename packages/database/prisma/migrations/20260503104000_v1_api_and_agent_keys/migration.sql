-- Add a distinct credential kind for scoped agent access while preserving
-- existing SECRET and PUBLISHABLE API key rows.
ALTER TYPE "ApiKeyType" ADD VALUE IF NOT EXISTS 'AGENT';
