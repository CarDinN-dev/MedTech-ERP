import { customerMasterRows, productMasterRows, supplierMasterRows } from "@/lib/master-data";
import { pricingWarningsForLine, resolvePricing } from "@/lib/pricing-engine";

export type CostingStatus = "Draft" | "Under Review" | "Approved" | "Quotation Created" | "Cancelled" | "Archived";
export type CostingApprovalStatus = "Draft" | "Pending" | "Approved" | "Rejected";
export type CostingPathway = "SFS" | "GPPRR" | "Pharma Tender" | "PSO" | "Service" | "AMC";

export interface CostingLine {
  id: string;
  "Line No": string;
  "SKU Code": string;
  "Product Name": string;
  "Supplier / Principal": string;
  Category: string;
  UoM: string;
  Quantity: number;
  "Native Cost Currency": string;
  "Native Unit Cost": number;
  "Exchange Rate": number;
  "Unit Cost QAR": number;
  "Total Cost QAR": number;
  "Freight %": number;
  "Customs %": number;
  "Clearance Charges": number;
  "Insurance %": number;
  "Bank Charges %": number;
  "Warranty Cost %": number;
  "Installation Cost": number;
  "Service Cost": number;
  "Other Charges": number;
  "Landed Cost": number;
  "Margin %": number;
  "Margin Amount": number;
  "Selling Unit Price": number;
  "Discount %": number;
  "Final Unit Price": number;
  "Line Total Selling Price": number;
  "Gross Profit": number;
  "Gross Margin %": number;
  "Lead Time Days": number;
  "Delivery Terms": string;
  Remarks: string;
}

export interface CostingSheet {
  id: string;
  "Costing Sheet No": string;
  "Costing Date": string;
  "Revision No": string;
  "Related Enquiry No": string;
  "Related Opportunity No": string;
  "Sales Pathway": CostingPathway;
  Customer: string;
  "Customer Code": string;
  "Business Unit": string;
  Department: string;
  Salesperson: string;
  "Prepared By": string;
  Currency: string;
  "Exchange Rate": number;
  "Payment Terms": string;
  "Validity Date": string;
  Status: CostingStatus;
  "Approval Status": CostingApprovalStatus;
  Notes: string;
  "Quotation No"?: string;
  "Sales Order / Project / Procurement Ref"?: string;
  "Actual Cost QAR"?: number;
  Attachments: string[];
  lines: CostingLine[];
  approvalHistory: Array<{ time: string; action: string; by: string; notes: string }>;
}

export interface CostingSummary {
  "Total Native Cost": number;
  "Total Cost QAR": number;
  "Total Freight": number;
  "Total Customs": number;
  "Total Clearance": number;
  "Total Insurance": number;
  "Total Bank Charges": number;
  "Total Warranty Cost": number;
  "Total Installation Cost": number;
  "Total Service Cost": number;
  "Total Other Charges": number;
  "Total Landed Cost": number;
  "Total Selling Price": number;
  "Total Discount": number;
  "Final Quotation Value": number;
  "VAT / Tax if applicable": number;
  "Net Total": number;
  "Gross Profit": number;
  "Gross Margin %": number;
}

export const COSTING_STORAGE_KEY = "medtech-demo:sales-costings:v1";
export const COSTING_MARGIN_THRESHOLD = 18;
export const COSTING_DISCOUNT_THRESHOLD = 10;
export const COSTING_VALUE_THRESHOLD = 500000;
export const costingStatuses: CostingStatus[] = ["Draft", "Under Review", "Approved", "Quotation Created", "Cancelled", "Archived"];
export const costingApprovalStatuses: CostingApprovalStatus[] = ["Draft", "Pending", "Approved", "Rejected"];
export const costingPathways: CostingPathway[] = ["SFS", "GPPRR", "Pharma Tender", "PSO", "Service", "AMC"];

export const costingLineColumns = [
  "Line No", "SKU Code", "Product Name", "Supplier / Principal", "Category", "UoM", "Quantity", "Native Cost Currency",
  "Native Unit Cost", "Exchange Rate", "Unit Cost QAR", "Total Cost QAR", "Freight %", "Customs %", "Clearance Charges",
  "Insurance %", "Bank Charges %", "Warranty Cost %", "Installation Cost", "Service Cost", "Other Charges", "Landed Cost",
  "Margin %", "Margin Amount", "Selling Unit Price", "Discount %", "Final Unit Price", "Line Total Selling Price",
  "Gross Profit", "Gross Margin %", "Lead Time Days", "Delivery Terms", "Remarks"
] as const;

export function calculateLine(input: CostingLine): CostingLine {
  const quantity = nonNegative(input.Quantity);
  const exchange = input["Native Cost Currency"] === "QAR" ? 1 : nonNegative(input["Exchange Rate"]);
  const unitCostQar = nonNegative(input["Unit Cost QAR"] || input["Native Unit Cost"] * exchange);
  const totalCost = round(quantity * unitCostQar);
  const freight = totalCost * pct(input["Freight %"]);
  const customs = totalCost * pct(input["Customs %"]);
  const insurance = totalCost * pct(input["Insurance %"]);
  const bank = totalCost * pct(input["Bank Charges %"]);
  const warranty = totalCost * pct(input["Warranty Cost %"]);
  const installation = nonNegative(input["Installation Cost"]);
  const service = nonNegative(input["Service Cost"]);
  const other = nonNegative(input["Other Charges"]);
  const clearance = nonNegative(input["Clearance Charges"]);
  const landedCost = round(totalCost + freight + customs + clearance + insurance + bank + warranty + installation + service + other);
  const sellingUnit = quantity ? round((landedCost / quantity) / Math.max(0.01, 1 - pct(input["Margin %"]))) : 0;
  const finalUnit = round(sellingUnit * (1 - pct(input["Discount %"])));
  const sellingTotal = round(finalUnit * quantity);
  const grossProfit = round(sellingTotal - landedCost);
  return {
    ...input,
    Quantity: quantity,
    "Exchange Rate": exchange,
    "Unit Cost QAR": unitCostQar,
    "Total Cost QAR": totalCost,
    "Landed Cost": landedCost,
    "Margin Amount": round(sellingTotal - landedCost),
    "Selling Unit Price": sellingUnit,
    "Final Unit Price": finalUnit,
    "Line Total Selling Price": sellingTotal,
    "Gross Profit": grossProfit,
    "Gross Margin %": sellingTotal ? round((grossProfit / sellingTotal) * 100) : 0
  };
}

export function calculateCosting(sheet: CostingSheet): CostingSheet {
  return { ...sheet, lines: sheet.lines.map(calculateLine) };
}

export function costingSummary(sheet: Pick<CostingSheet, "lines">): CostingSummary {
  const lines = sheet.lines.map(calculateLine);
  const totalCost = sum(lines, "Total Cost QAR");
  const totalSellingBeforeDiscount = lines.reduce((total, line) => total + line["Selling Unit Price"] * line.Quantity, 0);
  const finalValue = sum(lines, "Line Total Selling Price");
  const grossProfit = round(finalValue - sum(lines, "Landed Cost"));
  return {
    "Total Native Cost": round(lines.reduce((total, line) => total + line.Quantity * line["Native Unit Cost"], 0)),
    "Total Cost QAR": totalCost,
    "Total Freight": round(lines.reduce((total, line) => total + line["Total Cost QAR"] * pct(line["Freight %"]), 0)),
    "Total Customs": round(lines.reduce((total, line) => total + line["Total Cost QAR"] * pct(line["Customs %"]), 0)),
    "Total Clearance": sum(lines, "Clearance Charges"),
    "Total Insurance": round(lines.reduce((total, line) => total + line["Total Cost QAR"] * pct(line["Insurance %"]), 0)),
    "Total Bank Charges": round(lines.reduce((total, line) => total + line["Total Cost QAR"] * pct(line["Bank Charges %"]), 0)),
    "Total Warranty Cost": round(lines.reduce((total, line) => total + line["Total Cost QAR"] * pct(line["Warranty Cost %"]), 0)),
    "Total Installation Cost": sum(lines, "Installation Cost"),
    "Total Service Cost": sum(lines, "Service Cost"),
    "Total Other Charges": sum(lines, "Other Charges"),
    "Total Landed Cost": sum(lines, "Landed Cost"),
    "Total Selling Price": round(totalSellingBeforeDiscount),
    "Total Discount": round(totalSellingBeforeDiscount - finalValue),
    "Final Quotation Value": finalValue,
    "VAT / Tax if applicable": 0,
    "Net Total": finalValue,
    "Gross Profit": grossProfit,
    "Gross Margin %": finalValue ? round((grossProfit / finalValue) * 100) : 0
  };
}

export function costingWarnings(sheet: CostingSheet) {
  const summary = costingSummary(sheet);
  const warnings: string[] = [];
  if (summary["Gross Margin %"] < COSTING_MARGIN_THRESHOLD) warnings.push(`Margin below ${COSTING_MARGIN_THRESHOLD}% threshold`);
  sheet.lines.map(calculateLine).forEach(line => {
    const product = productMasterRows.find(item => item["SKU Code"] === line["SKU Code"]);
    pricingWarningsForLine({ sku: line["SKU Code"], customer: sheet.Customer, businessUnit: sheet["Business Unit"], category: line.Category, discountPercent: line["Discount %"], pathway: sheet["Sales Pathway"], sellingPrice: line["Final Unit Price"], marginPercent: line["Gross Margin %"] }).forEach(warning => warnings.push(`${line["Line No"]}: ${warning}`));
    if (line["Line Total Selling Price"] < line["Landed Cost"]) warnings.push(`${line["Line No"]}: selling price below landed cost`);
    if (line["Native Cost Currency"] !== "QAR" && !line["Exchange Rate"]) warnings.push(`${line["Line No"]}: exchange rate missing`);
    if (line["Lead Time Days"] >= 45) warnings.push(`${line["Line No"]}: high lead time`);
    if (product?.["Expiry Controlled"] === "Yes") warnings.push(`${line["Line No"]}: expiry-controlled product`);
    if (product?.["Batch Tracking Required"] === "Yes") warnings.push(`${line["Line No"]}: batch-tracked product`);
    if (product?.["Cold Chain Required"] === "Yes") warnings.push(`${line["Line No"]}: cold-chain required`);
    if (product?.["Regulatory Registration Status"] && product["Regulatory Registration Status"] !== "Registered") warnings.push(`${line["Line No"]}: regulatory registration not registered`);
  });
  return Array.from(new Set(warnings));
}

export function approvalReasons(sheet: CostingSheet) {
  const summary = costingSummary(sheet);
  const maxDiscount = Math.max(0, ...sheet.lines.map(line => line["Discount %"]));
  const pricingWarnings = sheet.lines.flatMap(line => pricingWarningsForLine({ sku: line["SKU Code"], customer: sheet.Customer, businessUnit: sheet["Business Unit"], category: line.Category, discountPercent: line["Discount %"], pathway: sheet["Sales Pathway"], sellingPrice: calculateLine(line)["Final Unit Price"], marginPercent: calculateLine(line)["Gross Margin %"] }));
  return [
    ...(summary["Gross Margin %"] < COSTING_MARGIN_THRESHOLD ? ["Margin below threshold"] : []),
    ...(maxDiscount > COSTING_DISCOUNT_THRESHOLD ? ["Discount above threshold"] : []),
    ...(pricingWarnings.some(warning => warning.includes("minimum") || warning.includes("floor")) ? ["Pricing floor exception"] : []),
    ...(summary["Final Quotation Value"] > COSTING_VALUE_THRESHOLD ? ["Total value above threshold"] : []),
    ...(sheet["Sales Pathway"] === "Pharma Tender" ? ["Pharma Tender special pricing"] : []),
    ...(sheet["Sales Pathway"] === "PSO" && summary["Gross Margin %"] < 25 ? ["Project Sales Order margin change"] : [])
  ];
}

export function seedCostingSheets(): CostingSheet[] {
  return [
    sheet("CST-2026-0001", "SFS", "ENQ-2026-0098", "OPP-2026-0001", "Sidra Medicine - ICU", "ORG-SID-SMC-ICU-001", "Medical Equipment", "ICU", "R. Mathew", "Approved", "Approved", [line("1", "ME-PM-0750", 6, 5200, 3.95, 4, 5, 2500, 1, 1, 2, 4800, 1800, 0, 28, 3)]),
    sheet("CST-2026-0002", "Pharma Tender", "ENQ-2026-0109", "OPP-2026-0002", "Pearl Medical Center - Pharmacy", "ORG-PEARL-PMC-PHA-001", "Pharma", "Pharmacy", "F. Al-Kuwari", "Under Review", "Pending", [line("1", "CS-NGL-M", 900, 5.25, 3.64, 7, 5, 1800, 1, 0.8, 1, 0, 0, 0, 14, 4)]),
    sheet("CST-2026-0003", "GPPRR", "ENQ-2026-0112", "OPP-2026-0003", "Hamad General Hospital - Laboratory", "ORG-HMC-HGH-LAB-001", "Diagnostics", "Laboratory", "F. Al-Kuwari", "Draft", "Draft", [line("1", "DX-TRP-100", 60, 390, 3.64, 6, 5, 1200, 1, 1, 1.5, 0, 900, 0, 28, 6)]),
    sheet("CST-2026-0004", "PSO", "", "OPP-2026-0004", "Hamad General Hospital - Laboratory", "ORG-HMC-HGH-LAB-001", "Projects", "Projects", "K. Varghese", "Approved", "Approved", [line("1", "PRJ-LAB-001", 1, 1120000, 1, 3, 5, 18000, 0.5, 0.5, 2, 120000, 85000, 25000, 75, 18)]),
    sheet("CST-2026-0005", "AMC", "", "OPP-2026-0005", "Sidra Medicine - ICU", "ORG-SID-SMC-ICU-001", "Service", "Service", "Naveen Kumar", "Draft", "Draft", [manualLine("1", "SRV-AMC-001", "Annual service contract - ICU monitors", "Siemens Healthineers", "Service Contract", "Year", 1, "QAR", 42000, 1, 0, 0, 0, 0, 0, 1, 0, 9000, 2500, 35, 0, 365)])
  ].map(calculateCosting);
}

export function approvedCostingExists(costingNo: string) {
  const normalized = costingNo.trim().toLowerCase();
  if (!normalized) return false;
  const rows = typeof window === "undefined" ? seedCostingSheets() : readStoredCostings();
  return rows.some(row => row["Costing Sheet No"].toLowerCase() === normalized && row["Approval Status"] === "Approved");
}

function readStoredCostings() {
  try {
    const stored = localStorage.getItem(COSTING_STORAGE_KEY);
    return stored ? JSON.parse(stored) as CostingSheet[] : seedCostingSheets();
  } catch {
    return seedCostingSheets();
  }
}

export function blankCosting(copy?: CostingSheet): CostingSheet {
  const nextNo = `CST-2026-${String(Date.now() % 10000).padStart(4, "0")}`;
  const customer = copy ? customerByName(copy.Customer) : customerMasterRows[0];
  return calculateCosting({
    id: id("costing"),
    "Costing Sheet No": nextNo,
    "Costing Date": today(),
    "Revision No": copy ? String(Number(copy["Revision No"] || 1) + 1) : "1",
    "Related Enquiry No": copy?.["Related Enquiry No"] ?? "",
    "Related Opportunity No": copy?.["Related Opportunity No"] ?? "",
    "Sales Pathway": copy?.["Sales Pathway"] ?? "SFS",
    Customer: copy?.Customer ?? customer["Customer Name"],
    "Customer Code": copy?.["Customer Code"] ?? customer["Customer Code"],
    "Business Unit": copy?.["Business Unit"] ?? customer["Business Unit"],
    Department: copy?.Department ?? customer.Department,
    Salesperson: copy?.Salesperson ?? "F. Al-Kuwari",
    "Prepared By": copy?.["Prepared By"] ?? "Sales Team",
    Currency: copy?.Currency ?? customer.Currency ?? "QAR",
    "Exchange Rate": copy?.["Exchange Rate"] ?? 1,
    "Payment Terms": copy?.["Payment Terms"] ?? customer["Payment Terms"] ?? "30 days",
    "Validity Date": copy?.["Validity Date"] ?? addDays(30),
    Status: "Draft",
    "Approval Status": "Draft",
    Notes: copy?.Notes ?? "",
    Attachments: copy?.Attachments ?? [],
    lines: copy?.lines.map((item, index) => ({ ...item, id: id("line"), "Line No": String(index + 1) })) ?? [line("1", "ME-PM-0750", 1, 5200, 3.95, 4, 5, 750, 1, 1, 2, 800, 0, 0, 30, 0)],
    approvalHistory: [{ time: now(), action: copy ? "COPY REVISION" : "CREATE", by: "Local Demo", notes: copy ? `Copied from ${copy["Costing Sheet No"]} Rev ${copy["Revision No"]}` : "Draft costing created" }]
  });
}

export function lineFromProduct(sku: string, lineNo: number, context: { customer?: string; businessUnit?: string; pathway?: string } = {}): CostingLine {
  const product = productMasterRows.find(row => row["SKU Code"] === sku) ?? productMasterRows[0];
  const supplier = supplierMasterRows.find(row => row["Supplier Code"] === product["Supplier Code"]);
  const pricing = resolvePricing({ sku: product["SKU Code"], customer: context.customer, businessUnit: context.businessUnit || product["Business Unit"], category: product.Category, pathway: context.pathway });
  return manualLine(String(lineNo), product["SKU Code"], product["Product Name"], product["Supplier Name"], product.Category, product.UoM, 1, product["Cost Currency"], Number(product["Native Cost"] || 0), Number(product["Cost Currency"] === "QAR" ? 1 : Number(product["QAR Cost"] || 0) / Math.max(1, Number(product["Native Cost"] || 0))), 4, 5, 500, 1, 1, 2, 0, 0, 0, pricing.targetMarginPercent, 0, Number(supplier?.["Lead Time Days"] || product["Lead Time Days"] || 0), "DAP MedTech Doha", `Pricing source: ${pricing.source}; max discount ${pricing.maxDiscountPercent}%`);
}

export function importCostingRows(rows: Record<string, unknown>[]) {
  const errors: Array<{ row: number; message: string }> = [];
  const lines: CostingLine[] = [];
  rows.forEach((row, index) => {
    const sku = text(row["SKU Code"]);
    const product = text(row["Product Name"]);
    const quantity = num(row.Quantity);
    if (!sku || !product || quantity <= 0) errors.push({ row: index + 2, message: "SKU Code, Product Name and positive Quantity are required" });
    else lines.push(calculateLine(manualLine(text(row["Line No"]) || String(index + 1), sku, product, text(row["Supplier / Principal"]), text(row.Category), text(row.UoM) || "Unit", quantity, text(row["Native Cost Currency"]) || "QAR", num(row["Native Unit Cost"]), num(row["Exchange Rate"]) || 1, num(row["Freight %"]), num(row["Customs %"]), num(row["Clearance Charges"]), num(row["Insurance %"]), num(row["Bank Charges %"]), num(row["Warranty Cost %"]), num(row["Installation Cost"]), num(row["Service Cost"]), num(row["Other Charges"]), num(row["Margin %"]), num(row["Discount %"]), num(row["Lead Time Days"]), text(row["Delivery Terms"]), text(row.Remarks))));
  });
  return { lines, errors };
}

function sheet(no: string, pathway: CostingPathway, enquiry: string, opportunity: string, customerName: string, customerCode: string, bu: string, department: string, salesperson: string, status: CostingStatus, approval: CostingApprovalStatus, lines: CostingLine[]): CostingSheet {
  const customer = customerMasterRows.find(row => row["Customer Code"] === customerCode) ?? customerMasterRows[0];
  return {
    id: id(no),
    "Costing Sheet No": no,
    "Costing Date": "2026-06-20",
    "Revision No": "1",
    "Related Enquiry No": enquiry,
    "Related Opportunity No": opportunity,
    "Sales Pathway": pathway,
    Customer: customerName,
    "Customer Code": customerCode,
    "Business Unit": bu,
    Department: department,
    Salesperson: salesperson,
    "Prepared By": salesperson,
    Currency: customer.Currency || "QAR",
    "Exchange Rate": 1,
    "Payment Terms": customer["Payment Terms"] || "30 days",
    "Validity Date": "2026-07-20",
    Status: status,
    "Approval Status": approval,
    Notes: "Local demo costing sheet. No external source.",
    Attachments: ["Supplier quote placeholder", "Principal price confirmation placeholder"],
    lines,
    approvalHistory: [{ time: now(), action: "CREATE", by: salesperson, notes: "Seed costing created locally" }, ...(approval === "Approved" ? [{ time: now(), action: "APPROVE", by: "Sales Director", notes: "Approved for quotation" }] : [])]
  };
}

function line(lineNo: string, sku: string, quantity: number, nativeCost: number, exchangeRate: number, freight: number, customs: number, clearance: number, insurance: number, bank: number, warranty: number, installation: number, service: number, other: number, leadTime: number, discount: number) {
  const product = productMasterRows.find(row => row["SKU Code"] === sku);
  return manualLine(lineNo, sku, product?.["Product Name"] ?? sku, product?.["Supplier Name"] ?? "", product?.Category ?? "", product?.UoM ?? "Unit", quantity, product?.["Cost Currency"] ?? "QAR", nativeCost, exchangeRate, freight, customs, clearance, insurance, bank, warranty, installation, service, other, 24, discount, leadTime, "DAP MedTech Doha", product?.Notes ?? "");
}

function manualLine(lineNo: string, sku: string, product: string, supplier: string, category: string, uom: string, quantity: number, currency: string, nativeCost: number, exchangeRate: number, freight: number, customs: number, clearance: number, insurance: number, bank: number, warranty: number, installation: number, service: number, other: number, margin: number, discount: number, leadTime: number, deliveryTerms = "DAP MedTech Doha", remarks = ""): CostingLine {
  return calculateLine({
    id: id(`line-${lineNo}`), "Line No": lineNo, "SKU Code": sku, "Product Name": product, "Supplier / Principal": supplier, Category: category, UoM: uom,
    Quantity: quantity, "Native Cost Currency": currency, "Native Unit Cost": nativeCost, "Exchange Rate": exchangeRate, "Unit Cost QAR": 0, "Total Cost QAR": 0,
    "Freight %": freight, "Customs %": customs, "Clearance Charges": clearance, "Insurance %": insurance, "Bank Charges %": bank, "Warranty Cost %": warranty,
    "Installation Cost": installation, "Service Cost": service, "Other Charges": other, "Landed Cost": 0, "Margin %": margin, "Margin Amount": 0,
    "Selling Unit Price": 0, "Discount %": discount, "Final Unit Price": 0, "Line Total Selling Price": 0, "Gross Profit": 0, "Gross Margin %": 0,
    "Lead Time Days": leadTime, "Delivery Terms": deliveryTerms, Remarks: remarks
  });
}

function customerByName(name: string) {
  return customerMasterRows.find(row => row["Customer Name"] === name || row["Organization Name"] === name) ?? customerMasterRows[0];
}

function sum(lines: CostingLine[], key: keyof CostingLine) {
  return round(lines.reduce((total, line) => total + Number(line[key] || 0), 0));
}

function pct(value: number) { return nonNegative(value) / 100; }
function nonNegative(value: number) { return Number.isFinite(value) && value > 0 ? value : 0; }
function round(value: number) { return Math.round((Number.isFinite(value) ? value : 0) * 100) / 100; }
function num(value: unknown) { const parsed = Number(String(value ?? "").replace(/[^0-9.-]/g, "")); return Number.isFinite(parsed) ? parsed : 0; }
function text(value: unknown) { return String(value ?? "").trim(); }
function today() { return new Date().toISOString().slice(0, 10); }
function now() { return new Date().toLocaleString("en-GB", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }); }
function addDays(days: number) { const date = new Date(); date.setDate(date.getDate() + days); return date.toISOString().slice(0, 10); }
function id(prefix: string) { return `${prefix}-${Math.random().toString(36).slice(2, 9)}`; }
