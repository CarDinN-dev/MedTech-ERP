"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Area, AreaChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer as RechartsResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { ArrowRight, CalendarDays, Check, ChevronRight, Clock3, MoreHorizontal, Plus, Sparkles, TrendingUp, Users, Warehouse, Wrench, ShieldCheck, Handshake } from "lucide-react";
import { dashboardKpis, quickActions } from "@/lib/erp-data";
import { getDemoSession } from "@/lib/demo-auth";
import { cn } from "@/lib/utils";
import { Button, StatusBadge } from "@/components/ui";

const revenueData = [
  { month: "Jan", revenue: 1.68, target: 1.55 }, { month: "Feb", revenue: 1.82, target: 1.66 },
  { month: "Mar", revenue: 1.74, target: 1.80 }, { month: "Apr", revenue: 2.24, target: 1.92 },
  { month: "May", revenue: 2.36, target: 2.10 }, { month: "Jun", revenue: 2.84, target: 2.35 }
];
const pipeline = [
  { stage: "Lead", count: 28, value: "1.12M", width: "100%", color: "bg-sky-500" },
  { stage: "Qualified", count: 19, value: "1.48M", width: "82%", color: "bg-blue-500" },
  { stage: "Proposal", count: 14, value: "1.36M", width: "66%", color: "bg-indigo-500" },
  { stage: "Negotiation", count: 8, value: "860K", width: "46%", color: "bg-violet-500" }
];
const deptData = [{ name: "Sales", value: 86 }, { name: "Finance", value: 74 }, { name: "Service", value: 91 }, { name: "Warehouse", value: 78 }, { name: "Projects", value: 82 }];
const activities = [
  { title: "Quotation QTN-2026-0314 submitted", note: "Fahad Al-Kuwari · Hamad Medical Corporation", time: "8 min ago", icon: Handshake, color: "bg-blue-50 text-blue-600 dark:bg-blue-950" },
  { title: "Stock receipt GRN-2026-0098 completed", note: "Warehouse Team · 48 line items", time: "24 min ago", icon: Warehouse, color: "bg-amber-50 text-amber-600 dark:bg-amber-950" },
  { title: "Service ticket SRV-2026-0828 resolved", note: "Naveen Kumar · Doha Clinic", time: "52 min ago", icon: Wrench, color: "bg-rose-50 text-rose-600 dark:bg-rose-950" },
  { title: "Purchase order PO-2026-0128 approved", note: "Aisha Rahman · QAR 624,000", time: "1h ago", icon: ShieldCheck, color: "bg-emerald-50 text-emerald-600 dark:bg-emerald-950" }
];

function ResponsiveContainer(props: React.ComponentProps<typeof RechartsResponsiveContainer>) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return <div className="h-full w-full animate-pulse rounded-xl bg-slate-50 dark:bg-slate-900/40" />;
  return <RechartsResponsiveContainer minWidth={0} initialDimension={{ width: 1, height: 1 }} {...props} />;
}

export function Dashboard() {
  const router = useRouter();
  const [firstName, setFirstName] = useState("there");
  useEffect(() => {
    const session = getDemoSession();
    if (session?.name) setFirstName(session.name.trim().split(/\s+/)[0]);
  }, []);
  return <div className="mx-auto max-w-[1600px] p-4 md:p-7">
    <div className="mb-6 flex flex-col justify-between gap-4 md:flex-row md:items-end">
      <div><div className="mb-1 flex items-center gap-2 text-xs font-medium text-teal-600"><Sparkles className="h-3.5 w-3.5" /> Executive workspace</div><h1 className="text-2xl font-bold tracking-tight md:text-[28px]">Good morning, {firstName}</h1><p className="mt-1 text-[13px] text-[var(--muted)]">Here’s what’s happening across MedTech today, 20 June 2026.</p></div>
      <div className="flex items-center gap-2"><Button variant="secondary"><CalendarDays className="h-4 w-4" /> 1–20 Jun 2026</Button><Button onClick={() => router.push("/sales")}><Plus className="h-4 w-4" /> Quick create</Button></div>
    </div>

    <section className="mb-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{dashboardKpis.map((kpi, index) => { const Icon = kpi.icon; const colors: Record<string, string> = { teal: "bg-teal-50 text-teal-600 dark:bg-teal-950/60", blue: "bg-blue-50 text-blue-600 dark:bg-blue-950/60", orange: "bg-orange-50 text-orange-600 dark:bg-orange-950/60", rose: "bg-rose-50 text-rose-600 dark:bg-rose-950/60" }; return <div key={kpi.title} className="relative overflow-hidden rounded-2xl border bg-[var(--panel)] p-5 shadow-soft animate-in" style={{ animationDelay: `${index * 45}ms` }}><div className="flex items-start justify-between"><div className={cn("rounded-xl p-2.5", colors[kpi.color])}><Icon className="h-5 w-5" /></div><button className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"><MoreHorizontal className="h-4 w-4" /></button></div><p className="mt-4 text-xs font-medium text-[var(--muted)]">{kpi.title}</p><div className="mt-1 text-[24px] font-bold tracking-tight tabular">{kpi.value}</div><div className="mt-2 flex items-center gap-1.5 text-[11px]"><span className={cn("font-semibold", index < 2 ? "text-emerald-600" : index === 2 ? "text-amber-600" : "text-rose-600")}>{kpi.change}</span><span className="text-slate-400">{kpi.note}</span></div><div className={cn("absolute -bottom-10 -right-8 h-24 w-24 rounded-full opacity-[.06]", colors[kpi.color].split(" ")[0].replace("50", "500"))} /></div>; })}</section>

    <section className="mb-5 grid gap-5 xl:grid-cols-[1.65fr_1fr]">
      <div className="rounded-2xl border bg-[var(--panel)] shadow-soft"><PanelHeader title="Revenue performance" subtitle="Recognized revenue versus monthly target" action="View finance" href="/finance" /><div className="px-2 pb-4 pt-2"><div className="flex items-end gap-5 px-4 pb-3"><div><span className="text-2xl font-bold">QAR 12.68M</span><span className="ml-2 text-xs font-semibold text-emerald-600">+15.2% YTD</span></div><div className="ml-auto hidden items-center gap-3 text-[10px] text-slate-400 sm:flex"><span className="flex items-center gap-1.5"><i className="h-2 w-2 rounded-full bg-teal-500" /> Revenue</span><span className="flex items-center gap-1.5"><i className="h-2 w-2 rounded-full bg-slate-300" /> Target</span></div></div><div className="h-[245px]"><ResponsiveContainer width="100%" height="100%"><AreaChart data={revenueData} margin={{ top: 10, right: 18, left: 0, bottom: 0 }}><defs><linearGradient id="tealFill" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#0d9488" stopOpacity={0.25}/><stop offset="95%" stopColor="#0d9488" stopOpacity={0}/></linearGradient></defs><CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--line)"/><XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: "#94a3b8" }} dy={8}/><YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: "#94a3b8" }} tickFormatter={v => `${v}M`} width={36}/><Tooltip content={<ChartTooltip />} /><Area type="monotone" dataKey="target" stroke="#cbd5e1" strokeWidth={2} strokeDasharray="5 5" fill="transparent"/><Area type="monotone" dataKey="revenue" stroke="#0d9488" strokeWidth={2.5} fill="url(#tealFill)"/></AreaChart></ResponsiveContainer></div></div></div>
      <div className="rounded-2xl border bg-[var(--panel)] shadow-soft"><PanelHeader title="Sales pipeline" subtitle="QAR 4.82M across 69 opportunities" action="Open CRM" href="/sales" /><div className="space-y-5 p-5">{pipeline.map(item => <div key={item.stage}><div className="mb-2 flex items-center text-xs"><span className="font-semibold">{item.stage}</span><span className="ml-auto text-[11px] text-slate-400">{item.count} deals</span><span className="ml-3 w-14 text-right font-semibold tabular">{item.value}</span></div><div className="h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800"><div className={cn("h-full rounded-full", item.color)} style={{ width: item.width }} /></div></div>)}<div className="mt-3 flex items-center justify-between rounded-xl bg-teal-50 px-4 py-3 dark:bg-teal-950/40"><div><div className="text-[10px] font-medium uppercase tracking-wider text-teal-600">Conversion rate</div><div className="mt-0.5 text-lg font-bold">34.6%</div></div><TrendingUp className="h-6 w-6 text-teal-600" /></div></div></div>
    </section>

    <section className="mb-5 grid gap-5 xl:grid-cols-[1.15fr_1fr_1fr]">
      <div className="rounded-2xl border bg-[var(--panel)] shadow-soft"><PanelHeader title="Pending approvals" subtitle="7 requests need attention" action="View queue" href="/approvals" /><div className="divide-y">{[
        ["QTN-2026-0314", "Quotation discount · 18%", "QAR 286,000", "Urgent"], ["PO-2026-0124", "Purchase order · Thermo Fisher", "QAR 94,750", "Today"], ["EXP-2026-0448", "Project expense · Site works", "QAR 12,480", "Today"]
      ].map(row => <div key={row[0]} className="flex items-center gap-3 px-5 py-3.5"><div className="grid h-9 w-9 place-items-center rounded-xl bg-amber-50 text-amber-600 dark:bg-amber-950/50"><Clock3 className="h-4 w-4" /></div><div className="min-w-0 flex-1"><div className="text-xs font-semibold">{row[0]}</div><div className="mt-0.5 truncate text-[10px] text-slate-400">{row[1]}</div></div><div className="text-right"><div className="text-xs font-semibold">{row[2]}</div><div className="mt-0.5 text-[10px] text-amber-600">{row[3]}</div></div><ChevronRight className="h-4 w-4 text-slate-300" /></div>)}</div></div>
      <div className="rounded-2xl border bg-[var(--panel)] shadow-soft"><PanelHeader title="Warehouse health" subtitle="Stock availability snapshot" action="Inventory" href="/inventory" /><div className="flex items-center gap-4 px-5 pb-4"><div className="h-32 w-32 shrink-0"><ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={[{ value: 82 }, { value: 12 }, { value: 6 }]} dataKey="value" innerRadius={42} outerRadius={58} paddingAngle={2} startAngle={90} endAngle={-270}>{["#0d9488", "#f59e0b", "#f43f5e"].map(c => <Cell key={c} fill={c} />)}</Pie></PieChart></ResponsiveContainer></div><div className="space-y-3 text-xs">{[["Healthy stock", "82%", "bg-teal-500"], ["Low stock", "12%", "bg-amber-500"], ["Out of stock", "6%", "bg-rose-500"]].map(x => <div key={x[0]} className="flex items-center gap-2"><i className={cn("h-2 w-2 rounded-full", x[2])} /><span className="text-[var(--muted)]">{x[0]}</span><b className="ml-auto">{x[1]}</b></div>)}</div></div><div className="mx-5 mb-5 rounded-xl border border-amber-200 bg-amber-50 p-3 text-[11px] text-amber-800 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-300"><b>23 SKUs</b> are below minimum stock level.</div></div>
      <div className="rounded-2xl border bg-[var(--panel)] shadow-soft"><PanelHeader title="Today’s workforce" subtitle="Attendance as of 09:30" action="Open HR" href="/hr" /><div className="px-5 pb-5"><div className="mb-5 flex items-center gap-4"><div className="grid h-14 w-14 place-items-center rounded-2xl bg-violet-50 text-violet-600 dark:bg-violet-950/50"><Users className="h-6 w-6" /></div><div><div className="text-2xl font-bold">114 <span className="text-sm font-normal text-slate-400">/ 126</span></div><div className="text-[11px] text-slate-400">Employees present</div></div></div><div className="space-y-3">{[["Present", "114", "90.5%", "bg-violet-500"], ["On leave", "8", "6.3%", "bg-blue-500"], ["Absent", "4", "3.2%", "bg-rose-500"]].map(x => <div key={x[0]}><div className="mb-1.5 flex text-[11px]"><span>{x[0]}</span><span className="ml-auto font-semibold">{x[1]}</span></div><div className="h-1.5 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800"><div className={cn("h-full rounded-full", x[3])} style={{ width: x[2] }} /></div></div>)}</div></div></div>
    </section>

    <section className="grid gap-5 xl:grid-cols-[1.4fr_1fr]">
      <div className="rounded-2xl border bg-[var(--panel)] shadow-soft"><PanelHeader title="Recent activity" subtitle="Latest changes across your organization" action="Audit trail" href="/admin" /><div className="divide-y">{activities.map(item => { const Icon = item.icon; return <div key={item.title} className="flex items-center gap-3.5 px-5 py-3.5"><div className={cn("grid h-9 w-9 place-items-center rounded-xl", item.color)}><Icon className="h-4 w-4" /></div><div className="min-w-0 flex-1"><div className="truncate text-xs font-semibold">{item.title}</div><div className="mt-0.5 truncate text-[10px] text-slate-400">{item.note}</div></div><span className="whitespace-nowrap text-[10px] text-slate-400">{item.time}</span></div>; })}</div></div>
      <div className="rounded-2xl border bg-[var(--panel)] shadow-soft"><PanelHeader title="Quick actions" subtitle="Create a new business record" /><div className="grid grid-cols-2 gap-2.5 p-5">{quickActions.map(action => { const Icon = action.icon; return <Link key={action.label} href={action.href} className="group flex items-center gap-2.5 rounded-xl border p-3 text-xs font-semibold transition hover:border-teal-200 hover:bg-teal-50 dark:hover:border-teal-900 dark:hover:bg-teal-950/30"><span className="rounded-lg bg-slate-100 p-2 text-slate-500 transition group-hover:bg-white group-hover:text-teal-600 dark:bg-slate-800 dark:group-hover:bg-slate-900"><Icon className="h-4 w-4" /></span><span>{action.label}</span><ChevronRight className="ml-auto h-3.5 w-3.5 text-slate-300" /></Link>; })}</div></div>
    </section>
  </div>;
}

function PanelHeader({ title, subtitle, action, href = "#" }: { title: string; subtitle?: string; action?: string; href?: string }) { return <div className="flex items-start justify-between px-5 pb-4 pt-5"><div><h2 className="text-sm font-bold">{title}</h2>{subtitle && <p className="mt-1 text-[10px] text-slate-400">{subtitle}</p>}</div>{action && <Link href={href} className="flex items-center gap-1 text-[11px] font-semibold text-teal-600 hover:text-teal-700">{action}<ArrowRight className="h-3 w-3" /></Link>}</div>; }
function ChartTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ value: number; dataKey: string }>; label?: string }) { if (!active || !payload?.length) return null; return <div className="rounded-xl border bg-[var(--panel)] p-3 text-xs shadow-panel"><div className="mb-2 font-semibold">{label} 2026</div>{payload.map(p => <div key={p.dataKey} className="flex min-w-32 justify-between gap-4 py-0.5 capitalize text-slate-500"><span>{p.dataKey}</span><b className="text-[var(--text)]">QAR {p.value}M</b></div>)}</div>; }
