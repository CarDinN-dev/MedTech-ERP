"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { createClientId } from "@/lib/ids";

export type DemoRecord = Record<string, string> & { __id: string; __createdAt?: string };

const dataVersions: Record<string, string> = {
  "procurement:RFQs": "v3",
  "hr-enterprise:Self service": "v3",
  "hr-enterprise:Settings": "v3",
  "hr-operations:Leave:Applications": "v4",
  "hr-operations:Leave:Approvals": "v4",
  "hr-operations:Leave:Job Handover": "v4",
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

  useEffect(() => {
    try {
      const stored = localStorage.getItem(demoRecordsStorageKey(moduleKey));
      const loaded: DemoRecord[] = stored ? JSON.parse(stored) : initial;
      setRecords(moduleKey === "admin:Users" ? loaded.map(record => record.Email?.toLowerCase() === "admin@medtech.qa" ? { ...record, User: "Kashif" } : record) : loaded);
    } catch { setRecords(initial); }
    setReady(true);
  }, [moduleKey, initial]);

  useEffect(() => {
    if (ready) writeDemoRecordsSnapshot(moduleKey, records);
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
