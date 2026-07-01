"use client";

import type { RecordFieldSuggestion, RecordFieldType } from "@/components/record-modal";
import { appendAuditLog } from "@/lib/audit-store";
import { createDemoRecord, readDemoRecordsSnapshot, writeDemoRecordsSnapshot, type DemoRecord } from "@/lib/demo-store";
import type { MasterDataConfig } from "@/lib/master-data";
import { customerMasterRows, productMasterRows } from "@/lib/master-data";
import { medtechScopeViews } from "@/lib/medtech-scope-data";

type Row = Record<string, string>;

export type ShippingAction = "create-pick-list" | "create-packing-list" | "create-shipment" | "partial-backorder" | "complete-delivery" | "refresh-dashboard";
export interface ShippingActionButton { action: ShippingAction; label: string; requiresSelection?: boolean; }

export const shippingColumns: Record<string, string[]> = {
  "Delivery Orders": ["Delivery Order No", "Source Module", "Source Record", "Customer", "Delivery Address", "Contact Person", "Phone", "Warehouse", "Delivery Date", "Status", "Notes"],
  "Pick Lists": ["Pick List No", "Delivery Order No", "Product Lines", "Quantity Ordered", "Quantity Picked", "Lot/Batch/Serial", "Expiry Date", "FEFO Suggestion", "QC Status", "Picker", "Status"],
  "Packing Lists": ["Packing List No", "Delivery Order No", "Shipment No", "Customer", "Product Lines", "Packages", "Gross Weight", "Temperature Controlled Required", "Status"],
  Shipments: ["Shipment No", "Delivery Order No", "Delivery Method", "Vehicle / Courier", "Driver / Handler", "Dispatch Date", "Expected Delivery Date", "Actual Delivery Date", "Temperature Controlled Required", "Status"],
  "Partial Deliveries / Backorders": ["Backorder No", "Delivery Order No", "Source Record", "Customer", "Product Lines", "Quantity Ordered", "Quantity Delivered", "Quantity Backordered", "Expected Completion", "Status"],
  "Proof of Delivery": ["POD No", "Delivery Order No", "Shipment No", "Delivered To", "Receiver Name", "Receiver Signature Placeholder", "Delivery Condition", "Delivery Notes", "Attachment Placeholder", "Status"],
  "Customs / Clearance Documents": ["Packet No", "Shipment No", "Customer", "Documents", "HS Codes", "Clearance Status", "Attachment Placeholder", "Status"],
  "Installation Delivery Handover": ["Handover No", "Delivery Order No", "Project / Service Job", "Customer", "Engineer", "Installation Required", "Handover Notes", "Status"],
  "Delivery Exceptions": ["Exception No", "Delivery Order No", "Shipment No", "Type", "Severity", "Details", "Owner", "Status"],
  "Shipping Dashboard": ["Metric", "Period", "Value", "Owner", "Status", "Notes"]
};

const firstColumn = Object.fromEntries(Object.entries(shippingColumns).map(([tab, columns]) => [tab, columns[0]]));
const prefixes: Record<string, string> = {
  "Delivery Orders": "DO-2026-",
  "Pick Lists": "PICK-2026-",
  "Packing Lists": "PKL-2026-",
  Shipments: "SHP-2026-",
  "Partial Deliveries / Backorders": "BO-2026-",
  "Proof of Delivery": "POD-2026-",
  "Customs / Clearance Documents": "CLR-2026-",
  "Installation Delivery Handover": "HND-2026-",
  "Delivery Exceptions": "DEX-2026-"
};

const seedRows: Record<string, Row[]> = {
  "Delivery Orders": [
    deliveryOrderRow("DO-2026-00281", "Sales", "SO-2026-00218", "Hamad Medical Corporation", "Hamad General Hospital Stores", "Dr. Sara Al-Mannai", "+974 4439 0000", "Main Warehouse", "2026-06-30", "Ready to pick", "Troponin I Reagent Kit x 12"),
    deliveryOrderRow("DO-2026-00282", "Project", "PRJ-2026-0018", "Al Wakra Day Surgery Center", "Project receiving bay", "Project Coordinator", "+974 4411 9000", "Main Warehouse", "2026-07-02", "Draft", "Patient Monitor MX750 x 2")
  ],
  "Pick Lists": [
    { "Pick List No": "PICK-2026-00114", "Delivery Order No": "DO-2026-00281", "Product Lines": "Troponin I Reagent Kit", "Quantity Ordered": "12", "Quantity Picked": "12", "Lot/Batch/Serial": "LOT-TI-2604", "Expiry Date": "2026-09-28", "FEFO Suggestion": "Yes", "QC Status": "Released", Picker: "Warehouse Team", Status: "Picked" }
  ],
  "Packing Lists": [
    { "Packing List No": "PKL-2026-00184", "Delivery Order No": "DO-2026-00281", "Shipment No": "SHP-2026-0181", Customer: "Hamad Medical Corporation", "Product Lines": "Troponin I Reagent Kit x 12", Packages: "2 cold boxes", "Gross Weight": "48 kg", "Temperature Controlled Required": "Yes", Status: "Final" }
  ],
  Shipments: [
    { "Shipment No": "SHP-2026-0181", "Delivery Order No": "DO-2026-00281", "Delivery Method": "MedTech Fleet", "Vehicle / Courier": "Cold Chain Van 02", "Driver / Handler": "Y. Khan", "Dispatch Date": "2026-06-30", "Expected Delivery Date": "2026-06-30", "Actual Delivery Date": "", "Temperature Controlled Required": "Yes", Status: "Out for delivery" },
    { "Shipment No": "SHP-2026-0177", "Delivery Order No": "DO-2026-00270", "Delivery Method": "Courier", "Vehicle / Courier": "FedEx", "Driver / Handler": "FedEx handler", "Dispatch Date": "2026-06-20", "Expected Delivery Date": "2026-06-22", "Actual Delivery Date": "", "Temperature Controlled Required": "No", Status: "Customs hold" }
  ],
  "Partial Deliveries / Backorders": [
    { "Backorder No": "BO-2026-00018", "Delivery Order No": "DO-2026-00270", "Source Record": "SO-2026-00209", Customer: "Aman Hospital", "Product Lines": "Patient Monitor MX750", "Quantity Ordered": "6", "Quantity Delivered": "4", "Quantity Backordered": "2", "Expected Completion": "2026-07-10", Status: "Open" }
  ],
  "Proof of Delivery": [
    { "POD No": "POD-2026-00077", "Delivery Order No": "DO-2026-00278", "Shipment No": "SHP-2026-0175", "Delivered To": "Sidra Central Stores", "Receiver Name": "Noura Hassan", "Receiver Signature Placeholder": "Signed on tablet", "Delivery Condition": "Good", "Delivery Notes": "Delivered complete", "Attachment Placeholder": "pod-sidra-demo.pdf", Status: "Received" }
  ],
  "Customs / Clearance Documents": [
    { "Packet No": "CLR-2026-00042", "Shipment No": "SHP-2026-0177", Customer: "Thermo Fisher", Documents: "Invoice, COO, packing list, temperature logger", "HS Codes": "382219", "Clearance Status": "Customs hold", "Attachment Placeholder": "clearance-packet-demo.zip", Status: "Pending" }
  ],
  "Installation Delivery Handover": [
    { "Handover No": "HND-2026-00031", "Delivery Order No": "DO-2026-00282", "Project / Service Job": "PRJ-2026-0018", Customer: "Al Wakra Day Surgery Center", Engineer: "Naveen Kumar", "Installation Required": "Yes", "Handover Notes": "Installation team to verify site readiness", Status: "Pending" }
  ],
  "Delivery Exceptions": [
    { "Exception No": "DEX-2026-00019", "Delivery Order No": "DO-2026-00270", "Shipment No": "SHP-2026-0177", Type: "Customs hold", Severity: "High", Details: "Clearance packet pending customs release", Owner: "Shipping Team", Status: "Open" }
  ],
  "Shipping Dashboard": []
};

export function getShippingConfig(tab: string): MasterDataConfig | null {
  const columns = shippingColumns[tab];
  if (!columns) return null;
  return {
    keyColumn: firstColumn[tab],
    filterColumns: columns.filter(column => ["Source Module", "Warehouse", "QC Status", "Temperature Controlled Required", "Severity", "Status"].includes(column)),
    searchColumns: columns,
    selectOptions: selectOptionsFor(),
    fieldTypes: fieldTypesFor(columns),
    defaultValues: defaultsFor(tab),
    suggestions: suggestionsFor(),
    prepareSave: (input, records, selected) => prepareRow(tab, input, records, selected),
    validateImportRow: (input, rowNumber, records, seen) => prepareRow(tab, input, records, null, rowNumber, seen)
  };
}

export function getShippingView(tab: string) {
  const columns = shippingColumns[tab];
  if (!columns) return null;
  return { columns, rows: tab === "Shipping Dashboard" ? dashboardRows() : seedRows[tab] ?? [] };
}

export function shippingActionsFor(moduleKey: string, tab: string): ShippingActionButton[] {
  if (moduleKey !== "shipping") return [];
  if (tab === "Delivery Orders") return [{ action: "create-pick-list" as const, label: "Create pick list" }];
  if (tab === "Pick Lists") return [{ action: "partial-backorder" as const, label: "Partial/backorder" }, { action: "create-packing-list" as const, label: "Create packing list" }];
  if (tab === "Packing Lists") return [{ action: "create-shipment" as const, label: "Create shipment" }];
  if (tab === "Shipments") return [{ action: "complete-delivery" as const, label: "Complete delivery" }];
  if (tab === "Shipping Dashboard") return [{ action: "refresh-dashboard" as const, label: "Refresh dashboard", requiresSelection: false }];
  return [];
}

export function runShippingAction(action: ShippingAction, tab: string, records: DemoRecord[], currentUser: string) {
  if (action === "refresh-dashboard") return refreshDashboard();
  if (!records.length) return { error: "Select at least one record first." };
  if (action === "create-pick-list") return createPickLists(records, currentUser);
  if (action === "partial-backorder") return createBackorders(records);
  if (action === "create-packing-list") return createPackingLists(records);
  if (action === "create-shipment") return createShipments(records);
  return completeDelivery(records, tab, currentUser);
}

function prepareRow(tab: string, input: Record<string, unknown>, records: DemoRecord[], selected?: DemoRecord | null, rowNumber = 0, seen = new Set<string>()) {
  const columns = shippingColumns[tab];
  const row = Object.fromEntries(columns.map(column => [column, String(input[column] ?? defaultsFor(tab)[column] ?? "").trim()])) as Row;
  const key = firstColumn[tab];
  if (!row[key] || row[key] === "Auto generated") row[key] = nextId(tab, records);
  if (tab === "Delivery Orders") fillCustomer(row);
  if (tab === "Pick Lists") fillPick(row);
  const missing = columns.filter(column => !optionalFields.has(column) && !row[column]);
  if (missing.length) throw new Error(prefix(rowNumber) + `Missing ${missing.join(", ")}`);
  if (seen.has(row[key].toLowerCase()) || records.some(record => record[key]?.toLowerCase() === row[key].toLowerCase() && record.__id !== selected?.__id)) throw new Error(prefix(rowNumber) + `${key} already exists`);
  seen.add(row[key].toLowerCase());
  return row;
}

function createPickLists(records: DemoRecord[], currentUser: string) {
  const rows = records.map(order => {
    const pick = bestStockFor(order.Notes || order["Source Record"]);
    const blocked = !pick || pick["QC Status"] !== "Released" || pick.Status === "Quarantine";
    const quantity = quantityFrom(order.Notes) || 1;
    writeReservation(order, pick, blocked, quantity);
    return {
      "Pick List No": nextTargetId("Pick Lists"),
      "Delivery Order No": order["Delivery Order No"],
      "Product Lines": pick?.Product || productFrom(order.Notes),
      "Quantity Ordered": String(quantity),
      "Quantity Picked": blocked ? "0" : String(quantity),
      "Lot/Batch/Serial": pick?.["Lot/Batch/Serial"] || "",
      "Expiry Date": pick?.["Expiry Date"] || "",
      "FEFO Suggestion": pick?.["Expiry Date"] ? "Yes" : "No",
      "QC Status": pick?.["QC Status"] || "Unavailable",
      Picker: currentUser,
      Status: blocked ? "Blocked" : "Picked"
    };
  });
  writeRows("Pick Lists", rows, "Pick List No");
  appendAuditLog({ action: "CREATE PICK LIST", module: "Shipping", record: rows.map(row => row["Pick List No"]).join(", "), details: "Inventory reservation and FEFO pick generated locally" });
  return { targetTab: "Pick Lists", sourceUpdates: records.map(() => ({ Status: "Picking" })), message: `${rows.length} local pick list${rows.length === 1 ? "" : "s"} created` };
}

function createBackorders(records: DemoRecord[]) {
  const rows = records.map(pick => {
    const ordered = qty(pick["Quantity Ordered"]);
    const delivered = Math.max(0, qty(pick["Quantity Picked"]) || Math.floor(ordered / 2));
    return { "Backorder No": nextTargetId("Partial Deliveries / Backorders"), "Delivery Order No": pick["Delivery Order No"], "Source Record": pick["Pick List No"], Customer: customerForOrder(pick["Delivery Order No"]), "Product Lines": pick["Product Lines"], "Quantity Ordered": String(ordered), "Quantity Delivered": String(delivered), "Quantity Backordered": String(Math.max(0, ordered - delivered)), "Expected Completion": dateOffset(10), Status: ordered > delivered ? "Open" : "Completed" };
  });
  writeRows("Partial Deliveries / Backorders", rows, "Backorder No");
  return { targetTab: "Partial Deliveries / Backorders", sourceUpdates: records.map(() => ({ Status: "Partial delivery" })), message: `${rows.length} backorder${rows.length === 1 ? "" : "s"} created locally` };
}

function createPackingLists(records: DemoRecord[]) {
  const blocked = records.find(row => row.Status === "Blocked" || row["QC Status"] !== "Released");
  if (blocked) return { error: `${blocked["Product Lines"]} is blocked by quarantine/QC and cannot pack.` };
  const rows = records.map(pick => ({ "Packing List No": nextTargetId("Packing Lists"), "Delivery Order No": pick["Delivery Order No"], "Shipment No": "", Customer: customerForOrder(pick["Delivery Order No"]), "Product Lines": `${pick["Product Lines"]} x ${pick["Quantity Picked"]}`, Packages: "1", "Gross Weight": "48 kg", "Temperature Controlled Required": coldChain(pick["Product Lines"]) ? "Yes" : "No", Status: "Final" }));
  writeRows("Packing Lists", rows, "Packing List No");
  return { targetTab: "Packing Lists", sourceUpdates: records.map(() => ({ Status: "Packed" })), message: `${rows.length} packing list${rows.length === 1 ? "" : "s"} created locally` };
}

function createShipments(records: DemoRecord[]) {
  const rows = records.map(pack => ({ "Shipment No": nextTargetId("Shipments"), "Delivery Order No": pack["Delivery Order No"], "Delivery Method": pack["Temperature Controlled Required"] === "Yes" ? "MedTech Fleet" : "Courier", "Vehicle / Courier": pack["Temperature Controlled Required"] === "Yes" ? "Cold Chain Van 02" : "Local courier simulator", "Driver / Handler": "Shipping Team", "Dispatch Date": today(), "Expected Delivery Date": dateOffset(1), "Actual Delivery Date": "", "Temperature Controlled Required": pack["Temperature Controlled Required"], Status: "Out for delivery" }));
  writeRows("Shipments", rows, "Shipment No");
  const warnings = rows.filter(row => row["Temperature Controlled Required"] === "Yes" && !row["Vehicle / Courier"].toLowerCase().includes("cold")).map(row => exception(row, "Cold-chain warning", "High", "Temperature-controlled delivery requires cold-chain vehicle."));
  if (warnings.length) writeRows("Delivery Exceptions", warnings, "Exception No");
  return { targetTab: "Shipments", sourceUpdates: records.map((record, index) => ({ "Shipment No": rows[index]["Shipment No"], Status: "Dispatched" })), message: `${rows.length} shipment${rows.length === 1 ? "" : "s"} dispatched locally${warnings.length ? " with cold-chain warning" : ""}` };
}

function completeDelivery(records: DemoRecord[], tab: string, currentUser: string) {
  const rows = records.map(shipment => ({ "POD No": nextTargetId("Proof of Delivery"), "Delivery Order No": shipment["Delivery Order No"], "Shipment No": shipment["Shipment No"], "Delivered To": addressForOrder(shipment["Delivery Order No"]), "Receiver Name": "Customer receiver", "Receiver Signature Placeholder": "Signature captured locally", "Delivery Condition": "Good", "Delivery Notes": "Delivered complete in local simulator", "Attachment Placeholder": "pod-local-placeholder.pdf", Status: "Received" }));
  writeRows("Proof of Delivery", rows, "POD No");
  updateFinanceDelivery(records);
  appendAuditLog({ action: "POD", module: "Shipping", record: rows.map(row => row["POD No"]).join(", "), details: `Proof of delivery completed by ${currentUser}` });
  return { targetTab: "Proof of Delivery", sourceUpdates: records.map(() => ({ "Actual Delivery Date": today(), Status: "Delivered" })), message: `${rows.length} proof of delivery record${rows.length === 1 ? "" : "s"} created locally` };
}

function refreshDashboard() {
  const rows = dashboardRows();
  writeDemoRecordsSnapshot("shipping:Shipping Dashboard", rows.map(createDemoRecord));
  return { targetTab: "Shipping Dashboard", message: "Shipping dashboard refreshed from local delivery records" };
}

function dashboardRows() {
  const shipments = readRows("Shipments");
  const backorders = readRows("Partial Deliveries / Backorders");
  const exceptions = readRows("Delivery Exceptions");
  return [
    metric("Open shipments", shipments.filter(row => !["Delivered", "Cancelled"].includes(row.Status)).length, "Shipping Team", "Ready"),
    metric("Delivered this month", shipments.filter(row => row.Status === "Delivered" || row["Actual Delivery Date"]).length, "Shipping Team", "Ready"),
    metric("Open backorders", backorders.filter(row => row.Status === "Open").length, "Warehouse Team", "Watch"),
    metric("Delivery exceptions", exceptions.filter(row => row.Status === "Open").length, "Shipping Team", exceptions.some(row => row.Status === "Open") ? "Action required" : "Ready")
  ];
}

function writeReservation(order: Row, pick: Row | undefined, blocked: boolean, quantity: number) {
  const row = { "Reservation No": nextInventoryId("Reservations"), Source: `Delivery order ${order["Delivery Order No"]}`, Product: pick?.Product || productFrom(order.Notes), SKU: pick?.SKU || skuFor(productFrom(order.Notes)), "Lot/Batch/Serial": pick?.["Lot/Batch/Serial"] || "", Quantity: String(quantity), "FEFO Suggested": pick?.["Expiry Date"] ? "Yes" : "No", "Dispatch Blocked": blocked ? "Yes" : "No", Status: blocked ? "Blocked" : "Reserved" };
  const existing = readDemoRecordsSnapshot("inventory:Reservations", medtechScopeViews["inventory.Reservations"]?.rows ?? []);
  writeDemoRecordsSnapshot("inventory:Reservations", [createDemoRecord(row), ...existing].slice(0, 250));
}

function updateFinanceDelivery(records: Row[]) {
  const key = "finance:Customer Invoices";
  const invoices = readDemoRecordsSnapshot(key, medtechScopeViews["finance.Customer Invoices"]?.rows ?? []);
  const sourceRecords = records.map(row => deliveryOrder(row["Delivery Order No"])?.["Source Record"]).filter((value): value is string => Boolean(value));
  writeDemoRecordsSnapshot(key, invoices.map(row => sourceRecords.some(source => Object.values(row).some(value => value.includes(source))) ? { ...row, Status: "Delivered locally" } : row));
}

function readRows(tab: string) {
  return readDemoRecordsSnapshot(`shipping:${tab}`, seedRows[tab] ?? []);
}

function writeRows(tab: string, rows: Row[], uniqueField: string) {
  const existing = readRows(tab);
  const keys = new Set(rows.map(row => row[uniqueField]).filter(Boolean));
  writeDemoRecordsSnapshot(`shipping:${tab}`, [...rows.map(createDemoRecord), ...existing.filter(row => !keys.has(row[uniqueField]))].slice(0, 250));
}

function bestStockFor(text = "") {
  const stock = readDemoRecordsSnapshot("inventory:Stock On Hand", medtechScopeViews["inventory.Stock On Hand"]?.rows ?? []);
  const sku = skuFor(productFrom(text));
  return stock.filter(row => (!sku || row.SKU === sku) && row["QC Status"] === "Released" && row.Status !== "Quarantine").sort((a, b) => (a["Expiry Date"] || "9999").localeCompare(b["Expiry Date"] || "9999"))[0] ?? stock.find(row => !sku || row.SKU === sku);
}

function fillCustomer(row: Row) {
  const customer = customerMasterRows.find(item => row.Customer && item["Organization Name"].includes(row.Customer)) || customerMasterRows.find(item => item["Organization Name"].includes("Hamad"));
  row["Delivery Address"] ||= customer?.["Delivery Address"] || "Customer receiving";
  row["Contact Person"] ||= customer?.["Contact Person"] || "Customer contact";
  row.Phone ||= customer?.Phone || "+974 4400 0000";
}

function fillPick(row: Row) {
  const pick = bestStockFor(row["Product Lines"]);
  row["Lot/Batch/Serial"] ||= pick?.["Lot/Batch/Serial"] || "";
  row["Expiry Date"] ||= pick?.["Expiry Date"] || "";
  row["FEFO Suggestion"] ||= pick?.["Expiry Date"] ? "Yes" : "No";
  row["QC Status"] ||= pick?.["QC Status"] || "Released";
}

function deliveryOrder(no: string) {
  return readRows("Delivery Orders").find(row => row["Delivery Order No"] === no);
}

function customerForOrder(no: string) {
  return deliveryOrder(no)?.Customer || "Customer";
}

function addressForOrder(no: string) {
  return deliveryOrder(no)?.["Delivery Address"] || "Customer receiving";
}

function productFrom(text = "") {
  return productMasterRows.find(product => text.toLowerCase().includes(product["Product Name"].toLowerCase()))?.["Product Name"] || "Troponin I Reagent Kit";
}

function skuFor(productName: string) {
  return productMasterRows.find(product => product["Product Name"] === productName)?.["SKU Code"] || "";
}

function coldChain(productName: string) {
  return productMasterRows.find(product => product["Product Name"] === productFrom(productName))?.["Cold Chain Required"] === "Yes";
}

function selectOptionsFor() {
  return {
    "Source Module": ["Sales", "Service", "Project", "GPPRR", "Pharma Tender"],
    Warehouse: ["Main Warehouse", "Cold Store", "Service Stock", "Project Site", "Transit"],
    "Delivery Method": ["MedTech Fleet", "Courier", "Customer pickup", "Freight forwarder"],
    "Temperature Controlled Required": ["No", "Yes"],
    "QC Status": ["Released", "Pending", "Quarantine", "Rejected"],
    Severity: ["Low", "Medium", "High", "Critical"],
    Status: ["Draft", "Ready to pick", "Picking", "Picked", "Packed", "Final", "Dispatched", "Out for delivery", "Delivered", "Received", "Open", "Completed", "Cancelled", "Blocked", "Pending", "Resolved"]
  };
}

function fieldTypesFor(columns: string[]) {
  return Object.fromEntries(columns.filter(column => column.includes("Date") || column === "Expected Completion").map(column => [column, "date" as RecordFieldType]));
}

function defaultsFor(tab: string) {
  return { [firstColumn[tab]]: "Auto generated", "Source Module": "Sales", Warehouse: "Main Warehouse", "Delivery Date": dateOffset(1), "Dispatch Date": today(), "Expected Delivery Date": dateOffset(1), "Expected Completion": dateOffset(10), "Quantity Ordered": "1", "Quantity Picked": "1", Packages: "1", "Gross Weight": "1 kg", "Temperature Controlled Required": "No", "Delivery Condition": "Good", "Receiver Signature Placeholder": "Signature pending", "Attachment Placeholder": "Local placeholder", "Installation Required": "No", Severity: "Medium", Status: tab === "Delivery Orders" ? "Ready to pick" : "Draft" };
}

function suggestionsFor(): Record<string, RecordFieldSuggestion[]> {
  const customers = customerMasterRows.map(row => ({ value: row["Organization Name"], label: row["Customer Code"], fill: { Customer: row["Organization Name"], "Delivery Address": row["Delivery Address"], "Contact Person": row["Contact Person"], Phone: row.Phone } }));
  const products = productMasterRows.map(row => ({ value: `${row["Product Name"]} x 1`, label: row["SKU Code"], fill: { "Product Lines": row["Product Name"], "Temperature Controlled Required": row["Cold Chain Required"] } }));
  return { Customer: customers, "Product Lines": products };
}

function nextId(tab: string, records: Row[], offset = 1) {
  const key = firstColumn[tab];
  const prefixValue = prefixes[tab] || "SHIP-2026-";
  const max = records.map(record => Number(String(record[key] || "").replace(prefixValue, "").replace(/\D/g, ""))).filter(Number.isFinite).reduce((highest, value) => Math.max(highest, value), 0);
  return `${prefixValue}${String(max + offset).padStart(5, "0")}`;
}

function nextTargetId(tab: string) {
  return nextId(tab, readRows(tab));
}

function nextInventoryId(tab: string) {
  const existing = readDemoRecordsSnapshot(`inventory:${tab}`, medtechScopeViews[`inventory.${tab}`]?.rows ?? []);
  const max = existing.map(row => Number(String(row["Reservation No"] || "").replace(/\D/g, ""))).filter(Number.isFinite).reduce((highest, value) => Math.max(highest, value), 0);
  return `RES-2026-${String(max + 1).padStart(5, "0")}`;
}

function deliveryOrderRow(no: string, sourceModule: string, sourceRecord: string, customer: string, address: string, contact: string, phone: string, warehouse: string, date: string, status: string, notes: string) {
  return { "Delivery Order No": no, "Source Module": sourceModule, "Source Record": sourceRecord, Customer: customer, "Delivery Address": address, "Contact Person": contact, Phone: phone, Warehouse: warehouse, "Delivery Date": date, Status: status, Notes: notes };
}

function exception(row: Row, type: string, severity: string, details: string) {
  return { "Exception No": nextTargetId("Delivery Exceptions"), "Delivery Order No": row["Delivery Order No"], "Shipment No": row["Shipment No"], Type: type, Severity: severity, Details: details, Owner: "Shipping Team", Status: "Open" };
}

function metric(name: string, value: number, owner: string, status: string) {
  return { Metric: name, Period: "June 2026", Value: String(value), Owner: owner, Status: status, Notes: "Local shipping simulator" };
}

function quantityFrom(text = "") {
  const match = text.match(/x\s*(\d+)/i);
  return match ? Number(match[1]) : 1;
}

function qty(value = "") {
  const parsed = Number(String(value).replace(/[^0-9.-]/g, ""));
  return Number.isFinite(parsed) ? parsed : 0;
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

function dateOffset(days: number) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

function prefix(rowNumber: number) {
  return rowNumber ? `Row ${rowNumber}: ` : "";
}

const optionalFields = new Set(["Notes", "Actual Delivery Date", "Shipment No", "Attachment Placeholder", "Delivery Notes", "Handover Notes"]);
