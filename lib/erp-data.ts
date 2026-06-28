import {
  LayoutDashboard, Banknote, UsersRound, Handshake, Ship, Boxes, ShoppingCart,
  Wrench, FolderKanban, Files, BadgeCheck, ChartNoAxesCombined, Settings, UserCog,
  type LucideIcon, CircleDollarSign, PackageCheck, CalendarClock, AlertTriangle,
  FileText, ReceiptText, Warehouse, ClipboardList, Truck, ShieldCheck
} from "lucide-react";

export type ModuleKey = "finance" | "hr" | "sales" | "shipping" | "inventory" | "procurement" | "service" | "projects" | "documents" | "approvals" | "reports" | "admin";
export interface NavItem { label: string; href: string; icon: LucideIcon; module?: ModuleKey; badge?: string; }
export interface ModuleDefinition {
  key: ModuleKey; title: string; subtitle: string; icon: LucideIcon; color: string;
  stats: { label: string; value: string; delta?: string; tone?: string }[];
  tabs: string[]; columns: string[]; rows: Array<Record<string, string>>;
  primaryAction: string;
}

export const navGroups: { label: string; items: NavItem[] }[] = [
  { label: "OVERVIEW", items: [{ label: "Dashboard", href: "/", icon: LayoutDashboard }] },
  { label: "OPERATIONS", items: [
    { label: "Sales & CRM", href: "/sales", icon: Handshake, module: "sales", badge: "12" },
    { label: "Procurement", href: "/procurement", icon: ShoppingCart, module: "procurement", badge: "5" },
    { label: "Inventory", href: "/inventory", icon: Boxes, module: "inventory" },
    { label: "Shipping", href: "/shipping", icon: Ship, module: "shipping", badge: "8" },
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
    tabs: ["Invoices", "Payments", "Expenses", "Bills", "Chart of accounts"], primaryAction: "New invoice",
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
    tabs: ["Opportunities", "Quotations", "Orders", "Customers", "Products"], primaryAction: "New quotation",
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
    tabs: ["Shipments", "Delivery notes", "Packing lists", "Couriers"], primaryAction: "Create shipment",
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
    tabs: ["Products", "Stock", "Movements", "Lots & serials", "Adjustments"], primaryAction: "Add product",
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
    tabs: ["Purchase requests", "RFQs", "Purchase orders", "Receipts", "Suppliers"], primaryAction: "New purchase request",
    columns: ["Reference", "Supplier", "Buyer", "Order date", "Total", "Status"],
    rows: [
      { Reference: "PO-2026-0128", Supplier: "Siemens Healthineers", Buyer: "M. Said", "Order date": "18 Jun 2026", Total: "QAR 624,000", Status: "Approved" },
      { Reference: "PO-2026-0126", Supplier: "BD Biosciences", Buyer: "O. Nasser", "Order date": "16 Jun 2026", Total: "QAR 186,400", Status: "Sent" },
      { Reference: "PO-2026-0124", Supplier: "Thermo Fisher", Buyer: "M. Said", "Order date": "14 Jun 2026", Total: "QAR 94,750", Status: "Pending approval" },
      { Reference: "PO-2026-0119", Supplier: "Medline Europe", Buyer: "O. Nasser", "Order date": "09 Jun 2026", Total: "QAR 42,900", Status: "Partially received" }
    ]
  },
  service: {
    key: "service", title: "Service & Support", subtitle: "Installed base, tickets, maintenance and SLA performance", icon: Wrench, color: "rose",
    stats: [{ label: "Open tickets", value: "27" }, { label: "SLA compliance", value: "96.8%", delta: "+1.2%" }, { label: "PM due this week", value: "14" }, { label: "Critical", value: "3", tone: "warning" }],
    tabs: ["Tickets", "Installed equipment", "Maintenance", "Warranties", "Engineers"], primaryAction: "New service ticket",
    columns: ["Ticket", "Equipment", "Customer", "Engineer", "SLA due", "Status"],
    rows: [
      { Ticket: "SRV-2026-0842", Equipment: "CT Injector System", Customer: "Hamad Medical Corporation", Engineer: "N. Kumar", "SLA due": "Today, 14:30", Status: "In progress" },
      { Ticket: "SRV-2026-0839", Equipment: "Blood Gas Analyzer", Customer: "Sidra Medicine", Engineer: "A. Joseph", "SLA due": "Today, 17:00", Status: "Awaiting part" },
      { Ticket: "SRV-2026-0835", Equipment: "Patient Monitor MX750", Customer: "Aman Hospital", Engineer: "S. Khan", "SLA due": "21 Jun 2026", Status: "Scheduled" },
      { Ticket: "SRV-2026-0828", Equipment: "Centrifuge X4", Customer: "Doha Clinic", Engineer: "N. Kumar", "SLA due": "19 Jun 2026", Status: "Resolved" }
    ]
  },
  projects: {
    key: "projects", title: "Turnkey Projects", subtitle: "Healthcare project delivery, milestones and profitability", icon: FolderKanban, color: "indigo",
    stats: [{ label: "Active projects", value: "12" }, { label: "Contract value", value: "QAR 18.6M" }, { label: "Average margin", value: "22.4%" }, { label: "Milestones at risk", value: "4", tone: "warning" }],
    tabs: ["Projects", "Milestones", "Tasks", "Budgets", "Documents"], primaryAction: "New project",
    columns: ["Project", "Client", "Manager", "Completion", "Budget", "Status"],
    rows: [
      { Project: "Al Wakra Day Surgery Center", Client: "Private Healthcare Group", Manager: "K. Varghese", Completion: "72%", Budget: "QAR 4.8M", Status: "On track" },
      { Project: "National Reference Lab Expansion", Client: "Ministry of Public Health", Manager: "S. Rahman", Completion: "44%", Budget: "QAR 6.2M", Status: "At risk" },
      { Project: "ICU Modernization – Phase II", Client: "Hamad Medical Corporation", Manager: "K. Varghese", Completion: "88%", Budget: "QAR 3.1M", Status: "On track" },
      { Project: "Dental Center Fit-out", Client: "Pearl Medical Center", Manager: "T. George", Completion: "29%", Budget: "QAR 1.7M", Status: "Planning" }
    ]
  },
  documents: {
    key: "documents", title: "Document Center", subtitle: "Secure, versioned records across the organization", icon: Files, color: "sky",
    stats: [{ label: "Total documents", value: "8,642" }, { label: "Added this month", value: "286" }, { label: "Expiring soon", value: "18", tone: "warning" }, { label: "Storage used", value: "42.8 GB" }],
    tabs: ["All documents", "Customers", "Employees", "Suppliers", "Products"], primaryAction: "Upload document",
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
    tabs: ["My approvals", "Submitted by me", "Completed", "Workflow rules"], primaryAction: "New request",
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
    tabs: ["All reports", "Finance", "Commercial", "Operations", "People"], primaryAction: "Build report",
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
    tabs: ["Users", "Roles & permissions", "Company", "Numbering", "Audit log"], primaryAction: "Invite user",
    columns: ["User", "Email", "Role", "Department", "Last active", "Status"],
    rows: [
      { User: "Ahmed Al-Mohannadi", Email: "a.almohannadi@medtech.qa", Role: "Management", Department: "Executive", "Last active": "Now", Status: "Active" },
      { User: "Aisha Rahman", Email: "a.rahman@medtech.qa", Role: "Finance Manager", Department: "Finance", "Last active": "8 min ago", Status: "Active" },
      { User: "Fahad Al-Kuwari", Email: "f.alkuwari@medtech.qa", Role: "Sales Manager", Department: "Sales", "Last active": "21 min ago", Status: "Active" },
      { User: "Naveen Kumar", Email: "n.kumar@medtech.qa", Role: "Service Engineer", Department: "Service", "Last active": "2 hours ago", Status: "Active" }
    ]
  }
};

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
