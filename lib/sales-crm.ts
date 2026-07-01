import type { DemoRecord } from "@/lib/demo-store";
import type { DemoTabView } from "@/lib/demo-tabs";
import type { RecordFieldType } from "@/components/record-modal";

type Row = Record<string, string>;

export interface SalesCrmConfig {
  keyColumn: string;
  filterColumns: string[];
  searchColumns: string[];
  selectOptions: Record<string, string[]>;
  fieldTypes: Record<string, RecordFieldType>;
  defaultValues: Record<string, string>;
  prepareSave: (input: Row, records: DemoRecord[], selected?: DemoRecord | null) => Row;
  validateImportRow: (row: Record<string, unknown>, rowNumber: number, records: DemoRecord[], seen: Set<string>) => Row;
}

export const salesLeadColumns = [
  "Enquiry No", "Source", "Received Date", "Contact Name", "Organization", "Email", "Phone", "Product Interest", "Suggested BU", "Product Category", "Assigned Salesperson", "Claim Status", "Pool Age", "BANT Budget Score", "BANT Authority Score", "BANT Need Score", "BANT Timeline Score", "BANT Total", "Qualification Result", "Disqualification Reason", "Nurture Reminder Date", "Current Status", "Notes"
];

export const inboundSourceOptions = ["Website", "WhatsApp", "Exhibition", "Principal Handover", "Tender Portal", "Existing Customer Referral", "Walk-in", "Telephone", "Email Alias", "Partner Referral", "Manual Entry"];

export const salesLeadRows: Row[] = [
  lead("ENQ-2026-0112", "Website", "2026-06-18", "Dr. Sara Al-Mannai", "Hamad Medical Corporation", "lab.procurement@hmc.org.qa", "+974 4439 0000", "Troponin I Reagent Kit", "Diagnostics", "Reagents", "Unassigned", "Unclaimed", "0 working days", "3", "2", "3", "2", "10", "Qualified", "", "", "New in Pool", "Urgent lab reagent enquiry from website form."),
  lead("ENQ-2026-0109", "Tender Portal", "2026-06-09", "Tender Committee", "Ministry of Public Health", "tenders@moph.gov.qa", "+974 4407 0000", "Cold-chain vaccine refrigerator tender", "Pharma", "Cold Chain", "F. Al-Kuwari", "Claimed", "0 working days", "0", "0", "0", "0", "0", "Disqualified", "", "2026-07-15", "Qualification Pending", "Tender scope unclear; follow up before bid/no-bid."),
  lead("ENQ-2026-0098", "Exhibition", "2026-06-02", "Noura Hassan", "Sidra Medicine", "icu.supply@sidra.org", "+974 4003 3333", "Patient Monitor MX750", "Medical Equipment", "Equipment", "R. Mathew", "Claimed", "0 working days", "3", "3", "3", "2", "11", "Qualified", "", "", "Qualified", "Clinical team requested ICU monitoring proposal."),
  lead("ENQ-2026-0087", "Email Alias", "2026-05-27", "George Mathew", "Pearl Medical Center", "pharmacy@pearlmedical.qa", "+974 4412 8800", "Generic PPE quote", "Pharma", "Consumables", "Unassigned", "Unclaimed", "0 working days", "1", "0", "1", "1", "3", "Disqualified", "No authority and low urgency", "", "New in Pool", "Old unclaimed enquiry should route to COO review.")
];

export const salesCrmViews: Record<string, DemoTabView> = {
  "sales.Universal Enquiry Pool": { columns: salesLeadColumns, rows: salesLeadRows },
  "sales.BANT Qualification": { columns: salesLeadColumns, rows: salesLeadRows },
  "sales.Lead Claims": { columns: salesLeadColumns, rows: salesLeadRows }
};

const businessUnits = ["Medical Equipment", "Diagnostics", "Pharma", "Lab", "Service", "Projects"];
const categories = ["Equipment", "Reagents", "Consumables", "Cold Chain", "Spare parts", "Pharmaceuticals", "Service Contract"];
const salespeople = ["Unassigned", "F. Al-Kuwari", "R. Mathew", "L. D'Souza", "Kashif"];
const scores = ["0", "1", "2", "3"];

export function getSalesCrmConfig(moduleKey: string, tab: string): SalesCrmConfig | null {
  if (moduleKey !== "sales" || !["Universal Enquiry Pool", "BANT Qualification", "Lead Claims"].includes(tab)) return null;
  return salesCrmConfig;
}

export function enrichSalesLead<T extends Row>(record: T, today = new Date()): T {
  const result = bantResult(record);
  const poolAge = workingDaysBetween(parseDate(record["Received Date"]), today);
  const status = derivedStatus(record, poolAge, today);
  return { ...record, "Pool Age": `${poolAge} working days`, "BANT Total": String(bantTotal(record)), "Qualification Result": result, "Current Status": status };
}

export function buildOpportunityFromLead(record: Row, existingCount: number) {
  return {
    Opportunity: `OPP-2026-${String(existingCount + 1).padStart(4, "0")}`,
    Customer: record.Organization,
    Owner: record["Assigned Salesperson"] || "Unassigned",
    Value: "TBD",
    "Expected close": addDays(new Date(), 30),
    Stage: "Qualified"
  };
}

export function applyLeadAction(action: string, record: DemoRecord, currentUser: string): Row | string {
  const lead = enrichSalesLead(record);
  if (action === "claim") {
    if (lead["Claim Status"] === "Claimed" && lead["Assigned Salesperson"] && lead["Assigned Salesperson"] !== "Unassigned") return { "Claim Status": "Conflict Flag", "Current Status": "Conflict review", Notes: appendNote(lead.Notes, `Conflict Flag: ${currentUser} attempted to claim an already claimed enquiry.`) };
    return { "Assigned Salesperson": currentUser, "Claim Status": "Claimed", "Claimed Date": todayIso(), "Current Status": "Qualification Pending" };
  }
  if (action === "release") return { "Assigned Salesperson": "Unassigned", "Claim Status": "Released", "Claimed Date": "", "Current Status": "New in Pool" };
  if (action === "qualify") return bantTotal(lead) >= 8 ? { "Qualification Result": "Qualified", "Current Status": "Qualified" } : "BANT total must be 8 or higher to qualify.";
  if (action === "nurture") return bantTotal(lead) >= 4 && bantTotal(lead) <= 7 ? { "Qualification Result": "Nurture", "Current Status": "Nurture" } : "Nurture requires a BANT total from 4 to 7.";
  if (action === "disqualify") return { "Qualification Result": "Disqualified", "Current Status": "Disqualified", "Disqualification Reason": lead["Disqualification Reason"] || "Below BANT threshold" };
  if (action === "conflict") return { "Claim Status": "Conflict Flag", "Current Status": "Conflict review", Notes: appendNote(lead.Notes, `Conflict review created by ${currentUser}.`) };
  return "";
}

export function canConvertLead(record: Row) {
  return enrichSalesLead(record)["Qualification Result"] === "Qualified";
}

const salesCrmConfig: SalesCrmConfig = {
  keyColumn: "Enquiry No",
  filterColumns: ["Source", "Suggested BU", "Pool Age", "Current Status", "Assigned Salesperson", "Qualification Result"],
  searchColumns: ["Enquiry No", "Contact Name", "Organization", "Email", "Phone", "Product Interest"],
  selectOptions: {
    Source: inboundSourceOptions,
    "Suggested BU": businessUnits,
    "Product Category": categories,
    "Assigned Salesperson": salespeople,
    "Claim Status": ["Unclaimed", "Claimed", "Released", "Conflict Flag"],
    "BANT Budget Score": scores,
    "BANT Authority Score": scores,
    "BANT Need Score": scores,
    "BANT Timeline Score": scores,
    "Qualification Result": ["Unqualified", "Qualified", "Nurture", "Disqualified"],
    "Current Status": ["New in Pool", "Claimed", "Qualification Pending", "Qualified", "Nurture", "Disqualified", "Opportunity Created", "COO Review Required", "Claim Expired", "Conflict review"]
  },
  fieldTypes: { "Received Date": "date", Email: "email", "Nurture Reminder Date": "date", "BANT Budget Score": "number", "BANT Authority Score": "number", "BANT Need Score": "number", "BANT Timeline Score": "number", "BANT Total": "number" },
  defaultValues: { "Enquiry No": "Auto generated", Source: "Manual Entry", "Received Date": todayIso(), "Assigned Salesperson": "Unassigned", "Claim Status": "Unclaimed", "BANT Budget Score": "0", "BANT Authority Score": "0", "BANT Need Score": "0", "BANT Timeline Score": "0", "BANT Total": "0", "Qualification Result": "Disqualified", "Current Status": "New in Pool" },
  prepareSave: (input, records, selected) => validateLeadRow(input, 0, records, new Set(), selected),
  validateImportRow: validateLeadRow
};

function validateLeadRow(input: Record<string, unknown>, rowNumber: number, records: DemoRecord[], seen: Set<string>, selected?: DemoRecord | null) {
  const row = Object.fromEntries(salesLeadColumns.map(column => [column, String(input[column] ?? salesCrmConfig.defaultValues[column] ?? "").trim()])) as Row;
  if (row["Enquiry No"] === "Auto generated") row["Enquiry No"] = "";
  ["Source", "Received Date", "Contact Name", "Organization", "Product Interest", "Suggested BU"].forEach(field => {
    if (!row[field]) throw new Error(prefix(rowNumber) + `Missing ${field}`);
  });
  if (row.Email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(row.Email)) throw new Error(prefix(rowNumber) + "Invalid email");
  ["BANT Budget Score", "BANT Authority Score", "BANT Need Score", "BANT Timeline Score"].forEach(field => {
    if (!scores.includes(String(Number(row[field] || 0)))) throw new Error(prefix(rowNumber) + `${field} must be 0 to 3`);
    row[field] = String(Number(row[field] || 0));
  });
  if (!row["Enquiry No"]) row["Enquiry No"] = `ENQ-2026-${String(nextNumber(records, "Enquiry No", "ENQ-2026-")).padStart(4, "0")}`;
  assertUnique(row["Enquiry No"], records, seen, rowNumber, selected);
  return enrichSalesLead(row);
}

function bantTotal(row: Row) {
  return ["BANT Budget Score", "BANT Authority Score", "BANT Need Score", "BANT Timeline Score"].reduce((sum, field) => sum + Number(row[field] || 0), 0);
}

function bantResult(row: Row) {
  const total = bantTotal(row);
  if (total >= 8) return "Qualified";
  if (total >= 4) return "Nurture";
  return "Disqualified";
}

function derivedStatus(row: Row, poolAge: number, today: Date) {
  if (["Qualified", "Nurture", "Disqualified", "Opportunity Created", "Conflict review"].includes(row["Current Status"])) return row["Current Status"];
  if (row["Claim Status"] === "Unclaimed" && poolAge > 10) return "COO Review Required";
  if (row["Claim Status"] === "Claimed" && row["Current Status"] === "Qualification Pending" && workingDaysBetween(parseDate(row["Claimed Date"] || row["Received Date"]), today) > 5) return "Claim Expired";
  return row["Current Status"] || (row["Claim Status"] === "Claimed" ? "Qualification Pending" : "New in Pool");
}

function workingDaysBetween(start: Date, end: Date) {
  if (Number.isNaN(start.getTime())) return 0;
  let days = 0;
  const cursor = new Date(start);
  cursor.setHours(0, 0, 0, 0);
  const target = new Date(end);
  target.setHours(0, 0, 0, 0);
  while (cursor < target) {
    cursor.setDate(cursor.getDate() + 1);
    if (![5, 6].includes(cursor.getDay())) days++;
  }
  return days;
}

function parseDate(value: string) {
  return value ? new Date(value) : new Date();
}

function nextNumber(records: Array<Record<string, string>>, field: string, prefixValue: string) {
  const values = records.map(record => record[field] || "").filter(value => value.startsWith(prefixValue)).map(value => Number(value.slice(prefixValue.length).replace(/\D/g, ""))).filter(Number.isFinite);
  return values.length ? Math.max(...values) + 1 : 1;
}

function assertUnique(value: string, records: DemoRecord[], seen: Set<string>, rowNumber: number, selected?: DemoRecord | null) {
  const normalized = value.toLowerCase();
  if (seen.has(normalized)) throw new Error(prefix(rowNumber) + "Duplicate Enquiry No in import");
  seen.add(normalized);
  if (records.some(record => record["Enquiry No"]?.toLowerCase() === normalized && record.__id !== selected?.__id)) throw new Error(prefix(rowNumber) + "Enquiry No already exists");
}

function lead(...values: string[]) {
  return Object.fromEntries(salesLeadColumns.map((column, index) => [column, values[index] ?? ""])) as Row;
}

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

function appendNote(notes: string, note: string) {
  return [notes, note].filter(Boolean).join(" | ");
}

function prefix(rowNumber: number) {
  return rowNumber ? `Row ${rowNumber}: ` : "";
}
