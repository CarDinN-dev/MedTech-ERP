# Production testing

MedTech ERP uses layered tests so business rules, files, database permissions and rendered workflows fail independently and clearly.

## Test commands

```bash
npm ci
npm run typecheck
npm test
npm run test:coverage
npm run test:db
npm run test:e2e
npm run test:all
```

`test:db` starts a disposable PostgreSQL 16 container, applies every migration and seed in order, creates isolated fixtures, verifies role permissions and RLS, and removes the container. Docker must be running.

Playwright starts Next.js automatically unless `PLAYWRIGHT_BASE_URL` points to an already running build. Desktop Chrome and a Pixel 7 mobile profile are configured. CI runs Chromium and retains screenshots, videos and traces only on failure.

For a fully isolated browser runtime against the Docker-hosted app:

```bash
docker build -f Dockerfile.e2e -t medtech-erp-e2e .
docker run --rm --add-host=host.docker.internal:host-gateway \
  -e PLAYWRIGHT_BASE_URL=http://host.docker.internal:3000 medtech-erp-e2e
```

## Coverage

Vitest enforces 70% statements, lines and functions, plus 60% branches across the critical validation, authentication, Excel, PDF and form code. HTML output is generated in `coverage/`.

## Isolated test identities

All test accounts use the password `MedTech@Test2026!` and must only exist in local or isolated staging environments.

| Account | Email | Supabase role |
|---|---|---|
| Admin | `admin.test@medtech.qa` | `super_admin` |
| HR | `hr.test@medtech.qa` | `hr_manager` |
| Finance | `finance.test@medtech.qa` | `finance_manager` |
| Sales | `sales.test@medtech.qa` | `sales_manager` |
| Shipping | `shipping.test@medtech.qa` | `shipping_team` |
| Viewer | `viewer.test@medtech.qa` | `auditor` |

The browser suite injects these identities into the local demo store. To create matching Supabase Auth users:

```bash
cp .env.test.example .env.test.local
ALLOW_TEST_USER_SEED=true npm run test:users
```

The user script requires a service-role key, refuses to run without explicit acknowledgement, and blocks remote projects unless `ALLOW_REMOTE_TEST_USERS=true`. Never run it against production.

## What is covered

- Zod business and employee form validation
- Login, session lifecycle and audit attribution
- User form required/email/password constraints
- Excel valid rows, partial failure and empty workbooks
- Commercial and HR PDF generation and PDF signatures
- Full migration and seed integration
- Admin, HR, Finance, Sales, Shipping and Viewer permissions
- RLS visibility and denied HR writes
- Immutable audit and document numbering grants
- Playwright authentication, sorting, selection/PDF, onboarding validation, approvals and audit trail

The GitHub Actions workflow runs type checking, coverage, database tests, production build and Chromium E2E for every pull request.
