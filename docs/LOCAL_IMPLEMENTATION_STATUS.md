# Local Implementation Status

Local-only rule: active. This ERP phase uses localStorage, demo-store, demo-auth, audit-store, local Excel parsing/export, and local PDF generation only.

## Completed

- Step 1 local ERP foundation implemented.
- Shared local foundation types/helpers added for business units, departments, cost centers, customer hierarchy, suppliers/principals, products/SKUs, warehouses, locations, lots/batches/serials, currencies, payment terms, approval roles, document sequences, and workflow statuses.
- Reusable helpers added: `generateDocumentNumber`, `titleCaseNormalize`, `validateRequiredFields`, `validatePercentageTotal`, `calculateAgeInDays`, `statusTone`, and `createLocalRelationshipLookup`.
- Admin Master Setup tabs added: Business Units, Departments, Cost Centers, Document Sequences, Approval Thresholds, Currencies, Payment Terms, Workflow Statuses.
- Scope package inspected locally.
- Gap analysis created.
- Master setup tabs added under Administration.
- Document sequences added.
- Customer, supplier, and product master tabs added using the dummy template column shape.
- Universal Enquiry Pool, BANT Qualification, Lead Claims added.
- Four sales pathway tabs added: Straight Forward Sales, GPPRR, Pharma Tender, Project Sales.
- Commission tab added.
- Approval Matrix tab added.
- Procurement supplier comparison, goods receipts, and vendor bill drafts added.
- Inventory FEFO, expiry alerts, quarantine/QC, engineer stock, and kits added.
- Finance local simulation tabs added: customer invoices, vendor bills, credit notes, debit notes, journals, advance/progress/retention, fixed assets, bank reconciliation, FX revaluation, reports.
- Service tabs added: job pool, AMC contracts, spare parts, engineer dispatch, service closure.
- Project tabs added: department quotes, milestone billing, closure checklist.
- Generated document register added.
- Executive KPI and integration simulator tabs added.
- Automation Monitor tab added with Run Demo Automations button.
- Data Import Center and UAT Tracker added.
- Selected-row workflow actions added: submit, approve, reject, cancel.
- Required-field validation added for critical workflow stage moves.
- Audit logs added for workflow actions and automation runs.

## In Progress

- Rich linked-record creation beyond the automation monitor seed events.
- More complete local calculations for commissions, FX, depreciation, inventory valuation, SLA, and project margins.
- Non-HR import templates and row validators.

## Not Started

- Full local sales order generation from won quote.
- Full GRN stock balance update math.
- Full vendor bill / customer invoice posting ledger simulation.
- Full service mobile preview and customer portal preview.
- Full e-invoicing XML preview renderer.
- Full migration reconciliation dashboard.

## Known Limitations

- New non-HR modules are currently broad local demo surfaces with seed rows and workflow controls.
- Automation runner creates local demo events; it does not yet traverse every source snapshot and generate every downstream record.
- Some PDFs use existing generic templates until dedicated layouts are worth adding.
- No backend persistence; resetting demo data clears localStorage records.

## Local-Only Simulators

- Bank Statement Import: local demo tab only.
- WPS Export: existing local payroll Excel flow.
- Attendance Machine Import: existing local Excel import flow.
- WhatsApp / Email Lead Intake: local demo tab only.
- Tender Portal Import: local demo tab only.
- Barcode Scan Simulator: local demo tab only.
- E-Invoicing XML Preview: placeholder, local only.
- SharePoint / Document Archive Placeholder: placeholder, local only.
- Power BI / Data Export Placeholder: placeholder, local only.
- Customer Portal Preview: placeholder, local only.
- Engineer Mobile View Preview: placeholder, local only.
- SMS/Email Notification Queue Preview: placeholder, local only.

## Testing Status

- Passed: `npm.cmd run typecheck`
- Passed with existing warnings: `npm.cmd run lint`
- Passed with existing warnings: `npm.cmd run build`
- Passed: Playwright smoke via local script against `http://localhost:3005` for login, Sales BANT workflow action, and Admin Automation Monitor.
- Passed: Playwright smoke via local script against `http://localhost:3006` for Admin setup tabs: Business Units, Departments, Cost Centers, Document Sequences, Approval Thresholds, Currencies, Payment Terms.

## Employee Master Confirmation

- Employee Master fields, import format, UI, onboarding flow, and normalization were not changed in this phase.
- New employee-related rows use child data fields such as `Employee Code`, `Employee`, and `Engineer`.
