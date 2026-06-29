# MedTech ERP — New Chat Handoff Context

Paste this whole file into a new Codex chat so work can continue without losing context.

## User / presentation context

- User name: Kashif.
- Project: **MedTech ERP** for **MedTech Corporation Trading, Doha, Qatar**.
- Purpose: client-presentable ERP demo that runs locally on the user’s PC and can be packaged for another PC.
- Desired feel: professional Odoo-style ERP, polished dark enterprise UI, no demo-breaking errors.
- The app is currently intended as a local/client presentation build, with browser-local demo data and Docker support.

## Main project location

Main ERP project:

```text
C:\Users\Lenovo\Documents\Codex\2026-06-20\medtech-erp-client-demo
```

Current Codex workspace may open at:

```text
C:\Users\Lenovo\Documents\Codex\2026-06-20\build-a-full-enterprise-erp-web
```

But the actual MedTech ERP app is in `medtech-erp-client-demo`.

## Portable ZIP already created

Portable package for another PC:

```text
C:\Users\Lenovo\Documents\Codex\2026-06-20\MedTech-ERP-Portable-2026-06-21.zip
```

Checksum:

```text
C:\Users\Lenovo\Documents\Codex\2026-06-20\MedTech-ERP-Portable-2026-06-21.zip.sha256
```

SHA256:

```text
C07DF3BEDDE94BF255A082F793B20287ACE6B9E670B6573FD72ED2AE8EA3D9DB
```

The ZIP contains source code, docs/tests, Supabase schema/seed/RLS files, and an offline Docker image tar.

## Docker / local run status

Docker was fixed enough for the local app to run.

Known working local URL:

```text
http://127.0.0.1:3000
http://127.0.0.1:3000/login
```

Health endpoint previously worked:

```text
http://127.0.0.1:3000/api/health
```

Expected health response:

```json
{"status":"ok","service":"medtech-erp"}
```

Docker image:

```text
medtech-erp:latest
```

Previously running container:

```text
medtech-erp-client-demo-app-1
```

or portable launcher container:

```text
medtech-erp
```

Docker cleanup already performed:

- Removed huge test/e2e Docker images.
- Removed duplicate/unused images.
- Ran Docker builder prune.
- Kept the main production image.

Important note: Docker’s physical Windows VHD file may still be large. Logical Docker cleanup was done, but physical VHD compaction may require elevated/admin PowerShell or Docker Desktop cleanup tools.

## Login / demo user context

Kashif wanted a proper login page, logout menu, and visible presenter name.

Presentation login:

```text
admin@medtech.qa
MedTech@2026
```

Presenter/client demo name should show as:

```text
Kashif
```

Older demo menu showed “Ahmed Al-Mohannadi”; this should not be used for Kashif’s client presentation.

## Major fixes already requested / worked on

User reported and requested fixes for:

- Audit logs tab showing wrong user table instead of audit logs.
- Missing/unclear PDF download feature.
- Sorting not working correctly across tabs.
- Administration page buggy/non-functional.
- Need login page.
- Need user creation/setup.
- Need role changes.
- Need logout.
- Need selected rows and detailed PDF download, e.g. RFQ details PDF.
- HR module should match/reference another HR ERP located at:

```text
C:\Users\Lenovo\OneDrive\Desktop\ERP\New folder (3)\KAASHIFY_ERP_UI_READABLE_PRO\KAASHIFY_ERP_UI_UPDATED\HR ERP
```

User wanted recruitment, attendance, payroll, employee directory, and core HR behavior adapted from that app.

## HR files user provided

These were referenced for HR fields/PDF formats:

```text
C:\Users\Lenovo\Downloads\Upload Excel (1).xlsx
C:\Users\Lenovo\Downloads\MTECH-HR-RF-012 offer letter form (1).docx
C:\Users\Lenovo\Downloads\approval_to_hire_plan_2 (4).pdf
C:\Users\Lenovo\Downloads\MTECH-HR-RF-027 Hiring Document (1).docx
```

The Excel file contains the employee tab fields needed for bulk upload/template/import.
The DOCX/PDF files are examples for branded HR PDF/document outputs.

## Testing requested

User requested production-level testing including:

- Unit tests
- Integration tests
- Role permission tests
- Supabase RLS tests
- Form validation tests
- Excel import tests
- PDF generation tests
- End-to-end tests with Playwright
- Test users for Admin, HR, Finance, Sales, Shipping, and Viewer

## Docker/package files to check

In the main ERP project, inspect:

```text
Dockerfile
docker-compose.yml
.dockerignore
README.md
docs
supabase
tests
```

`.dockerignore` was optimized to exclude bulky/dev-only files from the production Docker image context, including:

```text
node_modules
.next
.git
.github
.env*
*.log
supabase/.temp
docs
tests
coverage
playwright-report
test-results
Dockerfile.test
Dockerfile.e2e
tmp
output
```

## New chat should start by doing this

1. Open this project:

```powershell
Set-Location 'C:\Users\Lenovo\Documents\Codex\2026-06-20\medtech-erp-client-demo'
```

2. Check current files:

```powershell
git status --short
Get-ChildItem
```

3. Check app scripts/package:

```powershell
Get-Content package.json
```

4. If verifying local app:

```powershell
docker ps
Invoke-WebRequest -UseBasicParsing http://127.0.0.1:3000/api/health
```

5. If starting manually:

```powershell
docker compose up -d --build
```

6. Then open:

```text
http://127.0.0.1:3000/login
```

## Current user priority

Kashif wants confidence that the client demo works without errors. Prioritize:

1. Login/logout flow.
2. Admin users/roles working.
3. HR module polish.
4. Selection + detailed PDF download for RFQs/records.
5. Audit logs showing actual logs.
6. Sorting/filtering everywhere.
7. Docker and portable ZIP reliability.
8. No embarrassing UI bugs during presentation.

## Communication preference

User is casual and direct. Respond plainly, warmly, and decisively. He appreciates “make it work on my PC” execution over long theory.

