import type { PdfTemplate } from "@/lib/pdf/generator";

export const documentSequences = [
  ["Lead", "LEAD"], ["Enquiry", "ENQ"], ["Opportunity", "OPP"], ["Quotation", "QTN"], ["Sales Order", "SO"],
  ["Invoice", "INV"], ["Payment", "PAY"], ["RFQ", "RFQ"], ["Purchase Request", "PR"], ["Purchase Order", "PO"],
  ["GRN", "GRN"], ["Shipment", "SHP"], ["Delivery Note", "DN"], ["Packing List", "PKL"], ["Service Ticket", "SRV"],
  ["Service Report", "SRV-RPT"], ["Project", "PRJ"], ["Milestone", "PMS"], ["Leave Request", "LV"], ["Payroll Run", "PAYROLL"],
  ["EOS Case", "EOS"], ["AMC Contract", "AMC"], ["Approval Request", "APR"], ["Commission Run", "COM"], ["Proof of Delivery", "POD"], ["Clearance Packet", "CLR"]
] as const;

export const pdfTemplateCatalog: Array<{ document: string; template: PdfTemplate; label: string }> = [
  { document: "Quotation", template: "quotation", label: "Sales Quotation" },
  { document: "Sales Order", template: "invoice", label: "Sales Order Confirmation" },
  { document: "Invoice", template: "invoice", label: "Invoice / Credit Note" },
  { document: "Purchase Order", template: "purchase_order", label: "Purchase Order" },
  { document: "Delivery Note", template: "delivery_note", label: "Delivery Note" },
  { document: "Packing List", template: "packing_list", label: "Packing List" },
  { document: "Proof of Delivery", template: "delivery_note", label: "Proof of Delivery" },
  { document: "Clearance Packet", template: "report", label: "Customs / Clearance Packet" },
  { document: "Service Report", template: "service_report", label: "Service Report" },
  { document: "Employee Letter", template: "employee_letter", label: "Employee Letter" },
  { document: "Payroll Run", template: "payslip", label: "Payslip" },
  { document: "Leave Request", template: "leave_approval", label: "Leave Approval" },
  { document: "EOS Case", template: "final_settlement", label: "Final Settlement" },
  { document: "EOS Case", template: "gratuity_statement", label: "Gratuity Statement" },
  { document: "Management Report", template: "report", label: "Management Report" },
  { document: "Business Trip", template: "report", label: "Business Trip Approval" },
  { document: "Expense", template: "report", label: "Expense Report" },
  { document: "Contract", template: "employment_contract", label: "Contract Summary" },
  { document: "Milestone", template: "report", label: "Project Milestone Report" }
];
