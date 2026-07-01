import {
  LayoutDashboard, Banknote, UsersRound, Handshake, Ship, Boxes, ShoppingCart,
  Wrench, FolderKanban, Files, BadgeCheck, ChartNoAxesCombined, Settings, UserCog,
  type LucideIcon, CircleDollarSign, PackageCheck, CalendarClock, AlertTriangle,
  FileText, ReceiptText, Warehouse, ClipboardList, Truck, ShieldCheck, Inbox
} from "lucide-react";

export type ModuleKey = "finance" | "hr" | "sales" | "shipping" | "inventory" | "procurement" | "quality" | "service" | "projects" | "documents" | "approvals" | "reports" | "admin";
export interface NavItem { label: string; href: string; icon: LucideIcon; module?: ModuleKey; badge?: string; }
export interface ModuleDefinition {
  key: ModuleKey; title: string; subtitle: string; icon: LucideIcon; color: string;
  stats: { label: string; value: string; delta?: string; tone?: string }[];
  tabs: string[]; columns: string[]; rows: Array<Record<string, string>>;
  primaryAction: string;
}

export const navGroups: { label: string; items: NavItem[] }[] = [
  { label: "OVERVIEW", items: [{ label: "Dashboard", href: "/", icon: LayoutDashboard }, { label: "My Work", href: "/my-work", icon: Inbox, badge: "New" }, { label: "Alerts", href: "/alerts", icon: AlertTriangle, badge: "Local" }] },
  { label: "OPERATIONS", items: [
    { label: "Sales & CRM", href: "/sales", icon: Handshake, module: "sales", badge: "12" },
    { label: "Procurement", href: "/procurement", icon: ShoppingCart, module: "procurement", badge: "5" },
    { label: "Inventory", href: "/inventory", icon: Boxes, module: "inventory" },
    { label: "Shipping", href: "/shipping", icon: Ship, module: "shipping", badge: "8" },
    { label: "Quality & Regulatory", href: "/quality", icon: ShieldCheck, module: "quality", badge: "4" },
    { label: "Service", href: "/service", icon: Wrench, module: "service", badge: "3" },
    { label: "Projects", href: "/projects", icon: FolderKanban, module: "projects" }
  ]},
  { label: "CORPORATE", items: [
    { label: "Finance", href: "/finance", icon: Banknote, module: "finance" },
    { label: "People & HR", href: "/hr", icon: UsersRound, module: "hr" },
    { label: "Documents", href: "/documents", icon: Files, module: "documents" },
    { label: "Approvals", href: "/approvals", icon: BadgeCheck, module: "approvals", badge: "7" },
    { label: "Reports", href: "/reports", icon: ChartNoAxesCombined, module: "reports" }
  ]},
  { label: "SYSTEM", items: [{ label: "Administration", href: "/admin", icon: UserCog, module: "admin" }] }
];

const definitions: Record<ModuleKey, ModuleDefinition> = {
  finance: {
    key: "finance", title: "Finance", subtitle: "Cash flow, receivables and financial control", icon: Banknote, color: "emerald",
    stats: [{ label: "Accounts receivable", value: "QAR 1.24M", delta: "+8.2%" }, { label: "Accounts payable", value: "QAR 486K", delta: "-3.1%" }, { label: "Cash position", value: "QAR 2.86M", delta: "+12.4%" }, { label: "Overdue", value: "QAR 184K", tone: "warning" }],
    tabs: ["Customer Invoices", "Vendor Bills", "Payments", "Credit Notes", "Debit Notes", "Chart of Accounts", "Journal Types", "Tax/VAT Setup", "Posting Rules", "Accounting Periods", "Source Document Mapping", "Journals", "Bank Reconciliation Import", "Fixed Assets", "FX Revaluation", "Advance / Progress / Retention Invoices", "Financial Reports"], primaryAction: "New invoice",
    columns: ["Document", "Party", "Issue date", "Due date", "Amount", "Status"],
    rows: [
      { Document: "INV-2026-00481", Party: "Hamad Medical Corporation", "Issue date": "18 Jun 2026", "Due date": "18 Jul 2026", Amount: "QAR 184,500", Status: "Sent" },
      { Document: "INV-2026-00480", Party: "Sidra Medicine", "Issue date": "17 Jun 2026", "Due date": "17 Jul 2026", Amount: "QAR 96,240", Status: "Partially paid" },
      { Document: "INV-2026-00477", Party: "Al Ahli Hospital", "Issue date": "15 Jun 2026", "Due date": "15 Jul 2026", Amount: "QAR 52,800", Status: "Paid" },
      { Document: "INV-2026-00472", Party: "The View Hospital", "Issue date": "12 Jun 2026", "Due date": "12 Jul 2026", Amount: "QAR 138,900", Status: "Overdue" }
    ]
  },
  hr: {
    key: "hr", title: "People & HR", subtitle: "Employees, attendance, leave and workforce operations", icon: UsersRound, color: "violet",
    stats: [{ label: "Total employees", value: "126", delta: "+4 this month" }, { label: "Present today", value: "114", delta: "90.5%" }, { label: "On leave", value: "8" }, { label: "Documents expiring", value: "6", tone: "warning" }],
    tabs: ["Employees", "Attendance", "Leave", "Payroll", "Letters"], primaryAction: "Add employee",
    columns: ["Employee", "ID", "Department", "Designation", "Joined", "Status"],
    rows: [
      { Employee: "Fahad Al-Kuwari", ID: "MT-0018", Department: "Sales", Designation: "Key Account Manager", Joined: "12 Mar 2021", Status: "Active" },
      { Employee: "Aisha Rahman", ID: "MT-0024", Department: "Finance", Designation: "Senior Accountant", Joined: "02 Sep 2021", Status: "Active" },
      { Employee: "Naveen Kumar", ID: "MT-0041", Department: "Service", Designation: "Biomedical Engineer", Joined: "17 Jan 2023", Status: "On leave" },
      { Employee: "Mariam Said", ID: "MT-0053", Department: "Procurement", Designation: "Procurement Officer", Joined: "08 Nov 2024", Status: "Active" }
    ]
  },
  sales: {
    key: "sales", title: "Sales & CRM", subtitle: "Pipeline, quotations and commercial performance", icon: Handshake, color: "blue",
    stats: [{ label: "Open pipeline", value: "QAR 4.82M", delta: "+14.8%" }, { label: "Weighted value", value: "QAR 2.17M" }, { label: "Win rate", value: "34.6%", delta: "+2.4%" }, { label: "Quotes pending", value: "12", tone: "warning" }],
    tabs: ["Universal Enquiry Pool", "BANT Qualification", "Lead Claims", "Sales Workflow", "Straight Forward Sales", "GPPRR", "Pharma Tender", "Project Sales", "Estimation / Costing", "Pricing Engine", "Opportunities", "Quotations", "Orders", "Customer Master", "Customers", "Products", "Master Data", "Commissions"], primaryAction: "New enquiry",
    columns: ["Opportunity", "Customer", "Owner", "Value", "Expected close", "Stage"],
    rows: [
      { Opportunity: "ICU Monitoring Upgrade", Customer: "Hamad Medical Corporation", Owner: "F. Al-Kuwari", Value: "QAR 1,240,000", "Expected close": "30 Jun 2026", Stage: "Proposal" },
      { Opportunity: "Molecular Diagnostics", Customer: "Sidra Medicine", Owner: "R. Mathew", Value: "QAR 680,000", "Expected close": "12 Jul 2026", Stage: "Negotiation" },
      { Opportunity: "CSSD Equipment", Customer: "Aman Hospital", Owner: "L. D'Souza", Value: "QAR 410,500", "Expected close": "25 Jul 2026", Stage: "Qualified" },
      { Opportunity: "Lab Consumables FY26", Customer: "Doha Clinic", Owner: "F. Al-Kuwari", Value: "QAR 286,000", "Expected close": "05 Jul 2026", Stage: "Won" }
    ]
  },
  shipping: {
    key: "shipping", title: "Shipping & Logistics", subtitle: "Inbound freight, dispatch and delivery control", icon: Ship, color: "cyan",
    stats: [{ label: "In transit", value: "18" }, { label: "Ready to dispatch", value: "8" }, { label: "Delivered this month", value: "64", delta: "+11%" }, { label: "Delayed", value: "3", tone: "warning" }],
    tabs: ["Delivery Orders", "Pick Lists", "Packing Lists", "Shipments", "Partial Deliveries / Backorders", "Proof of Delivery", "Customs / Clearance Documents", "Installation Delivery Handover", "Delivery Exceptions", "Shipping Dashboard"], primaryAction: "Create delivery order",
    columns: ["Shipment", "Direction", "Customer / Supplier", "Carrier", "ETA", "Status"],
    rows: [
      { Shipment: "SHP-2026-0184", Direction: "Inbound", "Customer / Supplier": "Siemens Healthineers", Carrier: "DHL Global", ETA: "22 Jun 2026", Status: "In transit" },
      { Shipment: "SHP-2026-0181", Direction: "Outbound", "Customer / Supplier": "Hamad Medical Corporation", Carrier: "GWC Logistics", ETA: "20 Jun 2026", Status: "Out for delivery" },
      { Shipment: "SHP-2026-0177", Direction: "Inbound", "Customer / Supplier": "Thermo Fisher", Carrier: "FedEx", ETA: "19 Jun 2026", Status: "Customs hold" },
      { Shipment: "SHP-2026-0175", Direction: "Outbound", "Customer / Supplier": "Sidra Medicine", Carrier: "MedTech Fleet", ETA: "18 Jun 2026", Status: "Delivered" }
    ]
  },
  inventory: {
    key: "inventory", title: "Inventory & Warehouse", subtitle: "Stock, lots, serials and warehouse movements", icon: Boxes, color: "amber",
    stats: [{ label: "Inventory value", value: "QAR 6.74M", delta: "+3.5%" }, { label: "Active SKUs", value: "2,418" }, { label: "Below minimum", value: "23", tone: "warning" }, { label: "Expiring in 90 days", value: "14", tone: "warning" }],
    tabs: ["Products", "Stock On Hand", "Lots / Batches / Serials", "Stock Movements", "Transfers", "Reservations", "Cycle Counts", "Expiry Alerts", "Quarantine / QC", "Engineer Stock", "Bundled Kits"], primaryAction: "Add product",
    columns: ["Product", "SKU", "Category", "On hand", "Available", "Status"],
    rows: [
      { Product: "Patient Monitor MX750", SKU: "EQ-PM-0750", Category: "Equipment", "On hand": "18 units", Available: "12 units", Status: "In stock" },
      { Product: "Troponin I Reagent Kit", SKU: "RG-TRP-100", Category: "Reagents", "On hand": "34 kits", Available: "30 kits", Status: "Low stock" },
      { Product: "Nitrile Examination Gloves", SKU: "CS-GLV-M-B", Category: "Consumables", "On hand": "1,480 boxes", Available: "1,240 boxes", Status: "In stock" },
      { Product: "SpO₂ Sensor Adult", SKU: "SP-SPO2-A", Category: "Spare parts", "On hand": "7 units", Available: "5 units", Status: "Reorder" }
    ]
  },
  procurement: {
    key: "procurement", title: "Procurement", subtitle: "Requests, sourcing, purchase orders and suppliers", icon: ShoppingCart, color: "orange",
    stats: [{ label: "Open requests", value: "19" }, { label: "RFQs awaiting reply", value: "11" }, { label: "POs this month", value: "QAR 1.38M" }, { label: "Pending approval", value: "5", tone: "warning" }],
    tabs: ["Purchase Requests", "RFQs", "Supplier Comparison", "Purchase Orders", "Goods Receipts", "Vendor Bills", "PO Documents", "Suppliers", "Supplier Master"], primaryAction: "New purchase request",
    columns: ["Reference", "Supplier", "Buyer", "Order date", "Total", "Status"],
    rows: [
      { Reference: "PO-2026-0128", Supplier: "Siemens Healthineers", Buyer: "M. Said", "Order date": "18 Jun 2026", Total: "QAR 624,000", Status: "Approved" },
      { Reference: "PO-2026-0126", Supplier: "BD Biosciences", Buyer: "O. Nasser", "Order date": "16 Jun 2026", Total: "QAR 186,400", Status: "Sent" },
      { Reference: "PO-2026-0124", Supplier: "Thermo Fisher", Buyer: "M. Said", "Order date": "14 Jun 2026", Total: "QAR 94,750", Status: "Pending approval" },
      { Reference: "PO-2026-0119", Supplier: "Medline Europe", Buyer: "O. Nasser", "Order date": "09 Jun 2026", Total: "QAR 42,900", Status: "Partially received" }
    ]
  },
  quality: {
    key: "quality", title: "Quality & Regulatory", subtitle: "Returns, complaints, recalls, QC, CAPA and registration control", icon: ShieldCheck, color: "teal",
    stats: [{ label: "Open RMAs", value: "1" }, { label: "Open complaints", value: "1", tone: "warning" }, { label: "Active recalls", value: "1", tone: "warning" }, { label: "Regulatory renewals", value: "1", tone: "warning" }],
    tabs: ["Customer Returns / RMA", "Supplier Returns", "Product Complaints", "Batch Recall", "QC Inspection", "Regulatory Registration Tracker", "Certificates / Documents", "CAPA Tracker"], primaryAction: "New quality record",
    columns: ["Record", "Type", "Related party", "Product", "Owner", "Status"],
    rows: [
      { Record: "RMA-2026-00018", Type: "Customer return", "Related party": "Hamad Medical Corporation", Product: "Troponin I Reagent Kit", Owner: "Quality Team", Status: "QC pending" },
      { Record: "CMP-2026-00032", Type: "Complaint", "Related party": "Sidra Medicine", Product: "Patient Monitor MX750", Owner: "Quality Manager", Status: "Investigation open" },
      { Record: "REC-2026-00007", Type: "Recall", "Related party": "Affected customers", Product: "Troponin I Reagent Kit", Owner: "Regulatory Affairs", Status: "Draft" }
    ]
  },
  service: {
    key: "service", title: "Service & Support", subtitle: "Installed base, tickets, maintenance and SLA performance", icon: Wrench, color: "rose",
    stats: [{ label: "Open tickets", value: "27" }, { label: "SLA compliance", value: "96.8%", delta: "+1.2%" }, { label: "PM due this week", value: "14" }, { label: "Critical", value: "3", tone: "warning" }],
    tabs: ["Service Requests", "Job Pool", "Engineer Dispatch", "Field Service Jobs", "Spare Parts Requests", "AMC Contracts", "Maintenance Schedules", "Service Reports", "Customer Sign-Off", "Service Invoicing Drafts"], primaryAction: "New service request",
    columns: ["Request No", "Source", "Customer", "Equipment", "Priority", "Status"],
    rows: [
      { "Request No": "SRV-2026-0842", Source: "Phone", Customer: "Hamad Medical Corporation", Equipment: "CT Injector System", Priority: "Critical", Status: "SLA started" },
      { "Request No": "SRV-2026-0839", Source: "Email", Customer: "Sidra Medicine", Equipment: "Blood Gas Analyzer", Priority: "High", Status: "Pending spare parts" },
      { "Request No": "SRV-2026-0835", Source: "Manual", Customer: "Aman Hospital", Equipment: "Patient Monitor MX750", Priority: "Normal", Status: "Visit scheduled" }
    ]
  },
  projects: {
    key: "projects", title: "Turnkey Projects", subtitle: "Healthcare project delivery, milestones and profitability", icon: FolderKanban, color: "indigo",
    stats: [{ label: "Active projects", value: "12" }, { label: "Contract value", value: "QAR 18.6M" }, { label: "Average margin", value: "22.4%" }, { label: "Milestones at risk", value: "4", tone: "warning" }],
    tabs: ["Projects", "Project Tasks", "Milestones", "Department Sub-Quotations", "Budgets", "Deliverables", "Milestone Billing", "Retention Tracking", "Project Documents", "Project Closure"], primaryAction: "New project",
    columns: ["Project No", "Customer", "Business Unit", "Project Type", "Manager", "Start Date", "End Date", "Contract Value", "Budget", "Actual Cost", "Margin", "Status"],
    rows: [
      { "Project No": "PRJ-2026-0018", Customer: "Private Healthcare Group", "Business Unit": "Projects", "Project Type": "Turnkey fit-out", Manager: "K. Varghese", "Start Date": "2026-06-01", "End Date": "2026-09-30", "Contract Value": "QAR 4,800,000", Budget: "QAR 3,724,800", "Actual Cost": "QAR 3,100,000", Margin: "QAR 1,700,000 / 35.4%", Status: "On track" },
      { "Project No": "PRJ-2026-0019", Customer: "Ministry of Public Health", "Business Unit": "Projects", "Project Type": "Reference lab expansion", Manager: "S. Rahman", "Start Date": "2026-06-10", "End Date": "2026-12-15", "Contract Value": "QAR 6,200,000", Budget: "QAR 4,812,000", "Actual Cost": "QAR 3,800,000", Margin: "QAR 2,400,000 / 38.7%", Status: "Milestone at risk" },
      { "Project No": "PRJ-2026-0014", Customer: "Hamad Medical Corporation", "Business Unit": "Medical Equipment", "Project Type": "ICU modernization", Manager: "K. Varghese", "Start Date": "2026-03-15", "End Date": "2026-07-10", "Contract Value": "QAR 3,100,000", Budget: "QAR 2,480,000", "Actual Cost": "QAR 2,700,000", Margin: "QAR 400,000 / 12.9%", Status: "Budget watch" },
      { "Project No": "PRJ-2026-0020", Customer: "Pearl Medical Center", "Business Unit": "Projects", "Project Type": "Dental center fit-out", Manager: "T. George", "Start Date": "2026-06-20", "End Date": "2026-10-25", "Contract Value": "QAR 1,700,000", Budget: "QAR 1,292,000", "Actual Cost": "QAR 410,000", Margin: "QAR 1,290,000 / 75.9%", Status: "Planning" }
    ]
  },
  documents: {
    key: "documents", title: "Document Center", subtitle: "Secure, versioned records across the organization", icon: Files, color: "sky",
    stats: [{ label: "Total documents", value: "8,642" }, { label: "Added this month", value: "286" }, { label: "Expiring soon", value: "18", tone: "warning" }, { label: "Storage used", value: "42.8 GB" }],
    tabs: ["All documents", "Attachments", "Version History", "Document Expiry Tracker", "Local Archive", "Template List", "Generated Documents", "Customers", "Employees", "Suppliers", "Products"], primaryAction: "Upload document",
    columns: ["Document", "Category", "Related to", "Owner", "Updated", "Access"],
    rows: [
      { Document: "ISO 13485 Certificate.pdf", Category: "Certificate", "Related to": "MedTech Corporation", Owner: "Quality Team", Updated: "18 Jun 2026", Access: "Company" },
      { Document: "MX750 Product Datasheet.pdf", Category: "Product datasheet", "Related to": "Patient Monitor MX750", Owner: "Product Team", Updated: "17 Jun 2026", Access: "Sales & Service" },
      { Document: "HMC Framework Agreement.pdf", Category: "Contract", "Related to": "Hamad Medical Corporation", Owner: "Legal", Updated: "12 Jun 2026", Access: "Restricted" },
      { Document: "QID - Employee 0041.pdf", Category: "Employee document", "Related to": "Naveen Kumar", Owner: "HR", Updated: "09 Jun 2026", Access: "HR only" }
    ]
  },
  approvals: {
    key: "approvals", title: "Approvals", subtitle: "One controlled queue for business decisions", icon: BadgeCheck, color: "teal",
    stats: [{ label: "Awaiting my action", value: "7" }, { label: "Due today", value: "3", tone: "warning" }, { label: "Approved this month", value: "84" }, { label: "Average cycle", value: "6.4 hrs", delta: "-18%" }],
    tabs: ["My approvals", "Submitted by me", "Completed", "Workflow rules", "Approval Matrix"], primaryAction: "New request",
    columns: ["Request", "Type", "Requested by", "Submitted", "Amount / Impact", "Status"],
    rows: [
      { Request: "QTN-2026-0314", Type: "Quotation discount", "Requested by": "F. Al-Kuwari", Submitted: "2 hours ago", "Amount / Impact": "18.0% discount", Status: "Your approval" },
      { Request: "PO-2026-0124", Type: "Purchase order", "Requested by": "M. Said", Submitted: "4 hours ago", "Amount / Impact": "QAR 94,750", Status: "Finance review" },
      { Request: "EXP-2026-0448", Type: "Expense", "Requested by": "K. Varghese", Submitted: "Yesterday", "Amount / Impact": "QAR 12,480", Status: "Your approval" },
      { Request: "STK-ADJ-0092", Type: "Stock adjustment", "Requested by": "Warehouse Team", Submitted: "Yesterday", "Amount / Impact": "-QAR 3,240", Status: "Management review" }
    ]
  },
  reports: {
    key: "reports", title: "Reports & Analytics", subtitle: "Cross-functional performance and compliance reporting", icon: ChartNoAxesCombined, color: "purple",
    stats: [{ label: "Saved reports", value: "38" }, { label: "Scheduled", value: "12" }, { label: "Exports this month", value: "146" }, { label: "Data refreshed", value: "2 min ago" }],
    tabs: ["Executive KPIs", "All reports", "Finance", "Commercial", "Operations", "People", "Integration Simulators"], primaryAction: "Build report",
    columns: ["Report", "Area", "Owner", "Last run", "Schedule", "Format"],
    rows: [
      { Report: "Monthly P&L by Department", Area: "Finance", Owner: "Finance Team", "Last run": "Today, 08:00", Schedule: "Monthly", Format: "PDF / Excel" },
      { Report: "Sales Pipeline Forecast", Area: "Sales", Owner: "Sales Management", "Last run": "Today, 07:30", Schedule: "Daily", Format: "Dashboard" },
      { Report: "Stock Expiry & Valuation", Area: "Inventory", Owner: "Warehouse", "Last run": "Yesterday", Schedule: "Weekly", Format: "Excel" },
      { Report: "Service SLA Performance", Area: "Service", Owner: "Service Manager", "Last run": "18 Jun 2026", Schedule: "Weekly", Format: "PDF" }
    ]
  },
  admin: {
    key: "admin", title: "Administration", subtitle: "Company, users, access and system configuration", icon: Settings, color: "slate",
    stats: [{ label: "Active users", value: "92" }, { label: "Defined roles", value: "13" }, { label: "Active sessions", value: "38" }, { label: "Security events", value: "0" }],
    tabs: ["Users", "Roles & permissions", "Company", "Master Setup", "Business Units", "Departments", "Cost Centers", "Document Sequences", "Approval Thresholds", "Currencies", "Payment Terms", "Workflow Statuses", "Numbering", "Automation Monitor", "Local Data Tools", "Data Import Center", "Migration Reconciliation", "UAT Tracker", "Audit log"], primaryAction: "Invite user",
    columns: ["User", "Email", "Role", "Department", "Last active", "Status"],
    rows: [
      { User: "Kashif", Email: "admin@medtech.qa", Role: "Super Admin", Department: "Executive", "Last active": "Now", Status: "Active", Password: "MedTech@2026" },
      { User: "Aisha Rahman", Email: "a.rahman@medtech.qa", Role: "Finance Manager", Department: "Finance", "Last active": "8 min ago", Status: "Active" },
      { User: "Fahad Al-Kuwari", Email: "f.alkuwari@medtech.qa", Role: "Sales Manager", Department: "Sales", "Last active": "21 min ago", Status: "Active" },
      { User: "Naveen Kumar", Email: "n.kumar@medtech.qa", Role: "Service Engineer", Department: "Service", "Last active": "2 hours ago", Status: "Active" }
    ]
  }
};

export const expertLayerTabs: Partial<Record<ModuleKey, string[]>> = {
  sales: ["Account Plans", "Visit Logs", "Communication History", "Competitor Tracking", "Lost Reason Taxonomy", "Quote Validity Alerts", "Credit Control Warnings", "Contract & Pricelist Checks", "Sales Targets", "Follow-up Tasks"],
  procurement: ["Supplier Scorecard", "Lead-Time Variance", "MOQ & Incoterms", "Alternate Suppliers", "Agreement Expiry", "Landed Cost Comparison", "Savings Tracker", "Delayed PO Alerts", "Supplier Performance Dashboard"],
  inventory: ["Putaway Workflow", "Pick Pack Dispatch", "ABC Classification", "ABC Cycle Count Schedule", "Stock Aging", "Expired Stock Handling", "Quarantine Release", "Cold Chain Warnings", "Recall Traceability", "Warehouse Productivity"],
  finance: ["Budget Control", "Budget vs Actual", "Closing Checklist", "Period Close Lock", "AR Collection Tracker", "AP Payment Planning", "Credit Control Alerts", "Cash Forecast", "VAT Validation", "Journal Review Checklist"],
  service: ["Engineer Skill Matrix", "Repeat Failure Tracking", "SLA Breach Reasons", "Warranty Claims", "Service Profitability", "Spare Parts Consumption", "Equipment History", "PM Compliance", "Engineer Productivity", "Customer Satisfaction"],
  projects: ["WBS", "Risk Log", "Issue Log", "Change Orders", "Budget vs Actual", "Milestone Sign-Off", "Retention Tracker", "Invoice Tracker", "Closure Checklist", "Profitability Dashboard"],
  shipping: ["Delivery Planning", "Warehouse Handoff", "Backorder Tracking", "Delivery Exception Log", "Customs Packet", "Cold Chain Delivery Warnings", "Driver Assignment", "Delivery Performance Dashboard"],
  quality: ["Product Complaint Workflow", "Batch Recall Workflow", "Regulatory Certificate Expiry", "Product Registration Tracker", "Calibration Tracker", "Supplier Quality Rating", "QC Checklist", "Non-Conformance Log", "Quality Dashboard"],
  documents: ["Document Version History", "Attachment Metadata", "Contract Certificate Expiry", "Approval Signature Trail", "Document Lifecycle", "Document Owners", "Source Record Links", "Generated PDF History", "Print Views"],
  admin: ["Role Permission Matrix", "SoD Warnings", "Audit Viewer", "Local Backup Restore", "Module Data Reset", "Change Log", "Data Health Check", "User Activity Summary", "Read-only Auditor Mode"]
};

Object.entries(expertLayerTabs).forEach(([key, tabs]) => {
  const definition = definitions[key as ModuleKey];
  if (!definition) return;
  definition.tabs = [...definition.tabs, ...tabs.filter(tab => !definition.tabs.includes(tab))];
});

export const getModule = (key: string) => definitions[key as ModuleKey];
export const moduleKeys = Object.keys(definitions) as ModuleKey[];

export const dashboardKpis = [
  { title: "Revenue", value: "QAR 2.84M", change: "+12.8%", note: "vs. last month", icon: CircleDollarSign, color: "teal" },
  { title: "Open quotations", value: "42", change: "QAR 4.82M", note: "total pipeline value", icon: FileText, color: "blue" },
  { title: "Outstanding invoices", value: "QAR 1.24M", change: "14 overdue", note: "QAR 184K at risk", icon: ReceiptText, color: "orange" },
  { title: "Stock alerts", value: "23", change: "14 expiring", note: "action required", icon: AlertTriangle, color: "rose" }
];

export const quickActions = [
  { label: "New quotation", icon: FileText, href: "/sales" },
  { label: "Create invoice", icon: ReceiptText, href: "/finance" },
  { label: "Purchase request", icon: ClipboardList, href: "/procurement" },
  { label: "Receive stock", icon: PackageCheck, href: "/inventory" },
  { label: "Create shipment", icon: Truck, href: "/shipping" },
  { label: "Service ticket", icon: Wrench, href: "/service" }
];

export const commandItems = navGroups.flatMap(group => group.items);

export const iconForActivity = { sales: Handshake, warehouse: Warehouse, service: Wrench, approval: ShieldCheck, hr: CalendarClock };
