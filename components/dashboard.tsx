"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  ArrowRight, BadgeCheck, Banknote, Boxes, CalendarDays,
  ChevronRight, Clock3, FileText, Handshake, PackageSearch, Plus, ReceiptText,
  ShieldAlert, TrendingUp, Users, Warehouse, Wrench
} from "lucide-react";
import { quickActions } from "@/lib/erp-data";
import { getDemoSession, type DemoSession } from "@/lib/demo-auth";
import { alertLink, readLocalAlerts, type AlertRecord } from "@/lib/local-alerts";
import { buildMyWorkQueue, type WorkTask } from "@/lib/my-work";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui";

const revenueData = [
  { month: "Jan", revenue: 1.68, target: 1.55 },
  { month: "Feb", revenue: 1.82, target: 1.66 },
  { month: "Mar", revenue: 1.74, target: 1.80 },
  { month: "Apr", revenue: 2.24, target: 1.92 },
  { month: "May", revenue: 2.36, target: 2.10 },
  { month: "Jun", revenue: 2.84, target: 2.35 }
];

const pipeline = [
  { stage: "Lead", count: 28, value: "QAR 1.12M", width: "100%", color: "bg-blue-400 dark:bg-sky-400" },
  { stage: "Qualified", count: 19, value: "QAR 1.48M", width: "82%", color: "bg-blue-500 dark:bg-sky-500" },
  { stage: "Proposal", count: 14, value: "QAR 1.36M", width: "66%", color: "bg-[var(--corporate-navy)]" },
  { stage: "Negotiation", count: 8, value: "QAR 860K", width: "46%", color: "bg-[var(--brand-red)]" }
];

const fallbackApprovals = [
  { id: "QTN-2026-0314", label: "Quotation discount approval", value: "18% discount", due: "Urgent" },
  { id: "PO-2026-0124", label: "Purchase order review", value: "QAR 94,750", due: "Today" },
  { id: "EXP-2026-0448", label: "Project expense approval", value: "QAR 12,480", due: "Today" }
];

const activities = [
  { title: "Quotation QTN-2026-0314 submitted", note: "Sales - Hamad Medical Corporation", time: "8 min ago", icon: Handshake, tone: "info" },
  { title: "Stock receipt GRN-2026-0098 completed", note: "Warehouse - 48 line items", time: "24 min ago", icon: Warehouse, tone: "warning" },
  { title: "Service ticket SRV-2026-0828 resolved", note: "Service - Doha Clinic", time: "52 min ago", icon: Wrench, tone: "danger" },
  { title: "Purchase order PO-2026-0128 approved", note: "Finance - QAR 624,000", time: "1h ago", icon: BadgeCheck, tone: "success" }
];

export function Dashboard() {
  const router = useRouter();
  const [session, setSession] = useState<DemoSession | null>(null);
  const [reportDate, setReportDate] = useState("20 June 2026");
  const [alerts, setAlerts] = useState<AlertRecord[]>([]);
  const [tasks, setTasks] = useState<WorkTask[]>([]);

  useEffect(() => {
    const currentSession = getDemoSession();
    setSession(currentSession);
    setTasks(buildMyWorkQueue(currentSession));
    setAlerts(readLocalAlerts().filter(row => row.Status !== "Resolved"));
    setReportDate(new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "long", year: "numeric" }).format(new Date()));
  }, []);

  const firstName = session?.name?.trim().split(/\s+/)[0] || "there";
  const approvalTasks = tasks.filter(task => task["Source Module"] === "Approvals" || task["Action Required"].toLowerCase().includes("approv"));
  const approvalRows = approvalTasks.length ? approvalTasks.slice(0, 3).map(task => ({
    id: task["Source Record"],
    label: task["Action Required"],
    value: task.Notes || task.Priority,
    due: task.Priority
  })) : fallbackApprovals;

  const kpis = [
    { label: "Total Employees", value: "126", note: "114 present today", href: "/hr", icon: Users, tone: "navy" },
    { label: "Pending Approvals", value: String(approvalTasks.length || 7), note: "3 due today", href: "/approvals", icon: BadgeCheck, tone: "amber" },
    { label: "Payroll Status", value: "Validated", note: "Final approval pending", href: "/hr", icon: ReceiptText, tone: "blue" },
    { label: "Sales Pipeline", value: "QAR 4.82M", note: "69 active opportunities", href: "/sales", icon: Handshake, tone: "navy" },
    { label: "Revenue / Receivables", value: "QAR 2.84M", note: "QAR 1.24M receivables", href: "/finance", icon: Banknote, tone: "green" },
    { label: "Low Stock", value: "23", note: "Below minimum level", href: "/inventory", icon: Boxes, tone: "amber" },
    { label: "Expiring Stock", value: "14", note: "Within 90 days", href: "/inventory", icon: PackageSearch, tone: "rose" },
    { label: "Open Service Tickets", value: "27", note: "3 critical items", href: "/service", icon: Wrench, tone: "blue" }
  ] as const;

  return <div className="mx-auto max-w-[1600px] space-y-5 bg-[var(--main-bg)] p-4 md:p-7">
    <section className="overflow-hidden rounded-2xl border border-[var(--line-soft)] bg-white p-5 shadow-panel dark:bg-[radial-gradient(circle_at_18%_0%,rgb(56_189_248/.14),transparent_32rem),linear-gradient(135deg,var(--panel-start),var(--panel-end))] md:p-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="max-w-3xl">
          <div className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-[.16em] text-[var(--brand-red)]"><ShieldAlert className="h-4 w-4" /> Executive overview</div>
          <h1 className="text-2xl font-bold tracking-tight text-medtech-navy dark:text-[var(--text)] md:text-[30px]">Good morning, {firstName}</h1>
          <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">MedTech is operating with strong revenue momentum, controlled approval queues, and active stock/service follow-up items requiring management attention.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="secondary"><CalendarDays className="h-4 w-4" /> 1-20 Jun 2026</Button>
          <Button onClick={() => router.push("/sales")}><Plus className="h-4 w-4" /> Quick create</Button>
        </div>
      </div>
      <div className="mt-5 grid gap-3 border-t border-[var(--line-soft)] pt-4 text-xs text-[var(--muted)] md:grid-cols-3">
        <SummaryItem label="Report date" value={reportDate} />
        <SummaryItem label="Priority queue" value={`${alerts.length || 64} active alerts`} />
        <SummaryItem label="Executive focus" value="Revenue, cash, stock, service" />
      </div>
    </section>

    <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {kpis.map(item => <KpiCard key={item.label} {...item} />)}
    </section>

    <section className="grid gap-5 xl:grid-cols-[1.55fr_1fr]">
      <Panel title="Revenue / Sales Performance" subtitle="Recognized revenue, target trend and active opportunity mix" action="View finance" href="/finance">
        <div className="grid gap-5 lg:grid-cols-[1.15fr_.85fr]">
          <div>
            <div className="mb-4 flex flex-wrap items-end gap-3">
              <div><div className="text-[11px] font-semibold text-[var(--muted)]">Recognized revenue</div><div className="text-2xl font-bold tabular">QAR 12.68M</div></div>
              <span className="rounded-full bg-[var(--badge-success-bg)] px-2.5 py-1 text-[11px] font-bold text-[var(--badge-success-text)] dark:bg-emerald-950/45 dark:text-emerald-300">+15.2% YTD</span>
              <div className="ml-auto flex items-center gap-3 text-[10px] text-[var(--muted)]"><Legend color="bg-[var(--corporate-navy)]" label="Revenue" /><Legend color="bg-slate-300" label="Target" /></div>
            </div>
            <RevenueChart />
          </div>
          <div className="rounded-xl border border-[var(--line-soft)] bg-white p-4 shadow-soft dark:bg-[var(--elevated)]/35">
            <div className="mb-4 flex items-center justify-between"><div><h3 className="text-sm font-bold">Sales pipeline</h3><p className="text-[11px] text-[var(--muted)]">QAR 4.82M across 69 opportunities</p></div><TrendingUp className="h-5 w-5 text-[var(--brand-red)]" /></div>
            <div className="space-y-4">{pipeline.map(item => <div key={item.stage}><div className="mb-1.5 flex items-center text-xs"><span className="font-semibold">{item.stage}</span><span className="ml-auto text-[var(--muted)]">{item.count} deals</span><span className="ml-3 w-20 text-right font-bold tabular">{item.value}</span></div><div className="h-2 overflow-hidden rounded-full bg-[var(--elevated)]"><div className={cn("h-full rounded-full", item.color)} style={{ width: item.width }} /></div></div>)}</div>
          </div>
        </div>
      </Panel>

      <Panel title="Pending Approvals" subtitle={`${approvalTasks.length || 7} requests need attention`} action="Open queue" href="/approvals">
        <div className="space-y-2">{approvalRows.map((row, index) => <Link key={`${row.id}-${index}`} href="/approvals" className="flex items-center gap-3 rounded-xl border border-[var(--line-soft)] bg-white p-3 transition hover:border-medtech-navy/45 hover:bg-[var(--elevated)] dark:bg-[var(--elevated)]/20"><StatusIcon tone="amber"><Clock3 className="h-4 w-4" /></StatusIcon><div className="min-w-0 flex-1"><div className="truncate text-xs font-bold text-medtech-navy dark:text-[var(--text)]">{row.id}</div><div className="truncate text-[11px] text-[var(--muted)]">{row.label}</div></div><div className="text-right"><div className="text-xs font-bold">{row.value}</div><div className="text-[10px] text-amber-700 dark:text-amber-300">{row.due}</div></div><ChevronRight className="h-4 w-4 text-[var(--muted)]" /></Link>)}</div>
      </Panel>
    </section>

    <section className="grid gap-5 xl:grid-cols-3">
      <Panel title="Warehouse Health" subtitle="Availability, low stock and expiry control" action="Inventory" href="/inventory">
        <div className="flex items-center gap-5"><StockDonut /><div className="flex-1 space-y-3 text-xs"><MetricLine label="Healthy stock" value="82%" color="bg-[var(--corporate-navy)]" /><MetricLine label="Low stock" value="23 SKUs" color="bg-amber-500" /><MetricLine label="Expiring stock" value="14 items" color="bg-[var(--brand-red)] dark:bg-rose-500" /></div></div>
        <div className="mt-5 rounded-xl border border-[var(--badge-warning-ring)] bg-[var(--badge-warning-bg)] p-3 text-xs text-[var(--badge-warning-text)]">23 SKUs are below minimum stock level. 14 lots need expiry review within 90 days.</div>
      </Panel>

      <Panel title="Workforce Attendance" subtitle="Today at 09:30" action="Open HR" href="/hr">
        <div className="mb-4 flex items-center gap-4"><StatusIcon tone="navy" size="lg"><Users className="h-6 w-6" /></StatusIcon><div><div className="text-2xl font-bold tabular">114 <span className="text-sm font-normal text-[var(--muted)]">/ 126</span></div><div className="text-[11px] text-[var(--muted)]">Employees present</div></div></div>
        <div className="space-y-3"><Progress label="Present" value="114" width="90.5%" color="bg-emerald-500" /><Progress label="On leave" value="8" width="6.3%" color="bg-blue-500" /><Progress label="Absent" value="4" width="3.2%" color="bg-[var(--brand-red)] dark:bg-rose-500" /></div>
      </Panel>

      <Panel title="Alerts" subtitle={`${alerts.length || 64} local alerts requiring review`} action="View alerts" href="/alerts">
        <div className="space-y-2">{(alerts.length ? alerts.slice(0, 4) : []).map(alert => <Link key={alert["Alert No"]} href={alertLink(alert)} className="flex gap-3 rounded-xl border border-[var(--line-soft)] bg-white p-3 transition hover:border-medtech-navy/45 hover:bg-[var(--elevated)] dark:bg-[var(--elevated)]/20"><span className={cn("mt-1.5 h-2 w-2 shrink-0 rounded-full", alert.Priority === "Critical" ? "bg-[var(--brand-red)]" : "bg-amber-500")} /><span className="min-w-0 flex-1"><span className="block truncate text-xs font-bold text-medtech-navy dark:text-[var(--text)]">{alert["Alert Type"]}</span><span className="block truncate text-[11px] text-[var(--muted)]">{alert["Source Module"]} - {alert["Source Record"]}</span></span><span className="text-[10px] font-bold text-[var(--muted)]">{alert.Priority}</span></Link>)}
          {!alerts.length && <div className="rounded-xl border border-[var(--line-soft)] bg-[var(--elevated)]/20 p-5 text-center text-xs text-[var(--muted)]">No active local alerts.</div>}
        </div>
      </Panel>
    </section>

    <section className="grid gap-5 xl:grid-cols-[1.15fr_.85fr]">
      <Panel title="Recent Activity" subtitle="Latest demo transactions across MedTech" action="Audit trail" href="/admin">
        <div className="divide-y divide-[var(--line-soft)]">{activities.map(item => { const Icon = item.icon; return <div key={item.title} className="flex items-center gap-3 py-3"><StatusIcon tone={item.tone}><Icon className="h-4 w-4" /></StatusIcon><div className="min-w-0 flex-1"><div className="truncate text-xs font-bold">{item.title}</div><div className="truncate text-[11px] text-[var(--muted)]">{item.note}</div></div><span className="whitespace-nowrap text-[10px] text-[var(--muted)]">{item.time}</span></div>; })}</div>
      </Panel>

      <Panel title="My Tasks / Quick Actions" subtitle={`${tasks.length || 12} local work items and common actions`}>
        <div className="mb-4 space-y-2">{tasks.slice(0, 3).map(task => <Link key={task["Task No"]} href={task["Link/Open Record"]} className="flex items-center gap-3 rounded-xl border border-[var(--line-soft)] bg-white p-3 transition hover:border-medtech-navy/45 hover:bg-[var(--elevated)] dark:bg-[var(--elevated)]/20"><StatusIcon tone={task.Priority === "Critical" ? "danger" : "amber"}><FileText className="h-4 w-4" /></StatusIcon><div className="min-w-0 flex-1"><div className="truncate text-xs font-bold text-medtech-navy dark:text-[var(--text)]">{task["Action Required"]}</div><div className="truncate text-[11px] text-[var(--muted)]">{task["Source Module"]} - {task["Source Record"]}</div></div><ChevronRight className="h-4 w-4 text-[var(--muted)]" /></Link>)}</div>
        <div className="grid grid-cols-2 gap-2">{quickActions.map(action => { const Icon = action.icon; return <Link key={action.label} href={action.href} className="group flex items-center gap-2 rounded-lg border border-[var(--line-soft)] bg-white p-2.5 text-xs font-bold text-medtech-navy transition hover:border-medtech-navy/45 hover:bg-[var(--navy-tint)] dark:bg-[var(--elevated)]/20 dark:text-[var(--text)]"><Icon className="h-4 w-4 text-medtech-navy dark:text-medtech-red" /><span className="truncate">{action.label}</span></Link>; })}</div>
      </Panel>
    </section>
  </div>;
}

function SummaryItem({ label, value }: { label: string; value: string }) {
  return <div><div className="text-[10px] font-bold uppercase tracking-[.16em] text-[var(--muted)]">{label}</div><div className="mt-1 font-semibold text-[var(--text)]">{value}</div></div>;
}

function KpiCard({ label, value, note, href, icon: Icon, tone }: { label: string; value: string; note: string; href: string; icon: typeof Users; tone: "navy" | "amber" | "blue" | "green" | "rose" }) {
  return <Link href={href} className="group rounded-xl border border-[var(--line-soft)] bg-white p-4 shadow-soft transition hover:-translate-y-0.5 hover:border-medtech-navy/45 hover:shadow-panel dark:bg-[radial-gradient(circle_at_22%_0%,rgb(56_189_248/.12),transparent_16rem),linear-gradient(135deg,var(--panel-start),var(--panel-end))]">
    <div className="flex items-start justify-between gap-3"><StatusIcon tone={tone}><Icon className="h-4 w-4" /></StatusIcon><ArrowRight className="h-4 w-4 text-[var(--muted)] opacity-0 transition group-hover:opacity-100" /></div>
    <div className="mt-4 text-[11px] font-bold uppercase tracking-[.12em] text-[var(--muted)]">{label}</div>
    <div className="mt-1 text-2xl font-bold tracking-tight text-medtech-navy tabular dark:text-[var(--text)]">{value}</div>
    <div className="mt-2 text-xs text-[var(--text-secondary)]">{note}</div>
  </Link>;
}

function Panel({ title, subtitle, action, href = "#", children }: { title: string; subtitle?: string; action?: string; href?: string; children: React.ReactNode }) {
  return <section className="rounded-xl border border-[var(--line-soft)] bg-white p-5 shadow-soft dark:bg-[linear-gradient(135deg,var(--panel-start),var(--panel-end))]">
    <div className="mb-4 flex items-start justify-between gap-3"><div><h2 className="text-base font-bold text-medtech-navy dark:text-[var(--text)]">{title}</h2>{subtitle && <p className="mt-1 text-[11px] text-[var(--muted)]">{subtitle}</p>}</div>{action && <Link href={href} className="flex shrink-0 items-center gap-1 text-[11px] font-bold text-[var(--brand-red)] hover:text-medtech-redDark dark:hover:text-red-200">{action}<ArrowRight className="h-3.5 w-3.5" /></Link>}</div>
    {children}
  </section>;
}

function StatusIcon({ tone, size = "md", children }: { tone: string; size?: "md" | "lg"; children: React.ReactNode }) {
  const tones: Record<string, string> = {
    navy: "bg-[var(--navy-tint)] text-medtech-navy ring-1 ring-medtech-navy/15",
    amber: "bg-[var(--badge-warning-bg)] text-[var(--badge-warning-text)] ring-1 ring-[var(--badge-warning-ring)]",
    blue: "bg-[var(--blue-tint)] text-medtech-navy ring-1 ring-medtech-navy/15",
    green: "bg-[var(--badge-success-bg)] text-[var(--badge-success-text)] ring-1 ring-[var(--badge-success-ring)]",
    rose: "bg-[var(--badge-danger-bg)] text-[var(--badge-danger-text)] ring-1 ring-[var(--badge-danger-ring)]",
    danger: "bg-[var(--red-tint)] text-[var(--brand-red)]"
  };
  return <span className={cn("grid shrink-0 place-items-center rounded-lg", size === "lg" ? "h-14 w-14" : "h-9 w-9", tones[tone] ?? tones.navy)}>{children}</span>;
}

function Legend({ color, label }: { color: string; label: string }) {
  return <span className="flex items-center gap-1.5"><i className={cn("h-2 w-2 rounded-full", color)} /> {label}</span>;
}

function MetricLine({ label, value, color }: { label: string; value: string; color: string }) {
  return <div className="flex items-center gap-2"><i className={cn("h-2 w-2 rounded-full", color)} /><span className="text-[var(--muted)]">{label}</span><b className="ml-auto tabular">{value}</b></div>;
}

function Progress({ label, value, width, color }: { label: string; value: string; width: string; color: string }) {
  return <div><div className="mb-1.5 flex text-[11px]"><span>{label}</span><span className="ml-auto font-bold tabular">{value}</span></div><div className="h-1.5 overflow-hidden rounded-full bg-slate-100 dark:bg-[var(--elevated)]/80"><div className={cn("h-full rounded-full", color)} style={{ width }} /></div></div>;
}

function RevenueChart() {
  const width = 640;
  const height = 210;
  const pad = 24;
  const max = Math.max(...revenueData.flatMap(row => [row.revenue, row.target]));
  const min = Math.min(...revenueData.flatMap(row => [row.revenue, row.target]));
  const xy = (value: number, index: number) => {
    const x = pad + (index / (revenueData.length - 1)) * (width - pad * 2);
    const y = height - pad - ((value - min) / (max - min)) * (height - pad * 2);
    return [x, y] as const;
  };
  const path = (key: "revenue" | "target") => revenueData.map((row, index) => `${index ? "L" : "M"}${xy(row[key], index).join(",")}`).join(" ");
  const revenuePath = path("revenue");
  const targetPath = path("target");
  const areaPath = `${revenuePath} L${width - pad},${height - pad} L${pad},${height - pad} Z`;

  return <div className="h-[235px]"><svg viewBox={`0 0 ${width} ${height}`} className="h-full w-full" role="img" aria-label="Revenue performance chart">
    <defs><linearGradient id="execRevenueFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="var(--dashboard-chart-fill)" stopOpacity="var(--dashboard-chart-fill-opacity)" /><stop offset="100%" stopColor="var(--dashboard-chart-fill)" stopOpacity="0" /></linearGradient></defs>
    {[0, 1, 2].map(index => <line key={index} x1={pad} x2={width - pad} y1={pad + index * 55} y2={pad + index * 55} stroke="var(--line-soft)" strokeDasharray="4 5" />)}
    <path d={areaPath} fill="url(#execRevenueFill)" />
    <path d={targetPath} fill="none" stroke="#cbd5e1" strokeWidth="2" strokeDasharray="7 7" />
    <path d={revenuePath} fill="none" stroke="var(--dashboard-chart)" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />
    {revenueData.map((row, index) => { const [x, y] = xy(row.revenue, index); return <g key={row.month}><circle cx={x} cy={y} r="4" fill="var(--dashboard-chart)" /><text x={x} y={height - 4} textAnchor="middle" fontSize="11" fill="var(--muted)">{row.month}</text></g>; })}
  </svg></div>;
}

function StockDonut() {
  return <div className="grid h-32 w-32 shrink-0 place-items-center rounded-full shadow-soft" style={{ background: "conic-gradient(var(--dashboard-stock-healthy) 0 82%, #f59e0b 82% 94%, #ED1E36 94% 100%)" }}><div className="grid h-20 w-20 place-items-center rounded-full bg-[var(--panel)] text-center ring-1 ring-[var(--line-soft)]"><b className="text-lg text-medtech-navy dark:text-[var(--text)]">82%</b><span className="-mt-1 text-[10px] text-[var(--muted)]">healthy</span></div></div>;
}
