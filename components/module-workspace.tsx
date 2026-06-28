"use client";

import { useState } from "react";
import { ArrowDownToLine, ChevronDown, Columns3, Ellipsis, FileDown, Grid2X2, List, Plus, RefreshCw, Upload } from "lucide-react";
import { HrLeaveWorkspace } from "@/components/hr-leave-workspace";
import { getModule } from "@/lib/erp-data";
import { Button, DataToolbar, StatusBadge } from "@/components/ui";
import { cn } from "@/lib/utils";

const iconTones: Record<string, string> = { emerald: "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/50", violet: "bg-violet-50 text-violet-600 dark:bg-violet-950/50", blue: "bg-blue-50 text-blue-600 dark:bg-blue-950/50", cyan: "bg-cyan-50 text-cyan-600 dark:bg-cyan-950/50", amber: "bg-amber-50 text-amber-600 dark:bg-amber-950/50", orange: "bg-orange-50 text-orange-600 dark:bg-orange-950/50", rose: "bg-rose-50 text-rose-600 dark:bg-rose-950/50", indigo: "bg-indigo-50 text-indigo-600 dark:bg-indigo-950/50", sky: "bg-sky-50 text-sky-600 dark:bg-sky-950/50", teal: "bg-teal-50 text-teal-600 dark:bg-teal-950/50", purple: "bg-purple-50 text-purple-600 dark:bg-purple-950/50", slate: "bg-slate-100 text-slate-600 dark:bg-slate-800" };

export function ModuleWorkspace({ moduleKey }: { moduleKey: string }) {
  const module = getModule(moduleKey);
  if (!module) return null;
  const [activeTab, setActiveTab] = useState(module.tabs[0]);
  const [toast, setToast] = useState("");
  const Icon = module.icon;
  const action = (message: string) => { setToast(message); window.setTimeout(() => setToast(""), 2600); };
  return <div className="mx-auto max-w-[1600px] p-4 md:p-7">
    <div className="mb-6 flex flex-col justify-between gap-4 lg:flex-row lg:items-end"><div className="flex items-center gap-3.5"><div className={cn("grid h-12 w-12 place-items-center rounded-2xl", iconTones[module.color])}><Icon className="h-6 w-6" /></div><div><div className="mb-1 text-[10px] font-bold uppercase tracking-[.14em] text-slate-400">MedTech Operations</div><h1 className="text-2xl font-bold tracking-tight">{module.title}</h1><p className="mt-1 text-xs text-[var(--muted)]">{module.subtitle}</p></div></div><div className="flex flex-wrap items-center gap-2"><Button variant="secondary" onClick={() => action("Import center opened") }><Upload className="h-4 w-4" /> Import</Button><Button variant="secondary" onClick={() => action("Export prepared") }><FileDown className="h-4 w-4" /> Export</Button><Button onClick={() => action(`${module.primaryAction} form opened`)}><Plus className="h-4 w-4" /> {module.primaryAction}</Button></div></div>

    <section className="mb-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{module.stats.map((stat, i) => <div key={stat.label} className="rounded-2xl border bg-[var(--panel)] p-5 shadow-soft animate-in" style={{ animationDelay: `${i * 45}ms` }}><div className="flex items-center justify-between"><p className="text-xs font-medium text-[var(--muted)]">{stat.label}</p>{stat.delta && <span className={cn("rounded-full px-2 py-1 text-[10px] font-semibold", stat.delta.startsWith("-") ? "bg-rose-50 text-rose-600 dark:bg-rose-950" : "bg-emerald-50 text-emerald-600 dark:bg-emerald-950")}>{stat.delta}</span>}</div><div className={cn("mt-3 text-[22px] font-bold tracking-tight tabular", stat.tone === "warning" && "text-amber-600")}>{stat.value}</div><div className="mt-4 h-1 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800"><div className={cn("h-full rounded-full", stat.tone === "warning" ? "bg-amber-500" : "bg-teal-500")} style={{ width: `${58 + i * 9}%` }} /></div></div>)}</section>

    <section className="overflow-hidden rounded-2xl border bg-[var(--panel)] shadow-soft">
      <div className="flex flex-col justify-between gap-3 border-b px-5 pt-1 sm:flex-row sm:items-center"><div className="flex min-w-0 gap-1 overflow-x-auto">{module.tabs.map(tab => <button key={tab} onClick={() => setActiveTab(tab)} className={cn("relative whitespace-nowrap px-3 py-4 text-xs font-semibold transition", activeTab === tab ? "text-teal-600" : "text-[var(--muted)] hover:text-[var(--text)]")}>{tab}{activeTab === tab && <span className="absolute inset-x-2 bottom-0 h-0.5 rounded-full bg-teal-500" />}</button>)}</div><div className="hidden items-center gap-1 sm:flex"><button className="rounded-lg bg-slate-100 p-2 text-slate-600 dark:bg-slate-800"><List className="h-4 w-4" /></button><button className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"><Grid2X2 className="h-4 w-4" /></button><button className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"><Columns3 className="h-4 w-4" /></button></div></div>
      {module.key === "hr" && activeTab === "Leave" ? <div className="p-5"><HrLeaveWorkspace /></div> : <>
      <DataToolbar placeholder={`Search ${activeTab.toLowerCase()}...`} />
      <div className="overflow-x-auto"><table className="w-full min-w-[800px] border-collapse text-left"><thead><tr className="border-b bg-slate-50/70 dark:bg-slate-900/40">{module.columns.map(column => <th key={column} className="px-5 py-3 text-[10px] font-bold uppercase tracking-[.08em] text-slate-400">{column}</th>)}<th className="w-12 px-4 py-3" /></tr></thead><tbody className="divide-y">{module.rows.map((row, i) => <tr key={i} className="group transition hover:bg-slate-50/70 dark:hover:bg-slate-800/30">{module.columns.map((column, c) => <td key={column} className={cn("px-5 py-4 text-xs", c === 0 ? "font-semibold text-[var(--text)]" : "text-[var(--muted)]")}>{column === "Status" || column === "Stage" || column === "Access" || column === "Format" ? <StatusBadge>{row[column]}</StatusBadge> : row[column]}</td>)}<td className="px-4"><button className="rounded-lg p-2 text-slate-400 opacity-0 transition hover:bg-slate-100 group-hover:opacity-100 dark:hover:bg-slate-700"><Ellipsis className="h-4 w-4" /></button></td></tr>)}</tbody></table></div>
      <div className="flex items-center justify-between border-t px-5 py-3 text-[11px] text-slate-400"><span>Showing 1–{module.rows.length} of {module.rows.length * 9 + 7} records</span><div className="flex gap-1"><button disabled className="rounded-md border px-2.5 py-1.5 disabled:opacity-40">Previous</button><button className="rounded-md border px-2.5 py-1.5">Next</button></div></div>
      </>}
    </section>
    {toast && <div className="fixed bottom-5 right-5 z-50 flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-3 text-xs font-medium text-white shadow-panel animate-in"><RefreshCw className="h-4 w-4 text-teal-400" />{toast}</div>}
  </div>;
}
