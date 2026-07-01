"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createClientId } from "@/lib/ids";

export type DemoRecord = Record<string, string> & { __id: string; __createdAt?: string };
type StoredDataset = DemoRecord[] | { __meta?: { schemaVersion?: number; dataVersion?: string; updatedAt?: string }; records?: unknown };
export const DEMO_SCHEMA_VERSION = 3;
const MAX_BACKUP_ITEMS = 500;
const MAX_BACKUP_VALUE_BYTES = 1_000_000;

const dataVersions: Record<string, string> = {
  "sales:Universal Enquiry Pool": "v1",
  "sales:BANT Qualification": "v1",
  "sales:Lead Claims": "v1",
  "sales:Opportunities": "v1",
  "sales:Customer Master": "v6",
  "procurement:Supplier Master": "v6",
  "inventory:Product Master": "v6",
  "procurement:Purchase Requests": "v1",
  "procurement:RFQs": "v4",
  "procurement:Supplier Comparison": "v2",
  "procurement:Purchase Orders": "v1",
  "procurement:Goods Receipts": "v2",
  "procurement:Vendor Bills": "v1",
  "procurement:PO Documents": "v1",
  "quality:Customer Returns / RMA": "v1",
  "quality:Supplier Returns": "v1",
  "quality:Product Complaints": "v1",
  "quality:Batch Recall": "v1",
  "quality:QC Inspection": "v1",
  "quality:Regulatory Registration Tracker": "v1",
  "quality:Certificates / Documents": "v1",
  "quality:CAPA Tracker": "v1",
  "finance:Customer Invoices": "v3",
  "finance:Vendor Bills": "v3",
  "finance:Payments": "v3",
  "finance:Credit Notes": "v3",
  "finance:Debit Notes": "v3",
  "finance:Chart of Accounts": "v1",
  "finance:Journal Types": "v1",
  "finance:Tax/VAT Setup": "v1",
  "finance:Posting Rules": "v1",
  "finance:Accounting Periods": "v1",
  "finance:Source Document Mapping": "v1",
  "finance:Journals": "v4",
  "finance:Bank Reconciliation Import": "v3",
  "finance:Fixed Assets": "v3",
  "finance:FX Revaluation": "v3",
  "finance:Advance / Progress / Retention Invoices": "v3",
  "finance:Financial Reports": "v3",
  "projects:Projects": "v10",
  "projects:Project Tasks": "v10",
  "projects:Milestones": "v10",
  "projects:Department Sub-Quotations": "v10",
  "projects:Budgets": "v10",
  "projects:Deliverables": "v10",
  "projects:Milestone Billing": "v10",
  "projects:Retention Tracking": "v10",
  "projects:Project Documents": "v10",
  "projects:Project Closure": "v10",
  "admin:Document Sequences": "v12",
  "documents:Template List": "v12",
  "documents:Generated Documents": "v12",
  "documents:Attachments": "v1",
  "documents:Version History": "v1",
  "documents:Document Expiry Tracker": "v1",
  "documents:Local Archive": "v1",
  "hr-enterprise:Contracts": "v11",
  "hr-enterprise:Probation Reviews": "v11",
  "hr-enterprise:Access Provisioning": "v12",
  "hr-enterprise:Attendance Exceptions": "v11",
  "hr-enterprise:Business Trips": "v11",
  "hr-enterprise:Employee Expenses": "v11",
  "hr-enterprise:Performance/Appraisals": "v11",
  "hr-enterprise:eLearning": "v11",
  "hr-enterprise:EOS / Gratuity / Final Settlement": "v11",
  "hr-enterprise:Payroll Accounting Draft Journal": "v11",
  "inventory:Products": "v1",
  "inventory:Stock On Hand": "v1",
  "inventory:Lots / Batches / Serials": "v1",
  "inventory:Stock Movements": "v1",
  "inventory:Transfers": "v1",
  "inventory:Reservations": "v1",
  "inventory:Cycle Counts": "v1",
  "inventory:Expiry Alerts": "v1",
  "inventory:Quarantine / QC": "v1",
  "inventory:Engineer Stock": "v1",
  "inventory:Bundled Kits": "v1",
  "shipping:Delivery Orders": "v1",
  "shipping:Pick Lists": "v1",
  "shipping:Packing Lists": "v1",
  "shipping:Shipments": "v1",
  "shipping:Partial Deliveries / Backorders": "v1",
  "shipping:Proof of Delivery": "v1",
  "shipping:Customs / Clearance Documents": "v1",
  "shipping:Installation Delivery Handover": "v1",
  "shipping:Delivery Exceptions": "v1",
  "shipping:Shipping Dashboard": "v1",
  "service:Service Requests": "v1",
  "service:Job Pool": "v3",
  "service:Engineer Dispatch": "v3",
  "service:Field Service Jobs": "v1",
  "service:Spare Parts Requests": "v1",
  "service:AMC Contracts": "v3",
  "service:Maintenance Schedules": "v1",
  "service:Service Reports": "v1",
  "service:Customer Sign-Off": "v1",
  "service:Service Invoicing Drafts": "v1",
  "hr-enterprise:Self service": "v3",
  "hr-enterprise:Settings": "v3",
  "hr-operations:Leave:Annual Planner": "v4",
  "hr-operations:Leave:Applications": "v5",
  "hr-operations:Leave:Approvals": "v4",
  "hr-operations:Leave:Leave Handover": "v4",
  "hr-operations:Leave:Clearance": "v4",
  "hr-operations:Leave:Rejoin": "v4",
  "alerts:Alerts": "v2"
};

export const demoRecordsStorageKey = (moduleKey: string) => `medtech-demo:${moduleKey}:records:${dataVersions[moduleKey] ?? "v2"}`;

export function createDemoRecord(record: Record<string, string>, index = 0): DemoRecord {
  return { ...record, __id: `${Date.now()}-${index}-${Math.random().toString(36).slice(2, 8)}`, __createdAt: new Date().toISOString() };
}

function normalize(rows: Array<Record<string, string>>): DemoRecord[] {
  return rows.map((row, index) => createDemoRecord(row, index));
}

function safeParse(value: string | null): StoredDataset | null {
  if (!value) return null;
  try { return JSON.parse(value) as StoredDataset; } catch { return null; }
}

function recordsFromStored(stored: StoredDataset | null) {
  if (Array.isArray(stored)) return stored;
  return Array.isArray(stored?.records) ? stored.records as Array<Record<string, string>> : null;
}

function migrateRecords(rows: Array<Record<string, string>>, seedRows: Array<Record<string, string>>) {
  const columns = Array.from(new Set(seedRows.flatMap(row => Object.keys(row)).filter(column => !column.startsWith("__"))));
  return rows.map((row, index) => {
    const migrated = { ...Object.fromEntries(columns.map(column => [column, String(row[column] ?? "")])), ...row };
    return { ...migrated, __id: row.__id || createClientId(), __createdAt: row.__createdAt || new Date(Date.now() + index).toISOString() } as DemoRecord;
  });
}

function legacyStorageKey(moduleKey: string) {
  const prefix = `medtech-demo:${moduleKey}:records:`;
  try {
    return Object.keys(localStorage).filter(key => key.startsWith(prefix)).sort().at(-1) ?? null;
  } catch { return null; }
}

function removeDataset(moduleKey: string) {
  Object.keys(localStorage).filter(key => key.startsWith(`medtech-demo:${moduleKey}:records:`)).forEach(key => localStorage.removeItem(key));
}

function datasetPayload(moduleKey: string, records: DemoRecord[]) {
  return JSON.stringify({ __meta: { schemaVersion: DEMO_SCHEMA_VERSION, dataVersion: dataVersions[moduleKey] ?? "v2", updatedAt: new Date().toISOString() }, records });
}

export function readDemoRecordsSnapshot(moduleKey: string, seedRows: Array<Record<string, string>>) {
  const fallback = normalize(seedRows);
  try {
    const key = demoRecordsStorageKey(moduleKey);
    const stored = recordsFromStored(safeParse(localStorage.getItem(key)));
    if (stored) return migrateRecords(stored, seedRows);
    const legacyKey = legacyStorageKey(moduleKey);
    if (!legacyKey || legacyKey === key) return fallback;
    const legacy = recordsFromStored(safeParse(localStorage.getItem(legacyKey)));
    return legacy ? migrateRecords(legacy, seedRows) : fallback;
  } catch {
    return fallback;
  }
}

export function writeDemoRecordsSnapshot(moduleKey: string, records: DemoRecord[]) {
  localStorage.setItem(demoRecordsStorageKey(moduleKey), datasetPayload(moduleKey, records));
}

export function useDemoRecords(moduleKey: string, seedRows: Array<Record<string, string>>) {
  const initial = useMemo(() => normalize(seedRows), [seedRows]);
  const [records, setRecords] = useState<DemoRecord[]>(initial);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState("");
  const lastSerialized = useRef("");

  useEffect(() => {
    setReady(false);
    setError("");
    try {
      const loaded = readDemoRecordsSnapshot(moduleKey, seedRows);
      setRecords(moduleKey === "admin:Users" ? loaded.map(record => record.Email?.toLowerCase() === "admin@medtech.qa" ? { ...record, User: "Kashif" } : record) : loaded);
      lastSerialized.current = datasetPayload(moduleKey, loaded);
    } catch { setRecords(initial); setError("Local demo data was reset because it could not be read."); }
    setReady(true);
  }, [moduleKey, seedRows, initial]);

  useEffect(() => {
    if (!ready) return;
    const serialized = datasetPayload(moduleKey, records);
    if (serialized === lastSerialized.current) return;
    try {
      localStorage.setItem(demoRecordsStorageKey(moduleKey), serialized);
      lastSerialized.current = serialized;
    } catch { setError("Local demo data could not be saved. Export a backup before adding more records."); }
  }, [moduleKey, ready, records]);

  const create = useCallback((record: Record<string, string>) => {
    const next: DemoRecord = { ...record, __id: createClientId(), __createdAt: new Date().toISOString() };
    setRecords(current => [next, ...current]); return next;
  }, []);
  const update = useCallback((id: string, record: Record<string, string>) => setRecords(current => current.map(item => item.__id === id ? { ...item, ...record } : item)), []);
  const remove = useCallback((id: string) => setRecords(current => current.filter(item => item.__id !== id)), []);
  const importMany = useCallback((items: Array<Record<string, string>>) => setRecords(current => [...normalize(items), ...current]), []);
  const upsertMany = useCallback((key: string, items: Array<Record<string, string>>) => setRecords(current => {
    const byKey = new Map(current.map(item => [item[key], item]));
    const updated = items.map((item, index) => {
      const existing = byKey.get(item[key]);
      return existing ? { ...existing, ...item } : createDemoRecord(item, index);
    });
    const importedKeys = new Set(items.map(item => item[key]));
    return [...updated, ...current.filter(item => !importedKeys.has(item[key]))];
  }), []);
  const reset = useCallback(() => { removeDataset(moduleKey); setRecords(normalize(seedRows)); }, [moduleKey, seedRows]);

  return { records, ready, error, create, update, remove, importMany, upsertMany, reset };
}

export function resetAllDemoData() {
  Object.keys(localStorage).filter(key => key.startsWith("medtech-demo:") && key !== "medtech-demo:session").forEach(key => localStorage.removeItem(key));
  window.location.reload();
}

export function resetDemoModule(moduleKey: string) {
  Object.keys(localStorage).filter(key => key.startsWith(`medtech-demo:${moduleKey}:`)).forEach(key => localStorage.removeItem(key));
}

export function localDemoStorageStats() {
  let bytes = 0;
  const keys = Object.keys(localStorage).filter(key => key.startsWith("medtech-demo:") && key !== "medtech-demo:session");
  keys.forEach(key => { bytes += key.length + (localStorage.getItem(key)?.length ?? 0); });
  return { keys: keys.length, bytes, kb: Math.round(bytes / 10.24) / 100, schemaVersion: DEMO_SCHEMA_VERSION };
}

export function exportLocalDemoData() {
  const items = Object.fromEntries(Object.keys(localStorage).filter(key => key.startsWith("medtech-demo:") && key !== "medtech-demo:session").map(key => [key, localStorage.getItem(key) ?? ""]));
  return { app: "medtech-erp-local-demo", schemaVersion: DEMO_SCHEMA_VERSION, exportedAt: new Date().toISOString(), items };
}

export function importLocalDemoData(backup: unknown) {
  const items = validateLocalDemoBackup(backup);
  const entries = Object.entries(items);
  Object.keys(localStorage).filter(key => key.startsWith("medtech-demo:") && key !== "medtech-demo:session").forEach(key => localStorage.removeItem(key));
  entries.forEach(([key, value]) => {
    if (!key.startsWith("medtech-demo:") || key === "medtech-demo:session") return;
    localStorage.setItem(key, value);
  });
  return { importedItems: entries.length };
}

export function validateLocalDemoBackup(backup: unknown) {
  if (!backup || typeof backup !== "object" || Array.isArray(backup)) throw new Error("Invalid local demo backup JSON");
  const candidate = backup as { schemaVersion?: unknown; items?: unknown };
  if (candidate.schemaVersion !== undefined && Number(candidate.schemaVersion) > DEMO_SCHEMA_VERSION) throw new Error("Backup schema version is newer than this app");
  if (!candidate.items || typeof candidate.items !== "object" || Array.isArray(candidate.items)) throw new Error("Invalid local demo backup JSON");
  const items = candidate.items as Record<string, unknown>;
  const entries = Object.entries(items).filter(([key]) => key.startsWith("medtech-demo:") && key !== "medtech-demo:session");
  if (entries.length > MAX_BACKUP_ITEMS) throw new Error("Local demo backup has too many items");
  const safeItems: Record<string, string> = {};
  entries.forEach(([key, value]) => {
    if (typeof value !== "string") throw new Error(`Invalid local demo backup item: ${key}`);
    if (value.length > MAX_BACKUP_VALUE_BYTES) throw new Error(`Local demo backup item is too large: ${key}`);
    const parsed = safeJson(value, key);
    if (key.includes(":records:")) validateRecordsPayload(parsed, key);
    safeItems[key] = value;
  });
  return safeItems;
}

function safeJson(value: string, key: string) {
  try { return JSON.parse(value) as unknown; }
  catch { throw new Error(`Corrupted local demo backup item: ${key}`); }
}

function validateRecordsPayload(value: unknown, key: string) {
  const rows = Array.isArray(value) ? value : Array.isArray((value as { records?: unknown } | null)?.records) ? (value as { records: unknown[] }).records : null;
  if (!rows) throw new Error(`Invalid records payload in backup item: ${key}`);
  rows.slice(0, 20).forEach((row, index) => {
    if (!row || typeof row !== "object" || Array.isArray(row)) throw new Error(`Invalid record ${index + 1} in backup item: ${key}`);
  });
}
