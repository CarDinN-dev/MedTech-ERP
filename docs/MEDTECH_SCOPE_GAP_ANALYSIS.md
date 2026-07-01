# MedTech Scope Gap Analysis

Local inspection date: 2026-06-30

Source package checked:
- `C:\Users\Lenovo\OneDrive\Desktop\Workflow\README.md`
- `02_Process_Flows\Sales_Process_Steps.xlsx`
- `03_Master_Templates_Dummy\Customer_Master_Dummy.xlsx`
- `03_Master_Templates_Dummy\Supplier_Master_Dummy.xlsx`
- `03_Master_Templates_Dummy\Product_Master_Dummy.xlsx`
- `03_Master_Templates_Dummy\Employee_Master_Dummy.xlsx`
- `04_Estimation_Sheet\Bidder_Scope_and_Cost_Commitment.xlsx`
- pasted full ERP scope request

## Existing

- Next.js local ERP shell, sidebar, dashboard, command palette, notifications, demo login, theme toggle.
- Generic module workspace with tabs, KPI cards, search, status filters, sort, row selection, CRUD modal, Excel import/export, PDF export, reset, and audit logging.
- HR workspace with Employee Master, 90-field employee import template, onboarding, employee drawer, attendance, leave, recruitment, payroll, WPS export, loans, leave settlement, final payroll locking, and HR PDFs.
- Local demo data layer via `medtech-demo:*` localStorage keys.
- Audit log via `medtech-demo:audit:v1`.
- Branded PDF generator and existing document template gallery.
- Excel helpers using local browser/file processing.
- Supabase schema/service scaffolding exists, but demo mode bypasses it when env variables are empty.

## Partial

- Sales, procurement, inventory, finance, service, projects, documents, approvals, reports, and admin existed as generic list workspaces with sample tabs.
- Approval handling existed for simple approval records, but not as a shared approval matrix engine.
- Inventory had backend-oriented warehouse types and movement constants, but UI coverage was thin.
- PDF templates covered many document classes, but generated document tracking was not complete.
- Reports existed as static report rows, not a scope-wide KPI dashboard.
- Local integrations existed only as concepts; WPS and attendance import were the most complete.

## Missing Before This Pass

- Master setup/config tabs for business units, cost centers, thresholds, document sequences, workflow statuses, currencies, payment terms, warehouses, and locations.
- Full customer hierarchy and supplier/principal/product master tabs matching dummy workbook columns.
- Universal Enquiry Pool, BANT qualification, lead claim/conflict workflow.
- Four sales pathway workspaces: Straight Forward Sales, GPPRR, Pharma Tender, Project Sales.
- Shared approval matrix fields and blocking validation.
- Commission engine rows/calculation surface.
- Procurement supplier comparison, GRN to vendor bill draft visibility.
- Inventory FEFO, expiry alerts, quarantine/QC, engineer stock, bundled kits.
- Finance local simulation for credit/debit notes, journals, bank reconciliation, FX, fixed assets, advance/progress/retention billing, and finance demo reports.
- Service job pool, AMC, spare parts, engineer dispatch, closure-to-invoice draft.
- Project department quotes, milestone billing, closure checklist.
- Generated document register.
- Executive KPI and integration simulator screens.
- Automation Monitor with local trigger execution.
- Data Import Center and UAT tracker.

## Built In This Foundation Pass

- Added broad local seed views for the missing tabs above.
- Added module tab wiring so the new scope is visible in the existing sidebar modules.
- Added local workflow action support for selected records: submit, approve, reject, cancel.
- Added required-field validation for high-impact workflow actions.
- Added local Automation Monitor runner that writes local demo automation events and audit entries only.
- Added status tracking in `docs/LOCAL_IMPLEMENTATION_STATUS.md`.

## Files / Modules Affected

- `lib/medtech-scope-data.ts`: new local-only seed views.
- `lib/local-workflows.ts`: new local-only workflow validation and automation helpers.
- `lib/demo-tabs.ts`: imports the new seed views.
- `lib/erp-data.ts`: expanded tabs per module.
- `components/module-workspace.tsx`: workflow action bar and Run Demo Automations button.
- `docs/MEDTECH_SCOPE_GAP_ANALYSIS.md`: this checklist.
- `docs/LOCAL_IMPLEMENTATION_STATUS.md`: implementation tracker.

## Implementation Priority

1. Master setup and master data foundation.
2. CRM / Universal Enquiry Pool and BANT.
3. Sales 4-pathway workflows.
4. Approval matrix and commissions.
5. Procurement to inventory to finance linked record generation.
6. Service and project billing links.
7. HR child extensions only, without changing Employee Master.
8. Documents, KPIs, simulators, automation, import center, UAT.

## Remaining Build Work

- Replace several seeded demo rows with richer local calculations and linked record creation.
- Add import templates for non-HR masters using the dummy workbook headers.
- Expand PDF templates only where the existing generic templates are not enough.
- Add focused tests for workflow action validation and automation monitor output.
- Add richer executive KPI calculations from local snapshots.
