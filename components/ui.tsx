"use client";

import { cn } from "@/lib/utils";
import { ChevronDown, Search, SlidersHorizontal } from "lucide-react";

export function Button({ children, variant = "primary", className, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "secondary" | "ghost" | "danger" }) {
  const variants = {
    primary: "bg-teal-600 text-white hover:bg-teal-700 shadow-sm",
    secondary: "bg-[var(--panel)] text-[var(--text)] border hover:bg-slate-50 dark:hover:bg-slate-800",
    ghost: "text-[var(--muted)] hover:text-[var(--text)] hover:bg-slate-100 dark:hover:bg-slate-800",
    danger: "bg-rose-600 text-white hover:bg-rose-700"
  };
  return <button className={cn("inline-flex h-9 items-center justify-center gap-2 rounded-lg px-3.5 text-sm font-semibold transition disabled:opacity-50", variants[variant], className)} {...props}>{children}</button>;
}

export function StatusBadge({ children }: { children: React.ReactNode }) {
  const value = String(children).toLowerCase();
  const tone = value.includes("paid") || value.includes("active") || value.includes("approved") || value.includes("delivered") || value.includes("resolved") || value.includes("won") || value.includes("on track") || value.includes("in stock")
    ? "bg-emerald-50 text-emerald-700 ring-emerald-600/20 dark:bg-emerald-950/50 dark:text-emerald-300"
    : value.includes("overdue") || value.includes("critical") || value.includes("risk") || value.includes("hold") || value.includes("reorder")
      ? "bg-rose-50 text-rose-700 ring-rose-600/20 dark:bg-rose-950/50 dark:text-rose-300"
      : value.includes("pending") || value.includes("leave") || value.includes("low") || value.includes("awaiting") || value.includes("partial") || value.includes("your approval")
        ? "bg-amber-50 text-amber-700 ring-amber-600/20 dark:bg-amber-950/50 dark:text-amber-300"
        : "bg-blue-50 text-blue-700 ring-blue-600/20 dark:bg-blue-950/50 dark:text-blue-300";
  return <span className={cn("inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-[11px] font-semibold ring-1 ring-inset", tone)}><span className="h-1.5 w-1.5 rounded-full bg-current opacity-75" />{children}</span>;
}

export function DataToolbar({ placeholder = "Search records..." }: { placeholder?: string }) {
  return <div className="flex flex-wrap items-center justify-between gap-3 border-b px-5 py-3.5">
    <div className="relative min-w-[220px] flex-1 md:max-w-sm"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" /><input className="h-9 w-full rounded-lg border bg-[var(--panel)] pl-9 pr-3 text-sm outline-none transition focus:border-teal-500 focus:ring-2 focus:ring-teal-500/10" placeholder={placeholder} /></div>
    <div className="flex items-center gap-2"><Button variant="secondary"><SlidersHorizontal className="h-4 w-4" /> Filters</Button><Button variant="secondary">This month <ChevronDown className="h-4 w-4" /></Button></div>
  </div>;
}

export function EmptyState({ title, description }: { title: string; description: string }) {
  return <div className="flex min-h-64 flex-col items-center justify-center p-8 text-center"><div className="mb-4 rounded-2xl bg-slate-100 p-4 dark:bg-slate-800"><Search className="h-7 w-7 text-slate-400" /></div><h3 className="font-semibold">{title}</h3><p className="mt-1 max-w-sm text-sm text-[var(--muted)]">{description}</p></div>;
}
