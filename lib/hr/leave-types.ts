export const leaveApplicationStatuses = ["draft", "submitted", "pending_approval", "approved", "rejected", "cancelled"] as const;
export const leaveApprovalDecisions = ["pending", "approved", "rejected"] as const;
export const leaveHandoverStatuses = ["pending", "accepted", "cancelled"] as const;
export const leaveClearanceStatuses = ["not_required", "pending", "in_progress", "cleared", "blocked"] as const;
export const leaveRejoinStatuses = ["pending_rejoin", "rejoined_on_time", "delayed_rejoin", "no_show", "verified"] as const;

export type LeaveApplicationStatus = (typeof leaveApplicationStatuses)[number];
export type LeaveApprovalDecision = (typeof leaveApprovalDecisions)[number];
export type LeaveHandoverStatus = (typeof leaveHandoverStatuses)[number];
export type LeaveClearanceStatus = (typeof leaveClearanceStatuses)[number];
export type LeaveRejoinStatus = (typeof leaveRejoinStatuses)[number];

export interface EmployeeOption {
  id: string;
  employee_number: string;
  full_name: string;
  designation: string | null;
  department?: { name: string | null } | null;
}

export interface LeaveApplication {
  id: string;
  request_no: string;
  employee_id: string;
  employee_code: string;
  employee_name: string;
  department: string | null;
  designation: string | null;
  leave_type: string;
  start_date: string;
  end_date: string;
  calendar_days: number;
  working_days: number;
  balance_before: number;
  balance_after: number;
  purpose: string | null;
  destination: string | null;
  travel_from: string | null;
  travel_to: string | null;
  emergency_contact_name: string | null;
  emergency_contact_phone: string | null;
  emergency_contact_email: string | null;
  handover_to_employee_id: string | null;
  handover_to_employee_code: string | null;
  handover_to_name: string | null;
  status: LeaveApplicationStatus;
  pdf_url: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface LeaveApproval {
  id: string;
  decision_no: string;
  leave_application_id: string;
  request_no: string;
  employee_id: string;
  employee_code: string;
  employee_name: string;
  approved_from: string;
  approved_to: string;
  days: number;
  approver_id: string | null;
  approver_name: string | null;
  decision: LeaveApprovalDecision;
  decision_date: string | null;
  approval_notes: string | null;
  pdf_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface LeaveHandover {
  id: string;
  leave_application_id: string;
  request_no: string;
  employee_id: string;
  employee_code: string;
  employee_name: string;
  leave_start_date: string;
  leave_end_date: string;
  handover_to_employee_id: string;
  handover_to_employee_code: string;
  handover_to_name: string;
  tasks_notes: string | null;
  attachment_url: string | null;
  status: LeaveHandoverStatus;
  accepted_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface LeaveClearance {
  id: string;
  leave_application_id: string;
  request_no: string;
  employee_id: string;
  employee_code: string;
  employee_name: string;
  department: string | null;
  leave_start_date: string;
  leave_end_date: string;
  clearance_items: string[];
  responsible_person: string | null;
  status: LeaveClearanceStatus;
  comments: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface LeaveRejoin {
  id: string;
  leave_application_id: string;
  request_no: string;
  employee_id: string;
  employee_code: string;
  employee_name: string;
  original_return_date: string;
  actual_rejoin_date: string | null;
  delay_days: number;
  reason_for_delay: string | null;
  medical_or_supporting_attachment: string | null;
  status: LeaveRejoinStatus;
  hr_verified_by: string | null;
  verified_at: string | null;
  created_at: string;
  updated_at: string;
}

export type LeaveApplicationSortKey =
  | "employee_code"
  | "employee_name"
  | "request_no"
  | "leave_type"
  | "start_date"
  | "end_date"
  | "working_days"
  | "balance_after"
  | "status";

export type LeaveApprovalSortKey =
  | "employee_code"
  | "employee_name"
  | "request_no"
  | "decision_no"
  | "approved_from"
  | "approved_to"
  | "days"
  | "approver_name"
  | "decision_date"
  | "decision";

export type LeaveHandoverSortKey =
  | "employee_code"
  | "request_no"
  | "handover_to_employee_code"
  | "status";

export type LeaveClearanceSortKey =
  | "employee_code"
  | "request_no"
  | "department"
  | "status";

export type LeaveRejoinSortKey =
  | "employee_code"
  | "request_no"
  | "employee_name"
  | "original_return_date"
  | "actual_rejoin_date"
  | "status";

export interface LeaveApplicationFormValues {
  employee_id: string;
  handover_to_employee_id: string;
  leave_type: string;
  start_date: string;
  end_date: string;
  balance_before: number;
  purpose: string;
  destination: string;
  travel_from: string;
  travel_to: string;
  emergency_contact_name: string;
  emergency_contact_phone: string;
  emergency_contact_email: string;
}
