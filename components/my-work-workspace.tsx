"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ArrowUpDown, ExternalLink, Search, ShieldCheck } from "lucide-react";
import { getDemoSession, type DemoSession } from "@/lib/demo-auth";
import { buildMyWorkQueue, workTaskColumns, type WorkTask } from "@/lib/my-work";
import { StatusBadge } from "@/components/ui";
import { cn } from "@/lib/utils";

export function MyWorkWorkspace() {
  const [session, setSession] = useState<DemoSession | null>(() => getDemoSession());
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("All");
  const [sortColumn, setSortColumn] = useState<keyof WorkTask>("Due Date");
  const [direction, setDirection] = useState<"asc" | "desc">("asc");

  useEffect(() => {
    const refresh = () => setSession(getDemoSession());
    refresh();
    window.addEventListener("storage", refresh);
    window.addEventListener("medtech:approvals", refresh);
    window.addEventListener("medtech:alerts", refresh);
    return () => { window.removeEventListener("storage", refresh); window.removeEventListener("medtech:approvals", refresh); window.removeEventListener("medtech:alerts", refresh); };
  }, []);

  const tasks = useMemo(() => buildMyWorkQueue(session), [session]);
  const statuses = useMemo(() => Array.from(new Set(tasks.map(task => task.Status))).sort(), [tasks]);
  const filtered = useMemo(() => {
    const search = query.toLowerCase();
    return tasks.filter(task => (!search || Object.values(task).some(value => value.toLowerCase().includes(search))) && (status === "All" || task.Status === status))
      .sort((a, b) => {
        const comparison = a[sortColumn].localeCompare(b[sortColumn], undefined, { numeric: true, sensitivity: "base" });
        return direction === "asc" ? comparison : -comparison;
      });
  }, [tasks, query, status, sortColumn, direction]);

  const toggleSort = (column: keyof WorkTask) => {
    if (sortColumn === column) setDirection(value => value === "asc" ? "desc" : "asc");
    else { setSortColumn(column); setDirection("asc"); }
  };

  return <div className="mx-auto max-w-[1600px] p-4 md:p-7">
    <div className="mb-6 flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
      <div className="flex items-center gap-3.5">
        <div className="grid h-12 w-12 place-items-center rounded-2xl bg-teal-50 text-teal-700 dark:bg-teal-950/50"><ShieldCheck className="h-6 w-6" /></div>
        <div><h1 className="text-2xl font-bold tracking-tight">My Work</h1><p className="mt-1 text-xs text-[var(--muted)]">Local task inbox for {session?.name || "demo user"} - {session?.role || "Super Admin"}</p></div>
      </div>
      <div className="grid grid-cols-3 gap-2 text-xs sm:min-w-[420px]">
        <Metric label="Open" value={String(filtered.length)} />
        <Metric label="Critical" value={String(filtered.filter(task => task.Priority === "Critical").length)} />
        <Metric label="Approvals" value={String(filtered.filter(task => task["Action Required"].toLowerCase().includes("approve")).length)} />
      </div>
    </div>
    <section className="overflow-hidden rounded-2xl border bg-[var(--panel)] shadow-soft">
      <div className="flex flex-wrap items-center gap-3 border-b px-5 py-3.5">
        <div className="relative min-w-[230px] flex-1 md:max-w-sm"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" /><input value={query} onChange={event => setQuery(event.target.value)} placeholder="Search task inbox..." className="h-9 w-full rounded-lg border bg-[var(--panel)] pl-9 pr-3 text-sm outline-none focus:border-teal-500" /></div>
        <select aria-label="Filter tasks by status" value={status} onChange={event => setStatus(event.target.value)} className="h-9 rounded-lg border bg-[var(--panel)] px-3 text-xs"><option>All</option>{statuses.map(value => <option key={value}>{value}</option>)}</select>
        <span className="text-[11px] text-slate-400">{filtered.length} of {tasks.length} local tasks</span>
      </div>
      <div className="overflow-x-auto"><table className="w-full min-w-[1320px] text-left text-xs">
        <thead><tr className="border-b bg-slate-50/70 dark:bg-slate-900/40">{workTaskColumns.map(column => <th key={column} className="px-4 py-3"><button onClick={() => toggleSort(column)} className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide text-slate-400 hover:text-teal-600">{column}<ArrowUpDown className="h-3 w-3 opacity-50" /></button></th>)}</tr></thead>
        <tbody className="divide-y">{filtered.map(task => <tr key={`${task["Task No"]}-${task["Source Record"]}`} className="hover:bg-slate-50/80 dark:hover:bg-slate-900/40">{workTaskColumns.map((column, index) => <td key={column} className={cn("px-4 py-3", index === 0 && "font-semibold")}>{column === "Status" || column === "Priority" ? <StatusBadge>{task[column]}</StatusBadge> : column === "Link/Open Record" ? <Link href={task[column]} className="inline-flex items-center gap-1 font-semibold text-teal-700 hover:text-teal-900">Open <ExternalLink className="h-3 w-3" /></Link> : task[column]}</td>)}</tr>)}</tbody>
      </table></div>
      {!filtered.length && <div className="px-6 py-16 text-center text-sm text-[var(--muted)]">No matching local work items.</div>}
    </section>
  </div>;
}

function Metric({ label, value }: { label: string; value: string }) {
  return <div className="rounded-xl border bg-[var(--panel)] p-3"><div className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">{label}</div><div className="mt-1 text-lg font-bold">{value}</div></div>;
}
