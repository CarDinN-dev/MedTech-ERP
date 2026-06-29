"use client";

import { useCallback, useEffect, useState } from "react";
import type { DemoRecord } from "@/lib/demo-store";
import { getDemoSession, PRESENTATION_USER_NAME } from "@/lib/demo-auth";
import { createClientId } from "@/lib/ids";

const AUDIT_KEY = "medtech-demo:audit:v1";

const seedAudit: DemoRecord[] = [
  { __id: "audit-1", Time: "20 Jun 2026, 09:42", User: PRESENTATION_USER_NAME, Action: "LOGIN", Module: "Authentication", Record: "Client demo session", Details: "Successful sign-in from local presentation account", "IP address": "127.0.0.1" },
  { __id: "audit-2", Time: "20 Jun 2026, 09:31", User: "Aisha Rahman", Action: "APPROVE", Module: "Finance", Record: "PO-2026-0128", Details: "Purchase order approved · QAR 624,000", "IP address": "10.20.1.44" },
  { __id: "audit-3", Time: "20 Jun 2026, 09:18", User: "Fahad Al-Kuwari", Action: "CREATE", Module: "Sales", Record: "QTN-2026-0314", Details: "Quotation submitted for approval", "IP address": "10.20.1.72" },
  { __id: "audit-4", Time: "20 Jun 2026, 08:54", User: "Warehouse Team", Action: "UPDATE", Module: "Inventory", Record: "GRN-2026-0098", Details: "Goods receipt completed · 48 line items", "IP address": "10.20.2.18" },
  { __id: "audit-5", Time: "19 Jun 2026, 17:22", User: "Super Admin", Action: "ROLE CHANGE", Module: "Administration", Record: "Sales Executive", Details: "Export permission granted", "IP address": "10.20.1.10" }
];

function readAudit(): DemoRecord[] {
  if (typeof window === "undefined") return seedAudit;
  try {
    const stored = localStorage.getItem(AUDIT_KEY);
    const entries: DemoRecord[] = stored ? JSON.parse(stored) : seedAudit;
    return entries.map(entry => entry.User === "Ahmed Al-Mohannadi" ? { ...entry, User: PRESENTATION_USER_NAME } : entry);
  } catch { return seedAudit; }
}

export function appendAuditLog(input: { action: string; module: string; record: string; details: string }) {
  const entry: DemoRecord = {
    __id: createClientId(),
    Time: new Date().toLocaleString("en-GB", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }),
    User: getDemoSession()?.name || PRESENTATION_USER_NAME, Action: input.action.toUpperCase(), Module: input.module, Record: input.record || "—", Details: input.details, "IP address": "127.0.0.1"
  };
  const next = [entry, ...readAudit()].slice(0, 250);
  localStorage.setItem(AUDIT_KEY, JSON.stringify(next));
  window.dispatchEvent(new CustomEvent("medtech:audit", { detail: next }));
}

export function useAuditLog() {
  const [entries, setEntries] = useState<DemoRecord[]>(seedAudit);
  useEffect(() => {
    setEntries(readAudit());
    const refresh = () => setEntries(readAudit());
    window.addEventListener("medtech:audit", refresh);
    window.addEventListener("storage", refresh);
    return () => { window.removeEventListener("medtech:audit", refresh); window.removeEventListener("storage", refresh); };
  }, []);
  const add = useCallback((input: { action: string; module: string; record: string; details: string }) => appendAuditLog(input), []);
  const reset = useCallback(() => { localStorage.removeItem(AUDIT_KEY); setEntries(seedAudit); window.dispatchEvent(new Event("medtech:audit")); }, []);
  return { entries, add, reset };
}
