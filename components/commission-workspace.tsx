"use client";

import { useEffect, useMemo, useState } from "react";
import { Download, RefreshCcw, Search } from "lucide-react";
import { commissionColumns, markPayrollReady, readCommissionLines, seedCommissionLines, writeCommissionLines, type CommissionLine } from "@/lib/commission-engine";
import { exportToExcel } from "@/lib/export/excel";
import { Button, StatusBadge } from "@/components/ui";

export function CommissionWorkspace() {
  const [lines, setLines] = useState<CommissionLine[]>(seedCommissionLines);
  const [query, setQuery] = useState("");
  const [toast, setToast] = useState("");

  useEffect(() => {
    const refresh = () => setLines(readCommissionLines());
    refresh();
    window.addEventListener("medtech:commissions", refresh);
    window.addEventListener("storage", refresh);
    return () => { window.removeEventListener("medtech:commissions", refresh); window.removeEventListener("storage", refresh); };
  }, []);

  const filtered = useMemo(() => {
    const search = query.toLowerCase();
    return lines.filter(line => !search || commissionColumns.some(column => line[column as keyof CommissionLine].toLowerCase().includes(search)));
  }, [lines, query]);
  const totals = useMemo(() => filtered.reduce((sum, line) => sum + money(line["Commission Amount"]), 0), [filtered]);
  const runNo = filtered[0]?.["Commission Run No"] ?? "COM-2026-06";
  const notify = (message: string) => { setToast(message); window.setTimeout(() => setToast(""), 2400); };
  const exportRows = async (payrollOnly = false) => {
    const rows = (payrollOnly ? filtered.filter(line => line["Payroll Ready"] === "Yes") : filtered).map(line => Object.fromEntries(commissionColumns.map(column => [column, line[column as keyof CommissionLine]])));
    await exportToExcel(rows, payrollOnly ? `${runNo}-payroll-ready-commissions` : `${runNo}-commissions`, "Commissions");
    notify(payrollOnly ? "Payroll-ready export generated" : "Commission export generated");
  };
  const ready = () => { setLines(markPayrollReady(runNo)); notify("Payroll readiness recalculated"); };
  const reset = () => { writeCommissionLines(seedCommissionLines()); notify("Commission run reset"); };

  return <div className="overflow-hidden bg-[var(--panel)]">
    <div className="grid gap-3 border-b p-4 sm:grid-cols-4">
      <Metric label="Run" value={runNo} />
      <Metric label="Lines" value={String(filtered.length)} />
      <Metric label="Commission" value={`QAR ${Math.round(totals).toLocaleString("en-US")}`} />
      <Metric label="Payroll ready" value={String(filtered.filter(line => line["Payroll Ready"] === "Yes").length)} />
    </div>
    <div className="flex flex-wrap items-center gap-3 border-b px-5 py-3.5">
      <div className="relative min-w-[220px] flex-1 md:max-w-sm"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" /><input value={query} onChange={event => setQuery(event.target.value)} placeholder="Search commissions..." className="h-9 w-full rounded-lg border bg-[var(--panel)] pl-9 pr-3 text-sm outline-none focus:border-medtech-red" /></div>
      <Button variant="secondary" onClick={ready}><RefreshCcw className="h-4 w-4" />Payroll Ready</Button>
      <Button variant="secondary" onClick={() => exportRows(false)}><Download className="h-4 w-4" />Excel</Button>
      <Button onClick={() => exportRows(true)}><Download className="h-4 w-4" />Payroll Export</Button>
      <Button variant="ghost" onClick={reset}>Reset</Button>
    </div>
    <div className="overflow-x-auto"><table className="w-full min-w-[1200px] text-left text-xs"><thead><tr className="border-b bg-slate-50/70 dark:bg-slate-900/40">{commissionColumns.map(column => <th key={column} className="px-4 py-3 text-[10px] font-bold uppercase tracking-wide text-slate-400">{column}</th>)}</tr></thead><tbody className="divide-y">{filtered.map((line, index) => <tr key={`${line["Commission Run No"]}-${line.Salesperson}-${index}`} className="hover:bg-slate-50 dark:hover:bg-slate-900/40">{commissionColumns.map(column => <td key={column} className="px-4 py-3">{["Status", "Payroll Ready"].includes(column) ? <StatusBadge>{line[column as keyof CommissionLine]}</StatusBadge> : line[column as keyof CommissionLine]}</td>)}</tr>)}</tbody></table></div>
    {toast && <div role="status" className="fixed bottom-5 right-5 z-[100] rounded-xl bg-slate-900 px-4 py-3 text-xs font-medium text-white shadow-panel">{toast}</div>}
  </div>;
}

function Metric({ label, value }: { label: string; value: string }) {
  return <div className="rounded-xl border p-4"><div className="text-[10px] font-bold uppercase text-[var(--muted)]">{label}</div><div className="mt-2 text-sm font-bold">{value}</div></div>;
}

function money(value: string) {
  const parsed = Number(value.replace(/[^0-9.-]/g, ""));
  return Number.isFinite(parsed) ? parsed : 0;
}

