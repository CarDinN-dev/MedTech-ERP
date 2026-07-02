"use client";

import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import { Check, FileText, History, MessageSquare, Save, Trash2, X, XCircle } from "lucide-react";
import type { DemoRecord } from "@/lib/demo-store";
import { Button, FormSection } from "@/components/ui";
import { validateStructuredRecord } from "@/lib/validation";

export type RecordFieldType = "date" | "email" | "number" | "password" | "text";

export interface RecordFieldSuggestion {
  value: string;
  label?: string;
  fill?: Record<string, string>;
  department?: string;
}

interface Props {
  open: boolean;
  title: string;
  columns: string[];
  formColumns?: string[];
  selectOptions?: Record<string, string[]>;
  defaultValues?: Record<string, string>;
  fieldTypes?: Record<string, RecordFieldType>;
  suggestions?: Record<string, RecordFieldSuggestion[]>;
  record?: DemoRecord | null;
  approvalMode?: boolean;
  onClose: () => void;
  onSave: (values: Record<string, string>) => void;
  onDelete?: () => void;
  onDecision?: (decision: "Approved" | "Rejected") => void;
  deriveValues?: (values: Record<string, string>) => Record<string, string>;
  preview?: (values: Record<string, string>) => ReactNode;
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
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    if (!open) return;
    const initial = Object.fromEntries(fields.map(column => [
      column,
      normalizeInitialValue(column, record?.[column] ?? resolvedDefaultValues[column] ?? defaultValue(column), resolvedFieldTypes)
    ]));
    setValues(deriveValues ? deriveValues(initial) : initial);
    setTab("details");
    setError("");
    setSubmitted(false);
  }, [open, record, fields, resolvedDefaultValues, resolvedFieldTypes, deriveValues]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  const submit = (event: FormEvent) => {
    event.preventDefault();
    setSubmitted(true);
    const validation = validateStructuredRecord(values, resolvedSelectOptions, resolvedFieldTypes, false);
    if (validation) {
      setError(validation);
      return;
    }
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

  return <div className="fixed inset-0 z-[90] flex items-center justify-center bg-[var(--overlay-bg)] p-2 backdrop-blur-sm sm:p-4" onMouseDown={onClose}>
    <div role="dialog" aria-modal="true" aria-label={title} onMouseDown={event => event.stopPropagation()} className="max-h-[calc(100vh-1rem)] w-full max-w-4xl overflow-hidden rounded-2xl border border-[var(--line-soft)] bg-[var(--panel)] shadow-panel animate-in sm:max-h-[92vh]">
      <div className="flex items-center gap-3 border-b border-[var(--line-soft)] bg-[var(--elevated)] px-5 py-4">
        <div className="rounded-xl bg-[var(--navy-tint)] p-2.5 text-medtech-red ring-1 ring-medtech-navy/15"><FileText className="h-5 w-5" /></div>
        <div className="min-w-0"><h2 className="truncate font-bold">{title}</h2><p className="text-[11px] text-[var(--muted)]">Changes are saved locally on this PC for the client demonstration.</p></div>
        <button type="button" aria-label="Close form" onClick={onClose} className="ml-auto rounded-lg p-2 text-[var(--muted)] hover:bg-[var(--elevated)] hover:text-[var(--text)] focus-visible:outline-none focus-visible:shadow-focus"><X className="h-5 w-5" /></button>
      </div>
      {record && <div className="flex gap-1 border-b border-[var(--line-soft)] px-5">
        <button type="button" onClick={() => setTab("details")} className={`flex items-center gap-2 px-3 py-3 text-xs font-semibold focus-visible:outline-none focus-visible:shadow-focus ${tab === "details" ? "border-b-2 border-medtech-red text-medtech-navy dark:text-red-200" : "text-[var(--muted)] hover:text-[var(--text)]"}`}><FileText className="h-3.5 w-3.5" /> Details</button>
        <button type="button" onClick={() => setTab("activity")} className={`flex items-center gap-2 px-3 py-3 text-xs font-semibold focus-visible:outline-none focus-visible:shadow-focus ${tab === "activity" ? "border-b-2 border-medtech-red text-medtech-navy dark:text-red-200" : "text-[var(--muted)] hover:text-[var(--text)]"}`}><History className="h-3.5 w-3.5" /> Activity</button>
      </div>}

      {tab === "details" ? <form onSubmit={submit}>
        <div className="max-h-[calc(100vh-13rem)] space-y-4 overflow-y-auto bg-[var(--elevated)]/35 p-4 sm:max-h-[60vh] sm:p-5">
          {error && <div role="alert" className="rounded-lg border border-[var(--badge-danger-ring)] bg-[var(--badge-danger-bg)] px-3 py-2 text-xs font-medium text-[var(--badge-danger-text)]">{error}</div>}
          {formSections(fields).map(section => <FormSection key={section.title} title={section.title} description={section.description} className="rounded-xl shadow-none">
            {section.fields.map(column => renderField(column, fields, values, submitted, record, title, resolvedSelectOptions, resolvedFieldTypes, resolvedSuggestions, updateField))}
          </FormSection>)}
          {preview?.(values)}
        </div>
        <div className="sticky bottom-0 flex flex-wrap items-center gap-2 border-t border-[var(--line-soft)] bg-[var(--header)]/95 px-4 py-4 backdrop-blur sm:px-5">
          {record && onDelete && <Button type="button" variant="danger" onClick={() => window.confirm("Delete this local demo record?") && onDelete()}><Trash2 className="h-4 w-4" /> Delete</Button>}
          {approvalMode && record && <>
            <Button type="button" variant="secondary" onClick={() => window.confirm("Reject this request?") && onDecision?.("Rejected")}><XCircle className="h-4 w-4 text-rose-500" /> Reject</Button>
            <Button type="button" variant="secondary" onClick={() => onDecision?.("Approved")}><Check className="h-4 w-4 text-emerald-500" /> Approve</Button>
          </>}
          <div className="flex w-full gap-2 sm:ml-auto sm:w-auto"><Button type="button" variant="ghost" className="flex-1 sm:flex-none" onClick={onClose}>Cancel</Button><Button type="submit" className="flex-1 sm:flex-none"><Save className="h-4 w-4" /> Save record</Button></div>
        </div>
      </form> : <div className="min-h-[320px] bg-[var(--elevated)]/20 p-5">
        <div className="space-y-4 border-l-2 border-[var(--line-soft)] pl-5">{[["Record opened", "You viewed this record just now"], ["Status updated", `Status is ${record?.Status ?? record?.Stage ?? "Active"}`], ["Record created", "Created from the MedTech client demo dataset"]].map(([name, note], index) => <div key={name} className="relative"><span className="absolute -left-[27px] top-1 h-3 w-3 rounded-full border-2 border-[var(--panel)] bg-medtech-red" /><div className="text-xs font-semibold">{name}</div><div className="mt-0.5 text-[11px] text-[var(--muted)]">{note}</div><div className="mt-1 text-[10px] text-[var(--muted)]">{index === 0 ? "Now" : index === 1 ? "2 hours ago" : "18 June 2026"}</div></div>)}</div>
        <div className="mt-8 flex gap-2 rounded-xl border border-[var(--line-soft)] bg-[var(--panel)] p-3"><MessageSquare className="mt-1 h-4 w-4 text-[var(--muted)]" /><input aria-label="Internal note" className="flex-1 bg-transparent text-xs outline-none" placeholder="Add an internal note..." /><Button type="button">Add note</Button></div>
      </div>}
    </div>
  </div>;
}

function renderField(column: string, fields: string[], values: Record<string, string>, submitted: boolean, record: DemoRecord | null | undefined, title: string, selectOptions: Record<string, string[]>, fieldTypes: Record<string, RecordFieldType>, suggestions: Record<string, RecordFieldSuggestion[]>, updateField: (column: string, value: string) => void) {
  const options = selectOptions[column] ?? (["Status", "Stage", "Access"].includes(column) ? ["Draft", "Active", "Invited", "Suspended", "Pending approval", "Approved", "In progress", "Completed", "Rejected"] : null);
  const type = inputType(column, fieldTypes);
  const datalistId = `${title}-${column}`.toLowerCase().replace(/[^a-z0-9]+/g, "-");
  const columnSuggestions = orderedSuggestions(column, suggestions[column] ?? [], values);
  const useSuggestionSelect = ["Handover to", "Handover to code"].includes(column) && columnSuggestions.length > 0;
  const longField = isLongField(column);
  const fieldIndex = fields.indexOf(column);
  const required = (fieldIndex === 0 && values[column] !== "Auto generated") || (!record && column === "Password");
  const fieldError = submitted && required && !String(values[column] ?? "").trim() ? "This field is required." : "";
  const label = column === "Password" && !record ? "Password (temporary)" : column;

  return <label key={column} className={fieldIndex === 0 || longField ? "sm:col-span-2" : ""}>
    <span className="mb-1.5 block text-[11px] font-semibold text-[var(--text-secondary)]">{cleanLabel(column)}{column === "Password" && !record ? " (temporary)" : ""}</span>
    {useSuggestionSelect ? <select aria-label={column} value={values[column] ?? ""} onChange={event => updateField(column, event.target.value)} className="h-10 w-full rounded-xl border border-[var(--input-border)] bg-[var(--input-bg)] px-3 text-sm outline-none transition focus:border-medtech-navy focus:ring-2 focus:ring-[var(--focus-ring)] dark:focus:border-medtech-red">
      <option value="">Select employee</option>{columnSuggestions.map(option => <option key={`${column}-${option.value}`} value={option.value}>{option.label ?? option.value}</option>)}
    </select> : options ? <select aria-label={column} value={values[column] ?? ""} onChange={event => updateField(column, event.target.value)} className="h-10 w-full rounded-xl border border-[var(--input-border)] bg-[var(--input-bg)] px-3 text-sm outline-none transition focus:border-medtech-navy focus:ring-2 focus:ring-[var(--focus-ring)] dark:focus:border-medtech-red">
      {Array.from(new Set([values[column], ...options].filter(Boolean))).map(option => <option key={option}>{option}</option>)}
    </select> : longField ? <textarea required={required} aria-label={label} aria-invalid={Boolean(fieldError)} value={values[column] ?? ""} onChange={event => updateField(column, event.target.value)} className="min-h-24 w-full resize-y rounded-xl border border-[var(--input-border)] bg-[var(--input-bg)] px-3 py-2 text-sm outline-none transition focus:border-medtech-navy focus:ring-2 focus:ring-[var(--focus-ring)] dark:focus:border-medtech-red" placeholder={placeholder(column, type)} /> : <>
      <input required={required} minLength={column === "Password" ? 8 : undefined} aria-label={label} aria-invalid={Boolean(fieldError)} type={type} list={columnSuggestions.length ? datalistId : undefined} autoComplete={column === "Password" ? "new-password" : undefined} value={values[column] ?? ""} onChange={event => updateField(column, event.target.value)} className="h-10 w-full rounded-xl border border-[var(--input-border)] bg-[var(--input-bg)] px-3 text-sm outline-none transition focus:border-medtech-navy focus:ring-2 focus:ring-[var(--focus-ring)] dark:focus:border-medtech-red" placeholder={column === "Password" ? (record ? "Leave blank to keep current password" : "Minimum 8 characters") : placeholder(column, type)} />
      {columnSuggestions.length > 0 && <datalist id={datalistId}>{columnSuggestions.map(option => <option key={`${column}-${option.value}`} value={option.value} label={option.label} />)}</datalist>}
    </>}
    <p className={fieldError ? "mt-1 text-[11px] font-medium text-[var(--badge-danger-text)]" : "mt-1 text-[11px] text-[var(--muted)]"}>{fieldError || helperText(column, type, required)}</p>
  </label>;
}

function formSections(fields: string[]) {
  if (fields.length <= 8) return [{ title: "Record details", description: "Core fields for this record.", fields }];
  const size = Math.ceil(fields.length / 3);
  return [
    { title: "Record details", description: "Identifiers, ownership and core status.", fields: fields.slice(0, size) },
    { title: "Operational details", description: "Dates, amounts and workflow values.", fields: fields.slice(size, size * 2) },
    { title: "Notes and controls", description: "Supporting information and final checks.", fields: fields.slice(size * 2) }
  ].filter(section => section.fields.length);
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

function cleanLabel(column: string) {
  return column.replaceAll("_", " ");
}

function helperText(column: string, type: RecordFieldType, required: boolean) {
  if (required) return "Required before saving.";
  if (type === "date") return "Use the calendar format for cleaner filtering.";
  if (type === "email") return "Use a valid work email address.";
  if (column.toLowerCase().includes("status")) return "Controls workflow visibility and badges.";
  return "Optional unless required by the workflow.";
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
