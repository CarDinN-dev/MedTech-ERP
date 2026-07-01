"use client";

import { useMemo, useRef, useState } from "react";
import { CheckCircle2, Download, FileSpreadsheet, Play, ShieldCheck, Upload } from "lucide-react";
import { appendAuditLog } from "@/lib/audit-store";
import { createDemoRecord, readDemoRecordsSnapshot, useDemoRecords, writeDemoRecordsSnapshot } from "@/lib/demo-store";
import { exportToExcel, parseExcel } from "@/lib/export/excel";
import { buildInvoiceXmlPreview, getSimulatorConfig, parseDelimitedRows, simulatorConfigs, validateSimulatorRows, type SimulatorId, type SimulatorRow } from "@/lib/local-integration-simulators";
import { cn } from "@/lib/utils";
import { Button, StatusBadge } from "@/components/ui";

const runColumns = ["Time", "Simulator", "Action", "Rows", "Errors", "Target", "External calls", "Status"];
const seedRuns = [{ Time: "20 Jun 2026, 10:00", Simulator: "Integration safety check", Action: "VERIFY", Rows: "12", Errors: "0", Target: "Local browser storage", "External calls": "0", Status: "Local Demo Only" }];

export function IntegrationSimulatorsWorkspace() {
  const [activeId, setActiveId] = useState<SimulatorId>("bank-statement");
  const [input, setInput] = useState(getSimulatorConfig("bank-statement").sample);
  const [errors, setErrors] = useState<Array<{ row: number; message: string }>>([]);
  const [summary, setSummary] = useState("Ready. Local Demo Only.");
  const [xmlPreview, setXmlPreview] = useState("");
  const [toast, setToast] = useState("");
  const importRef = useRef<HTMLInputElement>(null);
  const runs = useDemoRecords("integration-simulators:Runs", seedRuns);
  const config = getSimulatorConfig(activeId);
  const rows = useMemo(() => parseDelimitedRows(input), [input]);
  const recentRuns = runs.records.slice(0, 8);

  const notify = (message: string) => { setToast(message); window.setTimeout(() => setToast(""), 2400); };
  const open = (id: SimulatorId) => { const next = getSimulatorConfig(id); setActiveId(id); setInput(next.sample); setErrors([]); setXmlPreview(""); setSummary("Ready. Local Demo Only."); };
  const loadFile = async (file?: File) => {
    if (!file) return;
    const loaded = file.name.toLowerCase().endsWith(".csv") || file.name.toLowerCase().endsWith(".txt")
      ? parseDelimitedRows(await file.text())
      : (await parseExcel<SimulatorRow>(file, row => Object.fromEntries(Object.entries(row as Record<string, unknown>).map(([key, value]) => [key, String(value ?? "")])))).valid;
    setInput(toDelimited(loaded));
    setSummary(`${loaded.length} row${loaded.length === 1 ? "" : "s"} loaded from ${file.name}. Not imported yet.`);
    if (importRef.current) importRef.current.value = "";
  };
  const run = async () => {
    const result = validateSimulatorRows(activeId, rows);
    setErrors(result.errors);
    if (!result.valid.length) {
      setSummary(`0 local records created. ${result.errors.length} validation error${result.errors.length === 1 ? "" : "s"}.`);
      return;
    }
    writeLocalRecords(config.targetKey, result.valid);
    if (activeId === "e-invoicing") setXmlPreview(buildInvoiceXmlPreview(result.valid[0]));
    if (activeId === "wps-export") await exportToExcel(result.valid, "local-demo-wps-export", "WPS Export");
    if (activeId === "power-bi-export") await exportToExcel(result.valid, "local-demo-data-export", "Data Export");
    const runRecord = { Time: new Date().toLocaleString("en-GB", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }), Simulator: config.title, Action: config.action, Rows: String(result.valid.length), Errors: String(result.errors.length), Target: config.targetKey, "External calls": "0", Status: "Local Demo Only" };
    runs.create(runRecord);
    appendAuditLog({ action: config.action, module: "Local Integration Simulators", record: config.title, details: `${result.valid.length} local row(s), ${result.errors.length} rejected, target ${config.targetKey}. External calls: 0.` });
    setSummary(`${result.valid.length} local record${result.valid.length === 1 ? "" : "s"} created. ${result.errors.length} row${result.errors.length === 1 ? "" : "s"} rejected. External calls: 0.`);
    notify(`${config.title} completed locally`);
  };

  return <div className="space-y-5">
    <div className="rounded-2xl border border-teal-200 bg-teal-50 p-4 text-teal-950 dark:border-teal-900 dark:bg-teal-950/30 dark:text-teal-100">
      <div className="flex flex-wrap items-center gap-2 text-xs font-bold uppercase tracking-[.14em]"><ShieldCheck className="h-4 w-4" /> Local Demo Only</div>
      <p className="mt-2 text-sm">These simulators only read browser files, write local demo records, and audit the action. No API keys, service clients, webhooks, or network calls are used.</p>
    </div>

    <section className="grid gap-5 xl:grid-cols-[330px_1fr]">
      <div className="overflow-hidden rounded-2xl border bg-[var(--panel)] shadow-soft">
        <div className="border-b px-4 py-3 text-xs font-bold">Simulator screens</div>
        <div className="max-h-[680px] overflow-y-auto p-2">
          {simulatorConfigs.map(item => <button key={item.id} onClick={() => open(item.id)} className={cn("mb-1 w-full rounded-xl px-3 py-3 text-left transition hover:bg-slate-50 dark:hover:bg-slate-800", activeId === item.id && "bg-teal-50 text-teal-800 ring-1 ring-teal-200 dark:bg-teal-950/30 dark:text-teal-100 dark:ring-teal-900")}>
            <div className="flex items-center gap-2"><span className="text-xs font-bold">{item.title}</span><span className="ml-auto rounded-full bg-slate-100 px-2 py-0.5 text-[9px] font-bold text-slate-500 dark:bg-slate-800">Local Demo Only</span></div>
            <div className="mt-1 text-[11px] text-[var(--muted)]">{item.output}</div>
          </button>)}
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border bg-[var(--panel)] shadow-soft">
        <div className="flex flex-col gap-3 border-b px-5 py-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className="mb-1 flex flex-wrap items-center gap-2 text-[10px] font-bold uppercase tracking-[.14em] text-slate-400"><StatusBadge>Local Demo Only</StatusBadge><span>External calls: 0</span></div>
            <h2 className="text-lg font-bold">{config.title}</h2>
            <p className="mt-1 text-xs text-[var(--muted)]">{config.production}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <input ref={importRef} type="file" accept=".csv,.txt,.xlsx,.xls" className="hidden" onChange={event => loadFile(event.target.files?.[0])} />
            <Button variant="secondary" onClick={() => importRef.current?.click()}><Upload className="h-4 w-4" /> File import</Button>
            <Button variant="secondary" onClick={() => setInput(config.sample)}><FileSpreadsheet className="h-4 w-4" /> Sample</Button>
            <Button onClick={run}><Play className="h-4 w-4" /> Run local simulation</Button>
          </div>
        </div>

        <div className="grid gap-4 p-5 lg:grid-cols-[1fr_320px]">
          <label className="block">
            <span className="mb-2 block text-[10px] font-bold uppercase tracking-wide text-slate-400">Manual input or pasted CSV</span>
            <textarea value={input} onChange={event => setInput(event.target.value)} className="h-[230px] w-full resize-y rounded-xl border bg-[var(--panel)] p-3 font-mono text-xs outline-none focus:border-teal-500" spellCheck={false} />
          </label>
          <div className="rounded-xl border bg-slate-50 p-4 text-xs dark:bg-slate-900/40">
            <div className="font-bold">Validation</div>
            <div className="mt-3 space-y-2 text-[var(--muted)]">
              <div><b className="text-[var(--text)]">Required:</b> {config.required.join(", ")}</div>
              <div><b className="text-[var(--text)]">Input:</b> {config.input}</div>
              <div><b className="text-[var(--text)]">Target:</b> {config.targetKey}</div>
              <div><b className="text-[var(--text)]">Rows parsed:</b> {rows.length}</div>
            </div>
            <div className="mt-4 rounded-lg bg-white p-3 dark:bg-slate-950/30"><div className="font-semibold text-[var(--text)]">Summary</div><div className="mt-1 text-[var(--muted)]">{summary}</div></div>
          </div>
        </div>

        {errors.length > 0 && <div className="border-y border-amber-200 bg-amber-50 px-5 py-3 text-xs text-amber-900 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-200">
          <div className="font-semibold">Validation errors</div>
          <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1">{errors.slice(0, 8).map(error => <span key={`${error.row}-${error.message}`}>Row {error.row}: {error.message}</span>)}</div>
        </div>}

        {xmlPreview && <div className="border-b px-5 py-4">
          <div className="mb-2 flex items-center justify-between"><div className="text-xs font-bold">XML preview</div><Button variant="ghost" onClick={() => downloadText(xmlPreview, "local-demo-e-invoice.xml")}><Download className="h-4 w-4" /> XML</Button></div>
          <pre className="max-h-[260px] overflow-auto rounded-xl border bg-slate-950 p-4 text-xs text-teal-100">{xmlPreview}</pre>
        </div>}

        <div className="overflow-x-auto">
          <table className="w-full min-w-[860px] text-left text-xs">
            <thead><tr className="border-b bg-slate-50/70 dark:bg-slate-900/40">{runColumns.map(column => <th key={column} className="px-4 py-3 text-[10px] font-bold uppercase tracking-wide text-slate-400">{column}</th>)}</tr></thead>
            <tbody className="divide-y">{recentRuns.map(record => <tr key={record.__id}>{runColumns.map(column => <td key={column} className="px-4 py-3">{column === "Status" ? <StatusBadge>{record[column]}</StatusBadge> : record[column]}</td>)}</tr>)}</tbody>
          </table>
        </div>
      </div>
    </section>
    {toast && <div role="status" className="fixed bottom-5 right-5 z-[100] flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-3 text-xs font-medium text-white shadow-panel animate-in"><CheckCircle2 className="h-4 w-4 text-teal-400" />{toast}</div>}
  </div>;
}

function writeLocalRecords(key: string, rows: SimulatorRow[]) {
  const current = readDemoRecordsSnapshot(key, []);
  writeDemoRecordsSnapshot(key, [...rows.map((row, index) => createDemoRecord(row, index)), ...current]);
}

function toDelimited(rows: SimulatorRow[]) {
  const headers = Array.from(new Set(rows.flatMap(row => Object.keys(row))));
  return [headers.join(","), ...rows.map(row => headers.map(header => csv(row[header] ?? "")).join(","))].join("\n");
}

function csv(value: string) {
  return /[",\n]/.test(value) ? `"${value.replaceAll('"', '""')}"` : value;
}

function downloadText(text: string, filename: string) {
  const url = URL.createObjectURL(new Blob([text], { type: "application/xml" }));
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  appendAuditLog({ action: "EXPORT XML", module: "Local Integration Simulators", record: filename, details: "Local Demo Only XML preview downloaded. External calls: 0." });
}
