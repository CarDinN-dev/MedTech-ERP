"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createClientId } from "@/lib/ids";

export type DemoRecord = Record<string, string> & { __id: string; __createdAt?: string };

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
  "hr-operations:Leave:Rejoin": "v4"
};

export const demoRecordsStorageKey = (moduleKey: string) => `medtech-demo:${moduleKey}:records:${dataVersions[moduleKey] ?? "v2"}`;

export function createDemoRecord(record: Record<string, string>, index = 0): DemoRecord {
  return { ...record, __id: `${Date.now()}-${index}-${Math.random().toString(36).slice(2, 8)}`, __createdAt: new Date().toISOString() };
}

function normalize(rows: Array<Record<string, string>>): DemoRecord[] {
  return rows.map((row, index) => createDemoRecord(row, index));
}

export function readDemoRecordsSnapshot(moduleKey: string, seedRows: Array<Record<string, string>>) {
  try {
    const stored = localStorage.getItem(demoRecordsStorageKey(moduleKey));
    return stored ? JSON.parse(stored) as DemoRecord[] : normalize(seedRows);
  } catch {
    return normalize(seedRows);
  }
}

export function writeDemoRecordsSnapshot(moduleKey: string, records: DemoRecord[]) {
  localStorage.setItem(demoRecordsStorageKey(moduleKey), JSON.stringify(records));
}

export function useDemoRecords(moduleKey: string, seedRows: Array<Record<string, string>>) {
  const initial = useMemo(() => normalize(seedRows), [moduleKey]);
  const [records, setRecords] = useState<DemoRecord[]>(initial);
  const [ready, setReady] = useState(false);
  const lastSerialized = useRef("");

  useEffect(() => {
    try {
      const stored = localStorage.getItem(demoRecordsStorageKey(moduleKey));
      const loaded: DemoRecord[] = stored ? JSON.parse(stored) : initial;
      setRecords(moduleKey === "admin:Users" ? loaded.map(record => record.Email?.toLowerCase() === "admin@medtech.qa" ? { ...record, User: "Kashif" } : record) : loaded);
      lastSerialized.current = JSON.stringify(loaded);
    } catch { setRecords(initial); }
    setReady(true);
  }, [moduleKey, initial]);

  useEffect(() => {
    if (!ready) return;
    const serialized = JSON.stringify(records);
    if (serialized === lastSerialized.current) return;
    localStorage.setItem(demoRecordsStorageKey(moduleKey), serialized);
    lastSerialized.current = serialized;
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
  const reset = useCallback(() => { localStorage.removeItem(demoRecordsStorageKey(moduleKey)); setRecords(normalize(seedRows)); }, [moduleKey, seedRows]);

  return { records, ready, create, update, remove, importMany, upsertMany, reset };
}

export function resetAllDemoData() {
  Object.keys(localStorage).filter(key => key.startsWith("medtech-demo:") && key !== "medtech-demo:session").forEach(key => localStorage.removeItem(key));
  window.location.reload();
}
