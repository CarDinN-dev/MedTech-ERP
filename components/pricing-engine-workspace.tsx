"use client";

import { useEffect, useMemo, useState } from "react";
import { BadgeCheck, RefreshCcw, Search } from "lucide-react";
import { appendAuditLog } from "@/lib/audit-store";
import { getDemoSession, PRESENTATION_USER_NAME } from "@/lib/demo-auth";
import {
  PRICING_STORAGE_KEY,
  readPricingState,
  resolvePricing,
  seedPricingState,
  submitPricingApproval,
  writePricingState,
  type PricingState
} from "@/lib/pricing-engine";
import { Button, StatusBadge } from "@/components/ui";
import { cn } from "@/lib/utils";

const tabs = ["Pricelists", "Customer Contract Pricing", "BU/Product Category Margin Rules", "Discount Rules", "Special Tender Pricing", "Price Approval Exceptions"] as const;
type Tab = typeof tabs[number];

export function PricingEngineWorkspace() {
  const [state, setState] = useState<PricingState>(seedPricingState);
  const [activeTab, setActiveTab] = useState<Tab>("Pricelists");
  const [query, setQuery] = useState("");
  const [toast, setToast] = useState("");
  const rows = useMemo(() => rowsFor(activeTab, state).filter(row => !query || Object.values(row).join(" ").toLowerCase().includes(query.toLowerCase())), [activeTab, query, state]);
  const columns = columnsFor(activeTab);
  const checks = useMemo(() => [
    resolvePricing({ sku: "DX-TRP-100", customer: "Hamad General Hospital - Laboratory", businessUnit: "Diagnostics", category: "Reagents", discountPercent: 12 }, state),
    resolvePricing({ sku: "CS-NGL-M", customer: "Ministry of Public Health", businessUnit: "Pharma", category: "Consumables", pathway: "Pharma Tender", discountPercent: 6 }, state)
  ], [state]);

  useEffect(() => { setState(readPricingState()); }, []);
  useEffect(() => {
    const refresh = () => setState(readPricingState());
    window.addEventListener("medtech:pricing", refresh);
    window.addEventListener("storage", refresh);
    return () => { window.removeEventListener("medtech:pricing", refresh); window.removeEventListener("storage", refresh); };
  }, []);

  const notify = (message: string) => { setToast(message); window.setTimeout(() => setToast(""), 2400); };
  const persist = (next: PricingState, action: string, details: string) => {
    setState(next);
    writePricingState(next);
    appendAuditLog({ action, module: "Pricing Engine", record: activeTab, details });
    notify(details);
  };
  const reset = () => {
    localStorage.removeItem(PRICING_STORAGE_KEY);
    const next = seedPricingState();
    setState(next);
    appendAuditLog({ action: "RESET", module: "Pricing Engine", record: "Pricing Engine", details: "Pricing demo data reset" });
    notify("Pricing demo data reset");
  };
  const approveSpecial = () => persist({ ...state, specialTenderPrices: state.specialTenderPrices.map(item => item["Approval Status"] === "Pending" ? { ...item, Status: "Approved", "Approval Status": "Approved" } : item) }, "APPROVE SPECIAL PRICE", "Pending special prices approved locally");
  const submitExceptions = () => {
    const requestedBy = getDemoSession()?.name || PRESENTATION_USER_NAME;
    const next = { ...state, exceptions: state.exceptions.map(item => {
      if (item["Approval Request No"]) return item;
      const result = submitPricingApproval(item.Source, item.Customer, item.SKU, item.Reason, requestedBy);
      return { ...item, "Approval Request No": result.request?.["Approval Request No"] || "", Status: "Pending approval" as const };
    }) };
    persist(next, "SUBMIT EXCEPTIONS", "Pricing exceptions routed to Approval Matrix");
  };

  return <div className="overflow-hidden bg-[var(--panel)]">
    <div className="flex flex-wrap items-center gap-2 border-b px-5 py-3">
      {tabs.map(tab => <button key={tab} onClick={() => setActiveTab(tab)} className={cn("h-9 whitespace-nowrap rounded-lg border px-3 text-xs font-bold", activeTab === tab ? "border-medtech-red bg-[var(--navy-tint)] text-medtech-navy dark:bg-[var(--elevated)] dark:text-red-100" : "bg-[var(--panel)] text-[var(--muted)] hover:bg-slate-50 dark:hover:bg-slate-800")}>{tab}</button>)}
    </div>
    <div className="flex flex-wrap items-center gap-3 border-b px-5 py-3.5">
      <div className="relative min-w-[220px] flex-1 md:max-w-sm"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" /><input value={query} onChange={event => setQuery(event.target.value)} className="h-9 w-full rounded-lg border bg-[var(--panel)] pl-9 pr-3 text-sm outline-none focus:border-medtech-red" placeholder="Search pricing..." /></div>
      {activeTab === "Special Tender Pricing" && <Button variant="secondary" onClick={approveSpecial}><BadgeCheck className="h-4 w-4" /> Approve special prices</Button>}
      {activeTab === "Price Approval Exceptions" && <Button variant="secondary" onClick={submitExceptions}><BadgeCheck className="h-4 w-4" /> Submit exceptions</Button>}
      <Button variant="secondary" onClick={reset}><RefreshCcw className="h-4 w-4" /> Reset</Button>
    </div>
    <div className="grid gap-3 border-b p-5 md:grid-cols-2 xl:grid-cols-4">
      <Metric label="Active pricelists" value={String(state.pricelists.filter(item => item.Status === "Active").length)} />
      <Metric label="Approved contracts" value={String(state.contracts.filter(item => item.Status === "Approved").length)} />
      <Metric label="Discount rules" value={String(state.discountRules.filter(item => item.Status === "Active").length)} />
      <Metric label="Approval exceptions" value={String(state.exceptions.length)} warning={state.exceptions.length > 0} />
    </div>
    <div className="grid gap-4 p-5 2xl:grid-cols-[1fr_360px]">
      <div className="overflow-x-auto rounded-lg border">
        <table className="w-full min-w-[980px] text-left text-xs">
          <thead><tr className="border-b bg-slate-50 dark:bg-slate-900/40">{columns.map(column => <th key={column} className="px-3 py-2 text-[10px] uppercase text-slate-400">{column}</th>)}</tr></thead>
          <tbody className="divide-y">{rows.map((row, index) => <tr key={`${activeTab}-${index}`}>{columns.map(column => <td key={column} className="px-3 py-3">{column === "Status" || column === "Approval Status" ? <StatusBadge>{String(row[column] || "-")}</StatusBadge> : String(row[column] || "-")}</td>)}</tr>)}</tbody>
        </table>
        {!rows.length && <div className="p-8 text-center text-sm text-[var(--muted)]">No pricing rows.</div>}
      </div>
      <div className="space-y-4">
        <Panel title="Engine Checks">
          <div className="space-y-3 text-xs">{checks.map(check => <div key={`${check.source}-${check.listPrice}`} className="rounded-lg border p-3"><div className="font-bold">{check.source}</div><div className="mt-1 text-[var(--muted)]">List {qar(check.listPrice)} / Min {qar(check.minimumSellingPrice)} / Margin {check.targetMarginPercent}% / Max discount {check.maxDiscountPercent}%</div>{check.warnings.length > 0 && <div className="mt-2 text-amber-700">{check.warnings.join(" ")}</div>}</div>)}</div>
        </Panel>
        <Panel title="Local Controls">
          <div className="space-y-2 text-xs text-[var(--muted)]">
            <p>Costing lines use target margin and max discount from the engine where SKU rules exist.</p>
            <p>Quotation final submission accepts approved costing, active pricelist, or active contract pricing.</p>
            <p>Discount, margin, minimum-price, tender, and PSO exceptions route into the existing Approval Matrix.</p>
          </div>
        </Panel>
      </div>
    </div>
    {toast && <div role="status" className="fixed bottom-5 right-5 z-[100] rounded-xl bg-slate-900 px-4 py-3 text-xs font-medium text-white shadow-panel">{toast}</div>}
  </div>;
}

function rowsFor(tab: Tab, state: PricingState): Array<Record<string, string | number>> {
  if (tab === "Pricelists") return state.pricelists.flatMap(list => list.lines.map(line => ({ ...pick(list, ["Pricelist Code", "Pricelist Name", "Currency", "Customer Segment", "Business Unit", "Effective From", "Effective To", "Status", "Notes"]), ...line })));
  if (tab === "Customer Contract Pricing") return state.contracts.map(row);
  if (tab === "BU/Product Category Margin Rules") return state.marginRules.map(row);
  if (tab === "Discount Rules") return state.discountRules.map(row);
  if (tab === "Special Tender Pricing") return state.specialTenderPrices.map(row);
  return state.exceptions.map(row);
}

function columnsFor(tab: Tab) {
  if (tab === "Pricelists") return ["Pricelist Code", "Pricelist Name", "Currency", "Customer Segment", "Business Unit", "SKU", "Product Name", "List Price", "Minimum Selling Price", "Target Margin %", "Maximum Discount %", "Effective From", "Effective To", "Status", "Notes"];
  if (tab === "Customer Contract Pricing") return ["Customer", "Contract No", "SKU/Product Category", "Contract Price", "Validity", "Payment Terms", "Delivery Terms", "Status"];
  if (tab === "BU/Product Category Margin Rules") return ["BU", "Product Category", "Target Margin %", "Margin Floor %", "Status"];
  if (tab === "Discount Rules") return ["BU", "Product Category", "Customer Tier", "Sales Role", "Max Discount %", "Approval Required Above %", "Margin Floor %", "Status"];
  if (tab === "Special Tender Pricing") return ["Tender", "Customer", "SKU", "Special Price", "Valid Until", "Pathway", "Status", "Approval Status"];
  return ["Source", "Customer", "SKU", "Reason", "Approval Request No", "Status"];
}

function pick(source: object, keys: string[]) {
  const entries = source as Record<string, unknown>;
  return Object.fromEntries(keys.map(key => [key, entries[key]]));
}

function row(source: object) {
  return Object.fromEntries(Object.entries(source).filter(([key]) => key !== "id")) as Record<string, string | number>;
}

function Metric({ label, value, warning }: { label: string; value: string; warning?: boolean }) {
  return <div className={cn("rounded-lg border p-4", warning && "border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-900 dark:bg-amber-950/20 dark:text-amber-200")}><div className="text-[11px] font-semibold text-[var(--muted)]">{label}</div><div className="mt-1 text-2xl font-bold">{value}</div></div>;
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return <div className="rounded-lg border"><div className="border-b px-4 py-3 text-xs font-bold">{title}</div><div className="p-4">{children}</div></div>;
}

function qar(value: number) {
  return `QAR ${Math.round(value).toLocaleString("en-US")}`;
}

