# MedTech ERP client demonstration

Double-click `Start-MedTech-Demo.cmd`. The first launch builds the application, starts it in Docker, and opens `http://localhost:3000`.

## Sign in and user administration

- Login page: `http://localhost:3000/login`
- Presentation administrator: **Kashif** (`admin@medtech.qa`)
- Password: `MedTech@2026`
- Add a user: open **Administration → Users → Add user**, enter a temporary password, choose a role and department, set the status to Active, then save.
- Change a user's role: open the user row (or its three-dot menu), choose the new role, then save.
- Manage role definitions: open **Administration → Roles & permissions**.
- Logout: open the profile menu in the top-right corner and select **Sign out**.

New local-demo users can sign in immediately using the email and temporary password entered by the administrator.

## Detailed record PDFs

1. Open any ERP module and tab.
2. Select one or more table rows using the checkboxes.
3. Choose **Download detailed PDF** above the table.

The PDF uses the selected record data, includes MedTech branding, Kashif as the preparer for the presentation account, approval/signature areas, and an audit entry. Procurement RFQs include additional supplier, buyer, commercial-term, scope, and technical-requirement details.

## What works offline

- All ERP navigation, dashboards, tabs, responsive layouts, dark mode, notifications, and global command search.
- Login, authenticated sessions, local user creation, role assignment, and logout.
- Create, view, edit, and delete records in every module.
- Persistent local demo records: changes remain after refreshing the browser.
- Search and status filters across operational tables.
- Excel import and export.
- Approval and rejection actions in the Approvals module.
- Twelve downloadable branded PDF document templates.
- Activity history, internal-note interface, reset per module, and reset all data from the user menu.

The demo intentionally uses browser-local data so it can be shown without internet access, Supabase credentials, or customer data. The production-ready Supabase schema, RLS, Auth, Storage, audit and deployment files remain included for the later connected deployment.

To stop it, double-click `Stop-MedTech-Demo.cmd`.
