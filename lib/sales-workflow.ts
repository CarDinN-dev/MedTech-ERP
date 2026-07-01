import { hasApprovedApproval } from "@/lib/approval-matrix";
import { pricingWarningsForLine } from "@/lib/pricing-engine";

export type SalesPathwayKey = "sfs" | "gpprr" | "tender" | "pso";
export type ApprovalStatus = "Not required" | "Pending" | "Approved" | "Rejected";
export type WorkflowOutcome = "" | "Won" | "Lost" | "Awarded";

export interface SalesWorkflowLine {
  id: string;
  product: string;
  sku: string;
  quantity: number;
  unitPrice: number;
  unitCost: number;
  discountPercent: number;
  location: string;
  minStock: number;
  forecastQty: number;
  actualQty: number;
  batchNo: string;
  expiryDate: string;
}

export interface SalesWorkflowDocument {
  id: string;
  type: string;
  number: string;
  status: string;
  date: string;
}

export interface SalesWorkflowAudit {
  id: string;
  time: string;
  action: string;
  detail: string;
}

export interface SalesWorkflowRecord {
  id: string;
  pathway: SalesPathwayKey;
  reference: string;
  title: string;
  customer: string;
  owner: string;
  stageIndex: number;
  approvalStatus: ApprovalStatus;
  status: string;
  outcome: WorkflowOutcome;
  reason: string;
  qualificationNotes: string;
  specialistValidation: string;
  contractNumber: string;
  principal: string;
  tenderNumber: string;
  tenderExpiry: string;
  submissionDeadline: string;
  bidBond: string;
  paymentTerms: string;
  checklist: string;
  projectCode: string;
  linkedProject: string;
  departmentQuotes: string;
  milestoneSchedule: string;
  lines: SalesWorkflowLine[];
  documents: SalesWorkflowDocument[];
  audit: SalesWorkflowAudit[];
}

export const DISCOUNT_THRESHOLD = 10;

export const salesWorkflowPathways: Record<SalesPathwayKey, { label: string; shortLabel: string; stages: string[] }> = {
  sfs: {
    label: "Straight Forward Sales",
    shortLabel: "SFS",
    stages: ["Enquiry", "Claim", "Qualify", "Quote Preparation", "Functional Specialist Validation", "Sales Specialist Finalization", "Discount Approval if needed", "Submit to Customer", "Won/Lost", "Sales Order", "Delivery", "Invoice", "Payment", "Commission Posted"]
  },
  gpprr: {
    label: "GPPRR / recurring reagent replenishment",
    shortLabel: "GPPRR",
    stages: ["Master Contract", "Customer RFQ to Principal", "Principal Confirmation", "Minimum Stock Setup", "Initial Delivery Order", "Monthly Consumption Compare", "Replenishment Trigger", "Recurring Delivery SO", "Monthly Invoice", "Final Reconciliation"]
  },
  tender: {
    label: "Pharma Tender",
    shortLabel: "Tender",
    stages: ["Tender Intake", "Tender Creation", "Quotation Preparation", "Internal Approval", "Finance/Commercial Approval", "Submission", "Award/Loss", "LPO/Signing", "Procurement Trigger", "Scheduled Delivery", "Batch Compliance", "Closure"]
  },
  pso: {
    label: "Project Sales Order",
    shortLabel: "PSO",
    stages: ["Project Lead", "Placeholder Project", "Department Sub-Quotations", "Consolidated Quote", "Margin Review", "Multi-tier Approval", "Customer Submission", "Project Setup", "Milestone Delivery", "Advance/Progress/Retention Invoice", "Closure"]
  }
};

export function pathwayForSalesTab(tab: string): SalesPathwayKey | "workspace" | null {
  if (tab === "Sales Workflow") return "workspace";
  if (tab === "Straight Forward Sales") return "sfs";
  if (tab === "GPPRR") return "gpprr";
  if (tab === "Pharma Tender") return "tender";
  if (tab === "Project Sales") return "pso";
  return null;
}

export function workflowTotals(record: Pick<SalesWorkflowRecord, "lines">) {
  const gross = record.lines.reduce((sum, line) => sum + line.quantity * line.unitPrice, 0);
  const discount = record.lines.reduce((sum, line) => sum + line.quantity * line.unitPrice * (line.discountPercent / 100), 0);
  const net = gross - discount;
  const cost = record.lines.reduce((sum, line) => sum + line.quantity * line.unitCost, 0);
  const margin = net - cost;
  return { gross, discount, net, cost, margin, marginPercent: net ? (margin / net) * 100 : 0, maxDiscountPercent: Math.max(0, ...record.lines.map(line => line.discountPercent)) };
}

export function replenishmentAlerts(record: Pick<SalesWorkflowRecord, "lines">) {
  return record.lines.filter(line => line.actualQty >= line.forecastQty || line.minStock > Math.max(0, line.forecastQty - line.actualQty));
}

export function pricingControlWarnings(record: Pick<SalesWorkflowRecord, "lines" | "customer" | "pathway">) {
  const pathway = record.pathway === "tender" ? "Pharma Tender" : record.pathway === "pso" ? "PSO" : "";
  return record.lines.flatMap(line => {
    const sellingPrice = line.unitPrice * (1 - line.discountPercent / 100);
    const marginPercent = sellingPrice ? ((sellingPrice - line.unitCost) / sellingPrice) * 100 : 0;
    return pricingWarningsForLine({ sku: line.sku, customer: record.customer, discountPercent: line.discountPercent, pathway, sellingPrice, marginPercent }).map(warning => `${line.sku}: ${warning}`);
  });
}

export function validateStageExit(record: SalesWorkflowRecord) {
  const stage = salesWorkflowPathways[record.pathway].stages[record.stageIndex];
  const totals = workflowTotals(record);
  const pricingWarnings = pricingControlWarnings(record);
  const hasLines = record.lines.length > 0;
  const hasDocument = (type: string) => record.documents.some(document => document.type === type);

  if (!record.title.trim() || !record.customer.trim()) return "Title and customer are required.";
  if (["Quote Preparation", "Quotation Preparation", "Consolidated Quote"].includes(stage) && !hasLines) return "Add at least one product line before leaving quotation preparation.";
  if (record.pathway === "sfs") {
    const discountApproved = record.approvalStatus === "Approved" || hasApprovedApproval("Sales", record.reference, "Quotation discount");
    const dealValueApproved = totals.net <= 500000 || hasApprovedApproval("Sales", record.reference, "Sales deal value");
    if (stage === "Claim" && !record.owner.trim()) return "Owner is required before qualification.";
    if (stage === "Qualify" && !record.qualificationNotes.trim()) return "Qualification notes are required.";
    if (stage === "Functional Specialist Validation" && record.specialistValidation !== "Validated") return "Functional specialist validation must be marked Validated.";
    if (stage === "Discount Approval if needed" && (totals.maxDiscountPercent > DISCOUNT_THRESHOLD || pricingWarnings.length > 0) && !discountApproved && !hasApprovedApproval("Sales", record.reference, "Price approval exception")) return pricingWarnings[0] ? `Price approval required: ${pricingWarnings[0]}` : "Discount is above threshold; approval must be approved.";
    if (stage === "Won/Lost" && (!record.outcome || !record.reason.trim())) return "Outcome and win/loss reason are required.";
    if (stage === "Won/Lost" && record.outcome === "Lost") return "Lost deals stop at Won/Lost.";
    if (stage === "Sales Order" && !dealValueApproved) return "Sales deal value approval is required before sales order generation.";
    if (stage === "Sales Order" && !hasDocument("Sales Order")) return "Generate the local sales order first.";
    if (stage === "Delivery" && !hasDocument("Delivery / Reservation")) return "Generate the local delivery/reservation first.";
    if (stage === "Invoice" && !hasDocument("Invoice Draft")) return "Generate the local invoice draft first.";
    if (stage === "Payment" && !hasDocument("Commission Draft")) return "Generate the commission draft first.";
  }
  if (record.pathway === "gpprr") {
    if (stage === "Master Contract" && (!record.contractNumber.trim() || !record.principal.trim() || !hasLines)) return "Contract number, principal and item lines are required.";
    if (stage === "Minimum Stock Setup" && record.lines.some(line => !line.location.trim() || line.minStock <= 0)) return "Minimum stock per item/location is required.";
    if (stage === "Initial Delivery Order" && !hasDocument("Initial Delivery Order")) return "Generate the initial delivery order first.";
    if (stage === "Replenishment Trigger" && replenishmentAlerts(record).length === 0) return "No replenishment alert is currently triggered.";
    if (stage === "Recurring Delivery SO" && !hasDocument("Recurring Delivery SO")) return "Generate the recurring delivery sales order first.";
    if (stage === "Monthly Invoice" && !hasDocument("Monthly Invoice")) return "Generate the monthly invoice first.";
  }
  if (record.pathway === "tender") {
    if (stage === "Tender Intake" && (!record.tenderNumber.trim() || !record.submissionDeadline.trim())) return "Tender number and submission deadline are required.";
    if (stage === "Tender Creation" && (!record.tenderExpiry.trim() || !record.checklist.trim())) return "Tender validity/expiry and document checklist are required.";
    if (stage === "Internal Approval" && record.approvalStatus !== "Approved") return "Internal approval must be approved.";
    if (stage === "Finance/Commercial Approval" && record.approvalStatus !== "Approved") return "Finance/commercial approval must be approved.";
    if (stage === "Award/Loss" && (!record.outcome || !record.reason.trim())) return "Award/loss outcome and reason are required.";
    if (stage === "Procurement Trigger" && !hasDocument("Procurement Trigger")) return "Generate the local procurement trigger first.";
    if (stage === "Scheduled Delivery" && !hasDocument("Scheduled Delivery")) return "Generate the scheduled delivery document first.";
    if (stage === "Batch Compliance" && record.lines.some(line => !line.batchNo.trim() || !line.expiryDate.trim())) return "Batch number and expiry date are required for each tender item.";
  }
  if (record.pathway === "pso") {
    if (stage === "Placeholder Project" && !record.projectCode.trim()) return "Placeholder project code is required.";
    if (stage === "Department Sub-Quotations" && !record.departmentQuotes.trim()) return "Department sub-quotation lines are required.";
    if (stage === "Margin Review" && totals.marginPercent <= 0) return "Project margin must be positive.";
    if (stage === "Multi-tier Approval" && record.approvalStatus !== "Approved") return "Multi-tier approval must be approved.";
    if (stage === "Project Setup" && !record.linkedProject.trim()) return "Link the local Projects module record first.";
    if (stage === "Advance/Progress/Retention Invoice" && !hasDocument("Project Invoice Drafts")) return "Generate advance/progress/retention invoice drafts first.";
  }
  return "";
}

export function advanceWorkflow(record: SalesWorkflowRecord) {
  const error = validateStageExit(record);
  if (error) return { error, record };
  const stages = salesWorkflowPathways[record.pathway].stages;
  const nextIndex = Math.min(record.stageIndex + 1, stages.length - 1);
  return { record: addAudit({ ...record, stageIndex: nextIndex, status: nextIndex === stages.length - 1 ? "Closed" : "Active" }, "STAGE", `${stages[record.stageIndex]} -> ${stages[nextIndex]}`) };
}

export function approveWorkflow(record: SalesWorkflowRecord, decision: "Approved" | "Rejected") {
  return addAudit({ ...record, approvalStatus: decision }, decision === "Approved" ? "APPROVE" : "REJECT", `${salesWorkflowPathways[record.pathway].shortLabel} approval ${decision.toLowerCase()}`);
}

export function generateWorkflowDocument(record: SalesWorkflowRecord, type: string) {
  const requiredStage = documentStage(type);
  const currentStage = salesWorkflowPathways[record.pathway].stages[record.stageIndex];
  if (requiredStage && currentStage !== requiredStage) return { error: `${type} is generated from ${requiredStage}.`, record };
  if (record.documents.some(document => document.type === type)) return { error: `${type} already exists.`, record };
  const number = `${documentPrefix(type)}-2026-${String(record.documents.length + 1).padStart(4, "0")}`;
  const document: SalesWorkflowDocument = { id: id("doc"), type, number, status: "Draft", date: today() };
  return { record: addAudit({ ...record, documents: [document, ...record.documents] }, "DOCUMENT", `${type} ${number} generated locally`) };
}

export function linesToText(lines: SalesWorkflowLine[]) {
  return lines.map(line => [line.product, line.sku, line.quantity, line.unitPrice, line.unitCost, line.discountPercent, line.location, line.minStock, line.forecastQty, line.actualQty, line.batchNo, line.expiryDate].join("|")).join("\n");
}

export function textToLines(value: string): SalesWorkflowLine[] {
  return value.split(/\r?\n/).map(row => row.trim()).filter(Boolean).map((row, index) => {
    const [product = "", sku = "", quantity = "1", unitPrice = "0", unitCost = "0", discountPercent = "0", location = "", minStock = "0", forecastQty = "0", actualQty = "0", batchNo = "", expiryDate = ""] = row.split("|").map(cell => cell.trim());
    return { id: id(`line-${index}`), product, sku, quantity: number(quantity), unitPrice: number(unitPrice), unitCost: number(unitCost), discountPercent: number(discountPercent), location, minStock: number(minStock), forecastQty: number(forecastQty), actualQty: number(actualQty), batchNo, expiryDate };
  });
}

export function seedSalesWorkflows(): SalesWorkflowRecord[] {
  return [
    workflow("sfs", "SFS-2026-0031", "ICU Monitoring Upgrade", "Hamad Medical Corporation", "F. Al-Kuwari", 6, "Pending", "Quote discount approval", "Won", "Best technical compliance and delivery date accepted.", "Need confirmed with ICU biomedical team.", "Validated", [
      line("Patient Monitor MX750", "EQ-PM-0750", 8, 28500, 21400, 12, "Main Warehouse", 2, 8, 0),
      line("Adult SpO2 Sensor", "SP-SPO2-A", 16, 1350, 940, 8, "Main Warehouse", 8, 16, 0)
    ]),
    workflow("gpprr", "GPR-2026-0012", "Troponin reagent replenishment", "Sidra Medicine", "R. Mathew", 5, "Not required", "Consumption review", "", "", "Recurring reagent program for cardiology labs.", "Validated", [
      line("Troponin I Reagent Kit", "RG-TRP-100", 60, 1860, 1280, 5, "Cold Store", 24, 52, 57),
      line("Glucose Reagent", "RG-GLU-050", 40, 920, 610, 5, "Cold Store", 18, 36, 34)
    ], { contractNumber: "MC-2026-0044", principal: "Thermo Fisher" }),
    workflow("tender", "TEN-2026-0022", "Oncology pharmacy tender", "Ministry of Public Health", "L. D'Souza", 3, "Pending", "Internal approval", "", "", "National tender intake completed.", "Validated", [
      line("Infusion Pump Set", "PH-INF-010", 120, 540, 390, 4, "Tender Supply", 0, 120, 0, "BATCH-PENDING", "2027-12-31")
    ], { tenderNumber: "MOPH/TEN/2026/882", tenderExpiry: "2026-09-30", submissionDeadline: "2026-07-18", bidBond: "QAR 45,000", paymentTerms: "60 days", checklist: "Commercial offer, technical datasheets, bid bond, principal authorization" }),
    workflow("pso", "PSO-2026-0007", "Reference lab expansion", "National Reference Lab", "K. Varghese", 4, "Pending", "Margin review", "", "", "Project lead qualified.", "Validated", [
      line("Analyzer Installation Package", "PRJ-LAB-001", 1, 1450000, 1120000, 0, "Project Site", 0, 1, 0)
    ], { projectCode: "PRJ-HOLD-2026-0018", linkedProject: "Reference Lab Expansion", departmentQuotes: "Engineering: QAR 280,000\nService: QAR 95,000\nLogistics: QAR 42,000", milestoneSchedule: "Advance 20%, delivery 50%, commissioning 20%, retention 10%" })
  ];
}

function workflow(pathway: SalesPathwayKey, reference: string, title: string, customer: string, owner: string, stageIndex: number, approvalStatus: ApprovalStatus, status: string, outcome: WorkflowOutcome, reason: string, qualificationNotes: string, specialistValidation: string, lines: SalesWorkflowLine[], overrides: Partial<SalesWorkflowRecord> = {}): SalesWorkflowRecord {
  return {
    id: id(reference), pathway, reference, title, customer, owner, stageIndex, approvalStatus, status, outcome, reason, qualificationNotes, specialistValidation,
    contractNumber: "", principal: "", tenderNumber: "", tenderExpiry: "", submissionDeadline: "", bidBond: "", paymentTerms: "", checklist: "",
    projectCode: "", linkedProject: "", departmentQuotes: "", milestoneSchedule: "", lines, documents: [], audit: [audit("CREATE", "Seeded local sales workflow")], ...overrides
  };
}

function line(product: string, sku: string, quantity: number, unitPrice: number, unitCost: number, discountPercent: number, location: string, minStock: number, forecastQty: number, actualQty: number, batchNo = "", expiryDate = ""): SalesWorkflowLine {
  return { id: id(sku), product, sku, quantity, unitPrice, unitCost, discountPercent, location, minStock, forecastQty, actualQty, batchNo, expiryDate };
}

function addAudit(record: SalesWorkflowRecord, action: string, detail: string): SalesWorkflowRecord {
  return { ...record, audit: [audit(action, detail), ...record.audit].slice(0, 40) };
}

function audit(action: string, detail: string): SalesWorkflowAudit {
  return { id: id(action), time: new Date().toLocaleString("en-GB", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }), action, detail };
}

function documentStage(type: string) {
  return ({
    "Sales Order": "Sales Order",
    "Delivery / Reservation": "Delivery",
    "Invoice Draft": "Invoice",
    "Commission Draft": "Payment",
    "Initial Delivery Order": "Initial Delivery Order",
    "Recurring Delivery SO": "Recurring Delivery SO",
    "Monthly Invoice": "Monthly Invoice",
    "Final Reconciliation": "Final Reconciliation",
    "Procurement Trigger": "Procurement Trigger",
    "Scheduled Delivery": "Scheduled Delivery",
    "Batch Compliance Pack": "Batch Compliance",
    "Project Invoice Drafts": "Advance/Progress/Retention Invoice",
    "Project Link": "Project Setup"
  } as Record<string, string>)[type];
}

function documentPrefix(type: string) {
  return type.split(/\s+/).map(part => part[0]).join("").replace(/[^A-Z]/g, "") || "DOC";
}

function number(value: string) {
  const parsed = Number(value.replace(/,/g, ""));
  return Number.isFinite(parsed) ? parsed : 0;
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

function id(prefix: string) {
  return `${prefix}-${Math.random().toString(36).slice(2, 9)}`;
}
