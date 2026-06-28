# MedTech ERP

Production-oriented enterprise resource planning platform for MedTech Corporation Trading W.L.L., Doha, Qatar. It provides one modular workspace for finance, HR, sales, procurement, inventory, shipping, after-sales service, turnkey projects, documents, approvals, reporting, and administration.

## Included

- Premium responsive application shell, executive dashboard, global search/command palette, notifications, light/dark themes, operational list views, filters, KPIs, and role-aware navigation foundation.
- Supabase PostgreSQL schema covering commercial, finance, supply chain, service, projects, HR, documents, approvals, activities, notifications, and immutable audit events.
- Permission-driven RLS, private Storage buckets, UUID keys, soft deletion, document sequences, versioned files, validation, typed service layer, and Auth session middleware.
- Branded A4 PDF engine and 12 configured templates: estimation, quotation, invoice, receipt, purchase order, delivery note, packing list, service report, employee letter, experience certificate, leave approval, and payment voucher.
- Excel import/export foundations with per-row validation errors.
- Docker standalone build, Nginx TLS reverse proxy, health endpoint, environment template, production and backup runbooks, and a 12-role access matrix.

## Local setup

Prerequisites: Node.js 22+, npm 10+, Docker, and Supabase CLI.

```bash
cp .env.example .env.local
npm ci
supabase start
supabase db reset
npm run dev
```

Open `http://localhost:3000`. If Supabase variables are omitted, the interface runs in presentation mode without authentication so the design can be reviewed. Set the variables to activate session enforcement.

## Project structure

```text
app/                 Next.js routes, layouts, Auth callback and health API
components/          ERP shell, dashboard, tables and reusable UI
lib/services/        Supabase service/repository layer
lib/pdf/             Branded PDF generator and template definitions
lib/export/          Excel import/export
lib/supabase/        Browser/server clients and session middleware
supabase/migrations/ Relational schema, RLS, Storage and audit controls
supabase/seed.sql     Roles, permissions, departments, sequences and master data
deploy/              Nginx production configuration
docs/                Deployment and role/access documentation
```

## Verification

```bash
npm run typecheck
npm run build
docker compose config
```

Before go-live, configure the real legal address, CR/tax data, bank accounts, email provider, document terms, approval thresholds, product masters, opening stock, chart of accounts, and user-role assignments. Execute a user-acceptance cycle per department and a restore drill before importing production data.

See [production deployment](docs/PRODUCTION.md) and [role matrix](docs/ROLE_MATRIX.md).
