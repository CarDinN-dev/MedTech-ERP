"use client";

import type { RecordFieldType } from "@/components/record-modal";
import { appendAuditLog } from "@/lib/audit-store";
import { createDemoRecord, readDemoRecordsSnapshot, writeDemoRecordsSnapshot, type DemoRecord } from "@/lib/demo-store";
import { parseExcel } from "@/lib/export/excel";
import type { MasterDataConfig } from "@/lib/master-data";
import { medtechScopeViews } from "@/lib/medtech-scope-data";

type Row = Record<string, string>;

export type FinanceAction = "generate-customer-invoice" | "generate-service-invoice" | "generate-amc-invoice" | "generate-project-invoice" | "match-payment" | "revalue-fx" | "refresh-reports";
export interface FinanceActionButton { action: FinanceAction; label: string; requiresSelection?: boolean; }

export const financeColumns: Record<string, string[]> = {
  "Customer Invoices": ["Invoice No", "Source Module", "Customer", "Currency", "Lines", "Subtotal", "Tax", "Total", "Due Date", "Status"],
  "Vendor Bills": ["Bill No", "Source Module", "Supplier", "Currency", "Lines", "Subtotal", "Tax", "Total", "Due Date", "Status"],
  Payments: ["Payment No", "Type", "Party", "Date", "Method", "Amount", "Currency", "Matched To", "Status"],
  "Credit Notes": ["Credit Note No", "Linked Invoice/Bill", "Party", "Date", "Amount", "Reason", "Status"],
  "Debit Notes": ["Debit Note No", "Linked Invoice/Bill", "Party", "Date", "Amount", "Reason", "Status"],
  "Chart of Accounts": ["Account Code", "Account Name", "Account Type", "Parent Account", "Currency", "Active", "Notes"],
  "Journal Types": ["Journal Type", "Code", "Default Status", "Requires Review", "Active", "Notes"],
  "Tax/VAT Setup": ["Tax Code", "Tax Name", "Rate %", "Sales Applicable", "Purchase Applicable", "Active"],
  "Posting Rules": ["Rule", "Source Document", "Journal Type", "Debit Account", "Credit Account", "Tax Code", "Status", "Notes"],
  "Accounting Periods": ["Period", "Month", "Year", "Status", "Locked By", "Locked At", "Notes"],
  "Source Document Mapping": ["Source Document", "Source Module", "Journal Type", "Debit Account", "Credit Account", "Tax Code", "Notes", "Status"],
  Journals: ["Journal No", "Journal Type", "Source Module", "Source Record", "Date", "Debit Lines", "Credit Lines", "Total Debit", "Total Credit", "Validation", "Period", "Status"],
  "Bank Reconciliation Import": ["Statement Row", "Date", "Reference", "Description", "Amount", "Matched To", "Exception", "Status"],
  "Fixed Assets": ["Asset No", "Asset", "Category", "Acquisition Date", "Cost", "Useful Life Months", "Monthly Depreciation", "Book Value", "Status"],
  "FX Revaluation": ["Run No", "Currency", "Rate Date", "Old Rate", "New Rate", "Open AR/AP", "Gain / Loss", "Journal Draft", "Status"],
  "Advance / Progress / Retention Invoices": ["Invoice No", "Project / Agreement", "Customer", "Invoice Type", "Milestone", "Amount", "Retention %", "Approval Status", "Posting Status", "Status"],
  "Financial Reports": ["Report", "Period", "Basis", "Metric", "Value", "Status"]
};

const firstColumn = Object.fromEntries(Object.entries(financeColumns).map(([tab, columns]) => [tab, columns[0]]));
const prefixes: Record<string, string> = {
  "Customer Invoices": "INV-DRAFT-2026-",
  "Vendor Bills": "BILL-DRAFT-2026-",
  Payments: "PAY-LOCAL-2026-",
  "Credit Notes": "CN-DRAFT-2026-",
  "Debit Notes": "DN-DRAFT-2026-",
  Journals: "JRN-DRAFT-2026-",
  "Chart of Accounts": "ACC-",
  "Journal Types": "JT-",
  "Tax/VAT Setup": "TAX-",
  "Posting Rules": "PR-",
  "Accounting Periods": "PER-",
  "Bank Reconciliation Import": "BNK-ROW-2026-",
  "Fixed Assets": "FA-2026-",
  "FX Revaluation": "FXR-2026-",
  "Advance / Progress / Retention Invoices": "PBI-DRAFT-2026-"
};

const accountingSeedRows: Record<string, Row[]> = {
  "Chart of Accounts": [
    account("1000", "Assets", "Asset", "", "Header account"),
    account("1100", "Cash and Bank", "Asset", "1000", "Local bank and cash simulation"),
    account("1200", "Accounts Receivable", "Asset", "1000", "Customer control account"),
    account("1300", "Inventory", "Asset", "1000", "Stock valuation"),
    account("1500", "Fixed Assets", "Asset", "1000", "Demo fixed assets"),
    account("2000", "Liabilities", "Liability", "", "Header account"),
    account("2100", "Accounts Payable", "Liability", "2000", "Vendor control account"),
    account("2200", "VAT Payable", "Liability", "2000", "Local tax simulation only"),
    account("2300", "Payroll Payable", "Liability", "2000", "Payroll clearing"),
    account("3000", "Equity", "Equity", "", "Retained earnings simulation"),
    account("4000", "Sales Revenue", "Income", "", "Sales and service revenue"),
    account("4100", "Sales Returns", "Income", "4000", "Credit note contra income"),
    account("5000", "Cost of Goods Sold", "Expense", "", "Inventory issue cost"),
    account("5100", "Salary Expense", "Expense", "", "Payroll cost"),
    account("5200", "Depreciation Expense", "Expense", "", "Fixed asset depreciation"),
    account("5300", "FX Gain/Loss", "Expense", "", "FX revaluation simulation")
  ],
  "Journal Types": [
    journalType("Sales Journal", "SJ"),
    journalType("Purchase Journal", "PJ"),
    journalType("Bank Journal", "BJ"),
    journalType("Cash Journal", "CJ"),
    journalType("Payroll Journal", "PAY"),
    journalType("Inventory Journal", "INV"),
    journalType("Adjustment Journal", "ADJ")
  ],
  "Tax/VAT Setup": [
    { "Tax Code": "VAT-LOCAL-00", "Tax Name": "Local zero-rate simulation", "Rate %": "0", "Sales Applicable": "Yes", "Purchase Applicable": "Yes", Active: "Yes" },
    { "Tax Code": "VAT-SIM-05", "Tax Name": "Demo VAT 5% inactive", "Rate %": "5", "Sales Applicable": "Yes", "Purchase Applicable": "Yes", Active: "No" },
    { "Tax Code": "NON-TAX", "Tax Name": "Out of scope", "Rate %": "0", "Sales Applicable": "Yes", "Purchase Applicable": "Yes", Active: "Yes" }
  ],
  "Posting Rules": [
    rule("Sales invoice", "Sales Journal", "1200 Accounts Receivable", "4000 Sales Revenue", "VAT-LOCAL-00"),
    rule("Customer payment", "Bank Journal", "1100 Cash and Bank", "1200 Accounts Receivable", "NON-TAX"),
    rule("Credit note", "Sales Journal", "4100 Sales Returns", "1200 Accounts Receivable", "VAT-LOCAL-00"),
    rule("Vendor bill", "Purchase Journal", "1300 Inventory", "2100 Accounts Payable", "VAT-LOCAL-00"),
    rule("Vendor payment", "Bank Journal", "2100 Accounts Payable", "1100 Cash and Bank", "NON-TAX"),
    rule("Debit note", "Purchase Journal", "2100 Accounts Payable", "1300 Inventory", "VAT-LOCAL-00"),
    rule("Payroll finalization", "Payroll Journal", "5100 Salary Expense", "2300 Payroll Payable", "NON-TAX"),
    rule("EOS/final settlement", "Payroll Journal", "5100 Salary Expense", "2300 Payroll Payable", "NON-TAX"),
    rule("Inventory adjustment", "Inventory Journal", "5000 Cost of Goods Sold", "1300 Inventory", "NON-TAX"),
    rule("Stock receipt", "Inventory Journal", "1300 Inventory", "2100 Accounts Payable", "NON-TAX"),
    rule("Fixed asset depreciation", "Adjustment Journal", "5200 Depreciation Expense", "1500 Fixed Assets", "NON-TAX"),
    rule("FX revaluation", "Adjustment Journal", "5300 FX Gain/Loss", "1200 Accounts Receivable", "NON-TAX")
  ],
  "Accounting Periods": [
    period("June 2026", "June", "2026", "Open", "", "", "Current demo posting period"),
    period("May 2026", "May", "2026", "Locked", "Finance Manager", "2026-06-05", "Locked periods block approved posting simulations"),
    period("July 2026", "July", "2026", "Soft Closed", "", "", "Soft close warning only in local demo")
  ],
  Journals: [
    {
      "Journal No": "JRN-DRAFT-2026-0088", "Journal Type": "Payroll Journal", "Source Module": "Payroll", "Source Record": "MPR-MEDTECH-2026-06-Sales", Date: "2026-06-30",
      "Debit Lines": "5100 Salary Expense=QAR 277600", "Credit Lines": "2300 Payroll Payable=QAR 277600", "Total Debit": "QAR 277600", "Total Credit": "QAR 277600", Validation: "Balanced", Period: "June 2026", Status: "Draft"
    },
    {
      "Journal No": "JRN-DRAFT-2026-0089", "Journal Type": "Inventory Journal", "Source Module": "Inventory Adjustment", "Source Record": "CYC-2026-0012", Date: "2026-06-30",
      "Debit Lines": "5000 Cost of Goods Sold=QAR 8520", "Credit Lines": "1300 Inventory=QAR 8520", "Total Debit": "QAR 8520", "Total Credit": "QAR 8520", Validation: "Balanced", Period: "June 2026", Status: "Draft"
    }
  ]
};

accountingSeedRows["Source Document Mapping"] = accountingSeedRows["Posting Rules"].map(row => ({
  "Source Document": row["Source Document"],
  "Source Module": sourceModuleFor(row["Source Document"]),
  "Journal Type": row["Journal Type"],
  "Debit Account": row["Debit Account"],
  "Credit Account": row["Credit Account"],
  "Tax Code": row["Tax Code"],
  Notes: row.Notes,
  Status: row.Status
}));

export function getFinanceConfig(tab: string): MasterDataConfig | null {
  const columns = financeColumns[tab];
  if (!columns) return null;
  return {
    keyColumn: firstColumn[tab],
    filterColumns: columns.filter(column => ["Source Module", "Currency", "Type", "Category", "Invoice Type", "Approval Status", "Posting Status", "Status"].includes(column)),
    searchColumns: columns,
    selectOptions: selectOptionsFor(tab),
    fieldTypes: fieldTypesFor(columns),
    defaultValues: defaultsFor(tab),
    suggestions: {},
    prepareSave: (input, records, selected) => prepareFinanceRow(tab, input, records, selected),
    validateImportRow: (input, rowNumber, records, seen) => prepareFinanceRow(tab, input, records, null, rowNumber, seen)
  };
}

export function getFinanceView(tab: string) {
  const columns = financeColumns[tab];
  if (!columns) return null;
  return { columns, rows: accountingSeedRows[tab] ?? medtechScopeViews[`finance.${tab}`]?.rows ?? [] };
}

export function financeActionsFor(moduleKey: string, tab: string): FinanceActionButton[] {
  if (moduleKey === "sales" && tab === "Orders") return [{ action: "generate-customer-invoice" as const, label: "Finance invoice" }];
  if (moduleKey === "service" && tab === "Service Closure") return [{ action: "generate-service-invoice" as const, label: "Finance invoice" }];
  if (moduleKey === "service" && tab === "AMC Contracts") return [{ action: "generate-amc-invoice" as const, label: "AMC invoice" }];
  if (moduleKey === "projects" && ["Milestones", "Milestone Billing"].includes(tab)) return [{ action: "generate-project-invoice" as const, label: "Project invoice" }];
  if (moduleKey === "finance" && tab === "Payments") return [{ action: "match-payment" as const, label: "Match payment" }];
  if (moduleKey === "finance" && tab === "FX Revaluation") return [{ action: "revalue-fx" as const, label: "Draft FX journal" }];
  if (moduleKey === "finance" && tab === "Financial Reports") return [{ action: "refresh-reports" as const, label: "Refresh reports", requiresSelection: false }];
  return [];
}

export function financeWorkflowError(tab: string, action: string, record: Row) {
  if (tab !== "Journals") return "";
  if (!["approve", "finalize/post/lock"].includes(action)) return "";
  return validateJournal(record) || approvedPostingError({ ...record, Status: action === "approve" ? "Approved" : "Locked" });
}

export function runFinanceAction(action: FinanceAction, records: DemoRecord[], currentUser: string) {
  if (action === "refresh-reports") return refreshFinanceReports();
  if (!records.length) return { error: "Select at least one record first." };
  if (action === "match-payment") return matchPayments(records);
  if (action === "revalue-fx") return revalueFx(records);
  const rows: Row[] = records.map((record, index) => invoiceFromSource(action, record, index));
  const tab = action === "generate-project-invoice" ? "Advance / Progress / Retention Invoices" : "Customer Invoices";
  writeRows(tab, rows, firstColumn[tab]);
  rows.forEach(row => createJournalFromRule("Sales invoice", row["Source Module"] || "Finance", row["Invoice No"], money(row.Total), currentUser, "Draft"));
  appendAuditLog({ action: "FINANCE DRAFT", module: "Finance", record: rows.map(row => row[firstColumn[tab]]).join(", "), details: `${rows.length} local ${tab.toLowerCase()} generated by ${currentUser}` });
  return { targetModule: "finance", targetTab: tab, sourceUpdates: records.map((record, index) => sourceUpdate(action, rows[index], record)), message: `${rows.length} local finance draft${rows.length === 1 ? "" : "s"} created` };
}

export async function importFinanceRows(file: File, tab: string, records: DemoRecord[]) {
  const config = getFinanceConfig(tab);
  if (!config) return { valid: [], errors: [{ row: 0, message: "Unsupported finance import" }], total: 0 };
  if (file.name.toLowerCase().endsWith(".csv")) {
    const rows = parseCsv(await file.text());
    const seen = new Set<string>();
    const valid: Row[] = [];
    const errors: Array<{ row: number; message: string }> = [];
    rows.forEach((row, index) => {
      try { valid.push(config.validateImportRow(row, index + 2, records, seen)); }
      catch (error) { errors.push({ row: index + 2, message: error instanceof Error ? error.message : "Invalid row" }); }
    });
    return { valid, errors, total: rows.length };
  }
  return parseExcel<Row>(file, (row, rowNumber) => config.validateImportRow(row as Record<string, unknown>, rowNumber, records, new Set<string>()));
}

export function writeFinanceJournalDraft(input: { sourceModule: string; sourceRecord: string; amount: string; debit: string; credit: string; debitLines?: string; creditLines?: string; journalType?: string; status?: string; date?: string; notes?: string; costCenter?: string }) {
  const amount = money(input.amount);
  const date = input.date || today();
  const debitLines = input.debitLines || line(input.debit, amount);
  const creditLines = input.creditLines || line(input.credit, amount);
  const row = {
    "Journal No": nextTargetId("Journals"),
    "Journal Type": input.journalType || "Adjustment Journal",
    "Source Module": input.sourceModule,
    "Source Record": input.sourceRecord,
    Date: date,
    "Debit Lines": debitLines,
    "Credit Lines": creditLines,
    "Total Debit": qar(lineTotal(debitLines)),
    "Total Credit": qar(lineTotal(creditLines)),
    Validation: "Balanced",
    Period: periodLabel(date),
    Status: input.status || "Draft"
  };
  const error = validateJournal(row) || approvedPostingError(row);
  if (error) throw new Error(error);
  writeRows("Journals", [row], "Journal No");
  appendAuditLog({ action: "DRAFT JOURNAL", module: "Finance", record: row["Journal No"], details: `${input.sourceModule} ${input.sourceRecord} - local draft only` });
  return row;
}

export function financeReportRows() {
  const ar = total(readFinanceRows("Customer Invoices"), "Total");
  const ap = total(readFinanceRows("Vendor Bills"), "Total");
  const cash = total(readFinanceRows("Payments").filter(row => row.Type === "Customer payment" || row.Type === "Receipt"), "Amount") - total(readFinanceRows("Payments").filter(row => row.Type === "Vendor payment"), "Amount");
  const journalRows = readFinanceRows("Journals");
  const debits = total(journalRows, "Total Debit");
  const credits = total(journalRows, "Total Credit");
  return [
    report("Balance Sheet", "Assets less liabilities", qar(cash + ar - ap)),
    report("P&L", "Demo operating result", qar(ar - ap)),
    report("Cash Flow", "Net local payment movement", qar(cash)),
    report("Trial Balance", debits === credits ? "Balanced local journals" : "Unbalanced local journals", qar(debits - credits)),
    report("General Ledger", "Draft journal count", String(journalRows.length)),
    report("Partner Ledger", "Customers and suppliers", String(partnerCount())),
    report("Aged Receivables", "Open AR", qar(ar)),
    report("Aged Payables", "Open AP", qar(ap))
  ];
}

function prepareFinanceRow(tab: string, input: Record<string, unknown>, records: DemoRecord[], selected?: DemoRecord | null, rowNumber = 0, seen = new Set<string>()) {
  const columns = financeColumns[tab];
  const row = Object.fromEntries(columns.map(column => [column, String(input[column] ?? defaultsFor(tab)[column] ?? "").trim()])) as Row;
  const key = firstColumn[tab];
  if (!row[key] || row[key] === "Auto generated") row[key] = nextId(tab, records);
  if (["Customer Invoices", "Vendor Bills"].includes(tab)) {
    const subtotal = money(row.Subtotal || row.Total);
    const tax = money(row.Tax);
    row.Subtotal = qar(subtotal);
    row.Tax = qar(tax);
    row.Total = qar(money(row.Total) || subtotal + tax);
  }
  if (tab === "Fixed Assets") {
    const monthly = Math.round((money(row.Cost) / Math.max(1, money(row["Useful Life Months"]))) * 100) / 100;
    const age = Math.max(0, monthDiff(row["Acquisition Date"], today()));
    row["Monthly Depreciation"] = qar(monthly);
    row["Book Value"] = qar(Math.max(0, money(row.Cost) - monthly * age));
  }
  if (tab === "Journals") {
    row.Period = row.Period || periodLabel(row.Date);
    row["Total Debit"] = qar(lineTotal(row["Debit Lines"]) || money(row["Total Debit"]));
    row["Total Credit"] = qar(lineTotal(row["Credit Lines"]) || money(row["Total Credit"]));
    const validation = validateJournal(row);
    row.Validation = validation || "Balanced";
    if (validation) throw new Error(prefix(rowNumber) + validation);
    const blocked = approvedPostingError(row);
    if (blocked) throw new Error(prefix(rowNumber) + blocked);
  }
  if (tab === "Accounting Periods" && row.Status === "Locked" && !row["Locked At"]) row["Locked At"] = today();
  if (tab === "Bank Reconciliation Import") Object.assign(row, matchStatementRow(row));
  const missing = requiredFor(tab).filter(field => !row[field]);
  if (missing.length) throw new Error(prefix(rowNumber) + `Missing ${missing.join(", ")}`);
  if (tab !== "Financial Reports") assertUnique(row[key], key, records, seen, rowNumber, selected);
  return row;
}

function invoiceFromSource(action: FinanceAction, record: Row, index: number): Row {
  if (action === "generate-project-invoice") return {
    "Invoice No": nextTargetId("Advance / Progress / Retention Invoices", index + 1),
    "Project / Agreement": record.Project || record["Project / SO"] || record["Project Deal"] || "Project",
    Customer: record.Customer || record.Client || "Project customer",
    "Invoice Type": (record["Billing Type"] || record.Type) === "Retention" ? "Retention Invoice" : (record["Billing Type"] || record.Type) === "Progress" ? "Progress Invoice" : "Advance Invoice",
    Milestone: record.Description || record.Milestone || record["Milestone No"] || "Milestone billing",
    Amount: amountFrom(record.Amount || record.Value || billingAmount(record)),
    "Retention %": record["Retention %"] || record.Retention || "0",
    "Approval Status": "Pending approval",
    "Posting Status": "Not posted - local draft only",
    Status: "Draft"
  };
  const sourceModule = action === "generate-service-invoice" ? "Service Closure" : action === "generate-amc-invoice" ? "AMC Cycle" : "Sales Order";
  const sourceNo = record.Order || record.Closure || record.AMC || record["AMC Contract No"] || record["Job No"] || record["Sign-Off No"] || record.Deal || record["Project Deal"] || "Manual";
  return {
    "Invoice No": nextTargetId("Customer Invoices", index + 1),
    "Source Module": sourceModule,
    Customer: record.Customer || record.Client || record.Party || "Customer",
    Currency: "QAR",
    Lines: record.Products || record.Equipment || record["Installed base"] || record["Customer sign-off"] || "Local demo billing lines",
    Subtotal: amountFrom(record.Total || record.Amount || "QAR 0"),
    Tax: "QAR 0",
    Total: amountFrom(record.Total || record.Amount || "QAR 0"),
    "Due Date": dateOffset(30),
    Status: "Draft",
    Source: sourceNo
  };
}

function sourceUpdate(action: FinanceAction, invoice: Row, source: Row) {
  if (action === "generate-service-invoice") return { "Invoice draft": invoice["Invoice No"], "Invoice Draft": invoice["Invoice No"], "Finance Invoice Draft": invoice["Invoice No"], Status: "Invoice drafted" };
  if (action === "generate-amc-invoice") return { "Invoice schedule": source["Invoice schedule"] || "Cycle drafted", Status: "Invoice drafted" };
  if (action === "generate-project-invoice") return { "Invoice draft": invoice["Invoice No"], "Invoice Draft Status": "Drafted", Status: "Invoice drafted" };
  return { "Invoice draft": invoice["Invoice No"], Status: "Invoice drafted" };
}

function matchPayments(records: DemoRecord[]) {
  const updates = records.map(record => {
    const match = findOpenDocument(record.Party, money(record.Amount));
    if (match) createJournalFromRule(record.Type === "Vendor payment" ? "Vendor payment" : "Customer payment", "Finance", record["Payment No"], money(record.Amount), "Finance Manager", "Draft");
    return match ? { "Matched To": match, Status: "Matched" } : { "Matched To": "", Status: "Exception" };
  });
  appendAuditLog({ action: "MATCH PAYMENT", module: "Finance", record: records.map(row => row["Payment No"]).join(", "), details: `${records.length} local payment match attempt${records.length === 1 ? "" : "s"}` });
  return { sourceUpdates: updates, message: `${records.length} payment${records.length === 1 ? "" : "s"} matched locally` };
}

function revalueFx(records: DemoRecord[]) {
  const journals = records.map(record => createJournalFromRule("FX revaluation", "FX Revaluation", record["Run No"], money(record["Gain / Loss"]), "Finance Manager", "Draft"));
  return { targetModule: "finance", targetTab: "Journals", sourceUpdates: journals.map(journal => ({ "Journal Draft": journal["Journal No"], Status: "Draft journal created" })), message: `${journals.length} FX adjustment journal${journals.length === 1 ? "" : "s"} drafted` };
}

function refreshFinanceReports() {
  const rows = financeReportRows();
  writeDemoRecordsSnapshot("finance:Financial Reports", rows.map(createDemoRecord));
  appendAuditLog({ action: "REFRESH REPORTS", module: "Finance", record: "Financial Reports", details: "Local demo reports recalculated from localStorage finance records" });
  return { targetModule: "finance", targetTab: "Financial Reports", message: `${rows.length} local finance reports refreshed` };
}

function matchStatementRow(row: Row) {
  const match = findOpenDocument(row.Reference, Math.abs(money(row.Amount))) || findPayment(Math.abs(money(row.Amount)));
  return match ? { "Matched To": match, Exception: "", Status: "Matched" } : { "Matched To": "", Exception: "No local amount/reference match", Status: "Exception" };
}

function findOpenDocument(partyOrRef = "", amount = 0) {
  const pool = [...readFinanceRows("Customer Invoices"), ...readFinanceRows("Vendor Bills")];
  const normalized = partyOrRef.toLowerCase();
  const match = pool.find(row => money(row.Total || row.Amount) === amount && (!normalized || Object.values(row).some(value => value.toLowerCase().includes(normalized))));
  return match?.["Invoice No"] || match?.["Bill No"] || "";
}

function findPayment(amount: number) {
  const match = readFinanceRows("Payments").find(row => money(row.Amount) === amount);
  return match?.["Payment No"] || "";
}

function writeRows(tab: string, rows: Row[], uniqueField: string) {
  const existing = readFinanceRows(tab);
  const keys = new Set(rows.map(row => row[uniqueField]).filter(Boolean));
  writeDemoRecordsSnapshot(`finance:${tab}`, [...rows.map(createDemoRecord), ...existing.filter(row => !keys.has(row[uniqueField]))].slice(0, 250));
}

function readFinanceRows(tab: string) {
  return readDemoRecordsSnapshot(`finance:${tab}`, accountingSeedRows[tab] ?? medtechScopeViews[`finance.${tab}`]?.rows ?? []);
}

function createJournalFromRule(sourceDocument: string, sourceModule: string, sourceRecord: string, grossAmount: number, currentUser: string, status = "Draft") {
  const postingRule = postingRuleFor(sourceDocument);
  const tax = taxFor(postingRule["Tax Code"], sourceDocument.toLowerCase().includes("vendor") || sourceDocument.toLowerCase().includes("purchase"));
  const taxAmount = Math.round(grossAmount * tax * 100) / 100;
  const netAmount = Math.max(0, grossAmount - taxAmount);
  const creditLines = taxAmount ? [line(postingRule["Credit Account"], netAmount), line("2200 VAT Payable", taxAmount)].join("; ") : line(postingRule["Credit Account"], grossAmount);
  return writeFinanceJournalDraft({
    sourceModule,
    sourceRecord,
    amount: qar(grossAmount),
    debit: postingRule["Debit Account"],
    credit: postingRule["Credit Account"],
    creditLines,
    journalType: postingRule["Journal Type"],
    status,
    notes: `${sourceDocument} mapped by ${currentUser}`
  }) as Row & { "Credit Lines": string };
}

export function validateJournal(row: Row) {
  const debit = lineTotal(row["Debit Lines"]) || money(row["Total Debit"]);
  const credit = lineTotal(row["Credit Lines"]) || money(row["Total Credit"]);
  if (!row["Debit Lines"] || !row["Credit Lines"]) return "Journal requires debit and credit lines.";
  if (Math.round((debit - credit) * 100) !== 0) return "Journal is not balanced.";
  return "";
}

function approvedPostingError(row: Row) {
  if (!["Approved", "Locked"].includes(row.Status)) return "";
  const period = periodFor(row.Date || today(), row.Period);
  return period?.Status === "Locked" ? `${period.Period} is locked; approved posting simulation is blocked.` : "";
}

function postingRuleFor(sourceDocument: string) {
  return accountingSeedRows["Posting Rules"].find(row => row["Source Document"] === sourceDocument) ?? accountingSeedRows["Posting Rules"][0];
}

function taxFor(taxCode: string, purchase: boolean) {
  const tax = readFinanceRows("Tax/VAT Setup").find(row => row["Tax Code"] === taxCode && row.Active === "Yes" && row[purchase ? "Purchase Applicable" : "Sales Applicable"] === "Yes");
  return (tax ? money(tax["Rate %"]) : 0) / 100;
}

function periodFor(date: string, label = "") {
  const period = label || periodLabel(date);
  return readFinanceRows("Accounting Periods").find(row => row.Period === period);
}

function line(accountName: string, amount: number) {
  return `${accountName}=QAR ${Math.round(amount * 100) / 100}`;
}

function lineTotal(lines = "") {
  return lines.split(";").reduce((sum, item) => sum + money(item.split("=").pop() || item), 0);
}

function requiredFor(tab: string) {
  return financeColumns[tab].filter(column => !["Tax", "Reason", "Exception", "Matched To", "Notes", "Journal Draft", "Parent Account", "Locked By", "Locked At"].includes(column));
}

function selectOptionsFor(tab: string) {
  return {
    "Source Module": ["Sales Order", "Service Closure", "AMC Cycle", "Project Milestone", "Procurement GRN", "Payroll", "Inventory Adjustment", "Manual"],
    "Source Document": accountingSeedRows["Posting Rules"].map(row => row["Source Document"]),
    "Journal Type": ["Sales Journal", "Purchase Journal", "Bank Journal", "Cash Journal", "Payroll Journal", "Inventory Journal", "Adjustment Journal"],
    "Account Type": ["Asset", "Liability", "Equity", "Income", "Expense"],
    Currency: ["QAR", "USD", "EUR", "GBP"],
    Active: ["Yes", "No"],
    "Sales Applicable": ["Yes", "No"],
    "Purchase Applicable": ["Yes", "No"],
    Type: ["Customer payment", "Vendor payment"],
    Method: ["Cash", "Cheque", "Bank transfer", "Local simulator"],
    Category: ["Service demo equipment", "Vehicles", "IT equipment", "Office equipment"],
    "Invoice Type": ["Advance Invoice", "Progress Invoice", "Retention Invoice"],
    "Approval Status": ["Draft", "Pending approval", "Approved", "Rejected"],
    "Posting Status": ["Not posted - local draft only", "Approved for posting", "Posted in demo"],
    Status: tab === "Accounting Periods" ? ["Open", "Soft Closed", "Locked"] : tab === "Journals" ? ["Draft", "Reviewed", "Approved", "Locked", "Cancelled"] : ["Draft", "Submitted", "Pending approval", "Approved", "Matched", "Exception", "Active", "Ready", "Cancelled"]
  };
}

function fieldTypesFor(columns: string[]) {
  return Object.fromEntries(columns.filter(column => column.includes("Date") || column === "Due Date" || column === "Locked At").map(column => [column, "date" as RecordFieldType]));
}

function defaultsFor(tab: string) {
  return { [firstColumn[tab]]: "Auto generated", "Source Module": "Manual", "Journal Type": "Adjustment Journal", "Source Record": "Manual", Currency: "QAR", Active: "Yes", "Sales Applicable": "Yes", "Purchase Applicable": "Yes", Date: today(), "Due Date": dateOffset(30), "Rate Date": today(), Method: "Local simulator", Type: "Customer payment", Tax: "QAR 0", "Retention %": "0", "Approval Status": "Draft", "Posting Status": "Not posted - local draft only", "Useful Life Months": "60", "Monthly Depreciation": "QAR 0", "Book Value": "QAR 0", "Total Debit": "QAR 0", "Total Credit": "QAR 0", Validation: "Balanced", Period: periodLabel(today()), Status: "Draft" };
}

function nextTargetId(tab: string, offset = 1) {
  return nextId(tab, readFinanceRows(tab), offset);
}

function nextId(tab: string, records: Row[], offset = 1) {
  const key = firstColumn[tab];
  const prefixValue = prefixes[tab] ?? "FIN-2026-";
  const max = records.map(record => Number(String(record[key] ?? "").replace(prefixValue, "").replace(/\D/g, ""))).filter(Number.isFinite).reduce((highest, value) => Math.max(highest, value), 0);
  return `${prefixValue}${String(max + offset).padStart(5, "0")}`;
}

function assertUnique(value: string, field: string, records: DemoRecord[], seen: Set<string>, rowNumber: number, selected?: DemoRecord | null) {
  const normalized = value.toLowerCase();
  if (seen.has(normalized)) throw new Error(prefix(rowNumber) + `Duplicate ${field} in import`);
  seen.add(normalized);
  const duplicate = records.find(record => record[field]?.toLowerCase() === normalized && record.__id !== selected?.__id);
  if (duplicate) throw new Error(prefix(rowNumber) + `${field} already exists`);
}

function report(reportName: string, metric: string, value: string) {
  return { Report: reportName, Period: "June 2026", Basis: "Local demo simulation", Metric: metric, Value: value, Status: "Ready" };
}

function account(code: string, name: string, type: string, parent: string, notes: string): Row {
  return { "Account Code": code, "Account Name": name, "Account Type": type, "Parent Account": parent, Currency: "QAR", Active: "Yes", Notes: notes };
}

function journalType(name: string, code: string): Row {
  return { "Journal Type": name, Code: code, "Default Status": "Draft", "Requires Review": "Yes", Active: "Yes", Notes: "Local accounting simulation" };
}

function rule(sourceDocument: string, journalTypeName: string, debit: string, credit: string, taxCode: string): Row {
  return { Rule: `Post ${sourceDocument}`, "Source Document": sourceDocument, "Journal Type": journalTypeName, "Debit Account": debit, "Credit Account": credit, "Tax Code": taxCode, Status: "Active", Notes: "Local source-document-to-journal mapping" };
}

function period(periodName: string, month: string, year: string, status: string, lockedBy: string, lockedAt: string, notes: string): Row {
  return { Period: periodName, Month: month, Year: year, Status: status, "Locked By": lockedBy, "Locked At": lockedAt, Notes: notes };
}

function sourceModuleFor(sourceDocument: string) {
  if (sourceDocument.includes("Sales") || sourceDocument.includes("Customer") || sourceDocument.includes("Credit")) return "Sales/Finance";
  if (sourceDocument.includes("Vendor") || sourceDocument.includes("Debit")) return "Procurement/Finance";
  if (sourceDocument.includes("Payroll") || sourceDocument.includes("EOS")) return "Payroll";
  if (sourceDocument.includes("Inventory") || sourceDocument.includes("Stock")) return "Inventory";
  if (sourceDocument.includes("Fixed asset") || sourceDocument.includes("FX")) return "Finance";
  return "Finance";
}

function partnerCount() {
  return new Set([...readFinanceRows("Customer Invoices").map(row => row.Customer), ...readFinanceRows("Vendor Bills").map(row => row.Supplier)].filter(Boolean)).size;
}

function total(rows: Row[], field: string) {
  return rows.reduce((sum, row) => sum + money(row[field]), 0);
}

function amountFrom(value = "") {
  return qar(money(value));
}

function billingAmount(record: Row) {
  const contract = money(record["Contract Value"]);
  const percent = money(record["Billing %"]);
  return contract && percent ? qar(contract * (percent / 100)) : "QAR 0";
}

function money(value = "") {
  const match = String(value).replace(/,/g, "").match(/-?\d+(?:\.\d+)?/);
  return match ? Number(match[0]) : 0;
}

function qar(value: number) {
  return `QAR ${Math.round(value * 100) / 100}`;
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

function periodLabel(dateValue: string) {
  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) return "June 2026";
  return new Intl.DateTimeFormat("en-US", { month: "long", year: "numeric" }).format(date);
}

function dateOffset(days: number) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

function monthDiff(from: string, to: string) {
  const start = new Date(from);
  const end = new Date(to);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return 0;
  return (end.getFullYear() - start.getFullYear()) * 12 + end.getMonth() - start.getMonth();
}

function parseCsv(text: string) {
  const [headerLine = "", ...lines] = text.trim().split(/\r?\n/);
  const headers = splitCsvLine(headerLine);
  return lines.filter(Boolean).map(line => Object.fromEntries(splitCsvLine(line).map((value, index) => [headers[index] || `Column ${index + 1}`, value])));
}

function splitCsvLine(line: string) {
  return line.match(/("([^"]|"")*"|[^,]+)/g)?.map(value => value.replace(/^"|"$/g, "").replaceAll('""', '"').trim()) ?? [];
}

function prefix(rowNumber: number) {
  return rowNumber ? `Row ${rowNumber}: ` : "";
}
