# Case Manager

A single-practice case management app built with Next.js, TypeScript, Prisma and Postgres.

## Included workflows

- Create clients with contact information and conflict notes; view and edit their profiles.
- Create cases with a client, type, case number, court, judge and opposing counsel.
- Edit case details and move cases through OPEN, PENDING, CLOSED and ARCHIVED.
- Search all matters by title, number or client and filter by status.
- Create, edit, complete/reopen and delete tasks and deadlines.
- Record billable and non-billable time, rates and dates; display the total billable amount.
- Upload documents (20 MB maximum) or attach external links; categorize documents by tag.
- Connect a CourtListener RECAP docket and automatically import its pages, dates, descriptions and attachment links; add manual docket notes separately.
- Add, edit and delete citations with citation text, a Westlaw permalink/source link and relevance notes. The server records the signed-in user's name/email and creation time.
- Dashboard with outstanding deadlines and open-task count.
- Authenticated APIs and file downloads, validated inputs and responsive layouts.
- Loading/retry states for client and case lists; clear network and session errors without losing form values.
- Research save confirmations tracked by citation and destination case, so new searches cannot inherit an unrelated result's saved state.

Clients and cases cannot be deleted through the API; archive a case to preserve its related records.
Citations contain references only; no Westlaw page is fetched or scraped.

## Run locally on Windows

From this project folder:

```powershell
npm install
npm run db:generate
npm run build
npm start
```

Open http://localhost:3000. If port 3000 is already used:

```powershell
npm start -- --port 3101
```

Open http://localhost:3101. The launch script sets the authentication callback origin to the requested port.
For development use `npm run dev`.
Development uses `.next-dev/`; production builds and previews use `.next-production/`.
This lets a development server run without replacing the preview's compiled files.
Stop a production preview before rebuilding its production output, then start it again.

The launcher loads this project's `.env`, followed by `.env.local`, overriding conflicting inherited shell variables.
A deployment without those files uses injected environment variables.
For a separate test environment, set `CASE_MANAGER_ENV_FILE` to its environment file.

## Database setup and upgrades

The existing database was upgraded with the two additive fields in
`prisma/changes/20260904_case_record.sql`: case type and citation author.
The change preserves existing rows; existing citations have no recorded author.
RECAP import state and remote entry identifiers are added by `prisma/changes/20260905_recap_import.sql`.
Apply this additive SQL to an existing database before running the updated app.

For a new empty database, set `DATABASE_URL` in `.env` and run:

```powershell
npm run db:push
```

Use a direct connection for schema operations. The database script loads project-local configuration and converts Neon pooled hosts to their direct equivalent.
Never use `--accept-data-loss` for routine upgrades.

Keep `NEXTAUTH_SECRET` as a strong random secret and `NEXTAUTH_URL` as the site's origin.
The first visit goes to `/setup` if no account exists. After the initial account is created, setup locks.
Concurrent setup requests are serialized with a database advisory lock.
There is no public registration or invitation workflow.

## Document storage

Uploaded files are saved with random identifiers outside the public directory.
Only authenticated users can download them through `/api/files/[id]`.
The default storage folder is `uploads/` in this project. Set `UPLOAD_DIR` to an absolute path for another durable location.
Back up this folder **and** Postgres together; a database backup does not contain the file bytes.
Removing an uploaded document also removes its stored file.

This local storage implementation is intended for a persistent server or this computer.
Before deploying to an ephemeral/serverless host, replace it with private durable storage or mount a persistent volume.
The application treats every authenticated account as part of the same practice; it does not provide tenant separation.

## Integrations and limits

- In a case's PACER docket section, paste a CourtListener docket URL or numeric ID, select **Find docket**, verify the match, then **Connect and import**. Pages import automatically while the page stays open. Pause/resume retains progress; **Refresh docket** rechecks the archive without duplicating entries. Imported records are read-only; manual entries remain editable. A connected case cannot be switched to a different docket.
- Imports use `COURTLISTENER_API_TOKEN` (or `RECAP_API_TOKEN` as a fallback). Rate limits pause the import; wait before resuming. Missing/invalid dates or entry IDs are skipped and reported. Attachment links indicate whether the document is available in RECAP.
- Retrieval reads the existing RECAP archive only. Coverage may be incomplete or delayed. It does not purchase PACER data, download document files, or run scheduled background polling.
- Deadlines are manually recorded, including a MANUAL/PACER source label. No jurisdictional rules engine or automatic legal deadline calculation is included.
- CourtListener search remains an optional supplemental tool using `COURTLISTENER_API_TOKEN`.
- Billing calculates time charges; invoices, payments, trust accounting and tax workflows are not included.
- Multi-user invitations, password reset and role-based permissions are not included.

## Checks

```powershell
npm test
npm run typecheck
npm run build
```

Validation tests cover invalid dates, dangerous URLs, invalid numeric inputs, required fields and protected-field writes.
End-to-end verification on an isolated Neon branch covered sign-in, every record type, updates, completion, archive filtering, upload/download, unauthorized access and deletion.
Browser verification covered sign-in, the case record and citation creation.
RECAP checks cover URL restrictions, attachment parsing, rate limits, saved pagination and duplicate-free refreshes. The database integration test is opt-in via `RECAP_TEST_DATABASE_URL`; use an isolated test database.
