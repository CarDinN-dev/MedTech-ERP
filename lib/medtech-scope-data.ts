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

export const expertLayerViews: Record<string, DemoTabView> = {
  "sales.Account Plans": view(["Plan", "Customer", "Owner", "BU", "FY Target", "White Space", "Next Review", "Status"], [
    { Plan: "ACP-2026-HMC", Customer: "Hamad Medical Corporation", Owner: "F. Al-Kuwari", BU: "Medical Equipment", "FY Target": "QAR 4,800,000", "White Space": "ICU monitoring, CSSD", "Next Review": "2026-07-05", Status: "Active" },
    { Plan: "ACP-2026-SIDRA", Customer: "Sidra Medicine", Owner: "R. Mathew", BU: "Diagnostics", "FY Target": "QAR 2,600,000", "White Space": "Reagent rental, AMC", "Next Review": "2026-07-12", Status: "Review due" }
  ]),
  "sales.Visit Logs": view(["Visit", "Customer", "Contact", "Owner", "Purpose", "Next Action", "Due Date", "Status"], [
    { Visit: "VIS-2026-0148", Customer: "Hamad Medical Corporation", Contact: "Biomedical desk", Owner: "F. Al-Kuwari", Purpose: "Quotation review", "Next Action": "Submit revised validity", "Due Date": "2026-07-02", Status: "Follow-up due" },
    { Visit: "VIS-2026-0141", Customer: "Doha Clinic", Contact: "Lab manager", Owner: "R. Mathew", Purpose: "Consumables forecast", "Next Action": "Send pricelist", "Due Date": "2026-07-06", Status: "Open" }
  ]),
  "sales.Communication History": view(["Communication", "Customer", "Channel", "Contact", "Owner", "Summary", "Linked Record", "Status"], [
    { Communication: "COM-2026-0320", Customer: "Sidra Medicine", Channel: "Phone", Contact: "Procurement", Owner: "R. Mathew", Summary: "Asked for contract pricing confirmation", "Linked Record": "QTN-2026-00311", Status: "Logged" },
    { Communication: "COM-2026-0317", Customer: "Hamad Medical Corporation", Channel: "Email", Contact: "ICU project team", Owner: "F. Al-Kuwari", Summary: "Quote validity extension requested", "Linked Record": "QTN-2026-00314", Status: "Action required" }
  ]),
  "sales.Competitor Tracking": view(["Tracker", "Customer", "Opportunity", "Competitor", "Observed Price", "Threat", "Counter Action", "Status"], [
    { Tracker: "CMP-2026-0061", Customer: "Hamad Medical Corporation", Opportunity: "ICU Monitoring Upgrade", Competitor: "Philips", "Observed Price": "5% lower", Threat: "High", "Counter Action": "Bundle service warranty", Status: "Open" },
    { Tracker: "CMP-2026-0058", Customer: "Aman Hospital", Opportunity: "CSSD Equipment", Competitor: "Steris", "Observed Price": "Unknown", Threat: "Medium", "Counter Action": "Arrange demo", Status: "Monitoring" }
  ]),
  "sales.Lost Reason Taxonomy": view(["Reason Code", "Category", "Description", "Applies To", "Owner", "Corrective Action", "Status"], [
    { "Reason Code": "LOSS-PRICE", Category: "Commercial", Description: "Competitor price below approved floor", "Applies To": "Quotations", Owner: "Sales Operations", "Corrective Action": "Review cost sheet and principal rebate", Status: "Active" },
    { "Reason Code": "LOSS-SPEC", Category: "Technical", Description: "Specification mismatch", "Applies To": "Tenders", Owner: "Product Manager", "Corrective Action": "Pre-bid technical review", Status: "Active" }
  ]),
  "sales.Quote Validity Alerts": view(["Alert", "Quotation", "Customer", "Owner", "Valid Until", "Days Left", "Action", "Status"], [
    { Alert: "QVA-2026-0017", Quotation: "QTN-2026-00314", Customer: "Hamad Medical Corporation", Owner: "F. Al-Kuwari", "Valid Until": "2026-07-04", "Days Left": "3", Action: "Request extension approval", Status: "Urgent" },
    { Alert: "QVA-2026-0014", Quotation: "QTN-2026-00311", Customer: "Sidra Medicine", Owner: "R. Mathew", "Valid Until": "2026-07-12", "Days Left": "11", Action: "Follow up with customer", Status: "Open" }
  ]),
  "sales.Credit Control Warnings": view(["Warning", "Customer", "Credit Limit", "Current Exposure", "Quotation", "Required Action", "Finance Owner", "Status"], [
    { Warning: "CCW-2026-0022", Customer: "Hamad Medical Corporation", "Credit Limit": "QAR 1,000,000", "Current Exposure": "QAR 1,184,500", Quotation: "QTN-2026-00314", "Required Action": "Finance override before submit", "Finance Owner": "Aisha Rahman", Status: "Blocked" },
    { Warning: "CCW-2026-0018", Customer: "Doha Clinic", "Credit Limit": "QAR 250,000", "Current Exposure": "QAR 174,600", Quotation: "QTN-2026-00308", "Required Action": "Warn salesperson", "Finance Owner": "Credit Controller", Status: "Warning" }
  ]),
  "sales.Contract & Pricelist Checks": view(["Check", "Customer", "Quotation", "Contract", "Pricelist", "Mismatch", "Action", "Status"], [
    { Check: "CPC-2026-0044", Customer: "Sidra Medicine", Quotation: "QTN-2026-00311", Contract: "AMC-2026-0038", Pricelist: "SIDRA-DIAG-2026", Mismatch: "Reagent discount missing", Action: "Apply contract pricelist", Status: "Action required" },
    { Check: "CPC-2026-0040", Customer: "Hamad Medical Corporation", Quotation: "QTN-2026-00314", Contract: "HMC-FW-2026", Pricelist: "HMC-EQP-2026", Mismatch: "None", Action: "Proceed", Status: "Passed" }
  ]),
  "sales.Sales Targets": view(["Target Plan", "Salesperson", "BU", "Period", "Target", "Actual", "Gap", "Status"], [
    { "Target Plan": "TGT-2026-Q3-FAK", Salesperson: "F. Al-Kuwari", BU: "Medical Equipment", Period: "Q3 2026", Target: "QAR 2,100,000", Actual: "QAR 1,460,000", Gap: "QAR 640,000", Status: "On track" },
    { "Target Plan": "TGT-2026-Q3-RM", Salesperson: "R. Mathew", BU: "Diagnostics", Period: "Q3 2026", Target: "QAR 1,400,000", Actual: "QAR 720,000", Gap: "QAR 680,000", Status: "Watch" }
  ]),
  "sales.Follow-up Tasks": view(["Task", "Customer", "Owner", "Related Record", "Due Date", "Priority", "Next Step", "Status"], [
    { Task: "FUP-2026-0221", Customer: "Hamad Medical Corporation", Owner: "F. Al-Kuwari", "Related Record": "QTN-2026-00314", "Due Date": "2026-07-02", Priority: "High", "Next Step": "Confirm revised validity", Status: "Overdue" },
    { Task: "FUP-2026-0217", Customer: "Doha Clinic", Owner: "R. Mathew", "Related Record": "VIS-2026-0141", "Due Date": "2026-07-06", Priority: "Normal", "Next Step": "Send consumables forecast", Status: "Open" }
  ]),

  "procurement.Supplier Scorecard": view(["Scorecard", "Supplier", "OTD", "Quality", "Price Index", "Service", "Owner", "Status"], [
    { Scorecard: "SSC-2026-SIE", Supplier: "Siemens Healthineers", OTD: "94%", Quality: "4.8 / 5", "Price Index": "Fair", Service: "Excellent", Owner: "M. Said", Status: "Approved" },
    { Scorecard: "SSC-2026-BD", Supplier: "BD Biosciences", OTD: "89%", Quality: "4.5 / 5", "Price Index": "Watch", Service: "Good", Owner: "O. Nasser", Status: "Watch" }
  ]),
  "procurement.Lead-Time Variance": view(["Variance", "Supplier", "PO", "Promised Days", "Actual Days", "Variance Days", "Root Cause", "Status"], [
    { Variance: "LTV-2026-0032", Supplier: "BD Biosciences", PO: "PO-2026-0126", "Promised Days": "14", "Actual Days": "21", "Variance Days": "+7", "Root Cause": "Cold-chain airline delay", Status: "Late" },
    { Variance: "LTV-2026-0028", Supplier: "Thermo Fisher", PO: "PO-2026-0124", "Promised Days": "10", "Actual Days": "9", "Variance Days": "-1", "Root Cause": "Early dispatch", Status: "Closed" }
  ]),
  "procurement.MOQ & Incoterms": view(["Item", "Supplier", "SKU", "MOQ", "Incoterms", "Current Need", "Decision", "Status"], [
    { Item: "MOQ-2026-0104", Supplier: "Thermo Fisher", SKU: "RG-TRP-100", MOQ: "40 kits", Incoterms: "DAP Doha", "Current Need": "34 kits", Decision: "Buy MOQ and reserve balance", Status: "Approved" },
    { Item: "MOQ-2026-0098", Supplier: "Siemens Healthineers", SKU: "EQ-PM-0750", MOQ: "2 units", Incoterms: "CIP HIA", "Current Need": "1 unit", Decision: "Consolidate with project order", Status: "Buyer review" }
  ]),
  "procurement.Alternate Suppliers": view(["Mapping", "Primary Supplier", "Alternate Supplier", "Product Family", "Qualification", "Price Delta", "Lead Time Delta", "Status"], [
    { Mapping: "ALT-2026-0018", "Primary Supplier": "BD Biosciences", "Alternate Supplier": "Thermo Fisher", "Product Family": "Diagnostics reagents", Qualification: "Approved", "Price Delta": "+3.8%", "Lead Time Delta": "-2 days", Status: "Active" },
    { Mapping: "ALT-2026-0014", "Primary Supplier": "Siemens Healthineers", "Alternate Supplier": "GE Healthcare", "Product Family": "Patient monitors", Qualification: "Technical review", "Price Delta": "TBD", "Lead Time Delta": "TBD", Status: "Pending" }
  ]),
  "procurement.Agreement Expiry": view(["Agreement", "Supplier", "Owner", "Expiry Date", "Days Left", "Renewal Action", "Linked Document", "Status"], [
    { Agreement: "AGR-2026-SIE", Supplier: "Siemens Healthineers", Owner: "Procurement Manager", "Expiry Date": "2026-09-30", "Days Left": "91", "Renewal Action": "Start principal review", "Linked Document": "Siemens Distribution Certificate.pdf", Status: "Open" },
    { Agreement: "AGR-2026-THERMO", Supplier: "Thermo Fisher", Owner: "M. Said", "Expiry Date": "2026-07-28", "Days Left": "27", "Renewal Action": "Legal review", "Linked Document": "Thermo Fisher Quality Agreement.pdf", Status: "Urgent" }
  ]),
  "procurement.Landed Cost Comparison": view(["Comparison", "RFQ", "Supplier", "Quoted Cost", "Freight", "Duty", "Landed Cost", "Status"], [
    { Comparison: "LCC-2026-0048", RFQ: "RFQ-2026-00148", Supplier: "Thermo Fisher", "Quoted Cost": "QAR 94,750", Freight: "QAR 4,200", Duty: "QAR 0", "Landed Cost": "QAR 98,950", Status: "Best landed" },
    { Comparison: "LCC-2026-0049", RFQ: "RFQ-2026-00148", Supplier: "BD Biosciences", "Quoted Cost": "QAR 91,400", Freight: "QAR 9,600", Duty: "QAR 0", "Landed Cost": "QAR 101,000", Status: "Higher freight" }
  ]),
  "procurement.Savings Tracker": view(["Saving", "Supplier", "Buyer", "Baseline", "Final", "Savings", "Method", "Status"], [
    { Saving: "SAV-2026-0038", Supplier: "Thermo Fisher", Buyer: "M. Said", Baseline: "QAR 102,000", Final: "QAR 94,750", Savings: "QAR 7,250", Method: "Negotiated discount", Status: "Validated" },
    { Saving: "SAV-2026-0031", Supplier: "Siemens Healthineers", Buyer: "O. Nasser", Baseline: "QAR 642,000", Final: "QAR 624,000", Savings: "QAR 18,000", Method: "Bundle freight", Status: "Pending finance" }
  ]),
  "procurement.Delayed PO Alerts": view(["Alert", "PO", "Supplier", "ETA", "Days Late", "Impacted Module", "Action", "Status"], [
    { Alert: "DPO-2026-0019", PO: "PO-2026-0126", Supplier: "BD Biosciences", ETA: "2026-06-30", "Days Late": "1", "Impacted Module": "Inventory", Action: "Escalate supplier and update sales", Status: "Late" },
    { Alert: "DPO-2026-0016", PO: "PO-2026-0119", Supplier: "Medline Europe", ETA: "2026-06-20", "Days Late": "0", "Impacted Module": "Warehouse", Action: "Await QC release", Status: "Monitoring" }
  ]),
  "procurement.Supplier Performance Dashboard": view(["Metric", "Supplier", "Period", "Value", "Target", "Trend", "Owner", "Status"], [
    { Metric: "On-time delivery", Supplier: "Siemens Healthineers", Period: "Q2 2026", Value: "94%", Target: "92%", Trend: "+2%", Owner: "Procurement Manager", Status: "On track" },
    { Metric: "Quality incidents", Supplier: "BD Biosciences", Period: "Q2 2026", Value: "3", Target: "<=2", Trend: "+1", Owner: "Quality Manager", Status: "Watch" }
  ]),

  "inventory.Putaway Workflow": view(["Putaway", "GRN", "Product", "Suggested Location", "Assigned To", "Temperature Check", "Target Time", "Status"], [
    { Putaway: "PUT-2026-0098", GRN: "GRN-2026-0098", Product: "Nitrile Examination Gloves", "Suggested Location": "MW-A-04", "Assigned To": "Warehouse Team", "Temperature Check": "Not required", "Target Time": "4 hrs", Status: "In progress" },
    { Putaway: "PUT-2026-0094", GRN: "GRN-2026-0094", Product: "Troponin I Reagent Kit", "Suggested Location": "Cold Store CS-02", "Assigned To": "Omar Nasser", "Temperature Check": "Pass", "Target Time": "2 hrs", Status: "QC hold" }
  ]),
  "inventory.Pick Pack Dispatch": view(["Wave", "Sales Order", "Customer", "Picker", "Packer", "FEFO Lot", "Dispatch Handoff", "Status"], [
    { Wave: "WAV-2026-0042", "Sales Order": "SO-2026-00218", Customer: "Doha Clinic", Picker: "Warehouse Team", Packer: "Shipping Team", "FEFO Lot": "LOT-TI-2604", "Dispatch Handoff": "DN-2026-00281", Status: "Ready to dispatch" },
    { Wave: "WAV-2026-0039", "Sales Order": "SO-2026-00214", Customer: "Al Ahli Hospital", Picker: "Warehouse Team", Packer: "Shipping Team", "FEFO Lot": "SN-MX750-88421", "Dispatch Handoff": "Partial", Status: "Backorder" }
  ]),
  "inventory.ABC Classification": view(["SKU", "Product", "Annual Value", "ABC Class", "Count Frequency", "Owner", "Last Review", "Status"], [
    { SKU: "EQ-PM-0750", Product: "Patient Monitor MX750", "Annual Value": "QAR 4,200,000", "ABC Class": "A", "Count Frequency": "Monthly", Owner: "Warehouse Manager", "Last Review": "2026-06-20", Status: "Active" },
    { SKU: "CS-NGL-M", Product: "Nitrile Examination Gloves", "Annual Value": "QAR 180,000", "ABC Class": "C", "Count Frequency": "Quarterly", Owner: "Warehouse Team", "Last Review": "2026-06-15", Status: "Active" }
  ]),
  "inventory.ABC Cycle Count Schedule": view(["Schedule", "ABC Class", "Location", "Due Date", "Assigned To", "SKU Count", "Variance Limit", "Status"], [
    { Schedule: "CYC-A-2026-07", "ABC Class": "A", Location: "Main Warehouse", "Due Date": "2026-07-05", "Assigned To": "Omar Nasser", "SKU Count": "28", "Variance Limit": "0.5%", Status: "Scheduled" },
    { Schedule: "CYC-C-2026-Q3", "ABC Class": "C", Location: "Consumables", "Due Date": "2026-07-31", "Assigned To": "Warehouse Team", "SKU Count": "210", "Variance Limit": "2%", Status: "Open" }
  ]),
  "inventory.Stock Aging": view(["Aging", "SKU", "Product", "Location", "Age Bucket", "Quantity", "Value", "Status"], [
    { Aging: "AGE-2026-0018", SKU: "SP-SPO2-A", Product: "Adult SpO2 Sensor", Location: "Main Warehouse", "Age Bucket": "180+ days", Quantity: "7", Value: "QAR 9,450", Status: "Slow moving" },
    { Aging: "AGE-2026-0014", SKU: "RG-TRP-100", Product: "Troponin I Reagent Kit", Location: "Cold Store", "Age Bucket": "0-90 days", Quantity: "34", Value: "QAR 43,520", Status: "Healthy" }
  ]),
  "inventory.Expired Stock Handling": view(["Case", "SKU", "Lot", "Expiry Date", "Quantity", "Action", "QA Owner", "Status"], [
    { Case: "EXP-HND-2026-0012", SKU: "RG-GLU-050", Lot: "LOT-GL-2511", "Expiry Date": "2026-08-09", Quantity: "12", Action: "Block dispatch and notify sales", "QA Owner": "Quality Team", Status: "Near expiry" },
    { Case: "EXP-HND-2026-0009", SKU: "CS-NGL-M", Lot: "LOT-NG-0125", "Expiry Date": "2026-05-31", Quantity: "18", Action: "Scrap approval", "QA Owner": "Quality Manager", Status: "Expired" }
  ]),
  "inventory.Quarantine Release": view(["Release", "QC No", "Product", "Lot", "Decision", "Released By", "Release Date", "Status"], [
    { Release: "QREL-2026-0024", "QC No": "QC-2026-0048", Product: "Troponin I Reagent Kit", Lot: "LOT-TI-2604", Decision: "Release to cold store", "Released By": "Quality Manager", "Release Date": "2026-06-21", Status: "Released" },
    { Release: "QREL-2026-0021", "QC No": "QC-2026-0042", Product: "Nitrile Gloves", Lot: "LOT-NG-0626", Decision: "Hold for supplier CoA", "Released By": "Quality Team", "Release Date": "", Status: "On hold" }
  ]),
  "inventory.Cold Chain Warnings": view(["Warning", "SKU", "Lot", "Location", "Temperature", "Limit", "Duration", "Status"], [
    { Warning: "CC-2026-0031", SKU: "RG-TRP-100", Lot: "LOT-TI-2604", Location: "Cold Store CS-02", Temperature: "7.8 C", Limit: "2-8 C", Duration: "18 min", Status: "Within limit" },
    { Warning: "CC-2026-0028", SKU: "RG-GLU-050", Lot: "LOT-GL-2511", Location: "Cold Store CS-01", Temperature: "9.4 C", Limit: "2-8 C", Duration: "42 min", Status: "Escalated" }
  ]),
  "inventory.Recall Traceability": view(["Trace", "Recall", "SKU", "Lot", "Customer / Location", "Quantity", "Action", "Status"], [
    { Trace: "TRACE-2026-0007A", Recall: "REC-2026-00007", SKU: "RG-TRP-100", Lot: "LOT-TI-2604", "Customer / Location": "Sidra Medicine", Quantity: "4", Action: "Customer notification", Status: "Open" },
    { Trace: "TRACE-2026-0007B", Recall: "REC-2026-00007", SKU: "RG-TRP-100", Lot: "LOT-TI-2604", "Customer / Location": "Cold Store", Quantity: "30", Action: "Inventory block", Status: "Blocked" }
  ]),
  "inventory.Warehouse Productivity": view(["Metric", "Area", "Period", "Value", "Target", "Owner", "Action", "Status"], [
    { Metric: "Putaway cycle time", Area: "Receiving", Period: "June 2026", Value: "3.2 hrs", Target: "<4 hrs", Owner: "Warehouse Manager", Action: "Maintain", Status: "On track" },
    { Metric: "Pick accuracy", Area: "Dispatch", Period: "June 2026", Value: "98.6%", Target: "99%", Owner: "Warehouse Manager", Action: "Review backorder picks", Status: "Watch" }
  ]),

  "finance.Budget Control": view(["Control", "Department", "Budget", "Committed", "Actual", "Available", "Threshold", "Status"], [
    { Control: "BUD-CTRL-2026-SRV", Department: "Service", Budget: "QAR 920,000", Committed: "QAR 218,000", Actual: "QAR 612,000", Available: "QAR 90,000", Threshold: "90%", Status: "Warning" },
    { Control: "BUD-CTRL-2026-SAL", Department: "Sales", Budget: "QAR 1,200,000", Committed: "QAR 240,000", Actual: "QAR 710,000", Available: "QAR 250,000", Threshold: "90%", Status: "Open" }
  ]),
  "finance.Budget vs Actual": view(["Report", "BU", "Period", "Budget", "Actual", "Variance", "Owner", "Status"], [
    { Report: "BVA-2026-06-DIAG", BU: "Diagnostics", Period: "June 2026", Budget: "QAR 680,000", Actual: "QAR 724,000", Variance: "+QAR 44,000", Owner: "Finance Manager", Status: "Over budget" },
    { Report: "BVA-2026-06-EQP", BU: "Medical Equipment", Period: "June 2026", Budget: "QAR 940,000", Actual: "QAR 812,000", Variance: "-QAR 128,000", Owner: "Finance Manager", Status: "Within budget" }
  ]),
  "finance.Closing Checklist": view(["Checklist", "Period", "Task", "Owner", "Due Date", "Evidence", "Status"], [
    { Checklist: "CLOSE-2026-06-01", Period: "June 2026", Task: "AR subledger tie-out", Owner: "Aisha Rahman", "Due Date": "2026-07-02", Evidence: "Draft report", Status: "In progress" },
    { Checklist: "CLOSE-2026-06-02", Period: "June 2026", Task: "Inventory valuation review", Owner: "Finance Manager", "Due Date": "2026-07-03", Evidence: "Pending warehouse sign-off", Status: "Open" }
  ]),
  "finance.Period Close Lock": view(["Period", "Module", "Lock Date", "Locked By", "Open Exceptions", "Reopen Reason", "Status"], [
    { Period: "May 2026", Module: "Finance", "Lock Date": "2026-06-05", "Locked By": "Finance Manager", "Open Exceptions": "0", "Reopen Reason": "", Status: "Locked" },
    { Period: "June 2026", Module: "Inventory", "Lock Date": "2026-07-05", "Locked By": "", "Open Exceptions": "3", "Reopen Reason": "", Status: "Open" }
  ]),
  "finance.AR Collection Tracker": view(["Action", "Customer", "Invoice", "Amount", "Age", "Owner", "Next Step", "Status"], [
    { Action: "AR-ACT-2026-0084", Customer: "Hamad Medical Corporation", Invoice: "INV-2026-00481", Amount: "QAR 184,500", Age: "44 days", Owner: "Credit Controller", "Next Step": "Call procurement", Status: "Due today" },
    { Action: "AR-ACT-2026-0078", Customer: "The View Hospital", Invoice: "INV-2026-00472", Amount: "QAR 138,900", Age: "61 days", Owner: "Finance Manager", "Next Step": "Escalate hold", Status: "Overdue" }
  ]),
  "finance.AP Payment Planning": view(["Plan", "Supplier", "Bill", "Due Date", "Amount", "Priority", "Cash Impact", "Status"], [
    { Plan: "APP-2026-0062", Supplier: "Siemens Healthineers", Bill: "BILL-2026-00341", "Due Date": "2026-07-18", Amount: "QAR 624,000", Priority: "High", "Cash Impact": "Forecasted", Status: "Planned" },
    { Plan: "APP-2026-0059", Supplier: "Thermo Fisher", Bill: "BILL-2026-00338", "Due Date": "2026-07-15", Amount: "QAR 94,750", Priority: "Normal", "Cash Impact": "Within forecast", Status: "Open" }
  ]),
  "finance.Credit Control Alerts": view(["Alert", "Customer", "Exposure", "Limit", "Blocked Document", "Action", "Owner", "Status"], [
    { Alert: "FCR-2026-0033", Customer: "Hamad Medical Corporation", Exposure: "QAR 1,184,500", Limit: "QAR 1,000,000", "Blocked Document": "QTN-2026-00314", Action: "Management override", Owner: "Finance Manager", Status: "Blocked" },
    { Alert: "FCR-2026-0030", Customer: "Doha Clinic", Exposure: "QAR 174,600", Limit: "QAR 250,000", "Blocked Document": "", Action: "Monitor", Owner: "Credit Controller", Status: "Warning" }
  ]),
  "finance.Cash Forecast": view(["Forecast", "Week", "Opening Cash", "Inflows", "Outflows", "Closing Cash", "Risk", "Status"], [
    { Forecast: "CF-2026-W27", Week: "2026-07-05", "Opening Cash": "QAR 2,860,000", Inflows: "QAR 420,000", Outflows: "QAR 718,750", "Closing Cash": "QAR 2,561,250", Risk: "Supplier payment peak", Status: "Watch" },
    { Forecast: "CF-2026-W28", Week: "2026-07-12", "Opening Cash": "QAR 2,561,250", Inflows: "QAR 680,000", Outflows: "QAR 240,000", "Closing Cash": "QAR 3,001,250", Risk: "None", Status: "Healthy" }
  ]),
  "finance.VAT Validation": view(["Validation", "Document", "Party", "Taxable Amount", "VAT", "Rule", "Finding", "Status"], [
    { Validation: "VAT-2026-0124", Document: "INV-2026-00481", Party: "Hamad Medical Corporation", "Taxable Amount": "QAR 184,500", VAT: "QAR 0", Rule: "Qatar local VAT placeholder", Finding: "No VAT expected", Status: "Passed" },
    { Validation: "VAT-2026-0119", Document: "BILL-2026-00338", Party: "Thermo Fisher", "Taxable Amount": "QAR 94,750", VAT: "QAR 0", Rule: "Import duty check", Finding: "Attach customs packet", Status: "Action required" }
  ]),
  "finance.Journal Review Checklist": view(["Review", "Journal", "Period", "Debit", "Credit", "Reviewer", "Checklist", "Status"], [
    { Review: "JRC-2026-0048", Journal: "JRN-2026-0092", Period: "June 2026", Debit: "QAR 184,500", Credit: "QAR 184,500", Reviewer: "Finance Manager", Checklist: "Balanced, source attached", Status: "Ready" },
    { Review: "JRC-2026-0044", Journal: "PAY-JRN-2026-001", Period: "June 2026", Debit: "QAR 1,284,600", Credit: "QAR 1,284,600", Reviewer: "Aisha Rahman", Checklist: "Payroll variance pending", Status: "Review" }
  ]),

  "service.Engineer Skill Matrix": view(["Engineer", "Skill", "Level", "Certified Until", "Product Family", "Backup Engineer", "Training Need", "Status"], [
    { Engineer: "Naveen Kumar", Skill: "Patient monitoring", Level: "Expert", "Certified Until": "2027-03-31", "Product Family": "MX series", "Backup Engineer": "S. Khan", "Training Need": "None", Status: "Certified" },
    { Engineer: "A. Joseph", Skill: "Blood gas analyzers", Level: "Advanced", "Certified Until": "2026-08-15", "Product Family": "Diagnostics", "Backup Engineer": "Naveen Kumar", "Training Need": "Renewal", Status: "Expiring soon" }
  ]),
  "service.Repeat Failure Tracking": view(["Case", "Customer", "Equipment", "Serial", "Failures", "Last Failure", "Root Cause", "Status"], [
    { Case: "RFT-2026-0018", Customer: "Sidra Medicine", Equipment: "Blood Gas Analyzer", Serial: "BGA-41288", Failures: "3 in 90 days", "Last Failure": "2026-06-18", "Root Cause": "Reagent line clogging", Status: "Engineering review" },
    { Case: "RFT-2026-0014", Customer: "Hamad Medical Corporation", Equipment: "CT Injector System", Serial: "CTI-98422", Failures: "2 in 90 days", "Last Failure": "2026-06-20", "Root Cause": "Pressure sensor drift", Status: "Open" }
  ]),
  "service.SLA Breach Reasons": view(["Breach", "Job", "Customer", "SLA Due", "Closed At", "Reason", "Corrective Action", "Status"], [
    { Breach: "SLA-BR-2026-0008", Job: "JOB-2026-0139", Customer: "Aman Hospital", "SLA Due": "2026-06-18 12:00", "Closed At": "2026-06-18 16:40", Reason: "Spare unavailable", "Corrective Action": "Min stock update", Status: "Closed" },
    { Breach: "SLA-BR-2026-0007", Job: "JOB-2026-0142", Customer: "Hamad Medical Corporation", "SLA Due": "2026-06-20 14:30", "Closed At": "", Reason: "Customer access delayed", "Corrective Action": "Reschedule window", Status: "At risk" }
  ]),
  "service.Warranty Claims": view(["Claim", "Customer", "Equipment", "Supplier", "Part", "Claim Value", "Submitted", "Status"], [
    { Claim: "WAR-CLM-2026-0024", Customer: "Doha Clinic", Equipment: "Centrifuge X4", Supplier: "Eppendorf", Part: "Rotor assembly", "Claim Value": "QAR 4,800", Submitted: "2026-06-19", Status: "Submitted" },
    { Claim: "WAR-CLM-2026-0021", Customer: "Hamad Medical Corporation", Equipment: "CT Injector System", Supplier: "Siemens Healthineers", Part: "Pressure sensor", "Claim Value": "QAR 6,200", Submitted: "", Status: "Draft" }
  ]),
  "service.Service Profitability": view(["Record", "Customer", "Contract / Job", "Revenue", "Labor Cost", "Parts Cost", "Margin", "Status"], [
    { Record: "SPF-2026-0038", Customer: "Sidra Medicine", "Contract / Job": "AMC-2026-0038", Revenue: "QAR 96,000", "Labor Cost": "QAR 28,000", "Parts Cost": "QAR 12,400", Margin: "57.9%", Status: "Profitable" },
    { Record: "SPF-2026-0034", Customer: "Hamad Medical Corporation", "Contract / Job": "JOB-2026-0142", Revenue: "QAR 2,400", "Labor Cost": "QAR 1,100", "Parts Cost": "QAR 1,350", Margin: "-2.1%", Status: "Watch" }
  ]),
  "service.Spare Parts Consumption": view(["Consumption", "Job", "Engineer", "SKU", "Quantity", "Source", "Cost", "Status"], [
    { Consumption: "SPC-2026-0064", Job: "JOB-2026-0142", Engineer: "Naveen Kumar", SKU: "SP-SPO2-A", Quantity: "1", Source: "Engineer stock", Cost: "QAR 1,350", Status: "Consumed" },
    { Consumption: "SPC-2026-0060", Job: "JOB-2026-0139", Engineer: "A. Joseph", SKU: "RG-GLU-050", Quantity: "2", Source: "Warehouse", Cost: "QAR 620", Status: "Posted" }
  ]),
  "service.Equipment History": view(["Asset", "Customer", "Equipment", "Serial", "Install Date", "Jobs", "PM Compliance", "Status"], [
    { Asset: "AST-00842", Customer: "Hamad Medical Corporation", Equipment: "CT Injector System", Serial: "CTI-98422", "Install Date": "2025-02-12", Jobs: "11", "PM Compliance": "94%", Status: "In service" },
    { Asset: "AST-00791", Customer: "Sidra Medicine", Equipment: "Blood Gas Analyzer", Serial: "BGA-41288", "Install Date": "2024-11-08", Jobs: "18", "PM Compliance": "88%", Status: "Watch" }
  ]),
  "service.PM Compliance": view(["Schedule", "Customer", "Equipment", "Due", "Completed", "Compliance", "Engineer", "Status"], [
    { Schedule: "PM-2026-00441", Customer: "Aman Hospital", Equipment: "Patient Monitor MX750", Due: "2026-06-21", Completed: "", Compliance: "Due", Engineer: "S. Khan", Status: "Scheduled" },
    { Schedule: "PM-2026-00430", Customer: "Hamad Medical Corporation", Equipment: "CT Injector System", Due: "2026-06-18", Completed: "2026-06-18", Compliance: "On time", Engineer: "Naveen Kumar", Status: "Completed" }
  ]),
  "service.Engineer Productivity": view(["Engineer", "Period", "Jobs Closed", "First-Time Fix", "Utilization", "SLA Score", "Open Jobs", "Status"], [
    { Engineer: "Naveen Kumar", Period: "June 2026", "Jobs Closed": "28", "First-Time Fix": "86%", Utilization: "78%", "SLA Score": "98.2%", "Open Jobs": "6", Status: "On track" },
    { Engineer: "A. Joseph", Period: "June 2026", "Jobs Closed": "24", "First-Time Fix": "79%", Utilization: "82%", "SLA Score": "96.4%", "Open Jobs": "8", Status: "Watch" }
  ]),
  "service.Customer Satisfaction": view(["Survey", "Customer", "Job", "Score", "Comment", "Owner", "Follow-up", "Status"], [
    { Survey: "CSAT-2026-0028", Customer: "Hamad Medical Corporation", Job: "JOB-2026-0142", Score: "4 / 5", Comment: "Fast response, awaiting final report", Owner: "Service Manager", "Follow-up": "Send report", Status: "Open" },
    { Survey: "CSAT-2026-0024", Customer: "Sidra Medicine", Job: "JOB-2026-0138", Score: "5 / 5", Comment: "PM completed smoothly", Owner: "Service Coordinator", "Follow-up": "None", Status: "Closed" }
  ]),

  "projects.WBS": view(["WBS", "Project", "Level", "Work Package", "Owner", "Budget", "Progress", "Status"], [
    { WBS: "WBS-PRJ-0019-1.1", Project: "National Reference Lab Expansion", Level: "1.1", "Work Package": "Lab readiness", Owner: "T. George", Budget: "QAR 1,200,000", Progress: "44%", Status: "At risk" },
    { WBS: "WBS-PRJ-0018-2.1", Project: "Al Wakra Day Surgery Center", Level: "2.1", "Work Package": "Equipment delivery", Owner: "K. Varghese", Budget: "QAR 820,000", Progress: "82%", Status: "On track" }
  ]),
  "projects.Risk Log": view(["Risk", "Project", "Category", "Impact", "Probability", "Mitigation", "Owner", "Status"], [
    { Risk: "RSK-2026-0019", Project: "National Reference Lab Expansion", Category: "Schedule", Impact: "High", Probability: "Medium", Mitigation: "Weekly client sign-off", Owner: "S. Rahman", Status: "Open" },
    { Risk: "RSK-2026-0014", Project: "ICU Modernization - Phase II", Category: "Budget", Impact: "Medium", Probability: "High", Mitigation: "Freeze variation scope", Owner: "K. Varghese", Status: "Watch" }
  ]),
  "projects.Issue Log": view(["Issue", "Project", "Raised By", "Priority", "Due Date", "Resolution", "Owner", "Status"], [
    { Issue: "ISS-2026-0048", Project: "National Reference Lab Expansion", "Raised By": "Client PMO", Priority: "High", "Due Date": "2026-07-03", Resolution: "Submit revised electrical load schedule", Owner: "T. George", Status: "Open" },
    { Issue: "ISS-2026-0044", Project: "Al Wakra Day Surgery Center", "Raised By": "Site engineer", Priority: "Normal", "Due Date": "2026-07-06", Resolution: "Confirm ceiling clearance", Owner: "K. Varghese", Status: "In progress" }
  ]),
  "projects.Change Orders": view(["Change Order", "Project", "Customer", "Value", "Reason", "Approval", "Invoice Impact", "Status"], [
    { "Change Order": "CO-2026-0018", Project: "National Reference Lab Expansion", Customer: "Ministry of Public Health", Value: "QAR 420,000", Reason: "Additional cold room", Approval: "Client review", "Invoice Impact": "Progress invoice", Status: "Submitted" },
    { "Change Order": "CO-2026-0014", Project: "ICU Modernization - Phase II", Customer: "Hamad Medical Corporation", Value: "QAR 86,000", Reason: "Monitor arm change", Approval: "Approved", "Invoice Impact": "Next milestone", Status: "Approved" }
  ]),
  "projects.Budget vs Actual": view(["Project", "Budget", "Actual", "Committed", "Variance", "Margin", "Owner", "Status"], [
    { Project: "National Reference Lab Expansion", Budget: "QAR 4,812,000", Actual: "QAR 3,800,000", Committed: "QAR 4,900,000", Variance: "-QAR 88,000", Margin: "38.7%", Owner: "S. Rahman", Status: "Watch" },
    { Project: "Al Wakra Day Surgery Center", Budget: "QAR 3,724,800", Actual: "QAR 3,100,000", Committed: "QAR 3,400,000", Variance: "QAR 324,800", Margin: "35.4%", Owner: "K. Varghese", Status: "On track" }
  ]),
  "projects.Milestone Sign-Off": view(["Sign-Off", "Project", "Milestone", "Customer Contact", "Submitted", "Signed", "Invoice Trigger", "Status"], [
    { "Sign-Off": "MSO-2026-0025", Project: "National Reference Lab Expansion", Milestone: "Lab commissioning", "Customer Contact": "Client PMO", Submitted: "2026-06-28", Signed: "", "Invoice Trigger": "20%", Status: "Pending" },
    { "Sign-Off": "MSO-2026-0024", Project: "Al Wakra Day Surgery Center", Milestone: "Equipment delivery", "Customer Contact": "Operations director", Submitted: "2026-07-05", Signed: "", "Invoice Trigger": "50%", Status: "Draft" }
  ]),
  "projects.Retention Tracker": view(["Retention", "Project", "Invoice", "Amount", "Release Date", "Condition", "Owner", "Status"], [
    { Retention: "RET-2026-0011", Project: "Al Wakra Day Surgery Center", Invoice: "PBI-DRAFT-2026-0012", Amount: "QAR 120,000", "Release Date": "2026-12-30", Condition: "Final acceptance", Owner: "Finance", Status: "Tracked" },
    { Retention: "RET-2026-0009", Project: "ICU Modernization - Phase II", Invoice: "INV-2026-00388", Amount: "QAR 86,000", "Release Date": "2026-08-15", Condition: "Warranty letter", Owner: "Projects", Status: "Due soon" }
  ]),
  "projects.Invoice Tracker": view(["Invoice Plan", "Project", "Type", "Milestone", "Amount", "Draft Invoice", "Finance Status", "Status"], [
    { "Invoice Plan": "PINV-2026-0044", Project: "National Reference Lab Expansion", Type: "Progress", Milestone: "Lab commissioning", Amount: "QAR 1,240,000", "Draft Invoice": "", "Finance Status": "Not drafted", Status: "Pending sign-off" },
    { "Invoice Plan": "PINV-2026-0040", Project: "Al Wakra Day Surgery Center", Type: "Advance", Milestone: "Mobilization", Amount: "QAR 960,000", "Draft Invoice": "INV-DRAFT-2026-0040", "Finance Status": "Drafted", Status: "Ready" }
  ]),
  "projects.Closure Checklist": view(["Checklist", "Project", "Deliverables", "Documents", "Finance", "Lessons Learned", "Owner", "Status"], [
    { Checklist: "PCL-2026-0014", Project: "ICU Modernization - Phase II", Deliverables: "Complete", Documents: "Pending final pack", Finance: "Retention open", "Lessons Learned": "Drafted", Owner: "K. Varghese", Status: "In progress" },
    { Checklist: "PCL-2026-0010", Project: "Dental Center Fit-out", Deliverables: "Complete", Documents: "Complete", Finance: "Closed", "Lessons Learned": "Approved", Owner: "T. George", Status: "Closed" }
  ]),
  "projects.Profitability Dashboard": view(["Metric", "Project", "Contract Value", "Actual Cost", "Committed", "Forecast Margin", "Owner", "Status"], [
    { Metric: "Forecast margin", Project: "National Reference Lab Expansion", "Contract Value": "QAR 6,200,000", "Actual Cost": "QAR 3,800,000", Committed: "QAR 4,900,000", "Forecast Margin": "21.0%", Owner: "S. Rahman", Status: "Watch" },
    { Metric: "Forecast margin", Project: "Al Wakra Day Surgery Center", "Contract Value": "QAR 4,800,000", "Actual Cost": "QAR 3,100,000", Committed: "QAR 3,400,000", "Forecast Margin": "29.2%", Owner: "K. Varghese", Status: "Healthy" }
  ]),

  "shipping.Delivery Planning": view(["Plan", "Customer", "Sales Order", "Delivery Date", "Route", "Vehicle", "Cold Chain", "Status"], [
    { Plan: "DPL-2026-0084", Customer: "Hamad Medical Corporation", "Sales Order": "SO-2026-00218", "Delivery Date": "2026-07-02", Route: "Doha North", Vehicle: "MT Fleet 02", "Cold Chain": "No", Status: "Planned" },
    { Plan: "DPL-2026-0081", Customer: "Sidra Medicine", "Sales Order": "SO-2026-00211", "Delivery Date": "2026-07-03", Route: "Education City", Vehicle: "Cold van 01", "Cold Chain": "Yes", Status: "Cold-chain check" }
  ]),
  "shipping.Warehouse Handoff": view(["Handoff", "Pick Wave", "Sales Order", "Packages", "Warehouse Status", "Shipping Owner", "Received At", "Status"], [
    { Handoff: "WHO-2026-0042", "Pick Wave": "WAV-2026-0042", "Sales Order": "SO-2026-00218", Packages: "12", "Warehouse Status": "Picked", "Shipping Owner": "Dispatch Team", "Received At": "2026-07-01 10:30", Status: "Received" },
    { Handoff: "WHO-2026-0039", "Pick Wave": "WAV-2026-0039", "Sales Order": "SO-2026-00214", Packages: "4", "Warehouse Status": "Partial", "Shipping Owner": "Dispatch Team", "Received At": "", Status: "Pending" }
  ]),
  "shipping.Backorder Tracking": view(["Backorder", "Sales Order", "Customer", "SKU", "Short Qty", "Expected Receipt", "Customer Update", "Status"], [
    { Backorder: "BO-2026-0018", "Sales Order": "SO-2026-00214", Customer: "Al Ahli Hospital", SKU: "EQ-PM-0750", "Short Qty": "1", "Expected Receipt": "2026-07-14", "Customer Update": "Notified", Status: "Open" },
    { Backorder: "BO-2026-0014", "Sales Order": "SO-2026-00209", Customer: "Aman Hospital", SKU: "SP-SPO2-A", "Short Qty": "2", "Expected Receipt": "2026-07-08", "Customer Update": "Pending", Status: "Action required" }
  ]),
  "shipping.Delivery Exception Log": view(["Exception", "Delivery", "Customer", "Reason", "Logged At", "Owner", "Corrective Action", "Status"], [
    { Exception: "DEX-2026-0024", Delivery: "DN-2026-00281", Customer: "Hamad Medical Corporation", Reason: "Security gate hold", "Logged At": "2026-07-01 12:15", Owner: "Dispatch Team", "Corrective Action": "Update vehicle pass", Status: "Open" },
    { Exception: "DEX-2026-0021", Delivery: "DN-2026-00278", Customer: "Sidra Medicine", Reason: "Customer requested partial receipt", "Logged At": "2026-06-29 15:00", Owner: "Shipping Lead", "Corrective Action": "Create backorder", Status: "Closed" }
  ]),
  "shipping.Customs Packet": view(["Packet", "Shipment", "Supplier", "Documents", "Broker", "ETA", "Exception", "Status"], [
    { Packet: "CUS-2026-0048", Shipment: "SHP-2026-0177", Supplier: "Thermo Fisher", Documents: "Invoice, packing list, CoA", Broker: "GWC Clearance", ETA: "2026-07-03", Exception: "Duty code review", Status: "Customs hold" },
    { Packet: "CUS-2026-0044", Shipment: "SHP-2026-0184", Supplier: "Siemens Healthineers", Documents: "Invoice, COO, airway bill", Broker: "DHL Global", ETA: "2026-07-04", Exception: "None", Status: "Ready" }
  ]),
  "shipping.Cold Chain Delivery Warnings": view(["Warning", "Delivery", "Customer", "Temperature", "Limit", "Duration", "Logger", "Status"], [
    { Warning: "CCD-2026-0018", Delivery: "DN-2026-00282", Customer: "Sidra Medicine", Temperature: "7.6 C", Limit: "2-8 C", Duration: "34 min", Logger: "TEMP-0192", Status: "Within limit" },
    { Warning: "CCD-2026-0015", Delivery: "DN-2026-00277", Customer: "Doha Clinic", Temperature: "9.2 C", Limit: "2-8 C", Duration: "22 min", Logger: "TEMP-0188", Status: "QA review" }
  ]),
  "shipping.Driver Assignment": view(["Assignment", "Delivery", "Driver / Handler", "Vehicle", "Route", "Start Time", "POD Required", "Status"], [
    { Assignment: "DRV-2026-0064", Delivery: "DN-2026-00281", "Driver / Handler": "MedTech Fleet Placeholder", Vehicle: "MT Fleet 02", Route: "Doha North", "Start Time": "2026-07-02 08:30", "POD Required": "Yes", Status: "Assigned" },
    { Assignment: "DRV-2026-0061", Delivery: "DN-2026-00282", "Driver / Handler": "Cold-chain handler placeholder", Vehicle: "Cold van 01", Route: "Education City", "Start Time": "2026-07-03 09:00", "POD Required": "Yes", Status: "Pending" }
  ]),
  "shipping.Delivery Performance Dashboard": view(["Metric", "Period", "Value", "Target", "Owner", "Trend", "Action", "Status"], [
    { Metric: "On-time delivery", Period: "June 2026", Value: "93%", Target: "95%", Owner: "Shipping Lead", Trend: "-2%", Action: "Route review", Status: "Watch" },
    { Metric: "POD completion", Period: "June 2026", Value: "98%", Target: "98%", Owner: "Dispatch Team", Trend: "+1%", Action: "Maintain", Status: "On track" }
  ]),

  "quality.Product Complaint Workflow": view(["Complaint", "Customer", "Product", "Lot / Serial", "Severity", "Investigator", "CAPA Link", "Status"], [
    { Complaint: "CMP-2026-00032", Customer: "Sidra Medicine", Product: "Patient Monitor MX750", "Lot / Serial": "SN-MX750-88421", Severity: "Major", Investigator: "Quality Manager", "CAPA Link": "CAPA-2026-0012", Status: "Investigation open" },
    { Complaint: "CMP-2026-00028", Customer: "Doha Clinic", Product: "Troponin I Reagent Kit", "Lot / Serial": "LOT-TI-2604", Severity: "Minor", Investigator: "QA Specialist", "CAPA Link": "", Status: "Closed" }
  ]),
  "quality.Batch Recall Workflow": view(["Recall", "Product", "Lot", "Scope", "Customers", "Regulatory Notice", "Owner", "Status"], [
    { Recall: "REC-2026-00007", Product: "Troponin I Reagent Kit", Lot: "LOT-TI-2604", Scope: "Selected customers", Customers: "2", "Regulatory Notice": "Draft", Owner: "Regulatory Affairs", Status: "Draft" },
    { Recall: "REC-2026-00004", Product: "Glucose Reagent", Lot: "LOT-GL-2511", Scope: "Warehouse only", Customers: "0", "Regulatory Notice": "Not required", Owner: "Quality Manager", Status: "Closed" }
  ]),
  "quality.Regulatory Certificate Expiry": view(["Certificate", "Product / Supplier", "Authority", "Expiry Date", "Days Left", "Owner", "Renewal Action", "Status"], [
    { Certificate: "QAR-CERT-MX750", "Product / Supplier": "Patient Monitor MX750", Authority: "MOPH", "Expiry Date": "2026-08-30", "Days Left": "60", Owner: "Regulatory Affairs", "Renewal Action": "Submit renewal pack", Status: "Open" },
    { Certificate: "ISO-13485-SIE", "Product / Supplier": "Siemens Healthineers", Authority: "ISO", "Expiry Date": "2026-12-31", "Days Left": "183", Owner: "Quality Team", "Renewal Action": "Monitor", Status: "Active" }
  ]),
  "quality.Product Registration Tracker": view(["Registration", "Product", "Authority", "Submission", "Expected Approval", "Owner", "Documents", "Status"], [
    { Registration: "REG-2026-0048", Product: "Patient Monitor MX750", Authority: "MOPH", Submission: "2026-06-12", "Expected Approval": "2026-08-15", Owner: "Regulatory Affairs", Documents: "Complete", Status: "Submitted" },
    { Registration: "REG-2026-0044", Product: "New reagent panel", Authority: "MOPH", Submission: "", "Expected Approval": "2026-09-30", Owner: "Product Manager", Documents: "Pending CoA", Status: "Draft" }
  ]),
  "quality.Calibration Tracker": view(["Calibration", "Equipment", "Location", "Due Date", "Provider", "Certificate", "Owner", "Status"], [
    { Calibration: "CAL-2026-0068", Equipment: "Cold room sensor CS-02", Location: "Cold Store", "Due Date": "2026-07-15", Provider: "Local calibration lab", Certificate: "Pending", Owner: "QA Specialist", Status: "Due soon" },
    { Calibration: "CAL-2026-0062", Equipment: "QC weighing scale", Location: "Quality Lab", "Due Date": "2026-08-30", Provider: "Local calibration lab", Certificate: "Uploaded", Owner: "Quality Team", Status: "Active" }
  ]),
  "quality.Supplier Quality Rating": view(["Rating", "Supplier", "Period", "Defects", "CAPAs", "Score", "Owner", "Status"], [
    { Rating: "SQR-2026-BD", Supplier: "BD Biosciences", Period: "Q2 2026", Defects: "3", CAPAs: "1", Score: "86%", Owner: "Quality Manager", Status: "Watch" },
    { Rating: "SQR-2026-SIE", Supplier: "Siemens Healthineers", Period: "Q2 2026", Defects: "1", CAPAs: "0", Score: "96%", Owner: "Quality Manager", Status: "Approved" }
  ]),
  "quality.QC Checklist": view(["Checklist", "GRN / Batch", "Product", "Checks", "Passed", "Inspector", "Evidence", "Status"], [
    { Checklist: "QCCHK-2026-0048", "GRN / Batch": "GRN-2026-0094", Product: "Troponin I Reagent Kit", Checks: "CoA, temp logger, expiry", Passed: "2 / 3", Inspector: "QA Specialist", Evidence: "Temp logger pending", Status: "Inspection pending" },
    { Checklist: "QCCHK-2026-0044", "GRN / Batch": "GRN-2026-0098", Product: "Nitrile Gloves", Checks: "Visual, quantity, CoA", Passed: "3 / 3", Inspector: "Quality Team", Evidence: "Attached", Status: "Passed" }
  ]),
  "quality.Non-Conformance Log": view(["NCR", "Source", "Product", "Description", "Severity", "Disposition", "Owner", "Status"], [
    { NCR: "NCR-2026-0024", Source: "Goods receipt", Product: "Troponin I Reagent Kit", Description: "Temperature logger gap", Severity: "Major", Disposition: "Hold lot", Owner: "Quality Manager", Status: "Open" },
    { NCR: "NCR-2026-0021", Source: "Warehouse", Product: "Nitrile Gloves", Description: "Carton damage", Severity: "Minor", Disposition: "Accept after inspection", Owner: "QA Specialist", Status: "Closed" }
  ]),
  "quality.Quality Dashboard": view(["Metric", "Period", "Value", "Target", "Owner", "Trend", "Action", "Status"], [
    { Metric: "Open CAPAs", Period: "June 2026", Value: "4", Target: "<=3", Owner: "Quality Manager", Trend: "+1", Action: "Weekly review", Status: "Watch" },
    { Metric: "QC pass rate", Period: "June 2026", Value: "96.2%", Target: "95%", Owner: "Quality Team", Trend: "+0.8%", Action: "Maintain", Status: "On track" }
  ]),

  "documents.Document Version History": view(["Document", "Version", "Owner", "Changed By", "Changed At", "Change Summary", "Approval", "Status"], [
    { Document: "HMC Framework Agreement.pdf", Version: "4.0", Owner: "Legal", "Changed By": "Commercial Director", "Changed At": "2026-06-12", "Change Summary": "Validity and discount schedule", Approval: "Approved", Status: "Current" },
    { Document: "MX750 Product Datasheet.pdf", Version: "6.1", Owner: "Product Team", "Changed By": "Product Manager", "Changed At": "2026-06-17", "Change Summary": "Updated specification table", Approval: "Approved", Status: "Current" }
  ]),
  "documents.Attachment Metadata": view(["Attachment", "Source Module", "Source Record", "File Type", "Size", "Uploaded By", "Tags", "Status"], [
    { Attachment: "Thermo Fisher Quality Agreement.pdf", "Source Module": "Procurement", "Source Record": "AGR-2026-THERMO", "File Type": "PDF", Size: "1.8 MB", "Uploaded By": "M. Said", Tags: "supplier,quality", Status: "Active" },
    { Attachment: "QID_MT0041.pdf", "Source Module": "HR", "Source Record": "MT-0041", "File Type": "PDF", Size: "420 KB", "Uploaded By": "HR Officer", Tags: "employee,qid", Status: "Restricted" }
  ]),
  "documents.Contract Certificate Expiry": view(["Document", "Category", "Related To", "Expiry Date", "Days Left", "Owner", "Renewal Action", "Status"], [
    { Document: "Thermo Fisher Quality Agreement.pdf", Category: "Agreement", "Related To": "Thermo Fisher", "Expiry Date": "2026-07-28", "Days Left": "27", Owner: "Procurement", "Renewal Action": "Legal review", Status: "Urgent" },
    { Document: "QAR-CERT-MX750.pdf", Category: "Regulatory certificate", "Related To": "Patient Monitor MX750", "Expiry Date": "2026-08-30", "Days Left": "60", Owner: "Regulatory Affairs", "Renewal Action": "Renewal pack", Status: "Open" }
  ]),
  "documents.Approval Signature Trail": view(["Trail", "Document", "Approver", "Step", "Decision", "Signed At", "Signature Type", "Status"], [
    { Trail: "SIG-2026-0048", Document: "HMC Framework Agreement.pdf", Approver: "Commercial Director", Step: "Commercial approval", Decision: "Approved", "Signed At": "2026-06-12 11:20", "Signature Type": "Local demo signature", Status: "Complete" },
    { Trail: "SIG-2026-0044", Document: "QAR-CERT-MX750.pdf", Approver: "Regulatory Manager", Step: "Renewal approval", Decision: "Pending", "Signed At": "", "Signature Type": "Local demo signature", Status: "Pending" }
  ]),
  "documents.Document Lifecycle": view(["Document", "Lifecycle Stage", "Owner", "Source", "Effective Date", "Next Review", "Archive Rule", "Status"], [
    { Document: "HMC Framework Agreement.pdf", "Lifecycle Stage": "Published", Owner: "Legal", Source: "Sales", "Effective Date": "2026-06-12", "Next Review": "2026-12-12", "Archive Rule": "After expiry + 7 years", Status: "Active" },
    { Document: "Service Report JOB-2026-0142.pdf", "Lifecycle Stage": "Draft", Owner: "Service", Source: "Service", "Effective Date": "", "Next Review": "2026-07-02", "Archive Rule": "After job close", Status: "Draft" }
  ]),
  "documents.Document Owners": view(["Owner", "Department", "Document Class", "Records", "Expiring Soon", "Backup Owner", "Review Cadence", "Status"], [
    { Owner: "Quality Manager", Department: "Quality", "Document Class": "Certificates and CAPA", Records: "84", "Expiring Soon": "6", "Backup Owner": "Regulatory Affairs", "Review Cadence": "Monthly", Status: "Active" },
    { Owner: "HR Manager", Department: "Human Resources", "Document Class": "Employee restricted", Records: "420", "Expiring Soon": "5", "Backup Owner": "HR Officer", "Review Cadence": "Weekly", Status: "Active" }
  ]),
  "documents.Source Record Links": view(["Link", "Document", "Source Module", "Source Record", "Relationship", "Owner", "Last Checked", "Status"], [
    { Link: "DLINK-2026-0088", Document: "Purchase Order PDF", "Source Module": "Procurement", "Source Record": "PO-2026-0128", Relationship: "Generated output", Owner: "M. Said", "Last Checked": "2026-06-20", Status: "Linked" },
    { Link: "DLINK-2026-0084", Document: "Service Report PDF", "Source Module": "Service", "Source Record": "JOB-2026-0142", Relationship: "Generated output", Owner: "Naveen Kumar", "Last Checked": "2026-06-20", Status: "Draft" }
  ]),
  "documents.Generated PDF History": view(["PDF", "Document No", "Source Module", "Source Record", "Generated By", "Generated At", "Template", "Status"], [
    { PDF: "PO-2026-0128.pdf", "Document No": "PO-2026-0128", "Source Module": "Procurement", "Source Record": "PO-2026-0128", "Generated By": "M. Said", "Generated At": "2026-06-20 10:15", Template: "Purchase Order", Status: "Generated" },
    { PDF: "SRV-RPT-2026-0142.pdf", "Document No": "SRV-RPT-2026-0142", "Source Module": "Service", "Source Record": "JOB-2026-0142", "Generated By": "Naveen Kumar", "Generated At": "Not generated", Template: "Service Report", Status: "Draft" }
  ]),
  "documents.Print Views": view(["Print View", "Document", "Layout", "Watermark", "Prepared By", "Last Preview", "Action", "Status"], [
    { "Print View": "PRN-2026-0048", Document: "HMC Framework Agreement.pdf", Layout: "Contract pack", Watermark: "Controlled copy", "Prepared By": "Legal", "Last Preview": "2026-06-12", Action: "Preview PDF", Status: "Ready" },
    { "Print View": "PRN-2026-0044", Document: "Service Report JOB-2026-0142.pdf", Layout: "Service report", Watermark: "Draft", "Prepared By": "Service", "Last Preview": "", Action: "Generate first", Status: "Draft" }
  ]),

  "admin.Role Permission Matrix": view(["Role", "Module", "Create", "Approve", "Export", "Sensitive Access", "Owner", "Status"], [
    { Role: "Finance Manager", Module: "Finance", Create: "Yes", Approve: "Yes", Export: "Yes", "Sensitive Access": "Journals, payroll summaries", Owner: "Super Admin", Status: "Active" },
    { Role: "Read-only Auditor", Module: "All", Create: "No", Approve: "No", Export: "Yes", "Sensitive Access": "Masked HR documents", Owner: "Super Admin", Status: "Available" }
  ]),
  "admin.SoD Warnings": view(["Warning", "User", "Conflict", "Modules", "Risk", "Mitigation", "Owner", "Status"], [
    { Warning: "SOD-2026-0012", User: "Aisha Rahman", Conflict: "Vendor bill create and approve", Modules: "Finance", Risk: "Medium", Mitigation: "Second approval over QAR 50k", Owner: "Super Admin", Status: "Open" },
    { Warning: "SOD-2026-0008", User: "Fahad Al-Kuwari", Conflict: "Quotation owner and discount approver", Modules: "Sales", Risk: "High", Mitigation: "Management approval required", Owner: "Sales Operations", Status: "Controlled" }
  ]),
  "admin.Audit Viewer": view(["Audit", "Module", "Action", "Record", "User", "Timestamp", "Details", "Status"], [
    { Audit: "AUD-2026-0418", Module: "Sales", Action: "CREATE", Record: "QTN-2026-00314", User: "F. Al-Kuwari", Timestamp: "2026-07-01 09:10", Details: "Quotation draft created locally", Status: "Logged" },
    { Audit: "AUD-2026-0414", Module: "Finance", Action: "PDF", Record: "Management report", User: "Aisha Rahman", Timestamp: "2026-07-01 08:45", Details: "Local PDF generated", Status: "Logged" }
  ]),
  "admin.Local Backup Restore": view(["Backup", "Scope", "Created By", "Created At", "Records", "Restore Target", "Validation", "Status"], [
    { Backup: "BKP-LOCAL-2026-0701", Scope: "All demo modules", "Created By": "Super Admin", "Created At": "2026-07-01 08:00", Records: "LocalStorage snapshot", "Restore Target": "Local browser only", Validation: "Checksum stored", Status: "Ready" },
    { Backup: "BKP-HR-2026-0630", Scope: "HR linked modules", "Created By": "HR Manager", "Created At": "2026-06-30 17:00", Records: "No Employee Master changes", "Restore Target": "HR tabs only", Validation: "Passed", Status: "Archived" }
  ]),
  "admin.Module Data Reset": view(["Reset", "Module", "Records", "Requested By", "Approval", "Last Reset", "Impact", "Status"], [
    { Reset: "RST-2026-SALES", Module: "Sales", Records: "Demo sales tabs", "Requested By": "Sales Operations", Approval: "Super Admin", "Last Reset": "2026-06-29", Impact: "LocalStorage only", Status: "Available" },
    { Reset: "RST-2026-HR-LINKED", Module: "HR linked modules", Records: "Documents, approvals, reports", "Requested By": "HR Manager", Approval: "Super Admin", "Last Reset": "", Impact: "Employee Master excluded", Status: "Available" }
  ]),
  "admin.Change Log": view(["Change", "Area", "Summary", "Changed By", "Changed At", "Version", "Rollback", "Status"], [
    { Change: "CHG-2026-0072", Area: "Expert layer tabs", Summary: "Added local expert workflow views", "Changed By": "Codex", "Changed At": "2026-07-01", Version: "Local demo", Rollback: "Reset module data", Status: "Active" },
    { Change: "CHG-2026-0068", Area: "Automations", Summary: "Local trigger monitor enabled", "Changed By": "Admin", "Changed At": "2026-06-30", Version: "Local demo", Rollback: "Disable monitor", Status: "Active" }
  ]),
  "admin.Data Health Check": view(["Check", "Module", "Rule", "Records Checked", "Exceptions", "Owner", "Action", "Status"], [
    { Check: "DHC-2026-0018", Module: "Sales", Rule: "Quotation must have costing before approval", "Records Checked": "14", Exceptions: "1", Owner: "Sales Operations", Action: "Fix draft quotation", Status: "Warning" },
    { Check: "DHC-2026-0014", Module: "Inventory", Rule: "Expiry-controlled stock must have lot", "Records Checked": "64", Exceptions: "0", Owner: "Warehouse Manager", Action: "None", Status: "Passed" }
  ]),
  "admin.User Activity Summary": view(["User", "Department", "Last Active", "Creates", "Approvals", "Exports", "Risk Flag", "Status"], [
    { User: "Fahad Al-Kuwari", Department: "Sales", "Last Active": "21 min ago", Creates: "8", Approvals: "2", Exports: "3", "Risk Flag": "Discount owner", Status: "Active" },
    { User: "Aisha Rahman", Department: "Finance", "Last Active": "8 min ago", Creates: "5", Approvals: "7", Exports: "4", "Risk Flag": "None", Status: "Active" }
  ]),
  "admin.Read-only Auditor Mode": view(["Mode", "Scope", "Create", "Edit", "Approve", "Export", "Sensitive Fields", "Status"], [
    { Mode: "Auditor - full company", Scope: "All modules", Create: "No", Edit: "No", Approve: "No", Export: "Yes", "Sensitive Fields": "Masked HR IDs and bank data", Status: "Available" },
    { Mode: "Auditor - finance only", Scope: "Finance, Approvals, Documents", Create: "No", Edit: "No", Approve: "No", Export: "Yes", "Sensitive Fields": "Payroll detail hidden", Status: "Available" }
  ])
};

Object.assign(medtechScopeViews, expertLayerViews);
