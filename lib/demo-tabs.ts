import type { ModuleDefinition } from "@/lib/erp-data";
import { masterDataViews } from "@/lib/master-data";
import { medtechScopeViews } from "@/lib/medtech-scope-data";
import { salesCrmViews } from "@/lib/sales-crm";
import { rolePermissionRows } from "@/lib/erp-security";
import { getFinanceView } from "@/lib/finance-workflow";
import { getShippingView } from "@/lib/shipping-workflow";
import { getQualityView } from "@/lib/quality-workflow";
import { getAttachmentView } from "@/lib/attachment-workflow";

export interface DemoTabView { columns: string[]; rows: Array<Record<string, string>>; }

const view = (columns: string[], rows: Array<Record<string, string>>): DemoTabView => ({ columns, rows });

const alternateViews: Record<string, DemoTabView> = {
  ...medtechScopeViews,
  ...masterDataViews,
  ...salesCrmViews,
  "finance.Payments": view(["Payment No", "Type", "Party", "Date", "Method", "Amount", "Currency", "Matched To", "Status"], [
    { "Payment No": "REC-2026-00192", Type: "Customer payment", Party: "Sidra Medicine", Date: "2026-06-19", Method: "Local simulator", Amount: "QAR 18,000", Currency: "QAR", "Matched To": "AMC-INV-DRAFT-0038", Status: "Matched" },
    { "Payment No": "PAY-2026-00188", Type: "Vendor payment", Party: "BD Biosciences", Date: "2026-06-18", Method: "Local simulator", Amount: "QAR 186,400", Currency: "QAR", "Matched To": "", Status: "Draft" }
  ]),
  "finance.Expenses": view(["Expense", "Employee", "Category", "Date", "Amount", "Status"], [
    { Expense: "EXP-2026-00448", Employee: "K. Varghese", Category: "Project site works", Date: "19 Jun 2026", Amount: "QAR 12,480", Status: "Pending approval" },
    { Expense: "EXP-2026-00443", Employee: "N. Kumar", Category: "Service travel", Date: "17 Jun 2026", Amount: "QAR 1,240", Status: "Approved" },
    { Expense: "EXP-2026-00439", Employee: "F. Al-Kuwari", Category: "Customer meeting", Date: "15 Jun 2026", Amount: "QAR 860", Status: "Paid" }
  ]),
  "finance.Bills": view(["Bill", "Vendor", "Bill date", "Due date", "Amount", "Status"], [
    { Bill: "BILL-2026-00341", Vendor: "Siemens Healthineers", "Bill date": "18 Jun 2026", "Due date": "18 Jul 2026", Amount: "QAR 624,000", Status: "Open" },
    { Bill: "BILL-2026-00338", Vendor: "Thermo Fisher", "Bill date": "15 Jun 2026", "Due date": "15 Jul 2026", Amount: "QAR 94,750", Status: "Pending approval" },
    { Bill: "BILL-2026-00330", Vendor: "Medline Europe", "Bill date": "09 Jun 2026", "Due date": "09 Jul 2026", Amount: "QAR 42,900", Status: "Paid" }
  ]),
  "finance.Chart of accounts": view(["Code", "Account", "Type", "Currency", "Balance", "Status"], [
    { Code: "1100", Account: "Cash and Bank", Type: "Asset", Currency: "QAR", Balance: "QAR 2,860,000", Status: "Active" },
    { Code: "1200", Account: "Accounts Receivable", Type: "Asset", Currency: "QAR", Balance: "QAR 1,240,000", Status: "Active" },
    { Code: "2100", Account: "Accounts Payable", Type: "Liability", Currency: "QAR", Balance: "QAR 486,000", Status: "Active" },
    { Code: "4000", Account: "Sales Revenue", Type: "Revenue", Currency: "QAR", Balance: "QAR 12,680,000", Status: "Active" }
  ]),

  "hr.Attendance": view(["Employee", "Date", "Check in", "Check out", "Hours", "Status"], [
    { Employee: "Fahad Al-Kuwari", Date: "20 Jun 2026", "Check in": "07:48", "Check out": "—", Hours: "6h 42m", Status: "Present" },
    { Employee: "Aisha Rahman", Date: "20 Jun 2026", "Check in": "08:02", "Check out": "—", Hours: "6h 28m", Status: "Present" },
    { Employee: "Naveen Kumar", Date: "20 Jun 2026", "Check in": "—", "Check out": "—", Hours: "0h", Status: "On leave" }
  ]),
  "hr.Leave": view(["Request", "Employee", "Leave type", "From", "To", "Status"], [
    { Request: "LV-2026-00128", Employee: "Naveen Kumar", "Leave type": "Annual", From: "20 Jun 2026", To: "24 Jun 2026", Status: "Approved" },
    { Request: "LV-2026-00131", Employee: "Mariam Said", "Leave type": "Medical", From: "22 Jun 2026", To: "22 Jun 2026", Status: "Pending approval" },
    { Request: "LV-2026-00124", Employee: "R. Mathew", "Leave type": "Annual", From: "01 Jul 2026", To: "10 Jul 2026", Status: "Manager review" }
  ]),
  "hr.Payroll": view(["Payroll", "Period", "Employees", "Gross pay", "Deductions", "Status"], [
    { Payroll: "PAYROLL-2026-06", Period: "June 2026", Employees: "126", "Gross pay": "QAR 1,284,600", Deductions: "QAR 48,200", Status: "Processing" },
    { Payroll: "PAYROLL-2026-05", Period: "May 2026", Employees: "122", "Gross pay": "QAR 1,246,300", Deductions: "QAR 42,880", Status: "Paid" }
  ]),
  "hr.Letters": view(["Letter", "Employee", "Type", "Issued", "Prepared by", "Status"], [
    { Letter: "HRL-2026-0088", Employee: "Naveen Kumar", Type: "Experience certificate", Issued: "18 Jun 2026", "Prepared by": "HR Team", Status: "Issued" },
    { Letter: "HRL-2026-0087", Employee: "Mariam Said", Type: "Salary certificate", Issued: "17 Jun 2026", "Prepared by": "HR Team", Status: "Approved" },
    { Letter: "HRL-2026-0084", Employee: "R. Mathew", Type: "Employment letter", Issued: "12 Jun 2026", "Prepared by": "HR Team", Status: "Sent" }
  ]),

  "sales.Quotations": view(["Quotation", "Customer", "Owner", "Date", "Total", "Costing Sheet No", "Status"], [
    { Quotation: "QTN-2026-00314", Customer: "Hamad Medical Corporation", Owner: "F. Al-Kuwari", Date: "20 Jun 2026", Total: "QAR 286,000", "Costing Sheet No": "CST-2026-0001", Status: "Pending approval" },
    { Quotation: "QTN-2026-00311", Customer: "Sidra Medicine", Owner: "R. Mathew", Date: "18 Jun 2026", Total: "QAR 680,000", "Costing Sheet No": "CST-2026-0004", Status: "Sent" },
    { Quotation: "QTN-2026-00308", Customer: "Doha Clinic", Owner: "F. Al-Kuwari", Date: "15 Jun 2026", Total: "QAR 94,600", "Costing Sheet No": "", Status: "Draft" }
  ]),
  "sales.Orders": view(["Order", "Customer", "Customer PO", "Order date", "Total", "Status"], [
    { Order: "SO-2026-00218", Customer: "Doha Clinic", "Customer PO": "DC/PO/8821", "Order date": "18 Jun 2026", Total: "QAR 286,000", Status: "Confirmed" },
    { Order: "SO-2026-00214", Customer: "Al Ahli Hospital", "Customer PO": "AAH-4819", "Order date": "16 Jun 2026", Total: "QAR 52,800", Status: "Partially delivered" },
    { Order: "SO-2026-00209", Customer: "Aman Hospital", "Customer PO": "AH-2026-911", "Order date": "11 Jun 2026", Total: "QAR 410,500", Status: "Ready to dispatch" }
  ]),
  "sales.Customers": view(["Customer", "Code", "Segment", "Account owner", "Receivable", "Status"], [
    { Customer: "Hamad Medical Corporation", Code: "CUS-00018", Segment: "Government", "Account owner": "F. Al-Kuwari", Receivable: "QAR 724,500", Status: "Active" },
    { Customer: "Sidra Medicine", Code: "CUS-00024", Segment: "Semi-government", "Account owner": "R. Mathew", Receivable: "QAR 286,240", Status: "Active" },
    { Customer: "Doha Clinic", Code: "CUS-00041", Segment: "Private", "Account owner": "F. Al-Kuwari", Receivable: "QAR 94,600", Status: "Active" }
  ]),
  "sales.Products": view(["Product", "SKU", "Category", "List price", "Margin", "Status"], [
    { Product: "Patient Monitor MX750", SKU: "EQ-PM-0750", Category: "Equipment", "List price": "QAR 28,500", Margin: "24.8%", Status: "Active" },
    { Product: "Troponin I Reagent Kit", SKU: "RG-TRP-100", Category: "Reagents", "List price": "QAR 1,860", Margin: "31.2%", Status: "Active" },
    { Product: "Adult SpO₂ Sensor", SKU: "SP-SPO2-A", Category: "Spare parts", "List price": "QAR 1,350", Margin: "27.4%", Status: "Active" }
  ]),

  "shipping.Delivery notes": view(["Delivery note", "Customer", "Sales order", "Delivery date", "Packages", "Status"], [
    { "Delivery note": "DN-2026-00281", Customer: "Hamad Medical Corporation", "Sales order": "SO-2026-00218", "Delivery date": "20 Jun 2026", Packages: "12", Status: "Out for delivery" },
    { "Delivery note": "DN-2026-00278", Customer: "Sidra Medicine", "Sales order": "SO-2026-00211", "Delivery date": "18 Jun 2026", Packages: "4", Status: "Delivered" }
  ]),
  "shipping.Packing lists": view(["Packing list", "Shipment", "Customer", "Packages", "Gross weight", "Status"], [
    { "Packing list": "PKL-2026-00184", Shipment: "SHP-2026-0181", Customer: "Hamad Medical Corporation", Packages: "12", "Gross weight": "486 kg", Status: "Final" },
    { "Packing list": "PKL-2026-00180", Shipment: "SHP-2026-0175", Customer: "Sidra Medicine", Packages: "4", "Gross weight": "92 kg", Status: "Final" }
  ]),
  "shipping.Couriers": view(["Carrier", "Type", "Contact", "Phone", "Active shipments", "Status"], [
    { Carrier: "DHL Global Forwarding", Type: "International freight", Contact: "Doha Operations", Phone: "+974 4458 7888", "Active shipments": "8", Status: "Active" },
    { Carrier: "GWC Logistics", Type: "Local logistics", Contact: "Medical Logistics Desk", Phone: "+974 4402 8888", "Active shipments": "6", Status: "Active" },
    { Carrier: "MedTech Fleet", Type: "Company fleet", Contact: "Dispatch Team", Phone: "Ext. 604", "Active shipments": "4", Status: "Active" }
  ]),

  "inventory.Stock": view(["Product", "Location", "Lot / Serial", "On hand", "Reserved", "Available"], [
    { Product: "Patient Monitor MX750", Location: "Main Warehouse", "Lot / Serial": "18 serials", "On hand": "18", Reserved: "6", Available: "12" },
    { Product: "Troponin I Reagent Kit", Location: "Cold Store", "Lot / Serial": "LOT-TI-2604", "On hand": "34", Reserved: "4", Available: "30" },
    { Product: "Nitrile Examination Gloves", Location: "Main Warehouse", "Lot / Serial": "LOT-NG-0626", "On hand": "1,480", Reserved: "240", Available: "1,240" }
  ]),
  "inventory.Movements": view(["Movement", "Type", "Product", "From", "To", "Quantity", "Status"], [
    { Movement: "MOV-2026-00882", Type: "Sales dispatch", Product: "Patient Monitor MX750", From: "Main Warehouse", To: "HMC", Quantity: "6 units", Status: "Posted" },
    { Movement: "MOV-2026-00878", Type: "Purchase receipt", Product: "Troponin I Reagent Kit", From: "Transit", To: "Cold Store", Quantity: "40 kits", Status: "Posted" },
    { Movement: "MOV-2026-00874", Type: "Internal transfer", Product: "Adult SpO₂ Sensor", From: "Quality Inspection", To: "Main Warehouse", Quantity: "12 units", Status: "Approved" }
  ]),
  "inventory.Lots & serials": view(["Product", "Lot / Serial", "Manufactured", "Expiry", "Location", "Status"], [
    { Product: "Troponin I Reagent Kit", "Lot / Serial": "LOT-TI-2604", Manufactured: "04 Apr 2026", Expiry: "03 Apr 2027", Location: "Cold Store", Status: "Released" },
    { Product: "Patient Monitor MX750", "Lot / Serial": "SN-MX750-88421", Manufactured: "18 Jan 2026", Expiry: "—", Location: "Main Warehouse", Status: "Available" },
    { Product: "Glucose Reagent", "Lot / Serial": "LOT-GL-2511", Manufactured: "10 Nov 2025", Expiry: "09 Aug 2026", Location: "Cold Store", Status: "Expiring soon" }
  ]),
  "inventory.Adjustments": view(["Adjustment", "Location", "Reason", "Lines", "Value impact", "Status"], [
    { Adjustment: "STK-ADJ-0092", Location: "Main Warehouse", Reason: "Cycle count variance", Lines: "4", "Value impact": "-QAR 3,240", Status: "Pending approval" },
    { Adjustment: "STK-ADJ-0089", Location: "Returns & Damaged", Reason: "Damaged in transit", Lines: "2", "Value impact": "-QAR 1,860", Status: "Approved" }
  ]),

  "procurement.Legacy RFQs": view(["RFQ", "Supplier", "Issue date", "Due date", "Quoted total", "Status"], [
    { RFQ: "RFQ-2026-00148", Supplier: "Thermo Fisher", "Supplier contact": "Regional Sales Desk · qatar@thermofisher.com", Buyer: "M. Said", Department: "Procurement", "Issue date": "18 Jun 2026", "Due date": "23 Jun 2026", Currency: "QAR", "Quoted total": "QAR 94,750", "Delivery terms": "DAP MedTech Main Warehouse, Doha", "Payment terms": "30 days from invoice", Scope: "Laboratory reagents and cold-chain consumables", "Technical requirements": "Original manufacturer supply, minimum 12-month shelf life, certificates of analysis with delivery", Notes: "Commercial and technical response received; pending final evaluation.", Status: "Response received" },
    { RFQ: "RFQ-2026-00145", Supplier: "BD Biosciences", "Supplier contact": "Gulf Commercial Team · mena@bdbiosciences.com", Buyer: "O. Nasser", Department: "Procurement", "Issue date": "16 Jun 2026", "Due date": "21 Jun 2026", Currency: "QAR", "Quoted total": "QAR 186,400", "Delivery terms": "CIP Hamad International Airport, Doha", "Payment terms": "40% advance, 60% on delivery", Scope: "Flow cytometry reagents, controls and accessories", "Technical requirements": "CE-marked products, lot traceability, temperature logger and product datasheets required", Notes: "Technical evaluation in progress with Diagnostics division.", Status: "Under evaluation" }
  ]),
  "procurement.Purchase orders": view(["Purchase order", "Supplier", "Order date", "Expected", "Total", "Status"], [
    { "Purchase order": "PO-2026-0128", Supplier: "Siemens Healthineers", "Order date": "18 Jun 2026", Expected: "14 Jul 2026", Total: "QAR 624,000", Status: "Approved" },
    { "Purchase order": "PO-2026-0126", Supplier: "BD Biosciences", "Order date": "16 Jun 2026", Expected: "30 Jun 2026", Total: "QAR 186,400", Status: "Sent" },
    { "Purchase order": "PO-2026-0124", Supplier: "Thermo Fisher", "Order date": "14 Jun 2026", Expected: "29 Jun 2026", Total: "QAR 94,750", Status: "Pending approval" }
  ]),
  "procurement.Receipts": view(["GRN", "Purchase order", "Supplier", "Received", "Location", "Status"], [
    { GRN: "GRN-2026-0098", "Purchase order": "PO-2026-0119", Supplier: "Medline Europe", Received: "19 Jun 2026", Location: "Quality Inspection", Status: "Completed" },
    { GRN: "GRN-2026-0094", "Purchase order": "PO-2026-0114", Supplier: "BD Biosciences", Received: "15 Jun 2026", Location: "Cold Store", Status: "Inspection pending" }
  ]),
  "procurement.Suppliers": view(["Supplier", "Code", "Category", "On-time delivery", "Quality score", "Status"], [
    { Supplier: "Siemens Healthineers", Code: "VEN-00012", Category: "Equipment", "On-time delivery": "94%", "Quality score": "4.8 / 5", Status: "Approved" },
    { Supplier: "Thermo Fisher", Code: "VEN-00019", Category: "Life sciences", "On-time delivery": "91%", "Quality score": "4.7 / 5", Status: "Approved" },
    { Supplier: "BD Biosciences", Code: "VEN-00025", Category: "Diagnostics", "On-time delivery": "89%", "Quality score": "4.5 / 5", Status: "Approved" }
  ]),

  "service.Installed equipment": view(["Asset", "Equipment", "Customer", "Serial", "Installed", "Status"], [
    { Asset: "AST-00842", Equipment: "CT Injector System", Customer: "Hamad Medical Corporation", Serial: "CTI-98422", Installed: "12 Feb 2025", Status: "In service" },
    { Asset: "AST-00791", Equipment: "Blood Gas Analyzer", Customer: "Sidra Medicine", Serial: "BGA-41288", Installed: "08 Nov 2024", Status: "In service" },
    { Asset: "AST-00684", Equipment: "Centrifuge X4", Customer: "Doha Clinic", Serial: "CFX4-1182", Installed: "21 May 2024", Status: "Warranty" }
  ]),
  "service.Maintenance": view(["Schedule", "Equipment", "Customer", "Engineer", "Due date", "Status"], [
    { Schedule: "PM-2026-00441", Equipment: "Patient Monitor MX750", Customer: "Aman Hospital", Engineer: "S. Khan", "Due date": "21 Jun 2026", Status: "Scheduled" },
    { Schedule: "PM-2026-00438", Equipment: "Blood Gas Analyzer", Customer: "Sidra Medicine", Engineer: "A. Joseph", "Due date": "22 Jun 2026", Status: "Parts required" },
    { Schedule: "PM-2026-00430", Equipment: "CT Injector System", Customer: "HMC", Engineer: "N. Kumar", "Due date": "18 Jun 2026", Status: "Completed" }
  ]),
  "service.Warranties": view(["Warranty", "Equipment", "Customer", "Start", "End", "Status"], [
    { Warranty: "WAR-2025-00282", Equipment: "CT Injector System", Customer: "HMC", Start: "12 Feb 2025", End: "11 Feb 2027", Status: "Active" },
    { Warranty: "WAR-2024-00211", Equipment: "Blood Gas Analyzer", Customer: "Sidra Medicine", Start: "08 Nov 2024", End: "07 Nov 2026", Status: "Active" },
    { Warranty: "WAR-2024-00188", Equipment: "Centrifuge X4", Customer: "Doha Clinic", Start: "21 May 2024", End: "20 May 2026", Status: "Expired" }
  ]),
  "service.Engineers": view(["Engineer", "Specialization", "Open tickets", "PM this week", "SLA score", "Status"], [
    { Engineer: "Naveen Kumar", Specialization: "Imaging & monitoring", "Open tickets": "6", "PM this week": "4", "SLA score": "98.2%", Status: "Available" },
    { Engineer: "A. Joseph", Specialization: "Laboratory diagnostics", "Open tickets": "8", "PM this week": "5", "SLA score": "96.4%", Status: "On site" },
    { Engineer: "S. Khan", Specialization: "Patient monitoring", "Open tickets": "5", "PM this week": "5", "SLA score": "97.1%", Status: "Available" }
  ]),


  "documents.Customers": view(["Document", "Customer", "Category", "Version", "Updated", "Access"], [
    { Document: "HMC Framework Agreement.pdf", Customer: "Hamad Medical Corporation", Category: "Contract", Version: "4.0", Updated: "12 Jun 2026", Access: "Restricted" },
    { Document: "Sidra Vendor Registration.pdf", Customer: "Sidra Medicine", Category: "Registration", Version: "2.1", Updated: "08 Jun 2026", Access: "Sales & Finance" }
  ]),
  "documents.Employees": view(["Document", "Employee", "Category", "Expiry", "Updated", "Access"], [
    { Document: "QID - MT-0041.pdf", Employee: "Naveen Kumar", Category: "QID", Expiry: "14 Jan 2027", Updated: "09 Jun 2026", Access: "HR only" },
    { Document: "Employment Contract - MT-0053.pdf", Employee: "Mariam Said", Category: "Contract", Expiry: "07 Nov 2027", Updated: "08 Nov 2024", Access: "HR only" }
  ]),
  "documents.Suppliers": view(["Document", "Supplier", "Category", "Expiry", "Updated", "Access"], [
    { Document: "Siemens Distribution Certificate.pdf", Supplier: "Siemens Healthineers", Category: "Certificate", Expiry: "31 Dec 2026", Updated: "03 Jan 2026", Access: "Procurement" },
    { Document: "Thermo Fisher Quality Agreement.pdf", Supplier: "Thermo Fisher", Category: "Agreement", Expiry: "30 Sep 2027", Updated: "12 May 2026", Access: "Procurement & Quality" }
  ]),
  "documents.Products": view(["Document", "Product", "Category", "Version", "Updated", "Access"], [
    { Document: "MX750 Product Datasheet.pdf", Product: "Patient Monitor MX750", Category: "Datasheet", Version: "6.1", Updated: "17 Jun 2026", Access: "Sales & Service" },
    { Document: "Troponin I SDS.pdf", Product: "Troponin I Reagent Kit", Category: "Safety data", Version: "3.0", Updated: "28 May 2026", Access: "Company" }
  ]),

  "approvals.Submitted by me": view(["Request", "Type", "Submitted to", "Submitted", "Amount / Impact", "Status"], [
    { Request: "QTN-2026-0314", Type: "Quotation discount", "Submitted to": "Sales Director", Submitted: "2 hours ago", "Amount / Impact": "18.0% discount", Status: "Pending" },
    { Request: "EXP-2026-0448", Type: "Expense", "Submitted to": "Finance Manager", Submitted: "Yesterday", "Amount / Impact": "QAR 12,480", Status: "Pending" }
  ]),
  "approvals.Completed": view(["Request", "Type", "Requested by", "Decision date", "Decision", "Status"], [
    { Request: "PO-2026-0128", Type: "Purchase order", "Requested by": "M. Said", "Decision date": "18 Jun 2026", Decision: "Approved by A. Rahman", Status: "Approved" },
    { Request: "LV-2026-0128", Type: "Leave request", "Requested by": "N. Kumar", "Decision date": "17 Jun 2026", Decision: "Approved by HR Manager", Status: "Approved" },
    { Request: "STK-ADJ-0087", Type: "Stock adjustment", "Requested by": "Warehouse Team", "Decision date": "15 Jun 2026", Decision: "Returned for correction", Status: "Returned" }
  ]),
  "approvals.Workflow rules": view(["Workflow", "Applies to", "Condition", "Steps", "Owner", "Status"], [
    { Workflow: "Quotation discount approval", "Applies to": "Quotations", Condition: "Discount > 10%", Steps: "Sales Manager → Management", Owner: "Sales Operations", Status: "Active" },
    { Workflow: "Purchase order approval", "Applies to": "Purchase orders", Condition: "Value > QAR 50,000", Steps: "Procurement → Finance → Management", Owner: "Procurement", Status: "Active" },
    { Workflow: "Stock adjustment approval", "Applies to": "Stock adjustments", Condition: "Any value impact", Steps: "Warehouse → Finance", Owner: "Warehouse", Status: "Active" }
  ]),

  "reports.Finance": view(["Report", "Period", "Owner", "Last run", "Schedule", "Format"], [
    { Report: "Monthly P&L by Department", Period: "June 2026", Owner: "Finance Team", "Last run": "Today, 08:00", Schedule: "Monthly", Format: "PDF / Excel" },
    { Report: "Accounts Receivable Aging", Period: "As of 20 Jun", Owner: "Finance Team", "Last run": "Today, 08:05", Schedule: "Daily", Format: "PDF / Excel" },
    { Report: "Cash Flow Forecast", Period: "13 weeks", Owner: "Finance Manager", "Last run": "19 Jun 2026", Schedule: "Weekly", Format: "Excel" }
  ]),
  "reports.Commercial": view(["Report", "Period", "Owner", "Last run", "Schedule", "Format"], [
    { Report: "Sales Pipeline Forecast", Period: "Q3 2026", Owner: "Sales Management", "Last run": "Today, 07:30", Schedule: "Daily", Format: "Dashboard / PDF" },
    { Report: "Sales by Customer", Period: "YTD 2026", Owner: "Sales Operations", "Last run": "19 Jun 2026", Schedule: "Weekly", Format: "Excel" },
    { Report: "Product Margin Analysis", Period: "June 2026", Owner: "Commercial Director", "Last run": "18 Jun 2026", Schedule: "Monthly", Format: "PDF / Excel" }
  ]),
  "reports.Operations": view(["Report", "Area", "Owner", "Last run", "Schedule", "Format"], [
    { Report: "Stock Expiry & Valuation", Area: "Inventory", Owner: "Warehouse", "Last run": "Yesterday", Schedule: "Weekly", Format: "Excel / PDF" },
    { Report: "Shipment Performance", Area: "Logistics", Owner: "Shipping Team", "Last run": "19 Jun 2026", Schedule: "Weekly", Format: "PDF" },
    { Report: "Service SLA Performance", Area: "Service", Owner: "Service Manager", "Last run": "18 Jun 2026", Schedule: "Weekly", Format: "PDF" },
    { Report: "Supplier Performance", Area: "Procurement", Owner: "Procurement Manager", "Last run": "15 Jun 2026", Schedule: "Monthly", Format: "Dashboard / Excel" }
  ]),
  "reports.People": view(["Report", "Period", "Owner", "Last run", "Schedule", "Format"], [
    { Report: "Attendance Summary", Period: "June 2026", Owner: "HR Team", "Last run": "Today, 09:30", Schedule: "Daily", Format: "Dashboard / Excel" },
    { Report: "Leave Balance Report", Period: "2026", Owner: "HR Manager", "Last run": "19 Jun 2026", Schedule: "Monthly", Format: "Excel" },
    { Report: "Headcount by Department", Period: "As of 20 Jun", Owner: "HR Team", "Last run": "Today, 08:30", Schedule: "Weekly", Format: "PDF / Excel" }
  ]),

  "admin.Roles & permissions": view(["Role", "Users", "Modules", "Approval rights", "Permissions", "Last changed", "Status"], rolePermissionRows()),
  "admin.Company": view(["Setting", "Value", "Category", "Updated by", "Updated", "Status"], [
    { Setting: "Legal name", Value: "MedTech Corporation Trading W.L.L.", Category: "Company", "Updated by": "Super Admin", Updated: "10 Jun 2026", Status: "Configured" },
    { Setting: "Default currency", Value: "QAR", Category: "Finance", "Updated by": "Finance Manager", Updated: "08 Jun 2026", Status: "Configured" },
    { Setting: "Timezone", Value: "Asia/Qatar", Category: "Regional", "Updated by": "Super Admin", Updated: "01 Jun 2026", Status: "Configured" }
  ]),
  "admin.Numbering": view(["Document type", "Prefix", "Next number", "Reset", "Last issued", "Status"], [
    { "Document type": "Quotation", Prefix: "QTN", "Next number": "00315", Reset: "Annually", "Last issued": "QTN-2026-00314", Status: "Active" },
    { "Document type": "Invoice", Prefix: "INV", "Next number": "00482", Reset: "Annually", "Last issued": "INV-2026-00481", Status: "Active" },
    { "Document type": "Purchase order", Prefix: "PO", "Next number": "00129", Reset: "Annually", "Last issued": "PO-2026-00128", Status: "Active" },
    { "Document type": "Service ticket", Prefix: "SRV", "Next number": "00843", Reset: "Annually", "Last issued": "SRV-2026-00842", Status: "Active" }
  ])
};

export function getDemoTabView(module: ModuleDefinition, tab: string): DemoTabView {
  if (module.key === "finance") return getFinanceView(tab) ?? { columns: module.columns, rows: module.rows };
  if (module.key === "shipping") return getShippingView(tab) ?? { columns: module.columns, rows: module.rows };
  if (module.key === "quality") return getQualityView(tab) ?? { columns: module.columns, rows: module.rows };
  if (module.key === "documents") return getAttachmentView(tab) ?? alternateViews[`${module.key}.${tab}`] ?? { columns: module.columns, rows: module.rows };
  return alternateViews[`${module.key}.${tab}`] ?? { columns: module.columns, rows: module.rows };
}
