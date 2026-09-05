-- Additive upgrade from the original Case Manager scaffold.
ALTER TABLE "cases" ADD COLUMN IF NOT EXISTS "type" TEXT;
ALTER TABLE "citations" ADD COLUMN IF NOT EXISTS "addedBy" TEXT;

