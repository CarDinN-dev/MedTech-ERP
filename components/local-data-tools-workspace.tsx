"use client";

import { useEffect, useRef, useState } from "react";
import { DatabaseBackup, Download, HardDrive, RefreshCw, RotateCcw, Upload } from "lucide-react";
import { Button } from "@/components/ui";
import { downloadBlob } from "@/lib/client-download";
import { exportLocalDemoData, importLocalDemoData, localDemoStorageStats, resetAllDemoData, resetDemoModule } from "@/lib/demo-store";
import { getModule, moduleKeys } from "@/lib/erp-data";
import { appendAuditLog } from "@/lib/audit-store";

export function LocalDataToolsWorkspace() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [moduleKey, setModuleKey] = useState("sales");
  const [stats, setStats] = useState(() => ({ keys: 0, bytes: 0, kb: 0, schemaVersion: 0 }));
  const [message, setMessage] = useState("");

  const refresh = () => setStats(localDemoStorageStats());
  useEffect(refresh, []);

  const notify = (text: string) => { setMessage(text); window.setTimeout(() => setMessage(""), 2600); refresh(); };
  const exportData = (name: string) => {
    downloadBlob(new Blob([JSON.stringify(exportLocalDemoData(), null, 2)], { type: "application/json" }), name);
    appendAuditLog({ action: "EXPORT BACKUP", module: "Administration", record: "Local demo data", details: `${stats.keys} local demo item(s) exported`, severity: "warning" });
    notify("Local demo data exported");
  };
  const importData = async (file?: File) => {
    if (!file) return;
    try {
      if (!file.name.toLowerCase().endsWith(".json") || !["application/json", ""].includes(file.type)) throw new Error("Only JSON backup files are allowed");
      if (file.size > 2 * 1024 * 1024) throw new Error("Backup exceeds the 2 MB local-demo import limit");
      const result = importLocalDemoData(JSON.parse(await file.text()));
      appendAuditLog({ action: "RESTORE BACKUP", module: "Administration", record: file.name, details: `${result.importedItems} local demo item(s) restored`, severity: "critical" });
      notify("Local demo backup imported. Reloading...");
      window.setTimeout(() => window.location.reload(), 500);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Import failed";
      appendAuditLog({ action: "RESTORE BACKUP", module: "Administration", record: file.name, details: message, result: "failure", severity: "high" });
      notify(message);
    }
  };
  const resetModule = () => {
    resetDemoModule(moduleKey);
    appendAuditLog({ action: "RESET MODULE DATA", module: "Administration", record: getModule(moduleKey)?.title ?? moduleKey, details: "One local demo module reset", severity: "warning" });
    notify(`${getModule(moduleKey)?.title ?? moduleKey} reset`);
  };
  const resetAll = () => {
    appendAuditLog({ action: "RESET ALL DEMO DATA", module: "Administration", record: "Local demo data", details: "All local demo data reset from Local Data Tools", severity: "critical" });
    resetAllDemoData();
  };

  return <div className="p-5">
    <input ref={inputRef} type="file" accept="application/json,.json" className="hidden" onChange={event => importData(event.target.files?.[0])} />
    <div className="grid gap-4 lg:grid-cols-3">
      <section className="rounded-2xl border p-4">
        <div className="mb-4 flex items-center gap-3"><DatabaseBackup className="h-5 w-5 text-teal-600" /><h2 className="text-sm font-bold">Backup / Restore</h2></div>
        <div className="flex flex-wrap gap-2">
          <Button onClick={() => exportData(`medtech-local-backup-${Date.now()}.json`)}><Download className="h-4 w-4" /> Export All Local Data</Button>
          <Button variant="secondary" onClick={() => exportData(`medtech-demo-data-${Date.now()}.json`)}><Download className="h-4 w-4" /> Export Demo Data JSON</Button>
          <Button variant="secondary" onClick={() => inputRef.current?.click()}><Upload className="h-4 w-4" /> Import Local Data Backup</Button>
        </div>
      </section>
      <section className="rounded-2xl border p-4">
        <div className="mb-4 flex items-center gap-3"><RotateCcw className="h-5 w-5 text-amber-600" /><h2 className="text-sm font-bold">Reset</h2></div>
        <div className="flex flex-wrap gap-2">
          <select value={moduleKey} onChange={event => setModuleKey(event.target.value)} className="h-9 rounded-lg border bg-[var(--panel)] px-3 text-sm">
            {moduleKeys.map(key => <option key={key} value={key}>{getModule(key)?.title ?? key}</option>)}
          </select>
          <Button variant="secondary" onClick={resetModule}>Reset One Module</Button>
          <Button variant="danger" onClick={resetAll}>Reset All Demo Data</Button>
        </div>
      </section>
      <section className="rounded-2xl border p-4">
        <div className="mb-4 flex items-center gap-3"><HardDrive className="h-5 w-5 text-blue-600" /><h2 className="text-sm font-bold">Local Storage</h2></div>
        <div className="grid grid-cols-3 gap-2 text-xs">
          <Metric label="Keys" value={String(stats.keys)} />
          <Metric label="Usage" value={`${stats.kb} KB`} />
          <Metric label="Schema" value={`v${stats.schemaVersion}`} />
        </div>
        <Button variant="ghost" className="mt-3 h-8 px-2 text-xs" onClick={refresh}><RefreshCw className="h-3.5 w-3.5" /> View Local Storage Usage</Button>
      </section>
    </div>
    {message && <div role="status" className="mt-4 rounded-lg bg-slate-900 px-4 py-3 text-xs font-medium text-white">{message}</div>}
  </div>;
}

function Metric({ label, value }: { label: string; value: string }) {
  return <div className="rounded-lg bg-slate-50 p-3 dark:bg-slate-900/50"><div className="text-[10px] font-bold uppercase tracking-wide text-slate-400">{label}</div><div className="mt-1 font-semibold">{value}</div></div>;
}
