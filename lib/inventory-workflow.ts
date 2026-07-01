"use client";

import type { RecordFieldSuggestion, RecordFieldType } from "@/components/record-modal";
import { createDemoRecord, readDemoRecordsSnapshot, writeDemoRecordsSnapshot, type DemoRecord } from "@/lib/demo-store";
import { medtechScopeViews } from "@/lib/medtech-scope-data";
import { productMasterRows, type MasterDataConfig } from "@/lib/master-data";
import { hasApprovedApproval, money, submitApprovalRequest } from "@/lib/approval-matrix";
import { writeFinanceJournalDraft } from "@/lib/finance-workflow";

type Row = Record<string, string>;

export type InventoryAction = "scan-stock" | "fefo-reserve" | "transfer-stock" | "dispatch-stock" | "post-cycle-count" | "release-qc" | "consume-engineer-stock" | "build-kit";

export const inventoryColumns: Record<string, string[]> = {
  Products: ["Product", "SKU", "Business Unit", "Category", "Supplier", "Min Stock", "Max Stock", "Cold Chain Required", "Expiry Controlled", "Batch Tracking Required", "Status"],
  "Stock On Hand": ["Product", "SKU", "Warehouse", "Location", "Lot/Batch/Serial", "Expiry Date", "Quantity On Hand", "Reserved Quantity", "Available Quantity", "Min Stock", "Max Stock", "QC Status", "Cold Chain Required", "Status"],
  "Lots / Batches / Serials": ["Lot/Batch/Serial", "Product", "SKU", "Warehouse", "Location", "Expiry Date", "Quantity", "QC Status", "Batch Tracking", "Source", "Status"],
  "Stock Movements": ["Movement No", "Type", "Product", "SKU", "From", "To", "Lot/Batch/Serial", "Quantity", "Source", "Status"],
  Transfers: ["Transfer No", "Product", "SKU", "From Warehouse", "From Location", "To Warehouse", "To Location", "Lot/Batch/Serial", "Quantity", "Status"],
  Reservations: ["Reservation No", "Source", "Product", "SKU", "Lot/Batch/Serial", "Quantity", "FEFO Suggested", "Dispatch Blocked", "Status"],
  "Cycle Counts": ["Count No", "Product", "SKU", "Warehouse", "Location", "System Qty", "Counted Qty", "Variance Qty", "Variance Value", "Approval Status", "Status"],
  "Expiry Alerts": ["Alert No", "Product", "SKU", "Lot/Batch/Serial", "Expiry Date", "Days Left", "Alert Level", "Action", "Status"],
  "Quarantine / QC": ["QC No", "Source", "Product", "SKU", "Lot/Batch/Serial", "Quantity", "QC Status", "Dispatch Blocked", "QA Decision", "Status"],
  "Engineer Stock": ["Engineer Stock No", "Employee Code", "Engineer", "Product", "SKU", "Lot/Batch/Serial", "Quantity On Hand", "Reserved Quantity", "Status"],
  "Bundled Kits": ["Bundle SKU", "Bundle Name", "Component SKUs", "Quantity Required", "Build Quantity", "Work Order No", "Component Availability", "Build Status", "Finished Goods Receipt"]
};

const prefixes: Record<string, string> = {
  "Stock Movements": "MOV-2026-",
  Transfers: "TRF-2026-",
  Reservations: "RES-2026-",
  "Cycle Counts": "CC-2026-",
  "Expiry Alerts": "EXP-2026-",
  "Quarantine / QC": "QC-2026-"
};

const firstColumn = Object.fromEntries(Object.entries(inventoryColumns).map(([tab, columns]) => [tab, columns[0]]));
const warehouses = ["Main Warehouse", "Cold Store", "Service Stock", "Project Site", "Transit"];
const locations = ["Receiving Bay", "Quality Inspection", "Cold Room A", "Main Aisle", "Engineer Van", "Project Delivery Zone"];
const statuses = ["Draft", "Active", "Available", "Reserved", "Pending approval", "Approved", "Posted", "Quarantine", "Completed", "Consumed", "Built", "Blocked"];

export function getInventoryConfig(tab: string): MasterDataConfig | null {
  const columns = inventoryColumns[tab];
  if (!columns) return null;
  return {
    keyColumn: firstColumn[tab],
    filterColumns: columns.filter(column => ["Business Unit", "Category", "Warehouse", "Location", "QC Status", "Alert Level", "Approval Status", "Build Status", "Status"].includes(column)),
    searchColumns: columns,
    selectOptions: selectOptionsFor(tab),
    fieldTypes: fieldTypesFor(columns),
    defaultValues: defaultsFor(tab),
    suggestions: productSuggestions(),
    prepareSave: (input, records, selected) => prepareRow(tab, input, records, selected),
    validateImportRow: (input, rowNumber, records, seen) => prepareRow(tab, input, records, null, rowNumber, seen)
  };
}

export function inventoryActionsFor(tab: string) {
  if (tab === "Stock On Hand") return [
    { action: "scan-stock" as const, label: "Scan/manual entry" },
    { action: "fefo-reserve" as const, label: "FEFO reserve" },
    { action: "transfer-stock" as const, label: "Transfer" },
    { action: "dispatch-stock" as const, label: "Dispatch" }
  ];
  if (tab === "Cycle Counts") return [{ action: "post-cycle-count" as const, label: "Create adjustment" }];
  if (tab === "Quarantine / QC") return [{ action: "release-qc" as const, label: "Release QC" }];
  if (tab === "Engineer Stock") return [{ action: "consume-engineer-stock" as const, label: "Consume for service" }];
  if (tab === "Bundled Kits") return [{ action: "build-kit" as const, label: "Build kit" }];
  return [];
}

export function runInventoryAction(action: InventoryAction, records: DemoRecord[], currentUser: string) {
  if (!records.length) return { error: "Select at least one record first." };
  if (action === "scan-stock") return scan(records);
  if (action === "fefo-reserve") return reserveFefo(records);
  if (action === "transfer-stock") return transfer(records);
  if (action === "dispatch-stock") return dispatch(records);
  if (action === "post-cycle-count") return cycleCount(records, currentUser);
  if (action === "release-qc") return releaseQc(records);
  if (action === "consume-engineer-stock") return consumeEngineerStock(records);
  return buildKit(records);
}

export function stockSeeds() {
  return medtechScopeViews["inventory.Stock On Hand"].rows;
}

export function movementSeeds() {
  return medtechScopeViews["inventory.Stock Movements"].rows;
}

function prepareRow(tab: string, input: Record<string, unknown>, records: DemoRecord[], selected?: DemoRecord | null, rowNumber = 0, seen = new Set<string>()) {
  const columns = inventoryColumns[tab];
  const row = Object.fromEntries(columns.map(column => [column, String(input[column] ?? defaultsFor(tab)[column] ?? "").trim()])) as Row;
  if (tab === "Stock On Hand") row["Available Quantity"] = String(Math.max(0, qty(row["Quantity On Hand"]) - qty(row["Reserved Quantity"])));
  const key = firstColumn[tab];
  if (!row[key] || row[key] === "Auto generated") row[key] = nextId(tab, records);
  const required = columns.filter(column => !["Expiry Date", "Finished Goods Receipt"].includes(column));
  const missing = required.filter(field => !row[field]);
  if (missing.length) throw new Error(prefix(rowNumber) + `Missing ${missing.join(", ")}`);
  if (["Products", "Stock On Hand"].includes(tab)) return row;
  const duplicate = records.find(record => record[key]?.toLowerCase() === row[key].toLowerCase() && record.__id !== selected?.__id);
  if (seen.has(row[key].toLowerCase()) || duplicate) throw new Error(prefix(rowNumber) + `${key} already exists`);
  seen.add(row[key].toLowerCase());
  return row;
}

function scan(records: DemoRecord[]) {
  writeRows("Stock Movements", records.map(record => movement("Scanner check", record.Product, record.SKU, record.Location, record.Location, record["Lot/Batch/Serial"], 0, "Manual scanner simulator")), "Movement No");
  return { targetTab: "Stock Movements", message: `${records.length} scanner simulator event${records.length === 1 ? "" : "s"} logged` };
}

function reserveFefo(records: DemoRecord[]) {
  const stock = readStock();
  const reservations = records.map(record => {
    const pick = bestFefo(stock, record.SKU || skuFor(record.Product)) ?? record;
    if (blocked(pick)) return null;
    return {
      "Reservation No": nextTargetId("Reservations"),
      Source: "Sales delivery / Project delivery",
      Product: pick.Product,
      SKU: pick.SKU,
      "Lot/Batch/Serial": pick["Lot/Batch/Serial"],
      Quantity: "1",
      "FEFO Suggested": "Yes",
      "Dispatch Blocked": "No",
      Status: "Reserved"
    };
  });
  if (reservations.some(row => !row)) return { error: "Quarantine or unreleased stock cannot be reserved for dispatch." };
  writeRows("Reservations", reservations as Row[], "Reservation No");
  const updates = records.map(record => ({ "Reserved Quantity": String(qty(record["Reserved Quantity"]) + 1), "Available Quantity": String(Math.max(0, qty(record["Available Quantity"]) - 1)), Status: "Reserved" }));
  return { targetTab: "Reservations", sourceUpdates: updates, message: `${records.length} FEFO reservation${records.length === 1 ? "" : "s"} created locally` };
}

function transfer(records: DemoRecord[]) {
  const rows = records.map(record => ({
    "Transfer No": nextTargetId("Transfers"),
    Product: record.Product,
    SKU: record.SKU,
    "From Warehouse": record.Warehouse,
    "From Location": record.Location,
    "To Warehouse": "Service Stock",
    "To Location": "Engineer Van",
    "Lot/Batch/Serial": record["Lot/Batch/Serial"],
    Quantity: "1",
    Status: "Posted"
  }));
  writeRows("Transfers", rows, "Transfer No");
  writeRows("Stock Movements", rows.map(row => movement("Transfer", row.Product, row.SKU, row["From Location"], row["To Location"], row["Lot/Batch/Serial"], qty(row.Quantity), row["Transfer No"])), "Movement No");
  const updates = records.map(record => ({ "Quantity On Hand": String(Math.max(0, qty(record["Quantity On Hand"]) - 1)), "Available Quantity": String(Math.max(0, qty(record["Available Quantity"]) - 1)) }));
  return { targetTab: "Transfers", sourceUpdates: updates, message: `${rows.length} transfer${rows.length === 1 ? "" : "s"} posted locally` };
}

function dispatch(records: DemoRecord[]) {
  const bad = records.find(blocked);
  if (bad) return { error: `${bad.Product} is blocked by quarantine/QC and cannot dispatch.` };
  writeRows("Stock Movements", records.map(record => movement("Sales delivery dispatch", record.Product, record.SKU, record.Location, "Customer / Project", record["Lot/Batch/Serial"], 1, "Sales delivery / Project delivery")), "Movement No");
  const updates = records.map(record => ({ "Quantity On Hand": String(Math.max(0, qty(record["Quantity On Hand"]) - 1)), "Reserved Quantity": String(Math.max(0, qty(record["Reserved Quantity"]) - 1)), "Available Quantity": String(Math.max(0, qty(record["Available Quantity"]) - 1)), Status: "Dispatched" }));
  return { targetTab: "Stock Movements", sourceUpdates: updates, message: `${records.length} local dispatch movement${records.length === 1 ? "" : "s"} posted` };
}

function cycleCount(records: DemoRecord[], currentUser: string) {
  const updates = records.map(record => {
    const variance = qty(record["Counted Qty"]) - qty(record["System Qty"]);
    const needsApproval = Math.abs(variance) >= 5 || money(record["Variance Value"]) >= 1000;
    if (needsApproval && !hasApprovedApproval("Inventory", record["Count No"], "Cycle count variance")) {
      submitApprovalRequest({ sourceModule: "Inventory", sourceRecord: record["Count No"], requestType: "Cycle count variance", requestedBy: currentUser, amount: money(record["Variance Value"]), businessUnit: "Warehouse" });
    }
    writeFinanceJournalDraft({ sourceModule: "Inventory Adjustment", sourceRecord: record["Count No"], amount: record["Variance Value"] || "QAR 0", debit: variance < 0 ? "Inventory variance" : "Inventory", credit: variance < 0 ? "Inventory" : "Inventory variance", costCenter: "Warehouse", notes: "Cycle count adjustment draft only" });
    return { "Variance Qty": String(variance), "Approval Status": needsApproval ? "Pending approval" : "Not required", Status: needsApproval ? "Pending approval" : "Approved" };
  });
  writeRows("Stock Movements", records.map(record => movement("Cycle count adjustment request", record.Product, record.SKU, record.Location, record.Location, "", Math.abs(qty(record["Counted Qty"]) - qty(record["System Qty"])), record["Count No"])), "Movement No");
  return { targetTab: "Stock Movements", sourceUpdates: updates, message: `${records.length} cycle count adjustment request${records.length === 1 ? "" : "s"} created` };
}

function releaseQc(records: DemoRecord[]) {
  const updates = records.map(() => ({ "QC Status": "Released", "Dispatch Blocked": "No", "QA Decision": "Released", Status: "Released" }));
  return { targetTab: "Quarantine / QC", sourceUpdates: updates, message: `${records.length} QC record${records.length === 1 ? "" : "s"} released locally` };
}

function consumeEngineerStock(records: DemoRecord[]) {
  writeRows("Stock Movements", records.map(record => movement("Service spare part consumption", record.Product, record.SKU, record.Engineer, "Service job", record["Lot/Batch/Serial"], 1, "Service spare parts")), "Movement No");
  const updates = records.map(record => ({ "Quantity On Hand": String(Math.max(0, qty(record["Quantity On Hand"]) - 1)), Status: qty(record["Quantity On Hand"]) <= 1 ? "Consumed" : "Available" }));
  return { targetTab: "Stock Movements", sourceUpdates: updates, message: `${records.length} engineer stock item${records.length === 1 ? "" : "s"} consumed for service` };
}

function buildKit(records: DemoRecord[]) {
  const stock = readStock();
  const outputs: Row[] = [];
  const movementRows: Row[] = [];
  for (const kit of records) {
    const buildQty = qty(kit["Build Quantity"]);
    const parts = components(kit);
    const missing = parts.find(part => available(stock, part.sku) < part.qty * buildQty);
    if (missing) return { error: `${kit["Bundle SKU"]} needs ${missing.qty * buildQty} of ${missing.sku}, only ${available(stock, missing.sku)} available.` };
    parts.forEach(part => reduceStock(stock, part.sku, part.qty * buildQty, movementRows, kit["Work Order No"]));
    stock.unshift(createDemoRecord({
      Product: kit["Bundle Name"],
      SKU: kit["Bundle SKU"],
      Warehouse: "Main Warehouse",
      Location: "Main Aisle",
      "Lot/Batch/Serial": `${kit["Work Order No"]}-FG`,
      "Expiry Date": "",
      "Quantity On Hand": String(buildQty),
      "Reserved Quantity": "0",
      "Available Quantity": String(buildQty),
      "Min Stock": "0",
      "Max Stock": "50",
      "QC Status": "Released",
      "Cold Chain Required": "No",
      Status: "Available"
    }));
    movementRows.push(movement("Bundle build receipt", kit["Bundle Name"], kit["Bundle SKU"], "Work order", "Main Warehouse", `${kit["Work Order No"]}-FG`, buildQty, kit["Work Order No"]));
    outputs.push({ "Component Availability": "Available", "Build Status": "Built", "Finished Goods Receipt": `${kit["Work Order No"]}-FG` });
  }
  writeDemoRecordsSnapshot("inventory:Stock On Hand", stock);
  writeRows("Stock Movements", movementRows, "Movement No");
  return { targetTab: "Stock Movements", sourceUpdates: outputs, message: `${records.length} bundled kit build${records.length === 1 ? "" : "s"} completed locally` };
}

function writeRows(tab: string, rows: Row[], uniqueField: string) {
  const existing = readDemoRecordsSnapshot(`inventory:${tab}`, medtechScopeViews[`inventory.${tab}`]?.rows ?? []);
  const keys = new Set(rows.map(row => row[uniqueField]).filter(Boolean));
  writeDemoRecordsSnapshot(`inventory:${tab}`, [...rows.map(createDemoRecord), ...existing.filter(row => !keys.has(row[uniqueField]))].slice(0, 250));
}

function readStock() {
  return readDemoRecordsSnapshot("inventory:Stock On Hand", stockSeeds());
}

function bestFefo(stock: Row[], sku: string) {
  return stock.filter(row => row.SKU === sku && !blocked(row) && row["Expiry Date"]).sort((a, b) => a["Expiry Date"].localeCompare(b["Expiry Date"]))[0];
}

function blocked(row: Row) {
  return row["QC Status"] !== "Released" || row.Status === "Quarantine";
}

function movement(type: string, product: string, sku: string, from: string, to: string, lot: string, quantity: number, source: string) {
  return { "Movement No": `MOV-2026-${String(Date.now() % 100000).padStart(5, "0")}-${Math.random().toString(36).slice(2, 5).toUpperCase()}`, Type: type, Product: product, SKU: sku, From: from, To: to, "Lot/Batch/Serial": lot, Quantity: String(quantity), Source: source, Status: "Posted" };
}

function productSuggestions(): Record<string, RecordFieldSuggestion[]> {
  const products = productMasterRows.map(product => ({
    value: product["Product Name"],
    label: product["SKU Code"],
    fill: { Product: product["Product Name"], SKU: product["SKU Code"], "Business Unit": product["Business Unit"], Category: product.Category, Supplier: product["Supplier Name"], "Min Stock": product["Min Stock"], "Max Stock": product["Max Stock"], "Cold Chain Required": product["Cold Chain Required"], "Expiry Controlled": product["Expiry Controlled"], "Batch Tracking Required": product["Batch Tracking Required"] }
  }));
  return { Product: products, "Bundle Name": products };
}

function selectOptionsFor(tab: string) {
  return {
    "Business Unit": ["Medical Equipment", "Diagnostics", "Pharma", "Lab", "Service", "Projects"],
    Category: ["Equipment", "Reagents", "Consumables", "Pharmaceuticals", "Spare parts", "Bundle"],
    Warehouse: warehouses,
    Location: locations,
    "From Warehouse": warehouses,
    "To Warehouse": warehouses,
    "From Location": locations,
    "To Location": locations,
    "QC Status": ["Released", "Pending", "Quarantine", "Rejected"],
    "Dispatch Blocked": ["No", "Yes"],
    "Approval Status": ["Not required", "Pending approval", "Approved"],
    "Alert Level": ["90-day", "60-day", "30-day"],
    "Cold Chain Required": ["No", "Yes"],
    "Expiry Controlled": ["No", "Yes"],
    "Batch Tracking Required": ["No", "Yes"],
    "Build Status": ["Draft", "Built", "Blocked"],
    Status: statuses,
    ...(tab === "Bundled Kits" ? { "Component Availability": ["Available", "Short"] } : {})
  };
}

function fieldTypesFor(columns: string[]) {
  return Object.fromEntries(columns.filter(column => column.includes("Date")).map(column => [column, "date" as RecordFieldType]));
}

function defaultsFor(tab: string) {
  return { [firstColumn[tab]]: "Auto generated", Warehouse: "Main Warehouse", Location: "Main Aisle", "Quantity On Hand": "0", "Reserved Quantity": "0", "Available Quantity": "0", "Min Stock": "0", "Max Stock": "0", "QC Status": "Released", "Cold Chain Required": "No", "Expiry Controlled": "No", "Batch Tracking Required": "No", "Dispatch Blocked": "No", "Approval Status": "Not required", "Build Status": "Draft", Status: "Draft" };
}

function nextId(tab: string, records: Row[], offset = 1) {
  const prefixValue = prefixes[tab] ?? `${tab.toUpperCase().replace(/[^A-Z]+/g, "-")}-`;
  const key = firstColumn[tab];
  const max = records.map(record => Number(String(record[key] ?? "").replace(prefixValue, "").replace(/\D/g, ""))).filter(Number.isFinite).reduce((highest, value) => Math.max(highest, value), 0);
  return `${prefixValue}${String(max + offset).padStart(5, "0")}`;
}

function nextTargetId(tab: string, offset = 1) {
  return nextId(tab, readDemoRecordsSnapshot(`inventory:${tab}`, medtechScopeViews[`inventory.${tab}`]?.rows ?? []), offset);
}

function skuFor(productName: string) {
  return productMasterRows.find(product => product["Product Name"] === productName)?.["SKU Code"] ?? "";
}

function qty(value = "") {
  const parsed = Number(String(value).replace(/[^0-9.-]/g, ""));
  return Number.isFinite(parsed) ? parsed : 0;
}

function available(stock: Row[], sku: string) {
  return stock.filter(row => row.SKU === sku && !blocked(row)).reduce((total, row) => total + qty(row["Available Quantity"]), 0);
}

function reduceStock(stock: DemoRecord[], sku: string, amount: number, movements: Row[], source: string) {
  let remaining = amount;
  for (const row of stock.filter(item => item.SKU === sku && !blocked(item)).sort((a, b) => (a["Expiry Date"] || "9999").localeCompare(b["Expiry Date"] || "9999"))) {
    if (remaining <= 0) break;
    const used = Math.min(remaining, qty(row["Available Quantity"]));
    row["Quantity On Hand"] = String(qty(row["Quantity On Hand"]) - used);
    row["Available Quantity"] = String(qty(row["Available Quantity"]) - used);
    movements.push(movement("Bundle component issue", row.Product, row.SKU, row.Location, "Work order", row["Lot/Batch/Serial"], used, source));
    remaining -= used;
  }
}

function components(kit: Row) {
  const qtyRequired = Math.max(1, qty(kit["Quantity Required"]));
  return kit["Component SKUs"].split(/[,+]/).map(value => value.trim()).filter(Boolean).map(sku => ({ sku, qty: qtyRequired }));
}

function prefix(rowNumber: number) {
  return rowNumber ? `Row ${rowNumber}: ` : "";
}
