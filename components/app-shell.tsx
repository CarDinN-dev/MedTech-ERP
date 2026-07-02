"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { Bell, ChevronDown, Command, FlaskConical, HelpCircle, LogOut, Menu, Moon, RotateCcw, Search, Sun, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { commandItems, navGroups } from "@/lib/erp-data";
import { resetAllDemoData } from "@/lib/demo-store";
import { clearDemoSession, getDemoSession, type DemoSession } from "@/lib/demo-auth";
import { appendAuditLog } from "@/lib/audit-store";
import { permissionError } from "@/lib/erp-security";
import { alertLink, readLocalAlerts, type AlertRecord } from "@/lib/local-alerts";

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [commandOpen, setCommandOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [notificationsRead, setNotificationsRead] = useState(false);
  const [shellToast, setShellToast] = useState("");
  const [dark, setDark] = useState(false);
  const [query, setQuery] = useState("");
  const [session, setSession] = useState<DemoSession | null>(null);
  const [sessionReady, setSessionReady] = useState(false);
  const [alerts, setAlerts] = useState<AlertRecord[]>([]);

  useEffect(() => {
    const saved = localStorage.getItem("medtech-theme") !== "light";
    setDark(saved); document.documentElement.classList.toggle("dark", saved);
    const demoSession = getDemoSession();
    if (!demoSession) {
      clearDemoSession();
      router.replace(`/login?next=${encodeURIComponent(pathname || "/")}`);
    }
    setSession(demoSession);
    setSessionReady(true);
  }, [pathname, router]);
  useEffect(() => {
    const refreshAlerts = () => setAlerts(readLocalAlerts().filter(row => row.Status !== "Resolved"));
    refreshAlerts();
    window.addEventListener("storage", refreshAlerts);
    window.addEventListener("medtech:alerts", refreshAlerts);
    window.addEventListener("medtech:approvals", refreshAlerts);
    return () => { window.removeEventListener("storage", refreshAlerts); window.removeEventListener("medtech:alerts", refreshAlerts); window.removeEventListener("medtech:approvals", refreshAlerts); };
  }, []);
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") { e.preventDefault(); setCommandOpen(true); }
      if (e.key === "Escape") { setCommandOpen(false); setNotificationsOpen(false); setProfileOpen(false); setMobileOpen(false); }
    };
    window.addEventListener("keydown", handler); return () => window.removeEventListener("keydown", handler);
  }, []);
  const toggleTheme = () => { const next = !dark; setDark(next); document.documentElement.classList.toggle("dark", next); localStorage.setItem("medtech-theme", next ? "dark" : "light"); };
  const notify = (message: string) => { setShellToast(message); window.setTimeout(() => setShellToast(""), 2600); };
  const currentUser = session;
  const logout = () => { if (!currentUser) return; appendAuditLog({ action: "LOGOUT", module: "Authentication", record: currentUser.email, details: "User signed out of the client demo" }); clearDemoSession(); router.replace("/login"); router.refresh(); };
  const resetDemo = () => { if (!currentUser) return; const error = permissionError(currentUser, "Admin", "reset demo data"); if (error) { appendAuditLog({ action: "PERMISSION DENIED", module: "Administration", record: "Local demo reset", details: error, result: "failure", severity: "high" }); notify(error); return; } if (!window.confirm("Reset all local demo data in this browser?")) return; appendAuditLog({ action: "RESET ALL DEMO DATA", module: "Administration", record: "Local demo", details: "All local demo data reset by authorized role", severity: "critical" }); resetAllDemoData(); };
  const filtered = useMemo(() => commandItems.filter(i => i.label.toLowerCase().includes(query.toLowerCase())), [query]);
  const commandGroups = useMemo(() => navGroups.map(group => ({ ...group, items: group.items.filter(item => filtered.includes(item)) })).filter(group => group.items.length), [filtered]);
  const currentNav = useMemo(() => {
    for (const group of navGroups) {
      const item = group.items.find(row => row.href === "/" ? pathname === "/" : pathname.startsWith(row.href));
      if (item) return { group: group.label, item };
    }
    return { group: "Overview", item: navGroups[0].items[0] };
  }, [pathname]);
  const alertCount = alerts.length;
  if (!sessionReady || !currentUser) return <div className="min-h-screen bg-[var(--page)]" />;

  const sidebar = <aside className="flex h-full w-[264px] flex-col border-r border-[var(--sidebar-border)] bg-[var(--sidebar)] text-[var(--sidebar-text)] shadow-panel">
    <div className="flex h-[76px] items-center gap-3 border-b border-[var(--sidebar-border)] px-5">
      <div className="grid h-12 w-12 place-items-center overflow-hidden"><Image src="/brand-mark.svg" alt="MedTech" width={44} height={44} priority className="object-contain" style={{ width: 44, height: 44 }} /></div>
      <div className="min-w-0"><div className="text-[15px] font-bold tracking-tight text-[var(--text)]">MedTech <span className="font-medium text-medtech-red">ERP</span></div><div className="truncate text-[10px] tracking-[.16em] text-[var(--sidebar-muted)]">CORPORATION TRADING</div></div>
      <button type="button" aria-label="Close menu" onClick={() => setMobileOpen(false)} className="ml-auto rounded-lg p-2 text-[var(--sidebar-muted)] hover:bg-[var(--sidebar-hover)] hover:text-[var(--text)] focus-visible:outline-none focus-visible:shadow-focus lg:hidden"><X className="h-5 w-5" /></button>
    </div>
    <nav className="flex-1 overflow-y-auto px-3 py-5">
      {navGroups.map(group => <div key={group.label} className="mb-5"><div className="mb-2 px-3 text-[10px] font-bold uppercase tracking-[.18em] text-[var(--sidebar-heading)]">{group.label}</div><div className="space-y-1">{group.items.map(item => {
        const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
        const Icon = item.icon;
        return <Link onClick={() => setMobileOpen(false)} key={item.href} href={item.href} className={cn("group relative flex h-10 items-center gap-3 rounded-lg px-3 text-[13px] font-medium transition", active ? "bg-[var(--sidebar-active)] text-[var(--sidebar-active-text)] shadow-soft" : "text-[var(--sidebar-text)] hover:bg-[var(--sidebar-hover)] hover:text-[var(--sidebar-active-text)]")}>
          <span className={cn("absolute left-0 top-2 h-6 w-1 rounded-r-full transition", active ? "bg-[var(--brand-red)]" : "bg-transparent")} />
          <Icon className={cn("h-[17px] w-[17px] shrink-0", active ? "text-medtech-red" : "text-[var(--sidebar-muted)] group-hover:text-[var(--sidebar-active-text)]")} /><span className="truncate">{item.label}</span>{item.badge && <span className="ml-auto rounded-full bg-[var(--nav-badge-bg)] px-2 py-0.5 text-[10px] font-bold text-[var(--nav-badge-text)]">{item.badge}</span>}
        </Link>;
      })}</div></div>)}
    </nav>
    <div className="border-t border-[var(--sidebar-border)] p-3"><div className="flex items-center gap-3 rounded-xl bg-[var(--sidebar-hover)] p-2.5 ring-1 ring-[var(--line-soft)]"><div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[var(--brand-red)] text-xs font-bold text-white shadow-[0_8px_20px_rgb(237_30_54/.25)]">{currentUser.initials}</div><div className="min-w-0 flex-1"><div className="truncate text-xs font-semibold text-[var(--text)]">{currentUser.name}</div><div className="truncate text-[10px] text-[var(--sidebar-muted)]">{currentUser.role}</div></div><ChevronDown className="h-4 w-4 text-[var(--sidebar-muted)]" /></div></div>
  </aside>;

  return <div className="min-h-screen bg-[var(--page)]">
    <div className="fixed inset-y-0 left-0 z-40 hidden lg:block">{sidebar}</div>
    {mobileOpen && <div className="fixed inset-0 z-50 lg:hidden"><button aria-label="Close menu" className="absolute inset-0 bg-[var(--overlay-bg)] backdrop-blur-sm" onClick={() => setMobileOpen(false)} /> <div className="relative h-full w-[264px]">{sidebar}</div></div>}
    <div className="min-w-0 overflow-x-hidden lg:pl-[264px]">
      <header className="sticky top-0 z-30 flex h-[76px] items-center gap-3 border-b border-[var(--line-soft)] bg-[var(--header)] px-4 shadow-panel backdrop-blur md:px-7">
        <button type="button" aria-label="Open menu" onClick={() => setMobileOpen(true)} className="rounded-lg p-2 text-[var(--muted)] hover:bg-[var(--elevated)] hover:text-[var(--text)] focus-visible:outline-none focus-visible:shadow-focus lg:hidden"><Menu className="h-5 w-5" /></button>
        <div className="hidden min-w-0 md:block">
          <div className="text-[11px] font-semibold uppercase tracking-[.14em] text-[var(--muted)]">{currentNav.group}</div>
          <div className="truncate text-sm font-bold text-[var(--text)]">{currentNav.item.label}</div>
        </div>
        <button type="button" onClick={() => setCommandOpen(true)} className="flex h-10 min-w-0 flex-1 items-center gap-2.5 rounded-lg border border-[var(--line-soft)] bg-[var(--elevated)] px-3.5 text-left text-sm text-[var(--muted)] shadow-soft transition hover:border-medtech-navy focus-visible:border-medtech-navy focus-visible:outline-none focus-visible:shadow-focus dark:hover:border-medtech-red dark:focus-visible:border-medtech-red md:ml-4 sm:max-w-[440px]"><Search className="h-4 w-4 shrink-0" /><span className="min-w-0 flex-1 truncate">Search modules, records, actions...</span><kbd className="hidden rounded-md border border-[var(--line-soft)] bg-[var(--header)] px-1.5 py-0.5 text-[10px] font-medium text-[var(--text-secondary)] sm:block">Ctrl K</kbd></button>
        <div className="ml-auto flex items-center gap-1">
          <button type="button" aria-label="Help" title="Help" onClick={() => notify("Use the sidebar or press Ctrl+K to navigate the ERP")} className="rounded-lg p-2.5 text-[var(--muted)] hover:bg-[var(--elevated)] hover:text-medtech-navy focus-visible:outline-none focus-visible:shadow-focus dark:hover:text-[var(--text)]"><HelpCircle className="h-[18px] w-[18px]" /></button>
          <button type="button" aria-label="Toggle theme" title="Toggle theme" onClick={toggleTheme} className="rounded-lg p-2.5 text-[var(--muted)] hover:bg-[var(--elevated)] hover:text-medtech-navy focus-visible:outline-none focus-visible:shadow-focus dark:hover:text-[var(--text)]">{dark ? <Sun className="h-[18px] w-[18px]" /> : <Moon className="h-[18px] w-[18px]" />}</button>
          <div className="relative"><button type="button" aria-label="Notifications" title="Notifications" onClick={() => setNotificationsOpen(v => !v)} className="relative rounded-lg p-2.5 text-[var(--muted)] hover:bg-[var(--elevated)] hover:text-medtech-navy focus-visible:outline-none focus-visible:shadow-focus dark:hover:text-[var(--text)]"><Bell className="h-[18px] w-[18px]" />{alertCount > 0 && <span className="absolute -right-1 -top-1 grid h-4 min-w-4 place-items-center rounded-full bg-[var(--brand-red)] px-1 text-[9px] font-bold text-white ring-2 ring-[var(--panel)]">{Math.min(alertCount, 99)}</span>}</button>{notificationsOpen && <NotificationPanel alerts={alerts} read={notificationsRead} onMarkAll={() => { setNotificationsRead(true); setNotificationsOpen(false); notify("All notifications marked as read"); }} onOpen={(alert) => { setNotificationsOpen(false); router.push(alertLink(alert)); }} onViewAll={() => { setNotificationsOpen(false); router.push("/alerts"); }} />}</div>
          <div className="mx-2 hidden h-7 w-px bg-[var(--line)] sm:block" />
          <span className="hidden items-center gap-1.5 rounded-full border border-medtech-red/25 bg-[var(--red-tint)] px-2.5 py-1 text-[10px] font-bold text-medtech-red md:flex"><FlaskConical className="h-3.5 w-3.5 text-medtech-red" /> CLIENT DEMO</span>
          <div className="relative"><button type="button" aria-label="Open user menu" onClick={() => setProfileOpen(value => !value)} className="flex items-center gap-1 rounded-lg p-1 transition hover:bg-[var(--elevated)] focus-visible:outline-none focus-visible:shadow-focus sm:gap-2"><div className="grid h-8 w-8 place-items-center rounded-full bg-[var(--brand-red)] text-[10px] font-bold text-white shadow-[0_8px_20px_rgb(237_30_54/.25)]">{currentUser.initials}</div><ChevronDown className="hidden h-4 w-4 text-[var(--muted)] sm:block" /></button>{profileOpen && <div className="absolute right-0 top-12 w-64 overflow-hidden rounded-xl border border-[var(--line-soft)] bg-[var(--panel)] text-[var(--text)] shadow-panel animate-in"><div className="border-b border-[var(--line-soft)] p-3"><div className="text-xs font-semibold">{currentUser.name}</div><div className="mt-0.5 truncate text-[10px] text-[var(--muted)]">{currentUser.email}</div><div className="mt-1 text-[10px] font-medium text-medtech-red">{currentUser.role} · {currentUser.department}</div></div><button type="button" onClick={resetDemo} className="flex w-full items-center gap-2.5 px-3 py-2.5 text-left text-xs hover:bg-[var(--elevated)] focus-visible:outline-none focus-visible:shadow-focus"><RotateCcw className="h-4 w-4 text-medtech-red" /> Reset all demo data</button><button type="button" onClick={logout} className="flex w-full items-center gap-2.5 px-3 py-2.5 text-left text-xs text-[var(--badge-danger-text)] hover:bg-[var(--badge-danger-bg)] focus-visible:outline-none focus-visible:shadow-focus"><LogOut className="h-4 w-4" /> Sign out</button></div>}</div>
        </div>
      </header>
      <main className="min-w-0 overflow-x-hidden bg-[var(--main-bg)]/55">{children}</main>
    </div>
    {commandOpen && <div className="fixed inset-0 z-[70] flex items-start justify-center bg-[var(--overlay-bg)] px-4 pt-[12vh] backdrop-blur-sm" onMouseDown={() => setCommandOpen(false)}><div onMouseDown={e => e.stopPropagation()} className="w-full max-w-xl overflow-hidden rounded-2xl border border-[var(--line-soft)] bg-[var(--panel)] shadow-2xl animate-in"><div className="flex h-14 items-center gap-3 border-b border-[var(--line-soft)] px-4"><Search className="h-5 w-5 text-medtech-navy" /><input autoFocus value={query} onChange={e => setQuery(e.target.value)} className="h-full flex-1 bg-transparent text-[15px] outline-none placeholder:text-[var(--muted-soft)]" placeholder="Search modules, records and actions..." /><kbd className="rounded-md border border-[var(--line-soft)] px-1.5 py-1 text-[10px] text-[var(--muted)]">ESC</kbd></div><div className="max-h-[390px] overflow-y-auto p-2">{commandGroups.map(group => <div key={group.label}><div className="px-2 py-2 text-[10px] font-bold uppercase tracking-wider text-[var(--muted)]">{group.label}</div>{group.items.map(item => { const Icon = item.icon; return <button key={item.href} onClick={() => { router.push(item.href); setCommandOpen(false); setQuery(""); }} className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left hover:bg-[var(--elevated)]"><span className="rounded-lg border border-[var(--line-soft)] bg-[var(--navy-tint)] p-2"><Icon className="h-4 w-4 text-medtech-navy dark:text-medtech-red" /></span><span className="font-medium">{item.label}</span><span className="ml-auto text-xs text-[var(--muted)]">Open</span></button>})}</div>)}</div><div className="flex items-center gap-4 border-t border-[var(--line-soft)] bg-[var(--elevated)] px-4 py-2.5 text-[10px] text-[var(--muted)]"><span>Type to filter</span><span>Enter opens selected result</span><span className="ml-auto flex items-center gap-1"><Command className="h-3 w-3" /> Command palette</span></div></div></div>}
    {shellToast && <div role="status" className="fixed bottom-5 right-5 z-[100] rounded-xl border border-[var(--line-soft)] bg-[var(--panel)] px-4 py-3 text-xs font-medium text-[var(--text)] shadow-panel animate-in">{shellToast}</div>}
  </div>;
}

function NotificationPanel({ alerts, read, onMarkAll, onOpen, onViewAll }: { alerts: AlertRecord[]; read: boolean; onMarkAll: () => void; onOpen: (alert: AlertRecord) => void; onViewAll: () => void }) {
  const visible = alerts.slice(0, 4);
  return <div className="absolute right-0 top-12 w-[calc(100vw-2rem)] max-w-[340px] overflow-hidden rounded-2xl border border-[var(--line-soft)] bg-[var(--panel)] shadow-panel animate-in"><div className="flex items-center justify-between border-b border-[var(--line-soft)] bg-[var(--elevated)]/45 px-4 py-3.5"><div><div className="font-semibold">Notifications</div><div className="text-[11px] text-[var(--muted)]">{alerts.length ? `${alerts.length} local alerts require attention` : "You are all caught up"}</div></div><button type="button" onClick={onMarkAll} disabled={read || !alerts.length} className="text-xs font-semibold text-medtech-red focus-visible:outline-none focus-visible:shadow-focus disabled:text-[var(--muted)]">Mark all read</button></div><div className="divide-y divide-[var(--line-soft)]">{visible.length ? visible.map(alert => <button key={alert["Alert No"]} type="button" onClick={() => onOpen(alert)} className="flex w-full gap-3 px-4 py-3 text-left hover:bg-[var(--elevated)] focus-visible:outline-none focus-visible:shadow-focus"><span className={cn("mt-1.5 h-2 w-2 shrink-0 rounded-full", read ? "bg-[var(--muted)]" : "bg-[var(--brand-red)]")} /><span className="min-w-0 flex-1"><span className="block truncate text-xs font-semibold">{alert["Alert Type"]}</span><span className="mt-0.5 block truncate text-[11px] text-[var(--muted)]">{alert["Source Record"]} - {alert.Message}</span></span><span className="text-[10px] font-semibold text-[var(--muted)]">{alert.Priority}</span></button>) : <div className="px-4 py-8 text-center text-xs text-[var(--muted)]">No active local alerts.</div>}</div><button type="button" onClick={onViewAll} className="w-full border-t border-[var(--line-soft)] py-3 text-xs font-semibold text-medtech-red hover:bg-[var(--elevated)] focus-visible:outline-none focus-visible:shadow-focus">View all notifications</button></div>;
}

