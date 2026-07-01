"use client";

import { useEffect, useState } from "react";
import { Check, FileText, History, MessageSquare, Save, Trash2, X, XCircle } from "lucide-react";
import type { DemoRecord } from "@/lib/demo-store";
import { Button } from "@/components/ui";
import { validateStructuredRecord } from "@/lib/validation";

export type RecordFieldType = "date" | "email" | "number" | "password" | "text";
export interface RecordFieldSuggestion {
  value: string;
  label?: string;
  fill?: Record<string, string>;
  department?: string;
}

interface Props {
  open: boolean; title: string; columns: string[]; formColumns?: string[]; selectOptions?: Record<string, string[]>; defaultValues?: Record<string, string>; fieldTypes?: Record<string, RecordFieldType>; suggestions?: Record<string, RecordFieldSuggestion[]>; record?: DemoRecord | null; approvalMode?: boolean;
  onClose: () => void; onSave: (values: Record<string, string>) => void; onDelete?: () => void;
  onDecision?: (decision: "Approved" | "Rejected") => void;
  deriveValues?: (values: Record<string, string>) => Record<string, string>;
  preview?: (values: Record<string, string>) => React.ReactNode;
}

const EMPTY_SELECT_OPTIONS: Record<string, string[]> = {};
const EMPTY_DEFAULT_VALUES: Record<string, string> = {};
const EMPTY_FIELD_TYPES: Record<string, RecordFieldType> = {};
const EMPTY_SUGGESTIONS: Record<string, RecordFieldSuggestion[]> = {};

export function RecordModal({ open, title, columns, formColumns, selectOptions, defaultValues, fieldTypes, suggestions, record, approvalMode, onClose, onSave, onDelete, onDecision, deriveValues, preview }: Props) {
  const fields = formColumns ?? columns;
  const resolvedSelectOptions = selectOptions ?? EMPTY_SELECT_OPTIONS;
  const resolvedDefaultValues = defaultValues ?? EMPTY_DEFAULT_VALUES;
  const resolvedFieldTypes = fieldTypes ?? EMPTY_FIELD_TYPES;
  const resolvedSuggestions = suggestions ?? EMPTY_SUGGESTIONS;
  const [values, setValues] = useState<Record<string, string>>({});
  const [tab, setTab] = useState<"details" | "activity">("details");
  const [error, setError] = useState("");
  useEffect(() => { if (open) { const initial = Object.fromEntries(fields.map(column => [column, normalizeInitialValue(column, record?.[column] ?? resolvedDefaultValues[column] ?? defaultValue(column), resolvedFieldTypes)])); setValues(deriveValues ? deriveValues(initial) : initial); setTab("details"); setError(""); } }, [open, record, fields, resolvedDefaultValues, resolvedFieldTypes, deriveValues]);
  if (!open) return null;
  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    const validation = validateStructuredRecord(values, resolvedSelectOptions, resolvedFieldTypes, false);
    if (validation) { setError(validation); return; }
    onSave(values);
  };
  const updateField = (column: string, value: string) => {
    setError("");
    setValues(current => {
      const exactSuggestion = orderedSuggestions(column, resolvedSuggestions[column] ?? [], current).find(option => option.value.toLowerCase() === value.toLowerCase());
      const next = { ...current, [column]: value, ...(exactSuggestion?.fill ?? {}) };
      return deriveValues ? deriveValues(next) : next;
    });
  };
  return <div className="fixed inset-0 z-[90] flex items-center justify-center bg-slate-950/55 p-4 backdrop-blur-sm" onMouseDown={onClose}>
    <div role="dialog" aria-modal="true" aria-label={title} onMouseDown={event => event.stopPropagation()} className="max-h-[92vh] w-full max-w-2xl overflow-hidden rounded-2xl border bg-[var(--panel)] shadow-2xl animate-in">
      <div className="flex items-center gap-3 border-b px-5 py-4"><div className="rounded-xl bg-teal-50 p-2.5 text-teal-600 dark:bg-teal-950/50"><FileText className="h-5 w-5" /></div><div><h2 className="font-bold">{title}</h2><p className="text-[11px] text-[var(--muted)]">Changes are saved locally on this PC for the client demonstration.</p></div><button aria-label="Close form" onClick={onClose} className="ml-auto rounded-lg p-2 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"><X className="h-5 w-5" /></button></div>
      {record && <div className="flex gap-1 border-b px-5"><button onClick={() => setTab("details")} className={`flex items-center gap-2 px-3 py-3 text-xs font-semibold ${tab === "details" ? "border-b-2 border-teal-500 text-teal-600" : "text-slate-400"}`}><FileText className="h-3.5 w-3.5" /> Details</button><button onClick={() => setTab("activity")} className={`flex items-center gap-2 px-3 py-3 text-xs font-semibold ${tab === "activity" ? "border-b-2 border-teal-500 text-teal-600" : "text-slate-400"}`}><History className="h-3.5 w-3.5" /> Activity</button></div>}
      {tab === "details" ? <form onSubmit={submit}><div className="grid max-h-[58vh] gap-4 overflow-y-auto p-5 sm:grid-cols-2">{error && <div role="alert" className="sm:col-span-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-medium text-rose-700">{error}</div>}{fields.map((column, index) => { const options = resolvedSelectOptions[column] ?? (["Status", "Stage", "Access"].includes(column) ? ["Draft", "Active", "Invited", "Suspended", "Pending approval", "Approved", "In progress", "Completed", "Rejected"] : null); const type = inputType(column, resolvedFieldTypes); const datalistId = `${title}-${column}`.toLowerCase().replace(/[^a-z0-9]+/g, "-"); const columnSuggestions = orderedSuggestions(column, resolvedSuggestions[column] ?? [], values); const useSuggestionSelect = ["Handover to", "Handover to code"].includes(column) && columnSuggestions.length > 0; const longField = isLongField(column); const required = (index === 0 && values[column] !== "Auto generated") || (!record && column === "Password"); return <label key={column} className={index === 0 || longField ? "sm:col-span-2" : ""}><span className="mb-1.5 block text-[11px] font-semibold text-[var(--muted)]">{column}{column === "Password" && !record ? " (temporary)" : ""}</span>{useSuggestionSelect ? <select aria-label={column} value={values[column] ?? ""} onChange={event => updateField(column, event.target.value)} className="h-10 w-full rounded-xl border bg-[var(--panel)] px-3 text-sm outline-none focus:border-teal-500"><option value="">Select employee</option>{columnSuggestions.map(option => <option key={`${column}-${option.value}`} value={option.value}>{option.label ?? option.value}</option>)}</select> : options ? <select aria-label={column} value={values[column] ?? ""} onChange={event => updateField(column, event.target.value)} className="h-10 w-full rounded-xl border bg-[var(--panel)] px-3 text-sm outline-none focus:border-teal-500">{Array.from(new Set([values[column], ...options].filter(Boolean))).map(option => <option key={option}>{option}</option>)}</select> : longField ? <textarea required={required} value={values[column] ?? ""} onChange={event => updateField(column, event.target.value)} className="min-h-24 w-full resize-y rounded-xl border bg-[var(--panel)] px-3 py-2 text-sm outline-none transition focus:border-teal-500 focus:ring-2 focus:ring-teal-500/10" placeholder={placeholder(column, type)} /> : <><input required={required} minLength={column === "Password" ? 8 : undefined} type={type} list={columnSuggestions.length ? datalistId : undefined} autoComplete={column === "Password" ? "new-password" : undefined} value={values[column] ?? ""} onChange={event => updateField(column, event.target.value)} className="h-10 w-full rounded-xl border bg-[var(--panel)] px-3 text-sm outline-none transition focus:border-teal-500 focus:ring-2 focus:ring-teal-500/10" placeholder={column === "Password" ? (record ? "Leave blank to keep current password" : "Minimum 8 characters") : placeholder(column, type)} />{columnSuggestions.length > 0 && <datalist id={datalistId}>{columnSuggestions.map(option => <option key={`${column}-${option.value}`} value={option.value} label={option.label} />)}</datalist>}</>}</label>; })}{preview?.(values)}</div><div className="flex flex-wrap items-center gap-2 border-t bg-slate-50/70 px-5 py-4 dark:bg-slate-900/30">{record && onDelete && <Button type="button" variant="danger" onClick={onDelete}><Trash2 className="h-4 w-4" /> Delete</Button>}{approvalMode && record && <><Button type="button" variant="secondary" onClick={() => onDecision?.("Rejected")}><XCircle className="h-4 w-4 text-rose-500" /> Reject</Button><Button type="button" variant="secondary" onClick={() => onDecision?.("Approved")}><Check className="h-4 w-4 text-emerald-500" /> Approve</Button></>}<div className="ml-auto flex gap-2"><Button type="button" variant="secondary" onClick={onClose}>Cancel</Button><Button type="submit"><Save className="h-4 w-4" /> Save record</Button></div></div></form> : <div className="min-h-[320px] p-5"><div className="space-y-4 border-l-2 border-slate-100 pl-5 dark:border-slate-800">{[["Record opened", "You viewed this record just now"],["Status updated", `Status is ${record?.Status ?? record?.Stage ?? "Active"}`],["Record created", "Created from the MedTech client demo dataset"]].map(([name,note], index) => <div key={name} className="relative"><span className="absolute -left-[27px] top-1 h-3 w-3 rounded-full border-2 border-[var(--panel)] bg-teal-500" /><div className="text-xs font-semibold">{name}</div><div className="mt-0.5 text-[11px] text-slate-400">{note}</div><div className="mt-1 text-[10px] text-slate-300">{index === 0 ? "Now" : index === 1 ? "2 hours ago" : "18 June 2026"}</div></div>)}</div><div className="mt-8 flex gap-2 rounded-xl border p-3"><MessageSquare className="mt-1 h-4 w-4 text-slate-400" /><input className="flex-1 bg-transparent text-xs outline-none" placeholder="Add an internal note..." /><Button type="button">Add note</Button></div></div>}
    </div>
  </div>;
}

function defaultValue(column: string) {
  const key = column.toLowerCase();
  if (key === "status" || key === "stage") return "Draft";
  if (key.includes("date") || key === "joined" || key === "updated" || key === "submitted") return new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
  if (key.includes("amount") || key.includes("value") || key === "total" || key === "budget") return "QAR 0";
  return "";
}

function inputType(column: string, fieldTypes: Record<string, RecordFieldType>) {
  const explicit = fieldTypes[column];
  if (explicit) return explicit;
  if (column === "Password") return "password";
  if (column === "Email") return "email";
  return "text";
}

function placeholder(column: string, type: RecordFieldType) {
  if (type === "date") return "Select date";
  if (column === "Employee") return "Type employee name";
  if (column === "Employee Code") return "Type employee code";
  return `Enter ${column.toLowerCase()}`;
}

function isLongField(column: string) {
  const key = column.toLowerCase();
  return ["description", "notes", "comments", "tasks", "purpose", "change", "reason", "items"].some(token => key.includes(token));
}

function orderedSuggestions(column: string, suggestions: RecordFieldSuggestion[], values: Record<string, string>) {
  if (!["Handover to", "Handover to code"].includes(column)) return suggestions;
  const currentEmployee = (values.Employee || "").toLowerCase();
  const currentCode = (values["Employee Code"] || "").toLowerCase();
  const department = values.Department || "";
  return suggestions
    .filter(option => option.value.toLowerCase() !== currentEmployee && option.value.toLowerCase() !== currentCode)
    .sort((left, right) => Number((right.department || "") === department) - Number((left.department || "") === department) || (left.label ?? left.value).localeCompare(right.label ?? right.value));
}

function normalizeInitialValue(column: string, value: string, fieldTypes: Record<string, RecordFieldType>) {
  if (inputType(column, fieldTypes) !== "date") return value;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return `${parsed.getFullYear()}-${String(parsed.getMonth() + 1).padStart(2, "0")}-${String(parsed.getDate()).padStart(2, "0")}`;
}
