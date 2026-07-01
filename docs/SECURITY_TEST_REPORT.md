# Security Test Report

Date: 2026-07-01

Scope: authorized local MedTech ERP demo only. Tests used safe local payloads and local HTTP requests against `http://127.0.0.1:3000`. No external systems were attacked and no data was exfiltrated.

## Executive Result

Overall result: PASS for local-demo readiness after fixes.

Confirmed high-risk local weaknesses fixed:

- Forged demo cookie plus missing/tampered local session could previously render the ERP shell with a Super Admin fallback. The shell now requires a valid stored demo session, clears invalid state, and redirects to login.
- Tampered document sequence localStorage could produce broken document numbers. The sequence generator now resets invalid values to the first valid local sequence.
- Unauthenticated API requests to protected API routes returned browser login redirects. Protected API routes now return controlled `401` JSON responses.

Remaining risk: this is still a browser-local demo. localStorage, client-side audit entries, seeded demo passwords, and client-side RBAC are not production security boundaries. Production requires server-side auth/RBAC, HttpOnly signed sessions, immutable audit logs, managed secrets, attachment scanning, and server-side validation.

## Verification Commands

| Check | Result |
| --- | --- |
| `npm.cmd test -- tests/unit/demo-auth.test.ts tests/unit/document-control.test.ts tests/unit/security-hardening.test.ts` | PASS, 23 tests |
| `npm.cmd test` | PASS, 129 tests |
| `npm.cmd run typecheck` | PASS |
| `npm.cmd run lint` | PASS with existing warnings only |
| `npm.cmd run build` | PASS |
| `npm.cmd run security:audit` | PASS, 0 vulnerabilities |
| `GET /api/health` on port 3000 | PASS, 200 JSON |
| `POST /api/health` | PASS, 405 |
| unauthenticated `GET/POST /api/pdf/sample` | PASS, 401 JSON |
| cookie-authenticated `POST /api/pdf/sample` | PASS, 405 |
| unauthenticated `/admin` | PASS, 307 to `/login?next=%2Fadmin` |

## Findings And Retest

| Test ID | Scenario | Result | Finding | Fix applied | Remaining risk | Retest result |
| --- | --- | --- | --- | --- | --- | --- |
| RT-01 | Authentication bypass | Fixed | A forged demo cookie without a valid local session could reach the ERP shell and use the prior Super Admin fallback. | `AppShell` now requires `getDemoSession()`, clears invalid session state, and redirects to login. `getDemoSession()` now validates stored user, status, role, and department. | Local demo auth remains client-controlled and must not be used as production auth. | PASS: tampered session unit test and unauth `/admin` live redirect. |
| RT-02 | Unauthorized route access | Pass | Protected routes redirect when no demo cookie exists. | Kept middleware route gate; AppShell now performs client session validation too. | A forged cookie can still reach server-rendered page HTML in local demo, but the client shell rejects invalid local sessions. | PASS: `/admin` returns 307 to login without session. |
| RT-03 | Unauthorized action access | Pass | Existing UI permission checks block create/update/delete/archive where roles lack permission. | No new fix required. Existing denied actions write audit entries. | Client-side checks need server equivalents before production. | PASS: existing ERP security tests pass. |
| RT-04 | Role permission bypass | Pass | Role matrix tests cover auditor read-only behavior and restricted payroll authority. | No new fix required. | Client-side role data can be modified locally in demo mode. | PASS: `erp-security-work` and critical journey tests pass. |
| RT-05 | Approval bypass | Pass | Approval workflow checks prevent unrestricted approval decisions in tested flows. | No new fix required. | Server-side segregation-of-duties required for production. | PASS: approval and critical journey tests pass. |
| RT-06 | Payroll finalization bypass | Pass | Payroll finalization is gated by role/permission and approved state in local workflow tests. | No new fix required. | Production payroll must be server-authorized and immutable after finalization. | PASS: payroll and critical journey tests pass. |
| RT-07 | PO approval bypass | Pass | Procurement workflow tests cover PO approval gating. | No new fix required. | Client-only demo workflow is not a production approval boundary. | PASS: procurement workflow tests pass. |
| RT-08 | Quotation approval bypass | Pass | Sales quotation approval flow is gated through local permission and approval status checks. | No new fix required. | Production quotation approval needs server enforcement. | PASS: sales workflow and costing tests pass. |
| RT-09 | Costing approval bypass | Pass | Costing approval and margin guard tests cover approval conditions. | No new fix required. | Server-side pricing/costing policy required before production. | PASS: sales costing and pricing tests pass. |
| RT-10 | XSS in text fields | Pass | React escapes rendered values; export/PDF paths sanitize plain text. | Added regression test for inert unsafe text payloads. | Any future `dangerouslySetInnerHTML` or rich-text feature must be reviewed. | PASS: `plainText("<img ...>Safe")` returns inert text. |
| RT-11 | XSS in imported Excel data | Pass | Excel parser converts headers and values through `plainText`. | No new fix required. | Future importers must keep using shared parser/sanitizers. | PASS: import/export tests pass. |
| RT-12 | Formula injection in exported Excel/CSV | Pass | Spreadsheet formula prefixes are escaped before export. | No new fix required. | Future CSV-only exports must use the same formula escaping. | PASS: existing Excel tests pass. |
| RT-13 | Malformed JSON/localStorage crash | Pass | Corrupted localStorage records fall back safely in tested stores. | No new fix required. | Uncovered future store keys must follow the same safe-read pattern. | PASS: critical journey and demo-store tests pass. |
| RT-14 | Corrupted backup import | Pass | Backup import validates schema and JSON before clearing current data. | No new fix required. | Backup files can still contain sensitive demo data if users put it there. | PASS: corrupted backup test keeps existing data. |
| RT-15 | File import wrong type | Pass | Excel imports only accept `.xlsx`/`.xlsm` workbook names and allowed MIME values. | No new fix required. | Browser MIME values can be inconsistent; extension validation remains required. | PASS: Excel tests and code inspection. |
| RT-16 | Huge import file / too many rows | Pass | Workbooks over 5 MB or 5000 rows are rejected with controlled errors. | No new fix required. | Very complex valid workbooks can still consume browser resources. | PASS: oversized workbook test. |
| RT-17 | Invalid dates, numbers, percentages | Pass | Shared structured validation rejects invalid dates, non-numeric values, and percentages outside 0-100. | Added focused invalid value checks to security tests. | Module-specific custom forms must keep invoking shared validation. | PASS: security hardening tests pass. |
| RT-18 | Negative quantity/amount edge cases | Pass | Shared validation rejects nonpositive quantities and negative amounts/costs/prices. | Added focused negative value checks to security tests. | Production must duplicate these rules server-side. | PASS: security hardening tests pass. |
| RT-19 | Broken document number generation | Fixed | Tampered localStorage sequence such as `not-a-number` could generate invalid document numbers. | `issueDocumentNumber()` now accepts only positive integers and resets invalid values to `1`. | Local sequence storage is still user-editable in demo mode. | PASS: tampered sequence regression test. |
| RT-20 | PDF generation with special characters | Pass | PDF generator normalizes text fields through `plainText`; existing tests cover unsafe-looking input. | No new fix required. | Future PDF templates must keep using the generator sanitization path. | PASS: PDF integration tests pass. |
| RT-21 | API route method abuse | Pass | API handlers expose only required methods; protected PDF sample rejects POST when authenticated. | No route changes required for methods. | Future mutation routes must explicitly validate method, auth, CSRF, and body schema. | PASS: `/api/health` POST 405, cookie-authenticated `/api/pdf/sample` POST 405. |
| RT-22 | API unauthenticated access | Fixed | Protected API routes redirected to login HTML instead of returning API-safe auth failures. | Middleware now returns `401` JSON with `no-store` and `nosniff` for protected API routes. | `/api/health` remains intentionally public and returns no sensitive data. | PASS: unauthenticated `/api/pdf/sample` GET/POST returns 401 JSON. |
| RT-23 | CSRF risk if cookie-based mutation routes exist | Pass | No cookie-based mutation API routes were found. | No new fix required. | Add CSRF tokens or SameSite/Origin checks before adding mutation APIs. | PASS: API route inspection found only GET handlers. |
| RT-24 | Security headers present | Pass | CSP, nosniff, frame denial, referrer policy, permissions policy, COOP, and CORP are configured. | Added header presence regression test. | Dev CSP allows `unsafe-eval` for Next dev; production config removes that dev allowance. | PASS: unit header test and live `/api/health` headers. |
| RT-25 | Dependency audit result | Pass | `npm audit --audit-level=moderate` reports no vulnerabilities. | No dependency fix required. | Audit database coverage is not a full supply-chain guarantee. | PASS: 0 vulnerabilities. |
| RT-26 | Docker non-root check | Pass | Runtime image creates and uses `nextjs`; compose drops capabilities and enables no-new-privileges. | No new fix required. | Image should be scanned and base image pinned by digest before production. | PASS: Dockerfile and compose inspection. |
| RT-27 | Sensitive logs check | Pass | No app-level console logging of secrets found; audit store redacts sensitive keys/text. | No new fix required. | Browser-visible demo data remains accessible to local users. | PASS: source scan plus audit redaction tests. |
| RT-28 | Hardcoded secrets check | Pass with accepted demo risk | Scan found intentional demo credentials and documentation warnings, not production secrets. | No production secret fix required. | Demo credentials must never be reused outside local/staging. | PASS: source scan and docs confirm local-demo scope. |
| RT-29 | localStorage tampering check | Fixed | Session role tampering and document sequence tampering had confirmed local impact. | Added stricter session validation and safe document sequence parsing. | All localStorage can still be edited by a local user; production must move authority to the server. | PASS: tampered session and sequence tests. |
| RT-30 | Empty localStorage app load | Pass | Empty localStorage loads login/demo seed paths without crashing. | No new fix required. | Future stores must preserve safe defaults. | PASS: route smoke and existing store tests. |

## Manual Checklist For Future Runs

- Re-run this checklist after adding any new API route, import type, export format, PDF template, or approval workflow.
- For any future mutation API: test unauthenticated access, wrong method, CSRF, malformed JSON, oversized body, schema validation, and authorization by role.
- For any future attachment/file import: test wrong extension, mismatched MIME, oversized file, archive bombs, macro-enabled files, and malware scanning in the target deployment environment.
- Before production: replace local demo auth, localStorage audit/data stores, and seeded passwords with server-side identity, immutable audit storage, and managed secrets.
