"use client";

import { useCallback, useEffect, useState } from "react";
import type { DemoRecord } from "@/lib/demo-store";
import { getDemoSession, PRESENTATION_USER_NAME } from "@/lib/demo-auth";
import { createClientId } from "@/lib/ids";

export type AuditSeverity = "info" | "warning" | "high" | "critical";
export type AuditResult = "success" | "failure";

const AUDIT_KEY = "medtech-demo:audit:v1";
const DASH = "-";
const SENSITIVE_KEY = /\b(password|passcode|secret|token|api[_ -]?key|authorization|cookie|session)\b/i;
const SENSITIVE_TEXT = /\b(password|passcode|secret|token|api[_ -]?key|authorization|cookie|session)\b/ig;

export const auditSeverities: AuditSeverity[] = ["info", "warning", "high", "critical"];

const seedAudit: DemoRecord[] = [
  auditSeed("audit-1", "20 Jun 2026, 09:42", PRESENTATION_USER_NAME, "Super Admin", "LOGIN", "Authentication", "Client demo session", "Successful sign-in from local presentation account", "success", "info"),
  auditSeed("audit-2", "20 Jun 2026, 09:31", "Aisha Rahman", "Finance Manager", "APPROVE", "Finance", "PO-2026-0128", "Purchase order approved - QAR 624,000", "success", "info"),
  auditSeed("audit-3", "20 Jun 2026, 09:18", "Fahad Al-Kuwari", "Sales Manager", "CREATE", "Sales", "QTN-2026-0314", "Quotation submitted for approval", "success", "info"),
  auditSeed("audit-4", "20 Jun 2026, 08:54", "Warehouse Team", "Warehouse Team", "UPDATE", "Inventory", "GRN-2026-0098", "Goods receipt completed - 48 line items", "success", "info"),
  auditSeed("audit-5", "19 Jun 2026, 17:22", "Super Admin", "Super Admin", "ROLE CHANGE", "Administration", "Sales Executive", "Export permission granted", "success", "warning")
];

export function readAuditLog() {
  return readAudit();
}

export function appendAuditLog(input: {
  action: string;
  module: string;
  record?: string;
  details?: string;
  before?: string;
  after?: string;
  result?: AuditResult;
  severity?: AuditSeverity;
  user?: string;
  role?: string;
}) {
  const session = getDemoSession();
  const result = input.result ?? "success";
  const entry: DemoRecord = {
    __id: createClientId(),
    Time: now(),
    User: clean(input.user || session?.name || PRESENTATION_USER_NAME),
    Role: clean(input.role || session?.role || "Super Admin"),
    Action: clean(input.action).toUpperCase(),
    Module: clean(input.module),
    Record: clean(input.record || DASH),
    Details: clean(input.details || DASH),
    Before: clean(input.before || DASH),
    After: clean(input.after || DASH),
    Result: result,
    Severity: input.severity ?? severityFor(input.action, result),
    "IP address": "127.0.0.1"
  };
  const next = [entry, ...readAudit()].slice(0, 500);
  localStorage.setItem(AUDIT_KEY, JSON.stringify(next));
  window.dispatchEvent(new CustomEvent("medtech:audit", { detail: next }));
}

export function auditSummary(record: Record<string, unknown> | null | undefined) {
  if (!record) return DASH;
  const visible = Object.entries(record)
    .filter(([key, value]) => !key.startsWith("__") && !SENSITIVE_KEY.test(key) && value !== undefined && value !== "")
    .slice(0, 5)
    .map(([key, value]) => `${key}: ${String(value).slice(0, 80)}`);
  return clean(visible.join("; ") || DASH);
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
  const add = useCallback((input: Parameters<typeof appendAuditLog>[0]) => appendAuditLog(input), []);
  const reset = useCallback(() => {
    appendAuditLog({ action: "RESET AUDIT LOG", module: "Administration", record: "Audit log", details: "Audit log reset to sample events", severity: "warning" });
    localStorage.setItem(AUDIT_KEY, JSON.stringify(seedAudit));
    setEntries(seedAudit);
    window.dispatchEvent(new Event("medtech:audit"));
  }, []);
  return { entries, add, reset };
}

function readAudit(): DemoRecord[] {
  if (typeof window === "undefined") return seedAudit;
  try {
    const stored = localStorage.getItem(AUDIT_KEY);
    const entries: DemoRecord[] = stored ? JSON.parse(stored) : seedAudit;
    return entries.map(normalizeEntry);
  } catch { return seedAudit; }
}

function normalizeEntry(entry: DemoRecord): DemoRecord {
  const user = entry.User === "Ahmed Al-Mohannadi" ? PRESENTATION_USER_NAME : entry.User || PRESENTATION_USER_NAME;
  const result = entry.Result === "failure" ? "failure" : "success";
  return {
    ...entry,
    Time: entry.Time || now(),
    User: clean(user),
    Role: clean(entry.Role || "Super Admin"),
    Action: clean(entry.Action || "UPDATE").toUpperCase(),
    Module: clean(entry.Module || "General"),
    Record: clean(entry.Record || DASH),
    Details: clean(entry.Details || DASH),
    Before: clean(entry.Before || DASH),
    After: clean(entry.After || DASH),
    Result: result,
    Severity: auditSeverities.includes(entry.Severity as AuditSeverity) ? entry.Severity : severityFor(entry.Action || "", result),
    "IP address": entry["IP address"] || "127.0.0.1"
  };
}

function auditSeed(__id: string, Time: string, User: string, Role: string, Action: string, Module: string, Record: string, Details: string, Result: AuditResult, Severity: AuditSeverity): DemoRecord {
  return { __id, Time, User, Role, Action, Module, Record, Details, Before: DASH, After: DASH, Result, Severity, "IP address": "127.0.0.1" };
}

function severityFor(action: string, result: AuditResult): AuditSeverity {
  const normalized = action.toLowerCase();
  if (result === "failure" && (normalized.includes("login") || normalized.includes("permission") || normalized.includes("import"))) return "high";
  if (normalized.includes("restore") || normalized.includes("reset all") || normalized.includes("exposed") || normalized.includes("malicious")) return "critical";
  if (normalized.includes("denied") || normalized.includes("delete") || normalized.includes("archive") || normalized.includes("approve") || normalized.includes("payroll") || normalized.includes("posting") || normalized.includes("backup") || normalized.includes("restore") || normalized.includes("reset")) return "warning";
  return "info";
}

function clean(value: string) {
  return String(value || DASH).replace(SENSITIVE_TEXT, "[redacted]").replace(/\s+/g, " ").trim().slice(0, 1000) || DASH;
}

function now() {
  return new Date().toLocaleString("en-GB", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}
