import type { DemoRecord } from "@/lib/demo-store";
import type { DemoTabView } from "@/lib/demo-tabs";
import type { RecordFieldSuggestion, RecordFieldType } from "@/components/record-modal";

type Row = Record<string, string>;

export interface MasterDataConfig {
  keyColumn: string;
  filterColumns: string[];
  searchColumns: string[];
  selectOptions: Record<string, string[]>;
  fieldTypes: Record<string, RecordFieldType>;
  defaultValues: Record<string, string>;
  suggestions: Record<string, RecordFieldSuggestion[]>;
  prepareSave: (input: Row, records: DemoRecord[], selected?: DemoRecord | null) => Row;
  validateImportRow: (row: Record<string, unknown>, rowNumber: number, records: DemoRecord[], seen: Set<string>) => Row;
}

export const customerMasterColumns = [
  "Customer Code", "Organization Code", "Account Code", "Department Code", "Customer Name", "Organization Name", "Segment", "Business Unit", "Branch / Account", "Department", "Sub-Department", "Market Segment", "Customer Type", "Contact Person", "Email", "Phone", "Status", "Region", "Billing Address", "Delivery Address", "City", "Country", "Currency", "Payment Terms", "Credit Limit", "Tax Class", "CR Number", "VAT / Tax Number", "Notes"
];

export const supplierMasterColumns = [
  "Supplier Code", "Principal / Supplier Name", "Country", "Region", "Aligned BU", "Secondary BUs", "Product Category / Brand Line", "Contact Person", "Email", "Phone", "Address", "Currency", "Payment Terms", "Lead Time Days", "Credit Limit", "Agreement Status", "Exclusivity", "Year Onboarded", "Notes"
];

export const productMasterColumns = [
  "SKU Code", "Product Name", "Business Unit", "Category", "Sub-Category", "Supplier Code", "Supplier Name", "UoM", "Cost Currency", "Native Cost", "QAR Cost", "List Price", "Lead Time Days", "Regulatory Class", "Status", "Min Stock", "Max Stock", "Tax Class", "HS Code", "Notes", "Cold Chain Required", "Expiry Controlled", "Batch Tracking Required", "Regulatory Registration Status"
];

export const customerMasterRows: Row[] = [
  { "Customer Code": "ORG-HMC-HGH-LAB-001", "Organization Code": "ORG-HMC", "Account Code": "ORG-HMC-HGH", "Department Code": "ORG-HMC-HGH-LAB", "Customer Name": "Hamad General Hospital - Laboratory", "Organization Name": "Hamad Medical Corporation", Segment: "Government", "Business Unit": "Diagnostics", "Branch / Account": "Hamad General Hospital", Department: "Laboratory", "Sub-Department": "Clinical Chemistry", "Market Segment": "Hospital", "Customer Type": "End customer", "Contact Person": "Dr. Sara Al-Mannai", Email: "lab.procurement@hmc.org.qa", Phone: "+974 4439 0000", Status: "Active", Region: "Doha", "Billing Address": "HMC Finance, Doha", "Delivery Address": "Hamad General Hospital Stores", City: "Doha", Country: "Qatar", Currency: "QAR", "Payment Terms": "60 days", "Credit Limit": "2500000", "Tax Class": "VAT exempt medical", "CR Number": "HMC-GOV", "VAT / Tax Number": "QA-HMC-001", Notes: "Framework customer for diagnostics and clinical supplies." },
  { "Customer Code": "ORG-SID-SMC-ICU-001", "Organization Code": "ORG-SID", "Account Code": "ORG-SID-SMC", "Department Code": "ORG-SID-SMC-ICU", "Customer Name": "Sidra Medicine - ICU", "Organization Name": "Sidra Medicine", Segment: "Semi-government", "Business Unit": "Medical Equipment", "Branch / Account": "Sidra Main Campus", Department: "ICU", "Sub-Department": "Critical Care", "Market Segment": "Hospital", "Customer Type": "End customer", "Contact Person": "Noura Hassan", Email: "icu.supply@sidra.org", Phone: "+974 4003 3333", Status: "Active", Region: "Doha", "Billing Address": "Sidra Finance Office", "Delivery Address": "Sidra Central Stores", City: "Doha", Country: "Qatar", Currency: "QAR", "Payment Terms": "45 days", "Credit Limit": "1750000", "Tax Class": "VAT exempt medical", "CR Number": "SID-GOV", "VAT / Tax Number": "QA-SID-014", Notes: "Priority account for monitoring and critical care products." },
  { "Customer Code": "ORG-PEARL-PMC-PHA-001", "Organization Code": "ORG-PEARL", "Account Code": "ORG-PEARL-PMC", "Department Code": "ORG-PEARL-PMC-PHA", "Customer Name": "Pearl Medical Center - Pharmacy", "Organization Name": "Pearl Medical Center", Segment: "Private", "Business Unit": "Pharma", "Branch / Account": "Pearl Medical Center", Department: "Pharmacy", "Sub-Department": "Inpatient Pharmacy", "Market Segment": "Clinic", "Customer Type": "End customer", "Contact Person": "George Mathew", Email: "pharmacy@pearlmedical.qa", Phone: "+974 4412 8800", Status: "Active", Region: "Doha", "Billing Address": "Pearl Medical Center Accounts", "Delivery Address": "Pharmacy Receiving Bay", City: "Doha", Country: "Qatar", Currency: "QAR", "Payment Terms": "30 days", "Credit Limit": "420000", "Tax Class": "Standard", "CR Number": "CR-112233", "VAT / Tax Number": "QA-8899123", Notes: "Private sector consumables and pharma customer." }
];

export const supplierMasterRows: Row[] = [
  { "Supplier Code": "SUP-00012", "Principal / Supplier Name": "Siemens Healthineers", Country: "Germany", Region: "EMEA", "Aligned BU": "Medical Equipment", "Secondary BUs": "Service, Projects", "Product Category / Brand Line": "Imaging and patient monitoring", "Contact Person": "Regional Sales Desk", Email: "qatar.healthcare@siemens-healthineers.com", Phone: "+971 4 366 0000", Address: "Dubai Healthcare City, UAE", Currency: "EUR", "Payment Terms": "60 days", "Lead Time Days": "45", "Credit Limit": "3000000", "Agreement Status": "Approved", Exclusivity: "Non-exclusive", "Year Onboarded": "2019", Notes: "Preferred principal for imaging, monitoring and service spares." },
  { "Supplier Code": "SUP-00019", "Principal / Supplier Name": "Thermo Fisher Scientific", Country: "United States", Region: "Americas", "Aligned BU": "Diagnostics", "Secondary BUs": "Lab, Pharma", "Product Category / Brand Line": "Life sciences reagents", "Contact Person": "Gulf Commercial Team", Email: "qatar@thermofisher.com", Phone: "+971 4 331 1200", Address: "Jebel Ali Free Zone, UAE", Currency: "USD", "Payment Terms": "45 days", "Lead Time Days": "28", "Credit Limit": "1800000", "Agreement Status": "Approved", Exclusivity: "Non-exclusive", "Year Onboarded": "2020", Notes: "Cold-chain reagents, analyzers and lab consumables." },
  { "Supplier Code": "SUP-00025", "Principal / Supplier Name": "BD Biosciences", Country: "United States", Region: "Americas", "Aligned BU": "Diagnostics", "Secondary BUs": "Lab", "Product Category / Brand Line": "Flow cytometry and collection systems", "Contact Person": "MENA Channel Manager", Email: "mena@bdbiosciences.com", Phone: "+971 4 429 1400", Address: "Dubai Science Park, UAE", Currency: "USD", "Payment Terms": "40% advance, 60% on delivery", "Lead Time Days": "35", "Credit Limit": "1200000", "Agreement Status": "Approved", Exclusivity: "Selective categories", "Year Onboarded": "2021", Notes: "Supports RFQ selection for diagnostics tenders." }
];

export const productMasterRows: Row[] = [
  { "SKU Code": "ME-PM-0750", "Product Name": "Patient Monitor MX750", "Business Unit": "Medical Equipment", Category: "Equipment", "Sub-Category": "Patient Monitoring", "Supplier Code": "SUP-00012", "Supplier Name": "Siemens Healthineers", UoM: "Unit", "Cost Currency": "EUR", "Native Cost": "5200", "QAR Cost": "20500", "List Price": "28500", "Lead Time Days": "45", "Regulatory Class": "Class IIb", Status: "Active", "Min Stock": "4", "Max Stock": "18", "Tax Class": "VAT exempt medical", "HS Code": "901819", Notes: "Bedside monitor for ICU and OR projects.", "Cold Chain Required": "No", "Expiry Controlled": "No", "Batch Tracking Required": "No", "Regulatory Registration Status": "Registered" },
  { "SKU Code": "DX-TRP-100", "Product Name": "Troponin I Reagent Kit", "Business Unit": "Diagnostics", Category: "Reagents", "Sub-Category": "Cardiac Markers", "Supplier Code": "SUP-00019", "Supplier Name": "Thermo Fisher Scientific", UoM: "Kit", "Cost Currency": "USD", "Native Cost": "390", "QAR Cost": "1420", "List Price": "1860", "Lead Time Days": "28", "Regulatory Class": "IVD", Status: "Active", "Min Stock": "20", "Max Stock": "80", "Tax Class": "VAT exempt medical", "HS Code": "382219", Notes: "Cold-chain reagent with lot and expiry control.", "Cold Chain Required": "Yes", "Expiry Controlled": "Yes", "Batch Tracking Required": "Yes", "Regulatory Registration Status": "Registered" },
  { "SKU Code": "CS-NGL-M", "Product Name": "Nitrile Examination Gloves Medium", "Business Unit": "Pharma", Category: "Consumables", "Sub-Category": "PPE", "Supplier Code": "SUP-00025", "Supplier Name": "BD Biosciences", UoM: "Box", "Cost Currency": "USD", "Native Cost": "5.25", "QAR Cost": "19.2", "List Price": "28", "Lead Time Days": "35", "Regulatory Class": "Class I", Status: "Active", "Min Stock": "500", "Max Stock": "2500", "Tax Class": "Standard", "HS Code": "401519", Notes: "High-volume clinical consumable.", "Cold Chain Required": "No", "Expiry Controlled": "Yes", "Batch Tracking Required": "Yes", "Regulatory Registration Status": "Registered" }
];

export const masterDataViews: Record<string, DemoTabView> = {
  "sales.Customer Master": { columns: customerMasterColumns, rows: customerMasterRows },
  "procurement.Supplier Master": { columns: supplierMasterColumns, rows: supplierMasterRows },
  "inventory.Product Master": { columns: productMasterColumns, rows: productMasterRows }
};

const businessUnits = ["Medical Equipment", "Diagnostics", "Pharma", "Lab", "Service", "Projects"];
const regions = ["Doha", "Al Rayyan", "Al Wakrah", "Al Khor", "Qatar North", "EMEA", "Americas", "APAC"];
const paymentTerms = ["Advance", "30 days", "45 days", "60 days", "40% advance, 60% on delivery"];
const statusOptions = ["Draft", "Active", "Inactive", "Pending approval", "Approved", "Suspended"];
const yesNo = ["No", "Yes"];

export function getMasterDataConfig(moduleKey: string, tab: string): MasterDataConfig | null {
  const key = `${moduleKey}.${tab}`;
  if (key === "sales.Customer Master") return customerConfig;
  if (key === "procurement.Supplier Master") return supplierConfig;
  if (key === "inventory.Product Master") return productConfig;
  return null;
}

export function supplierSuggestions(): Record<string, RecordFieldSuggestion[]> {
  const rows = supplierMasterRows;
  const byCode = rows.map(supplier => ({ value: supplier["Supplier Code"], label: supplier["Principal / Supplier Name"], fill: { "Supplier Name": supplier["Principal / Supplier Name"], "Lead Time Days": supplier["Lead Time Days"], "Cost Currency": supplier.Currency } }));
  const byName = rows.map(supplier => ({ value: supplier["Principal / Supplier Name"], label: supplier["Supplier Code"], fill: { Supplier: supplier["Principal / Supplier Name"], "Supplier Code": supplier["Supplier Code"], "Supplier contact": `${supplier["Contact Person"]} - ${supplier.Email}`, Currency: supplier.Currency, "Payment terms": supplier["Payment Terms"], "Lead Time Days": supplier["Lead Time Days"] } }));
  return { "Supplier Code": byCode, "Supplier Name": byName, Supplier: byName };
}

const customerConfig: MasterDataConfig = {
  keyColumn: "Customer Code",
  filterColumns: ["Business Unit", "Segment", "Customer Type", "Status", "Region"],
  searchColumns: ["Customer Code", "Customer Name", "Organization Name", "Email", "Phone"],
  selectOptions: {
    "Business Unit": businessUnits, Segment: ["Government", "Semi-government", "Private", "Distributor"], "Market Segment": ["Hospital", "Clinic", "Laboratory", "Pharmacy", "Distributor"], "Customer Type": ["End customer", "Distributor", "Government account", "Private account"], Status: statusOptions, Region: regions.slice(0, 5), Country: ["Qatar"], Currency: ["QAR", "USD", "EUR"], "Payment Terms": paymentTerms, "Tax Class": ["VAT exempt medical", "Standard", "Zero rated"]
  },
  fieldTypes: { Email: "email", "Credit Limit": "number" },
  defaultValues: { "Customer Code": "Auto generated", "Organization Code": "Auto generated", "Account Code": "Auto generated", "Department Code": "Auto generated", Country: "Qatar", Currency: "QAR", Status: "Active", "Payment Terms": "30 days", "Tax Class": "VAT exempt medical" },
  suggestions: {},
  prepareSave: (input, records, selected) => validateCustomerRow(input, 0, records, new Set(), selected),
  validateImportRow: validateCustomerRow
};

const supplierConfig: MasterDataConfig = {
  keyColumn: "Supplier Code",
  filterColumns: ["Aligned BU", "Product Category / Brand Line", "Agreement Status", "Country", "Region"],
  searchColumns: ["Supplier Code", "Principal / Supplier Name", "Email", "Phone", "Product Category / Brand Line"],
  selectOptions: {
    Country: ["Germany", "United States", "United Kingdom", "Switzerland", "India", "UAE", "Qatar"], Region: regions.slice(5), "Aligned BU": businessUnits, Currency: ["QAR", "USD", "EUR", "GBP"], "Payment Terms": paymentTerms, "Agreement Status": ["Draft", "Approved", "Under review", "Expired", "Blocked"], Exclusivity: ["Non-exclusive", "Exclusive", "Selective categories"], "Product Category / Brand Line": ["Imaging and patient monitoring", "Life sciences reagents", "Flow cytometry and collection systems", "PPE and clinical consumables", "Pharmaceuticals"]
  },
  fieldTypes: { Email: "email", "Lead Time Days": "number", "Credit Limit": "number", "Year Onboarded": "number" },
  defaultValues: { "Supplier Code": "Auto generated", Currency: "USD", "Agreement Status": "Approved", Exclusivity: "Non-exclusive", "Year Onboarded": "2026" },
  suggestions: {},
  prepareSave: (input, records, selected) => validateSupplierRow(input, 0, records, new Set(), selected),
  validateImportRow: validateSupplierRow
};

const productConfig: MasterDataConfig = {
  keyColumn: "SKU Code",
  filterColumns: ["Business Unit", "Category", "Supplier Name", "Status", "Expiry Controlled", "Batch Tracking Required"],
  searchColumns: ["SKU Code", "Product Name", "Supplier Code", "Supplier Name", "Category", "Business Unit"],
  selectOptions: {
    "Business Unit": businessUnits, Category: ["Equipment", "Reagents", "Consumables", "Pharmaceuticals", "Spare parts"], UoM: ["Unit", "Kit", "Box", "Pack", "Vial", "Bottle"], "Cost Currency": ["QAR", "USD", "EUR", "GBP"], "Regulatory Class": ["Class I", "Class IIa", "Class IIb", "Class III", "IVD", "Drug"], Status: statusOptions, "Tax Class": ["VAT exempt medical", "Standard", "Zero rated"], "Cold Chain Required": yesNo, "Expiry Controlled": yesNo, "Batch Tracking Required": yesNo, "Regulatory Registration Status": ["Registered", "Pending", "Not required", "Expired"]
  },
  fieldTypes: { "Native Cost": "number", "QAR Cost": "number", "List Price": "number", "Lead Time Days": "number", "Min Stock": "number", "Max Stock": "number" },
  defaultValues: { "SKU Code": "Auto generated", Status: "Active", UoM: "Unit", "Cost Currency": "QAR", "Cold Chain Required": "No", "Expiry Controlled": "No", "Batch Tracking Required": "No", "Regulatory Registration Status": "Pending" },
  suggestions: supplierSuggestions(),
  prepareSave: (input, records, selected) => validateProductRow(input, 0, records, new Set(), selected),
  validateImportRow: validateProductRow
};

function validateCustomerRow(input: Record<string, unknown>, rowNumber: number, records: DemoRecord[], seen: Set<string>, selected?: DemoRecord | null) {
  const row = complete(customerMasterColumns, input, customerConfig.defaultValues);
  ["Customer Code", "Organization Code", "Account Code", "Department Code"].forEach(field => { if (row[field] === "Auto generated") row[field] = ""; });
  requireFields(row, ["Customer Name", "Organization Name", "Segment", "Business Unit", "Customer Type", "Status"], rowNumber);
  validateEmail(row.Email, rowNumber);
  validateNonNegative(row, ["Credit Limit"], rowNumber);
  const prepared = cascadeCustomerCodes(row, records);
  assertUnique(prepared["Customer Code"], "Customer Code", records, seen, rowNumber, selected);
  return prepared;
}

function validateSupplierRow(input: Record<string, unknown>, rowNumber: number, records: DemoRecord[], seen: Set<string>, selected?: DemoRecord | null) {
  const row = complete(supplierMasterColumns, input, supplierConfig.defaultValues);
  if (row["Supplier Code"] === "Auto generated") row["Supplier Code"] = "";
  requireFields(row, ["Principal / Supplier Name", "Country", "Aligned BU", "Product Category / Brand Line", "Agreement Status"], rowNumber);
  validateEmail(row.Email, rowNumber);
  validateNonNegative(row, ["Lead Time Days", "Credit Limit", "Year Onboarded"], rowNumber);
  if (!row["Supplier Code"]) row["Supplier Code"] = `SUP-${String(nextNumber(records, "Supplier Code", "SUP-")).padStart(5, "0")}`;
  assertUnique(row["Supplier Code"], "Supplier Code", records, seen, rowNumber, selected);
  return row;
}

function validateProductRow(input: Record<string, unknown>, rowNumber: number, records: DemoRecord[], seen: Set<string>, selected?: DemoRecord | null) {
  const row = complete(productMasterColumns, input, productConfig.defaultValues);
  if (row["SKU Code"] === "Auto generated") row["SKU Code"] = "";
  requireFields(row, ["Product Name", "Business Unit", "Category", "Supplier Code", "Supplier Name", "Status"], rowNumber);
  validateNonNegative(row, ["Native Cost", "QAR Cost", "List Price", "Lead Time Days", "Min Stock", "Max Stock"], rowNumber);
  if (Number(row["Max Stock"] || 0) && Number(row["Min Stock"] || 0) > Number(row["Max Stock"])) throw new Error(prefix(rowNumber) + "Min Stock cannot exceed Max Stock");
  if (!row["SKU Code"]) row["SKU Code"] = `${part(row["Business Unit"], "BU")}-${part(row.Category, "CAT")}-${String(nextNumber(records, "SKU Code", `${part(row["Business Unit"], "BU")}-${part(row.Category, "CAT")}-`)).padStart(3, "0")}`;
  assertUnique(row["SKU Code"], "SKU Code", records, seen, rowNumber, selected);
  return row;
}

function complete(columns: string[], input: Record<string, unknown>, defaults: Row) {
  return Object.fromEntries(columns.map(column => [column, String(input[column] ?? defaults[column] ?? "").trim()])) as Row;
}

function requireFields(row: Row, fields: string[], rowNumber: number) {
  const missing = fields.filter(field => !row[field]);
  if (missing.length) throw new Error(prefix(rowNumber) + `Missing ${missing.join(", ")}`);
}

function validateEmail(email: string, rowNumber: number) {
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error(prefix(rowNumber) + "Invalid email");
}

function validateNonNegative(row: Row, fields: string[], rowNumber: number) {
  fields.forEach(field => {
    if (!row[field]) return;
    const value = Number(row[field]);
    if (!Number.isFinite(value) || value < 0) throw new Error(prefix(rowNumber) + `${field} must be a non-negative number`);
  });
}

function assertUnique(value: string, field: string, records: DemoRecord[], seen: Set<string>, rowNumber: number, selected?: DemoRecord | null) {
  const normalized = value.toLowerCase();
  if (seen.has(normalized)) throw new Error(prefix(rowNumber) + `Duplicate ${field} in import`);
  seen.add(normalized);
  const duplicate = records.find(record => record[field]?.toLowerCase() === normalized && record.__id !== selected?.__id);
  if (duplicate) throw new Error(prefix(rowNumber) + `${field} already exists`);
}

function cascadeCustomerCodes(row: Row, records: DemoRecord[]) {
  const org = row["Organization Code"] || `ORG-${part(row["Organization Name"], "CUS", 5)}`;
  const account = row["Account Code"] || `${org}-${part(row["Branch / Account"] || row["Organization Name"], "ACC", 4)}`;
  const department = row["Department Code"] || `${account}-${part(row.Department, "DEP", 4)}`;
  return { ...row, "Organization Code": org, "Account Code": account, "Department Code": department, "Customer Code": row["Customer Code"] || `${department}-${String(nextNumber(records, "Customer Code", `${department}-`)).padStart(3, "0")}` };
}

function nextNumber(records: Array<Record<string, string>>, field: string, prefixValue: string) {
  const values = records.map(record => record[field] || "").filter(value => value.startsWith(prefixValue)).map(value => Number(value.slice(prefixValue.length).replace(/\D/g, ""))).filter(Number.isFinite);
  return values.length ? Math.max(...values) + 1 : 1;
}

function part(value: string, fallback: string, size = 3) {
  const words = value.toUpperCase().match(/[A-Z0-9]+/g) ?? [];
  const compact = words.length > 1 ? words.map(word => word[0]).join("") : words.join("");
  return (compact || fallback).slice(0, size);
}

function prefix(rowNumber: number) {
  return rowNumber ? `Row ${rowNumber}: ` : "";
}
