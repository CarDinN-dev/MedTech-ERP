"use client";

import { Download, Eye, FileText, ShieldCheck } from "lucide-react";
import type { PdfTemplate } from "@/lib/pdf/generator";
import { appendAuditLog } from "@/lib/audit-store";

const templates: Array<[PdfTemplate, string]> = [
  ["estimation", "Estimation sheet"], ["quotation", "Quotation"], ["invoice", "Invoice"], ["receipt", "Payment receipt"],
  ["purchase_order", "Purchase order"], ["delivery_note", "Delivery note"], ["packing_list", "Packing list"],
  ["service_report", "Service report"], ["employee_letter", "Employee letter"], ["experience_certificate", "Experience certificate"],
  ["offer_letter", "Offer letter"], ["approval_to_hire", "Approval to hire"], ["hiring_approval", "Hiring approval request"], ["appointment_letter", "Appointment letter"], ["employment_contract", "Employment contract"],
  ["salary_certificate", "Salary certificate"], ["warning_letter", "Warning letter"], ["payslip", "Payslip"],
  ["leave_approval", "Leave approval"], ["clearance_certificate", "Clearance certificate"], ["final_settlement", "Final settlement"],
  ["gratuity_statement", "Gratuity statement"], ["payment_voucher", "Payment voucher"], ["report", "Management report"]
];

export default function TemplatesPage() {
  return <div className="mx-auto max-w-[1400px] p-4 md:p-7">
    <div className="mb-6"><div className="text-[10px] font-bold uppercase tracking-widest text-teal-600">Document Center</div><h1 className="mt-1 text-2xl font-bold">Branded PDF templates</h1><p className="mt-1 text-xs text-[var(--muted)]">Controlled, print-ready business documents using MedTech’s standard identity.</p></div>
    <div className="mb-5 flex items-center gap-3 rounded-2xl border border-teal-200 bg-teal-50 p-4 text-sm text-teal-800 dark:border-teal-900 dark:bg-teal-950/40 dark:text-teal-200"><ShieldCheck className="h-5 w-5" /><div><b>Template controls enabled.</b><span className="ml-1 text-xs">Numbers, approvers and record data are generated from the source transaction.</span></div></div>
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{templates.map(([key, label]) => <div key={key} className="rounded-2xl border bg-[var(--panel)] p-5 shadow-soft"><div className="mb-6 flex items-start justify-between"><div className="rounded-xl bg-teal-50 p-3 text-teal-600 dark:bg-teal-950/50"><FileText className="h-6 w-6" /></div><span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-semibold text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">Active</span></div><h2 className="font-bold">{label}</h2><p className="mt-1 text-xs text-[var(--muted)]">A4 · MedTech corporate · Version 1.0</p><div className="mt-5 flex gap-2"><a aria-label={`Generate ${label} sample`} href={`/api/pdf/sample?template=${key}&download=1`} download onClick={() => appendAuditLog({ action: "PDF", module: "Documents", record: label, details: `${label} downloaded` })} className="inline-flex h-9 flex-1 items-center justify-center gap-2 rounded-lg bg-teal-600 px-3.5 text-sm font-semibold text-white shadow-sm transition hover:bg-teal-700"><Download className="h-4 w-4" /> Generate sample</a><a aria-label={`Preview ${label}`} title={`Preview ${label}`} href={`/api/pdf/sample?template=${key}`} target="_blank" rel="noreferrer" onClick={() => appendAuditLog({ action: "PDF PREVIEW", module: "Documents", record: label, details: `${label} preview opened` })} className="inline-flex h-9 items-center justify-center rounded-lg border bg-[var(--panel)] px-3.5 transition hover:bg-slate-50 dark:hover:bg-slate-800"><Eye className="h-4 w-4" /></a></div></div>)}</div>
  </div>;
}
