"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { BadgeCheck, CheckCircle2, Download, FileText, Plus, RotateCcw, Save, Search, X } from "lucide-react";
import { appendAuditLog } from "@/lib/audit-store";
import { submitApprovalRequest } from "@/lib/approval-matrix";
import { downloadBlob } from "@/lib/client-download";
import { getDemoSession, PRESENTATION_USER_NAME } from "@/lib/demo-auth";
import { exportWorkbookToExcel } from "@/lib/export/excel";
import { createProjectFromPso } from "@/lib/project-workflow";
import { cn } from "@/lib/utils";
import {
  advanceWorkflow,
  approveWorkflow,
  DISCOUNT_THRESHOLD,
  generateWorkflowDocument,
  linesToText,
  pricingControlWarnings,
  replenishmentAlerts,
  salesWorkflowPathways,
  seedSalesWorkflows,
  textToLines,
  validateStageExit,
  workflowTotals,
  type SalesPathwayKey,
  type SalesWorkflowRecord
} from "@/lib/sales-workflow";
import { Button, StatusBadge } from "@/components/ui";

const STORAGE_KEY = "medtech-demo:sales-workflows:v1";
const pathwayKeys: SalesPathwayKey[] = ["sfs", "gpprr", "tender", "pso"];

export function SalesWorkflowWorkspace({ initialPathway }: { initialPathway?: SalesPathwayKey | "workspace" }) {
  const [records, setRecords] = useState<SalesWorkflowRecord[]>(seedSalesWorkflows);
  const [ready, setReady] = useState(false);
  const [pathway, setPathway] = useState<SalesPathwayKey>(initialPathway && initialPathway !== "workspace" ? initialPathway : "sfs");
  const [selectedId, setSelectedId] = useState("");
  const [query, setQuery] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<SalesWorkflowRecord | null>(null);
  const [toast, setToast] = useState("");

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      setRecords(stored ? JSON.parse(stored) as SalesWorkflowRecord[] : seedSalesWorkflows());
    } catch {
      setRecords(seedSalesWorkflows());
    }
    setReady(true);
  }, []);

  useEffect(() => {
    if (initialPathway && initialPathway !== "workspace") setPathway(initialPathway);
  }, [initialPathway]);

  useEffect(() => {
    if (ready) localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
  }, [ready, records]);

  const visible = useMemo(() => {
    const search = query.toLowerCase();
    return records.filter(record => record.pathway === pathway && (!search || [record.reference, record.title, record.customer, record.owner, record.status].some(value => value.toLowerCase().includes(search))));
  }, [pathway, query, records]);
  const selected = visible.find(record => record.id === selectedId) ?? visible[0] ?? null;

  useEffect(() => { setSelectedId(""); }, [pathway]);

  const notify = (message: string) => { setToast(message); window.setTimeout(() => setToast(""), 2400); };
  const updateSelected = (next: SalesWorkflowRecord, auditAction?: string, auditDetails?: string) => {
    setRecords(current => current.map(record => record.id === next.id ? next : record));
    setSelectedId(next.id);
    if (auditAction) appendAuditLog({ action: auditAction, module: "Sales Workflow", record: next.reference, details: auditDetails ?? next.title });
  };
  const advance = () => {
    if (!selected) return;
    const result = advanceWorkflow(selected);
    if (result.error) { notify(result.error); return; }
    updateSelected(result.record, "STAGE", result.record.audit[0]?.detail);
    notify("Stage advanced");
  };
  const decide = (decision: "Approved" | "Rejected") => {
    if (!selected) return;
    const next = approveWorkflow(selected, decision);
    updateSelected(next, decision === "Approved" ? "APPROVE" : "REJECT", `${selected.reference} ${decision.toLowerCase()}`);
    notify(`Approval ${decision.toLowerCase()}`);
  };
  const generateDocument = (type: string) => {
    if (!selected) return;
    const result = generateWorkflowDocument(selected, type);
    if (result.error) { notify(result.error); return; }
    const next = type === "Project Link" && selected.pathway === "pso"
      ? (() => {
        const created = createProjectFromPso(selected, getDemoSession()?.name || PRESENTATION_USER_NAME);
        return { ...result.record, projectCode: created.project["Project No"], linkedProject: created.projectName };
      })()
      : result.record;
    updateSelected(next, type === "Project Link" ? "PROJECT SETUP" : "DOCUMENT", next.audit[0]?.detail);
    notify(`${type} generated locally`);
  };
  const submitApproval = () => {
    if (!selected) return;
    const totals = workflowTotals(selected);
    const pricingWarnings = pricingControlWarnings(selected);
    if (pricingWarnings.length || ["tender", "pso"].includes(selected.pathway)) {
      submitApprovalRequest({ sourceModule: "Sales", sourceRecord: selected.reference, requestType: "Price approval exception", requestedBy: getDemoSession()?.name || PRESENTATION_USER_NAME, amount: totals.net, discountPercent: totals.maxDiscountPercent, businessUnit: fieldRows(selected).find(([label]) => label === "Principal")?.[1] || "Sales" });
    }
    const result = submitApprovalRequest({
      sourceModule: "Sales",
      sourceRecord: selected.reference,
      requestType: totals.maxDiscountPercent > DISCOUNT_THRESHOLD ? "Quotation discount" : "Sales deal value",
      requestedBy: getDemoSession()?.name || PRESENTATION_USER_NAME,
      amount: totals.net,
      discountPercent: totals.maxDiscountPercent,
      customerTier: "Standard",
      businessUnit: fieldRows(selected).find(([label]) => label === "Principal")?.[1] || "Sales"
    });
    updateSelected({ ...selected, approvalStatus: "Pending", status: "Pending approval" }, "SUBMIT APPROVAL", result.message);
    notify(result.message);
  };
  const saveRecord = (record: SalesWorkflowRecord) => {
    setRecords(current => current.some(item => item.id === record.id) ? current.map(item => item.id === record.id ? record : item) : [record, ...current]);
    setSelectedId(record.id);
    setModalOpen(false);
    appendAuditLog({ action: editing ? "UPDATE" : "CREATE", module: "Sales Workflow", record: record.reference, details: `${salesWorkflowPathways[record.pathway].shortLabel} local workflow saved` });
    notify("Workflow saved");
  };
  const reset = () => {
    localStorage.removeItem(STORAGE_KEY);
    const seed = seedSalesWorkflows();
    setRecords(seed);
    setSelectedId("");
    appendAuditLog({ action: "RESET", module: "Sales Workflow", record: "Local workflow", details: "Sales workflow demo data reset" });
    notify("Workflow demo data reset");
  };
  const exportRows = async () => {
    await exportWorkbookToExcel([
      { name: "Workflows", rows: visible.map(record => workflowRow(record)) },
      { name: "Lines", rows: visible.flatMap(record => record.lines.map(line => ({ Reference: record.reference, Customer: record.customer, Product: line.product, SKU: line.sku, Quantity: line.quantity, "Unit price": line.unitPrice, "Unit cost": line.unitCost, "Discount %": line.discountPercent, Location: line.location, "Min stock": line.minStock, Forecast: line.forecastQty, Actual: line.actualQty, Batch: line.batchNo, Expiry: line.expiryDate }))) },
      { name: "Documents", rows: visible.flatMap(record => record.documents.map(document => ({ Reference: record.reference, Type: document.type, Number: document.number, Status: document.status, Date: document.date }))) },
      { name: "Audit", rows: visible.flatMap(record => record.audit.map(entry => ({ Reference: record.reference, Time: entry.time, Action: entry.action, Detail: entry.detail }))) }
    ], `sales-workflow-${salesWorkflowPathways[pathway].shortLabel.toLowerCase()}`);
    appendAuditLog({ action: "EXPORT", module: "Sales Workflow", record: salesWorkflowPathways[pathway].shortLabel, details: `${visible.length} workflow records exported to Excel` });
    notify("Excel export generated");
  };
  const downloadPdf = async () => {
    if (!selected) return;
    const { generateBrandedPdf } = await import("@/lib/pdf/generator");
    const totals = workflowTotals(selected);
    const result = await generateBrandedPdf({
      template: selected.pathway === "sfs" ? "quotation" : "report",
      documentNumber: selected.reference,
      date: new Date().toLocaleDateString("en-GB"),
      partyLabel: "Customer",
      partyName: selected.customer,
      subject: `${salesWorkflowPathways[selected.pathway].label} workflow`,
      lines: selected.lines.map(line => ({ description: line.product, code: line.sku, quantity: line.quantity, unitPrice: line.unitPrice, discount: line.discountPercent, total: line.quantity * line.unitPrice * (1 - line.discountPercent / 100) })),
      metadata: [["Stage", currentStage(selected)], ["Approval", selected.approvalStatus], ["Owner", selected.owner], ["Margin", `${formatMoney(totals.margin)} / ${totals.marginPercent.toFixed(1)}%`], ["Documents", selected.documents.map(document => document.number).join(", ") || "None"]],
      notes: validateStageExit(selected) || "Local demo workflow record. No external services were called.",
      terms: ["Local demo mode only.", "Generated documents are drafts until approved internally."],
      preparedBy: selected.owner || "Sales Team",
      approvedBy: selected.approvalStatus === "Approved" ? "Sales Management" : "Pending approval"
    }, "blob");
    if (!(result instanceof Blob)) return;
    downloadBlob(result, `${selected.reference.toLowerCase()}-workflow.pdf`);
    appendAuditLog({ action: "PDF", module: "Sales Workflow", record: selected.reference, details: "Workflow PDF generated locally" });
    notify("PDF generated");
  };

  return <div className="overflow-hidden bg-[var(--panel)]">
    <div className="flex flex-wrap items-center gap-2 border-b px-5 py-3">
      {pathwayKeys.map(key => <button key={key} onClick={() => setPathway(key)} className={cn("h-9 rounded-lg border px-3 text-xs font-bold transition", pathway === key ? "border-medtech-red bg-[var(--navy-tint)] text-medtech-navy dark:bg-[var(--elevated)] dark:text-red-100" : "bg-[var(--panel)] text-[var(--muted)] hover:bg-slate-50 dark:hover:bg-slate-800")}>{salesWorkflowPathways[key].shortLabel}</button>)}
      <div className="relative ml-auto min-w-[220px] flex-1 md:max-w-sm"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" /><input value={query} onChange={event => setQuery(event.target.value)} placeholder="Search workflows..." className="h-9 w-full rounded-lg border bg-[var(--panel)] pl-9 pr-3 text-sm outline-none focus:border-medtech-red" /></div>
      <Button variant="secondary" onClick={exportRows}><Download className="h-4 w-4" />Excel</Button>
      <Button variant="secondary" onClick={downloadPdf} disabled={!selected}><FileText className="h-4 w-4" />PDF</Button>
      <Button variant="secondary" onClick={reset}><RotateCcw className="h-4 w-4" />Reset</Button>
      <Button onClick={() => { setEditing(null); setModalOpen(true); }}><Plus className="h-4 w-4" />New workflow</Button>
    </div>
    <div className="grid min-h-[680px] xl:grid-cols-[430px_1fr]">
      <div className="border-b xl:border-b-0 xl:border-r">
        <div className="border-b px-5 py-3 text-xs font-bold">{salesWorkflowPathways[pathway].label}</div>
        <div className="max-h-[650px] overflow-auto divide-y">
          {visible.map(record => {
            const totals = workflowTotals(record);
            return <button key={record.id} onClick={() => setSelectedId(record.id)} className={cn("block w-full px-5 py-4 text-left transition hover:bg-slate-50 dark:hover:bg-slate-800/50", selected?.id === record.id && "bg-[var(--navy-tint)] dark:bg-[var(--elevated)]")}>
              <div className="flex items-start justify-between gap-3"><div><div className="text-xs font-bold">{record.reference}</div><div className="mt-1 text-sm font-semibold">{record.title}</div></div><StatusBadge>{record.status}</StatusBadge></div>
              <div className="mt-2 text-xs text-[var(--muted)]">{record.customer}</div>
              <div className="mt-3 grid grid-cols-3 gap-2 text-[11px]"><span>{currentStage(record)}</span><span>{formatMoney(totals.net)}</span><span>{totals.marginPercent.toFixed(1)}%</span></div>
            </button>;
          })}
          {!visible.length && <div className="p-8 text-center text-sm text-[var(--muted)]">No local workflow records.</div>}
        </div>
      </div>
      {selected ? <WorkflowDetail record={selected} onEdit={() => { setEditing(selected); setModalOpen(true); }} onAdvance={advance} onApprove={() => decide("Approved")} onReject={() => decide("Rejected")} onSubmitApproval={submitApproval} onGenerate={generateDocument} /> : <div className="p-8 text-sm text-[var(--muted)]">Create a workflow to begin.</div>}
    </div>
    {modalOpen && <WorkflowModal record={editing} pathway={pathway} onClose={() => setModalOpen(false)} onSave={saveRecord} />}
    {toast && <div role="status" className="fixed bottom-5 right-5 z-[100] flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-3 text-xs font-medium text-white shadow-panel"><CheckCircle2 className="h-4 w-4 text-red-300" />{toast}</div>}
  </div>;
}

function WorkflowDetail({ record, onEdit, onAdvance, onApprove, onReject, onSubmitApproval, onGenerate }: { record: SalesWorkflowRecord; onEdit: () => void; onAdvance: () => void; onApprove: () => void; onReject: () => void; onSubmitApproval: () => void; onGenerate: (type: string) => void }) {
  const totals = workflowTotals(record);
  const stages = salesWorkflowPathways[record.pathway].stages;
  const alertCount = record.pathway === "gpprr" ? replenishmentAlerts(record).length : 0;
  return <div className="min-w-0 p-5">
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div><div className="text-[10px] font-bold uppercase text-medtech-red">{salesWorkflowPathways[record.pathway].label}</div><h2 className="mt-1 text-xl font-bold">{record.title}</h2><div className="mt-1 text-xs text-[var(--muted)]">{record.customer} / {record.owner || "Unassigned"}</div></div>
      <div className="flex flex-wrap gap-2"><Button variant="secondary" onClick={onEdit}>Edit</Button><Button variant="secondary" onClick={onSubmitApproval}>Submit approval</Button><Button variant="secondary" onClick={onApprove}><BadgeCheck className="h-4 w-4" />Approve</Button><Button variant="secondary" onClick={onReject}>Reject</Button><Button onClick={onAdvance}>Advance stage</Button></div>
    </div>

    <div className="mt-5 overflow-x-auto pb-2"><div className="flex min-w-max gap-2">{stages.map((stage, index) => <div key={stage} className={cn("w-36 rounded-lg border px-3 py-2 text-xs", index < record.stageIndex ? "border-emerald-200 bg-emerald-50 text-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-200" : index === record.stageIndex ? "border-medtech-red/70 bg-[var(--navy-tint)] font-bold text-medtech-navy dark:bg-[var(--elevated)] dark:text-red-100" : "text-[var(--muted)]")}>{stage}</div>)}</div></div>

    <div className="mt-5 grid gap-4 lg:grid-cols-4">
      <SummaryCard label="Approval" value={record.approvalStatus} />
      <SummaryCard label="Net value" value={formatMoney(totals.net)} />
      <SummaryCard label="Margin" value={`${formatMoney(totals.margin)} / ${totals.marginPercent.toFixed(1)}%`} />
      <SummaryCard label={record.pathway === "gpprr" ? "Replenishment alerts" : "Max discount"} value={record.pathway === "gpprr" ? String(alertCount) : `${totals.maxDiscountPercent}%`} warning={record.pathway === "gpprr" ? alertCount > 0 : totals.maxDiscountPercent > DISCOUNT_THRESHOLD} />
    </div>

    <div className="mt-5 grid gap-4 2xl:grid-cols-[1.25fr_.75fr]">
      <Panel title="Related Customer/Product Lines">
        <div className="overflow-x-auto"><table className="w-full min-w-[780px] text-left text-xs"><thead><tr className="border-b text-[10px] uppercase text-slate-400"><th className="py-2">Product</th><th>SKU</th><th>Qty</th><th>Price</th><th>Cost</th><th>Disc</th><th>Location</th><th>Forecast</th><th>Actual</th><th>Batch/Expiry</th></tr></thead><tbody className="divide-y">{record.lines.map(line => <tr key={line.id}><td className="py-3 font-semibold">{line.product}</td><td>{line.sku}</td><td>{line.quantity}</td><td>{formatMoney(line.unitPrice)}</td><td>{formatMoney(line.unitCost)}</td><td>{line.discountPercent}%</td><td>{line.location || "-"}</td><td>{line.forecastQty}</td><td>{line.actualQty}</td><td>{[line.batchNo, line.expiryDate].filter(Boolean).join(" / ") || "-"}</td></tr>)}</tbody></table></div>
      </Panel>
      <Panel title="Pathway Fields">
        <InfoRows rows={fieldRows(record)} />
      </Panel>
    </div>

    {record.pathway === "gpprr" && <Panel title="Monthly Actual vs Forecast vs Minimum Stock" className="mt-4">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{record.lines.map(line => <div key={line.id} className="rounded-lg border p-3 text-xs"><div className="font-bold">{line.product}</div><div className="mt-2 grid grid-cols-3 gap-2 text-[11px] text-[var(--muted)]"><span>Forecast {line.forecastQty}</span><span>Actual {line.actualQty}</span><span>Min {line.minStock}</span></div><StatusBadge>{line.actualQty >= line.forecastQty || line.minStock > Math.max(0, line.forecastQty - line.actualQty) ? "Action needed" : "OK"}</StatusBadge></div>)}</div>
    </Panel>}

    <div className="mt-5 grid gap-4 xl:grid-cols-2">
      <Panel title="Related Documents">
        <div className="mb-3 flex flex-wrap gap-2">{documentOptions(record.pathway).map(type => <Button key={type} variant="secondary" onClick={() => onGenerate(type)}><Plus className="h-4 w-4" />{type}</Button>)}</div>
        <div className="divide-y rounded-lg border">{record.documents.length ? record.documents.map(document => <div key={document.id} className="flex items-center justify-between gap-3 p-3 text-xs"><div><div className="font-bold">{document.number}</div><div className="text-[var(--muted)]">{document.type} / {document.date}</div></div><StatusBadge>{document.status}</StatusBadge></div>) : <div className="p-4 text-sm text-[var(--muted)]">No generated documents yet.</div>}</div>
      </Panel>
      <Panel title="Audit Log">
        <div className="max-h-64 overflow-auto divide-y rounded-lg border">{record.audit.map(entry => <div key={entry.id} className="p-3 text-xs"><div className="flex justify-between gap-3"><b>{entry.action}</b><span className="text-[var(--muted)]">{entry.time}</span></div><div className="mt-1 text-[var(--muted)]">{entry.detail}</div></div>)}</div>
      </Panel>
    </div>
  </div>;
}

function WorkflowModal({ record, pathway, onClose, onSave }: { record: SalesWorkflowRecord | null; pathway: SalesPathwayKey; onClose: () => void; onSave: (record: SalesWorkflowRecord) => void }) {
  const [values, setValues] = useState(() => record ?? blankWorkflow(pathway));
  const [lineText, setLineText] = useState(() => linesToText(record?.lines ?? blankWorkflow(pathway).lines));
  const update = (field: keyof SalesWorkflowRecord, value: string) => setValues(current => ({ ...current, [field]: value }));
  const save = () => onSave({ ...values, lines: textToLines(lineText), audit: record ? [{ id: `audit-${Date.now()}`, time: new Date().toLocaleString("en-GB", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }), action: "UPDATE", detail: "Workflow edited locally" }, ...values.audit] : values.audit });

  return <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/45 p-4">
    <div className="w-full max-w-4xl overflow-hidden rounded-2xl border bg-[var(--panel)] shadow-panel">
      <div className="flex items-center justify-between border-b px-5 py-4"><div><div className="text-[10px] font-bold uppercase text-medtech-red">Local demo workflow</div><h3 className="font-bold">{record ? "Edit workflow" : "Create workflow"}</h3></div><button aria-label="Close modal" onClick={onClose} className="rounded-lg p-2 hover:bg-slate-100 dark:hover:bg-slate-800"><X className="h-4 w-4" /></button></div>
      <div className="grid max-h-[70vh] gap-4 overflow-auto p-5 sm:grid-cols-2">
        <Field label="Reference" value={values.reference} onChange={value => update("reference", value)} />
        <label><span className="mb-1.5 block text-[11px] font-semibold text-[var(--muted)]">Pathway</span><select value={values.pathway} onChange={event => setValues(blankWorkflow(event.target.value as SalesPathwayKey, values))} className="h-10 w-full rounded-xl border bg-[var(--panel)] px-3 text-sm outline-none focus:border-medtech-red">{pathwayKeys.map(key => <option key={key} value={key}>{salesWorkflowPathways[key].label}</option>)}</select></label>
        <Field label="Title" value={values.title} onChange={value => update("title", value)} />
        <Field label="Customer" value={values.customer} onChange={value => update("customer", value)} />
        <Field label="Owner" value={values.owner} onChange={value => update("owner", value)} />
        <label><span className="mb-1.5 block text-[11px] font-semibold text-[var(--muted)]">Approval status</span><select value={values.approvalStatus} onChange={event => update("approvalStatus", event.target.value)} className="h-10 w-full rounded-xl border bg-[var(--panel)] px-3 text-sm outline-none focus:border-medtech-red"><option>Not required</option><option>Pending</option><option>Approved</option><option>Rejected</option></select></label>
        <Field label="Outcome" value={values.outcome} onChange={value => update("outcome", value)} placeholder="Won, Lost, Awarded" />
        <Field label="Reason" value={values.reason} onChange={value => update("reason", value)} />
        <Field label="Qualification notes" value={values.qualificationNotes} onChange={value => update("qualificationNotes", value)} />
        <label><span className="mb-1.5 block text-[11px] font-semibold text-[var(--muted)]">Specialist validation</span><select value={values.specialistValidation} onChange={event => update("specialistValidation", event.target.value)} className="h-10 w-full rounded-xl border bg-[var(--panel)] px-3 text-sm outline-none focus:border-medtech-red"><option>Pending</option><option>Validated</option><option>Rejected</option></select></label>
        <Field label="Contract number" value={values.contractNumber} onChange={value => update("contractNumber", value)} />
        <Field label="Principal" value={values.principal} onChange={value => update("principal", value)} />
        <Field label="Tender number" value={values.tenderNumber} onChange={value => update("tenderNumber", value)} />
        <Field label="Submission deadline" type="date" value={values.submissionDeadline} onChange={value => update("submissionDeadline", value)} />
        <Field label="Tender expiry" type="date" value={values.tenderExpiry} onChange={value => update("tenderExpiry", value)} />
        <Field label="Bid bond/payment" value={values.bidBond || values.paymentTerms} onChange={value => { update("bidBond", value); update("paymentTerms", value); }} />
        <Field label="Project code" value={values.projectCode} onChange={value => update("projectCode", value)} />
        <Field label="Linked project" value={values.linkedProject} onChange={value => update("linkedProject", value)} />
        <TextField label="Tender checklist" value={values.checklist} onChange={value => update("checklist", value)} />
        <TextField label="Department sub-quotations" value={values.departmentQuotes} onChange={value => update("departmentQuotes", value)} />
        <TextField label="Milestone billing schedule" value={values.milestoneSchedule} onChange={value => update("milestoneSchedule", value)} />
        <TextField label="Lines: product|sku|qty|price|cost|discount|location|min|forecast|actual|batch|expiry" value={lineText} onChange={setLineText} className="sm:col-span-2" />
      </div>
      <div className="flex justify-end gap-2 border-t bg-slate-50/70 px-5 py-4 dark:bg-slate-900/30"><Button variant="secondary" onClick={onClose}>Cancel</Button><Button onClick={save}><Save className="h-4 w-4" />Save workflow</Button></div>
    </div>
  </div>;
}

function blankWorkflow(pathway: SalesPathwayKey, current?: SalesWorkflowRecord): SalesWorkflowRecord {
  const prefix = salesWorkflowPathways[pathway].shortLabel.toUpperCase().replace(/[^A-Z]/g, "") || "SWF";
  return {
    id: current?.id ?? `${prefix}-${Date.now()}`,
    pathway,
    reference: current?.reference ?? `${prefix}-2026-${String(Date.now() % 10000).padStart(4, "0")}`,
    title: current?.title ?? "",
    customer: current?.customer ?? "",
    owner: current?.owner ?? "",
    stageIndex: current?.pathway === pathway ? current.stageIndex : 0,
    approvalStatus: current?.approvalStatus ?? "Not required",
    status: current?.status ?? "Draft",
    outcome: current?.outcome ?? "",
    reason: current?.reason ?? "",
    qualificationNotes: current?.qualificationNotes ?? "",
    specialistValidation: current?.specialistValidation ?? "Pending",
    contractNumber: current?.contractNumber ?? "",
    principal: current?.principal ?? "",
    tenderNumber: current?.tenderNumber ?? "",
    tenderExpiry: current?.tenderExpiry ?? "",
    submissionDeadline: current?.submissionDeadline ?? "",
    bidBond: current?.bidBond ?? "",
    paymentTerms: current?.paymentTerms ?? "",
    checklist: current?.checklist ?? "",
    projectCode: current?.projectCode ?? "",
    linkedProject: current?.linkedProject ?? "",
    departmentQuotes: current?.departmentQuotes ?? "",
    milestoneSchedule: current?.milestoneSchedule ?? "",
    lines: current?.lines ?? [],
    documents: current?.documents ?? [],
    audit: current?.audit ?? [{ id: `audit-${Date.now()}`, time: new Date().toLocaleString("en-GB", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }), action: "CREATE", detail: "Workflow created locally" }]
  };
}

function workflowRow(record: SalesWorkflowRecord) {
  const totals = workflowTotals(record);
  return { Reference: record.reference, Pathway: salesWorkflowPathways[record.pathway].label, Title: record.title, Customer: record.customer, Owner: record.owner, Stage: currentStage(record), Approval: record.approvalStatus, Status: record.status, Outcome: record.outcome, Reason: record.reason, Gross: totals.gross, Discount: totals.discount, Net: totals.net, Cost: totals.cost, Margin: totals.margin, "Margin %": totals.marginPercent };
}

function currentStage(record: SalesWorkflowRecord) {
  return salesWorkflowPathways[record.pathway].stages[record.stageIndex] ?? "Unknown";
}

function documentOptions(pathway: SalesPathwayKey) {
  if (pathway === "sfs") return ["Sales Order", "Delivery / Reservation", "Invoice Draft", "Commission Draft"];
  if (pathway === "gpprr") return ["Initial Delivery Order", "Recurring Delivery SO", "Monthly Invoice", "Final Reconciliation"];
  if (pathway === "tender") return ["Tender Submission", "LPO / Signing", "Procurement Trigger", "Scheduled Delivery", "Batch Compliance Pack"];
  return ["Project Link", "Project Invoice Drafts"];
}

function fieldRows(record: SalesWorkflowRecord): Array<[string, string]> {
  const base: Array<[string, string]> = [["Current stage", currentStage(record)], ["Status", record.status], ["Outcome", record.outcome || "-"], ["Reason", record.reason || "-"]];
  if (record.pathway === "gpprr") return [...base, ["Contract", record.contractNumber || "-"], ["Principal", record.principal || "-"]];
  if (record.pathway === "tender") return [...base, ["Tender number", record.tenderNumber || "-"], ["Deadline", record.submissionDeadline || "-"], ["Validity/expiry", record.tenderExpiry || "-"], ["Bid bond/payment", record.bidBond || record.paymentTerms || "-"], ["Checklist", record.checklist || "-"]];
  if (record.pathway === "pso") return [...base, ["Project code", record.projectCode || "-"], ["Linked project", record.linkedProject || "-"], ["Department quotes", record.departmentQuotes || "-"], ["Milestone billing", record.milestoneSchedule || "-"]];
  return [...base, ["Qualification", record.qualificationNotes || "-"], ["Specialist validation", record.specialistValidation || "-"]];
}

function SummaryCard({ label, value, warning }: { label: string; value: string; warning?: boolean }) {
  return <div className={cn("rounded-xl border p-4", warning && "border-amber-300 bg-amber-50 dark:bg-amber-950/20")}><div className="text-[10px] font-bold uppercase text-[var(--muted)]">{label}</div><div className="mt-2 text-sm font-bold">{value}</div></div>;
}

function Panel({ title, children, className }: { title: string; children: ReactNode; className?: string }) {
  return <div className={cn("rounded-xl border bg-[var(--panel)] p-4", className)}><div className="mb-3 text-xs font-bold">{title}</div>{children}</div>;
}

function InfoRows({ rows }: { rows: Array<[string, string]> }) {
  return <div className="space-y-2 text-xs">{rows.map(([label, value]) => <div key={label} className="grid grid-cols-[130px_1fr] gap-3"><span className="text-[var(--muted)]">{label}</span><span className="whitespace-pre-wrap font-medium">{value}</span></div>)}</div>;
}

function Field({ label, value, onChange, type = "text", placeholder }: { label: string; value: string; onChange: (value: string) => void; type?: string; placeholder?: string }) {
  return <label><span className="mb-1.5 block text-[11px] font-semibold text-[var(--muted)]">{label}</span><input type={type} value={value} onChange={event => onChange(event.target.value)} placeholder={placeholder} className="h-10 w-full rounded-xl border bg-[var(--panel)] px-3 text-sm outline-none focus:border-medtech-red" /></label>;
}

function TextField({ label, value, onChange, className }: { label: string; value: string; onChange: (value: string) => void; className?: string }) {
  return <label className={className}><span className="mb-1.5 block text-[11px] font-semibold text-[var(--muted)]">{label}</span><textarea value={value} onChange={event => onChange(event.target.value)} className="min-h-24 w-full rounded-xl border bg-[var(--panel)] px-3 py-2 text-sm outline-none focus:border-medtech-red" /></label>;
}

function formatMoney(value: number) {
  return `QAR ${Math.round(value).toLocaleString("en-US")}`;
}

