import type { DemoTabView } from "@/lib/demo-tabs";
import { documentSequences, pdfTemplateCatalog } from "@/lib/document-catalog";
import { setupSeedViews } from "@/lib/local-erp-foundation";

const view = (columns: string[], rows: Array<Record<string, string>>): DemoTabView => ({ columns, rows });

export const medtechScopeViews: Record<string, DemoTabView> = {
  ...setupSeedViews,
  "admin.Master Setup": view(["Setup", "Code", "Category", "Owner", "Effective date", "Status"], [
    { Setup: "Business Units", Code: "BU", Category: "Foundation", Owner: "Super Admin", "Effective date": "01 Jan 2026", Status: "Active" },
    { Setup: "Approval Thresholds", Code: "APR", Category: "Controls", Owner: "Finance Manager", "Effective date": "01 Jan 2026", Status: "Active" },
    { Setup: "Warehouse Locations", Code: "WMS", Category: "Inventory", Owner: "Warehouse Team", "Effective date": "01 Jan 2026", Status: "Draft" }
  ]),
  "admin.Document Sequences": view(["Document type", "Prefix", "Next number", "Reset", "Owner", "Status"], [
    ...documentSequences.map(([type, prefix], index) => ({ "Document type": type, Prefix: prefix, "Next number": String(index + 1).padStart(4, "0"), Reset: "Annually", Owner: "Document Control", Status: "Active" }))
  ]),
  "admin.Automation Monitor": view(["Trigger Event No", "Trigger Name", "Source Module", "Source Record", "Action Taken", "Status", "Run By", "Run At", "Notes"], [
    { "Trigger Event No": "AUTO-2026-0001", "Trigger Name": "Discount above threshold", "Source Module": "Sales", "Source Record": "QTN-2026-00314", "Action Taken": "Approval request created", Status: "Completed", "Run By": "System Demo", "Run At": "20 Jun 2026, 10:00", Notes: "Local Demo Only - no external service called" }
  ]),
  "admin.Data Import Center": view(["Import", "Template", "Target module", "Rows", "Last import", "Status"], [
    { Import: "Customers", Template: "Customer_Master_Dummy.xlsx", "Target module": "Sales", Rows: "100", "Last import": "Not run", Status: "Ready" },
    { Import: "Products", Template: "Product_Master_Dummy.xlsx", "Target module": "Inventory", Rows: "5000", "Last import": "Not run", Status: "Ready" },
    { Import: "Employee extension data", Template: "Employee_Master_Dummy.xlsx", "Target module": "HR child records", Rows: "300", "Last import": "Not run", Status: "Ready" }
  ]),
  "admin.UAT Tracker": view(["Test case", "Area", "Owner", "Priority", "Result", "Status"], [
    { "Test case": "Straight Forward Sales", Area: "Order-to-cash", Owner: "Sales Operations", Priority: "High", Result: "Pending", Status: "Not started" },
    { "Test case": "Procure-to-pay", Area: "Supply chain", Owner: "Procurement", Priority: "High", Result: "Pending", Status: "Not started" },
    { "Test case": "Monthly payroll with cost-center allocation", Area: "HR Payroll", Owner: "Payroll Manager", Priority: "High", Result: "Pending", Status: "Partial" }
  ]),

  "sales.Master Data": view(["Master", "Code", "Name", "Owner", "Status", "Notes"], [
    { Master: "Business Unit", Code: "BU-DIAG", Name: "Diagnostics", Owner: "Commercial Director", Status: "Active", Notes: "Linked to products, sales and commissions" },
    { Master: "Cost Center", Code: "CC-400", Name: "Sales", Owner: "Finance Manager", Status: "Active", Notes: "Used for margins and reporting" }
  ]),
  "sales.Customers": view(["Customer Code", "Customer Account Code", "Customer Department Code", "Customer Name", "Organization Name", "Customer Segment", "Account Name (Branch)", "Department", "Sub-Department", "Market Segment", "Customer Type", "Email", "Phone", "Status", "Sales Region", "Billing Address", "Delivery Address", "City", "Country", "Currency", "Payment Terms", "Credit Limit (QAR)", "Tax Class", "Commercial Registration", "VAT Registration"], [
    { "Customer Code": "CUS-00018", "Customer Account Code": "ACC-HMC-01", "Customer Department Code": "DEP-HMC-LAB", "Customer Name": "Hamad Medical Corporation - Lab", "Organization Name": "Hamad Medical Corporation", "Customer Segment": "Government", "Account Name (Branch)": "Main Campus", Department: "Laboratory", "Sub-Department": "Chemistry", "Market Segment": "Hospital", "Customer Type": "End customer", Email: "lab.procurement@example.qa", Phone: "+974 4400 0000", Status: "Active", "Sales Region": "Doha", "Billing Address": "Doha", "Delivery Address": "Main warehouse receiving", City: "Doha", Country: "Qatar", Currency: "QAR", "Payment Terms": "30 days", "Credit Limit (QAR)": "QAR 1,000,000", "Tax Class": "Standard", "Commercial Registration": "CR-DEMO-001", "VAT Registration": "N/A" }
  ]),
  "sales.Universal Enquiry Pool": view(["Enquiry", "Source", "Customer", "Contact", "BU", "Product interest", "Owner", "Claim expiry", "Conflict", "COO review", "Status"], [
    { Enquiry: "ENQ-2026-0108", Source: "Website", Customer: "Hamad Medical Corporation", Contact: "Lab Procurement", BU: "Diagnostics", "Product interest": "Troponin I Reagent Kit", Owner: "Unclaimed", "Claim expiry": "22 Jun 2026", Conflict: "No", "COO review": "No", Status: "New" },
    { Enquiry: "ENQ-2026-0102", Source: "Tender Portal", Customer: "Ministry of Public Health", Contact: "Tender Committee", BU: "Pharma", "Product interest": "Cold-chain tender", Owner: "F. Al-Kuwari", "Claim expiry": "Expired", Conflict: "Yes", "COO review": "Yes", Status: "Conflict review" }
  ]),
  "sales.BANT Qualification": view(["Lead", "Customer", "Budget", "Authority", "Need", "Timeline", "BANT Total", "Qualification", "Next action", "Status"], [
    { Lead: "ENQ-2026-0108", Customer: "Hamad Medical Corporation", Budget: "3", Authority: "2", Need: "3", Timeline: "2", "BANT Total": "10", Qualification: "Qualified", "Next action": "Convert to opportunity", Status: "Submitted" },
    { Lead: "ENQ-2026-0099", Customer: "Private Clinic Group", Budget: "1", Authority: "1", Need: "2", Timeline: "1", "BANT Total": "5", Qualification: "Nurture", "Next action": "Follow up next month", Status: "Draft" }
  ]),
  "sales.Lead Claims": view(["Claim", "Enquiry", "Claimed by", "Claimed at", "Expires at", "Conflict reason", "Release reason", "Status"], [
    { Claim: "CLM-2026-0048", Enquiry: "ENQ-2026-0108", "Claimed by": "F. Al-Kuwari", "Claimed at": "20 Jun 2026, 09:30", "Expires at": "22 Jun 2026, 09:30", "Conflict reason": "", "Release reason": "", Status: "Active" },
    { Claim: "CLM-2026-0044", Enquiry: "ENQ-2026-0102", "Claimed by": "R. Mathew", "Claimed at": "17 Jun 2026, 11:00", "Expires at": "Expired", "Conflict reason": "Duplicate tender ownership", "Release reason": "", Status: "COO review" }
  ]),
  "sales.Straight Forward Sales": view(["Deal", "Customer", "Salesperson", "BU", "Products", "Gross amount", "Margin %", "Discount %", "Approval status", "Stage", "Status"], [
    { Deal: "SFS-2026-0031", Customer: "Hamad Medical Corporation", Salesperson: "F. Al-Kuwari", BU: "Diagnostics", Products: "Troponin I Reagent Kit", "Gross amount": "QAR 286,000", "Margin %": "31.2%", "Discount %": "18", "Approval status": "Pending approval", Stage: "Discount Approval", Status: "Submitted" }
  ]),
  "sales.GPPRR": view(["Contract", "Customer", "Principal", "Product family", "Minimum stock", "Monthly consumption", "Replenishment trigger", "Last delivery", "Next invoice", "Status"], [
    { Contract: "GPR-2026-0012", Customer: "Sidra Medicine", Principal: "Thermo Fisher", "Product family": "Reagents", "Minimum stock": "40 kits", "Monthly consumption": "28 kits", "Replenishment trigger": "Below minimum", "Last delivery": "18 Jun 2026", "Next invoice": "30 Jun 2026", Status: "Active" }
  ]),
  "sales.Pharma Tender": view(["Tender", "Customer", "BU", "Deadline", "Bid value", "Batch compliance", "Approval status", "Stage", "Status"], [
    { Tender: "TND-2026-0021", Customer: "Ministry of Public Health", BU: "Pharma", Deadline: "28 Jun 2026", "Bid value": "QAR 1,840,000", "Batch compliance": "Required", "Approval status": "Finance review", Stage: "Finance/Commercial Approval", Status: "Pending approval" }
  ]),
  "sales.Project Sales": view(["Project Deal", "Customer", "Departments", "Consolidated quote", "Margin %", "Approval tier", "Project", "Milestone invoice", "Stage", "Status"], [
    { "Project Deal": "PSO-2026-0007", Customer: "Private Healthcare Group", Departments: "Sales, Service, Projects", "Consolidated quote": "QAR 4,800,000", "Margin %": "22.4%", "Approval tier": "Multi-tier", Project: "Placeholder", "Milestone invoice": "Advance 20%", Stage: "Margin Review", Status: "Submitted" }
  ]),
  "sales.Commissions": view(["Commission run", "Period", "Salesperson", "BU", "Deal / Invoice", "Gross amount", "Margin", "Commission %", "Split %", "Commission amount", "Payroll ready", "Status"], [
    { "Commission run": "COM-2026-06", Period: "June 2026", Salesperson: "F. Al-Kuwari", BU: "Diagnostics", "Deal / Invoice": "INV-2026-00481", "Gross amount": "QAR 184,500", Margin: "QAR 57,564", "Commission %": "3", "Split %": "100", "Commission amount": "QAR 1,727", "Payroll ready": "No", Status: "Draft" }
  ]),

  "approvals.Approval Matrix": view(["Rule", "Source module", "Request type", "Condition", "Approver role", "Threshold", "Blocking", "Status"], [
    { Rule: "APR-SALES-DISC-10", "Source module": "Sales", "Request type": "Quotation discount", Condition: "Discount % > 10", "Approver role": "Sales Director", Threshold: "10%", Blocking: "Yes", Status: "Active" },
    { Rule: "APR-PO-50000", "Source module": "Procurement", "Request type": "Purchase order", Condition: "Amount > QAR 50,000", "Approver role": "Finance Manager", Threshold: "QAR 50,000", Blocking: "Yes", Status: "Active" }
  ]),

  "procurement.Purchase Requests": view(["PR No", "Requesting Module", "Requested By", "Business Unit", "Department", "Product Lines", "Required Date", "Justification", "Status"], [
    { "PR No": "PR-2026-00018", "Requesting Module": "Sales", "Requested By": "F. Al-Kuwari", "Business Unit": "Diagnostics", Department: "Procurement", "Product Lines": "Troponin I Reagent Kit x 40 kits", "Required Date": "2026-07-08", Justification: "Replenishment for HMC diagnostics opportunity", Status: "Draft" }
  ]),
  "procurement.RFQs": view(["RFQ No", "Supplier", "Currency", "Expected Lead Time", "Quote Validity", "Product Lines", "Quoted Cost", "Status"], [
    { "RFQ No": "RFQ-2026-00148", Supplier: "Thermo Fisher Scientific", Currency: "USD", "Expected Lead Time": "28 days", "Quote Validity": "2026-07-05", "Product Lines": "Troponin I Reagent Kit x 40 kits", "Quoted Cost": "USD 15,600", Status: "Response received" },
    { "RFQ No": "RFQ-2026-00145", Supplier: "BD Biosciences", Currency: "USD", "Expected Lead Time": "35 days", "Quote Validity": "2026-07-03", "Product Lines": "Nitrile Examination Gloves Medium x 480 boxes", "Quoted Cost": "USD 2,520", Status: "Under evaluation" }
  ]),
  "procurement.Supplier Comparison": view(["Comparison No", "RFQ No", "Supplier", "Price", "Currency", "Lead Time", "Payment Terms", "Availability", "Notes", "Winning Supplier", "Status"], [
    { "Comparison No": "CMP-2026-00018", "RFQ No": "RFQ-2026-00148", Supplier: "Thermo Fisher Scientific", Price: "USD 15,600", Currency: "USD", "Lead Time": "28 days", "Payment Terms": "45 days", Availability: "Available", Notes: "Best technical match and acceptable lead time", "Winning Supplier": "Thermo Fisher Scientific", Status: "Submitted" }
  ]),
  "procurement.Purchase Orders": view(["PO No", "Supplier", "Currency", "Product Lines", "Total", "Approval Status", "Delivery ETA", "Status"], [
    { "PO No": "PO-2026-0128", Supplier: "Siemens Healthineers", Currency: "EUR", "Product Lines": "Patient Monitor MX750 x 8 units", Total: "EUR 41,600", "Approval Status": "Approved", "Delivery ETA": "2026-07-14", Status: "Approved" },
    { "PO No": "PO-2026-0124", Supplier: "Thermo Fisher Scientific", Currency: "USD", "Product Lines": "Troponin I Reagent Kit x 40 kits", Total: "USD 15,600", "Approval Status": "Pending approval", "Delivery ETA": "2026-07-29", Status: "Pending approval" }
  ]),
  "procurement.Goods Receipts": view(["GRN No", "PO No", "Supplier", "Received Lines", "Warehouse", "Location", "Lot/Serial/Batch", "Expiry Date", "QC Status", "Status"], [
    { "GRN No": "GRN-2026-00098", "PO No": "PO-2026-0119", Supplier: "BD Biosciences", "Received Lines": "Nitrile Examination Gloves Medium x 480 boxes", Warehouse: "Main Warehouse", Location: "Quality Inspection", "Lot/Serial/Batch": "LOT-NG-0626", "Expiry Date": "2027-06-20", "QC Status": "Pending", Status: "Completed" }
  ]),
  "procurement.Vendor Bills": view(["Vendor Bill No", "PO No", "GRN No", "Supplier", "Currency", "Amount", "Bill Date", "Due Date", "Accounting Posting", "Status"], [
    { "Vendor Bill No": "BILL-DRAFT-2026-00030", "PO No": "PO-2026-0119", "GRN No": "GRN-2026-00098", Supplier: "BD Biosciences", Currency: "QAR", Amount: "QAR 42,900", "Bill Date": "2026-06-20", "Due Date": "2026-07-20", "Accounting Posting": "Not posted - local draft only", Status: "Draft" }
  ]),
  "procurement.PO Documents": view(["Document No", "PO No", "Supplier", "Document Type", "Generated By", "Generated At", "Status"], [
    { "Document No": "PO-DOC-2026-00001", "PO No": "PO-2026-0128", Supplier: "Siemens Healthineers", "Document Type": "Purchase Order PDF", "Generated By": "M. Said", "Generated At": "20 Jun 2026, 10:15", Status: "Generated" }
  ]),
  "procurement.Supplier Master": view(["Supplier Code", "Principal / Supplier Name", "Country of Origin", "Region", "Aligned Business Unit", "Secondary BU 1", "Secondary BU 2", "Product Category / Brand Line", "Primary Contact", "Contact Email", "Contact Phone", "Currency", "Payment Terms", "Lead Time (Days)", "Credit Limit", "Distributor Agreement Status", "Exclusivity", "Status"], [
    { "Supplier Code": "VEN-00019", "Principal / Supplier Name": "Thermo Fisher", "Country of Origin": "USA", Region: "Global", "Aligned Business Unit": "Diagnostics", "Secondary BU 1": "Pharma", "Secondary BU 2": "", "Product Category / Brand Line": "Life sciences", "Primary Contact": "Regional Sales Desk", "Contact Email": "demo@example.com", "Contact Phone": "+974 4000 0000", Currency: "QAR", "Payment Terms": "30 days", "Lead Time (Days)": "14", "Credit Limit": "QAR 500,000", "Distributor Agreement Status": "Active", Exclusivity: "Non-exclusive", Status: "Approved" }
  ]),

  "inventory.Products": view(["Product", "SKU", "Business Unit", "Category", "Supplier", "Min Stock", "Max Stock", "Cold Chain Required", "Expiry Controlled", "Batch Tracking Required", "Status"], [
    { Product: "Patient Monitor MX750", SKU: "ME-PM-0750", "Business Unit": "Medical Equipment", Category: "Equipment", Supplier: "Siemens Healthineers", "Min Stock": "4", "Max Stock": "18", "Cold Chain Required": "No", "Expiry Controlled": "No", "Batch Tracking Required": "No", Status: "Active" },
    { Product: "Troponin I Reagent Kit", SKU: "DX-TRP-100", "Business Unit": "Diagnostics", Category: "Reagents", Supplier: "Thermo Fisher Scientific", "Min Stock": "20", "Max Stock": "80", "Cold Chain Required": "Yes", "Expiry Controlled": "Yes", "Batch Tracking Required": "Yes", Status: "Active" },
    { Product: "Nitrile Examination Gloves Medium", SKU: "CS-NGL-M", "Business Unit": "Pharma", Category: "Consumables", Supplier: "BD Biosciences", "Min Stock": "500", "Max Stock": "2500", "Cold Chain Required": "No", "Expiry Controlled": "Yes", "Batch Tracking Required": "Yes", Status: "Active" }
  ]),
  "inventory.Stock On Hand": view(["Product", "SKU", "Warehouse", "Location", "Lot/Batch/Serial", "Expiry Date", "Quantity On Hand", "Reserved Quantity", "Available Quantity", "Min Stock", "Max Stock", "QC Status", "Cold Chain Required", "Status"], [
    { Product: "Patient Monitor MX750", SKU: "ME-PM-0750", Warehouse: "Main Warehouse", Location: "Main Aisle", "Lot/Batch/Serial": "SN-MX750-88421", "Expiry Date": "", "Quantity On Hand": "18", "Reserved Quantity": "6", "Available Quantity": "12", "Min Stock": "4", "Max Stock": "18", "QC Status": "Released", "Cold Chain Required": "No", Status: "Available" },
    { Product: "Troponin I Reagent Kit", SKU: "DX-TRP-100", Warehouse: "Cold Store", Location: "Cold Room A", "Lot/Batch/Serial": "LOT-TI-2604", "Expiry Date": "2026-09-28", "Quantity On Hand": "34", "Reserved Quantity": "4", "Available Quantity": "30", "Min Stock": "20", "Max Stock": "80", "QC Status": "Released", "Cold Chain Required": "Yes", Status: "Available" },
    { Product: "Troponin I Reagent Kit", SKU: "DX-TRP-100", Warehouse: "Cold Store", Location: "Quality Inspection", "Lot/Batch/Serial": "LOT-TI-QC", "Expiry Date": "2026-08-30", "Quantity On Hand": "8", "Reserved Quantity": "0", "Available Quantity": "8", "Min Stock": "20", "Max Stock": "80", "QC Status": "Quarantine", "Cold Chain Required": "Yes", Status: "Quarantine" },
    { Product: "Nitrile Examination Gloves Medium", SKU: "CS-NGL-M", Warehouse: "Main Warehouse", Location: "Main Aisle", "Lot/Batch/Serial": "LOT-NG-0626", "Expiry Date": "2027-06-20", "Quantity On Hand": "1480", "Reserved Quantity": "240", "Available Quantity": "1240", "Min Stock": "500", "Max Stock": "2500", "QC Status": "Released", "Cold Chain Required": "No", Status: "Available" }
  ]),
  "inventory.Lots / Batches / Serials": view(["Lot/Batch/Serial", "Product", "SKU", "Warehouse", "Location", "Expiry Date", "Quantity", "QC Status", "Batch Tracking", "Source", "Status"], [
    { "Lot/Batch/Serial": "LOT-TI-2604", Product: "Troponin I Reagent Kit", SKU: "DX-TRP-100", Warehouse: "Cold Store", Location: "Cold Room A", "Expiry Date": "2026-09-28", Quantity: "34", "QC Status": "Released", "Batch Tracking": "Yes", Source: "Procurement GRN GRN-2026-00098", Status: "Available" },
    { "Lot/Batch/Serial": "SN-MX750-88421", Product: "Patient Monitor MX750", SKU: "ME-PM-0750", Warehouse: "Main Warehouse", Location: "Main Aisle", "Expiry Date": "", Quantity: "18", "QC Status": "Released", "Batch Tracking": "Serial", Source: "Project delivery reserve", Status: "Available" }
  ]),
  "inventory.Stock Movements": view(["Movement No", "Type", "Product", "SKU", "From", "To", "Lot/Batch/Serial", "Quantity", "Source", "Status"], [
    { "Movement No": "MOV-2026-00882", Type: "Sales delivery dispatch", Product: "Patient Monitor MX750", SKU: "ME-PM-0750", From: "Main Warehouse", To: "HMC", "Lot/Batch/Serial": "SN-MX750-88421", Quantity: "6", Source: "Sales delivery SO-2026-00218", Status: "Posted" },
    { "Movement No": "MOV-2026-00878", Type: "Procurement GRN receipt", Product: "Troponin I Reagent Kit", SKU: "DX-TRP-100", From: "Supplier", To: "Cold Store", "Lot/Batch/Serial": "LOT-TI-2604", Quantity: "40", Source: "GRN-2026-00098", Status: "Posted" },
    { "Movement No": "MOV-2026-00876", Type: "Project delivery reserve", Product: "Patient Monitor MX750", SKU: "ME-PM-0750", From: "Main Warehouse", To: "Project Site", "Lot/Batch/Serial": "SN-MX750-88421", Quantity: "2", Source: "Project PSO-2026-0007", Status: "Reserved" }
  ]),
  "inventory.Transfers": view(["Transfer No", "Product", "SKU", "From Warehouse", "From Location", "To Warehouse", "To Location", "Lot/Batch/Serial", "Quantity", "Status"], [
    { "Transfer No": "TRF-2026-00012", Product: "Adult SpO2 Sensor", SKU: "SP-SPO2-A", "From Warehouse": "Main Warehouse", "From Location": "Main Aisle", "To Warehouse": "Service Stock", "To Location": "Engineer Van", "Lot/Batch/Serial": "SP-SPO2-A-ENG", Quantity: "3", Status: "Posted" }
  ]),
  "inventory.Reservations": view(["Reservation No", "Source", "Product", "SKU", "Lot/Batch/Serial", "Quantity", "FEFO Suggested", "Dispatch Blocked", "Status"], [
    { "Reservation No": "RES-2026-00024", Source: "Sales delivery SO-2026-00218", Product: "Troponin I Reagent Kit", SKU: "DX-TRP-100", "Lot/Batch/Serial": "LOT-TI-2604", Quantity: "12", "FEFO Suggested": "Yes", "Dispatch Blocked": "No", Status: "Reserved" },
    { "Reservation No": "RES-2026-00025", Source: "Project delivery PSO-2026-0007", Product: "Patient Monitor MX750", SKU: "ME-PM-0750", "Lot/Batch/Serial": "SN-MX750-88421", Quantity: "2", "FEFO Suggested": "No", "Dispatch Blocked": "No", Status: "Reserved" }
  ]),
  "inventory.Cycle Counts": view(["Count No", "Product", "SKU", "Warehouse", "Location", "System Qty", "Counted Qty", "Variance Qty", "Variance Value", "Approval Status", "Status"], [
    { "Count No": "CC-2026-00092", Product: "Troponin I Reagent Kit", SKU: "DX-TRP-100", Warehouse: "Cold Store", Location: "Cold Room A", "System Qty": "34", "Counted Qty": "28", "Variance Qty": "-6", "Variance Value": "QAR 8,520", "Approval Status": "Pending approval", Status: "Draft" },
    { "Count No": "CC-2026-00093", Product: "Nitrile Examination Gloves Medium", SKU: "CS-NGL-M", Warehouse: "Main Warehouse", Location: "Main Aisle", "System Qty": "1480", "Counted Qty": "1479", "Variance Qty": "-1", "Variance Value": "QAR 19", "Approval Status": "Not required", Status: "Draft" }
  ]),
  "inventory.Expiry Alerts": view(["Alert No", "Product", "SKU", "Lot/Batch/Serial", "Expiry Date", "Days Left", "Alert Level", "Action", "Status"], [
    { "Alert No": "EXP-2026-00090", Product: "Troponin I Reagent Kit", SKU: "DX-TRP-100", "Lot/Batch/Serial": "LOT-TI-2604", "Expiry Date": "2026-09-28", "Days Left": "90", "Alert Level": "90-day", Action: "Prioritize FEFO picking", Status: "Open" },
    { "Alert No": "EXP-2026-00060", Product: "Troponin I Reagent Kit", SKU: "DX-TRP-100", "Lot/Batch/Serial": "LOT-TI-QC", "Expiry Date": "2026-08-30", "Days Left": "60", "Alert Level": "60-day", Action: "QA release or supplier return", Status: "Open" },
    { "Alert No": "EXP-2026-00030", Product: "Glucose Reagent", SKU: "DX-GLU-050", "Lot/Batch/Serial": "LOT-GL-2511", "Expiry Date": "2026-07-30", "Days Left": "30", "Alert Level": "30-day", Action: "Block non-FEFO dispatch", Status: "Urgent" }
  ]),
  "inventory.Quarantine / QC": view(["QC No", "Source", "Product", "SKU", "Lot/Batch/Serial", "Quantity", "QC Status", "Dispatch Blocked", "QA Decision", "Status"], [
    { "QC No": "QC-2026-0044", Source: "Procurement GRN GRN-2026-00098", Product: "Troponin I Reagent Kit", SKU: "DX-TRP-100", "Lot/Batch/Serial": "LOT-TI-QC", Quantity: "8", "QC Status": "Quarantine", "Dispatch Blocked": "Yes", "QA Decision": "Pending", Status: "Pending" }
  ]),
  "inventory.Engineer Stock": view(["Engineer Stock No", "Employee Code", "Engineer", "Product", "SKU", "Lot/Batch/Serial", "Quantity On Hand", "Reserved Quantity", "Status"], [
    { "Engineer Stock No": "ENG-STK-0041", "Employee Code": "MT-0041", Engineer: "Naveen Kumar", Product: "Adult SpO2 Sensor", SKU: "SP-SPO2-A", "Lot/Batch/Serial": "SP-SPO2-A-ENG", "Quantity On Hand": "3", "Reserved Quantity": "1", Status: "Available" }
  ]),
  "inventory.Bundled Kits": view(["Bundle SKU", "Bundle Name", "Component SKUs", "Quantity Required", "Build Quantity", "Work Order No", "Component Availability", "Build Status", "Finished Goods Receipt"], [
    { "Bundle SKU": "KIT-ICU-MON", "Bundle Name": "ICU Monitor Starter Kit", "Component SKUs": "ME-PM-0750,CS-NGL-M", "Quantity Required": "1", "Build Quantity": "1", "Work Order No": "WO-2026-0008", "Component Availability": "Available", "Build Status": "Draft", "Finished Goods Receipt": "" }
  ]),

  "finance.Customer Invoices": view(["Invoice No", "Source Module", "Customer", "Currency", "Lines", "Subtotal", "Tax", "Total", "Due Date", "Status"], [
    { "Invoice No": "INV-DRAFT-2026-00502", "Source Module": "Sales Order", Customer: "Hamad Medical Corporation", Currency: "QAR", Lines: "SO-2026-00218 - Troponin I Reagent Kit", Subtotal: "QAR 286,000", Tax: "QAR 0", Total: "QAR 286,000", "Due Date": "2026-07-20", Status: "Draft" },
    { "Invoice No": "SVC-INV-DRAFT-0048", "Source Module": "Service Closure", Customer: "Hamad Medical Corporation", Currency: "QAR", Lines: "CLS-2026-0048 - 2.5 service hours", Subtotal: "QAR 2,400", Tax: "QAR 0", Total: "QAR 2,400", "Due Date": "2026-07-20", Status: "Draft" },
    { "Invoice No": "AMC-INV-DRAFT-0038", "Source Module": "AMC Cycle", Customer: "Sidra Medicine", Currency: "QAR", Lines: "Quarterly AMC cycle", Subtotal: "QAR 18,000", Tax: "QAR 0", Total: "QAR 18,000", "Due Date": "2026-07-30", Status: "Draft" }
  ]),
  "finance.Vendor Bills": view(["Bill No", "Source Module", "Supplier", "Currency", "Lines", "Subtotal", "Tax", "Total", "Due Date", "Status"], [
    { "Bill No": "BILL-DRAFT-2026-0030", "Source Module": "Procurement GRN", Supplier: "Medline Europe", Currency: "QAR", Lines: "PO-2026-0119 / GRN-2026-0098", Subtotal: "QAR 42,900", Tax: "QAR 0", Total: "QAR 42,900", "Due Date": "2026-07-20", Status: "Draft" }
  ]),
  "finance.Payments": view(["Payment No", "Type", "Party", "Date", "Method", "Amount", "Currency", "Matched To", "Status"], [
    { "Payment No": "REC-2026-00192", Type: "Customer payment", Party: "Sidra Medicine", Date: "2026-06-19", Method: "Local simulator", Amount: "QAR 18,000", Currency: "QAR", "Matched To": "AMC-INV-DRAFT-0038", Status: "Matched" },
    { "Payment No": "PAY-2026-00188", Type: "Vendor payment", Party: "BD Biosciences", Date: "2026-06-18", Method: "Local simulator", Amount: "QAR 186,400", Currency: "QAR", "Matched To": "", Status: "Draft" }
  ]),
  "finance.Credit Notes": view(["Credit Note No", "Linked Invoice/Bill", "Party", "Date", "Amount", "Reason", "Status"], [
    { "Credit Note No": "CN-DRAFT-2026-0022", "Linked Invoice/Bill": "INV-DRAFT-2026-00502", Party: "Hamad Medical Corporation", Date: "2026-06-20", Amount: "QAR 4,200", Reason: "Price correction", Status: "Draft" }
  ]),
  "finance.Debit Notes": view(["Debit Note No", "Linked Invoice/Bill", "Party", "Date", "Amount", "Reason", "Status"], [
    { "Debit Note No": "DN-DRAFT-2026-0017", "Linked Invoice/Bill": "BILL-DRAFT-2026-0030", Party: "Thermo Fisher", Date: "2026-06-20", Amount: "QAR 1,200", Reason: "Freight variance", Status: "Draft" }
  ]),
  "finance.Journals": view(["Journal No", "Source Module", "Date", "Debit Account", "Credit Account", "Amount", "Cost Center", "Notes", "Posting Status", "Status"], [
    { "Journal No": "JRN-DRAFT-2026-0088", "Source Module": "Payroll", Date: "2026-06-30", "Debit Account": "Salary expense", "Credit Account": "Payroll payable", Amount: "QAR 277,600", "Cost Center": "CC-400", Notes: "Payroll journal draft only", "Posting Status": "Not posted - local draft only", Status: "Draft" },
    { "Journal No": "JRN-DRAFT-2026-0089", "Source Module": "Inventory Adjustment", Date: "2026-06-30", "Debit Account": "Inventory variance", "Credit Account": "Inventory", Amount: "QAR 8,520", "Cost Center": "Warehouse", Notes: "Cycle count variance draft only", "Posting Status": "Not posted - local draft only", Status: "Draft" }
  ]),
  "finance.Bank Reconciliation Import": view(["Statement Row", "Date", "Reference", "Description", "Amount", "Matched To", "Exception", "Status"], [
    { "Statement Row": "BNK-ROW-2026-00001", Date: "2026-06-19", Reference: "AMC-INV-DRAFT-0038", Description: "Local statement row simulator", Amount: "QAR 18,000", "Matched To": "AMC-INV-DRAFT-0038", Exception: "", Status: "Matched" },
    { "Statement Row": "BNK-ROW-2026-00002", Date: "2026-06-20", Reference: "UNKNOWN", Description: "Unmatched local bank row", Amount: "QAR 750", "Matched To": "", Exception: "No local amount/reference match", Status: "Exception" }
  ]),
  "finance.Fixed Assets": view(["Asset No", "Asset", "Category", "Acquisition Date", "Cost", "Useful Life Months", "Monthly Depreciation", "Book Value", "Status"], [
    { "Asset No": "FA-2026-0042", Asset: "Service demo equipment", Category: "Service demo equipment", "Acquisition Date": "2026-01-01", Cost: "QAR 120,000", "Useful Life Months": "60", "Monthly Depreciation": "QAR 2,000", "Book Value": "QAR 108,000", Status: "Active" }
  ]),
  "finance.FX Revaluation": view(["Run No", "Currency", "Rate Date", "Old Rate", "New Rate", "Open AR/AP", "Gain / Loss", "Journal Draft", "Status"], [
    { "Run No": "FXR-2026-06", Currency: "USD", "Rate Date": "2026-06-30", "Old Rate": "3.64", "New Rate": "3.65", "Open AR/AP": "USD 480,000", "Gain / Loss": "QAR 4,800 gain", "Journal Draft": "", Status: "Draft" }
  ]),
  "finance.Advance / Progress / Retention Invoices": view(["Invoice No", "Project / Agreement", "Customer", "Invoice Type", "Milestone", "Amount", "Retention %", "Approval Status", "Posting Status", "Status"], [
    { "Invoice No": "PBI-DRAFT-2026-0011", "Project / Agreement": "PSO-2026-0007", Customer: "Private Healthcare Group", "Invoice Type": "Advance Invoice", Milestone: "Contract signing", Amount: "QAR 960,000", "Retention %": "10", "Approval Status": "Pending approval", "Posting Status": "Not posted - local draft only", Status: "Draft" },
    { "Invoice No": "PBI-DRAFT-2026-0012", "Project / Agreement": "Al Wakra Day Surgery Center", Customer: "Private Healthcare Group", "Invoice Type": "Progress Invoice", Milestone: "Equipment delivery", Amount: "QAR 1,200,000", "Retention %": "10", "Approval Status": "Draft", "Posting Status": "Not posted - local draft only", Status: "Draft" }
  ]),
  "finance.Financial Reports": view(["Report", "Period", "Basis", "Metric", "Value", "Status"], [
    { Report: "Balance Sheet", Period: "June 2026", Basis: "Local demo simulation", Metric: "Assets less liabilities", Value: "QAR 261,500", Status: "Ready" },
    { Report: "P&L", Period: "June 2026", Basis: "Local demo simulation", Metric: "Demo operating result", Value: "QAR 263,500", Status: "Ready" },
    { Report: "Cash Flow", Period: "June 2026", Basis: "Local demo simulation", Metric: "Net local payment movement", Value: "QAR -168,400", Status: "Ready" },
    { Report: "Trial Balance", Period: "June 2026", Basis: "Local demo simulation", Metric: "Draft journal movement", Value: "QAR 286,120", Status: "Ready" },
    { Report: "General Ledger", Period: "June 2026", Basis: "Local demo simulation", Metric: "Draft journal count", Value: "2", Status: "Ready" },
    { Report: "Partner Ledger", Period: "June 2026", Basis: "Local demo simulation", Metric: "Customers and suppliers", Value: "4", Status: "Ready" },
    { Report: "Aged Receivables", Period: "June 2026", Basis: "Local demo simulation", Metric: "Open AR", Value: "QAR 306,400", Status: "Ready" },
    { Report: "Aged Payables", Period: "June 2026", Basis: "Local demo simulation", Metric: "Open AP", Value: "QAR 42,900", Status: "Ready" }
  ]),

  "service.Service Requests": view(["Request No", "Source", "Customer", "Contact", "Equipment", "Serial No", "Issue", "Priority", "Emergency Flag", "Contract / AMC Status", "Status"], [
    { "Request No": "SRV-2026-0842", Source: "Phone", Customer: "Hamad Medical Corporation", Contact: "Biomedical desk", Equipment: "CT Injector System", "Serial No": "CTI-98422", Issue: "Injector pressure fault during morning scan list", Priority: "Critical", "Emergency Flag": "Yes", "Contract / AMC Status": "AMC active", Status: "New Request" },
    { "Request No": "SRV-2026-0839", Source: "Email", Customer: "Sidra Medicine", Contact: "ICU equipment desk", Equipment: "Blood Gas Analyzer", "Serial No": "BGA-41288", Issue: "Calibration drift and reagent warning", Priority: "High", "Emergency Flag": "No", "Contract / AMC Status": "AMC active", Status: "Pending spare parts" },
    { "Request No": "SRV-2026-0835", Source: "Manual", Customer: "Aman Hospital", Contact: "Nursing supervisor", Equipment: "Patient Monitor MX750", "Serial No": "SN-MX750-88421", Issue: "Preventive visit requested before ICU expansion", Priority: "Normal", "Emergency Flag": "No", "Contract / AMC Status": "Warranty active", Status: "Visit scheduled" }
  ]),
  "service.Job Pool": view(["Job No", "Request No", "Customer", "Equipment", "Coordinator", "Engineer", "SLA Due", "Status"], [
    { "Job No": "JOB-2026-0142", "Request No": "SRV-2026-0842", Customer: "Hamad Medical Corporation", Equipment: "CT Injector System", Coordinator: "Service Coordinator", Engineer: "Naveen Kumar", "SLA Due": "20 Jun 2026, 14:30", Status: "Assigned" }
  ]),
  "service.Engineer Dispatch": view(["Dispatch No", "Job No", "Engineer", "Accept / Reject", "SLA Started", "Visit Scheduled", "SLA Status", "Status"], [
    { "Dispatch No": "DSP-2026-0066", "Job No": "JOB-2026-0142", Engineer: "Naveen Kumar", "Accept / Reject": "Accepted", "SLA Started": "20 Jun 2026, 09:20", "Visit Scheduled": "20 Jun 2026, 13:00", "SLA Status": "Running", Status: "SLA started" }
  ]),
  "service.Field Service Jobs": view(["Job No", "Request No", "Customer", "Equipment", "Engineer", "SLA Status", "SLA Timer", "Work Performed", "Timesheet", "Worksheet", "Status"], [
    { "Job No": "JOB-2026-0142", "Request No": "SRV-2026-0842", Customer: "Hamad Medical Corporation", Equipment: "CT Injector System", Engineer: "Naveen Kumar", "SLA Status": "Running", "SLA Timer": "02:15", "Work Performed": "Pressure sensor inspected, calibration started", Timesheet: "2.5 hrs", Worksheet: "In progress", Status: "In progress" }
  ]),
  "service.Spare Parts Requests": view(["Spare Request No", "Job No", "Product", "SKU", "Needed Qty", "Engineer Stock", "Warehouse Stock", "Procurement Request", "Status"], [
    { "Spare Request No": "SPR-2026-0074", "Job No": "JOB-2026-0142", Product: "Adult SpO2 Sensor", SKU: "SP-SPO2-A", "Needed Qty": "1", "Engineer Stock": "3", "Warehouse Stock": "0", "Procurement Request": "Not required", Status: "Available - engineer stock" }
  ]),
  "service.AMC Contracts": view(["AMC Contract No", "Customer", "Equipment Covered", "Start Date", "End Date", "Billing Schedule", "Scope Coverage", "Renewal Date", "Renewal Status", "Auto-renewal Suggestion", "Invoice Schedule", "Status"], [
    { "AMC Contract No": "AMC-2026-0038", Customer: "Sidra Medicine", "Equipment Covered": "Blood Gas Analyzer", "Start Date": "2026-01-01", "End Date": "2026-12-31", "Billing Schedule": "Quarterly", "Scope Coverage": "Lab analyzer service, calibration and emergency support", "Renewal Date": "2026-10-01", "Renewal Status": "Not due", "Auto-renewal Suggestion": "Review 90 days before expiry", "Invoice Schedule": "Quarterly", Status: "Active" }
  ]),
  "service.Maintenance Schedules": view(["Asset / Equipment", "Preventive Schedule", "Work Order No", "Due Date", "Engineer", "Status"], [
    { "Asset / Equipment": "Patient Monitor MX750", "Preventive Schedule": "Quarterly PM", "Work Order No": "PM-2026-00441", "Due Date": "2026-06-21", Engineer: "S. Khan", Status: "Due" },
    { "Asset / Equipment": "Blood Gas Analyzer", "Preventive Schedule": "Monthly calibration", "Work Order No": "PM-2026-00438", "Due Date": "2026-06-22", Engineer: "A. Joseph", Status: "Parts required" }
  ]),
  "service.Service Reports": view(["Report No", "Job No", "Engineer", "Customer", "Equipment", "Issue", "Work Performed", "Spare Parts Consumed", "Timesheet", "Customer Signature", "Status"], [
    { "Report No": "SRV-RPT-2026-0142", "Job No": "JOB-2026-0142", Engineer: "Naveen Kumar", Customer: "Hamad Medical Corporation", Equipment: "CT Injector System", Issue: "Injector pressure fault", "Work Performed": "Calibration and pressure test completed", "Spare Parts Consumed": "Adult SpO2 Sensor x 1", Timesheet: "2.5 hrs", "Customer Signature": "Pending", Status: "Draft" }
  ]),
  "service.Customer Sign-Off": view(["Sign-Off No", "Job No", "Customer", "Contact", "Equipment", "Customer Signature", "Work Accepted", "Signed At", "Invoice Draft", "Status"], [
    { "Sign-Off No": "SIGN-2026-0048", "Job No": "JOB-2026-0142", Customer: "Hamad Medical Corporation", Contact: "Biomedical desk", Equipment: "CT Injector System", "Customer Signature": "Pending", "Work Accepted": "Pending", "Signed At": "", "Invoice Draft": "", Status: "Awaiting sign-off" }
  ]),
  "service.Service Invoicing Drafts": view(["Draft No", "Job No", "Customer", "Source", "Amount", "Lines", "Finance Invoice Draft", "Status"], [
    { "Draft No": "SVC-DRAFT-2026-0048", "Job No": "JOB-2026-0142", Customer: "Hamad Medical Corporation", Source: "SIGN-2026-0048", Amount: "QAR 2,400", Lines: "2.5 service hours and spare part consumption", "Finance Invoice Draft": "SVC-INV-DRAFT-0048", Status: "Draft" }
  ]),

  "projects.Project Tasks": view(["Task No", "Project No", "Project", "Task", "Owner", "Due Date", "Priority", "Status"], [
    { "Task No": "PTK-2026-0048", "Project No": "PRJ-2026-0018", Project: "Al Wakra Day Surgery Center", Task: "Validate room layouts", Owner: "K. Varghese", "Due Date": "2026-07-02", Priority: "High", Status: "In progress" },
    { "Task No": "PTK-2026-0049", "Project No": "PRJ-2026-0019", Project: "National Reference Lab Expansion", Task: "Submit electrical load schedule", Owner: "T. George", "Due Date": "2026-06-30", Priority: "Critical", Status: "Blocked" }
  ]),
  "projects.Milestones": view(["Milestone No", "Project", "Description", "Planned Date", "Completion %", "Billing %", "Billing Type", "Invoice Draft Status", "Approval Status", "Status"], [
    { "Milestone No": "PMS-2026-0024", Project: "Al Wakra Day Surgery Center", Description: "Equipment delivery", "Planned Date": "2026-07-05", "Completion %": "82", "Billing %": "50", "Billing Type": "Progress", "Invoice Draft Status": "Not drafted", "Approval Status": "Approved", Status: "On track" },
    { "Milestone No": "PMS-2026-0025", Project: "National Reference Lab Expansion", Description: "Lab commissioning", "Planned Date": "2026-06-28", "Completion %": "44", "Billing %": "20", "Billing Type": "Progress", "Invoice Draft Status": "Not drafted", "Approval Status": "Pending approval", Status: "At risk" },
    { "Milestone No": "PMS-2026-0026", Project: "ICU Modernization - Phase II", Description: "Final handover", "Planned Date": "2026-07-10", "Completion %": "88", "Billing %": "10", "Billing Type": "Retention", "Invoice Draft Status": "Not drafted", "Approval Status": "Draft", Status: "On track" }
  ]),
  "projects.Department Sub-Quotations": view(["Department", "Scope", "Estimated Cost", "Selling Price", "Margin", "Submitted By", "Status"], [
    { Department: "Service", Scope: "Installation, commissioning and user training", "Estimated Cost": "QAR 344,400", "Selling Price": "QAR 420,000", Margin: "QAR 75,600 / 18%", "Submitted By": "Service Manager", Status: "Submitted" },
    { Department: "Engineering", Scope: "Room readiness, utilities and site supervision", "Estimated Cost": "QAR 224,000", "Selling Price": "QAR 280,000", Margin: "QAR 56,000 / 20%", "Submitted By": "Projects", Status: "Approved" }
  ]),
  "projects.Budgets": view(["Budget No", "Project No", "Project", "Contract Value", "Budget", "Actual Cost", "Committed", "Remaining", "Margin", "Status"], [
    { "Budget No": "PBG-2026-0018", "Project No": "PRJ-2026-0018", Project: "Al Wakra Day Surgery Center", "Contract Value": "QAR 4,800,000", Budget: "QAR 3,724,800", "Actual Cost": "QAR 3,100,000", Committed: "QAR 3,400,000", Remaining: "QAR 624,800", Margin: "QAR 1,700,000 / 35.4%", Status: "Within budget" },
    { "Budget No": "PBG-2026-0019", "Project No": "PRJ-2026-0019", Project: "National Reference Lab Expansion", "Contract Value": "QAR 6,200,000", Budget: "QAR 4,812,000", "Actual Cost": "QAR 3,800,000", Committed: "QAR 4,900,000", Remaining: "QAR 1,012,000", Margin: "QAR 2,400,000 / 38.7%", Status: "Watch" }
  ]),
  "projects.Deliverables": view(["Deliverable No", "Project No", "Project", "Product", "SKU", "Quantity", "Inventory Delivery", "Document", "Status"], [
    { "Deliverable No": "PDL-2026-0018", "Project No": "PRJ-2026-0018", Project: "Al Wakra Day Surgery Center", Product: "Patient Monitor MX750", SKU: "ME-PM-0750", Quantity: "2", "Inventory Delivery": "Pending", Document: "", Status: "Ready for delivery" }
  ]),
  "projects.Milestone Billing": view(["Billing", "Milestone No", "Project", "Customer", "Description", "Billing Type", "Billing %", "Amount", "Retention %", "Invoice Draft Status", "Approval Status", "Status"], [
    { Billing: "PMB-2026-0024", "Milestone No": "PMS-2026-0024", Project: "Al Wakra Day Surgery Center", Customer: "Private Healthcare Group", Description: "Equipment delivery", "Billing Type": "Progress", "Billing %": "50", Amount: "QAR 1,200,000", "Retention %": "10", "Invoice Draft Status": "Not drafted", "Approval Status": "Approved", Status: "Ready to bill" }
  ]),
  "projects.Retention Tracking": view(["Retention No", "Project No", "Project", "Customer", "Invoice", "Retention %", "Retention Amount", "Release Date", "Invoice Draft", "Status"], [
    { "Retention No": "RET-2026-0011", "Project No": "PRJ-2026-0018", Project: "Al Wakra Day Surgery Center", Customer: "Private Healthcare Group", Invoice: "PBI-DRAFT-2026-0012", "Retention %": "10", "Retention Amount": "QAR 120,000", "Release Date": "2026-12-30", "Invoice Draft": "", Status: "Tracked" }
  ]),
  "projects.Project Documents": view(["Document No", "Project No", "Project", "Document Type", "Linked Module", "Linked Record", "Generated By", "Status"], [
    { "Document No": "PDOC-2026-0018", "Project No": "PRJ-2026-0018", Project: "Al Wakra Day Surgery Center", "Document Type": "Approved scope of work", "Linked Module": "Documents", "Linked Record": "Generated Documents", "Generated By": "K. Varghese", Status: "Approved" }
  ]),
  "projects.Project Closure": view(["Closure No", "Project No", "Project", "Deliverables", "Documents", "Retention", "Customer Sign-off", "Finance Close", "Lessons Learned", "Status"], [
    { "Closure No": "PCL-2026-0005", "Project No": "PRJ-2026-0014", Project: "ICU Modernization - Phase II", Deliverables: "Complete", Documents: "Pending final pack", Retention: "Tracked", "Customer Sign-off": "Pending", "Finance Close": "Open", "Lessons Learned": "", Status: "In progress" }
  ]),

  "documents.Template List": view(["Template", "Document type", "PDF template", "Status", "Action"], pdfTemplateCatalog.map(item => ({ Template: item.label, "Document type": item.document, "PDF template": item.template, Status: "Active", Action: "Download / Preview" }))),
  "documents.Generated Documents": view(["Document", "Source module", "Source record", "Document number", "Generated by", "Generated at", "Status", "Action"], [
    { Document: "Purchase Order PDF", "Source module": "Procurement", "Source record": "PO-2026-0128", "Document number": "PO-2026-0128", "Generated by": "M. Said", "Generated at": "20 Jun 2026, 10:15", Status: "Generated", Action: "Download / Preview" },
    { Document: "Service Report PDF", "Source module": "Service", "Source record": "JOB-2026-0142", "Document number": "SRV-RPT-2026-0142", "Generated by": "Naveen Kumar", "Generated at": "Not generated", Status: "Draft", Action: "Download / Preview" }
  ]),

  "reports.Executive KPIs": view(["KPI", "Area", "Current", "Target", "Trend", "Owner", "Status"], [
    { KPI: "Revenue by BU vs target", Area: "Sales", Current: "QAR 2.84M", Target: "QAR 2.35M", Trend: "+15.2%", Owner: "Commercial Director", Status: "On track" },
    { KPI: "DSO", Area: "Finance", Current: "47 days", Target: "45 days", Trend: "+2 days", Owner: "Finance Manager", Status: "Watch" },
    { KPI: "SLA compliance", Area: "Service", Current: "96.8%", Target: "95%", Trend: "+1.8%", Owner: "Service Manager", Status: "On track" }
  ]),
  "reports.Integration Simulators": view(["Simulator", "Input", "Output", "Local Demo Only", "External calls", "Status"], [
    { Simulator: "Bank Statement Import", Input: "CSV / Excel", Output: "Reconciliation suggestions", "Local Demo Only": "Yes", "External calls": "No", Status: "Ready" },
    { Simulator: "WhatsApp / Email Lead Intake", Input: "Dummy Excel", Output: "Universal Enquiry Pool rows", "Local Demo Only": "Yes", "External calls": "No", Status: "Ready" },
    { Simulator: "E-Invoicing XML Preview", Input: "Invoice draft", Output: "XML preview text", "Local Demo Only": "Yes", "External calls": "No", Status: "Placeholder" }
  ])
};
