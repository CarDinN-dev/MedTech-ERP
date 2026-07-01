"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Archive, BadgeCheck, Copy, Download, FileDown, FileText, Plus, Printer, RefreshCcw, Save, Search, Upload, X } from "lucide-react";
import { appendAuditLog } from "@/lib/audit-store";
import { submitApprovalRequest } from "@/lib/approval-matrix";
import { downloadBlob } from "@/lib/client-download";
import { getDemoSession, PRESENTATION_USER_NAME } from "@/lib/demo-auth";
import { createDemoRecord, readDemoRecordsSnapshot, writeDemoRecordsSnapshot } from "@/lib/demo-store";
import { exportWorkbookToExcel, parseExcelRows } from "@/lib/export/excel";
import { issueDocumentNumber, recordGeneratedDocument } from "@/lib/document-control";
import { cn } from "@/lib/utils";
import {
  approvalReasons,
  blankCosting,
  calculateCosting,
  costingApprovalStatuses,
  costingLineColumns,
  costingPathways,
  costingStatuses,
  costingSummary,
  costingWarnings,
  COSTING_MARGIN_THRESHOLD,
  COSTING_STORAGE_KEY,
  importCostingRows,
  lineFromProduct,
  seedCostingSheets,
  type CostingLine,
  type CostingSheet
} from "@/lib/sales-costing";
import { productMasterRows } from "@/lib/master-data";
import { Button, StatusBadge } from "@/components/ui";

type ModalMode = "create" | "edit" | "copy" | null;

export function SalesCostingWorkspace() {
  const fileRef = useRef<HTMLInputElement>(null);
  const [records, setRecords] = useState<CostingSheet[]>(seedCostingSheets);
  const [ready, setReady] = useState(false);
  const [selectedId, setSelectedId] = useState("");
  const [modal, setModal] = useState<ModalMode>(null);
  const [toast, setToast] = useState("");
  const [errors, setErrors] = useState<Array<{ row: number; message: string }>>([]);
  const [filters, setFilters] = useState({ q: "", customer: "", bu: "", salesperson: "", pathway: "", status: "", approval: "", from: "", to: "" });

  useEffect(() => {
    try { setRecords(JSON.parse(localStorage.getItem(COSTING_STORAGE_KEY) || "null") || seedCostingSheets()); } catch { setRecords(seedCostingSheets()); }
    setReady(true);
  }, []);
  useEffect(() => { if (ready) localStorage.setItem(COSTING_STORAGE_KEY, JSON.stringify(records)); }, [ready, records]);

  const visible = useMemo(() => records.filter(record => {
    const q = filters.q.toLowerCase();
    if (q && ![record["Costing Sheet No"], record.Customer, record.Salesperson, record["Related Enquiry No"], record["Related Opportunity No"]].some(value => value.toLowerCase().includes(q))) return false;
    if (filters.customer && record.Customer !== filters.customer) return false;
    if (filters.bu && record["Business Unit"] !== filters.bu) return false;
    if (filters.salesperson && record.Salesperson !== filters.salesperson) return false;
    if (filters.pathway && record["Sales Pathway"] !== filters.pathway) return false;
    if (filters.status && record.Status !== filters.status) return false;
    if (filters.approval && record["Approval Status"] !== filters.approval) return false;
    if (filters.from && record["Costing Date"] < filters.from) return false;
    if (filters.to && record["Costing Date"] > filters.to) return false;
    return true;
  }), [records, filters]);
  const selected = records.find(record => record.id === selectedId) ?? visible[0] ?? records[0] ?? null;
  const metrics = useMemo(() => costingMetrics(records), [records]);
  const options = useMemo(() => ({
    customer: unique(records.map(record => record.Customer)),
    bu: unique(records.map(record => record["Business Unit"])),
    salesperson: unique(records.map(record => record.Salesperson))
  }), [records]);

  const notify = (message: string) => { setToast(message); window.setTimeout(() => setToast(""), 2600); };
  const audit = (action: string, record: CostingSheet | string, details: string) => appendAuditLog({ action, module: "Sales Costing", record: typeof record === "string" ? record : record["Costing Sheet No"], details });
  const save = (sheet: CostingSheet, action = modal === "create" ? "CREATE COSTING" : "UPDATE COSTING") => {
    const next = calculateCosting(sheet);
    setRecords(current => current.some(item => item.id === next.id) ? current.map(item => item.id === next.id ? next : item) : [next, ...current]);
    setSelectedId(next.id); setModal(null); audit(action, next, `${next.Customer} / Rev ${next["Revision No"]}`); notify("Costing saved locally");
  };
  const updateSelected = (updater: (record: CostingSheet) => CostingSheet, action: string, details: string) => {
    if (!selected) return;
    const next = calculateCosting(updater(selected));
    setRecords(current => current.map(record => record.id === selected.id ? next : record));
    setSelectedId(next.id); audit(action, next, details); notify(details);
  };
  const recalc = () => updateSelected(record => addHistory(calculateCosting(record), "RECALCULATE", "Costs recalculated locally"), "RECALCULATE", "Costing recalculated");
  const duplicateRevision = () => { if (selected) save(blankCosting(selected), "DUPLICATE REVISION"); };
  const submitApproval = () => updateSelected(record => {
    const reasons = approvalReasons(record);
    reasons.forEach(reason => submitApprovalRequest({ sourceModule: "Sales", sourceRecord: record["Costing Sheet No"], requestType: reason.includes("Discount") ? "Quotation discount" : "Sales deal value", requestedBy: user(), amount: costingSummary(record)["Final Quotation Value"], discountPercent: Math.max(...record.lines.map(line => line["Discount %"])), businessUnit: record["Business Unit"], customerTier: "Standard" }));
    return addHistory({ ...record, Status: "Under Review", "Approval Status": "Pending" }, "SUBMIT APPROVAL", reasons.join(", ") || "Manual approval request");
  }, "SUBMIT APPROVAL", "Costing submitted for approval");
  const decide = (decision: "Approved" | "Rejected") => updateSelected(record => addHistory({ ...record, Status: decision === "Approved" ? "Approved" : "Under Review", "Approval Status": decision }, decision.toUpperCase(), decision === "Rejected" ? "Rejected locally - revise costing" : "Approved for quotation"), decision === "Approved" ? "APPROVE" : "REJECT", `Costing ${decision.toLowerCase()}`);
  const archive = () => updateSelected(record => addHistory({ ...record, Status: record.Status === "Archived" ? "Cancelled" : "Archived" }, "ARCHIVE", "Costing archived/cancelled locally"), "CANCEL/ARCHIVE", "Costing archived/cancelled");
  const createQuotation = () => {
    if (!selected) return;
    if (selected["Approval Status"] !== "Approved") { notify("Approved costing is required for final quotation draft"); return; }
    const quotationNo = issueDocumentNumber("Quotation");
    const summary = costingSummary(selected);
    const row = createDemoRecord({ Quotation: quotationNo, Customer: selected.Customer, Owner: selected.Salesperson, Date: new Date().toISOString().slice(0, 10), Total: qar(summary["Final Quotation Value"]), Status: "Draft", "Costing Sheet No": selected["Costing Sheet No"], Notes: selected.lines.map(line => `${line["SKU Code"]} x ${line.Quantity} @ ${qar(line["Final Unit Price"])}`).join("; ") });
    writeDemoRecordsSnapshot("sales:Quotations", [row, ...readDemoRecordsSnapshot("sales:Quotations", [])]);
    updateSelected(record => addHistory({ ...record, Status: "Quotation Created", "Quotation No": quotationNo }, "CREATE QUOTATION", `${quotationNo} created locally`), "CREATE QUOTATION", `${quotationNo} created from costing`);
  };
  const reset = () => { const seed = seedCostingSheets(); localStorage.removeItem(COSTING_STORAGE_KEY); setRecords(seed); setSelectedId(""); audit("RESET", "Sales Costing", "Costing demo data reset"); notify("Costing demo data reset"); };
  const exportSheet = async () => {
    const scope = selected ? [selected] : visible;
    await exportWorkbookToExcel([
      { name: "Costings", rows: scope.map(headerRow) },
      { name: "Lines", rows: scope.flatMap(record => record.lines.map(line => ({ "Costing Sheet No": record["Costing Sheet No"], ...line }))) },
      { name: "Summary", rows: scope.map(record => ({ "Costing Sheet No": record["Costing Sheet No"], ...costingSummary(record) })) },
      { name: "Warnings", rows: scope.flatMap(record => costingWarnings(record).map(Warning => ({ "Costing Sheet No": record["Costing Sheet No"], Warning }))) }
    ], selected ? selected["Costing Sheet No"].toLowerCase() : "sales-costings");
    audit("EXPORT EXCEL", selected ?? "Sales Costing", `${scope.length} costing sheet(s) exported`);
    notify("Excel export generated");
  };
  const template = async () => {
    await exportWorkbookToExcel([{ name: "Costing Lines", rows: [Object.fromEntries(costingLineColumns.map(column => [column, ""]))] }], "blank-costing-template");
    audit("EXPORT EXCEL", "Blank costing template", "Blank costing template downloaded"); notify("Template downloaded");
  };
  const importExcel = async (file?: File) => {
    if (!file) return;
    const parsed = await parseExcelRows(file);
    if (!parsed.hasWorksheet) return notify("Workbook has no worksheet");
    const result = importCostingRows(parsed.rows);
    setErrors(result.errors);
    if (result.lines.length) save({ ...blankCosting(), "Costing Sheet No": `CST-IMP-${String(Date.now() % 10000).padStart(4, "0")}`, Notes: `Imported from ${file.name}`, lines: result.lines }, "IMPORT EXCEL");
    audit("IMPORT EXCEL", "Sales Costing", `${result.lines.length} rows imported, ${result.errors.length} errors`);
    if (fileRef.current) fileRef.current.value = "";
  };
  const pdf = async (mode: "Full" | "Summary" | "Quotation-ready") => {
    if (!selected) return;
    const { generateBrandedPdf } = await import("@/lib/pdf/generator");
    const summary = costingSummary(selected);
    const result = await generateBrandedPdf({
      template: mode === "Quotation-ready" ? "quotation" : "estimation",
      documentNumber: `${selected["Costing Sheet No"]}-R${selected["Revision No"]}`,
      date: selected["Costing Date"],
      partyLabel: "Customer",
      partyName: selected.Customer,
      subject: `${mode} costing sheet / ${selected["Sales Pathway"]}`,
      currency: "QAR",
      lines: selected.lines.map(line => ({ code: line["SKU Code"], description: `${line["Product Name"]} / ${line["Supplier / Principal"]}`, quantity: line.Quantity, unit: line.UoM, unitPrice: mode === "Full" ? line["Landed Cost"] / Math.max(1, line.Quantity) : line["Final Unit Price"], discount: line["Discount %"], total: mode === "Full" ? line["Landed Cost"] : line["Line Total Selling Price"] })),
      subtotal: summary["Total Selling Price"],
      discount: summary["Total Discount"],
      tax: summary["VAT / Tax if applicable"],
      total: summary["Net Total"],
      metadata: [["Revision No", selected["Revision No"]], ["BU", selected["Business Unit"]], ["Salesperson", selected.Salesperson], ["Prepared By", selected["Prepared By"]], ["Approval Status", selected["Approval Status"]], ["Gross Margin %", `${summary["Gross Margin %"].toFixed(1)}%`], ["Warnings", costingWarnings(selected).join("; ") || "None"], ["Checked by", "Commercial / Finance"]],
      notes: "Local demo costing document. Signature lines: prepared by / checked by / approved by.",
      terms: ["Local demo mode only.", "Approved costing is required before final quotation submission where practical."],
      preparedBy: selected["Prepared By"],
      approvedBy: selected["Approval Status"] === "Approved" ? "Sales Director" : "Pending approval"
    }, "blob");
    if (!(result instanceof Blob)) return;
    downloadBlob(result, `${selected["Costing Sheet No"].toLowerCase()}-${mode.toLowerCase().replace(/\s+/g, "-")}.pdf`);
    recordGeneratedDocument({ document: `${mode} Costing Sheet`, sourceModule: "Sales Costing", sourceRecord: selected["Costing Sheet No"], documentNumber: selected["Costing Sheet No"], generatedBy: user() });
    audit("GENERATE PDF", selected, `${mode} PDF generated`);
    notify(`${mode} PDF generated`);
  };

  return <div className="overflow-hidden bg-[var(--panel)]">
    <input ref={fileRef} type="file" accept=".xlsx,.xls" className="hidden" onChange={event => importExcel(event.target.files?.[0])} />
    <div className="flex flex-wrap items-center gap-2 border-b px-5 py-3.5">
      <div className="relative min-w-[220px] flex-1 md:max-w-sm"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" /><input value={filters.q} onChange={event => setFilters({ ...filters, q: event.target.value })} placeholder="Search costing sheets..." className="h-9 w-full rounded-lg border bg-[var(--panel)] pl-9 pr-3 text-sm outline-none focus:border-teal-500" /></div>
      <Select value={filters.customer} options={options.customer} placeholder="Customer" onChange={value => setFilters({ ...filters, customer: value })} />
      <Select value={filters.bu} options={options.bu} placeholder="BU" onChange={value => setFilters({ ...filters, bu: value })} />
      <Select value={filters.salesperson} options={options.salesperson} placeholder="Salesperson" onChange={value => setFilters({ ...filters, salesperson: value })} />
      <Select value={filters.pathway} options={costingPathways} placeholder="Pathway" onChange={value => setFilters({ ...filters, pathway: value })} />
      <Select value={filters.status} options={costingStatuses} placeholder="Status" onChange={value => setFilters({ ...filters, status: value })} />
      <Select value={filters.approval} options={costingApprovalStatuses} placeholder="Approval" onChange={value => setFilters({ ...filters, approval: value })} />
      <input type="date" value={filters.from} onChange={event => setFilters({ ...filters, from: event.target.value })} className="h-9 rounded-lg border bg-[var(--panel)] px-2 text-xs" />
      <input type="date" value={filters.to} onChange={event => setFilters({ ...filters, to: event.target.value })} className="h-9 rounded-lg border bg-[var(--panel)] px-2 text-xs" />
    </div>
    <div className="flex flex-wrap items-center gap-2 border-b px-5 py-3">
      <Button onClick={() => setModal("create")}><Plus className="h-4 w-4" /> New costing</Button>
      <Button variant="secondary" onClick={() => setModal("copy")} disabled={!selected}><Copy className="h-4 w-4" /> Copy previous</Button>
      <Button variant="secondary" onClick={template}><FileDown className="h-4 w-4" /> Blank template</Button>
      <Button variant="secondary" onClick={() => fileRef.current?.click()}><Upload className="h-4 w-4" /> Import Excel</Button>
      <Button variant="secondary" onClick={exportSheet}><Download className="h-4 w-4" /> Export Excel</Button>
      <Button variant="secondary" onClick={reset}><RefreshCcw className="h-4 w-4" /> Reset</Button>
    </div>
    {errors.length > 0 && <div className="border-b border-amber-200 bg-amber-50 px-5 py-3 text-xs text-amber-900">{errors.slice(0, 6).map(error => <span key={`${error.row}-${error.message}`} className="mr-4">Row {error.row}: {error.message}</span>)}</div>}
    <div className="grid gap-3 border-b p-5 sm:grid-cols-2 xl:grid-cols-6">
      <Metric label="Draft costings" value={String(metrics.draft)} />
      <Metric label="Pending approvals" value={String(metrics.pending)} />
      <Metric label="Approved costings" value={String(metrics.approved)} />
      <Metric label="Low-margin warnings" value={String(metrics.lowMargin)} warning={metrics.lowMargin > 0} />
      <Metric label="Average margin %" value={`${metrics.avgMargin.toFixed(1)}%`} />
      <Metric label="Converted to quotation" value={String(metrics.converted)} />
    </div>
    <div className="grid min-h-[720px] xl:grid-cols-[430px_1fr]">
      <div className="border-b xl:border-b-0 xl:border-r"><CostingList rows={visible} selected={selected} onSelect={setSelectedId} /></div>
      {selected ? <CostingDetail record={selected} all={records} onEdit={() => setModal("edit")} onRecalc={recalc} onDuplicate={duplicateRevision} onSubmit={submitApproval} onApprove={() => decide("Approved")} onReject={() => decide("Rejected")} onArchive={archive} onQuotation={createQuotation} onPdf={pdf} /> : <div className="p-8 text-sm text-[var(--muted)]">No costing selected.</div>}
    </div>
    {modal && selected && <CostingModal mode={modal} source={modal === "create" ? null : selected} onClose={() => setModal(null)} onSave={save} />}
    {modal === "create" && !selected && <CostingModal mode="create" source={null} onClose={() => setModal(null)} onSave={save} />}
    {toast && <div role="status" className="fixed bottom-5 right-5 z-[100] rounded-xl bg-slate-900 px-4 py-3 text-xs font-medium text-white shadow-panel">{toast}</div>}
  </div>;
}

function CostingList({ rows, selected, onSelect }: { rows: CostingSheet[]; selected: CostingSheet | null; onSelect: (id: string) => void }) {
  return <div className="max-h-[720px] overflow-auto divide-y">{rows.map(record => {
    const summary = costingSummary(record);
    const warnings = costingWarnings(record);
    return <button key={record.id} onClick={() => onSelect(record.id)} className={cn("block w-full px-5 py-4 text-left hover:bg-slate-50 dark:hover:bg-slate-800/40", selected?.id === record.id && "bg-teal-50/70 dark:bg-teal-950/20")}>
      <div className="flex items-start justify-between gap-3"><div><div className="text-xs font-bold">{record["Costing Sheet No"]} Rev {record["Revision No"]}</div><div className="mt-1 text-sm font-semibold">{record.Customer}</div></div><StatusBadge>{record.Status}</StatusBadge></div>
      <div className="mt-2 text-xs text-[var(--muted)]">{record["Sales Pathway"]} / {record["Business Unit"]} / {record.Salesperson}</div>
      <div className="mt-3 grid grid-cols-3 gap-2 text-[11px]"><span>{qar(summary["Net Total"])}</span><span>{summary["Gross Margin %"].toFixed(1)}%</span><span>{warnings.length} warnings</span></div>
    </button>;
  })}{!rows.length && <div className="p-8 text-center text-sm text-[var(--muted)]">No matching costings.</div>}</div>;
}

function CostingDetail({ record, all, onEdit, onRecalc, onDuplicate, onSubmit, onApprove, onReject, onArchive, onQuotation, onPdf }: { record: CostingSheet; all: CostingSheet[]; onEdit: () => void; onRecalc: () => void; onDuplicate: () => void; onSubmit: () => void; onApprove: () => void; onReject: () => void; onArchive: () => void; onQuotation: () => void; onPdf: (mode: "Full" | "Summary" | "Quotation-ready") => void }) {
  const summary = costingSummary(record);
  const warnings = costingWarnings(record);
  const approved = record["Approval Status"] === "Approved";
  return <div className="min-w-0 p-5 print:p-0">
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div><div className="text-[10px] font-bold uppercase text-teal-600">Sales / Estimation / Costing</div><h2 className="mt-1 text-xl font-bold">{record["Costing Sheet No"]} Rev {record["Revision No"]}</h2><div className="mt-1 text-xs text-[var(--muted)]">{record.Customer} / {record["Sales Pathway"]} / {record["Approval Status"]}</div></div>
      <div className="flex flex-wrap gap-2 print:hidden">
        <Button variant="secondary" onClick={onEdit}>Edit</Button><Button variant="secondary" onClick={onRecalc}><RefreshCcw className="h-4 w-4" />Recalculate</Button><Button variant="secondary" onClick={onDuplicate}><Copy className="h-4 w-4" />New revision</Button><Button variant="secondary" onClick={onSubmit}>Submit approval</Button><Button variant="secondary" onClick={onApprove}><BadgeCheck className="h-4 w-4" />Approve</Button><Button variant="secondary" onClick={onReject}>Reject</Button><Button variant="secondary" onClick={onArchive}><Archive className="h-4 w-4" />Archive</Button><Button onClick={onQuotation} disabled={!approved}>Create quotation</Button>
      </div>
    </div>
    <div className="mt-4 flex flex-wrap gap-2 print:hidden"><Button variant="secondary" onClick={() => onPdf("Full")}><FileText className="h-4 w-4" />Full PDF</Button><Button variant="secondary" onClick={() => onPdf("Summary")}>Summary PDF</Button><Button variant="secondary" onClick={() => onPdf("Quotation-ready")}>Quotation-ready PDF</Button><Button variant="secondary" onClick={() => window.print()}><Printer className="h-4 w-4" />Print</Button></div>
    {warnings.length > 0 && <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900 dark:border-amber-900 dark:bg-amber-950/20 dark:text-amber-200">{warnings.map(warning => <span key={warning} className="mr-4">{warning}</span>)}</div>}
    <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4"><Metric label="Net total" value={qar(summary["Net Total"])} /><Metric label="Landed cost" value={qar(summary["Total Landed Cost"])} /><Metric label="Gross profit" value={qar(summary["Gross Profit"])} /><Metric label="Gross margin %" value={`${summary["Gross Margin %"].toFixed(1)}%`} warning={summary["Gross Margin %"] < COSTING_MARGIN_THRESHOLD} /></div>
    <div className="mt-5 grid gap-4 2xl:grid-cols-[1.2fr_.8fr]">
      <Panel title="Line Items"><div className="overflow-x-auto"><table className="w-full min-w-[1280px] text-left text-xs"><thead><tr className="border-b text-[10px] uppercase text-slate-400">{["Line", "SKU", "Product", "Supplier", "Qty", "Unit Cost QAR", "Landed", "Margin %", "Discount %", "Final Unit", "Selling Total", "GP %", "Lead"].map(column => <th key={column} className="px-2 py-2">{column}</th>)}</tr></thead><tbody className="divide-y">{record.lines.map(line => <tr key={line.id}><td className="px-2 py-3">{line["Line No"]}</td><td>{line["SKU Code"]}</td><td className="font-semibold">{line["Product Name"]}</td><td>{line["Supplier / Principal"]}</td><td>{line.Quantity}</td><td>{qar(line["Unit Cost QAR"])}</td><td>{qar(line["Landed Cost"])}</td><td>{line["Margin %"]}%</td><td>{line["Discount %"]}%</td><td>{qar(line["Final Unit Price"])}</td><td>{qar(line["Line Total Selling Price"])}</td><td>{line["Gross Margin %"].toFixed(1)}%</td><td>{line["Lead Time Days"]}</td></tr>)}</tbody></table></div></Panel>
      <Panel title="Header"><Info rows={headerRows(record)} /></Panel>
    </div>
    <div className="mt-4 grid gap-4 xl:grid-cols-3"><Panel title="Revision Comparison"><RevisionComparison record={record} all={all} /></Panel><Panel title="Costing vs Quotation"><Info rows={[["Quotation No", record["Quotation No"] || "Not created"], ["Costing net", qar(summary["Net Total"])], ["Quotation value", record["Quotation No"] ? qar(summary["Net Total"]) : "-"], ["Variance", record["Quotation No"] ? "QAR 0" : "-"]]} /></Panel><Panel title="Estimated vs Actual"><Info rows={[["Estimated landed cost", qar(summary["Total Landed Cost"])], ["Actual cost", record["Actual Cost QAR"] ? qar(record["Actual Cost QAR"]) : "Pending SO/Project/Procurement"], ["Variance", record["Actual Cost QAR"] ? qar(record["Actual Cost QAR"] - summary["Total Landed Cost"]) : "-"], ["Reference", record["Sales Order / Project / Procurement Ref"] || "-"]]} /></Panel></div>
    <div className="mt-4 grid gap-4 xl:grid-cols-3"><Panel title="Attachments Placeholder"><div className="space-y-2 text-xs">{record.Attachments.map(item => <div key={item} className="rounded-lg border px-3 py-2">{item}</div>)}</div></Panel><Panel title="Approval History"><div className="max-h-56 overflow-auto divide-y rounded-lg border">{record.approvalHistory.map((item, index) => <div key={`${item.time}-${index}`} className="p-3 text-xs"><div className="flex justify-between gap-2"><b>{item.action}</b><span className="text-[var(--muted)]">{item.time}</span></div><div className="mt-1 text-[var(--muted)]">{item.by} / {item.notes}</div></div>)}</div></Panel><Panel title="Approval Triggers"><div className="space-y-2 text-xs">{approvalReasons(record).map(reason => <StatusBadge key={reason}>{reason}</StatusBadge>)}{approvalReasons(record).length === 0 && <span className="text-[var(--muted)]">No threshold approval required.</span>}</div></Panel></div>
  </div>;
}

function CostingModal({ mode, source, onClose, onSave }: { mode: ModalMode; source: CostingSheet | null; onClose: () => void; onSave: (sheet: CostingSheet) => void }) {
  const base = mode === "edit" && source ? source : blankCosting(mode === "copy" && source ? source : undefined);
  const [sheet, setSheet] = useState(base);
  const locked = source?.["Approval Status"] === "Approved" && mode === "edit";
  const update = (key: keyof CostingSheet, value: string) => setSheet(current => calculateCosting({ ...current, [key]: key === "Exchange Rate" ? num(value) : value }));
  const updateLine = (id: string, key: keyof CostingLine, value: string) => setSheet(current => calculateCosting({ ...current, lines: current.lines.map(line => line.id === id ? { ...line, [key]: numericLineKeys.has(key as string) ? num(value) : value } : line) }));
  const addLine = () => setSheet(current => calculateCosting({ ...current, lines: [...current.lines, lineFromProduct(productMasterRows[0]["SKU Code"], current.lines.length + 1, { customer: current.Customer, businessUnit: current["Business Unit"], pathway: current["Sales Pathway"] })] }));
  const addProductLine = (sku: string) => setSheet(current => calculateCosting({ ...current, lines: [...current.lines, lineFromProduct(sku, current.lines.length + 1, { customer: current.Customer, businessUnit: current["Business Unit"], pathway: current["Sales Pathway"] })] }));
  const removeLine = (id: string) => setSheet(current => calculateCosting({ ...current, lines: current.lines.filter(line => line.id !== id).map((line, index) => ({ ...line, "Line No": String(index + 1) })) }));
  return <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/45 p-4">
    <div className="w-full max-w-7xl overflow-hidden rounded-2xl border bg-[var(--panel)] shadow-panel">
      <div className="flex items-center justify-between border-b px-5 py-4"><div><div className="text-[10px] font-bold uppercase text-teal-600">Local Sales Costing</div><h3 className="font-bold">{mode === "edit" ? "Edit costing" : mode === "copy" ? "Copy from previous costing" : "Create costing"}</h3></div><button aria-label="Close modal" onClick={onClose} className="rounded-lg p-2 hover:bg-slate-100 dark:hover:bg-slate-800"><X className="h-4 w-4" /></button></div>
      <div className="max-h-[74vh] overflow-auto p-5">
        {locked && <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">Approved cost fields are locked. Create a new revision for cost changes.</div>}
        <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-5">
          {(["Costing Sheet No", "Costing Date", "Revision No", "Related Enquiry No", "Related Opportunity No", "Customer", "Customer Code", "Business Unit", "Department", "Salesperson", "Prepared By", "Currency", "Exchange Rate", "Payment Terms", "Validity Date", "Notes"] as Array<keyof CostingSheet>).map(key => <Field key={String(key)} label={String(key)} type={String(key).includes("Date") ? "date" : "text"} value={String(sheet[key] ?? "")} disabled={locked && ["Exchange Rate"].includes(String(key))} onChange={value => update(key, value)} />)}
          <label><span className="mb-1.5 block text-[11px] font-semibold text-[var(--muted)]">Sales Pathway</span><select value={sheet["Sales Pathway"]} onChange={event => update("Sales Pathway", event.target.value)} className="h-10 w-full rounded-xl border bg-[var(--panel)] px-3 text-sm">{costingPathways.map(item => <option key={item}>{item}</option>)}</select></label>
          <label><span className="mb-1.5 block text-[11px] font-semibold text-[var(--muted)]">Status</span><select value={sheet.Status} onChange={event => update("Status", event.target.value)} className="h-10 w-full rounded-xl border bg-[var(--panel)] px-3 text-sm">{costingStatuses.map(item => <option key={item}>{item}</option>)}</select></label>
          <label><span className="mb-1.5 block text-[11px] font-semibold text-[var(--muted)]">Approval Status</span><select value={sheet["Approval Status"]} onChange={event => update("Approval Status", event.target.value)} className="h-10 w-full rounded-xl border bg-[var(--panel)] px-3 text-sm">{costingApprovalStatuses.map(item => <option key={item}>{item}</option>)}</select></label>
        </div>
        <div className="mt-5 flex flex-wrap gap-2"><Button variant="secondary" onClick={addLine}><Plus className="h-4 w-4" />Add blank line</Button>{productMasterRows.map(product => <Button key={product["SKU Code"]} variant="ghost" onClick={() => addProductLine(product["SKU Code"])}>{product["SKU Code"]}</Button>)}</div>
        <div className="mt-4 overflow-x-auto rounded-xl border"><table className="w-full min-w-[1900px] text-left text-xs"><thead><tr className="border-b bg-slate-50 dark:bg-slate-900/40">{costingLineColumns.map(column => <th key={column} className="px-2 py-2 text-[10px] uppercase text-slate-400">{column}</th>)}<th /></tr></thead><tbody className="divide-y">{sheet.lines.map(line => <tr key={line.id}>{costingLineColumns.map(column => <td key={column} className="px-2 py-2"><input value={String(line[column] ?? "")} disabled={locked && lockedLineKeys.has(column)} onChange={event => updateLine(line.id, column, event.target.value)} className="h-8 w-28 rounded-lg border bg-[var(--panel)] px-2 outline-none focus:border-teal-500 disabled:bg-slate-100 dark:disabled:bg-slate-900" /></td>)}<td><button onClick={() => removeLine(line.id)} className="rounded-lg p-2 text-rose-600 hover:bg-rose-50">Delete</button></td></tr>)}</tbody></table></div>
      </div>
      <div className="flex justify-end gap-2 border-t bg-slate-50/70 px-5 py-4 dark:bg-slate-900/30"><Button variant="secondary" onClick={onClose}>Cancel</Button><Button onClick={() => onSave(addHistory(calculateCosting(sheet), mode === "edit" ? "UPDATE" : "CREATE", "Costing saved locally"))}><Save className="h-4 w-4" />Save costing</Button></div>
    </div>
  </div>;
}

function addHistory(sheet: CostingSheet, action: string, notes: string): CostingSheet {
  return { ...sheet, approvalHistory: [{ time: new Date().toLocaleString("en-GB", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }), action, by: user(), notes }, ...sheet.approvalHistory].slice(0, 40) };
}

function headerRow(record: CostingSheet) {
  const header = Object.fromEntries(Object.entries(record).filter(([key]) => !["lines", "approvalHistory", "Attachments"].includes(key)));
  return { ...header, Attachments: record.Attachments.join("; "), "Approval History": record.approvalHistory.map(item => `${item.time} ${item.action} ${item.by}: ${item.notes}`).join("\n"), ...costingSummary(record), Warnings: costingWarnings(record).join("; ") };
}

function RevisionComparison({ record, all }: { record: CostingSheet; all: CostingSheet[] }) {
  const revisions = all.filter(item => item["Related Opportunity No"] && item["Related Opportunity No"] === record["Related Opportunity No"] || item["Costing Sheet No"] === record["Costing Sheet No"]).sort((a, b) => Number(a["Revision No"]) - Number(b["Revision No"]));
  return <Info rows={revisions.map(item => [`Rev ${item["Revision No"]}`, `${qar(costingSummary(item)["Net Total"])} / ${costingSummary(item)["Gross Margin %"].toFixed(1)}% / ${item.Status}`])} />;
}

function costingMetrics(records: CostingSheet[]) {
  const summaries = records.map(costingSummary);
  return {
    draft: records.filter(record => record.Status === "Draft").length,
    pending: records.filter(record => record["Approval Status"] === "Pending").length,
    approved: records.filter(record => record["Approval Status"] === "Approved").length,
    lowMargin: records.filter(record => costingSummary(record)["Gross Margin %"] < COSTING_MARGIN_THRESHOLD).length,
    avgMargin: summaries.reduce((sum, item) => sum + item["Gross Margin %"], 0) / Math.max(1, summaries.length),
    converted: records.filter(record => record.Status === "Quotation Created").length
  };
}

function headerRows(record: CostingSheet): Array<[string, string]> {
  return [["Date", record["Costing Date"]], ["Related Enquiry", record["Related Enquiry No"] || "-"], ["Related Opportunity", record["Related Opportunity No"] || "-"], ["Customer Code", record["Customer Code"]], ["BU / Department", `${record["Business Unit"]} / ${record.Department}`], ["Payment Terms", record["Payment Terms"]], ["Validity", record["Validity Date"]], ["Currency / FX", `${record.Currency} / ${record["Exchange Rate"]}`], ["Notes", record.Notes || "-"]];
}

function Metric({ label, value, warning }: { label: string; value: string; warning?: boolean }) {
  return <div className={cn("rounded-xl border p-4", warning && "border-amber-300 bg-amber-50 dark:bg-amber-950/20")}><div className="text-[10px] font-bold uppercase text-[var(--muted)]">{label}</div><div className="mt-2 text-lg font-bold">{value}</div></div>;
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return <section className="rounded-xl border bg-[var(--panel)] p-4"><div className="mb-3 text-xs font-bold">{title}</div>{children}</section>;
}

function Info({ rows }: { rows: Array<[string, string]> }) {
  return <div className="space-y-2 text-xs">{rows.map(([label, value]) => <div key={label} className="grid grid-cols-[145px_1fr] gap-3"><span className="text-[var(--muted)]">{label}</span><span className="whitespace-pre-wrap font-medium">{value}</span></div>)}</div>;
}

function Select({ value, options, placeholder, onChange }: { value: string; options: string[]; placeholder: string; onChange: (value: string) => void }) {
  return <select value={value} onChange={event => onChange(event.target.value)} className="h-9 rounded-lg border bg-[var(--panel)] px-3 text-xs outline-none"><option value="">{placeholder}</option>{options.map(option => <option key={option}>{option}</option>)}</select>;
}

function Field({ label, value, onChange, type = "text", disabled }: { label: string; value: string; onChange: (value: string) => void; type?: string; disabled?: boolean }) {
  return <label><span className="mb-1.5 block text-[11px] font-semibold text-[var(--muted)]">{label}</span><input type={type} value={value} disabled={disabled} onChange={event => onChange(event.target.value)} className="h-10 w-full rounded-xl border bg-[var(--panel)] px-3 text-sm outline-none focus:border-teal-500 disabled:bg-slate-100 dark:disabled:bg-slate-900" /></label>;
}

const numericLineKeys = new Set(["Quantity", "Native Unit Cost", "Exchange Rate", "Unit Cost QAR", "Total Cost QAR", "Freight %", "Customs %", "Clearance Charges", "Insurance %", "Bank Charges %", "Warranty Cost %", "Installation Cost", "Service Cost", "Other Charges", "Landed Cost", "Margin %", "Margin Amount", "Selling Unit Price", "Discount %", "Final Unit Price", "Line Total Selling Price", "Gross Profit", "Gross Margin %", "Lead Time Days"]);
const lockedLineKeys = new Set(["Native Unit Cost", "Exchange Rate", "Unit Cost QAR", "Freight %", "Customs %", "Clearance Charges", "Insurance %", "Bank Charges %", "Warranty Cost %", "Installation Cost", "Service Cost", "Other Charges", "Margin %"]);
function unique(values: string[]) { return Array.from(new Set(values.filter(Boolean))).sort(); }
function user() { return getDemoSession()?.name || PRESENTATION_USER_NAME; }
function num(value: string) { const parsed = Number(String(value).replace(/[^0-9.-]/g, "")); return Number.isFinite(parsed) ? parsed : 0; }
function qar(value: number) { return `QAR ${Math.round(value).toLocaleString("en-US")}`; }
