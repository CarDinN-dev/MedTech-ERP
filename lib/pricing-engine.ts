import { submitApprovalRequest } from "@/lib/approval-matrix";
import { appendAuditLog } from "@/lib/audit-store";
import { customerMasterRows, productMasterRows } from "@/lib/master-data";

type Status = "Draft" | "Active" | "Approved" | "Expired" | "Inactive" | "Pending approval";

export interface Pricelist {
  id: string;
  "Pricelist Code": string;
  "Pricelist Name": string;
  Currency: string;
  "Customer Segment": string;
  "Business Unit": string;
  "Effective From": string;
  "Effective To": string;
  Status: Status;
  Notes: string;
  lines: PricelistLine[];
}

export interface PricelistLine {
  id: string;
  SKU: string;
  "Product Name": string;
  "List Price": number;
  "Minimum Selling Price": number;
  "Target Margin %": number;
  "Maximum Discount %": number;
  "Effective From": string;
  "Effective To": string;
}

export interface ContractPrice {
  id: string;
  Customer: string;
  "Contract No": string;
  "SKU/Product Category": string;
  "Contract Price": number;
  Validity: string;
  "Payment Terms": string;
  "Delivery Terms": string;
  Status: Status;
}

export interface MarginRule {
  id: string;
  BU: string;
  "Product Category": string;
  "Target Margin %": number;
  "Margin Floor %": number;
  Status: Status;
}

export interface DiscountRule {
  id: string;
  BU: string;
  "Product Category": string;
  "Customer Tier": string;
  "Sales Role": string;
  "Max Discount %": number;
  "Approval Required Above %": number;
  "Margin Floor %": number;
  Status: Status;
}

export interface SpecialTenderPrice {
  id: string;
  Tender: string;
  Customer: string;
  SKU: string;
  "Special Price": number;
  "Valid Until": string;
  Pathway: "Pharma Tender" | "PSO";
  Status: Status;
  "Approval Status": "Pending" | "Approved" | "Rejected";
}

export interface PricingException {
  id: string;
  Source: string;
  Customer: string;
  SKU: string;
  Reason: string;
  "Approval Request No": string;
  Status: "Warning" | "Pending approval" | "Approved";
}

export interface PricingState {
  pricelists: Pricelist[];
  contracts: ContractPrice[];
  marginRules: MarginRule[];
  discountRules: DiscountRule[];
  specialTenderPrices: SpecialTenderPrice[];
  exceptions: PricingException[];
}

export interface PricingInput {
  sku: string;
  customer?: string;
  businessUnit?: string;
  category?: string;
  quantity?: number;
  discountPercent?: number;
  salesRole?: string;
  pathway?: string;
  date?: string;
}

export interface PricingResult {
  source: string;
  listPrice: number;
  minimumSellingPrice: number;
  targetMarginPercent: number;
  maxDiscountPercent: number;
  approvalRequiredAbovePercent: number;
  marginFloorPercent: number;
  warnings: string[];
}

export const PRICING_STORAGE_KEY = "medtech-demo:pricing-engine:v1";

export function seedPricingState(): PricingState {
  const today = "2026-06-20";
  return {
    pricelists: [
      {
        id: id("pl"), "Pricelist Code": "PL-QA-GOV-DX-2026", "Pricelist Name": "Qatar Government Diagnostics 2026", Currency: "QAR", "Customer Segment": "Government", "Business Unit": "Diagnostics", "Effective From": "2026-01-01", "Effective To": "2026-12-31", Status: "Active", Notes: "Default local pricing for public hospitals.",
        lines: [
          line("DX-TRP-100", 1860, 1580, 28, 10, "2026-01-01", "2026-12-31"),
          line("CS-NGL-M", 28, 23, 22, 8, "2026-01-01", "2026-12-31")
        ]
      },
      {
        id: id("pl"), "Pricelist Code": "PL-ME-SEMI-2026", "Pricelist Name": "Semi-government Equipment 2026", Currency: "QAR", "Customer Segment": "Semi-government", "Business Unit": "Medical Equipment", "Effective From": "2026-01-01", "Effective To": "2026-12-31", Status: "Active", Notes: "Patient monitoring list prices.",
        lines: [line("ME-PM-0750", 28500, 25200, 24, 12, "2026-01-01", "2026-12-31")]
      }
    ],
    contracts: [
      { id: id("ctr"), Customer: "Hamad General Hospital - Laboratory", "Contract No": "HMC-DX-2026", "SKU/Product Category": "DX-TRP-100", "Contract Price": 1725, Validity: "2026-12-31", "Payment Terms": "60 days", "Delivery Terms": "DAP HMC Stores", Status: "Approved" }
    ],
    marginRules: [
      { id: id("mr"), BU: "Diagnostics", "Product Category": "Reagents", "Target Margin %": 28, "Margin Floor %": 18, Status: "Active" },
      { id: id("mr"), BU: "Medical Equipment", "Product Category": "Equipment", "Target Margin %": 24, "Margin Floor %": 18, Status: "Active" },
      { id: id("mr"), BU: "Projects", "Product Category": "Project Package", "Target Margin %": 25, "Margin Floor %": 20, Status: "Active" }
    ],
    discountRules: [
      { id: id("dr"), BU: "Diagnostics", "Product Category": "Reagents", "Customer Tier": "Government", "Sales Role": "Sales Manager", "Max Discount %": 10, "Approval Required Above %": 10, "Margin Floor %": 18, Status: "Active" },
      { id: id("dr"), BU: "Medical Equipment", "Product Category": "Equipment", "Customer Tier": "Semi-government", "Sales Role": "Sales Manager", "Max Discount %": 12, "Approval Required Above %": 12, "Margin Floor %": 18, Status: "Active" },
      { id: id("dr"), BU: "Pharma", "Product Category": "Consumables", "Customer Tier": "Private", "Sales Role": "Sales Executive", "Max Discount %": 8, "Approval Required Above %": 8, "Margin Floor %": 15, Status: "Active" }
    ],
    specialTenderPrices: [
      { id: id("sp"), Tender: "MOPH/TEN/2026/882", Customer: "Ministry of Public Health", SKU: "CS-NGL-M", "Special Price": 24.5, "Valid Until": "2026-09-30", Pathway: "Pharma Tender", Status: "Pending approval", "Approval Status": "Pending" },
      { id: id("sp"), Tender: "PSO-2026-0007", Customer: "National Reference Lab", SKU: "PRJ-LAB-001", "Special Price": 1450000, "Valid Until": "2026-10-31", Pathway: "PSO", Status: "Pending approval", "Approval Status": "Pending" }
    ],
    exceptions: [
      { id: id("ex"), Source: "QTN-2026-00314", Customer: "Hamad Medical Corporation", SKU: "DX-TRP-100", Reason: "18% discount is above rule.", "Approval Request No": "", Status: "Pending approval" }
    ]
  };
}

export function readPricingState(): PricingState {
  if (typeof window === "undefined") return seedPricingState();
  try {
    const stored = localStorage.getItem(PRICING_STORAGE_KEY);
    return stored ? JSON.parse(stored) as PricingState : seedPricingState();
  } catch {
    return seedPricingState();
  }
}

export function writePricingState(state: PricingState) {
  localStorage.setItem(PRICING_STORAGE_KEY, JSON.stringify(state));
  window.dispatchEvent(new CustomEvent("medtech:pricing", { detail: state }));
}

export function resolvePricing(input: PricingInput, state = readPricingState()): PricingResult {
  const date = input.date || today();
  const product = productMasterRows.find(row => row["SKU Code"] === input.sku);
  const customer = customerMasterRows.find(row => row["Customer Name"] === input.customer || row["Organization Name"] === input.customer);
  const bu = input.businessUnit || product?.["Business Unit"] || "";
  const category = input.category || product?.Category || "";
  const tier = customer?.Segment || "Standard";
  const contract = state.contracts.find(item => item.Status === "Approved" && item.Customer === input.customer && active(date, "2026-01-01", item.Validity) && [input.sku, category].includes(item["SKU/Product Category"]));
  const pricelist = state.pricelists.find(item => item.Status === "Active" && item["Business Unit"] === bu && (!customer || item["Customer Segment"] === customer.Segment) && active(date, item["Effective From"], item["Effective To"]));
  const plLine = pricelist?.lines.find(item => item.SKU === input.sku && active(date, item["Effective From"], item["Effective To"]));
  const marginRule = state.marginRules.find(item => item.Status === "Active" && item.BU === bu && item["Product Category"] === category);
  const discountRule = state.discountRules.find(item => item.Status === "Active" && item.BU === bu && item["Product Category"] === category && item["Customer Tier"] === tier);
  const special = state.specialTenderPrices.find(item => item.SKU === input.sku && item.Pathway === input.pathway && item.Status === "Approved" && active(date, "2026-01-01", item["Valid Until"]));
  const listPrice = special?.["Special Price"] ?? contract?.["Contract Price"] ?? plLine?.["List Price"] ?? money(product?.["List Price"]);
  const targetMargin = plLine?.["Target Margin %"] ?? marginRule?.["Target Margin %"] ?? 25;
  const maxDiscount = plLine?.["Maximum Discount %"] ?? discountRule?.["Max Discount %"] ?? 10;
  const floor = discountRule?.["Margin Floor %"] ?? marginRule?.["Margin Floor %"] ?? 18;
  const source = special ? "Special tender pricing" : contract ? "Customer contract pricing" : plLine ? pricelist?.["Pricelist Code"] || "Pricelist" : "Product master";
  const warnings = [
    ...(!contract && !plLine && !special ? ["No active pricelist or contract price found."] : []),
    ...(input.discountPercent && input.discountPercent > maxDiscount ? [`Discount ${input.discountPercent}% above allowed ${maxDiscount}%.`] : []),
    ...(input.pathway === "Pharma Tender" || input.pathway === "PSO" ? ["Special tender/PSO pricing requires approval."] : []),
    ...(pricelist && !active(date, pricelist["Effective From"], pricelist["Effective To"]) ? ["Expired pricelist cannot be used for final quotation."] : []),
    ...(contract && !active(date, "2026-01-01", contract.Validity) ? ["Expired contract price cannot be used for final quotation."] : [])
  ];
  return { source, listPrice, minimumSellingPrice: plLine?.["Minimum Selling Price"] ?? round(listPrice * (1 - maxDiscount / 100)), targetMarginPercent: targetMargin, maxDiscountPercent: maxDiscount, approvalRequiredAbovePercent: discountRule?.["Approval Required Above %"] ?? maxDiscount, marginFloorPercent: floor, warnings };
}

export function pricingWarningsForLine(input: PricingInput & { sellingPrice: number; marginPercent: number }, state = readPricingState()) {
  const result = resolvePricing(input, state);
  return [
    ...result.warnings,
    ...(input.sellingPrice < result.minimumSellingPrice ? [`Selling price below minimum ${qar(result.minimumSellingPrice)}.`] : []),
    ...(input.marginPercent < result.marginFloorPercent ? [`Margin below floor ${result.marginFloorPercent}%.`] : [])
  ];
}

export function submitPricingApproval(sourceRecord: string, customer: string, sku: string, reason: string, requestedBy: string) {
  const result = submitApprovalRequest({ sourceModule: "Sales", sourceRecord, requestType: "Price approval exception", requestedBy, businessUnit: "Sales" });
  appendAuditLog({ action: "SUBMIT PRICING APPROVAL", module: "Pricing Engine", record: sourceRecord, details: `${sku}: ${reason}` });
  return result;
}

export function validateQuotationPricing(record: Record<string, string>, state = readPricingState()) {
  if (record["Costing Sheet No"]) return "";
  const customer = record.Customer || "";
  const date = record.Date || today();
  const activeList = state.pricelists.some(item => item.Status === "Active" && active(date, item["Effective From"], item["Effective To"]));
  const activeContract = state.contracts.some(item => item.Status === "Approved" && item.Customer === customer && active(date, "2026-01-01", item.Validity));
  return activeList || activeContract ? "" : `${record.Quotation || "Quotation"} needs an active pricelist, active contract, or approved costing before final quotation submission`;
}

function line(sku: string, listPrice: number, minPrice: number, margin: number, discount: number, from: string, to: string): PricelistLine {
  const product = productMasterRows.find(row => row["SKU Code"] === sku);
  return { id: id("pll"), SKU: sku, "Product Name": product?.["Product Name"] || sku, "List Price": listPrice, "Minimum Selling Price": minPrice, "Target Margin %": margin, "Maximum Discount %": discount, "Effective From": from, "Effective To": to };
}

function active(date: string, from: string, to: string) {
  return (!from || date >= from) && (!to || date <= to);
}

function money(value?: string) {
  const parsed = Number(String(value ?? "").replace(/[^0-9.-]/g, ""));
  return Number.isFinite(parsed) ? parsed : 0;
}

function qar(value: number) {
  return `QAR ${Math.round(value).toLocaleString("en-US")}`;
}

function round(value: number) {
  return Math.round((Number.isFinite(value) ? value : 0) * 100) / 100;
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

function id(prefix: string) {
  return `${prefix}-${Math.random().toString(36).slice(2, 9)}`;
}
