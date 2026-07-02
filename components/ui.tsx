"use client";

import { useEffect, useRef, useState, type ButtonHTMLAttributes, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { statusTone } from "@/lib/local-erp-foundation";
import { AlertTriangle, CheckCircle2, ChevronDown, Loader2, MoreHorizontal, Search, SlidersHorizontal, XCircle } from "lucide-react";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost" | "danger";
  size?: "sm" | "md";
};

export function Button({ children, variant = "primary", size = "md", className, ...props }: ButtonProps) {
  const variants = {
    primary: "bg-[var(--brand-red)] text-white shadow-[0_10px_24px_rgb(237_30_54/.22)] hover:bg-[var(--brand-red-hover)]",
    secondary: "border border-[var(--line-soft)] bg-[var(--panel)] text-[var(--text-secondary)] shadow-soft hover:border-medtech-navy/45 hover:bg-[var(--elevated)] hover:text-[var(--text)]",
    ghost: "text-[var(--muted)] hover:bg-[var(--elevated)] hover:text-[var(--text)]",
    danger: "bg-[var(--brand-red)] text-white shadow-[0_10px_24px_rgb(237_30_54/.22)] hover:bg-[var(--brand-red-hover)]"
  };
  const sizes = { sm: "h-8 px-2.5 text-xs", md: "h-9 px-3.5 text-sm" };
  return <button className={cn("inline-flex items-center justify-center gap-2 rounded-lg font-semibold transition focus-visible:outline-none focus-visible:shadow-focus disabled:pointer-events-none disabled:opacity-50", sizes[size], variants[variant], className)} {...props}>{children}</button>;
}

export function PageHeader({ title, description, eyebrow, icon, actions, className }: { title: string; description?: string; eyebrow?: string; icon?: ReactNode; actions?: ReactNode; className?: string }) {
  return <div className={cn("mb-6 flex flex-col justify-between gap-4 lg:flex-row lg:items-end", className)}>
    <div className="flex min-w-0 items-start gap-3.5">
      {icon && <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl border border-[var(--line-soft)] bg-[var(--navy-tint)] text-medtech-navy shadow-soft">{icon}</div>}
      <div className="min-w-0">
        {eyebrow && <div className="mb-1 text-[10px] font-bold uppercase tracking-[.14em] text-medtech-red">{eyebrow}</div>}
        <h1 className="text-2xl font-bold tracking-tight text-[var(--text)] md:text-[28px]">{title}</h1>
        {description && <p className="mt-1 max-w-3xl text-[13px] text-[var(--muted)]">{description}</p>}
      </div>
    </div>
    {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
  </div>;
}

export function SectionHeader({ title, description, actions, className }: { title: string; description?: string; actions?: ReactNode; className?: string }) {
  return <div className={cn("flex items-start justify-between gap-3 border-b px-5 py-4", className)}>
    <div><h2 className="text-sm font-bold text-[var(--text)]">{title}</h2>{description && <p className="mt-1 text-[11px] text-[var(--muted)]">{description}</p>}</div>
    {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
  </div>;
}

export function StatCard({ label, value, note, icon, tone = "navy" }: { label: string; value: ReactNode; note?: ReactNode; icon?: ReactNode; tone?: "navy" | "red" | "purple" | "success" | "warning" | "danger" }) {
  const tones = {
    navy: "bg-[var(--navy-tint)] text-medtech-navy",
    red: "bg-[var(--red-tint)] text-medtech-red",
    purple: "bg-medtech-purple/15 text-medtech-purple",
    success: "bg-[var(--badge-success-bg)] text-[var(--badge-success-text)] ring-1 ring-[var(--badge-success-ring)]",
    warning: "bg-[var(--badge-warning-bg)] text-[var(--badge-warning-text)] ring-1 ring-[var(--badge-warning-ring)]",
    danger: "bg-[var(--badge-danger-bg)] text-[var(--badge-danger-text)] ring-1 ring-[var(--badge-danger-ring)]"
  };
  return <div className="rounded-2xl border border-[var(--line-soft)] bg-[var(--panel)] p-5 shadow-soft dark:bg-gradient-to-br dark:from-[var(--panel-start)] dark:to-[var(--panel-end)]">
    <div className="flex items-start justify-between gap-3"><div className="text-xs font-medium text-[var(--muted)]">{label}</div>{icon && <div className={cn("rounded-xl p-2.5", tones[tone])}>{icon}</div>}</div>
    <div className="mt-3 text-2xl font-bold tracking-tight">{value}</div>
    {note && <div className="mt-2 text-[11px] font-medium text-[var(--muted)]">{note}</div>}
  </div>;
}

export function DataCard({ children, className }: { children: ReactNode; className?: string }) {
  return <section className={cn("overflow-hidden rounded-2xl border border-[var(--line-soft)] bg-[var(--panel)] shadow-soft dark:bg-gradient-to-br dark:from-[var(--panel-start)] dark:to-[var(--panel-end)]", className)}>{children}</section>;
}

export function FormSection({ title, description, children, className }: { title: string; description?: string; children: ReactNode; className?: string }) {
  return <section className={cn("rounded-2xl border border-[var(--line-soft)] bg-[var(--panel)] p-5 shadow-soft dark:bg-gradient-to-br dark:from-[var(--panel-start)] dark:to-[var(--panel-end)]", className)}>
    <div className="mb-4"><h2 className="text-sm font-bold text-medtech-navy dark:text-[var(--text)]">{title}</h2>{description && <p className="mt-1 text-[11px] text-[var(--muted)]">{description}</p>}</div>
    <div className="grid gap-4 sm:grid-cols-2">{children}</div>
  </section>;
}

export function TableToolbar({ placeholder = "Search records...", children }: { placeholder?: string; children?: ReactNode }) {
  return <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--line-soft)] bg-[var(--panel)]/80 px-5 py-3.5">
    <div className="relative min-w-[220px] flex-1 md:max-w-sm"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--muted)]" /><input className="h-9 w-full rounded-lg border border-[var(--input-border)] bg-[var(--input-bg)] pl-9 pr-3 text-sm text-[var(--text)] outline-none transition placeholder:text-[var(--muted-soft)] focus:border-medtech-navy focus:ring-2 focus:ring-[var(--focus-ring)] dark:focus:border-medtech-red" placeholder={placeholder} /></div>
    <div className="flex flex-wrap items-center gap-2">{children ?? <><Button variant="secondary"><SlidersHorizontal className="h-4 w-4" /> Filters</Button><Button variant="secondary">This month <ChevronDown className="h-4 w-4" /></Button></>}</div>
  </div>;
}

export const DataToolbar = TableToolbar;

export function StatusBadge({ children, tone }: { children: ReactNode; tone?: "success" | "warning" | "danger" | "info" | "neutral" }) {
  const value = String(children).toLowerCase();
  const palette = {
    success: "bg-[var(--badge-success-bg)] text-[var(--badge-success-text)] ring-[var(--badge-success-ring)]",
    warning: "bg-[var(--badge-warning-bg)] text-[var(--badge-warning-text)] ring-[var(--badge-warning-ring)]",
    danger: "bg-[var(--badge-danger-bg)] text-[var(--badge-danger-text)] ring-[var(--badge-danger-ring)]",
    info: "bg-[var(--badge-info-bg)] text-[var(--badge-info-text)] ring-[var(--badge-info-ring)]",
    neutral: "bg-[var(--badge-neutral-bg)] text-[var(--badge-neutral-text)] ring-[var(--badge-neutral-ring)]"
  };
  const resolvedTone = tone ?? statusTone(value);
  return <span className={cn("inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-[11px] font-semibold ring-1 ring-inset", palette[resolvedTone])}><span className="h-1.5 w-1.5 rounded-full bg-current opacity-75" />{children}</span>;
}

export function EmptyState({ title, description, icon }: { title: string; description: string; icon?: ReactNode }) {
  return <div className="flex min-h-64 flex-col items-center justify-center p-8 text-center"><div className="mb-4 rounded-2xl border border-[var(--line-soft)] bg-[var(--elevated)] p-4 text-[var(--muted)]">{icon ?? <Search className="h-7 w-7" />}</div><h3 className="font-semibold">{title}</h3><p className="mt-1 max-w-sm text-sm text-[var(--muted)]">{description}</p></div>;
}

export function LoadingState({ label = "Loading..." }: { label?: string }) {
  return <div className="flex min-h-48 items-center justify-center gap-2 text-sm font-medium text-[var(--muted)]"><Loader2 className="h-4 w-4 animate-spin text-medtech-red" />{label}</div>;
}

export function ErrorState({ title = "Something went wrong", description, action }: { title?: string; description?: string; action?: ReactNode }) {
  return <div role="alert" className="rounded-2xl border border-[var(--badge-danger-ring)] bg-[var(--badge-danger-bg)] p-5 text-[var(--badge-danger-text)] shadow-soft"><div className="flex gap-3"><XCircle className="mt-0.5 h-5 w-5 shrink-0" /><div><h3 className="font-semibold">{title}</h3>{description && <p className="mt-1 text-sm opacity-85">{description}</p>}{action && <div className="mt-4">{action}</div>}</div></div></div>;
}

export function ConfirmDialog({ open, title, description, confirmLabel = "Confirm", cancelLabel = "Cancel", tone = "danger", onConfirm, onCancel }: { open: boolean; title: string; description?: string; confirmLabel?: string; cancelLabel?: string; tone?: "danger" | "primary"; onConfirm: () => void; onCancel: () => void }) {
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onCancel();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onCancel]);

  if (!open) return null;
  return <div className="fixed inset-0 z-[90] flex items-center justify-center bg-[var(--overlay-bg)] px-4 backdrop-blur-sm" role="presentation" onMouseDown={onCancel}>
    <div role="dialog" aria-modal="true" aria-label={title} onMouseDown={event => event.stopPropagation()} className="w-full max-w-md overflow-hidden rounded-2xl border border-[var(--line-soft)] bg-[var(--panel)] shadow-2xl animate-in">
      <div className="flex gap-3 p-5"><div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[var(--red-tint)] text-medtech-red"><AlertTriangle className="h-5 w-5" /></div><div><h2 className="font-bold">{title}</h2>{description && <p className="mt-1 text-sm text-[var(--muted)]">{description}</p>}</div></div>
      <div className="flex justify-end gap-2 border-t border-[var(--line-soft)] bg-[var(--elevated)] px-5 py-4"><Button variant="secondary" onClick={onCancel}>{cancelLabel}</Button><Button variant={tone === "danger" ? "danger" : "primary"} onClick={onConfirm}>{confirmLabel}</Button></div>
    </div>
  </div>;
}

export function ActionMenu({ actions, label = "Actions" }: { label?: string; actions: { label: string; icon?: ReactNode; disabled?: boolean; danger?: boolean; onClick: () => void }[] }) {
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    const onPointerDown = (event: PointerEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) setOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("pointerdown", onPointerDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("pointerdown", onPointerDown);
    };
  }, [open]);

  return <div ref={menuRef} className="relative">
    <button type="button" aria-label={label} aria-haspopup="menu" aria-expanded={open} onClick={() => setOpen(value => !value)} className="inline-grid h-9 w-9 place-items-center rounded-lg border border-[var(--line-soft)] bg-[var(--panel)] text-[var(--muted)] transition hover:bg-[var(--elevated)] hover:text-medtech-navy focus-visible:outline-none focus-visible:shadow-focus dark:hover:text-[var(--text)]"><MoreHorizontal className="h-4 w-4" /></button>
    {open && <div role="menu" className="absolute right-0 top-11 z-20 min-w-44 overflow-hidden rounded-xl border border-[var(--line-soft)] bg-[var(--panel)] p-1 text-[var(--text)] shadow-panel animate-in">{actions.map(action => <button key={action.label} type="button" role="menuitem" disabled={action.disabled} onClick={() => { action.onClick(); setOpen(false); }} className={cn("flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs font-semibold hover:bg-[var(--elevated)] focus-visible:outline-none focus-visible:shadow-focus disabled:opacity-50", action.danger && "text-[var(--badge-danger-text)] hover:bg-[var(--badge-danger-bg)]")}>{action.icon ?? <CheckCircle2 className="h-3.5 w-3.5" />}{action.label}</button>)}</div>}
  </div>;
}
