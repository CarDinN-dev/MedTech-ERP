"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { Bell, ChevronDown, Command, HelpCircle, Menu, Moon, Search, Sun, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { commandItems, navGroups } from "@/lib/erp-data";

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [commandOpen, setCommandOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [dark, setDark] = useState(false);
  const [query, setQuery] = useState("");

  useEffect(() => {
    const saved = localStorage.getItem("medtech-theme") === "dark";
    setDark(saved); document.documentElement.classList.toggle("dark", saved);
  }, []);
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") { e.preventDefault(); setCommandOpen(true); }
      if (e.key === "Escape") { setCommandOpen(false); setNotificationsOpen(false); }
    };
    window.addEventListener("keydown", handler); return () => window.removeEventListener("keydown", handler);
  }, []);
  const toggleTheme = () => { const next = !dark; setDark(next); document.documentElement.classList.toggle("dark", next); localStorage.setItem("medtech-theme", next ? "dark" : "light"); };
  const filtered = useMemo(() => commandItems.filter(i => i.label.toLowerCase().includes(query.toLowerCase())), [query]);

  const sidebar = <aside className="flex h-full w-[248px] flex-col bg-[#17232e] text-slate-300">
    <div className="flex h-[72px] items-center gap-3 border-b border-white/10 px-5">
      <div className="grid h-12 w-12 place-items-center overflow-hidden rounded-xl bg-white shadow-lg shadow-teal-950/30"><img src="/brand-mark.svg?v=2" alt="MedTech" className="h-11 w-11 object-contain" /></div>
      <div><div className="text-[15px] font-bold tracking-tight text-white">MedTech <span className="font-medium text-teal-400">ERP</span></div><div className="text-[10px] tracking-[.16em] text-slate-500">CORPORATION TRADING</div></div>
      <button onClick={() => setMobileOpen(false)} className="ml-auto lg:hidden"><X className="h-5 w-5" /></button>
    </div>
    <nav className="flex-1 overflow-y-auto px-3 py-4">
      {navGroups.map(group => <div key={group.label} className="mb-5"><div className="mb-2 px-3 text-[9px] font-bold tracking-[.18em] text-slate-500">{group.label}</div><div className="space-y-0.5">{group.items.map(item => {
        const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
        const Icon = item.icon;
        return <Link onClick={() => setMobileOpen(false)} key={item.href} href={item.href} className={cn("group flex h-10 items-center gap-3 rounded-lg px-3 text-[13px] font-medium transition", active ? "bg-teal-500/15 text-white" : "hover:bg-white/[.05] hover:text-white")}>
          <Icon className={cn("h-[17px] w-[17px]", active ? "text-teal-400" : "text-slate-500 group-hover:text-slate-300")} /><span>{item.label}</span>{item.badge && <span className={cn("ml-auto rounded-full px-2 py-0.5 text-[10px] font-bold", active ? "bg-teal-500 text-white" : "bg-slate-700/80 text-slate-400")}>{item.badge}</span>}
        </Link>;
      })}</div></div>)}
    </nav>
    <div className="border-t border-white/10 p-3"><div className="flex items-center gap-3 rounded-xl bg-white/[.04] p-2.5"><div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-gradient-to-br from-teal-400 to-blue-500 text-xs font-bold text-white">AA</div><div className="min-w-0 flex-1"><div className="truncate text-xs font-semibold text-white">Ahmed Al-Mohannadi</div><div className="truncate text-[10px] text-slate-500">Management</div></div><ChevronDown className="h-4 w-4 text-slate-500" /></div></div>
  </aside>;

  return <div className="min-h-screen bg-[var(--page)]">
    <div className="fixed inset-y-0 left-0 z-40 hidden lg:block">{sidebar}</div>
    {mobileOpen && <div className="fixed inset-0 z-50 lg:hidden"><button aria-label="Close menu" className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm" onClick={() => setMobileOpen(false)} /> <div className="relative h-full w-[248px]">{sidebar}</div></div>}
    <div className="min-w-0 lg:pl-[248px]">
      <header className="sticky top-0 z-30 flex h-[72px] items-center gap-3 border-b bg-[color:var(--panel)]/95 px-4 backdrop-blur md:px-7">
        <button onClick={() => setMobileOpen(true)} className="rounded-lg p-2 hover:bg-slate-100 dark:hover:bg-slate-800 lg:hidden"><Menu className="h-5 w-5" /></button>
        <button onClick={() => setCommandOpen(true)} className="flex h-10 min-w-0 flex-1 items-center gap-2.5 rounded-xl border bg-slate-50 px-3.5 text-left text-sm text-slate-400 transition hover:border-slate-300 dark:bg-slate-900/50 sm:max-w-[460px]"><Search className="h-4 w-4 shrink-0" /><span className="min-w-0 flex-1 truncate">Search anything in MedTech ERP...</span><kbd className="hidden rounded-md border bg-[var(--panel)] px-1.5 py-0.5 text-[10px] font-medium text-slate-400 sm:block">⌘ K</kbd></button>
        <div className="ml-auto flex items-center gap-1">
          <button title="Help" className="rounded-lg p-2.5 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"><HelpCircle className="h-[18px] w-[18px]" /></button>
          <button title="Toggle theme" onClick={toggleTheme} className="rounded-lg p-2.5 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800">{dark ? <Sun className="h-[18px] w-[18px]" /> : <Moon className="h-[18px] w-[18px]" />}</button>
          <div className="relative"><button title="Notifications" onClick={() => setNotificationsOpen(v => !v)} className="relative rounded-lg p-2.5 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"><Bell className="h-[18px] w-[18px]" /><span className="absolute right-2 top-2 h-2 w-2 rounded-full border-2 border-[var(--panel)] bg-coral" /></button>{notificationsOpen && <NotificationPanel />}</div>
          <div className="mx-2 hidden h-7 w-px bg-[var(--line)] sm:block" />
          <button className="hidden items-center gap-2 sm:flex"><div className="grid h-8 w-8 place-items-center rounded-full bg-gradient-to-br from-teal-500 to-blue-600 text-[10px] font-bold text-white">AA</div><ChevronDown className="h-4 w-4 text-slate-400" /></button>
        </div>
      </header>
      <main>{children}</main>
    </div>
    {commandOpen && <div className="fixed inset-0 z-[70] flex items-start justify-center bg-slate-950/45 px-4 pt-[12vh] backdrop-blur-sm" onMouseDown={() => setCommandOpen(false)}><div onMouseDown={e => e.stopPropagation()} className="w-full max-w-xl overflow-hidden rounded-2xl border bg-[var(--panel)] shadow-2xl animate-in"><div className="flex h-14 items-center gap-3 border-b px-4"><Search className="h-5 w-5 text-slate-400" /><input autoFocus value={query} onChange={e => setQuery(e.target.value)} className="h-full flex-1 bg-transparent text-[15px] outline-none" placeholder="Search modules, records and actions..." /><kbd className="rounded-md border px-1.5 py-1 text-[10px] text-slate-400">ESC</kbd></div><div className="max-h-[380px] overflow-y-auto p-2"><div className="px-2 py-2 text-[10px] font-bold tracking-wider text-slate-400">NAVIGATE</div>{filtered.map(item => { const Icon = item.icon; return <button key={item.href} onClick={() => { router.push(item.href); setCommandOpen(false); setQuery(""); }} className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left hover:bg-slate-100 dark:hover:bg-slate-800"><span className="rounded-lg border bg-slate-50 p-2 dark:bg-slate-900"><Icon className="h-4 w-4 text-teal-600" /></span><span className="font-medium">{item.label}</span><span className="ml-auto text-xs text-slate-400">Open</span></button>})}</div><div className="flex items-center gap-4 border-t bg-slate-50 px-4 py-2.5 text-[10px] text-slate-400 dark:bg-slate-900/50"><span>↑↓ navigate</span><span>↵ open</span><span className="ml-auto flex items-center gap-1"><Command className="h-3 w-3" /> Command palette</span></div></div></div>}
  </div>;
}

function NotificationPanel() {
  return <div className="absolute right-0 top-12 w-[340px] overflow-hidden rounded-2xl border bg-[var(--panel)] shadow-panel animate-in"><div className="flex items-center justify-between border-b px-4 py-3.5"><div><div className="font-semibold">Notifications</div><div className="text-[11px] text-slate-400">3 require your attention</div></div><button className="text-xs font-semibold text-teal-600">Mark all read</button></div><div className="divide-y">{[
    ["Quotation approval required", "QTN-2026-0314 · QAR 286,000", "2m"], ["Stock below minimum", "Troponin I Reagent Kit · 34 left", "18m"], ["Shipment delayed", "SHP-2026-0177 · Customs hold", "1h"]
  ].map(([title, note, time]) => <button key={title} className="flex w-full gap-3 px-4 py-3 text-left hover:bg-slate-50 dark:hover:bg-slate-800"><span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-coral" /><span className="min-w-0 flex-1"><span className="block text-xs font-semibold">{title}</span><span className="mt-0.5 block truncate text-[11px] text-[var(--muted)]">{note}</span></span><span className="text-[10px] text-slate-400">{time}</span></button>)}</div><button className="w-full border-t py-3 text-xs font-semibold text-teal-600">View all notifications</button></div>;
}
