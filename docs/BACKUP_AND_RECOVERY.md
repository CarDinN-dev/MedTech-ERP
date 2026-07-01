# Backup And Recovery

This demo stores operational data in browser localStorage under `medtech-demo:*` keys. Backups are local JSON exports; no external service is called.

## Export A Backup

1. Open Administration -> Local Data Tools.
2. Select Export All Local Data or Export Demo Data JSON.
3. Keep the generated `.json` file in a trusted local folder.
4. Confirm the Audit log shows `EXPORT BACKUP`.

The export excludes the current demo session cookie/localStorage session.

## Restore A Backup

1. Open Administration -> Local Data Tools.
2. Select Import Local Data Backup.
3. Choose a JSON file exported by this app.
4. The app validates schema, size, JSON parseability, and record payload shape before clearing existing data.
5. If validation passes, the app restores data and reloads.
6. Confirm the Audit log shows `RESTORE BACKUP`.

Failed restores are logged as `failure` with severity `high` and do not clear current data.

## Reset One Module

1. Open Administration -> Local Data Tools.
2. Choose a module from the Reset section.
3. Select Reset One Module.
4. Confirm the Audit log shows `RESET MODULE DATA`.

Use this for isolated localStorage corruption or demo cleanup.

## Reset All Demo Data

1. Export evidence or a backup first if investigation matters.
2. Open the profile menu or Administration -> Local Data Tools.
3. Select Reset All Demo Data.
4. Confirm the Audit log shows `RESET ALL DEMO DATA`.

This removes all `medtech-demo:*` local data except the current session, then reloads the app.

## Safe Backup Rules

1. Do not edit backup JSON manually.
2. Do not import files from untrusted sources.
3. Do not store real passwords, API keys, patient data, or production secrets in demo records.
4. Keep one known-good backup before large demos, imports, payroll finalization, approvals, or reset tests.

## Verification

After restore or reset:

1. Open `/api/health`.
2. Open Administration -> Audit log and clear filters.
3. Open the affected module and confirm records load.
4. Run `npm.cmd run typecheck` and `npm.cmd run build` after code changes.
