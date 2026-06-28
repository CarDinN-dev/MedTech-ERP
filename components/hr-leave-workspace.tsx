"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import {
  ArrowDownUp,
  CalendarDays,
  Check,
  Download,
  Edit3,
  Eye,
  FileText,
  Loader2,
  Paperclip,
  Plus,
  Save,
  Search,
  SlidersHorizontal,
  Upload,
  X,
  XCircle
} from "lucide-react";
import { z } from "zod";
import { Button, EmptyState, StatusBadge } from "@/components/ui";
import { exportToExcel } from "@/lib/export/excel";
import {
  leaveApprovalDecisionUpdateSchema,
  leaveClearanceUpdateSchema,
  leaveHandoverUpdateSchema,
  leaveRejoinUpdateSchema,
  leaveApplicationSchema
} from "@/lib/validation";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import type {
  EmployeeOption,
  LeaveApplication,
  LeaveApplicationFormValues,
  LeaveApplicationSortKey,
  LeaveApproval,
  LeaveApprovalSortKey,
  LeaveClearance,
  LeaveClearanceSortKey,
  LeaveHandover,
  LeaveHandoverSortKey,
  LeaveRejoin,
  LeaveRejoinSortKey
} from "@/lib/hr/leave-types";

const leaveTabs = ["Annual Planner", "Applications", "Approvals", "Job Handover", "Clearance", "Rejoin"] as const;
const leaveTypes = ["Annual Leave", "Sick Leave", "Emergency Leave", "Unpaid Leave", "Maternity Leave", "Compassionate Leave", "Other"];
const applicationStatuses = ["all", "draft", "submitted", "pending_approval", "approved", "rejected", "cancelled"];
const approvalStatuses = ["all", "pending", "approved", "rejected"];
const handoverStatuses = ["all", "pending", "accepted", "cancelled"];
const clearanceStatuses = ["all", "not_required", "pending", "in_progress", "cleared", "blocked"];
const rejoinStatuses = ["all", "pending_rejoin", "rejoined_on_time", "delayed_rejoin", "no_show", "verified"];
const plannerStatuses = ["all", "pending_approval", "approved"];
const monthOptions: Array<[string, string]> = [
  ["all", "All months"],
  ["1", "January"],
  ["2", "February"],
  ["3", "March"],
  ["4", "April"],
  ["5", "May"],
  ["6", "June"],
  ["7", "July"],
  ["8", "August"],
  ["9", "September"],
  ["10", "October"],
  ["11", "November"],
  ["12", "December"]
];

const leaveTypeTones: Record<string, string> = {
  "Annual Leave": "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900/70 dark:bg-emerald-950/40 dark:text-emerald-200",
  "Sick Leave": "border-rose-200 bg-rose-50 text-rose-800 dark:border-rose-900/70 dark:bg-rose-950/40 dark:text-rose-200",
  "Emergency Leave": "border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900/70 dark:bg-amber-950/40 dark:text-amber-200",
  "Unpaid Leave": "border-slate-200 bg-slate-50 text-slate-800 dark:border-slate-700 dark:bg-slate-900/60 dark:text-slate-200",
  "Maternity Leave": "border-fuchsia-200 bg-fuchsia-50 text-fuchsia-800 dark:border-fuchsia-900/70 dark:bg-fuchsia-950/40 dark:text-fuchsia-200",
  "Compassionate Leave": "border-blue-200 bg-blue-50 text-blue-800 dark:border-blue-900/70 dark:bg-blue-950/40 dark:text-blue-200",
  Other: "border-cyan-200 bg-cyan-50 text-cyan-800 dark:border-cyan-900/70 dark:bg-cyan-950/40 dark:text-cyan-200"
};

const applicationSortOptions: Array<[LeaveApplicationSortKey, string]> = [
  ["employee_code", "Employee code"],
  ["employee_name", "Employee name"],
  ["request_no", "Request no"],
  ["leave_type", "Leave type"],
  ["start_date", "From date"],
  ["end_date", "To date"],
  ["working_days", "Days"],
  ["balance_after", "Balance"],
  ["status", "Status"]
];

const approvalSortOptions: Array<[LeaveApprovalSortKey, string]> = [
  ["employee_code", "Employee code"],
  ["employee_name", "Employee name"],
  ["request_no", "Request no"],
  ["decision_no", "Decision no"],
  ["approved_from", "Approved from"],
  ["approved_to", "Approved to"],
  ["days", "Days"],
  ["approver_name", "Approver"],
  ["decision_date", "Decision date"],
  ["decision", "Status"]
];

const handoverSortOptions: Array<[LeaveHandoverSortKey, string]> = [
  ["employee_code", "Employee code"],
  ["request_no", "Request no"],
  ["handover_to_employee_code", "Handover code"],
  ["status", "Status"]
];

const clearanceSortOptions: Array<[LeaveClearanceSortKey, string]> = [
  ["employee_code", "Employee code"],
  ["request_no", "Request no"],
  ["department", "Department"],
  ["status", "Status"]
];

const rejoinSortOptions: Array<[LeaveRejoinSortKey, string]> = [
  ["employee_code", "Employee code"],
  ["request_no", "Request no"],
  ["employee_name", "Employee name"],
  ["original_return_date", "Original return date"],
  ["actual_rejoin_date", "Actual rejoin date"],
  ["status", "Status"]
];

const initialForm: LeaveApplicationFormValues = {
  employee_id: "",
  handover_to_employee_id: "",
  leave_type: "Annual Leave",
  start_date: today(),
  end_date: today(),
  balance_before: 30,
  purpose: "",
  destination: "",
  travel_from: "",
  travel_to: "",
  emergency_contact_name: "",
  emergency_contact_phone: "",
  emergency_contact_email: ""
};

type ModalMode = "create" | "edit" | "view";
type ToastTone = "success" | "error" | "info";

interface ToastState {
  message: string;
  tone: ToastTone;
}

export function HrLeaveWorkspace() {
  const [activeTab, setActiveTab] = useState<(typeof leaveTabs)[number]>("Applications");
  const [applications, setApplications] = useState<LeaveApplication[]>([]);
  const [approvals, setApprovals] = useState<LeaveApproval[]>([]);
  const [handovers, setHandovers] = useState<LeaveHandover[]>([]);
  const [clearances, setClearances] = useState<LeaveClearance[]>([]);
  const [rejoins, setRejoins] = useState<LeaveRejoin[]>([]);
  const [employees, setEmployees] = useState<EmployeeOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<ToastState | null>(null);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [leaveTypeFilter, setLeaveTypeFilter] = useState("all");
  const [fromFilter, setFromFilter] = useState("");
  const [toFilter, setToFilter] = useState("");
  const [appSort, setAppSort] = useState<LeaveApplicationSortKey>("start_date");
  const [approvalSort, setApprovalSort] = useState<LeaveApprovalSortKey>("approved_from");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");
  const [handoverQuery, setHandoverQuery] = useState("");
  const [handoverStatusFilter, setHandoverStatusFilter] = useState("all");
  const [handoverSort, setHandoverSort] = useState<LeaveHandoverSortKey>("request_no");
  const [handoverSortDirection, setHandoverSortDirection] = useState<"asc" | "desc">("desc");
  const [handoverDrafts, setHandoverDrafts] = useState<Record<string, { tasks_notes: string; file: File | null }>>({});
  const [clearanceQuery, setClearanceQuery] = useState("");
  const [clearanceStatusFilter, setClearanceStatusFilter] = useState("all");
  const [clearanceSort, setClearanceSort] = useState<LeaveClearanceSortKey>("request_no");
  const [clearanceSortDirection, setClearanceSortDirection] = useState<"asc" | "desc">("desc");
  const [clearanceDrafts, setClearanceDrafts] = useState<Record<string, { clearance_items: string; responsible_person: string; status: string; comments: string }>>({});
  const [rejoinQuery, setRejoinQuery] = useState("");
  const [rejoinStatusFilter, setRejoinStatusFilter] = useState("all");
  const [rejoinReturnFrom, setRejoinReturnFrom] = useState("");
  const [rejoinReturnTo, setRejoinReturnTo] = useState("");
  const [rejoinActualFrom, setRejoinActualFrom] = useState("");
  const [rejoinActualTo, setRejoinActualTo] = useState("");
  const [rejoinSort, setRejoinSort] = useState<LeaveRejoinSortKey>("original_return_date");
  const [rejoinSortDirection, setRejoinSortDirection] = useState<"asc" | "desc">("desc");
  const [rejoinDrafts, setRejoinDrafts] = useState<Record<string, { actual_rejoin_date: string; reason_for_delay: string; status: string; file: File | null }>>({});
  const [plannerYear, setPlannerYear] = useState(String(new Date().getFullYear()));
  const [plannerMonth, setPlannerMonth] = useState(String(new Date().getMonth() + 1));
  const [plannerDepartment, setPlannerDepartment] = useState("all");
  const [plannerEmployeeCode, setPlannerEmployeeCode] = useState("");
  const [plannerEmployeeName, setPlannerEmployeeName] = useState("");
  const [plannerLeaveType, setPlannerLeaveType] = useState("all");
  const [plannerStatus, setPlannerStatus] = useState("all");
  const [modalMode, setModalMode] = useState<ModalMode | null>(null);
  const [selectedApplication, setSelectedApplication] = useState<LeaveApplication | null>(null);
  const [form, setForm] = useState<LeaveApplicationFormValues>(initialForm);
  const [approvalNotes, setApprovalNotes] = useState("");
  const [isPending, startTransition] = useTransition();

  const supabase = useMemo(() => createClient(), []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [appResult, approvalResult, handoverResult, clearanceResult, rejoinResult, employeeResult] = await Promise.all([
        supabase.from("leave_applications").select("*").order("created_at", { ascending: false }),
        supabase.from("leave_approvals").select("*").order("created_at", { ascending: false }),
        supabase.from("leave_handovers").select("*").order("created_at", { ascending: false }),
        supabase.from("leave_clearances").select("*").order("created_at", { ascending: false }),
        supabase.from("leave_rejoins").select("*").order("created_at", { ascending: false }),
        supabase
          .from("employees")
          .select("id, employee_number, full_name, designation, department:departments(name)")
          .is("deleted_at", null)
          .order("employee_number", { ascending: true })
      ]);

      if (appResult.error) throw appResult.error;
      if (approvalResult.error) throw approvalResult.error;
      if (handoverResult.error) throw handoverResult.error;
      if (clearanceResult.error) throw clearanceResult.error;
      if (rejoinResult.error) throw rejoinResult.error;
      if (employeeResult.error) throw employeeResult.error;

      setApplications((appResult.data ?? []) as LeaveApplication[]);
      setApprovals((approvalResult.data ?? []) as LeaveApproval[]);
      setHandovers((handoverResult.data ?? []) as LeaveHandover[]);
      setClearances((clearanceResult.data ?? []) as LeaveClearance[]);
      setRejoins((rejoinResult.data ?? []) as LeaveRejoin[]);
      setEmployees(((employeeResult.data ?? []) as unknown as EmployeeOption[]).map(employee => ({
        ...employee,
        department: Array.isArray(employee.department) ? employee.department[0] ?? null : employee.department ?? null
      })));
    } catch (error) {
      showToast(errorMessage(error, "Unable to load leave records."), "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
  }, []);

  const filteredApplications = useMemo(() => {
    return sortRows(
      applications.filter(item => {
        const haystack = [
          item.employee_code,
          item.employee_name,
          item.request_no,
          item.department,
          item.leave_type,
          item.status
        ].join(" ").toLowerCase();
        return matchesCommonFilters({
          haystack,
          query,
          status: item.status,
          statusFilter,
          leaveType: item.leave_type,
          leaveTypeFilter,
          start: item.start_date,
          end: item.end_date,
          fromFilter,
          toFilter
        });
      }),
      appSort,
      sortDirection
    );
  }, [applications, appSort, fromFilter, leaveTypeFilter, query, sortDirection, statusFilter, toFilter]);

  const filteredApprovals = useMemo(() => {
    return sortRows(
      approvals.filter(item => {
        const related = applications.find(app => app.id === item.leave_application_id);
        const haystack = [
          item.employee_code,
          item.employee_name,
          item.request_no,
          item.decision_no,
          item.approver_name,
          item.decision,
          related?.department,
          related?.leave_type,
          related?.status
        ].join(" ").toLowerCase();
        return matchesCommonFilters({
          haystack,
          query,
          status: item.decision,
          statusFilter,
          leaveType: related?.leave_type,
          leaveTypeFilter,
          start: item.approved_from,
          end: item.approved_to,
          fromFilter,
          toFilter
        });
      }),
      approvalSort,
      sortDirection
    );
  }, [applications, approvals, approvalSort, fromFilter, leaveTypeFilter, query, sortDirection, statusFilter, toFilter]);

  const filteredHandovers = useMemo(() => {
    return sortRows(
      handovers.filter(item => {
        const haystack = [
          item.employee_code,
          item.employee_name,
          item.request_no,
          item.handover_to_employee_code,
          item.handover_to_name,
          item.status
        ].join(" ").toLowerCase();
        if (handoverQuery.trim() && !haystack.includes(handoverQuery.trim().toLowerCase())) return false;
        if (handoverStatusFilter !== "all" && item.status !== handoverStatusFilter) return false;
        return true;
      }),
      handoverSort,
      handoverSortDirection
    );
  }, [handoverQuery, handoverSort, handoverSortDirection, handoverStatusFilter, handovers]);

  const filteredClearances = useMemo(() => {
    return sortRows(
      clearances.filter(item => {
        const haystack = [
          item.employee_code,
          item.employee_name,
          item.request_no,
          item.department,
          item.status
        ].join(" ").toLowerCase();
        if (clearanceQuery.trim() && !haystack.includes(clearanceQuery.trim().toLowerCase())) return false;
        if (clearanceStatusFilter !== "all" && item.status !== clearanceStatusFilter) return false;
        return true;
      }),
      clearanceSort,
      clearanceSortDirection
    );
  }, [clearanceQuery, clearanceSort, clearanceSortDirection, clearanceStatusFilter, clearances]);

  const filteredRejoins = useMemo(() => {
    return sortRows(
      rejoins.filter(item => {
        const haystack = [
          item.employee_code,
          item.employee_name,
          item.request_no,
          item.status
        ].join(" ").toLowerCase();
        if (rejoinQuery.trim() && !haystack.includes(rejoinQuery.trim().toLowerCase())) return false;
        if (rejoinStatusFilter !== "all" && item.status !== rejoinStatusFilter) return false;
        if (rejoinReturnFrom && item.original_return_date < rejoinReturnFrom) return false;
        if (rejoinReturnTo && item.original_return_date > rejoinReturnTo) return false;
        if (rejoinActualFrom && (!item.actual_rejoin_date || item.actual_rejoin_date < rejoinActualFrom)) return false;
        if (rejoinActualTo && (!item.actual_rejoin_date || item.actual_rejoin_date > rejoinActualTo)) return false;
        return true;
      }),
      rejoinSort,
      rejoinSortDirection
    );
  }, [rejoinActualFrom, rejoinActualTo, rejoinQuery, rejoinReturnFrom, rejoinReturnTo, rejoinSort, rejoinSortDirection, rejoinStatusFilter, rejoins]);

  const plannerDepartments = useMemo<Array<[string, string]>>(() => {
    const values = new Set(applications.map(item => item.department).filter(Boolean) as string[]);
    return [["all", "All departments"], ...Array.from(values).sort().map(value => [value, value] as [string, string])];
  }, [applications]);

  const plannerYears = useMemo<Array<[string, string]>>(() => {
    const values = new Set(applications.map(item => new Date(`${item.start_date}T00:00:00`).getFullYear()).filter(Number.isFinite));
    values.add(new Date().getFullYear());
    return Array.from(values).sort((left, right) => right - left).map(value => [String(value), String(value)] as [string, string]);
  }, [applications]);

  const plannerApplications = useMemo(() => {
    const year = Number(plannerYear);
    const month = plannerMonth === "all" ? null : Number(plannerMonth);
    return applications
      .filter(item => item.status === "pending_approval" || item.status === "approved")
      .filter(item => overlapsPlannerWindow(item, year, month))
      .filter(item => plannerDepartment === "all" || item.department === plannerDepartment)
      .filter(item => plannerLeaveType === "all" || item.leave_type === plannerLeaveType)
      .filter(item => plannerStatus === "all" || item.status === plannerStatus)
      .filter(item => !plannerEmployeeCode.trim() || item.employee_code.toLowerCase().includes(plannerEmployeeCode.trim().toLowerCase()))
      .filter(item => !plannerEmployeeName.trim() || item.employee_name.toLowerCase().includes(plannerEmployeeName.trim().toLowerCase()))
      .sort((left, right) => left.start_date.localeCompare(right.start_date) || left.employee_code.localeCompare(right.employee_code));
  }, [applications, plannerDepartment, plannerEmployeeCode, plannerEmployeeName, plannerLeaveType, plannerMonth, plannerStatus, plannerYear]);

  const appStats = useMemo(() => {
    const pending = applications.filter(app => app.status === "pending_approval").length;
    const approved = applications.filter(app => app.status === "approved").length;
    const rejected = applications.filter(app => app.status === "rejected").length;
    return [
      ["Applications", applications.length.toString()],
      ["Pending approval", pending.toString()],
      ["Approved", approved.toString()],
      ["Rejected", rejected.toString()]
    ];
  }, [applications]);

  const openCreate = () => {
    setSelectedApplication(null);
    setForm(initialForm);
    setModalMode("create");
  };

  const openApplication = (application: LeaveApplication, mode: ModalMode) => {
    setSelectedApplication(application);
    setForm({
      employee_id: application.employee_id,
      handover_to_employee_id: application.handover_to_employee_id ?? "",
      leave_type: application.leave_type,
      start_date: application.start_date,
      end_date: application.end_date,
      balance_before: Number(application.balance_before),
      purpose: application.purpose ?? "",
      destination: application.destination ?? "",
      travel_from: application.travel_from ?? "",
      travel_to: application.travel_to ?? "",
      emergency_contact_name: application.emergency_contact_name ?? "",
      emergency_contact_phone: application.emergency_contact_phone ?? "",
      emergency_contact_email: application.emergency_contact_email ?? ""
    });
    setModalMode(mode);
  };

  const saveApplication = (submit: boolean) => {
    startTransition(async () => {
      try {
        const employee = employees.find(item => item.id === form.employee_id);
        if (!employee) throw new Error("Select an employee before saving.");
        const handover = employees.find(item => item.id === form.handover_to_employee_id);
        const calendarDays = inclusiveDays(form.start_date, form.end_date);
        const workingDays = workingDaysBetween(form.start_date, form.end_date);
        const payload = leaveApplicationSchema.parse({
          employee_id: employee.id,
          employee_code: employee.employee_number,
          employee_name: employee.full_name,
          department: employee.department?.name ?? null,
          designation: employee.designation ?? null,
          leave_type: form.leave_type,
          start_date: form.start_date,
          end_date: form.end_date,
          calendar_days: calendarDays,
          working_days: workingDays,
          balance_before: Number(form.balance_before),
          balance_after: Number(form.balance_before),
          purpose: emptyToNull(form.purpose),
          destination: emptyToNull(form.destination),
          travel_from: emptyToNull(form.travel_from),
          travel_to: emptyToNull(form.travel_to),
          emergency_contact_name: emptyToNull(form.emergency_contact_name),
          emergency_contact_phone: emptyToNull(form.emergency_contact_phone),
          emergency_contact_email: emptyToNull(form.emergency_contact_email),
          handover_to_employee_id: handover?.id ?? null,
          handover_to_employee_code: handover?.employee_number ?? null,
          handover_to_name: handover?.full_name ?? null,
          status: submit ? "submitted" : "draft"
        });

        const { data: userData, error: userError } = await supabase.auth.getUser();
        if (userError) throw userError;

        let savedId = selectedApplication?.id ?? "";
        if (selectedApplication) {
          if (!["draft", "submitted"].includes(selectedApplication.status)) {
            throw new Error("Only draft or submitted applications can be edited.");
          }
          const { data, error } = await supabase
            .from("leave_applications")
            .update(payload)
            .eq("id", selectedApplication.id)
            .select("id")
            .single();
          if (error) throw error;
          savedId = data.id;
        } else {
          const { data, error } = await supabase
            .from("leave_applications")
            .insert({ ...payload, created_by: userData.user?.id ?? null })
            .select("id")
            .single();
          if (error) throw error;
          savedId = data.id;
        }

        await regeneratePdf(savedId);
        setModalMode(null);
        showToast(submit ? "Leave application submitted, approval linked, and PDF generated." : "Leave application saved as draft and PDF generated.", "success");
        await loadData();
      } catch (error) {
        showToast(errorMessage(error, "Unable to save leave application."), "error");
      }
    });
  };

  const cancelApplication = (application: LeaveApplication) => {
    startTransition(async () => {
      try {
        if (!["draft", "submitted", "pending_approval"].includes(application.status)) {
          throw new Error("Only draft, submitted, or pending applications can be cancelled.");
        }
        const { error } = await supabase.from("leave_applications").update({ status: "cancelled" }).eq("id", application.id);
        if (error) throw error;
        await regeneratePdf(application.id);
        showToast("Leave application cancelled and PDF updated. No balance was deducted.", "success");
        await loadData();
      } catch (error) {
        showToast(errorMessage(error, "Unable to cancel leave application."), "error");
      }
    });
  };

  const decideApproval = (approval: LeaveApproval, decision: "approved" | "rejected") => {
    startTransition(async () => {
      try {
        const payload = leaveApprovalDecisionUpdateSchema.parse({
          decision,
          approval_notes: approvalNotes || undefined
        });
        const { error } = await supabase
          .from("leave_approvals")
          .update({ ...payload, decision_date: new Date().toISOString() })
          .eq("id", approval.id);
        if (error) throw error;
        await regeneratePdf(approval.leave_application_id);
        setApprovalNotes("");
        showToast(decision === "approved" ? "Approval saved, PDF updated, and leave balance deducted once." : "Application rejected and PDF updated. No balance was deducted.", "success");
        await loadData();
      } catch (error) {
        showToast(errorMessage(error, "Unable to update approval decision."), "error");
      }
    });
  };

  const updateHandoverDraft = (handoverId: string, patch: Partial<{ tasks_notes: string; file: File | null }>) => {
    setHandoverDrafts(current => ({
      ...current,
      [handoverId]: {
        tasks_notes: current[handoverId]?.tasks_notes ?? handovers.find(item => item.id === handoverId)?.tasks_notes ?? "",
        file: current[handoverId]?.file ?? null,
        ...patch
      }
    }));
  };

  const saveHandover = (handover: LeaveHandover, accept = false) => {
    startTransition(async () => {
      try {
        if (handover.status === "cancelled") {
          throw new Error("Cancelled handovers cannot be updated.");
        }

        const draft = handoverDrafts[handover.id];
        let attachmentUrl = handover.attachment_url;
        if (draft?.file) {
          attachmentUrl = await uploadHandoverAttachment(handover, draft.file);
        }

        const payload = leaveHandoverUpdateSchema.parse({
          tasks_notes: emptyToNull(draft?.tasks_notes ?? handover.tasks_notes ?? ""),
          attachment_url: attachmentUrl,
          status: accept ? "accepted" : handover.status,
          accepted_at: accept ? new Date().toISOString() : handover.accepted_at
        });

        const { error } = await supabase
          .from("leave_handovers")
          .update(payload)
          .eq("id", handover.id);
        if (error) throw error;

        setHandoverDrafts(current => {
          const next = { ...current };
          delete next[handover.id];
          return next;
        });
        showToast(accept ? "Handover accepted and linked to the leave application." : "Handover notes saved.", "success");
        await loadData();
      } catch (error) {
        showToast(errorMessage(error, "Unable to update handover."), "error");
      }
    });
  };

  const uploadHandoverAttachment = async (handover: LeaveHandover, file: File) => {
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "-").slice(0, 120) || "attachment";
    const storagePath = `hr/leave-handovers/${handover.id}/${Date.now()}-${safeName}`;
    const { error } = await supabase.storage
      .from("documents")
      .upload(storagePath, file, { contentType: file.type || "application/octet-stream", upsert: true });
    if (error) throw error;
    return storagePath;
  };

  const viewHandoverAttachment = (handover: LeaveHandover) => {
    startTransition(async () => {
      try {
        if (!handover.attachment_url) {
          showToast("No handover attachment has been uploaded for this record.", "info");
          return;
        }
        if (handover.attachment_url.startsWith("http")) {
          window.open(handover.attachment_url, "_blank", "noopener,noreferrer");
          return;
        }
        const { data, error } = await supabase.storage
          .from("documents")
          .createSignedUrl(handover.attachment_url, 3600);
        if (error) throw error;
        window.open(data.signedUrl, "_blank", "noopener,noreferrer");
      } catch (error) {
        showToast(errorMessage(error, "Unable to open handover attachment."), "error");
      }
    });
  };

  const updateClearanceDraft = (clearanceId: string, clearance: LeaveClearance, patch: Partial<{ clearance_items: string; responsible_person: string; status: string; comments: string }>) => {
    setClearanceDrafts(current => ({
      ...current,
      [clearanceId]: {
        clearance_items: current[clearanceId]?.clearance_items ?? clearance.clearance_items.join("\n"),
        responsible_person: current[clearanceId]?.responsible_person ?? clearance.responsible_person ?? "",
        status: current[clearanceId]?.status ?? clearance.status,
        comments: current[clearanceId]?.comments ?? clearance.comments ?? "",
        ...patch
      }
    }));
  };

  const saveClearance = (clearance: LeaveClearance) => {
    startTransition(async () => {
      try {
        const draft = clearanceDrafts[clearance.id] ?? {
          clearance_items: clearance.clearance_items.join("\n"),
          responsible_person: clearance.responsible_person ?? "",
          status: clearance.status,
          comments: clearance.comments ?? ""
        };
        const clearanceItems = draft.clearance_items
          .split(/\r?\n|,/)
          .map(item => item.trim())
          .filter(Boolean);
        const nextStatus = draft.status || clearance.status;
        const completedAt = nextStatus === "cleared"
          ? clearance.completed_at ?? new Date().toISOString()
          : null;
        const payload = leaveClearanceUpdateSchema.parse({
          clearance_items: clearanceItems,
          responsible_person: emptyToNull(draft.responsible_person),
          status: nextStatus,
          comments: emptyToNull(draft.comments),
          completed_at: completedAt
        });

        const { error } = await supabase
          .from("leave_clearances")
          .update(payload)
          .eq("id", clearance.id);
        if (error) throw error;

        setClearanceDrafts(current => {
          const next = { ...current };
          delete next[clearance.id];
          return next;
        });
        showToast(payload.status === "cleared" ? "Leave clearance completed." : "Leave clearance updated.", "success");
        await loadData();
      } catch (error) {
        showToast(errorMessage(error, "Unable to update leave clearance."), "error");
      }
    });
  };

  const updateRejoinDraft = (rejoinId: string, rejoin: LeaveRejoin, patch: Partial<{ actual_rejoin_date: string; reason_for_delay: string; status: string; file: File | null }>) => {
    setRejoinDrafts(current => ({
      ...current,
      [rejoinId]: {
        actual_rejoin_date: current[rejoinId]?.actual_rejoin_date ?? rejoin.actual_rejoin_date ?? "",
        reason_for_delay: current[rejoinId]?.reason_for_delay ?? rejoin.reason_for_delay ?? "",
        status: current[rejoinId]?.status ?? rejoin.status,
        file: current[rejoinId]?.file ?? null,
        ...patch
      }
    }));
  };

  const saveRejoin = (rejoin: LeaveRejoin) => {
    startTransition(async () => {
      try {
        const draft = rejoinDrafts[rejoin.id] ?? {
          actual_rejoin_date: rejoin.actual_rejoin_date ?? "",
          reason_for_delay: rejoin.reason_for_delay ?? "",
          status: rejoin.status,
          file: null
        };
        let attachmentUrl = rejoin.medical_or_supporting_attachment;
        if (draft.file) {
          attachmentUrl = await uploadRejoinAttachment(rejoin, draft.file);
        }

        let verifier = rejoin.hr_verified_by;
        let verifiedAt = rejoin.verified_at;
        if (draft.status === "verified") {
          const { data: userData, error: userError } = await supabase.auth.getUser();
          if (userError) throw userError;
          const userId = userData.user?.id;
          const { data: profile } = userId
            ? await supabase.from("profiles").select("full_name").eq("id", userId).maybeSingle()
            : { data: null };
          verifier = profile?.full_name ?? userData.user?.email ?? userId ?? "HR";
          verifiedAt = verifiedAt ?? new Date().toISOString();
        } else {
          verifier = null;
          verifiedAt = null;
        }

        const payload = leaveRejoinUpdateSchema.parse({
          actual_rejoin_date: draft.actual_rejoin_date || null,
          reason_for_delay: emptyToNull(draft.reason_for_delay),
          medical_or_supporting_attachment: attachmentUrl,
          status: draft.status,
          hr_verified_by: verifier,
          verified_at: verifiedAt
        });

        const { error } = await supabase
          .from("leave_rejoins")
          .update(payload)
          .eq("id", rejoin.id);
        if (error) throw error;

        setRejoinDrafts(current => {
          const next = { ...current };
          delete next[rejoin.id];
          return next;
        });
        showToast(payload.status === "verified" ? "Rejoin record verified by HR." : "Rejoin record updated.", "success");
        await loadData();
      } catch (error) {
        showToast(errorMessage(error, "Unable to update rejoin record."), "error");
      }
    });
  };

  const uploadRejoinAttachment = async (rejoin: LeaveRejoin, file: File) => {
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "-").slice(0, 120) || "attachment";
    const storagePath = `hr/leave-rejoins/${rejoin.id}/${Date.now()}-${safeName}`;
    const { error } = await supabase.storage
      .from("documents")
      .upload(storagePath, file, { contentType: file.type || "application/octet-stream", upsert: true });
    if (error) throw error;
    return storagePath;
  };

  const viewRejoinAttachment = (rejoin: LeaveRejoin) => {
    startTransition(async () => {
      try {
        if (!rejoin.medical_or_supporting_attachment) {
          showToast("No rejoin supporting attachment has been uploaded for this record.", "info");
          return;
        }
        if (rejoin.medical_or_supporting_attachment.startsWith("http")) {
          window.open(rejoin.medical_or_supporting_attachment, "_blank", "noopener,noreferrer");
          return;
        }
        const { data, error } = await supabase.storage
          .from("documents")
          .createSignedUrl(rejoin.medical_or_supporting_attachment, 3600);
        if (error) throw error;
        window.open(data.signedUrl, "_blank", "noopener,noreferrer");
      } catch (error) {
        showToast(errorMessage(error, "Unable to open rejoin attachment."), "error");
      }
    });
  };

  const showToast = (message: string, tone: ToastTone = "info") => {
    setToast({ message, tone });
    window.setTimeout(() => setToast(null), 3200);
  };

  const regeneratePdf = async (applicationId: string) => {
    const response = await fetch(`/api/hr/leave-applications/${applicationId}/pdf`, { method: "POST" });
    const payload = await response.json() as { signedUrl?: string; error?: string };
    if (!response.ok) throw new Error(payload.error ?? "Unable to generate leave application PDF.");
    return payload.signedUrl;
  };

  const viewPdf = (applicationId: string) => {
    startTransition(async () => {
      try {
        const signedUrl = await regeneratePdf(applicationId);
        if (!signedUrl) throw new Error("The generated PDF could not be opened.");
        window.open(signedUrl, "_blank", "noopener,noreferrer");
        await loadData();
      } catch (error) {
        showToast(errorMessage(error, "Unable to open leave application PDF."), "error");
      }
    });
  };

  const exportApplications = () => {
    void exportToExcel(filteredApplications.map(applicationExportRow), "leave-applications", "Applications");
  };

  const exportApprovals = () => {
    void exportToExcel(filteredApprovals.map(approvalExportRow), "leave-approvals", "Approvals");
  };

  return (
    <div className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {appStats.map(([label, value]) => (
          <div key={label} className="rounded-xl border bg-[var(--panel)] p-4 shadow-soft">
            <div className="text-[11px] font-semibold text-[var(--muted)]">{label}</div>
            <div className="mt-2 text-xl font-bold tabular">{value}</div>
          </div>
        ))}
      </div>

      <section className="overflow-hidden rounded-2xl border bg-[var(--panel)] shadow-soft">
        <div className="flex flex-col justify-between gap-3 border-b px-5 pt-1 sm:flex-row sm:items-center">
          <div className="flex min-w-0 gap-1 overflow-x-auto">
            {leaveTabs.map(tab => (
              <button
                key={tab}
                onClick={() => {
                  setActiveTab(tab);
                  setStatusFilter("all");
                  setHandoverStatusFilter("all");
                  setClearanceStatusFilter("all");
                  setRejoinStatusFilter("all");
                }}
                className={cn("relative whitespace-nowrap px-3 py-4 text-xs font-semibold transition", activeTab === tab ? "text-teal-600" : "text-[var(--muted)] hover:text-[var(--text)]")}
              >
                {tab}
                {activeTab === tab && <span className="absolute inset-x-2 bottom-0 h-0.5 rounded-full bg-teal-500" />}
              </button>
            ))}
          </div>
          <div className="flex gap-2 pb-3 sm:pb-0">
            {activeTab === "Applications" && <Button onClick={openCreate}><Plus className="h-4 w-4" /> New application</Button>}
            {activeTab === "Applications" && <Button variant="secondary" onClick={exportApplications}><Download className="h-4 w-4" /> Export</Button>}
            {activeTab === "Approvals" && <Button variant="secondary" onClick={exportApprovals}><Download className="h-4 w-4" /> Export</Button>}
          </div>
        </div>

        {(activeTab === "Applications" || activeTab === "Approvals") && (
          <LeaveToolbar
            activeTab={activeTab}
            query={query}
            setQuery={setQuery}
            statusFilter={statusFilter}
            setStatusFilter={setStatusFilter}
            leaveTypeFilter={leaveTypeFilter}
            setLeaveTypeFilter={setLeaveTypeFilter}
            fromFilter={fromFilter}
            setFromFilter={setFromFilter}
            toFilter={toFilter}
            setToFilter={setToFilter}
            appSort={appSort}
            setAppSort={setAppSort}
            approvalSort={approvalSort}
            setApprovalSort={setApprovalSort}
            sortDirection={sortDirection}
            setSortDirection={setSortDirection}
          />
        )}

        {activeTab === "Job Handover" && (
          <HandoverToolbar
            query={handoverQuery}
            setQuery={setHandoverQuery}
            statusFilter={handoverStatusFilter}
            setStatusFilter={setHandoverStatusFilter}
            sort={handoverSort}
            setSort={setHandoverSort}
            sortDirection={handoverSortDirection}
            setSortDirection={setHandoverSortDirection}
          />
        )}

        {activeTab === "Clearance" && (
          <ClearanceToolbar
            query={clearanceQuery}
            setQuery={setClearanceQuery}
            statusFilter={clearanceStatusFilter}
            setStatusFilter={setClearanceStatusFilter}
            sort={clearanceSort}
            setSort={setClearanceSort}
            sortDirection={clearanceSortDirection}
            setSortDirection={setClearanceSortDirection}
          />
        )}

        {activeTab === "Rejoin" && (
          <RejoinToolbar
            query={rejoinQuery}
            setQuery={setRejoinQuery}
            statusFilter={rejoinStatusFilter}
            setStatusFilter={setRejoinStatusFilter}
            returnFrom={rejoinReturnFrom}
            setReturnFrom={setRejoinReturnFrom}
            returnTo={rejoinReturnTo}
            setReturnTo={setRejoinReturnTo}
            actualFrom={rejoinActualFrom}
            setActualFrom={setRejoinActualFrom}
            actualTo={rejoinActualTo}
            setActualTo={setRejoinActualTo}
            sort={rejoinSort}
            setSort={setRejoinSort}
            sortDirection={rejoinSortDirection}
            setSortDirection={setRejoinSortDirection}
          />
        )}

        {loading ? (
          <div className="flex min-h-64 items-center justify-center gap-3 text-sm text-[var(--muted)]">
            <Loader2 className="h-5 w-5 animate-spin text-teal-600" /> Loading leave records
          </div>
        ) : activeTab === "Annual Planner" ? (
          <AnnualPlanner
            rows={plannerApplications}
            year={plannerYear}
            setYear={setPlannerYear}
            month={plannerMonth}
            setMonth={setPlannerMonth}
            departments={plannerDepartments}
            department={plannerDepartment}
            setDepartment={setPlannerDepartment}
            employeeCode={plannerEmployeeCode}
            setEmployeeCode={setPlannerEmployeeCode}
            employeeName={plannerEmployeeName}
            setEmployeeName={setPlannerEmployeeName}
            leaveType={plannerLeaveType}
            setLeaveType={setPlannerLeaveType}
            status={plannerStatus}
            setStatus={setPlannerStatus}
            years={plannerYears}
          />
        ) : activeTab === "Applications" ? (
          <ApplicationsTable
            rows={filteredApplications}
            onView={row => openApplication(row, "view")}
            onEdit={row => openApplication(row, "edit")}
            onCancel={cancelApplication}
            onPdf={row => viewPdf(row.id)}
          />
        ) : activeTab === "Approvals" ? (
          <ApprovalsTable
            rows={filteredApprovals}
            applications={applications}
            approvalNotes={approvalNotes}
            setApprovalNotes={setApprovalNotes}
            onApprove={row => decideApproval(row, "approved")}
            onReject={row => decideApproval(row, "rejected")}
            onPdf={row => viewPdf(row.leave_application_id)}
            busy={isPending}
          />
        ) : activeTab === "Job Handover" ? (
          <HandoversTable
            rows={filteredHandovers}
            drafts={handoverDrafts}
            onDraftChange={updateHandoverDraft}
            onSave={row => saveHandover(row)}
            onAccept={row => saveHandover(row, true)}
            onAttachment={viewHandoverAttachment}
            busy={isPending}
          />
        ) : activeTab === "Clearance" ? (
          <ClearancesTable
            rows={filteredClearances}
            drafts={clearanceDrafts}
            onDraftChange={updateClearanceDraft}
            onSave={saveClearance}
            busy={isPending}
          />
        ) : activeTab === "Rejoin" ? (
          <RejoinsTable
            rows={filteredRejoins}
            drafts={rejoinDrafts}
            onDraftChange={updateRejoinDraft}
            onSave={saveRejoin}
            onAttachment={viewRejoinAttachment}
            busy={isPending}
          />
        ) : (
          <EmptyState title={`${activeTab} records`} description="This tab is ready for the next leave workflow step." />
        )}
      </section>

      {modalMode && (
        <ApplicationModal
          mode={modalMode}
          form={form}
          setForm={setForm}
          employees={employees}
          selectedApplication={selectedApplication}
          onClose={() => setModalMode(null)}
          onSaveDraft={() => saveApplication(false)}
          onSubmit={() => saveApplication(true)}
          busy={isPending}
        />
      )}

      {toast && (
        <div className={cn(
          "fixed bottom-5 right-5 z-50 max-w-md rounded-xl px-4 py-3 text-xs font-semibold text-white shadow-panel animate-in",
          toast.tone === "error" ? "bg-rose-700" : toast.tone === "success" ? "bg-emerald-700" : "bg-slate-900"
        )}>
          {toast.message}
        </div>
      )}
    </div>
  );
}

function AnnualPlanner(props: {
  rows: LeaveApplication[];
  year: string;
  setYear: (value: string) => void;
  month: string;
  setMonth: (value: string) => void;
  departments: Array<[string, string]>;
  department: string;
  setDepartment: (value: string) => void;
  employeeCode: string;
  setEmployeeCode: (value: string) => void;
  employeeName: string;
  setEmployeeName: (value: string) => void;
  leaveType: string;
  setLeaveType: (value: string) => void;
  status: string;
  setStatus: (value: string) => void;
  years: Array<[string, string]>;
}) {
  return (
    <div>
      <div className="grid gap-3 border-b px-5 py-3.5 xl:grid-cols-[.75fr_.9fr_1fr_1fr_1fr_1fr_.85fr]">
        <Select value={props.year} onChange={props.setYear} options={props.years} />
        <Select value={props.month} onChange={props.setMonth} options={monthOptions} />
        <Select value={props.department} onChange={props.setDepartment} options={props.departments} />
        <label className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            value={props.employeeCode}
            onChange={event => props.setEmployeeCode(event.target.value)}
            className="h-9 w-full rounded-lg border bg-[var(--panel)] pl-9 pr-3 text-sm outline-none transition focus:border-teal-500 focus:ring-2 focus:ring-teal-500/10"
            placeholder="Employee code"
          />
        </label>
        <label className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            value={props.employeeName}
            onChange={event => props.setEmployeeName(event.target.value)}
            className="h-9 w-full rounded-lg border bg-[var(--panel)] pl-9 pr-3 text-sm outline-none transition focus:border-teal-500 focus:ring-2 focus:ring-teal-500/10"
            placeholder="Employee name"
          />
        </label>
        <Select value={props.leaveType} onChange={props.setLeaveType} options={[["all", "All leave types"], ...leaveTypes.map(type => [type, type] as [string, string])]} />
        <Select value={props.status} onChange={props.setStatus} options={plannerStatuses.map(status => [status, label(status)] as [string, string])} />
      </div>

      <div className="border-b px-5 py-3">
        <div className="flex flex-wrap items-center gap-2">
          {leaveTypes.map(type => (
            <span key={type} className={cn("inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-semibold", leaveTone(type))}>{type}</span>
          ))}
        </div>
      </div>

      <div className="space-y-5 p-5">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h3 className="text-base font-bold">{props.month === "all" ? `${props.year} yearly leave calendar` : `${monthName(Number(props.month))} ${props.year} leave calendar`}</h3>
            <p className="mt-1 text-xs text-[var(--muted)]">Showing approved and pending approval leave applications only.</p>
          </div>
          <div className="rounded-lg border px-3 py-2 text-xs font-semibold text-[var(--muted)]">
            {props.rows.length} planned {props.rows.length === 1 ? "leave" : "leaves"}
          </div>
        </div>

        {props.rows.length === 0 ? (
          <EmptyState title="No planned leave" description="Approved and pending leave applications matching the selected filters will appear here." />
        ) : props.month === "all" ? (
          <YearPlanner rows={props.rows} year={Number(props.year)} />
        ) : (
          <MonthPlanner rows={props.rows} year={Number(props.year)} month={Number(props.month)} />
        )}

        {props.rows.length > 0 && <PlannerList rows={props.rows} />}
      </div>
    </div>
  );
}

function YearPlanner({ rows, year }: { rows: LeaveApplication[]; year: number }) {
  return (
    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
      {monthOptions.slice(1).map(([monthValue, monthLabel]) => {
        const month = Number(monthValue);
        const monthRows = rows.filter(row => overlapsPlannerWindow(row, year, month));
        return (
          <div key={monthValue} className="rounded-xl border bg-slate-50/60 p-4 dark:bg-slate-900/30">
            <div className="mb-3 flex items-center justify-between">
              <div className="text-sm font-bold">{monthLabel}</div>
              <div className="rounded-full bg-[var(--panel)] px-2 py-1 text-[10px] font-semibold text-[var(--muted)]">{monthRows.length}</div>
            </div>
            <div className="space-y-2">
              {monthRows.slice(0, 5).map(row => <PlannerEvent key={`${monthValue}-${row.id}`} row={row} compact />)}
              {monthRows.length === 0 && <div className="rounded-lg border border-dashed px-3 py-6 text-center text-xs text-[var(--muted)]">No leave</div>}
              {monthRows.length > 5 && <div className="text-[11px] font-semibold text-[var(--muted)]">+{monthRows.length - 5} more</div>}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function MonthPlanner({ rows, year, month }: { rows: LeaveApplication[]; year: number; month: number }) {
  const days = calendarDaysForMonth(year, month);
  const blanks = Array.from({ length: firstDayOfMonth(year, month) });
  return (
    <div className="overflow-hidden rounded-xl border">
      <div className="grid grid-cols-7 border-b bg-slate-50/80 text-center text-[10px] font-bold uppercase tracking-[.08em] text-slate-400 dark:bg-slate-900/50">
        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(day => <div key={day} className="border-r px-2 py-2 last:border-r-0">{day}</div>)}
      </div>
      <div className="grid grid-cols-7">
        {blanks.map((_, index) => <div key={`blank-${index}`} className="min-h-28 border-b border-r bg-slate-50/40 dark:bg-slate-950/20" />)}
        {days.map(day => {
          const dayRows = rows.filter(row => leaveCoversDate(row, day.iso));
          return (
            <div key={day.iso} className="min-h-28 border-b border-r p-2 last:border-r-0">
              <div className="mb-2 text-[11px] font-bold tabular text-[var(--muted)]">{day.day}</div>
              <div className="space-y-1.5">
                {dayRows.slice(0, 3).map(row => <PlannerEvent key={`${day.iso}-${row.id}`} row={row} compact />)}
                {dayRows.length > 3 && <div className="text-[10px] font-semibold text-[var(--muted)]">+{dayRows.length - 3} more</div>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function PlannerEvent({ row, compact = false }: { row: LeaveApplication; compact?: boolean }) {
  return (
    <div className={cn("rounded-lg border px-2 py-1.5", leaveTone(row.leave_type))}>
      <div className="flex items-center justify-between gap-2">
        <span className="truncate text-[11px] font-bold">{row.employee_code}</span>
        <span className="shrink-0 text-[10px] font-semibold">{label(row.status)}</span>
      </div>
      <div className="mt-0.5 truncate text-[11px]">{row.employee_name}</div>
      {!compact && <div className="mt-1 text-[10px]">{row.leave_type} - {formatDate(row.start_date)} to {formatDate(row.end_date)}</div>}
    </div>
  );
}

function PlannerList({ rows }: { rows: LeaveApplication[] }) {
  return (
    <div className="overflow-x-auto rounded-xl border">
      <table className="w-full min-w-[980px] border-collapse text-left">
        <thead>
          <tr className="border-b bg-slate-50/70 dark:bg-slate-900/40">
            {["Employee code", "Employee name", "Department", "Leave type", "From", "To", "Days", "Status"].map(header => (
              <th key={header} className="px-4 py-3 text-[10px] font-bold uppercase tracking-[.08em] text-slate-400">{header}</th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y">
          {rows.map(row => (
            <tr key={row.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/30">
              <Cell strong>{row.employee_code}</Cell>
              <Cell strong>{row.employee_name}</Cell>
              <Cell>{row.department ?? "-"}</Cell>
              <Cell><span className={cn("inline-flex rounded-full border px-2 py-1 text-[11px] font-semibold", leaveTone(row.leave_type))}>{row.leave_type}</span></Cell>
              <Cell>{formatDate(row.start_date)}</Cell>
              <Cell>{formatDate(row.end_date)}</Cell>
              <Cell>{formatNumber(row.calendar_days)}</Cell>
              <Cell><LeaveStatus value={row.status} /></Cell>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function LeaveToolbar(props: {
  activeTab: "Applications" | "Approvals";
  query: string;
  setQuery: (value: string) => void;
  statusFilter: string;
  setStatusFilter: (value: string) => void;
  leaveTypeFilter: string;
  setLeaveTypeFilter: (value: string) => void;
  fromFilter: string;
  setFromFilter: (value: string) => void;
  toFilter: string;
  setToFilter: (value: string) => void;
  appSort: LeaveApplicationSortKey;
  setAppSort: (value: LeaveApplicationSortKey) => void;
  approvalSort: LeaveApprovalSortKey;
  setApprovalSort: (value: LeaveApprovalSortKey) => void;
  sortDirection: "asc" | "desc";
  setSortDirection: (value: "asc" | "desc") => void;
}) {
  const statuses = props.activeTab === "Applications" ? applicationStatuses : approvalStatuses;
  return (
    <div className="grid gap-3 border-b px-5 py-3.5 xl:grid-cols-[1.4fr_.9fr_.9fr_.9fr_.9fr_.9fr_auto]">
      <label className="relative min-w-[220px]">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input
          value={props.query}
          onChange={event => props.setQuery(event.target.value)}
          className="h-9 w-full rounded-lg border bg-[var(--panel)] pl-9 pr-3 text-sm outline-none transition focus:border-teal-500 focus:ring-2 focus:ring-teal-500/10"
          placeholder="Search code, employee, request, department, type, status..."
        />
      </label>
      <Select value={props.statusFilter} onChange={props.setStatusFilter} options={statuses.map(status => [status, label(status)])} />
      <Select value={props.leaveTypeFilter} onChange={props.setLeaveTypeFilter} options={[["all", "All leave types"], ...leaveTypes.map(type => [type, type] as [string, string])]} />
      <DateInput value={props.fromFilter} onChange={props.setFromFilter} label="From" />
      <DateInput value={props.toFilter} onChange={props.setToFilter} label="To" />
      {props.activeTab === "Applications" ? (
        <Select value={props.appSort} onChange={value => props.setAppSort(value as LeaveApplicationSortKey)} options={applicationSortOptions} />
      ) : (
        <Select value={props.approvalSort} onChange={value => props.setApprovalSort(value as LeaveApprovalSortKey)} options={approvalSortOptions} />
      )}
      <button
        title="Toggle sort direction"
        onClick={() => props.setSortDirection(props.sortDirection === "asc" ? "desc" : "asc")}
        className="inline-flex h-9 items-center justify-center gap-2 rounded-lg border px-3 text-sm font-semibold text-[var(--muted)] hover:text-[var(--text)]"
      >
        <ArrowDownUp className="h-4 w-4" /> {props.sortDirection.toUpperCase()}
      </button>
    </div>
  );
}

function HandoverToolbar(props: {
  query: string;
  setQuery: (value: string) => void;
  statusFilter: string;
  setStatusFilter: (value: string) => void;
  sort: LeaveHandoverSortKey;
  setSort: (value: LeaveHandoverSortKey) => void;
  sortDirection: "asc" | "desc";
  setSortDirection: (value: "asc" | "desc") => void;
}) {
  return (
    <div className="grid gap-3 border-b px-5 py-3.5 lg:grid-cols-[1.5fr_.8fr_.9fr_auto]">
      <label className="relative min-w-[220px]">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input
          value={props.query}
          onChange={event => props.setQuery(event.target.value)}
          className="h-9 w-full rounded-lg border bg-[var(--panel)] pl-9 pr-3 text-sm outline-none transition focus:border-teal-500 focus:ring-2 focus:ring-teal-500/10"
          placeholder="Search employee code, request, handover code, status..."
        />
      </label>
      <Select value={props.statusFilter} onChange={props.setStatusFilter} options={handoverStatuses.map(status => [status, label(status)])} />
      <Select value={props.sort} onChange={value => props.setSort(value as LeaveHandoverSortKey)} options={handoverSortOptions} />
      <button
        title="Toggle sort direction"
        onClick={() => props.setSortDirection(props.sortDirection === "asc" ? "desc" : "asc")}
        className="inline-flex h-9 items-center justify-center gap-2 rounded-lg border px-3 text-sm font-semibold text-[var(--muted)] hover:text-[var(--text)]"
      >
        <ArrowDownUp className="h-4 w-4" /> {props.sortDirection.toUpperCase()}
      </button>
    </div>
  );
}

function ClearanceToolbar(props: {
  query: string;
  setQuery: (value: string) => void;
  statusFilter: string;
  setStatusFilter: (value: string) => void;
  sort: LeaveClearanceSortKey;
  setSort: (value: LeaveClearanceSortKey) => void;
  sortDirection: "asc" | "desc";
  setSortDirection: (value: "asc" | "desc") => void;
}) {
  return (
    <div className="grid gap-3 border-b px-5 py-3.5 lg:grid-cols-[1.5fr_.8fr_.9fr_auto]">
      <label className="relative min-w-[220px]">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input
          value={props.query}
          onChange={event => props.setQuery(event.target.value)}
          className="h-9 w-full rounded-lg border bg-[var(--panel)] pl-9 pr-3 text-sm outline-none transition focus:border-teal-500 focus:ring-2 focus:ring-teal-500/10"
          placeholder="Search employee code, request, department, status..."
        />
      </label>
      <Select value={props.statusFilter} onChange={props.setStatusFilter} options={clearanceStatuses.map(status => [status, label(status)])} />
      <Select value={props.sort} onChange={value => props.setSort(value as LeaveClearanceSortKey)} options={clearanceSortOptions} />
      <button
        title="Toggle sort direction"
        onClick={() => props.setSortDirection(props.sortDirection === "asc" ? "desc" : "asc")}
        className="inline-flex h-9 items-center justify-center gap-2 rounded-lg border px-3 text-sm font-semibold text-[var(--muted)] hover:text-[var(--text)]"
      >
        <ArrowDownUp className="h-4 w-4" /> {props.sortDirection.toUpperCase()}
      </button>
    </div>
  );
}

function RejoinToolbar(props: {
  query: string;
  setQuery: (value: string) => void;
  statusFilter: string;
  setStatusFilter: (value: string) => void;
  returnFrom: string;
  setReturnFrom: (value: string) => void;
  returnTo: string;
  setReturnTo: (value: string) => void;
  actualFrom: string;
  setActualFrom: (value: string) => void;
  actualTo: string;
  setActualTo: (value: string) => void;
  sort: LeaveRejoinSortKey;
  setSort: (value: LeaveRejoinSortKey) => void;
  sortDirection: "asc" | "desc";
  setSortDirection: (value: "asc" | "desc") => void;
}) {
  return (
    <div className="grid gap-3 border-b px-5 py-3.5 xl:grid-cols-[1.4fr_.85fr_.85fr_.85fr_.85fr_.9fr_.9fr_auto]">
      <label className="relative min-w-[220px]">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input
          value={props.query}
          onChange={event => props.setQuery(event.target.value)}
          className="h-9 w-full rounded-lg border bg-[var(--panel)] pl-9 pr-3 text-sm outline-none transition focus:border-teal-500 focus:ring-2 focus:ring-teal-500/10"
          placeholder="Search code, request, employee, status..."
        />
      </label>
      <Select value={props.statusFilter} onChange={props.setStatusFilter} options={rejoinStatuses.map(status => [status, label(status)])} />
      <DateInput value={props.returnFrom} onChange={props.setReturnFrom} label="Return from" />
      <DateInput value={props.returnTo} onChange={props.setReturnTo} label="Return to" />
      <DateInput value={props.actualFrom} onChange={props.setActualFrom} label="Actual from" />
      <DateInput value={props.actualTo} onChange={props.setActualTo} label="Actual to" />
      <Select value={props.sort} onChange={value => props.setSort(value as LeaveRejoinSortKey)} options={rejoinSortOptions} />
      <button
        title="Toggle sort direction"
        onClick={() => props.setSortDirection(props.sortDirection === "asc" ? "desc" : "asc")}
        className="inline-flex h-9 items-center justify-center gap-2 rounded-lg border px-3 text-sm font-semibold text-[var(--muted)] hover:text-[var(--text)]"
      >
        <ArrowDownUp className="h-4 w-4" /> {props.sortDirection.toUpperCase()}
      </button>
    </div>
  );
}

function ApplicationsTable({ rows, onView, onEdit, onCancel, onPdf }: {
  rows: LeaveApplication[];
  onView: (row: LeaveApplication) => void;
  onEdit: (row: LeaveApplication) => void;
  onCancel: (row: LeaveApplication) => void;
  onPdf: (row: LeaveApplication) => void;
}) {
  if (!rows.length) return <EmptyState title="No leave applications" description="Create or adjust filters to see leave applications." />;
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[1180px] border-collapse text-left">
        <thead>
          <tr className="border-b bg-slate-50/70 dark:bg-slate-900/40">
            {["Request", "Employee code", "Employee", "Department", "Leave type", "From", "To", "Days", "Balance", "Status", ""].map(header => (
              <th key={header} className="px-4 py-3 text-[10px] font-bold uppercase tracking-[.08em] text-slate-400">{header}</th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y">
          {rows.map(row => (
            <tr key={row.id} className="group transition hover:bg-slate-50/70 dark:hover:bg-slate-800/30">
              <Cell strong>{row.request_no}</Cell>
              <Cell>{row.employee_code}</Cell>
              <Cell strong>{row.employee_name}</Cell>
              <Cell>{row.department ?? "-"}</Cell>
              <Cell>{row.leave_type}</Cell>
              <Cell>{formatDate(row.start_date)}</Cell>
              <Cell>{formatDate(row.end_date)}</Cell>
              <Cell>{formatNumber(row.working_days)}</Cell>
              <Cell>{formatNumber(row.balance_after)}</Cell>
              <Cell><LeaveStatus value={row.status} /></Cell>
              <td className="px-4 py-3">
                <div className="flex justify-end gap-1">
                  <IconButton title="View" onClick={() => onView(row)}><Eye className="h-4 w-4" /></IconButton>
                  {["draft", "submitted"].includes(row.status) && <IconButton title="Edit" onClick={() => onEdit(row)}><Edit3 className="h-4 w-4" /></IconButton>}
                  <IconButton title="View PDF" onClick={() => onPdf(row)}><FileText className="h-4 w-4" /></IconButton>
                  {["draft", "submitted", "pending_approval"].includes(row.status) && <IconButton title="Cancel" danger onClick={() => onCancel(row)}><XCircle className="h-4 w-4" /></IconButton>}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function HandoversTable({ rows, drafts, onDraftChange, onSave, onAccept, onAttachment, busy }: {
  rows: LeaveHandover[];
  drafts: Record<string, { tasks_notes: string; file: File | null }>;
  onDraftChange: (handoverId: string, patch: Partial<{ tasks_notes: string; file: File | null }>) => void;
  onSave: (row: LeaveHandover) => void;
  onAccept: (row: LeaveHandover) => void;
  onAttachment: (row: LeaveHandover) => void;
  busy: boolean;
}) {
  if (!rows.length) {
    return <EmptyState title="No job handovers" description="Submitted leave applications with a handover employee will appear here automatically." />;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[1420px] border-collapse text-left">
        <thead>
          <tr className="border-b bg-slate-50/70 dark:bg-slate-900/40">
            {["Request", "Employee code", "Employee", "Leave dates", "Handover code", "Handover employee", "Tasks / notes", "Attachment", "Status", "Accepted at", ""].map(header => (
              <th key={header} className="px-4 py-3 text-[10px] font-bold uppercase tracking-[.08em] text-slate-400">{header}</th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y">
          {rows.map(row => {
            const draft = drafts[row.id];
            const tasksNotes = draft?.tasks_notes ?? row.tasks_notes ?? "";
            const canEdit = row.status !== "cancelled";
            return (
              <tr key={row.id} className="group transition hover:bg-slate-50/70 dark:hover:bg-slate-800/30">
                <Cell strong>{row.request_no}</Cell>
                <Cell>{row.employee_code}</Cell>
                <Cell strong>{row.employee_name}</Cell>
                <Cell>{formatDate(row.leave_start_date)} to {formatDate(row.leave_end_date)}</Cell>
                <Cell>{row.handover_to_employee_code}</Cell>
                <Cell strong>{row.handover_to_name}</Cell>
                <td className="px-4 py-3">
                  <textarea
                    disabled={!canEdit}
                    value={tasksNotes}
                    onChange={event => onDraftChange(row.id, { tasks_notes: event.target.value })}
                    className="min-h-16 w-64 rounded-lg border bg-[var(--panel)] px-3 py-2 text-xs outline-none transition focus:border-teal-500 focus:ring-2 focus:ring-teal-500/10 disabled:opacity-70"
                    placeholder="Duties, pending tasks, access notes..."
                  />
                </td>
                <td className="px-4 py-3">
                  <div className="flex min-w-[180px] flex-col gap-2">
                    <div className="flex items-center gap-1">
                      <input
                        disabled={!canEdit}
                        id={`handover-attachment-${row.id}`}
                        type="file"
                        accept=".pdf,.png,.jpg,.jpeg,.docx,.xlsx,application/pdf,image/png,image/jpeg,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                        className="sr-only"
                        onChange={event => onDraftChange(row.id, { file: event.target.files?.[0] ?? null })}
                      />
                      <label
                        htmlFor={`handover-attachment-${row.id}`}
                        className={cn("inline-flex h-8 cursor-pointer items-center justify-center gap-2 rounded-lg border px-2.5 text-xs font-semibold text-slate-500 transition hover:bg-slate-100 dark:hover:bg-slate-800", !canEdit && "pointer-events-none opacity-50")}
                      >
                        <Upload className="h-3.5 w-3.5" /> Upload
                      </label>
                      <IconButton title="View attachment" disabled={!row.attachment_url} onClick={() => onAttachment(row)}><Paperclip className="h-4 w-4" /></IconButton>
                    </div>
                    <div className="max-w-[180px] truncate text-[10px] font-semibold text-[var(--muted)]">
                      {draft?.file?.name ?? (row.attachment_url ? row.attachment_url.split("/").at(-1) : "No attachment")}
                    </div>
                  </div>
                </td>
                <Cell><HandoverStatus value={row.status} /></Cell>
                <Cell>{row.accepted_at ? formatDate(row.accepted_at) : "-"}</Cell>
                <td className="px-4 py-3">
                  <div className="flex justify-end gap-1">
                    <IconButton title="Save handover" disabled={!canEdit || busy} onClick={() => onSave(row)}><Save className="h-4 w-4" /></IconButton>
                    {row.status === "pending" && <IconButton title="Accept handover" disabled={busy} onClick={() => onAccept(row)}><Check className="h-4 w-4" /></IconButton>}
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function ClearancesTable({ rows, drafts, onDraftChange, onSave, busy }: {
  rows: LeaveClearance[];
  drafts: Record<string, { clearance_items: string; responsible_person: string; status: string; comments: string }>;
  onDraftChange: (clearanceId: string, clearance: LeaveClearance, patch: Partial<{ clearance_items: string; responsible_person: string; status: string; comments: string }>) => void;
  onSave: (row: LeaveClearance) => void;
  busy: boolean;
}) {
  if (!rows.length) {
    return <EmptyState title="No leave clearance records" description="Approved leave applications will appear here automatically when clearance review is required." />;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[1480px] border-collapse text-left">
        <thead>
          <tr className="border-b bg-slate-50/70 dark:bg-slate-900/40">
            {["Request", "Employee code", "Employee", "Department", "Leave dates", "Clearance items", "Responsible person", "Status", "Comments", "Completed at", ""].map(header => (
              <th key={header} className="px-4 py-3 text-[10px] font-bold uppercase tracking-[.08em] text-slate-400">{header}</th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y">
          {rows.map(row => {
            const draft = drafts[row.id];
            const clearanceItems = draft?.clearance_items ?? row.clearance_items.join("\n");
            const responsiblePerson = draft?.responsible_person ?? row.responsible_person ?? "";
            const status = draft?.status ?? row.status;
            const comments = draft?.comments ?? row.comments ?? "";
            return (
              <tr key={row.id} className="group transition hover:bg-slate-50/70 dark:hover:bg-slate-800/30">
                <Cell strong>{row.request_no}</Cell>
                <Cell>{row.employee_code}</Cell>
                <Cell strong>{row.employee_name}</Cell>
                <Cell>{row.department ?? "-"}</Cell>
                <Cell>{formatDate(row.leave_start_date)} to {formatDate(row.leave_end_date)}</Cell>
                <td className="px-4 py-3">
                  <textarea
                    value={clearanceItems}
                    onChange={event => onDraftChange(row.id, row, { clearance_items: event.target.value })}
                    className="min-h-20 w-72 rounded-lg border bg-[var(--panel)] px-3 py-2 text-xs outline-none transition focus:border-teal-500 focus:ring-2 focus:ring-teal-500/10"
                    placeholder="One clearance item per line"
                  />
                </td>
                <td className="px-4 py-3">
                  <input
                    value={responsiblePerson}
                    onChange={event => onDraftChange(row.id, row, { responsible_person: event.target.value })}
                    className="h-9 w-48 rounded-lg border bg-[var(--panel)] px-3 text-xs outline-none transition focus:border-teal-500 focus:ring-2 focus:ring-teal-500/10"
                    placeholder="Responsible person"
                  />
                </td>
                <td className="px-4 py-3">
                  <div className="flex min-w-40 flex-col gap-2">
                    <Select value={status} onChange={value => onDraftChange(row.id, row, { status: value })} options={clearanceStatuses.filter(item => item !== "all").map(item => [item, label(item)] as [string, string])} />
                    <ClearanceStatus value={status} />
                  </div>
                </td>
                <td className="px-4 py-3">
                  <textarea
                    value={comments}
                    onChange={event => onDraftChange(row.id, row, { comments: event.target.value })}
                    className="min-h-20 w-64 rounded-lg border bg-[var(--panel)] px-3 py-2 text-xs outline-none transition focus:border-teal-500 focus:ring-2 focus:ring-teal-500/10"
                    placeholder="HR/Admin comments"
                  />
                </td>
                <Cell>{row.completed_at ? formatDate(row.completed_at) : "-"}</Cell>
                <td className="px-4 py-3">
                  <div className="flex justify-end gap-1">
                    <IconButton title="Save clearance" disabled={busy} onClick={() => onSave(row)}><Save className="h-4 w-4" /></IconButton>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function RejoinsTable({ rows, drafts, onDraftChange, onSave, onAttachment, busy }: {
  rows: LeaveRejoin[];
  drafts: Record<string, { actual_rejoin_date: string; reason_for_delay: string; status: string; file: File | null }>;
  onDraftChange: (rejoinId: string, rejoin: LeaveRejoin, patch: Partial<{ actual_rejoin_date: string; reason_for_delay: string; status: string; file: File | null }>) => void;
  onSave: (row: LeaveRejoin) => void;
  onAttachment: (row: LeaveRejoin) => void;
  busy: boolean;
}) {
  if (!rows.length) {
    return <EmptyState title="No rejoin records" description="Approved leave applications will appear here automatically for HR rejoin tracking." />;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[1580px] border-collapse text-left">
        <thead>
          <tr className="border-b bg-slate-50/70 dark:bg-slate-900/40">
            {["Request", "Employee code", "Employee", "Original return", "Actual rejoin", "Delay", "Reason for delay", "Attachment", "Status", "HR verified by", "Verified at", ""].map(header => (
              <th key={header} className="px-4 py-3 text-[10px] font-bold uppercase tracking-[.08em] text-slate-400">{header}</th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y">
          {rows.map(row => {
            const draft = drafts[row.id];
            const actualRejoinDate = draft?.actual_rejoin_date ?? row.actual_rejoin_date ?? "";
            const reasonForDelay = draft?.reason_for_delay ?? row.reason_for_delay ?? "";
            const status = draft?.status ?? row.status;
            const delayDays = calculateDelayDays(row.original_return_date, actualRejoinDate) ?? row.delay_days;
            return (
              <tr key={row.id} className="group transition hover:bg-slate-50/70 dark:hover:bg-slate-800/30">
                <Cell strong>{row.request_no}</Cell>
                <Cell>{row.employee_code}</Cell>
                <Cell strong>{row.employee_name}</Cell>
                <Cell>{formatDate(row.original_return_date)}</Cell>
                <td className="px-4 py-3">
                  <DateInput value={actualRejoinDate} onChange={value => onDraftChange(row.id, row, { actual_rejoin_date: value })} />
                </td>
                <Cell>{formatNumber(delayDays)}</Cell>
                <td className="px-4 py-3">
                  <textarea
                    value={reasonForDelay}
                    onChange={event => onDraftChange(row.id, row, { reason_for_delay: event.target.value })}
                    className="min-h-20 w-64 rounded-lg border bg-[var(--panel)] px-3 py-2 text-xs outline-none transition focus:border-teal-500 focus:ring-2 focus:ring-teal-500/10"
                    placeholder="Reason for late/no show return"
                  />
                </td>
                <td className="px-4 py-3">
                  <div className="flex min-w-[190px] flex-col gap-2">
                    <div className="flex items-center gap-1">
                      <input
                        id={`rejoin-attachment-${row.id}`}
                        type="file"
                        accept=".pdf,.png,.jpg,.jpeg,.docx,.xlsx,application/pdf,image/png,image/jpeg,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                        className="sr-only"
                        onChange={event => onDraftChange(row.id, row, { file: event.target.files?.[0] ?? null })}
                      />
                      <label
                        htmlFor={`rejoin-attachment-${row.id}`}
                        className="inline-flex h-8 cursor-pointer items-center justify-center gap-2 rounded-lg border px-2.5 text-xs font-semibold text-slate-500 transition hover:bg-slate-100 dark:hover:bg-slate-800"
                      >
                        <Upload className="h-3.5 w-3.5" /> Upload
                      </label>
                      <IconButton title="View attachment" disabled={!row.medical_or_supporting_attachment} onClick={() => onAttachment(row)}><Paperclip className="h-4 w-4" /></IconButton>
                    </div>
                    <div className="max-w-[190px] truncate text-[10px] font-semibold text-[var(--muted)]">
                      {draft?.file?.name ?? (row.medical_or_supporting_attachment ? row.medical_or_supporting_attachment.split("/").at(-1) : "No attachment")}
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <div className="flex min-w-44 flex-col gap-2">
                    <Select value={status} onChange={value => onDraftChange(row.id, row, { status: value })} options={rejoinStatuses.filter(item => item !== "all").map(item => [item, label(item)] as [string, string])} />
                    <RejoinStatus value={status} />
                  </div>
                </td>
                <Cell>{row.hr_verified_by ?? "-"}</Cell>
                <Cell>{row.verified_at ? formatDate(row.verified_at) : "-"}</Cell>
                <td className="px-4 py-3">
                  <div className="flex justify-end gap-1">
                    <IconButton title="Save rejoin" disabled={busy} onClick={() => onSave(row)}><Save className="h-4 w-4" /></IconButton>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function ApprovalsTable({ rows, applications, approvalNotes, setApprovalNotes, onApprove, onReject, onPdf, busy }: {
  rows: LeaveApproval[];
  applications: LeaveApplication[];
  approvalNotes: string;
  setApprovalNotes: (value: string) => void;
  onApprove: (row: LeaveApproval) => void;
  onReject: (row: LeaveApproval) => void;
  onPdf: (row: LeaveApproval) => void;
  busy: boolean;
}) {
  if (!rows.length) return <EmptyState title="No approval records" description="Submitted applications will appear here automatically." />;
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[1180px] border-collapse text-left">
        <thead>
          <tr className="border-b bg-slate-50/70 dark:bg-slate-900/40">
            {["Decision", "Request", "Employee code", "Employee", "From", "To", "Days", "Approver", "Decision date", "Status", ""].map(header => (
              <th key={header} className="px-4 py-3 text-[10px] font-bold uppercase tracking-[.08em] text-slate-400">{header}</th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y">
          {rows.map(row => {
            const application = applications.find(item => item.id === row.leave_application_id);
            return (
              <tr key={row.id} className="group transition hover:bg-slate-50/70 dark:hover:bg-slate-800/30">
                <Cell strong>{row.decision_no}</Cell>
                <Cell>{row.request_no}</Cell>
                <Cell>{row.employee_code}</Cell>
                <Cell strong>{row.employee_name}</Cell>
                <Cell>{formatDate(row.approved_from)}</Cell>
                <Cell>{formatDate(row.approved_to)}</Cell>
                <Cell>{formatNumber(row.days)}</Cell>
                <Cell>{row.approver_name ?? "Unassigned"}</Cell>
                <Cell>{row.decision_date ? formatDate(row.decision_date) : "-"}</Cell>
                <Cell><ApprovalStatus value={row.decision} /></Cell>
                <td className="px-4 py-3">
                  <div className="flex min-w-[210px] items-center justify-end gap-1">
                    <IconButton title="View PDF" onClick={() => onPdf(row)}><FileText className="h-4 w-4" /></IconButton>
                    {row.decision === "pending" && (
                      <>
                        <input
                          value={approvalNotes}
                          onChange={event => setApprovalNotes(event.target.value)}
                          className="h-8 w-28 rounded-md border bg-[var(--panel)] px-2 text-xs outline-none focus:border-teal-500"
                          placeholder="Notes"
                        />
                        <IconButton title={`Approve ${application?.request_no ?? row.request_no}`} disabled={busy} onClick={() => onApprove(row)}><Check className="h-4 w-4" /></IconButton>
                        <IconButton title={`Reject ${application?.request_no ?? row.request_no}`} danger disabled={busy} onClick={() => onReject(row)}><X className="h-4 w-4" /></IconButton>
                      </>
                    )}
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function ApplicationModal({ mode, form, setForm, employees, selectedApplication, onClose, onSaveDraft, onSubmit, busy }: {
  mode: ModalMode;
  form: LeaveApplicationFormValues;
  setForm: (value: LeaveApplicationFormValues) => void;
  employees: EmployeeOption[];
  selectedApplication: LeaveApplication | null;
  onClose: () => void;
  onSaveDraft: () => void;
  onSubmit: () => void;
  busy: boolean;
}) {
  const readOnly = mode === "view";
  const workingDays = workingDaysBetween(form.start_date, form.end_date);
  const calendarDays = inclusiveDays(form.start_date, form.end_date);
  const balanceAfter = Math.max(Number(form.balance_before) - workingDays, 0);
  const employeeOptions: Array<[string, string]> = [["", "Select employee"], ...employees.map(employee => [employee.id, `${employee.employee_number} - ${employee.full_name}`] as [string, string])];

  const update = (patch: Partial<LeaveApplicationFormValues>) => setForm({ ...form, ...patch });

  return (
    <div className="fixed inset-0 z-[80] flex items-start justify-center overflow-y-auto bg-slate-950/55 px-4 py-8 backdrop-blur-sm">
      <div className="w-full max-w-5xl overflow-hidden rounded-2xl border bg-[var(--panel)] shadow-2xl animate-in">
        <div className="flex items-center justify-between border-b px-5 py-4">
          <div>
            <div className="text-[10px] font-bold uppercase tracking-widest text-teal-600">Leave application</div>
            <h2 className="mt-1 text-lg font-bold">{mode === "create" ? "New application" : selectedApplication?.request_no}</h2>
          </div>
          <IconButton title="Close" onClick={onClose}><X className="h-4 w-4" /></IconButton>
        </div>
        <div className="grid gap-4 p-5 md:grid-cols-2 xl:grid-cols-3">
          <Field label="Employee">
            <Select disabled={readOnly} value={form.employee_id} onChange={value => update({ employee_id: value })} options={employeeOptions} />
          </Field>
          <Field label="Leave type">
            <Select disabled={readOnly} value={form.leave_type} onChange={value => update({ leave_type: value })} options={leaveTypes.map(type => [type, type])} />
          </Field>
          <Field label="Handover to">
            <Select disabled={readOnly} value={form.handover_to_employee_id} onChange={value => update({ handover_to_employee_id: value })} options={[["", "No handover"], ...employeeOptions.slice(1)]} />
          </Field>
          <Field label="Start date"><DateInput disabled={readOnly} value={form.start_date} onChange={value => update({ start_date: value })} /></Field>
          <Field label="End date"><DateInput disabled={readOnly} value={form.end_date} onChange={value => update({ end_date: value })} /></Field>
          <Field label="Balance before">
            <input disabled={readOnly} type="number" min="0" step="0.5" value={form.balance_before} onChange={event => update({ balance_before: Number(event.target.value) })} className="h-9 w-full rounded-lg border bg-[var(--panel)] px-3 text-sm outline-none focus:border-teal-500" />
          </Field>
          <Field label="Calendar days"><ReadonlyValue value={formatNumber(calendarDays)} /></Field>
          <Field label="Working days"><ReadonlyValue value={formatNumber(workingDays)} /></Field>
          <Field label="Balance after approval"><ReadonlyValue value={formatNumber(balanceAfter)} /></Field>
          <Field label="Destination"><TextInput disabled={readOnly} value={form.destination} onChange={value => update({ destination: value })} /></Field>
          <Field label="Travel from"><DateInput disabled={readOnly} value={form.travel_from} onChange={value => update({ travel_from: value })} /></Field>
          <Field label="Travel to"><DateInput disabled={readOnly} value={form.travel_to} onChange={value => update({ travel_to: value })} /></Field>
          <Field label="Emergency contact"><TextInput disabled={readOnly} value={form.emergency_contact_name} onChange={value => update({ emergency_contact_name: value })} /></Field>
          <Field label="Emergency phone"><TextInput disabled={readOnly} value={form.emergency_contact_phone} onChange={value => update({ emergency_contact_phone: value })} /></Field>
          <Field label="Emergency email"><TextInput disabled={readOnly} value={form.emergency_contact_email} onChange={value => update({ emergency_contact_email: value })} /></Field>
          <div className="md:col-span-2 xl:col-span-3">
            <Field label="Purpose">
              <textarea disabled={readOnly} value={form.purpose} onChange={event => update({ purpose: event.target.value })} className="min-h-24 w-full rounded-lg border bg-[var(--panel)] px-3 py-2 text-sm outline-none focus:border-teal-500" />
            </Field>
          </div>
        </div>
        <div className="flex flex-wrap justify-end gap-2 border-t px-5 py-4">
          <Button variant="secondary" onClick={onClose}>Close</Button>
          {!readOnly && <Button variant="secondary" disabled={busy} onClick={onSaveDraft}>Save draft</Button>}
          {!readOnly && <Button disabled={busy} onClick={onSubmit}>{busy && <Loader2 className="h-4 w-4 animate-spin" />} Submit</Button>}
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="block"><span className="mb-1.5 block text-[11px] font-bold uppercase tracking-[.08em] text-slate-400">{label}</span>{children}</label>;
}

function Cell({ children, strong = false }: { children: React.ReactNode; strong?: boolean }) {
  return <td className={cn("px-4 py-3 text-xs", strong ? "font-semibold text-[var(--text)]" : "text-[var(--muted)]")}>{children}</td>;
}

function Select({ value, onChange, options, disabled = false }: { value: string; onChange: (value: string) => void; options: Array<[string, string]>; disabled?: boolean }) {
  return (
    <select disabled={disabled} value={value} onChange={event => onChange(event.target.value)} className="h-9 w-full rounded-lg border bg-[var(--panel)] px-3 text-sm outline-none transition focus:border-teal-500 focus:ring-2 focus:ring-teal-500/10 disabled:opacity-70">
      {options.map(([optionValue, labelText]) => <option key={optionValue} value={optionValue}>{labelText}</option>)}
    </select>
  );
}

function DateInput({ value, onChange, label, disabled = false }: { value: string; onChange: (value: string) => void; label?: string; disabled?: boolean }) {
  return (
    <div className="relative">
      {label && <CalendarDays className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />}
      <input disabled={disabled} aria-label={label} type="date" value={value} onChange={event => onChange(event.target.value)} className={cn("h-9 w-full rounded-lg border bg-[var(--panel)] px-3 text-sm outline-none transition focus:border-teal-500 focus:ring-2 focus:ring-teal-500/10 disabled:opacity-70", label && "pl-9")} />
    </div>
  );
}

function TextInput({ value, onChange, disabled = false }: { value: string; onChange: (value: string) => void; disabled?: boolean }) {
  return <input disabled={disabled} value={value} onChange={event => onChange(event.target.value)} className="h-9 w-full rounded-lg border bg-[var(--panel)] px-3 text-sm outline-none focus:border-teal-500 disabled:opacity-70" />;
}

function ReadonlyValue({ value }: { value: string }) {
  return <div className="flex h-9 items-center rounded-lg border bg-slate-50 px-3 text-sm font-semibold text-[var(--text)] dark:bg-slate-900/40">{value}</div>;
}

function IconButton({ title, children, onClick, danger = false, disabled = false }: { title: string; children: React.ReactNode; onClick: () => void; danger?: boolean; disabled?: boolean }) {
  return (
    <button
      title={title}
      disabled={disabled}
      onClick={onClick}
      className={cn("grid h-8 w-8 place-items-center rounded-lg border transition disabled:opacity-40", danger ? "text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40" : "text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800")}
    >
      {children}
    </button>
  );
}

function LeaveStatus({ value }: { value: string }) {
  if (value === "pending_approval") return <StatusBadge>Pending approval</StatusBadge>;
  return <StatusBadge>{label(value)}</StatusBadge>;
}

function ApprovalStatus({ value }: { value: string }) {
  return <StatusBadge>{label(value)}</StatusBadge>;
}

function HandoverStatus({ value }: { value: string }) {
  const classes = value === "accepted"
    ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/70 dark:bg-emerald-950/40 dark:text-emerald-200"
    : value === "cancelled"
      ? "border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-900/70 dark:bg-rose-950/40 dark:text-rose-200"
      : "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/70 dark:bg-amber-950/40 dark:text-amber-200";
  return <span className={cn("inline-flex rounded-full border px-2 py-1 text-[11px] font-semibold", classes)}>{label(value)}</span>;
}

function ClearanceStatus({ value }: { value: string }) {
  const classes = value === "cleared"
    ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/70 dark:bg-emerald-950/40 dark:text-emerald-200"
    : value === "blocked"
      ? "border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-900/70 dark:bg-rose-950/40 dark:text-rose-200"
      : value === "in_progress"
        ? "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-900/70 dark:bg-blue-950/40 dark:text-blue-200"
        : value === "not_required"
          ? "border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-700 dark:bg-slate-900/60 dark:text-slate-200"
          : "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/70 dark:bg-amber-950/40 dark:text-amber-200";
  return <span className={cn("inline-flex rounded-full border px-2 py-1 text-[11px] font-semibold", classes)}>{label(value)}</span>;
}

function RejoinStatus({ value }: { value: string }) {
  const classes = value === "verified"
    ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/70 dark:bg-emerald-950/40 dark:text-emerald-200"
    : value === "no_show"
      ? "border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-900/70 dark:bg-rose-950/40 dark:text-rose-200"
      : value === "delayed_rejoin"
        ? "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/70 dark:bg-amber-950/40 dark:text-amber-200"
        : value === "rejoined_on_time"
          ? "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-900/70 dark:bg-blue-950/40 dark:text-blue-200"
          : "border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-700 dark:bg-slate-900/60 dark:text-slate-200";
  return <span className={cn("inline-flex rounded-full border px-2 py-1 text-[11px] font-semibold", classes)}>{label(value)}</span>;
}

function matchesCommonFilters(input: {
  haystack: string;
  query: string;
  status: string;
  statusFilter: string;
  leaveType?: string;
  leaveTypeFilter: string;
  start: string;
  end: string;
  fromFilter: string;
  toFilter: string;
}) {
  if (input.query.trim() && !input.haystack.includes(input.query.trim().toLowerCase())) return false;
  if (input.statusFilter !== "all" && input.status !== input.statusFilter) return false;
  if (input.leaveTypeFilter !== "all" && input.leaveType !== input.leaveTypeFilter) return false;
  if (input.fromFilter && input.end < input.fromFilter) return false;
  if (input.toFilter && input.start > input.toFilter) return false;
  return true;
}

function sortRows<T>(rows: T[], key: keyof T & string, direction: "asc" | "desc") {
  return [...rows].sort((left, right) => {
    const leftValue = (left as Record<string, unknown>)[key] ?? "";
    const rightValue = (right as Record<string, unknown>)[key] ?? "";
    const result = typeof leftValue === "number" && typeof rightValue === "number"
      ? leftValue - rightValue
      : String(leftValue).localeCompare(String(rightValue), "en", { numeric: true, sensitivity: "base" });
    return direction === "asc" ? result : -result;
  });
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

function inclusiveDays(start: string, end: string) {
  if (!start || !end || end < start) return 0;
  const startDate = new Date(`${start}T00:00:00`);
  const endDate = new Date(`${end}T00:00:00`);
  return Math.floor((endDate.getTime() - startDate.getTime()) / 86400000) + 1;
}

function workingDaysBetween(start: string, end: string) {
  const days = inclusiveDays(start, end);
  if (!days) return 0;
  let count = 0;
  const current = new Date(`${start}T00:00:00`);
  for (let index = 0; index < days; index += 1) {
    const day = current.getDay();
    if (day !== 5 && day !== 6) count += 1;
    current.setDate(current.getDate() + 1);
  }
  return count || days;
}

function calculateDelayDays(originalReturnDate: string, actualRejoinDate: string) {
  if (!originalReturnDate || !actualRejoinDate) return null;
  const original = new Date(`${originalReturnDate}T00:00:00`);
  const actual = new Date(`${actualRejoinDate}T00:00:00`);
  if (Number.isNaN(original.getTime()) || Number.isNaN(actual.getTime())) return null;
  return Math.max(Math.floor((actual.getTime() - original.getTime()) / 86400000), 0);
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-QA", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(value));
}

function formatNumber(value: number) {
  return Number(value).toLocaleString("en-QA", { maximumFractionDigits: 2 });
}

function label(value: string) {
  if (value === "all") return "All statuses";
  return value.replaceAll("_", " ").replace(/\b\w/g, char => char.toUpperCase());
}

function emptyToNull(value: string) {
  return value.trim() ? value.trim() : null;
}

function overlapsPlannerWindow(row: LeaveApplication, year: number, month: number | null) {
  const windowStart = month ? dateKey(year, month, 1) : dateKey(year, 1, 1);
  const windowEnd = month ? dateKey(year, month, daysInMonth(year, month)) : dateKey(year, 12, 31);
  return row.start_date <= windowEnd && row.end_date >= windowStart;
}

function leaveCoversDate(row: LeaveApplication, isoDate: string) {
  return row.start_date <= isoDate && row.end_date >= isoDate;
}

function calendarDaysForMonth(year: number, month: number) {
  return Array.from({ length: daysInMonth(year, month) }, (_, index) => {
    const day = index + 1;
    return { day, iso: dateKey(year, month, day) };
  });
}

function daysInMonth(year: number, month: number) {
  return new Date(year, month, 0).getDate();
}

function firstDayOfMonth(year: number, month: number) {
  return new Date(year, month - 1, 1).getDay();
}

function dateKey(year: number, month: number, day: number) {
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function monthName(month: number) {
  return monthOptions.find(([value]) => value === String(month))?.[1] ?? "Month";
}

function leaveTone(type: string) {
  return leaveTypeTones[type] ?? leaveTypeTones.Other;
}

function errorMessage(error: unknown, fallback: string) {
  if (error instanceof z.ZodError) return error.issues[0]?.message ?? fallback;
  if (error instanceof Error) return error.message;
  if (typeof error === "object" && error && "message" in error) return String((error as { message?: unknown }).message ?? fallback);
  return fallback;
}

function openPdf(url: string | null, showToast: (message: string, tone: ToastTone) => void) {
  if (!url) {
    showToast("No PDF has been generated for this record yet.", "info");
    return;
  }
  window.open(url, "_blank", "noopener,noreferrer");
}

function applicationExportRow(row: LeaveApplication) {
  return {
    request_no: row.request_no,
    employee_code: row.employee_code,
    employee_name: row.employee_name,
    department: row.department,
    designation: row.designation,
    leave_type: row.leave_type,
    start_date: row.start_date,
    end_date: row.end_date,
    calendar_days: row.calendar_days,
    working_days: row.working_days,
    balance_before: row.balance_before,
    balance_after: row.balance_after,
    status: row.status
  };
}

function approvalExportRow(row: LeaveApproval) {
  return {
    decision_no: row.decision_no,
    request_no: row.request_no,
    employee_code: row.employee_code,
    employee_name: row.employee_name,
    approved_from: row.approved_from,
    approved_to: row.approved_to,
    days: row.days,
    approver_name: row.approver_name,
    decision: row.decision,
    decision_date: row.decision_date
  };
}
