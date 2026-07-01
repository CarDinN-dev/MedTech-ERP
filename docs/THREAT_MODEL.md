# Threat Model

Scope: authorized local MedTech ERP demo project. The current app is local-demo friendly and must not be treated as a production security boundary.

## Assets To Protect

- Demo business records in localStorage: sales, procurement, inventory, finance, HR child records, service, projects, documents, approvals, audit logs.
- Demo user/session records and role assignments.
- Generated PDFs and Excel exports.
- Local backup/restore JSON.
- Source code, environment files, migrations, and configuration.
- Future production assets: real customer data, employee data, payroll data, regulated product/batch data, invoices, supplier contracts, audit logs, and secrets.

## User Roles

- Super Admin
- Management
- Finance Manager
- HR Manager / HR Officer
- Payroll Manager
- Department Manager / Employee
- Sales Manager / Sales Executive
- Shipping Team / Warehouse Team / Procurement Team
- Service Engineer / Project Manager
- Read-only Auditor

## Trust Boundaries

- Browser localStorage/session cookie boundary.
- Client UI role checks versus future server-enforced authorization.
- File import boundary: Excel and JSON backup files enter from the local machine.
- PDF/Excel export boundary: local records become downloadable files.
- API boundary: `/api/health`, `/api/pdf/sample`, auth callback.
- Middleware boundary between unauthenticated login/public API and ERP pages.
- Docker/Nginx boundary for future deployment.
- Supabase scripts/client code boundary, currently dormant in local mode.

## Attack Surfaces

- Login redirect `next` parameter.
- Auth callback `next` parameter.
- Demo localStorage users and session records.
- Admin user and permission screens.
- Excel imports and migration readiness imports.
- Local backup restore JSON.
- PDF sample route and generated PDFs.
- Document template preview/download links.
- Middleware route gating.
- Docker/Nginx deployment config.
- Environment variables and scripts.
- Dependency supply chain.

## Abuse Cases

- Forge demo cookie to bypass the local login screen.
- Modify localStorage to escalate local-demo role.
- Import an oversized workbook to exhaust browser memory.
- Import a crafted backup to overwrite local demo data.
- Use a redirect parameter to navigate a user outside the app.
- Generate/download sensitive PDFs without production authorization.
- Reuse demo/test credentials outside local/staging.
- Commit real service-role keys or production secrets.
- Run `npm audit fix --force` and silently break the app.

## Likely Attackers

- Local user with browser/devtools access.
- Accidental demo operator importing the wrong file.
- Internal tester using demo credentials outside intended scope.
- Future external attacker if the demo is promoted to production without server-side controls.
- Supply-chain attacker through vulnerable or compromised packages.

## Data Flow Risks

- Demo data is persisted in localStorage and can be read/changed by anyone with browser access.
- Demo auth stores temporary passwords client-side.
- Client-side RBAC is useful for UX, not a production access-control boundary.
- Excel/backup imports deserialize local files into browser memory.
- PDF/Excel exports convert screen data into files that can leave the browser.
- Future Supabase/database paths must not trust client-provided roles or user metadata.

## Local Demo Risks

- Cookie gate is bypassable by design because there is no server-side local identity store.
- Audit logs are mutable because they live in localStorage.
- Demo passwords and seeded users are visible in source/tests/docs.
- Local exports/backups can contain PII-like demo data.
- Security headers protect browser behavior but do not make localStorage confidential.

## Future Production Risks

- Real HR/payroll/customer/regulatory records require server-side authorization and encrypted storage.
- Attachments need content-type validation, malware scanning, object storage ACLs, and retention policy.
- Audit logs must be append-only and server-generated.
- Privileged roles need MFA and segregation-of-duties enforcement on the server.
- Dependency and container scans must run in approved CI.
- Secrets must move to a secret manager and never use `NEXT_PUBLIC_` unless safe for browser exposure.

## Mitigations

- Fixed this session: safe redirect helper, CSP/security headers, stricter demo cookie SameSite, Excel import limits, backup restore validation, targeted security tests.
- Existing: non-root Docker runner, no-new-privileges, Nginx TLS/HSTS/rate-limit config, PDF template allowlist, local audit trail, role permission matrix, validation tests.
- Required before production: server-side auth/RBAC, HttpOnly signed cookies, MFA for privileged roles, real secret management, attachment scanning, immutable audit logging, SCA/container scanning, CSRF review, production CSP without `unsafe-eval`, and approved backup/restore controls.

