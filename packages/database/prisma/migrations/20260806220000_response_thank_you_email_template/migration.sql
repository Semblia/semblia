-- Owner-sent thank-you to the person who left a testimonial.
-- Additive enum value only: no table, column, or constraint changes.
ALTER TYPE "EmailTemplateKey" ADD VALUE IF NOT EXISTS 'RESPONSE_THANK_YOU';
