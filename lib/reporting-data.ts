import { hrDepartmentHeadcount, hrViews } from "@/lib/hr-data";
import { medtechScopeViews } from "@/lib/medtech-scope-data";
import { costingSummary, seedCostingSheets, type CostingSheet } from "@/lib/sales-costing";
import { salesWorkflowPathways, seedSalesWorkflows, workflowTotals, type SalesWorkflowRecord } from "@/lib/sales-workflow";

export type ReportDashboardId =
  | "executive"
  | "management"
  | "pipeline"
  | "revenue-bu"
  | "margin"
  | "coverage"
  | "otc"
  | "dso"
  | "inventory-turns"
  | "expiry"
  | "sla"
  | "amc"
  | "tender"
  | "cash"
  | "payroll";

export interface ReportRow {
  Dashboard: ReportDashboardId;
  KPI: string;
  Record: string;
  BU: string;
  Date: string;
  Salesperson: string;
  Customer: string;
  "Product Category": string;
  Product: string;
  Supplier: string;
  Engineer: string;
  Contract: string;
  Status: string;
  Amount: number;
  Target: number;
  Margin: number;
  Days: number;
  Value: number;
  Notes: string;
}

export interface ReportKpi {
  label: string;
  value: string;
  note: string;
  tone?: "success" | "warning" | "danger" | "info";
  drill: string;
}

export interface ReportDashboard {
  id: ReportDashboardId;
  title: string;
  subtitle: string;
  kpis: ReportKpi[];
  chart: "bar" | "line" | "area" | "pie";
  chartData: Array<Record<string, string | number>>;
  rows: ReportRow[];
}

export interface ReportingModel {
  rows: ReportRow[];
  dashboards: ReportDashboard[];
  options: Record<string, string[]>;
}

type SnapshotReader = (key: string, seedRows: Array<Record<string, string>>) => Array<Record<string, string>>;

const dashboardTitles: Record<ReportDashboardId, [string, string, "bar" | "line" | "area" | "pie"]> = {
  executive: ["Executive Overview", "Board-level operating view across revenue, cash, stock, service and people.", "bar"],
  management: ["Management Expert Layer", "Executive actions, approvals, risk, profitability, scorecards and decisions.", "bar"],
  pipeline: ["Sales Pipeline", "Opportunity value, stage mix and commercial velocity.", "bar"],
  "revenue-bu": ["Revenue by BU", "Revenue against local demo targets by business unit.", "bar"],
  margin: ["Gross Margin by BU / Customer / Product", "Gross profit and margin mix from sales workflow lines.", "bar"],
  coverage: ["Pipeline Coverage by BU / Salesperson", "Open pipeline coverage against targets by owner.", "bar"],
  otc: ["Order-to-Cash Cycle Time", "Demo sales order to invoice to receipt cycle health.", "line"],
  dso: ["DSO / Receivables Aging", "Receivables aging, overdue exposure and DSO.", "bar"],
  "inventory-turns": ["Inventory Turns and Stale Stock", "Inventory movement, value and stale stock indicators.", "bar"],
  expiry: ["Stock Expiry / Cold Chain Alerts", "Expiry-controlled and cold-chain stock risk.", "bar"],
  sla: ["Service SLA Compliance", "Field service response and SLA status.", "pie"],
  amc: ["AMC Renewal / Churn", "Contract renewal, churn and recurring service coverage.", "bar"],
  tender: ["Tender Win Rate", "Tender bid value, win/loss status and award coverage.", "bar"],
  cash: ["Cash Position and 90-Day Forecast Demo", "Local cash, receivable and payable forecast.", "area"],
  payroll: ["Payroll / Headcount / Cost Center Analysis", "Payroll cost, headcount and revenue-per-head signals.", "bar"]
};

const buTargets: Record<string, number> = {
  Diagnostics: 8_000_000,
  "Medical Equipment": 12_000_000,
  Pharma: 6_000_000,
  Projects: 9_000_000,
  Service: 2_400_000,
  Operations: 1_800_000
};

const categoryBySku: Record<string, string> = {
  "EQ-PM-0750": "Equipment",
  "ME-PM-0750": "Equipment",
  "SP-SPO2-A": "Spare parts",
  "RG-TRP-100": "Reagents",
  "DX-TRP-100": "Reagents",
  "RG-GLU-050": "Reagents",
  "PH-INF-010": "Pharmaceuticals",
  "PRJ-LAB-001": "Projects",
  "CS-NGL-M": "Consumables"
};

export function buildReportingModel(readSnapshot?: SnapshotReader, salesWorkflows = readSalesWorkflowSeed(), costings = seedCostingSheets()): ReportingModel {
  const read = readSnapshot ?? ((_key, seedRows) => seedRows);
  const rows = [
    ...salesRows(salesWorkflows),
    ...costingRows(costings),
    ...financeRows(read),
    ...inventoryRows(read),
    ...serviceRows(read),
    ...hrRows(read),
    ...managementRows()
  ];
  return { rows, dashboards: dashboardsFor(rows), options: filterOptions(rows) };
}

export function readSalesCostingSeed() {
  return seedCostingSheets();
}

export function dashboardsFor(rows: ReportRow[]): ReportDashboard[] {
  return (Object.keys(dashboardTitles) as ReportDashboardId[]).map(id => {
    const own = rows.filter(row => row.Dashboard === id || (id === "executive" && executiveKpis.has(row.KPI)));
    const [title, subtitle, chart] = dashboardTitles[id];
    return { id, title, subtitle, chart, rows: own, kpis: kpisFor(id, own, rows), chartData: chartDataFor(id, own), };
  });
}

export function filterReportRows(rows: ReportRow[], filters: Record<string, string>) {
  const from = filters.from ? new Date(filters.from) : null;
  const to = filters.to ? new Date(filters.to) : null;
  return rows.filter(row => {
    const rowDate = row.Date ? new Date(row.Date) : null;
    if (from && rowDate && rowDate < from) return false;
    if (to && rowDate && rowDate > to) return false;
    return [
      ["bu", row.BU],
      ["salesperson", row.Salesperson],
      ["customer", row.Customer],
      ["category", row["Product Category"]],
      ["supplier", row.Supplier],
      ["engineer", row.Engineer],
      ["contract", row.Contract],
      ["status", row.Status]
    ].every(([key, value]) => !filters[key] || value === filters[key]);
  });
}

function salesRows(workflows: SalesWorkflowRecord[]): ReportRow[] {
  return workflows.flatMap(workflow => {
    const totals = workflowTotals(workflow);
    const bu = workflow.pathway === "gpprr" ? "Diagnostics" : workflow.pathway === "tender" ? "Pharma" : workflow.pathway === "pso" ? "Projects" : "Medical Equipment";
    const stage = salesWorkflowPathways[workflow.pathway].stages[workflow.stageIndex] ?? workflow.status;
    const coverage = totals.net / Math.max(1, buTargets[bu] / 4);
    const base = {
      BU: bu,
      Date: workflow.pathway === "tender" ? workflow.submissionDeadline || "2026-07-18" : "2026-06-20",
      Salesperson: workflow.owner,
      Customer: workflow.customer,
      Supplier: workflow.principal,
      Engineer: "",
      Contract: workflow.contractNumber || workflow.tenderNumber || workflow.projectCode,
      Status: workflow.outcome || workflow.status || stage,
      Target: buTargets[bu] ?? 0,
      Days: workflow.stageIndex * 4 + 6,
      Notes: stage
    };
    const lineRows = workflow.lines.flatMap(line => {
      const gross = line.quantity * line.unitPrice;
      const net = gross * (1 - line.discountPercent / 100);
      const cost = line.quantity * line.unitCost;
      const margin = net - cost;
      const category = categoryBySku[line.sku] ?? categoryBySku[line.product] ?? "Equipment";
      return [
        row("revenue-bu", "Revenue by BU vs target", workflow.reference, { ...base, "Product Category": category, Product: line.product, Amount: net, Margin: margin, Value: net }),
        row("margin", "Gross margin by BU/customer/product", workflow.reference, { ...base, "Product Category": category, Product: line.product, Amount: net, Margin: margin, Value: margin }),
        row("pipeline", "Win/loss rate", workflow.reference, { ...base, "Product Category": category, Product: line.product, Amount: net, Margin: margin, Value: net }),
        row("coverage", "Pipeline coverage by BU/salesperson", workflow.reference, { ...base, "Product Category": category, Product: line.product, Amount: net, Margin: margin, Value: coverage })
      ];
    });
    const tender = workflow.pathway === "tender" ? [row("tender", "Tender win rate", workflow.reference, { ...base, "Product Category": "Pharmaceuticals", Product: workflow.lines[0]?.product ?? "Tender", Amount: totals.net, Margin: totals.margin, Value: totals.net })] : [];
    return [...lineRows, ...tender];
  });
}

function costingRows(costings: CostingSheet[]): ReportRow[] {
  return costings.flatMap(costing => {
    const summary = costingSummary(costing);
    const status = costing["Quotation No"] ? "Quotation Created" : costing.Status;
    const base = {
      BU: costing["Business Unit"],
      Date: costing["Costing Date"],
      Salesperson: costing.Salesperson,
      Customer: costing.Customer,
      Supplier: costing.lines[0]?.["Supplier / Principal"] ?? "",
      Engineer: costing["Sales Pathway"] === "Service" || costing["Sales Pathway"] === "AMC" ? costing.Salesperson : "",
      Contract: costing["Related Opportunity No"] || costing["Related Enquiry No"],
      Status: status,
      Amount: summary["Final Quotation Value"],
      Margin: summary["Gross Profit"],
      Value: summary["Final Quotation Value"],
      Days: Math.max(1, ...costing.lines.map(line => line["Lead Time Days"] || 1)),
      Notes: `${costing["Costing Sheet No"]} Rev ${costing["Revision No"]}`
    };
    const lineRows = costing.lines.flatMap(line => [
      row("revenue-bu", "Costing quoted value", costing["Costing Sheet No"], { ...base, "Product Category": line.Category, Product: line["Product Name"], Supplier: line["Supplier / Principal"], Amount: line["Line Total Selling Price"], Margin: line["Gross Profit"], Value: line["Line Total Selling Price"] }),
      row("margin", "Costing margin", costing["Costing Sheet No"], { ...base, "Product Category": line.Category, Product: line["Product Name"], Supplier: line["Supplier / Principal"], Amount: line["Line Total Selling Price"], Margin: line["Gross Profit"], Value: line["Gross Profit"] }),
      row("pipeline", "Costing pipeline", costing["Costing Sheet No"], { ...base, "Product Category": line.Category, Product: line["Product Name"], Supplier: line["Supplier / Principal"], Amount: line["Line Total Selling Price"], Margin: line["Gross Profit"], Value: line["Line Total Selling Price"] }),
      row("coverage", "Costings by BU/salesperson/pathway", costing["Costing Sheet No"], { ...base, "Product Category": line.Category, Product: line["Product Name"], Supplier: line["Supplier / Principal"], Amount: line["Line Total Selling Price"], Margin: line["Gross Profit"], Value: 1, Notes: costing["Sales Pathway"] })
    ]);
    const approvalRows = costing["Approval Status"] === "Pending" ? [row("pipeline", "Pending costing approvals", costing["Costing Sheet No"], { ...base, Amount: summary["Final Quotation Value"], Value: 1, Notes: "Pending costing approval" })] : [];
    const lowMarginRows = summary["Gross Margin %"] < 18 ? [row("margin", "Low-margin costings", costing["Costing Sheet No"], { ...base, Amount: summary["Final Quotation Value"], Margin: summary["Gross Profit"], Value: summary["Gross Margin %"], Notes: `${summary["Gross Margin %"].toFixed(1)}% margin` })] : [];
    const convertedRows = costing["Quotation No"] ? [row("pipeline", "Costings converted to quotations", costing["Costing Sheet No"], { ...base, Amount: summary["Final Quotation Value"], Value: 1, Notes: costing["Quotation No"] })] : [];
    const tenderRows = costing["Sales Pathway"] === "Pharma Tender" ? [row("tender", "Tender costing value", costing["Costing Sheet No"], { ...base, "Product Category": "Pharma", Product: costing.lines[0]?.["Product Name"] ?? "Tender", Amount: summary["Final Quotation Value"], Margin: summary["Gross Profit"], Value: summary["Final Quotation Value"] })] : [];
    return [...lineRows, ...approvalRows, ...lowMarginRows, ...convertedRows, ...tenderRows];
  });
}

function financeRows(read: SnapshotReader): ReportRow[] {
  const invoices = readRows(read, "finance.Customer Invoices");
  const payments = readRows(read, "finance.Payments");
  const bills = readRows(read, "finance.Vendor Bills");
  const invoiceRows = invoices.flatMap((invoice, index) => {
    const amount = money(invoice.Total || invoice.Amount);
    const dueDate = iso(invoice["Due Date"]) || `2026-07-${String(18 + index).padStart(2, "0")}`;
    const age = daysBetween(dueDate, "2026-06-30");
    const customer = invoice.Customer || invoice.Party || "Customer";
    return [
      row("dso", "DSO", invoice["Invoice No"] || invoice.Document || `AR-${index + 1}`, { BU: "Finance", Date: dueDate, Customer: customer, Status: invoice.Status || "Open", Amount: amount, Value: amount, Days: Math.max(0, age), Notes: agingBucket(age) }),
      row("otc", "Order-to-cash cycle time", invoice["Invoice No"] || `OTC-${index + 1}`, { BU: "Finance", Date: dueDate, Customer: customer, Status: invoice.Status || "Draft", Amount: amount, Value: 18 + index * 5, Days: 18 + index * 5, Notes: invoice["Source Module"] || "Customer invoice" }),
      row("cash", "Cash position and 90-day forecast", invoice["Invoice No"] || `FC-${index + 1}`, { BU: "Finance", Date: dueDate, Customer: customer, Status: "Expected inflow", Amount: amount, Value: amount, Notes: "Receivable inflow" })
    ];
  });
  const paymentRows = payments.map((payment, index) => row("cash", "Cash position and 90-day forecast", payment["Payment No"] || `PAY-${index + 1}`, {
    BU: "Finance", Date: iso(payment.Date) || "2026-06-19", Customer: payment.Party, Status: payment.Status, Amount: payment.Type?.toLowerCase().includes("vendor") ? -money(payment.Amount) : money(payment.Amount), Value: payment.Type?.toLowerCase().includes("vendor") ? -money(payment.Amount) : money(payment.Amount), Notes: payment.Method
  }));
  const billRows = bills.map((bill, index) => row("cash", "Cash position and 90-day forecast", bill["Bill No"] || `BILL-${index + 1}`, {
    BU: "Finance", Date: iso(bill["Due Date"]) || "2026-07-20", Supplier: bill.Supplier, Status: "Expected outflow", Amount: -money(bill.Total || bill.Amount), Value: -money(bill.Total || bill.Amount), Notes: "Payable outflow"
  }));
  if (invoiceRows.length + paymentRows.length + billRows.length) return [...invoiceRows, ...paymentRows, ...billRows];
  return [
    row("dso", "DSO", "Seed AR", { BU: "Finance", Date: "2026-07-20", Customer: "Hamad Medical Corporation", Status: "Open", Amount: 306_400, Value: 306_400, Days: 47, Notes: "31-60" }),
    row("cash", "Cash position and 90-day forecast", "Seed forecast", { BU: "Finance", Date: "2026-09-30", Status: "Forecast", Amount: 2_980_000, Value: 2_980_000, Notes: "Seeded demo summary" })
  ];
}

function inventoryRows(read: SnapshotReader): ReportRow[] {
  const stock = readRows(read, "inventory.Stock On Hand");
  const movements = readRows(read, "inventory.Stock Movements");
  const productCost = new Map(readRows(read, "inventory.Products").map(product => [product.SKU, money(product["QAR Cost"] || product["List price"] || "QAR 1200") || seededUnitCost(product.Category)]));
  const moved = new Map<string, number>();
  movements.forEach(move => moved.set(move.SKU || move.Product, (moved.get(move.SKU || move.Product) ?? 0) + number(move.Quantity)));
  return stock.flatMap(item => {
    const qty = number(item["Quantity On Hand"]);
    const available = number(item["Available Quantity"]);
    const unitCost = productCost.get(item.SKU) ?? seededUnitCost(item["Product Category"] || item.Category);
    const value = qty * unitCost;
    const turns = (moved.get(item.SKU || item.Product) ?? qty * 1.4) / Math.max(1, qty);
    const stale = turns < 1 || available > number(item["Min Stock"]) * 3;
    const expiryDays = item["Expiry Date"] ? daysBetween("2026-06-30", item["Expiry Date"]) : 999;
    return [
      row("inventory-turns", "Inventory turns", item.Product, { BU: item["Business Unit"] || "Operations", Date: item["Expiry Date"] || "2026-06-30", "Product Category": item.Category || categoryBySku[item.SKU] || "Stock", Product: item.Product, Supplier: item.Supplier, Status: item.Status, Amount: value, Value: turns, Days: Math.round(turns * 30), Notes: stale ? "Stale stock" : "Moving" }),
      row("inventory-turns", "Stale stock value", item.Product, { BU: item["Business Unit"] || "Operations", Date: "2026-06-30", "Product Category": item.Category || categoryBySku[item.SKU] || "Stock", Product: item.Product, Supplier: item.Supplier, Status: stale ? "Stale" : "Healthy", Amount: stale ? value : 0, Value: stale ? value : 0, Notes: `${available} available` }),
      row("expiry", "Stock expiry / cold chain alerts", item.Product, { BU: item["Business Unit"] || "Operations", Date: item["Expiry Date"] || "2026-12-31", "Product Category": item.Category || categoryBySku[item.SKU] || "Stock", Product: item.Product, Supplier: item.Supplier, Status: expiryDays <= 90 || item["Cold Chain Required"] === "Yes" ? "Alert" : "Healthy", Amount: value, Value: expiryDays, Days: expiryDays, Notes: item["Cold Chain Required"] === "Yes" ? "Cold chain" : "Ambient" })
    ];
  });
}

function serviceRows(read: SnapshotReader): ReportRow[] {
  const jobs = readRows(read, "service.Field Service Jobs");
  const contracts = readRows(read, "service.AMC Contracts");
  const jobRows = jobs.length ? jobs.map((job, index) => row("sla", "Service SLA compliance", job["Job No"] || `JOB-${index + 1}`, {
    BU: "Service", Date: "2026-06-20", Customer: job.Customer, Product: job.Equipment, Engineer: job.Engineer, Status: job["SLA Status"] || job.Status, Amount: 1, Value: job["SLA Status"]?.toLowerCase().includes("breach") ? 0 : 1, Days: number(job["SLA Timer"]) || 2, Notes: job["Work Performed"]
  })) : [
    row("sla", "Service SLA compliance", "SLA seed 1", { BU: "Service", Date: "2026-06-20", Customer: "Hamad Medical Corporation", Engineer: "Naveen Kumar", Status: "Within SLA", Amount: 1, Value: 1, Days: 2, Notes: "Seeded demo summary" }),
    row("sla", "Service SLA compliance", "SLA seed 2", { BU: "Service", Date: "2026-06-20", Customer: "Sidra Medicine", Engineer: "A. Joseph", Status: "At risk", Amount: 1, Value: 1, Days: 4, Notes: "Seeded demo summary" })
  ];
  const contractRows = contracts.length ? contracts.map(contract => {
    const churnRisk = contract["Renewal Status"]?.toLowerCase().includes("not due") ? 0 : 1;
    return row("amc", "AMC renewal/churn", contract["AMC Contract No"] || contract.Contract, {
      BU: "Service", Date: contract["Renewal Date"] || contract["End Date"] || "2026-10-01", Customer: contract.Customer, Product: contract["Equipment Covered"], Contract: contract["AMC Contract No"] || contract.Contract, Status: contract["Renewal Status"] || contract.Status, Amount: money(contract.Amount) || 72_000, Value: churnRisk, Days: daysBetween("2026-06-30", contract["Renewal Date"] || "2026-10-01"), Notes: contract["Auto-renewal Suggestion"] || "Renewal review"
    });
  }) : [row("amc", "AMC renewal/churn", "AMC-2026-SEED", { BU: "Service", Date: "2026-10-01", Customer: "Sidra Medicine", Product: "Blood Gas Analyzer", Contract: "AMC-2026-SEED", Status: "Not due", Amount: 72_000, Value: 0, Days: 93, Notes: "Seeded demo summary" })];
  return [...jobRows, ...contractRows];
}

function hrRows(read: SnapshotReader): ReportRow[] {
  const payroll = read("hr-enterprise:Payroll", hrViews.Payroll.rows);
  const employees = read("hr-enterprise:Employees", hrViews.Employees.rows);
  const totalRevenue = 12_680_000;
  const payrollTotal = payroll.reduce((sum, item) => sum + money(item["Gross pay"]), 0) || 1_284_600;
  const heads = employees.length ? groupCount(employees, "Department") : Object.fromEntries(hrDepartmentHeadcount);
  return Object.entries(heads).map(([department, count]) => row("payroll", "Revenue per head by BU", department, {
    BU: departmentToBu(department), Date: "2026-06-30", Status: "Active", Amount: payrollTotal * (count / Math.max(1, Object.values(heads).reduce((a, b) => a + b, 0))), Value: totalRevenue / Math.max(1, count), Days: count, Notes: `${count} headcount`
  }));
}

function managementRows(): ReportRow[] {
  return [
    row("management", "Executive action center", "MGT-ACT-2026-001", { BU: "Management", Date: "2026-07-01", Customer: "Hamad Medical Corporation", Status: "Overdue", Amount: 184_500, Margin: 0, Value: 1, Days: 3, Notes: "Approve credit override before quotation release" }),
    row("management", "Pending approvals by department", "MGT-APR-SALES", { BU: "Sales", Date: "2026-07-01", Status: "Pending", Amount: 286_000, Value: 4, Days: 1, Notes: "Quotation and discount approvals" }),
    row("management", "Pending approvals by department", "MGT-APR-PROC", { BU: "Procurement", Date: "2026-07-01", Supplier: "Thermo Fisher", Status: "Finance review", Amount: 94_750, Value: 2, Days: 1, Notes: "PO and supplier agreement approvals" }),
    row("management", "High-risk items", "MGT-RISK-001", { BU: "Inventory", Date: "2026-07-01", Product: "Troponin I Reagent Kit", Status: "High", Amount: 43_520, Value: 1, Days: 27, Notes: "Cold-chain and expiry watch" }),
    row("management", "Overdue tasks", "MGT-OD-001", { BU: "Finance", Date: "2026-07-01", Customer: "The View Hospital", Status: "Overdue", Amount: 138_900, Value: 1, Days: 61, Notes: "AR collection escalation" }),
    row("management", "BU profitability", "MGT-BU-DIAG", { BU: "Diagnostics", Date: "2026-06-30", Status: "Profitable", Amount: 2_600_000, Margin: 624_000, Value: 624_000, Notes: "Diagnostics YTD local demo margin" }),
    row("management", "Customer profitability", "MGT-CUST-HMC", { BU: "Medical Equipment", Date: "2026-06-30", Customer: "Hamad Medical Corporation", Status: "Watch", Amount: 4_800_000, Margin: 816_000, Value: 816_000, Notes: "Credit exposure reduces risk score" }),
    row("management", "Product profitability", "MGT-PROD-MX750", { BU: "Medical Equipment", Date: "2026-06-30", Product: "Patient Monitor MX750", "Product Category": "Equipment", Status: "Healthy", Amount: 1_240_000, Margin: 298_000, Value: 298_000, Notes: "Margin above floor" }),
    row("management", "Department KPI scorecards", "MGT-KPI-SRV", { BU: "Service", Date: "2026-06-30", Engineer: "Naveen Kumar", Status: "On track", Amount: 1, Value: 96.8, Days: 2, Notes: "SLA compliance and PM closure" }),
    row("management", "Risk register", "MGT-RR-001", { BU: "Projects", Date: "2026-07-01", Contract: "PRJ-2026-0019", Status: "Open", Amount: 6_200_000, Value: 1, Days: 14, Notes: "Milestone schedule and change order risk" }),
    row("management", "Decision log", "MGT-DEC-001", { BU: "Executive", Date: "2026-07-01", Status: "Recorded", Amount: 0, Value: 1, Notes: "Management approved local demo auditor role and no external integrations" })
  ];
}

function kpisFor(id: ReportDashboardId, own: ReportRow[], all: ReportRow[]): ReportKpi[] {
  const amount = sum(own, "Amount");
  const value = sum(own, "Value");
  const count = own.length;
  const avgDays = count ? own.reduce((total, row) => total + row.Days, 0) / count : 0;
  const revenue = all.filter(row => row.KPI === "Revenue by BU vs target");
  const marginRows = all.filter(row => row.KPI === "Gross margin by BU/customer/product");
  const arRows = all.filter(row => row.Dashboard === "dso");
  const slaRows = all.filter(row => row.Dashboard === "sla");
  const tenderRows = all.filter(row => row.Dashboard === "tender");
  const payrollRows = all.filter(row => row.Dashboard === "payroll");
  const target = sum(revenue, "Target") / Math.max(1, new Set(revenue.map(row => row.BU)).size);
  const margin = sum(marginRows, "Margin");
  const slaMet = slaRows.filter(row => !row.Status.toLowerCase().includes("breach")).length;
  const tendersWon = tenderRows.filter(row => /won|award/i.test(row.Status)).length;
  const map: Record<ReportDashboardId, ReportKpi[]> = {
    executive: [
      kpi("Revenue by BU vs target", qar(sum(revenue, "Amount")), `${pct(sum(revenue, "Amount"), target)} of blended target`, "success", "Revenue by BU vs target"),
      kpi("Gross margin", qar(margin), `${pct(margin, sum(marginRows, "Amount"))} margin`, "success", "Gross margin by BU/customer/product"),
      kpi("DSO", `${Math.round(weightedAverage(arRows, "Days", "Amount") || 47)} days`, "Receivables aging", "warning", "DSO"),
      kpi("Cash forecast", qar(sum(all.filter(row => row.Dashboard === "cash"), "Amount")), "90-day net position", "info", "Cash position and 90-day forecast")
    ],
    management: [
      kpi("Executive action center", String(own.filter(row => row.KPI === "Executive action center").length), "Open local actions", "warning", "Executive action center"),
      kpi("High-risk items", String(own.filter(row => row.KPI === "High-risk items").length), "Needs leadership attention", "danger", "High-risk items"),
      kpi("BU profitability", qar(sum(own.filter(row => row.KPI === "BU profitability"), "Margin")), "Forecast margin", "success", "BU profitability"),
      kpi("Decision log", String(own.filter(row => row.KPI === "Decision log").length), "Recorded decisions", "info", "Decision log")
    ],
    pipeline: [
      kpi("Open pipeline", qar(amount), `${count} local records`, "info", "Win/loss rate"),
      kpi("Win/loss rate", `${pct(own.filter(row => /won/i.test(row.Status)).length, count)}`, "Won rows / total rows", "success", "Win/loss rate"),
      kpi("Weighted pipeline", qar(value * 0.46), "Demo weighted value", "info", "Win/loss rate"),
      kpi("Avg deal cycle", `${Math.round(avgDays)} days`, "Stage age proxy", "warning", "Win/loss rate")
    ],
    "revenue-bu": [
      kpi("Revenue", qar(amount), `${pct(amount, sumUniqueTargets(own))} of target`, "success", "Revenue by BU vs target"),
      kpi("Target", qar(sumUniqueTargets(own)), "Local BU target", "info", "Revenue by BU vs target"),
      kpi("Best BU", topGroup(own, "BU", "Amount"), "By revenue", "success", "Revenue by BU vs target"),
      kpi("Revenue rows", String(count), "Drillable records", "info", "Revenue by BU vs target")
    ],
    margin: [
      kpi("Gross margin", qar(sum(own, "Margin")), `${pct(sum(own, "Margin"), amount)} blended`, "success", "Gross margin by BU/customer/product"),
      kpi("Best customer", topGroup(own, "Customer", "Margin"), "By gross margin", "success", "Gross margin by BU/customer/product"),
      kpi("Best product", topGroup(own, "Product", "Margin"), "By gross margin", "info", "Gross margin by BU/customer/product"),
      kpi("Margin rows", String(count), "BU/customer/product", "info", "Gross margin by BU/customer/product")
    ],
    coverage: [
      kpi("Pipeline coverage", `${(value / Math.max(1, count)).toFixed(1)}x`, "Average deal coverage", "success", "Pipeline coverage by BU/salesperson"),
      kpi("Top salesperson", topGroup(own, "Salesperson", "Amount"), "By pipeline value", "info", "Pipeline coverage by BU/salesperson"),
      kpi("Coverage value", qar(amount), "Open pipeline", "info", "Pipeline coverage by BU/salesperson"),
      kpi("Salespeople", String(new Set(own.map(row => row.Salesperson).filter(Boolean)).size), "Active owners", "info", "Pipeline coverage by BU/salesperson")
    ],
    otc: [
      kpi("Cycle time", `${Math.round(avgDays)} days`, "Order to cash", "warning", "Order-to-cash cycle time"),
      kpi("Fastest cycle", `${Math.min(...own.map(row => row.Days), 0)} days`, "Best record", "success", "Order-to-cash cycle time"),
      kpi("O2C value", qar(amount), "Invoices in view", "info", "Order-to-cash cycle time"),
      kpi("Records", String(count), "Local invoice rows", "info", "Order-to-cash cycle time")
    ],
    dso: [
      kpi("DSO", `${Math.round(weightedAverage(own, "Days", "Amount") || 47)} days`, "Weighted by AR", "warning", "DSO"),
      kpi("Receivables", qar(amount), "Open AR", "info", "DSO"),
      kpi("Overdue", qar(sum(own.filter(row => row.Days > 0), "Amount")), "Past due", "warning", "DSO"),
      kpi("Largest customer", topGroup(own, "Customer", "Amount"), "By AR", "info", "DSO")
    ],
    "inventory-turns": [
      kpi("Inventory turns", `${(value / Math.max(1, count)).toFixed(1)}x`, "Average turn proxy", "info", "Inventory turns"),
      kpi("Stale stock value", qar(sum(own.filter(row => row.KPI === "Stale stock value"), "Value")), "Slow moving", "warning", "Stale stock value"),
      kpi("Inventory value", qar(sum(own.filter(row => row.KPI === "Inventory turns"), "Amount")), "Stock on hand", "info", "Inventory turns"),
      kpi("Stale SKUs", String(own.filter(row => row.Status === "Stale").length), "Needs action", "warning", "Stale stock value")
    ],
    expiry: [
      kpi("Expiry alerts", String(own.filter(row => row.Status === "Alert").length), "Cold chain or <=90 days", "warning", "Stock expiry / cold chain alerts"),
      kpi("Cold chain value", qar(sum(own.filter(row => row.Notes === "Cold chain"), "Amount")), "Controlled stock", "info", "Stock expiry / cold chain alerts"),
      kpi("Nearest expiry", `${Math.min(...own.map(row => row.Days).filter(days => days > 0), 0)} days`, "FEFO watch", "warning", "Stock expiry / cold chain alerts"),
      kpi("Alert value", qar(sum(own.filter(row => row.Status === "Alert"), "Amount")), "Stock at risk", "warning", "Stock expiry / cold chain alerts")
    ],
    sla: [
      kpi("Service SLA compliance", `${pct(slaMet, Math.max(1, slaRows.length))}`, "Within SLA", "success", "Service SLA compliance"),
      kpi("Open jobs", String(count), "Service records", "info", "Service SLA compliance"),
      kpi("Avg SLA timer", `${avgDays.toFixed(1)} hrs`, "Demo timer", "info", "Service SLA compliance"),
      kpi("Engineers", String(new Set(own.map(row => row.Engineer).filter(Boolean)).size), "Active", "info", "Service SLA compliance")
    ],
    amc: [
      kpi("AMC renewal", `${pct(own.filter(row => row.Value === 0).length, Math.max(1, count))}`, "Low churn risk", "success", "AMC renewal/churn"),
      kpi("Churn risk", String(own.filter(row => row.Value > 0).length), "Review needed", "warning", "AMC renewal/churn"),
      kpi("AMC value", qar(amount), "Contract value", "info", "AMC renewal/churn"),
      kpi("Next renewal", `${Math.min(...own.map(row => row.Days).filter(days => days > 0), 0)} days`, "Upcoming", "info", "AMC renewal/churn")
    ],
    tender: [
      kpi("Tender win rate", `${pct(tendersWon, Math.max(1, tenderRows.length))}`, "Awarded / submitted", "warning", "Tender win rate"),
      kpi("Tender value", qar(amount), "Bid value", "info", "Tender win rate"),
      kpi("Open tenders", String(own.filter(row => !/won|lost|award/i.test(row.Status)).length), "Awaiting decision", "warning", "Tender win rate"),
      kpi("Avg margin", `${pct(sum(own, "Margin"), amount)}`, "Bid gross margin", "info", "Tender win rate")
    ],
    cash: [
      kpi("Cash position", qar(2_860_000), "Opening local cash", "success", "Cash position and 90-day forecast"),
      kpi("90-day forecast", qar(2_860_000 + amount), "Opening cash + net flows", amount >= 0 ? "success" : "warning", "Cash position and 90-day forecast"),
      kpi("Inflows", qar(sum(own.filter(row => row.Amount > 0), "Amount")), "Expected receipts", "success", "Cash position and 90-day forecast"),
      kpi("Outflows", qar(Math.abs(sum(own.filter(row => row.Amount < 0), "Amount"))), "Expected payments", "warning", "Cash position and 90-day forecast")
    ],
    payroll: [
      kpi("Headcount", String(sum(own, "Days")), "Employees by cost center", "info", "Revenue per head by BU"),
      kpi("Payroll cost", qar(amount), "Monthly gross", "info", "Revenue per head by BU"),
      kpi("Revenue per head", qar(weightedAverage(payrollRows, "Value", "Days")), "By BU", "success", "Revenue per head by BU"),
      kpi("Cost centers", String(new Set(own.map(row => row.BU)).size), "Active", "info", "Revenue per head by BU")
    ]
  };
  return map[id];
}

function chartDataFor(id: ReportDashboardId, rows: ReportRow[]) {
  if (id === "cash") {
    let running = 2_860_000;
    return rows.sort((a, b) => a.Date.localeCompare(b.Date)).map(row => ({ name: row.Date.slice(5), value: Math.round((running += row.Amount)), amount: row.Amount }));
  }
  if (id === "sla") return groupRows(rows, "Status", "Amount").map(item => ({ name: item.name, value: item.value }));
  if (id === "management") return groupRows(rows, "KPI", "Value").map(item => ({ name: item.name, value: item.value }));
  if (["dso", "otc", "expiry"].includes(id)) return groupRows(rows, "Record", "Days").slice(0, 8).map(item => ({ name: item.name, value: item.value }));
  const key: keyof ReportRow = id === "coverage" ? "Salesperson" : id === "margin" ? "Customer" : id === "inventory-turns" ? "Product" : "BU";
  return groupRows(rows, key, id === "margin" ? "Margin" : "Amount").slice(0, 8).map(item => ({ name: item.name, value: item.value }));
}

function filterOptions(rows: ReportRow[]) {
  return {
    bu: unique(rows.map(row => row.BU)),
    salesperson: unique(rows.map(row => row.Salesperson)),
    customer: unique(rows.map(row => row.Customer)),
    category: unique(rows.map(row => row["Product Category"])),
    supplier: unique(rows.map(row => row.Supplier)),
    engineer: unique(rows.map(row => row.Engineer)),
    contract: unique(rows.map(row => row.Contract)),
    status: unique(rows.map(row => row.Status))
  };
}

function row(dashboard: ReportDashboardId, kpiName: string, record: string, values: Partial<ReportRow>): ReportRow {
  return {
    Dashboard: dashboard,
    KPI: kpiName,
    Record: record,
    BU: "",
    Date: "2026-06-30",
    Salesperson: "",
    Customer: "",
    "Product Category": "",
    Product: "",
    Supplier: "",
    Engineer: "",
    Contract: "",
    Status: "",
    Amount: 0,
    Target: 0,
    Margin: 0,
    Days: 0,
    Value: 0,
    Notes: "",
    ...values
  };
}

function readSalesWorkflowSeed() {
  return seedSalesWorkflows();
}

function readRows(read: SnapshotReader, key: string) {
  return read(key.replace(".", ":"), medtechScopeViews[key]?.rows ?? []);
}

function money(value?: string) {
  const parsed = Number(String(value ?? "").replace(/[^0-9.-]/g, ""));
  return Number.isFinite(parsed) ? parsed : 0;
}

function number(value?: string) {
  const parsed = Number(String(value ?? "").replace(/[^0-9.-]/g, ""));
  return Number.isFinite(parsed) ? parsed : 0;
}

function qar(value: number) {
  return `QAR ${Math.round(value).toLocaleString("en-US")}`;
}

function pct(value: number, total: number) {
  return `${Math.round((value / Math.max(1, total)) * 100)}%`;
}

function sum(rows: ReportRow[], key: "Amount" | "Target" | "Margin" | "Value" | "Days") {
  return rows.reduce((total, row) => total + row[key], 0);
}

function weightedAverage(rows: ReportRow[], valueKey: "Days" | "Value", weightKey: "Amount" | "Days") {
  const weight = rows.reduce((total, row) => total + Math.abs(row[weightKey]), 0);
  if (!weight) return 0;
  return rows.reduce((total, row) => total + row[valueKey] * Math.abs(row[weightKey]), 0) / weight;
}

function sumUniqueTargets(rows: ReportRow[]) {
  return Array.from(new Map(rows.map(row => [row.BU, row.Target])).values()).reduce((total, value) => total + value, 0);
}

function topGroup(rows: ReportRow[], key: keyof ReportRow, valueKey: "Amount" | "Margin") {
  return groupRows(rows, key, valueKey)[0]?.name || "None";
}

function groupRows(rows: ReportRow[], key: keyof ReportRow, valueKey: "Amount" | "Margin" | "Days" | "Value") {
  const groups = new Map<string, number>();
  rows.forEach(row => {
    const name = String(row[key] || "Unassigned");
    groups.set(name, (groups.get(name) ?? 0) + row[valueKey]);
  });
  return Array.from(groups, ([name, value]) => ({ name, value: Math.round(value) })).sort((a, b) => Math.abs(b.value) - Math.abs(a.value));
}

function groupCount(rows: Array<Record<string, string>>, key: string) {
  return rows.reduce<Record<string, number>>((acc, row) => {
    const name = row[key] || "Other";
    acc[name] = (acc[name] ?? 0) + 1;
    return acc;
  }, {});
}

function unique(values: string[]) {
  return Array.from(new Set(values.filter(Boolean))).sort();
}

function seededUnitCost(category = "") {
  if (/equipment/i.test(category)) return 21_400;
  if (/reagent/i.test(category)) return 1_280;
  if (/consumable/i.test(category)) return 9;
  return 940;
}

function iso(value?: string) {
  if (!value) return "";
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? "" : parsed.toISOString().slice(0, 10);
}

function daysBetween(from: string, to: string) {
  const a = new Date(from);
  const b = new Date(to);
  if (Number.isNaN(a.getTime()) || Number.isNaN(b.getTime())) return 0;
  return Math.round((b.getTime() - a.getTime()) / 86_400_000);
}

function agingBucket(days: number) {
  if (days <= 0) return "Current";
  if (days <= 30) return "1-30";
  if (days <= 60) return "31-60";
  return "60+";
}

function departmentToBu(department: string) {
  if (/sales/i.test(department)) return "Medical Equipment";
  if (/service/i.test(department)) return "Service";
  if (/warehouse|procurement/i.test(department)) return "Operations";
  if (/project/i.test(department)) return "Projects";
  return department;
}

const executiveKpis = new Set([
  "Revenue by BU vs target",
  "Gross margin by BU/customer/product",
  "DSO",
  "Service SLA compliance",
  "Cash position and 90-day forecast",
  "Revenue per head by BU"
]);

function kpi(label: string, value: string, note: string, tone: ReportKpi["tone"], drill: string): ReportKpi {
  return { label, value, note, tone, drill };
}
