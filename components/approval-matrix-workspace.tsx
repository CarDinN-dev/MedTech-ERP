"use client";

import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, Download, Eye, Plus, Search, XCircle } from "lucide-react";
import { approvalRequestColumns, decideApprovalRequest, readApprovalRequests, seedApprovalRequests, submitApprovalRequest, writeApprovalRequests, type ApprovalRequest } from "@/lib/approval-matrix";
import { getDemoSession, PRESENTATION_USER_NAME } from "@/lib/demo-auth";
import { exportToExcel } from "@/lib/export/excel";
import { cn } from "@/lib/utils";
import { Button, StatusBadge } from "@/components/ui";
import { permissionError } from "@/lib/erp-security";
import { appendAuditLog } from "@/lib/audit-store";

const quickSources = [
  { label: "Sales discount", sourceModule: "Sales", sourceRecord: "SFS-2026-0031", requestType: "Quotation discount", requestedBy: "F. Al-Kuwari", amount: 286000, discountPercent: 18, customerTier: "Government", businessUnit: "Diagnostics" },
  { label: "Purchase order", sourceModule: "Procurement", sourceRecord: "PO-2026-0124", requestType: "Purchase order", requestedBy: "M. Said", amount: 94750, businessUnit: "Procurement" },
  { label: "Payroll finalization", sourceModule: "Human Resources - Payroll", sourceRecord: "MPR-MEDTECH-2026-06-Sales", requestType: "Payroll finalization", requestedBy: "Payroll Manager", amount: 277600, businessUnit: "Sales" },
  { label: "Expense", sourceModule: "Finance", sourceRecord: "EXP-2026-00448", requestType: "Expense", requestedBy: "K. Varghese", amount: 12480, businessUnit: "Projects" }
];

export function ApprovalMatrixWorkspace() {
  const [requests, setRequests] = useState<ApprovalRequest[]>(seedApprovalRequests);
  const [selectedNo, setSelectedNo] = useState("");
  const [query, setQuery] = useState("");
  const [notes, setNotes] = useState("");
  const [quick, setQuick] = useState("0");
  const [toast, setToast] = useState("");

  useEffect(() => {
    const refresh = () => setRequests(readApprovalRequests());
    refresh();
    window.addEventListener("medtech:approvals", refresh);
    window.addEventListener("storage", refresh);
    return () => { window.removeEventListener("medtech:approvals", refresh); window.removeEventListener("storage", refresh); };
  }, []);

  const filtered = useMemo(() => {
    const search = query.toLowerCase();
    return requests.filter(request => !search || approvalRequestColumns.some(column => request[column as keyof ApprovalRequest]?.toLowerCase().includes(search)));
  }, [query, requests]);
  const selected = filtered.find(request => request["Approval Request No"] === selectedNo) ?? filtered[0];
  const notify = (message: string) => { setToast(message); window.setTimeout(() => setToast(""), 2400); };
  const refresh = () => setRequests(readApprovalRequests());
  const decide = (decision: "Approved" | "Rejected" | "Counter-proposed" | "Cancelled") => {
    if (!selected) return;
    const session = getDemoSession();
    const result = decideApprovalRequest(selected["Approval Request No"], decision, session?.name || PRESENTATION_USER_NAME, notes, session?.role);
    if (result.error) { notify(result.error); return; }
    setNotes("");
    refresh();
    notify(`${decision} recorded`);
  };
  const submitQuick = () => {
    const error = permissionError(getDemoSession(), "Approvals", "create");
    if (error) { denied(error, "Submit approval"); notify(error); return; }
    const result = submitApprovalRequest(quickSources[Number(quick)]);
    refresh();
    notify(result.message);
  };
  const reset = () => {
    const error = permissionError(getDemoSession(), "Approvals", "reset demo data");
    if (error) { denied(error, "Approval matrix reset"); notify(error); return; }
    writeApprovalRequests(seedApprovalRequests());
    notify("Approval matrix reset");
  };
  const exportRows = async () => {
    const error = permissionError(getDemoSession(), "Approvals", "export");
    if (error) { denied(error, "Approval export"); notify(error); return; }
    await exportToExcel(filtered.map(request => Object.fromEntries(approvalRequestColumns.map(column => [column, request[column as keyof ApprovalRequest] || ""]))), "approval-matrix-requests", "Approvals");
    notify("Approval export generated");
  };

  return <div className="grid min-h-[680px] xl:grid-cols-[1fr_380px]">
    <div className="min-w-0">
      <div className="flex flex-wrap items-center gap-3 border-b px-5 py-3.5">
        <div className="relative min-w-[220px] flex-1 md:max-w-sm"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" /><input value={query} onChange={event => setQuery(event.target.value)} placeholder="Search approvals..." className="h-9 w-full rounded-lg border bg-[var(--panel)] pl-9 pr-3 text-sm outline-none focus:border-medtech-red" /></div>
        <select value={quick} onChange={event => setQuick(event.target.value)} className="h-9 rounded-lg border bg-[var(--panel)] px-3 text-xs">{quickSources.map((source, index) => <option key={source.label} value={index}>{source.label}</option>)}</select>
        <Button variant="secondary" onClick={submitQuick}><Plus className="h-4 w-4" />Submit</Button>
        <Button variant="secondary" onClick={exportRows}><Download className="h-4 w-4" />Excel</Button>
        <Button variant="ghost" onClick={reset}>Reset</Button>
      </div>
      <div className="overflow-x-auto"><table className="w-full min-w-[1200px] text-left text-xs"><thead><tr className="border-b bg-slate-50/70 dark:bg-slate-900/40">{approvalRequestColumns.map(column => <th key={column} className="px-4 py-3 text-[10px] font-bold uppercase tracking-wide text-slate-400">{column}</th>)}</tr></thead><tbody className="divide-y">{filtered.map(request => <tr key={request["Approval Request No"]} onClick={() => setSelectedNo(request["Approval Request No"])} className={cn("cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-900/40", selected?.["Approval Request No"] === request["Approval Request No"] && "bg-[var(--navy-tint)] dark:bg-[var(--elevated)]")}>{approvalRequestColumns.map(column => <td key={column} className="px-4 py-3">{column === "Status" ? <StatusBadge>{request.Status}</StatusBadge> : request[column as keyof ApprovalRequest]}</td>)}</tr>)}</tbody></table></div>
    </div>
    <aside className="border-t p-5 xl:border-l xl:border-t-0">
      {selected ? <div className="space-y-4">
        <div><div className="text-[10px] font-bold uppercase text-medtech-red">Approval trail</div><h2 className="mt-1 font-bold">{selected["Approval Request No"]}</h2><p className="mt-1 text-xs text-[var(--muted)]">{selected["Source Module"]} / {selected["Source Record"]}</p></div>
        <div className="grid gap-2 text-xs">{["Request Type", "Requested By", "Current Approver Role", "Amount", "Discount %", "Threshold Rule"].map(field => <div key={field} className="flex justify-between gap-3 border-b pb-2"><span className="text-[var(--muted)]">{field}</span><b>{selected[field as keyof ApprovalRequest] || "-"}</b></div>)}</div>
        <textarea value={notes} onChange={event => setNotes(event.target.value)} placeholder="Decision notes..." className="min-h-24 w-full rounded-xl border bg-[var(--panel)] px-3 py-2 text-sm outline-none focus:border-medtech-red" />
        <div className="grid grid-cols-2 gap-2"><Button onClick={() => decide("Approved")}><CheckCircle2 className="h-4 w-4" />Approve</Button><Button variant="danger" onClick={() => decide("Rejected")}><XCircle className="h-4 w-4" />Reject</Button><Button variant="secondary" onClick={() => decide("Counter-proposed")}>Counter</Button><Button variant="secondary" onClick={() => decide("Cancelled")}>Cancel</Button></div>
        <div className="rounded-xl border p-3"><div className="mb-2 flex items-center gap-2 text-xs font-bold"><Eye className="h-4 w-4" />Trail</div><pre className="whitespace-pre-wrap text-[11px] text-[var(--muted)]">{selected.Trail}</pre></div>
      </div> : <div className="text-sm text-[var(--muted)]">Select an approval request.</div>}
    </aside>
    {toast && <div role="status" className="fixed bottom-5 right-5 z-[100] rounded-xl bg-slate-900 px-4 py-3 text-xs font-medium text-white shadow-panel">{toast}</div>}
  </div>;
}

function denied(details: string, record: string) {
  appendAuditLog({ action: "PERMISSION DENIED", module: "Approvals", record, details, result: "failure", severity: "high" });
}

