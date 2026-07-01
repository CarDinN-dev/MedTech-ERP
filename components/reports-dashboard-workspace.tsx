"use client";

import { useEffect, useMemo, useState } from "react";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer as RechartsResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Download, FileDown, Filter, FileText, PlugZap, Search, SlidersHorizontal } from "lucide-react";
import { Button, StatusBadge } from "@/components/ui";
import { IntegrationSimulatorsWorkspace } from "@/components/integration-simulators-workspace";
import { downloadBlob } from "@/lib/client-download";
import { getDemoSession, PRESENTATION_USER_NAME } from "@/lib/demo-auth";
import { readDemoRecordsSnapshot } from "@/lib/demo-store";
import { exportToExcel } from "@/lib/export/excel";
import {
  buildReportingModel,
  dashboardsFor,
  filterReportRows,
  type ReportDashboard,
  type ReportDashboardId,
  type ReportRow
} from "@/lib/reporting-data";
import { COSTING_STORAGE_KEY, seedCostingSheets, type CostingSheet } from "@/lib/sales-costing";
import { seedSalesWorkflows, type SalesWorkflowRecord } from "@/lib/sales-workflow";
import { cn } from "@/lib/utils";

const salesWorkflowStorageKey = "medtech-demo:sales-workflows:v1";
const chartColors = ["#0d9488", "#2563eb", "#f59e0b", "#e11d48", "#7c3aed", "#0891b2", "#16a34a", "#475569"];
const columns: Array<keyof ReportRow> = ["KPI", "Record", "BU", "Customer", "Salesperson", "Product Category", "Supplier", "Engineer", "Contract", "Status", "Amount", "Margin", "Days", "Notes"];

export function ReportsDashboardWorkspace() {
  const [mounted, setMounted] = useState(false);
  const [activeId, setActiveId] = useState<ReportDashboardId | "integrations">("executive");
  const [drill, setDrill] = useState("");
  const [query, setQuery] = useState("");
  const [toast, setToast] = useState("");
  const [filters, setFilters] = useState<Record<string, string>>({ from: "2026-06-01", to: "2026-09-30" });
  useEffect(() => setMounted(true), []);

  const model = useMemo(() => {
    if (!mounted) return buildReportingModel();
    return buildReportingModel((key, seed) => readDemoRecordsSnapshot(key, seed), readSalesWorkflows(), readSalesCostings());
  }, [mounted]);
  const filteredRows = useMemo(() => filterReportRows(model.rows, filters), [model.rows, filters]);
  const dashboards = useMemo(() => dashboardsFor(filteredRows), [filteredRows]);
  const active = activeId === "integrations" ? dashboards[0] : dashboards.find(dashboard => dashboard.id === activeId) ?? dashboards[0];
  const visibleRows = useMemo(() => {
    const search = query.toLowerCase();
    return active.rows.filter(row => (!drill || row.KPI === drill) && (!search || Object.values(row).some(value => String(value).toLowerCase().includes(search)))).slice(0, 120);
  }, [active.rows, drill, query]);

  const notify = (message: string) => { setToast(message); window.setTimeout(() => setToast(""), 2400); };
  const updateFilter = (key: string, value: string) => setFilters(current => ({ ...current, [key]: value }));
  const exportRows = async () => { await exportToExcel(visibleRows.map(exportRow), `reports-${active.id}`, active.title); notify(`${visibleRows.length} report rows exported`); };
  const downloadPdf = async () => {
    const { generateBrandedPdf } = await import("@/lib/pdf/generator");
    const result = await generateBrandedPdf({
      template: "report",
      documentNumber: `MGT-RPT-${active.id.toUpperCase()}-2026-06`,
      date: new Intl.DateTimeFormat("en-GB", { dateStyle: "long" }).format(new Date()),
      partyLabel: "Management report",
      partyName: active.title,
      subject: "Local demo reporting dashboard",
      metadata: active.kpis.map(kpi => [kpi.label, `${kpi.value} - ${kpi.note}`] as [string, string]),
      lines: visibleRows.slice(0, 12).map(row => ({ description: `${row.KPI} - ${row.Record}`, code: row.BU, quantity: 1, unitPrice: Math.abs(row.Amount || row.Value || row.Margin), total: Math.abs(row.Amount || row.Value || row.Margin) })),
      subtotal: visibleRows.slice(0, 12).reduce((sum, row) => sum + Math.abs(row.Amount || row.Value || row.Margin), 0),
      total: visibleRows.slice(0, 12).reduce((sum, row) => sum + Math.abs(row.Amount || row.Value || row.Margin), 0),
      notes: "Generated locally from MedTech ERP demo records. No external BI service or integration was used.",
      terms: ["Local demo mode only.", "Use seeded demo summaries where source records are incomplete."],
      preparedBy: getDemoSession()?.name || PRESENTATION_USER_NAME,
      approvedBy: "Management"
    }, "blob");
    if (!(result instanceof Blob)) return notify("PDF generation failed");
    downloadBlob(result, `${active.id}-management-report.pdf`);
    notify("Management report PDF generated");
  };

  return <div className="mx-auto max-w-[1600px] p-4 md:p-7">
    <div className="mb-6 flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
      <div>
        <div className="mb-1 flex items-center gap-2 text-[10px] font-bold uppercase tracking-[.14em] text-slate-400"><SlidersHorizontal className="h-3.5 w-3.5 text-teal-600" /> Local reporting layer</div>
        <h1 className="text-2xl font-bold tracking-tight">Reports & Analytics</h1>
        <p className="mt-1 text-xs text-[var(--muted)]">Local demo dashboards calculated from ERP records, with seeded summaries only where source data is thin.</p>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {activeId !== "integrations" && <>
          <Button variant="secondary" onClick={exportRows}><FileDown className="h-4 w-4" /> Excel</Button>
          <Button onClick={downloadPdf}><FileText className="h-4 w-4" /> Management PDF</Button>
        </>}
      </div>
    </div>

    <section className="mb-5 overflow-hidden rounded-2xl border bg-[var(--panel)] shadow-soft">
      <div className="flex gap-1 overflow-x-auto border-b px-4 pt-1">
        {dashboards.map(dashboard => <button key={dashboard.id} onClick={() => { setActiveId(dashboard.id); setDrill(""); }} className={cn("relative whitespace-nowrap px-3 py-4 text-xs font-semibold transition", activeId === dashboard.id ? "text-teal-600" : "text-[var(--muted)] hover:text-[var(--text)]")}>{dashboard.title}{activeId === dashboard.id && <span className="absolute inset-x-2 bottom-0 h-0.5 rounded-full bg-teal-500" />}</button>)}
        <button onClick={() => { setActiveId("integrations"); setDrill(""); }} className={cn("relative inline-flex items-center gap-2 whitespace-nowrap px-3 py-4 text-xs font-semibold transition", activeId === "integrations" ? "text-teal-600" : "text-[var(--muted)] hover:text-[var(--text)]")}><PlugZap className="h-4 w-4" />Integration Simulators{activeId === "integrations" && <span className="absolute inset-x-2 bottom-0 h-0.5 rounded-full bg-teal-500" />}</button>
      </div>
      {activeId === "integrations" ? <div className="p-4"><IntegrationSimulatorsWorkspace /></div> : <>
      <div className="grid gap-3 border-b p-4 md:grid-cols-2 xl:grid-cols-4">
        <DateInput label="From" value={filters.from || ""} onChange={value => updateFilter("from", value)} />
        <DateInput label="To" value={filters.to || ""} onChange={value => updateFilter("to", value)} />
        <Select label="BU" value={filters.bu || ""} options={model.options.bu} onChange={value => updateFilter("bu", value)} />
        <Select label="Salesperson" value={filters.salesperson || ""} options={model.options.salesperson} onChange={value => updateFilter("salesperson", value)} />
        <Select label="Customer" value={filters.customer || ""} options={model.options.customer} onChange={value => updateFilter("customer", value)} />
        <Select label="Product category" value={filters.category || ""} options={model.options.category} onChange={value => updateFilter("category", value)} />
        <Select label="Supplier" value={filters.supplier || ""} options={model.options.supplier} onChange={value => updateFilter("supplier", value)} />
        <Select label="Engineer" value={filters.engineer || ""} options={model.options.engineer} onChange={value => updateFilter("engineer", value)} />
        <Select label="Contract" value={filters.contract || ""} options={model.options.contract} onChange={value => updateFilter("contract", value)} />
        <Select label="Status" value={filters.status || ""} options={model.options.status} onChange={value => updateFilter("status", value)} />
        <Button variant="secondary" className="self-end" onClick={() => { setFilters({ from: "2026-06-01", to: "2026-09-30" }); setQuery(""); setDrill(""); }}><Filter className="h-4 w-4" /> Reset</Button>
      </div>
      </>}
    </section>

    {activeId !== "integrations" && <>
    <section className="mb-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {active.kpis.map((kpi, index) => <button key={kpi.label} onClick={() => setDrill(current => current === kpi.drill ? "" : kpi.drill)} className={cn("rounded-2xl border bg-[var(--panel)] p-5 text-left shadow-soft transition hover:-translate-y-0.5 hover:border-teal-200", drill === kpi.drill && "border-teal-300 ring-2 ring-teal-500/10")} style={{ animationDelay: `${index * 45}ms` }}>
        <p className="text-xs font-medium text-[var(--muted)]">{kpi.label}</p>
        <div className="mt-2 text-[24px] font-bold tracking-tight tabular">{kpi.value}</div>
        <div className={cn("mt-3 text-[11px] font-semibold", kpi.tone === "danger" ? "text-rose-600" : kpi.tone === "warning" ? "text-amber-600" : kpi.tone === "success" ? "text-emerald-600" : "text-slate-400")}>{kpi.note}</div>
      </button>)}
    </section>

    <section className="mb-5 grid gap-5 xl:grid-cols-[1.25fr_.9fr]">
      <Panel title={active.title} subtitle={active.subtitle}>
        <div className="h-[330px] p-4"><ReportChart dashboard={active} /></div>
      </Panel>
      <Panel title="Drill-down rows" subtitle={drill || "Click any KPI card to narrow this table"}>
        <div className="flex items-center gap-3 border-b px-4 py-3">
          <div className="relative min-w-[180px] flex-1"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" /><input value={query} onChange={event => setQuery(event.target.value)} placeholder="Search report rows..." className="h-9 w-full rounded-lg border bg-[var(--panel)] pl-9 pr-3 text-sm outline-none focus:border-teal-500" /></div>
          <Button variant="ghost" onClick={exportRows}><Download className="h-4 w-4" /></Button>
        </div>
        <div className="max-h-[330px] overflow-auto">
          <table className="w-full min-w-[760px] text-left text-xs">
            <thead className="sticky top-0 z-10 bg-slate-50 dark:bg-slate-900"><tr>{columns.slice(0, 7).map(column => <th key={column} className="px-4 py-3 text-[10px] font-bold uppercase tracking-wide text-slate-400">{column}</th>)}</tr></thead>
            <tbody className="divide-y">{visibleRows.map((row, index) => <tr key={`${row.Dashboard}-${row.Record}-${index}`} className="hover:bg-slate-50 dark:hover:bg-slate-900/40">{columns.slice(0, 7).map(column => <td key={column} className="px-4 py-3">{column === "Status" ? <StatusBadge>{String(row[column])}</StatusBadge> : formatCell(row[column])}</td>)}</tr>)}</tbody>
          </table>
        </div>
        <div className="border-t px-4 py-3 text-[11px] text-slate-400">Showing {visibleRows.length} of {active.rows.length} local dashboard rows</div>
      </Panel>
    </section>

    <Panel title="Management detail table" subtitle="Filtered rows behind the active dashboard">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[1280px] text-left text-xs">
          <thead><tr className="border-b bg-slate-50/70 dark:bg-slate-900/40">{columns.map(column => <th key={column} className="px-4 py-3 text-[10px] font-bold uppercase tracking-wide text-slate-400">{column}</th>)}</tr></thead>
          <tbody className="divide-y">{visibleRows.map((row, index) => <tr key={`${row.KPI}-${row.Record}-${index}-wide`} className="hover:bg-slate-50/70 dark:hover:bg-slate-900/40">{columns.map(column => <td key={column} className="px-4 py-3">{column === "Status" ? <StatusBadge>{String(row[column])}</StatusBadge> : formatCell(row[column])}</td>)}</tr>)}</tbody>
        </table>
      </div>
    </Panel>
    </>}
    {toast && <div role="status" className="fixed bottom-5 right-5 z-[100] rounded-xl bg-slate-900 px-4 py-3 text-xs font-medium text-white shadow-panel animate-in">{toast}</div>}
  </div>;
}

function ReportChart({ dashboard }: { dashboard: ReportDashboard }) {
  const data = dashboard.chartData.length ? dashboard.chartData : [{ name: "No rows", value: 0 }];
  if (dashboard.chart === "pie") return <ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={data} dataKey="value" nameKey="name" innerRadius={72} outerRadius={118} paddingAngle={2}>{data.map((_, index) => <Cell key={index} fill={chartColors[index % chartColors.length]} />)}</Pie><Tooltip content={<ChartTooltip />} /></PieChart></ResponsiveContainer>;
  if (dashboard.chart === "area") return <ResponsiveContainer width="100%" height="100%"><AreaChart data={data} margin={{ top: 10, right: 16, left: 0, bottom: 0 }}><CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--line)" /><XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: "#94a3b8" }} /><YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: "#94a3b8" }} tickFormatter={compact} width={46} /><Tooltip content={<ChartTooltip />} /><Area type="monotone" dataKey="value" stroke="#0d9488" strokeWidth={2.5} fill="#ccfbf1" /></AreaChart></ResponsiveContainer>;
  if (dashboard.chart === "line") return <ResponsiveContainer width="100%" height="100%"><AreaChart data={data} margin={{ top: 10, right: 16, left: 0, bottom: 0 }}><CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--line)" /><XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: "#94a3b8" }} /><YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: "#94a3b8" }} width={38} /><Tooltip content={<ChartTooltip />} /><Area type="monotone" dataKey="value" stroke="#2563eb" strokeWidth={2.5} fill="#dbeafe" /></AreaChart></ResponsiveContainer>;
  return <ResponsiveContainer width="100%" height="100%"><BarChart data={data} margin={{ top: 10, right: 16, left: 0, bottom: 0 }}><CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--line)" /><XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: "#94a3b8" }} interval={0} angle={-12} textAnchor="end" height={56} /><YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: "#94a3b8" }} tickFormatter={compact} width={46} /><Tooltip content={<ChartTooltip />} /><Bar dataKey="value" radius={[7, 7, 0, 0]}>{data.map((_, index) => <Cell key={index} fill={chartColors[index % chartColors.length]} />)}</Bar></BarChart></ResponsiveContainer>;
}

function ResponsiveContainer(props: React.ComponentProps<typeof RechartsResponsiveContainer>) {
  const [ready, setReady] = useState(false);
  useEffect(() => setReady(true), []);
  if (!ready) return <div className="h-full w-full animate-pulse rounded-xl bg-slate-50 dark:bg-slate-900/40" />;
  return <RechartsResponsiveContainer minWidth={0} initialDimension={{ width: 1, height: 1 }} {...props} />;
}

function Panel({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return <section className="overflow-hidden rounded-2xl border bg-[var(--panel)] shadow-soft"><div className="border-b px-5 py-4"><h2 className="text-sm font-bold">{title}</h2>{subtitle && <p className="mt-1 text-[11px] text-slate-400">{subtitle}</p>}</div>{children}</section>;
}

function Select({ label, value, options, onChange }: { label: string; value: string; options: string[]; onChange: (value: string) => void }) {
  return <label className="min-w-0"><span className="mb-1 block text-[10px] font-bold uppercase tracking-wide text-slate-400">{label}</span><select value={value} onChange={event => onChange(event.target.value)} className="h-9 w-full rounded-lg border bg-[var(--panel)] px-3 text-xs outline-none"><option value="">All</option>{options.map(option => <option key={option}>{option}</option>)}</select></label>;
}

function DateInput({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return <label><span className="mb-1 block text-[10px] font-bold uppercase tracking-wide text-slate-400">{label}</span><input type="date" value={value} onChange={event => onChange(event.target.value)} className="h-9 w-full rounded-lg border bg-[var(--panel)] px-3 text-xs outline-none" /></label>;
}

function ChartTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ value: number }>; label?: string }) {
  if (!active || !payload?.length) return null;
  return <div className="rounded-xl border bg-[var(--panel)] p-3 text-xs shadow-panel"><div className="font-semibold">{label}</div><div className="mt-1 text-[var(--muted)]">{formatCell(payload[0].value)}</div></div>;
}

function readSalesWorkflows() {
  try {
    const stored = localStorage.getItem(salesWorkflowStorageKey);
    return stored ? JSON.parse(stored) as SalesWorkflowRecord[] : seedSalesWorkflows();
  } catch {
    return seedSalesWorkflows();
  }
}

function readSalesCostings() {
  try {
    const stored = localStorage.getItem(COSTING_STORAGE_KEY);
    return stored ? JSON.parse(stored) as CostingSheet[] : seedCostingSheets();
  } catch {
    return seedCostingSheets();
  }
}

function exportRow(row: ReportRow) {
  return Object.fromEntries(columns.map(column => [column, row[column]]));
}

function formatCell(value: unknown) {
  if (typeof value === "number") return Math.abs(value) >= 1000 ? `QAR ${Math.round(value).toLocaleString("en-US")}` : value.toLocaleString("en-US");
  return String(value || "-");
}

function compact(value: unknown) {
  const number = Number(value);
  if (!Number.isFinite(number)) return String(value);
  if (Math.abs(number) >= 1_000_000) return `${Math.round(number / 100_000) / 10}M`;
  if (Math.abs(number) >= 1_000) return `${Math.round(number / 100) / 10}K`;
  return String(Math.round(number));
}
