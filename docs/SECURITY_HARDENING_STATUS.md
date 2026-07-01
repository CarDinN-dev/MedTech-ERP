# Security Hardening Status

## Completed Fixes

- Added shared safe local redirect validation in `lib/security.ts`.
- Hardened login and auth callback redirects.
- Set demo session cookie `SameSite=Strict`.
- Added CSP and additional browser security headers in `next.config.ts`.
- Added Excel import limits: 5 MB and 5000 rows.
- Added controlled import error handling to costing and migration readiness imports.
- Added backup restore limits and validate-before-clear behavior.
- Added security regression tests in `tests/unit/security-hardening.test.ts`.

## Pending Fixes

- Replace local-demo cookie/localStorage auth with server-authenticated, HttpOnly session handling before production.
- Remove client-side password storage before production.
- Enforce RBAC and segregation-of-duties on the server for every mutation/export/API.
- Add authenticated document/PDF APIs if generated documents contain real data.
- Add attachment upload controls only if real uploads are introduced: MIME validation, size limits, AV scan, object storage ACLs.
- Add immutable server-side audit logging.
- Add approved dependency/container scanning in CI.
- Pin production container images by digest and consider read-only root filesystem.
- Move all real secrets to a secret manager.

## Test Status

- Focused security tests: passed.
- Typecheck: passed after hardening changes.
- Full build/test status should be rerun after doc-only changes if release packaging is required.

## Known Limitations

- Local demo mode is not a production security model.
- localStorage data, local audit logs, and local role assignments are user-editable by anyone with browser access.
- CSP permits `unsafe-inline` and `unsafe-eval` for current Next/local runtime compatibility.
- No internet-backed dependency audit was run, to avoid external calls from this local task.
- `git` was not available in this shell for diff/status reporting.

## Production Hardening TODOs

- Enable production identity provider/Auth service with MFA for privileged roles.
- Disable public sign-up and leaked-password reuse where supported.
- Add server-side route/API authorization policies.
- Add CSRF strategy for cookie-authenticated mutations.
- Add real log retention and audit immutability.
- Add rate limiting at app/API and edge layers.
- Add SAST/SCA/container scanning in an approved CI pipeline.
- Add backup encryption, restore approvals, and restore audit trail.
- Replace demo `.env.production` placeholders with deployment-time secrets.

