"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ArrowUpRight, CheckCircle2, Clock3, ExternalLink, RefreshCw, Search, Siren } from "lucide-react";
import { alertColumns, alertLink, escalateAlert, readLocalAlerts, resolveAlert, snoozeAlert, type AlertRecord } from "@/lib/local-alerts";
import { getDemoSession } from "@/lib/demo-auth";
import { Button, StatusBadge } from "@/components/ui";
import { cn } from "@/lib/utils";

export function AlertsWorkspace() {
  const [alerts, setAlerts] = useState<AlertRecord[]>([]);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("All");
  const [toast, setToast] = useState("");

  const refresh = () => setAlerts(readLocalAlerts());
  useEffect(() => {
    refresh();
    window.addEventListener("storage", refresh);
    window.addEventListener("medtech:alerts", refresh);
    window.addEventListener("medtech:approvals", refresh);
    return () => {
      window.removeEventListener("storage", refresh);
      window.removeEventListener("medtech:alerts", refresh);
      window.removeEventListener("medtech:approvals", refresh);
    };
  }, []);

  const statuses = useMemo(() => Array.from(new Set(alerts.map(row => row.Status))).sort(), [alerts]);
  const filtered = useMemo(() => {
    const search = query.toLowerCase();
    return alerts.filter(row => (status === "All" || row.Status === status) && (!search || Object.values(row).some(value => String(value).toLowerCase().includes(search))))
      .sort((a, b) => rank(a) - rank(b) || a["Due Date"].localeCompare(b["Due Date"]));
  }, [alerts, query, status]);

  const act = (label: string, fn: (alertNo: string, user: string) => unknown, alertNo: string) => {
    fn(alertNo, getDemoSession()?.name || "Local Demo");
    refresh();
    setToast(`${label} ${alertNo}`);
    window.setTimeout(() => setToast(""), 2200);
  };

  return <div className="mx-auto max-w-[1600px] p-4 md:p-7">
    <div className="mb-6 flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
      <div className="flex items-center gap-3.5">
        <div className="grid h-12 w-12 place-items-center rounded-2xl bg-rose-50 text-rose-700 dark:bg-rose-950/50"><Siren className="h-6 w-6" /></div>
        <div><h1 className="text-2xl font-bold tracking-tight">Alerts</h1><p className="mt-1 text-xs text-[var(--muted)]">Local notification, escalation, and SLA queue from demo-store data.</p></div>
      </div>
      <div className="grid grid-cols-3 gap-2 text-xs sm:min-w-[420px]">
        <Metric label="Open" value={String(alerts.filter(row => row.Status !== "Resolved").length)} />
        <Metric label="Critical" value={String(alerts.filter(row => row.Priority === "Critical" && row.Status !== "Resolved").length)} />
        <Metric label="Escalated" value={String(alerts.filter(row => row.Status === "Escalated").length)} />
      </div>
    </div>

    <section className="overflow-hidden rounded-2xl border bg-[var(--panel)] shadow-soft">
      <div className="flex flex-wrap items-center gap-3 border-b px-5 py-3.5">
        <div className="relative min-w-[230px] flex-1 md:max-w-sm"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" /><input value={query} onChange={event => setQuery(event.target.value)} placeholder="Search alerts..." className="h-9 w-full rounded-lg border bg-[var(--panel)] pl-9 pr-3 text-sm outline-none focus:border-teal-500" /></div>
        <select aria-label="Filter alerts by status" value={status} onChange={event => setStatus(event.target.value)} className="h-9 rounded-lg border bg-[var(--panel)] px-3 text-xs"><option>All</option>{statuses.map(value => <option key={value}>{value}</option>)}</select>
        <Button variant="secondary" onClick={refresh}><RefreshCw className="h-4 w-4" /> Refresh</Button>
        <span className="text-[11px] text-slate-400">{filtered.length} of {alerts.length} local alerts</span>
      </div>
      <div className="overflow-x-auto"><table className="w-full min-w-[1460px] text-left text-xs">
        <thead><tr className="border-b bg-slate-50/70 dark:bg-slate-900/40">{[...alertColumns, "Source", "Actions"].map(column => <th key={column} className="px-4 py-3 text-[10px] font-bold uppercase tracking-wide text-slate-400">{column}</th>)}</tr></thead>
        <tbody className="divide-y">{filtered.map(alert => <tr key={alert["Alert No"]} className="hover:bg-slate-50/80 dark:hover:bg-slate-900/40">{alertColumns.map((column, index) => <td key={column} className={cn("px-4 py-3 align-top", index === 0 && "font-semibold")}>{column === "Status" || column === "Priority" ? <StatusBadge>{alert[column]}</StatusBadge> : alert[column]}</td>)}<td className="px-4 py-3"><Link href={alertLink(alert)} className="inline-flex items-center gap-1 font-semibold text-teal-700 hover:text-teal-900">Open <ExternalLink className="h-3 w-3" /></Link></td><td className="px-4 py-3"><div className="flex flex-wrap gap-2"><Button variant="ghost" className="h-8 px-2 text-[11px]" onClick={() => act("Resolved", resolveAlert, alert["Alert No"])} disabled={alert.Status === "Resolved"}><CheckCircle2 className="h-3.5 w-3.5" />Resolve</Button><Button variant="ghost" className="h-8 px-2 text-[11px]" onClick={() => act("Snoozed", (no, user) => snoozeAlert(no, 7, user), alert["Alert No"])} disabled={alert.Status === "Resolved"}><Clock3 className="h-3.5 w-3.5" />Snooze</Button><Button variant="ghost" className="h-8 px-2 text-[11px]" onClick={() => act("Escalated", escalateAlert, alert["Alert No"])} disabled={alert.Status === "Resolved"}><ArrowUpRight className="h-3.5 w-3.5" />Escalate</Button></div></td></tr>)}</tbody>
      </table></div>
      {!filtered.length && <div className="px-6 py-16 text-center text-sm text-[var(--muted)]">No matching local alerts.</div>}
    </section>
    {toast && <div role="status" className="fixed bottom-5 right-5 z-[100] rounded-xl bg-slate-900 px-4 py-3 text-xs font-medium text-white shadow-panel animate-in">{toast}</div>}
  </div>;
}

function Metric({ label, value }: { label: string; value: string }) {
  return <div className="rounded-xl border bg-[var(--panel)] p-3"><div className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">{label}</div><div className="mt-1 text-lg font-bold">{value}</div></div>;
}

function rank(alert: AlertRecord) {
  if (alert.Status === "Escalated") return 0;
  if (alert.Priority === "Critical") return 1;
  if (alert.Priority === "High") return 2;
  if (alert.Status === "Resolved") return 9;
  return 3;
}
