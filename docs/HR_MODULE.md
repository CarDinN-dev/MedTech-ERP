# Enterprise HR module

The HR workspace is integrated at `/hr` and uses the shared MedTech ERP shell, authentication, audit log, role model, notifications, Excel/PDF services, Storage conventions and approval engine.

## Areas

Dashboard, Employees, Departments, Recruitment, Attendance, Leave, Payroll, Loans & advances, Gratuity, Documents, Approvals, Reports, Self service and Settings are available from the HR sub-navigation.

The client presentation stores changes locally for offline use. The connected deployment uses migration `202606200004_enterprise_hr.sql` and private Storage bucket `hr-private`.

## Employee onboarding

The six-step flow captures Personal, Employment, Salary, Documents, Approvals and Account information. Completion generates an employee ID, prepares a portal account/folder, creates the employee record and writes an audit event.

## Excel import columns

Download the template from **People & HR → Employees → Download template**. Supported columns include:

`Employee ID`, `Employee`, `Email`, `Mobile`, `Gender`, `Nationality`, `Date of birth`, `Marital status`, `Department`, `Designation`, `Manager`, `Employment type`, `Joining date`, `Confirmation date`, `Basic salary`, `Housing allowance`, `Transport allowance`, `Bank`, `IBAN`, `QID expiry`, `Passport expiry`, `Visa expiry`, `Compliance`, `Status`.

Imports validate the employee name, report skipped rows, and keep the browser-local demonstration data isolated from production.

## HR PDFs

Offer letter, appointment letter, employment contract, salary certificate, experience certificate, warning letter, payslip, leave approval, clearance certificate, final settlement and gratuity statement use the shared MedTech PDF generator. Selected table records become the PDF source and every generation writes an audit entry.

## Approval paths

- Leave: Department Manager → HR Manager.
- Payroll: Payroll Manager → Finance Manager → Management.
- Recruitment: Department Manager → HR Manager → Management.
- Salary revision: HR Manager → Finance Manager → Management.
- Employee creation: HR Manager.

## Security boundary

- HR Officer and Payroll Manager receive explicit module permissions.
- Department Manager and Employee never receive broad `hr.view`; RLS scopes them to managed-team or own records.
- Salary, payroll and bank fields are excluded from generic detailed-record PDFs.
- Employee files use the private `hr-private` bucket and folder convention `employees/<auth-user-id>/...`.
- Authorization uses server-controlled role tables, never user-editable JWT metadata.
- All HR tables have RLS, UUID keys, timestamps, indexes and soft-delete support where applicable.

## Production validation

Apply migrations to staging, run Supabase security/performance advisors, test every role with dedicated accounts, verify Storage upload/read/update policies, exercise payroll segregation of duties, and complete an encrypted backup/restore drill before production launch.
