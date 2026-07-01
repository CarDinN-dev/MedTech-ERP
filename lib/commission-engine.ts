"use client";

import { appendAuditLog } from "@/lib/audit-store";
import { readApprovalRequests } from "@/lib/approval-matrix";

export interface CommissionLine {
  "Commission Run No": string;
  Period: string;
  Salesperson: string;
  "Business Unit": string;
  "Deal / Invoice": string;
  "Product Category": string;
  "Gross Amount": string;
  Margin: string;
  "Commission %": string;
  "Split %": string;
  "Commission Amount": string;
  "Payroll Ready": string;
  Status: string;
  Notes: string;
}

export const COMMISSION_STORAGE_KEY = "medtech-demo:sales-commissions:v1";
export const commissionColumns = ["Commission Run No", "Period", "Salesperson", "Business Unit", "Deal / Invoice", "Product Category", "Gross Amount", "Margin", "Commission %", "Split %", "Commission Amount", "Payroll Ready", "Status", "Notes"];

const categoryRates: Record<string, number> = { Diagnostics: 3, Equipment: 2.5, Pharma: 1.8, Projects: 1.2, Reagents: 3.5 };
const buRates: Record<string, number> = { Diagnostics: 3.2, Equipment: 2.4, Pharma: 1.8, Projects: 1.1 };

export function readCommissionLines() {
  if (typeof window === "undefined") return seedCommissionLines();
  try {
    const stored = localStorage.getItem(COMMISSION_STORAGE_KEY);
    return stored ? JSON.parse(stored) as CommissionLine[] : seedCommissionLines();
  } catch {
    return seedCommissionLines();
  }
}

export function writeCommissionLines(lines: CommissionLine[]) {
  localStorage.setItem(COMMISSION_STORAGE_KEY, JSON.stringify(lines));
  window.dispatchEvent(new CustomEvent("medtech:commissions", { detail: lines }));
}

export function seedCommissionLines(): CommissionLine[] {
  return calculateCommissionRun([
    deal("COM-2026-06", "June 2026", "F. Al-Kuwari", "Diagnostics", "SFS-2026-0031 / INV-DRAFT", "Reagents", 286000, 89232, 70, "Sales workflow discount-approved deal"),
    deal("COM-2026-06", "June 2026", "R. Mathew", "Diagnostics", "GPR-2026-0012 / Monthly invoice", "Diagnostics", 96400, 30400, 100, "Recurring GPPRR invoice"),
    deal("COM-2026-06", "June 2026", "L. D'Souza", "Pharma", "TEN-2026-0022 / Award pending", "Pharma", 1840000, 276000, 60, "Tender split with commercial owner"),
    deal("COM-2026-06", "June 2026", "K. Varghese", "Projects", "PSO-2026-0007 / Milestone", "Projects", 4800000, 1075200, 50, "Project split on milestone billing")
  ]);
}

export function calculateCommissionRun(deals: Array<Omit<CommissionLine, "Commission %" | "Commission Amount" | "Payroll Ready" | "Status">>) {
  return deals.map(deal => {
    const rate = commissionRate(deal["Business Unit"], deal["Product Category"]);
    const amount = money(deal.Margin) * (rate / 100) * (money(deal["Split %"]) / 100);
    return { ...deal, "Commission %": String(rate), "Commission Amount": qar(amount), "Payroll Ready": "No", Status: "Draft" };
  });
}

export function markPayrollReady(runNo: string) {
  const approvals = readApprovalRequests();
  const approvedSales = new Set(approvals.filter(request => request["Source Module"] === "Sales" && request.Status === "Approved").map(request => request["Source Record"]));
  const next = readCommissionLines().map(line => {
    if (line["Commission Run No"] !== runNo) return line;
    const linked = line["Deal / Invoice"].split("/")[0].trim();
    const ready = approvedSales.has(linked) || !line["Deal / Invoice"].startsWith("SFS-");
    return { ...line, "Payroll Ready": ready ? "Yes" : "No", Status: ready ? "Payroll Ready" : "Approval Missing", Notes: ready ? line.Notes : "Sales approval required before payroll export" };
  });
  writeCommissionLines(next);
  appendAuditLog({ action: "COMMISSION PAYROLL READY", module: "Sales", record: runNo, details: "Commission run recalculated for payroll readiness" });
  return next;
}

export function commissionRate(businessUnit: string, category: string) {
  return categoryRates[category] ?? buRates[businessUnit] ?? 2;
}

function deal(run: string, period: string, salesperson: string, bu: string, invoice: string, category: string, gross: number, margin: number, split: number, notes: string): Omit<CommissionLine, "Commission %" | "Commission Amount" | "Payroll Ready" | "Status"> {
  return { "Commission Run No": run, Period: period, Salesperson: salesperson, "Business Unit": bu, "Deal / Invoice": invoice, "Product Category": category, "Gross Amount": qar(gross), Margin: qar(margin), "Split %": String(split), Notes: notes };
}

function money(value?: string) {
  const parsed = Number(String(value ?? "").replace(/[^0-9.-]/g, ""));
  return Number.isFinite(parsed) ? parsed : 0;
}

function qar(value: number) {
  return `QAR ${Math.round(value).toLocaleString("en-US")}`;
}
