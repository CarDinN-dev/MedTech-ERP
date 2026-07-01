export type SimulatorId =
  | "bank-statement"
  | "wps-export"
  | "attendance-machine"
  | "lead-intake"
  | "tender-portal"
  | "barcode-scan"
  | "e-invoicing"
  | "document-archive"
  | "power-bi-export"
  | "customer-portal"
  | "engineer-mobile"
  | "notification-queue";

export type SimulatorRow = Record<string, string>;

export interface SimulatorConfig {
  id: SimulatorId;
  title: string;
  input: string;
  output: string;
  production: string;
  action: string;
  targetKey: string;
  required: string[];
  sample: string;
}

export const simulatorConfigs: SimulatorConfig[] = [
  {
    id: "bank-statement",
    title: "Bank Statement Import",
    input: "CSV / Excel statement rows",
    output: "Local reconciliation suggestions",
    production: "Would import bank statement lines and suggest invoice/payment matches.",
    action: "IMPORT",
    targetKey: "finance:Bank Reconciliation Import",
    required: ["Date", "Reference", "Description", "Amount"],
    sample: "Date,Reference,Description,Amount\n2026-06-20,INV-DRAFT-2026-00502,HMC transfer,184500\n2026-06-20,UNKNOWN-001,Bank charge,75"
  },
  {
    id: "wps-export",
    title: "WPS Export",
    input: "Payroll rows",
    output: "Local WPS export file and audit row",
    production: "Would produce a bank salary transfer file after payroll validation.",
    action: "EXPORT",
    targetKey: "integration-simulators:WPS Exports",
    required: ["Employee Code", "Employee", "Net Salary", "Bank Account"],
    sample: "Employee Code,Employee,Net Salary,Bank Account\nMT-0018,Fahad Al-Kuwari,11516.67,QA12DEMO000001\nMT-0024,Aisha Rahman,17500,QA12DEMO000002"
  },
  {
    id: "attendance-machine",
    title: "Attendance Machine Import",
    input: "Biometric punch rows",
    output: "Local attendance records",
    production: "Would pull punch logs from an attendance terminal.",
    action: "IMPORT",
    targetKey: "hr-operations:Attendance:Daily Attendance",
    required: ["Employee", "Date", "Check in", "Check out", "Status"],
    sample: "Employee,Date,Check in,Check out,Status\nFahad Al-Kuwari,2026-06-30,08:00,17:02,Present\nNaveen Kumar,2026-06-30,,,Absent"
  },
  {
    id: "lead-intake",
    title: "WhatsApp / Email Lead Intake Import",
    input: "Message or mailbox export rows",
    output: "Local enquiry pool records",
    production: "Would capture inbound WhatsApp and email leads into CRM.",
    action: "IMPORT",
    targetKey: "sales:Universal Enquiry Pool",
    required: ["Source", "Customer", "Contact", "Message"],
    sample: "Source,Customer,Contact,Message\nWhatsApp,Aman Hospital,Biomedical Desk,Need patient monitor quotation\nEmail,Sidra Medicine,Lab Procurement,Request reagent availability"
  },
  {
    id: "tender-portal",
    title: "Tender Portal Import",
    input: "Tender notice rows",
    output: "Local tender opportunity records",
    production: "Would read tender notices from a government or customer portal.",
    action: "IMPORT",
    targetKey: "sales:Pharma Tender",
    required: ["Tender", "Customer", "Deadline", "Bid value"],
    sample: "Tender,Customer,Deadline,Bid value\nTND-DEMO-001,Ministry of Public Health,2026-07-15,QAR 1840000\nTND-DEMO-002,Hamad Medical Corporation,2026-07-22,QAR 640000"
  },
  {
    id: "barcode-scan",
    title: "Barcode Scan Simulator",
    input: "Manual or uploaded scan rows",
    output: "Local warehouse movement rows",
    production: "Would scan product, lot or serial barcodes in the warehouse.",
    action: "SCAN",
    targetKey: "inventory:Stock Movements",
    required: ["SKU", "Product", "Quantity", "Scan Type"],
    sample: "SKU,Product,Quantity,Scan Type\nDX-TRP-100,Troponin I Reagent Kit,2,Pick\nME-PM-0750,Patient Monitor MX750,1,Receive"
  },
  {
    id: "e-invoicing",
    title: "E-Invoicing XML Preview",
    input: "Invoice draft rows",
    output: "Local XML preview text",
    production: "Would generate an e-invoice XML payload before submission.",
    action: "PREVIEW",
    targetKey: "integration-simulators:E-Invoicing XML Preview",
    required: ["Invoice No", "Customer", "Amount"],
    sample: "Invoice No,Customer,Amount\nINV-DRAFT-2026-00502,Hamad Medical Corporation,184500"
  },
  {
    id: "document-archive",
    title: "SharePoint / Document Archive Placeholder",
    input: "Document metadata",
    output: "Local archive placeholder records",
    production: "Would push approved documents into a document archive.",
    action: "ARCHIVE",
    targetKey: "documents:Generated Documents",
    required: ["Document", "Related To", "Category"],
    sample: "Document,Related To,Category\nHMC Framework Agreement.pdf,Hamad Medical Corporation,Contract\nMX750 Datasheet.pdf,Patient Monitor MX750,Product"
  },
  {
    id: "power-bi-export",
    title: "Power BI / Data Export Placeholder",
    input: "Dataset export request",
    output: "Local Excel extract",
    production: "Would publish or refresh a BI dataset.",
    action: "EXPORT",
    targetKey: "integration-simulators:Power BI Exports",
    required: ["Dataset", "Rows", "Format"],
    sample: "Dataset,Rows,Format\nSales Pipeline,42,Excel\nInventory Valuation,128,CSV"
  },
  {
    id: "customer-portal",
    title: "Customer Portal Preview",
    input: "Customer portal action rows",
    output: "Local portal activity preview",
    production: "Would expose quotes, invoices and service jobs to customers.",
    action: "PREVIEW",
    targetKey: "integration-simulators:Customer Portal Preview",
    required: ["Customer", "Portal Action", "Reference"],
    sample: "Customer,Portal Action,Reference\nHamad Medical Corporation,View invoice,INV-DRAFT-2026-00502\nSidra Medicine,Approve service report,SRV-RPT-2026-0142"
  },
  {
    id: "engineer-mobile",
    title: "Engineer Mobile View Preview",
    input: "Engineer work queue rows",
    output: "Local mobile job preview",
    production: "Would sync jobs, signatures and visit notes to a mobile app.",
    action: "PREVIEW",
    targetKey: "integration-simulators:Engineer Mobile Preview",
    required: ["Engineer", "Job No", "Status"],
    sample: "Engineer,Job No,Status\nNaveen Kumar,JOB-2026-0142,Assigned\nA. Joseph,JOB-2026-0148,In progress"
  },
  {
    id: "notification-queue",
    title: "SMS/Email Notification Queue Preview",
    input: "Notification queue rows",
    output: "Local queued notification records",
    production: "Would queue SMS or email notifications for delivery.",
    action: "SIMULATE SEND",
    targetKey: "integration-simulators:Notification Queue",
    required: ["Channel", "Recipient", "Message"],
    sample: "Channel,Recipient,Message\nEmail,customer@example.qa,Your invoice is ready\nSMS,+97450000000,Service engineer assigned"
  }
];

export function getSimulatorConfig(id: SimulatorId) {
  return simulatorConfigs.find(config => config.id === id) ?? simulatorConfigs[0];
}

export function parseDelimitedRows(input: string): SimulatorRow[] {
  const lines = input.split(/\r?\n/).map(line => line.trim()).filter(Boolean);
  if (lines.length < 2) return [];
  const delimiter = lines[0].includes("\t") ? "\t" : ",";
  const headers = splitDelimitedLine(lines[0], delimiter).map(header => header.trim());
  return lines.slice(1).map(line => Object.fromEntries(splitDelimitedLine(line, delimiter).map((value, index) => [headers[index] || `Column ${index + 1}`, value.trim()])));
}

export function validateSimulatorRows(id: SimulatorId, rows: SimulatorRow[]) {
  const config = getSimulatorConfig(id);
  const valid: SimulatorRow[] = [];
  const errors: Array<{ row: number; message: string }> = [];
  rows.forEach((row, index) => {
    const missing = config.required.filter(field => !String(row[field] ?? "").trim());
    if (missing.length) {
      errors.push({ row: index + 2, message: `Missing ${missing.join(", ")}` });
      return;
    }
    const amount = row.Amount ?? row["Net Salary"] ?? row["Bid value"] ?? row.Quantity ?? row.Rows;
    if (amount && !Number.isFinite(money(amount))) {
      errors.push({ row: index + 2, message: "Amount or quantity is not numeric" });
      return;
    }
    valid.push(toLocalRecord(id, row, index));
  });
  return { valid, errors };
}

export function buildInvoiceXmlPreview(row: SimulatorRow) {
  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<Invoice localDemoOnly="true">',
    `  <InvoiceNo>${xml(row["Invoice No"])}</InvoiceNo>`,
    `  <Customer>${xml(row.Customer)}</Customer>`,
    `  <Amount currency="QAR">${money(row.Amount).toFixed(2)}</Amount>`,
    "  <ExternalSubmission>false</ExternalSubmission>",
    "</Invoice>"
  ].join("\n");
}

function toLocalRecord(id: SimulatorId, row: SimulatorRow, index: number): SimulatorRow {
  const now = new Date().toLocaleString("en-GB", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
  const suffix = String(index + 1).padStart(4, "0");
  if (id === "bank-statement") {
    const matched = /^(INV|AMC|REC|PAY)/i.test(row.Reference);
    return { "Statement Row": row["Statement Row"] || `BNK-LOCAL-${suffix}`, Date: row.Date, Reference: row.Reference, Description: row.Description, Amount: qar(row.Amount), "Matched To": matched ? row.Reference : "", Exception: matched ? "" : "Local demo unmatched reference", Status: matched ? "Matched" : "Exception" };
  }
  if (id === "attendance-machine") return { Record: row.Record || `ATT-LOCAL-${suffix}`, Employee: row.Employee, Date: row.Date, "Check in": row["Check in"], "Check out": row["Check out"], Hours: row.Hours || "", Status: row.Status };
  if (id === "lead-intake") return { Enquiry: row.Enquiry || `ENQ-LOCAL-${suffix}`, Source: row.Source, Customer: row.Customer, Contact: row.Contact, BU: row.BU || "Medical Equipment", "Product interest": row.Message, Owner: "Unclaimed", "Claim expiry": "Local demo", Conflict: "No", "COO review": "No", Status: "New" };
  if (id === "tender-portal") return { Tender: row.Tender, Customer: row.Customer, BU: row.BU || "Pharma", Deadline: row.Deadline, "Bid value": qar(row["Bid value"]), "Batch compliance": "Local review", "Approval status": "Draft", Stage: "Imported locally", Status: "Draft" };
  if (id === "barcode-scan") return { "Movement No": row["Movement No"] || `MOV-LOCAL-${suffix}`, Type: row["Scan Type"], Product: row.Product, SKU: row.SKU, From: row.From || "Local scanner", To: row.To || "Demo warehouse", "Lot/Batch/Serial": row["Lot/Batch/Serial"] || "LOCAL-SCAN", Quantity: row.Quantity, Source: "Barcode Scan Simulator", Status: "Simulated" };
  if (id === "document-archive") return { Document: row.Document, "Source module": "Local archive simulator", "Source record": row["Related To"], "Document number": `ARCH-LOCAL-${suffix}`, "Generated by": "Local Demo Only", "Generated at": now, Status: "Archived locally", Action: "Placeholder only" };
  if (id === "notification-queue") return { Queue: `NTF-LOCAL-${suffix}`, Channel: row.Channel, Recipient: row.Recipient, Message: row.Message, Status: "Queued locally", "External calls": "No", "Created at": now };
  return { ...row, "Local Demo Only": "Yes", "External calls": "No", "Created at": now };
}

function splitDelimitedLine(line: string, delimiter: string) {
  const values: string[] = [];
  let current = "";
  let quoted = false;
  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    if (char === '"' && line[index + 1] === '"') {
      current += '"';
      index += 1;
    } else if (char === '"') {
      quoted = !quoted;
    } else if (char === delimiter && !quoted) {
      values.push(current);
      current = "";
    } else {
      current += char;
    }
  }
  values.push(current);
  return values;
}

function money(value: string) {
  return Number(String(value).replace(/[^0-9.-]/g, ""));
}

function qar(value: string) {
  return `QAR ${money(value).toLocaleString("en-US", { maximumFractionDigits: 2 })}`;
}

function xml(value = "") {
  return value.replace(/[<>&'"]/g, char => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", "'": "&apos;", '"': "&quot;" }[char] ?? char));
}
