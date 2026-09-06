ALTER TABLE "cases" ADD COLUMN IF NOT EXISTS "recapDocketId" TEXT;
ALTER TABLE "cases" ADD COLUMN IF NOT EXISTS "recapDocketName" TEXT;
ALTER TABLE "cases" ADD COLUMN IF NOT EXISTS "recapNextPage" TEXT;
ALTER TABLE "cases" ADD COLUMN IF NOT EXISTS "recapLastSyncedAt" TIMESTAMP(3);
ALTER TABLE "pacer_docket_entries" ADD COLUMN IF NOT EXISTS "recapEntryId" TEXT;
ALTER TABLE "pacer_docket_entries" ADD COLUMN IF NOT EXISTS "recapDocuments" JSONB;
CREATE UNIQUE INDEX IF NOT EXISTS "pacer_docket_entries_caseId_recapEntryId_key"
  ON "pacer_docket_entries"("caseId", "recapEntryId");
