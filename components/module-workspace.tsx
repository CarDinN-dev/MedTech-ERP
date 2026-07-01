"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { ArrowDown, ArrowUp, ArrowUpDown, CheckCircle2, Columns3, Download, Ellipsis, Eye, FileDown, FileText, Grid2X2, List, Play, Plus, RotateCcw, Search, ShieldCheck, Upload, UserPlus, XCircle } from "lucide-react";
import { getModule } from "@/lib/erp-data";
import { Button, StatusBadge } from "@/components/ui";
import { ApprovalMatrixWorkspace } from "@/components/approval-matrix-workspace";
import { CommissionWorkspace } from "@/components/commission-workspace";
import { cn } from "@/lib/utils";
import { useDemoRecords, type DemoRecord } from "@/lib/demo-store";
import { useAuditLog } from "@/lib/audit-store";
import { getDemoTabView } from "@/lib/demo-tabs";
import { RecordModal } from "@/components/record-modal";
import { exportToExcel, parseExcel } from "@/lib/export/excel";
import { getDemoSession, PRESENTATION_USER_NAME } from "@/lib/demo-auth";
import { downloadBlob } from "@/lib/client-download";
import { documentTypeFor, finalDocumentError, issueDocumentNumber, recordGeneratedDocument, templateForDocumentType } from "@/lib/document-control";
import { getMasterDataConfig, supplierSuggestions } from "@/lib/master-data";
import { approvalSourceFromRecord, submitApprovalRequest, type ApprovalSource } from "@/lib/approval-matrix";
import { applyLeadAction, buildOpportunityFromLead, canConvertLead, enrichSalesLead, getSalesCrmConfig } from "@/lib/sales-crm";
import { pathwayForSalesTab } from "@/lib/sales-workflow";
import type { PdfTemplate } from "@/lib/pdf/generator";
import { runLocalDemoAutomations, workflowActionLabel, workflowError, workflowStatusFor, type WorkflowAction } from "@/lib/local-workflows";
import { SalesWorkflowWorkspace } from "@/components/sales-workflow-workspace";
import { getProcurementConfig, procurementActionsFor, runProcurementAction, type ProcurementAction } from "@/lib/procurement-workflow";
import { getInventoryConfig, inventoryActionsFor, runInventoryAction, type InventoryAction } from "@/lib/inventory-workflow";
import { financeActionsFor, financeWorkflowError, getFinanceConfig, importFinanceRows, runFinanceAction, type FinanceAction } from "@/lib/finance-workflow";
import { getShippingConfig, runShippingAction, shippingActionsFor, type ShippingAction } from "@/lib/shipping-workflow";
import { getProjectConfig, projectActionsFor, runProjectAction, type ProjectAction } from "@/lib/project-workflow";
import { getServiceConfig, runServiceAction, serviceActionsFor, type ServiceAction } from "@/lib/service-workflow";
import { ReportsDashboardWorkspace } from "@/components/reports-dashboard-workspace";
import { MigrationReadinessWorkspace } from "@/components/migration-readiness-workspace";
import { SalesCostingWorkspace } from "@/components/sales-costing-workspace";
import { approvedCostingExists } from "@/lib/sales-costing";
import { validateQuotationPricing } from "@/lib/pricing-engine";
import { erpRoles, permissionError, permissionModule, segregationWarning, type ErpAction } from "@/lib/erp-security";
import { PricingEngineWorkspace } from "@/components/pricing-engine-workspace";

const iconTones: Record<string, string> = { emerald: "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/50", violet: "bg-violet-50 text-violet-600 dark:bg-violet-950/50", blue: "bg-blue-50 text-blue-600 dark:bg-blue-950/50", cyan: "bg-cyan-50 text-cyan-600 dark:bg-cyan-950/50", amber: "bg-amber-50 text-amber-600 dark:bg-amber-950/50", orange: "bg-orange-50 text-orange-600 dark:bg-orange-950/50", rose: "bg-rose-50 text-rose-600 dark:bg-rose-950/50", indigo: "bg-indigo-50 text-indigo-600 dark:bg-indigo-950/50", sky: "bg-sky-50 text-sky-600 dark:bg-sky-950/50", teal: "bg-teal-50 text-teal-600 dark:bg-teal-950/50", purple: "bg-purple-50 text-purple-600 dark:bg-purple-950/50", slate: "bg-slate-100 text-slate-600 dark:bg-slate-800" };
const auditColumns = ["Time", "User", "Action", "Module", "Record", "Details", "IP address"];

export function ModuleWorkspace({ moduleKey }: { moduleKey: string }) {
  const moduleConfig = getModule(moduleKey);
  const [activeTab, setActiveTab] = useState(moduleConfig?.tabs[0] ?? "Records");
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [sortColumn, setSortColumn] = useState("");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
  const [modalOpen, setModalOpen] = useState(false);
  const [selected, setSelected] = useState<DemoRecord | null>(null);
  const [sourcePreview, setSourcePreview] = useState<DemoRecord | null>(null);
  const [toast, setToast] = useState("");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [filterValues, setFilterValues] = useState<Record<string, string>>({});
  const [importErrors, setImportErrors] = useState<Array<{ row: number; message: string }>>([]);
  const importRef = useRef<HTMLInputElement>(null);
  const view = moduleConfig ? getDemoTabView(moduleConfig, activeTab) : { columns: [], rows: [] };
  const masterConfig = useMemo(() => getMasterDataConfig(moduleKey, activeTab), [moduleKey, activeTab]);
  const salesCrmConfig = useMemo(() => getSalesCrmConfig(moduleKey, activeTab), [moduleKey, activeTab]);
  const procurementConfig = useMemo(() => moduleKey === "procurement" ? getProcurementConfig(activeTab) : null, [activeTab, moduleKey]);
  const inventoryConfig = useMemo(() => moduleKey === "inventory" ? getInventoryConfig(activeTab) : null, [activeTab, moduleKey]);
  const financeConfig = useMemo(() => moduleKey === "finance" ? getFinanceConfig(activeTab) : null, [activeTab, moduleKey]);
  const shippingConfig = useMemo(() => moduleKey === "shipping" ? getShippingConfig(activeTab) : null, [activeTab, moduleKey]);
  const projectConfig = useMemo(() => moduleKey === "projects" ? getProjectConfig(activeTab) : null, [activeTab, moduleKey]);
  const serviceConfig = useMemo(() => moduleKey === "service" ? getServiceConfig(activeTab) : null, [activeTab, moduleKey]);
  const salesWorkflowPathway = useMemo(() => moduleKey === "sales" ? pathwayForSalesTab(activeTab) : null, [activeTab, moduleKey]);
  const isApprovalMatrix = moduleKey === "approvals" && activeTab === "Approval Matrix";
  const isCommissionWorkspace = moduleKey === "sales" && activeTab === "Commissions";
  const isSalesCostingWorkspace = moduleKey === "sales" && activeTab === "Estimation / Costing";
  const isPricingWorkspace = moduleKey === "sales" && activeTab === "Pricing Engine";
  const readinessView = moduleKey === "admin" && activeTab === "Data Import Center" ? "import" : moduleKey === "admin" && activeTab === "Migration Reconciliation" ? "reconciliation" : moduleKey === "admin" && activeTab === "UAT Tracker" ? "uat" : null;
  const usesCustomWorkspace = Boolean(salesWorkflowPathway || isApprovalMatrix || isCommissionWorkspace || isSalesCostingWorkspace || isPricingWorkspace || readinessView);
  const tableConfig = masterConfig ?? salesCrmConfig ?? procurementConfig ?? inventoryConfig ?? financeConfig ?? shippingConfig ?? projectConfig ?? serviceConfig;
  const store = useDemoRecords(`${moduleKey}:${activeTab}`, view.rows);
  const opportunityView = moduleConfig ? getDemoTabView(moduleConfig, "Opportunities") : { columns: [], rows: [] };
  const opportunitiesStore = useDemoRecords(moduleKey === "sales" ? "sales:Opportunities" : `${moduleKey}:__opportunities`, opportunityView.rows);
  const audit = useAuditLog();
  const isAudit = moduleKey === "admin" && activeTab === "Audit log";
  const isAutomationMonitor = moduleKey === "admin" && activeTab === "Automation Monitor";
  const isSalesQuotation = moduleKey === "sales" && activeTab === "Quotations";
  const columns = isAudit ? auditColumns : view.columns;
  const records = isAudit ? audit.entries : salesCrmConfig ? store.records.map(record => enrichSalesLead(record)) : store.records;
  const isUserAdmin = moduleKey === "admin" && activeTab === "Users";
  const isRoleAdmin = moduleKey === "admin" && activeTab === "Roles & permissions";
  const formColumns = useMemo(() => isUserAdmin ? [...columns, "Password"] : columns, [columns, isUserAdmin]);
  const selectOptions = useMemo<Record<string, string[]>>(() => {
    if (tableConfig) return tableConfig.selectOptions;
    if (!isUserAdmin) return {} as Record<string, string[]>;
    return {
      Role: [...erpRoles],
      Department: ["Executive", "Finance", "Human Resources", "Sales", "Shipping & Logistics", "Warehouse", "Procurement", "Service", "Projects"],
      Status: ["Active", "Invited", "Suspended"]
    };
  }, [isUserAdmin, tableConfig]);
  const formDefaults = useMemo<Record<string, string>>(() => {
    if (tableConfig) return tableConfig.defaultValues;
    if (!isUserAdmin) return {} as Record<string, string>;
    return { Role: "Read-only Auditor", Department: "Sales", "Last active": "Never", Status: "Active", Password: "" };
  }, [isUserAdmin, tableConfig]);
  const fieldTypes = useMemo(() => tableConfig?.fieldTypes ?? {}, [tableConfig]);
  const suggestions = useMemo(() => ({ ...(moduleKey === "procurement" && activeTab === "RFQs" ? supplierSuggestions() : {}), ...((masterConfig ?? procurementConfig ?? inventoryConfig ?? shippingConfig ?? projectConfig ?? serviceConfig)?.suggestions ?? {}) }), [activeTab, moduleKey, masterConfig, procurementConfig, inventoryConfig, shippingConfig, projectConfig, serviceConfig]);

  useEffect(() => { setQuery(""); setStatusFilter("All"); setSortColumn(""); setSelected(null); setSourcePreview(null); setSelectedIds([]); setFilterValues({}); setImportErrors([]); setModalOpen(false); }, [activeTab]);
  const Icon = moduleConfig?.icon;
  const statusColumn = columns.find(column => ["status", "stage", "access", "action"].includes(column.toLowerCase()));
  const filterLabel = statusColumn === "Action" ? "All actions" : "All statuses";
  const statuses = useMemo(() => statusColumn ? Array.from(new Set(records.map(record => record[statusColumn]).filter(Boolean))).sort() : [], [records, statusColumn]);
  const masterFilterColumns = useMemo(() => (tableConfig?.filterColumns ?? []).filter(column => column !== statusColumn), [tableConfig, statusColumn]);
  const masterFilterOptions = useMemo(() => Object.fromEntries(masterFilterColumns.map(column => [column, Array.from(new Set(records.map(record => record[column]).filter(Boolean))).sort()])), [masterFilterColumns, records]);
  const selectedIdSet = useMemo(() => new Set(selectedIds), [selectedIds]);
  const recordById = useMemo(() => new Map(records.map(record => [record.__id, record])), [records]);
  const searchableRecords = useMemo(() => {
    const searchColumns = tableConfig?.searchColumns ?? columns;
    return records.map(record => ({
      record,
      searchText: searchColumns.map(column => record[column] ?? "").join("\n").toLowerCase()
    }));
  }, [records, tableConfig, columns]);
  const filtered = useMemo(() => {
    const search = query.toLowerCase();
    return searchableRecords.filter(({ record, searchText }) => {
    const matchesSearch = !search || searchText.includes(search);
    const matchesStatus = statusFilter === "All" || (statusColumn && record[statusColumn] === statusFilter);
    const matchesMasterFilters = masterFilterColumns.every(column => !filterValues[column] || record[column] === filterValues[column]);
    return matchesSearch && matchesStatus && matchesMasterFilters;
  }).map(item => item.record).sort((a, b) => {
    if (!sortColumn) return 0;
    const comparison = (a[sortColumn] ?? "").localeCompare(b[sortColumn] ?? "", undefined, { numeric: true, sensitivity: "base" });
    return sortDirection === "asc" ? comparison : -comparison;
  });
  }, [searchableRecords, query, statusFilter, statusColumn, sortColumn, sortDirection, masterFilterColumns, filterValues]);
  const selectedRecords = useMemo(() => selectedIds.map(id => recordById.get(id)).filter((record): record is DemoRecord => Boolean(record)), [recordById, selectedIds]);
  const approvalSources = useMemo(() => selectedRecords.map(record => approvalSourceFromRecord(moduleKey, activeTab, record, getDemoSession()?.name || PRESENTATION_USER_NAME)).filter((source): source is ApprovalSource => Boolean(source)), [activeTab, moduleKey, selectedRecords]);
  const procurementActions = useMemo(() => moduleKey === "procurement" ? procurementActionsFor(activeTab) : [], [activeTab, moduleKey]);
  const inventoryActions = useMemo(() => moduleKey === "inventory" ? inventoryActionsFor(activeTab) : [], [activeTab, moduleKey]);
  const financeActions = useMemo(() => financeActionsFor(moduleKey, activeTab), [activeTab, moduleKey]);
  const shippingActions = useMemo(() => shippingActionsFor(moduleKey, activeTab), [activeTab, moduleKey]);
  const projectActions = useMemo(() => moduleKey === "projects" ? projectActionsFor(activeTab) : [], [activeTab, moduleKey]);
  const serviceActions = useMemo(() => moduleKey === "service" ? serviceActionsFor(activeTab) : [], [activeTab, moduleKey]);
  const session = getDemoSession();
  const accessModule = permissionModule(moduleKey, activeTab);

  const notify = (message: string) => { setToast(message); window.setTimeout(() => setToast(""), 2600); };
  const guard = (action: ErpAction, record?: Record<string, string> | null) => {
    const error = permissionError(session, accessModule, action) || segregationWarning({ action, moduleName: accessModule, record, session });
    if (error) notify(error);
    return !error;
  };
  const switchTab = (tab: string) => setActiveTab(tab);
  const toggleSort = (column: string) => { if (sortColumn === column) setSortDirection(direction => direction === "asc" ? "desc" : "asc"); else { setSortColumn(column); setSortDirection("asc"); } };
  const toggleSelected = (id: string) => setSelectedIds(current => current.includes(id) ? current.filter(value => value !== id) : [...current, id]);
  const toggleAllVisible = () => {
    const visibleIds = filtered.map(record => record.__id);
    const visibleIdSet = new Set(visibleIds);
    const allSelected = visibleIds.length > 0 && visibleIds.every(id => selectedIdSet.has(id));
    setSelectedIds(current => allSelected ? current.filter(id => !visibleIdSet.has(id)) : Array.from(new Set([...current, ...visibleIds])));
  };
  const openCreate = () => { if (!guard("create")) return; setSelected(null); setModalOpen(true); };
  const openRecord = (record: DemoRecord) => { if (!isAudit) { setSelected(record); setModalOpen(true); } };
  const viewAutomationSource = (record: DemoRecord) => { setSourcePreview(record); audit.add({ action: "VIEW SOURCE", module: "Administration", record: record["Source Record"], details: `Automation source opened from ${record["Trigger Event No"]}` }); };
  const recordName = (record?: Record<string, string> | null) => record?.[columns[0]] ?? "Record";
  const save = (input: Record<string, string>) => {
    if (!guard(selected ? "edit" : "create", selected)) return;
    let values = { ...input };
    try {
      if (tableConfig) values = tableConfig.prepareSave(values, records as DemoRecord[], selected);
    } catch (error) { notify(error instanceof Error ? error.message : "Record validation failed"); return; }
    if (isUserAdmin) {
      values.Email = values.Email.trim().toLowerCase();
      const duplicate = records.find(record => record.Email?.toLowerCase() === values.Email && record.__id !== selected?.__id);
      if (duplicate) { notify("A user with this email already exists"); return; }
      if (selected && !values.Password) values.Password = selected.Password || "MedTech@2026";
      const roleChanged = selected && selected.Role !== values.Role;
      if (selected) store.update(selected.__id, values); else store.create(values);
      audit.add({ action: roleChanged ? "ROLE CHANGE" : selected ? "UPDATE USER" : "CREATE USER", module: "Administration", record: values.Email, details: roleChanged ? `${selected.Role} → ${values.Role}` : `${values.User} · ${values.Role}` });
      notify(selected ? "User account updated" : "User created and ready to sign in"); setModalOpen(false); return;
    }
    if (selected) { store.update(selected.__id, values); audit.add({ action: "UPDATE", module: moduleConfig.title, record: recordName(values), details: `${activeTab} record updated` }); notify("Record updated successfully"); }
    else { store.create(values); audit.add({ action: "CREATE", module: moduleConfig.title, record: recordName(values), details: `${activeTab} record created` }); notify("New record created successfully"); }
    setModalOpen(false);
  };
  const remove = () => { if (!selected || !guard("delete/archive", selected)) return; const name = recordName(selected); store.remove(selected.__id); audit.add({ action: "DELETE", module: moduleConfig.title, record: name, details: `${activeTab} record removed from the demo dataset` }); setModalOpen(false); notify("Record removed from the demo dataset"); };
  const decide = (decision: "Approved" | "Rejected") => { if (!selected || !guard(decision === "Approved" ? "approve" : "reject", selected)) return; store.update(selected.__id, { Status: decision }); audit.add({ action: decision === "Approved" ? "APPROVE" : "REJECT", module: moduleConfig.title, record: recordName(selected), details: `${activeTab} request ${decision.toLowerCase()}` }); setModalOpen(false); notify(`Request ${decision.toLowerCase()}`); };
  const exportRecords = async () => { if (!guard("export")) return; await exportToExcel(filtered.map(record => Object.fromEntries(columns.map(column => [column, record[column] ?? ""]))), `${moduleConfig.key}-${activeTab.toLowerCase().replaceAll(" ", "-")}`, activeTab); audit.add({ action: "EXPORT", module: moduleConfig.title, record: activeTab, details: `${filtered.length} records exported to Excel` }); notify(`${filtered.length} records exported to Excel`); };
  const downloadDetailedPdf = async () => {
    if (!guard("generate PDF", selectedRecords[0])) return;
    if (!selectedRecords.length) { notify("Select at least one record first"); return; }
    const { generateBrandedPdf } = await import("@/lib/pdf/generator");
    const first = selectedRecords[0];
    const name = recordName(first);
    const blocked = selectedRecords.map(finalDocumentError).find(Boolean);
    if (blocked) { notify(blocked); return; }
    const documentType = documentTypeFor(moduleConfig.key, activeTab, first);
    const documentNumber = issueDocumentNumber(documentType);
    const metadata: Array<[string, string]> = selectedRecords.flatMap((record, index) => {
      const prefix = selectedRecords.length > 1 ? `${recordName(record)} · ` : "";
      const fields = Object.entries(record).filter(([key]) => !key.startsWith("__") && key !== "Password").map(([key, value]) => [`${prefix}${key}`, value] as [string, string]);
      return index > 0 ? [["Selected record", `${index + 1} of ${selectedRecords.length}`] as [string, string], ...fields] : fields;
    });
    const partyName = first.Supplier || first.Customer || first.Client || first.Employee || first.User || "MedTech Corporation Trading";
    const result = await generateBrandedPdf({
      template: templateForDocumentType(documentType) ?? detailTemplateFor(moduleConfig.key, activeTab), documentNumber, date: new Intl.DateTimeFormat("en-GB", { dateStyle: "long" }).format(new Date()),
      partyLabel: first.Supplier ? "Supplier" : first.Customer ? "Customer" : first.Client ? "Client" : "Record owner", partyName,
      subject: `${moduleConfig.title} · ${activeTab} detailed record`, metadata,
      notes: selectedRecords.length === 1 ? (first.Notes || `Detailed system record generated for ${name}.`) : `${selectedRecords.length} selected ${activeTab.toLowerCase()} records are included in this controlled export.`,
      terms: ["Generated from the MedTech ERP client presentation dataset.", "Verify commercial and technical values before external issue."],
      preparedBy: getDemoSession()?.name || PRESENTATION_USER_NAME, approvedBy: "Authorized Signatory"
    }, "blob");
    if (!(result instanceof Blob)) throw new Error("Unable to generate detailed PDF");
    downloadBlob(result, `${documentNumber.replace(/[^a-z0-9-]+/gi, "-")}-detailed.pdf`);
    recordGeneratedDocument({ document: documentType, sourceModule: moduleConfig.title, sourceRecord: selectedRecords.map(record => recordName(record)).join(", "), documentNumber, generatedBy: getDemoSession()?.name || PRESENTATION_USER_NAME });
    audit.add({ action: "PDF", module: moduleConfig.title, record: selectedRecords.map(record => recordName(record)).join(", "), details: `Detailed PDF generated for ${selectedRecords.length} selected record${selectedRecords.length === 1 ? "" : "s"}` });
    notify(`Detailed PDF generated for ${selectedRecords.length} selected record${selectedRecords.length === 1 ? "" : "s"}`);
  };
  const importRecords = async (file?: File) => { if (!file || isAudit) return; const result = await parseExcel<Record<string, string>>(file, row => Object.fromEntries(columns.map(column => [column, String((row as Record<string, unknown>)[column] ?? "")]))) ; if (result.valid.length) { store.importMany(result.valid); audit.add({ action: "IMPORT", module: moduleConfig.title, record: activeTab, details: `${result.valid.length} records imported from ${file.name}` }); } notify(`${result.valid.length} records imported${result.errors.length ? ` · ${result.errors.length} skipped` : ""}`); if (importRef.current) importRef.current.value = ""; };
  const validatedImportRecords = async (file?: File) => {
    if (!file || isAudit) return;
    if (!guard("import")) return;
    if (financeConfig) {
      const result = await importFinanceRows(file, activeTab, records as DemoRecord[]);
      if (result.valid.length) {
        store.upsertMany(financeConfig.keyColumn, result.valid);
        audit.add({ action: "IMPORT", module: moduleConfig.title, record: activeTab, details: `${result.valid.length} local finance rows imported from ${file.name}` });
      }
      setImportErrors(result.errors.slice(0, 6));
      notify(`${result.valid.length} records imported${result.errors.length ? ` Â· ${result.errors.length} skipped` : ""}`);
      if (importRef.current) importRef.current.value = "";
      return;
    }
    if (!tableConfig) { await importRecords(file); return; }
    const seen = new Set<string>();
    const result = await parseExcel<Record<string, string>>(file, (row, rowNumber) => tableConfig.validateImportRow(row as Record<string, unknown>, rowNumber, records as DemoRecord[], seen));
    if (result.valid.length) {
      store.upsertMany(tableConfig.keyColumn, result.valid);
      audit.add({ action: "IMPORT", module: moduleConfig.title, record: activeTab, details: `${result.valid.length} records imported from ${file.name}` });
    }
    setImportErrors(result.errors.slice(0, 6));
    notify(`${result.valid.length} records imported${result.errors.length ? ` · ${result.errors.length} skipped` : ""}`);
    if (importRef.current) importRef.current.value = "";
  };
  const resetData = () => { if (!guard("reset demo data")) return; if (isAudit) audit.reset(); else store.reset(); setQuery(""); setStatusFilter("All"); setFilterValues({}); setImportErrors([]); setSortColumn(""); notify(isAudit ? "Audit log reset to sample events" : `${activeTab} reset to sample data`); };
  const applyWorkflowAction = (action: WorkflowAction) => {
    const permissionAction: ErpAction = action === "approve" ? "approve" : action === "reject" ? "reject" : action === "submit" ? "edit" : "finalize/post/lock";
    if (!guard(permissionAction, selectedRecords[0])) return;
    if (!selectedRecords.length || isAudit) return;
    if (isSalesQuotation && ["submit", "approve"].includes(action)) {
      const blocked = selectedRecords.find(record => record["Costing Sheet No"] ? !approvedCostingExists(record["Costing Sheet No"]) : Boolean(validateQuotationPricing(record)));
      if (blocked) { notify(validateQuotationPricing(blocked) || `${recordName(blocked)} needs an approved costing sheet before final quotation submission`); return; }
    }
    const firstError = selectedRecords.map(record => workflowError(moduleKey, activeTab, action, record)).find(Boolean);
    if (firstError) { notify(firstError); return; }
    const financeError = selectedRecords.map(record => financeWorkflowError(activeTab, permissionAction, record)).find(Boolean);
    if (moduleKey === "finance" && financeError) { notify(financeError); return; }
    const column = statusColumn || "Status";
    const status = workflowStatusFor(action);
    selectedRecords.forEach(record => store.update(record.__id, { [column]: status }));
    audit.add({ action: workflowActionLabel(action).toUpperCase(), module: moduleConfig.title, record: selectedRecords.map(record => recordName(record)).join(", "), details: `${selectedRecords.length} ${activeTab} record${selectedRecords.length === 1 ? "" : "s"} marked ${status.toLowerCase()}` });
    runLocalDemoAutomations(getDemoSession()?.name || PRESENTATION_USER_NAME);
    notify(`${selectedRecords.length} record${selectedRecords.length === 1 ? "" : "s"} ${status.toLowerCase()}`);
  };
  const submitSelectedApprovals = () => {
    if (!guard("create", selectedRecords[0])) return;
    if (!approvalSources.length) return;
    const messages = approvalSources.map(source => submitApprovalRequest(source).message);
    selectedRecords.forEach(record => store.update(record.__id, record["Approval Status"] ? { Status: "Pending approval", "Approval Status": "Pending approval" } : { Status: "Pending approval" }));
    notify(messages[0] ?? "Approval submitted");
  };
  const runSelectedProcurementAction = async (action: ProcurementAction) => {
    if (!guard(action === "generate-po-documents" ? "generate PDF" : "edit", selectedRecords[0])) return;
    const currentUser = getDemoSession()?.name || PRESENTATION_USER_NAME;
    const result = runProcurementAction(action, selectedRecords as DemoRecord[], currentUser);
    if ("error" in result) { notify(String(result.error)); return; }
    const updates = "sourceUpdates" in result ? (result as { sourceUpdates?: Record<string, string>[] }).sourceUpdates : undefined;
    updates?.forEach((values, index) => {
      const record = selectedRecords[index];
      if (record) store.update(record.__id, values);
    });
    audit.add({ action: action.replaceAll("-", " ").toUpperCase(), module: moduleConfig.title, record: selectedRecords.map(record => recordName(record)).join(", "), details: result.message });
    notify(result.message);
    if (action === "generate-po-documents") await downloadDetailedPdf();
    const targetTab = "targetTab" in result ? result.targetTab : undefined;
    if (targetTab) setActiveTab(targetTab);
  };
  const runSelectedInventoryAction = (action: InventoryAction) => {
    if (!guard(action === "post-cycle-count" || action === "dispatch-stock" || action === "transfer-stock" ? "finalize/post/lock" : "edit", selectedRecords[0])) return;
    const currentUser = getDemoSession()?.name || PRESENTATION_USER_NAME;
    const result = runInventoryAction(action, selectedRecords as DemoRecord[], currentUser);
    if ("error" in result) { notify(String(result.error)); return; }
    const updates = "sourceUpdates" in result ? (result as { sourceUpdates?: Record<string, string>[] }).sourceUpdates : undefined;
    updates?.forEach((values, index) => {
      const record = selectedRecords[index];
      if (record) store.update(record.__id, values);
    });
    audit.add({ action: action.replaceAll("-", " ").toUpperCase(), module: moduleConfig.title, record: selectedRecords.map(record => recordName(record)).join(", "), details: result.message });
    notify(result.message);
    const targetTab = "targetTab" in result ? result.targetTab : undefined;
    if (targetTab) setActiveTab(targetTab);
  };
  const runSelectedServiceAction = (action: ServiceAction) => {
    if (!guard("edit", selectedRecords[0])) return;
    const currentUser = getDemoSession()?.name || PRESENTATION_USER_NAME;
    const result = runServiceAction(action, activeTab, selectedRecords as DemoRecord[], currentUser);
    if ("error" in result) { notify(String(result.error)); return; }
    const updates = "sourceUpdates" in result ? (result as { sourceUpdates?: Record<string, string>[] }).sourceUpdates : undefined;
    updates?.forEach((values, index) => {
      const record = selectedRecords[index];
      if (record) store.update(record.__id, values);
    });
    audit.add({ action: action.replaceAll("-", " ").toUpperCase(), module: moduleConfig.title, record: selectedRecords.map(record => recordName(record)).join(", "), details: result.message });
    notify(result.message);
    const targetTab = "targetTab" in result ? result.targetTab : undefined;
    if (targetTab) setActiveTab(targetTab);
  };
  const runSelectedFinanceAction = (action: FinanceAction) => {
    if (!guard(action.includes("post") ? "finalize/post/lock" : "edit", selectedRecords[0])) return;
    const currentUser = getDemoSession()?.name || PRESENTATION_USER_NAME;
    const result = runFinanceAction(action, selectedRecords as DemoRecord[], currentUser);
    if ("error" in result) { notify(String(result.error)); return; }
    const updates = "sourceUpdates" in result ? (result as { sourceUpdates?: Record<string, string>[] }).sourceUpdates : undefined;
    updates?.forEach((values, index) => {
      const record = selectedRecords[index];
      if (record) store.update(record.__id, values);
    });
    audit.add({ action: action.replaceAll("-", " ").toUpperCase(), module: moduleConfig.title, record: selectedRecords.length ? selectedRecords.map(record => recordName(record)).join(", ") : activeTab, details: result.message });
    notify(result.message);
    if ("targetModule" in result && result.targetModule === moduleKey && result.targetTab) setActiveTab(result.targetTab);
  };
  const runSelectedShippingAction = (action: ShippingAction) => {
    if (!guard(action === "create-shipment" || action === "complete-delivery" ? "finalize/post/lock" : "edit", selectedRecords[0])) return;
    const currentUser = getDemoSession()?.name || PRESENTATION_USER_NAME;
    const result = runShippingAction(action, activeTab, selectedRecords as DemoRecord[], currentUser);
    if ("error" in result) { notify(String(result.error)); return; }
    const updates = "sourceUpdates" in result ? (result as { sourceUpdates?: Record<string, string>[] }).sourceUpdates : undefined;
    updates?.forEach((values, index) => {
      const record = selectedRecords[index];
      if (record) store.update(record.__id, values);
    });
    audit.add({ action: action.replaceAll("-", " ").toUpperCase(), module: moduleConfig.title, record: selectedRecords.length ? selectedRecords.map(record => recordName(record)).join(", ") : activeTab, details: result.message });
    notify(result.message);
    if ("targetTab" in result && result.targetTab) setActiveTab(result.targetTab);
  };
  const runSelectedProjectAction = (action: ProjectAction) => {
    if (!guard(action.includes("billing") ? "approve" : "edit", selectedRecords[0])) return;
    const currentUser = getDemoSession()?.name || PRESENTATION_USER_NAME;
    const result = runProjectAction(action, activeTab, selectedRecords as DemoRecord[], currentUser);
    if ("error" in result) { notify(String(result.error)); return; }
    const updates = "sourceUpdates" in result ? (result as { sourceUpdates?: Record<string, string>[] }).sourceUpdates : undefined;
    updates?.forEach((values, index) => {
      const record = selectedRecords[index];
      if (record) store.update(record.__id, values);
    });
    if ("createdRows" in result && result.createdRows?.length && result.targetTab === activeTab) store.upsertMany(result.upsertKey || columns[0], result.createdRows);
    audit.add({ action: action.replaceAll("-", " ").toUpperCase(), module: moduleConfig.title, record: selectedRecords.length ? selectedRecords.map(record => recordName(record)).join(", ") : activeTab, details: result.message });
    notify(result.message);
    if ("targetTab" in result && result.targetTab) setActiveTab(result.targetTab);
  };
  const applySalesLeadAction = (action: "claim" | "release" | "qualify" | "nurture" | "disqualify" | "conflict" | "convert") => {
    if (!guard("edit", selectedRecords[0])) return;
    if (!selectedRecords.length || !salesCrmConfig) return;
    const currentUser = getDemoSession()?.name || PRESENTATION_USER_NAME;
    if (action === "convert") {
      const blocked = selectedRecords.find(record => !canConvertLead(record));
      if (blocked) { notify(`${recordName(blocked)} is not qualified for opportunity conversion`); return; }
      selectedRecords.forEach((record, index) => {
        opportunitiesStore.create(buildOpportunityFromLead(record, opportunitiesStore.records.length + index));
        store.update(record.__id, { "Current Status": "Opportunity Created" });
      });
      audit.add({ action: "CONVERT", module: moduleConfig.title, record: selectedRecords.map(record => recordName(record)).join(", "), details: `${selectedRecords.length} qualified lead${selectedRecords.length === 1 ? "" : "s"} converted to local opportunities` });
      notify(`${selectedRecords.length} ${selectedRecords.length === 1 ? "opportunity" : "opportunities"} created locally`);
      return;
    }
    const updates: Array<{ record: DemoRecord; values: Record<string, string> }> = [];
    for (const record of selectedRecords) {
      const result = applyLeadAction(action, record, currentUser);
      if (typeof result === "string") { notify(result); return; }
      updates.push({ record, values: result });
    }
    updates.forEach(({ record, values }) => store.update(record.__id, values));
    const label = action === "claim" ? "CLAIM" : action === "release" ? "RELEASE CLAIM" : action === "qualify" ? "QUALIFY" : action === "nurture" ? "NURTURE" : action === "disqualify" ? "DISQUALIFY" : "CONFLICT REVIEW";
    audit.add({ action: label, module: moduleConfig.title, record: selectedRecords.map(record => recordName(record)).join(", "), details: `${activeTab} action applied to ${selectedRecords.length} local lead${selectedRecords.length === 1 ? "" : "s"}` });
    notify(`${label.toLowerCase()} applied to ${selectedRecords.length} lead${selectedRecords.length === 1 ? "" : "s"}`);
  };
  const runAutomations = () => {
    const rows = runLocalDemoAutomations(getDemoSession()?.name || PRESENTATION_USER_NAME);
    if (moduleKey === "admin" && activeTab === "Automation Monitor") store.upsertMany("Trigger Event No", rows);
    notify(`${rows.length} local demo automation trigger${rows.length === 1 ? "" : "s"} ran`);
  };
  const pdfTemplate = templateFor(moduleConfig.key, activeTab);
  const logPdf = (record = activeTab) => audit.add({ action: "PDF", module: moduleConfig.title, record, details: `${record} PDF generated` });
  const primaryAction = salesCrmConfig ? "Add Enquiry" : masterConfig ? `Add ${activeTab.replace(" Master", "").toLowerCase()}` : procurementConfig || inventoryConfig || projectConfig || serviceConfig ? `Add ${activeTab.replace(/s$/, "").toLowerCase()}` : isUserAdmin ? "Add user" : isRoleAdmin ? "New role" : moduleKey === "admin" && activeTab === "Company" ? "Add setting" : moduleKey === "admin" && activeTab === "Numbering" ? "Add sequence" : moduleConfig.primaryAction;

  if (!moduleConfig || !Icon) return null;
  if (moduleConfig.key === "reports") return <ReportsDashboardWorkspace />;

  return <div className="mx-auto max-w-[1600px] p-4 md:p-7">
    <input ref={importRef} type="file" className="hidden" accept={moduleKey === "finance" && activeTab === "Bank Reconciliation Import" ? ".xlsx,.xls,.csv" : ".xlsx,.xls"} onChange={event => validatedImportRecords(event.target.files?.[0])} />
    <div className="mb-6 flex flex-col justify-between gap-4 lg:flex-row lg:items-end"><div className="flex items-center gap-3.5"><div className={cn("grid h-12 w-12 place-items-center rounded-2xl", iconTones[moduleConfig.color])}><Icon className="h-6 w-6" /></div><div><div className="mb-1 flex items-center gap-2 text-[10px] font-bold uppercase tracking-[.14em] text-slate-400">MedTech Operations <span className="rounded-full bg-teal-50 px-2 py-0.5 text-[9px] text-teal-700 dark:bg-teal-950/50 dark:text-teal-300">Interactive demo</span></div><h1 className="text-2xl font-bold tracking-tight">{moduleConfig.title}</h1><p className="mt-1 text-xs text-[var(--muted)]">{moduleConfig.subtitle}</p></div></div><div className="flex flex-wrap items-center gap-2">{moduleConfig.key === "documents" && <Link href="/documents/templates" className="inline-flex h-9 items-center justify-center gap-2 rounded-lg border bg-[var(--panel)] px-3.5 text-sm font-semibold transition hover:bg-slate-50 dark:hover:bg-slate-800"><FileText className="h-4 w-4" /> PDF templates</Link>}{pdfTemplate && !usesCustomWorkspace && <a href={`/api/pdf/sample?template=${pdfTemplate}&download=1`} download onClick={() => logPdf()} className="inline-flex h-9 items-center justify-center gap-2 rounded-lg border bg-[var(--panel)] px-3.5 text-sm font-semibold transition hover:bg-slate-50 dark:hover:bg-slate-800"><FileText className="h-4 w-4 text-teal-600" /> Download PDF</a>}{!isAudit && !usesCustomWorkspace && <Button variant="secondary" onClick={() => importRef.current?.click()}><Upload className="h-4 w-4" /> Import Excel</Button>}{!usesCustomWorkspace && <Button variant="secondary" onClick={exportRecords}><FileDown className="h-4 w-4" /> Export Excel</Button>}{!isAudit && !usesCustomWorkspace && <Button onClick={openCreate}>{isUserAdmin ? <UserPlus className="h-4 w-4" /> : <Plus className="h-4 w-4" />} {primaryAction}</Button>}</div></div>

    {(isUserAdmin || isRoleAdmin) && <div className="mb-5 flex flex-col gap-3 rounded-2xl border border-teal-200 bg-teal-50 p-4 text-teal-900 dark:border-teal-900 dark:bg-teal-950/30 dark:text-teal-100 sm:flex-row sm:items-center"><div className="rounded-xl bg-white p-2.5 text-teal-600 dark:bg-slate-900"><ShieldCheck className="h-5 w-5" /></div><div className="flex-1"><div className="text-xs font-bold">{isUserAdmin ? "User access setup" : "Role and permission definitions"}</div><div className="mt-1 text-[11px] text-teal-700 dark:text-teal-300">{isUserAdmin ? "Add a user, assign a role and department, then give them the temporary password. Open any user row to change their role or suspend access." : "Open a role to change its module access and approval authority. User role assignments are managed from the Users tab."}</div></div></div>}

    <section className="mb-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{moduleConfig.stats.map((stat, index) => <div key={stat.label} className="rounded-2xl border bg-[var(--panel)] p-5 shadow-soft animate-in" style={{ animationDelay: `${index * 45}ms` }}><div className="flex items-center justify-between"><p className="text-xs font-medium text-[var(--muted)]">{stat.label}</p>{stat.delta && <span className={cn("rounded-full px-2 py-1 text-[10px] font-semibold", stat.delta.startsWith("-") ? "bg-rose-50 text-rose-600 dark:bg-rose-950" : "bg-emerald-50 text-emerald-600 dark:bg-emerald-950")}>{stat.delta}</span>}</div><div className={cn("mt-3 text-[22px] font-bold tracking-tight tabular", stat.tone === "warning" && "text-amber-600")}>{stat.value}</div><div className="mt-4 h-1 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800"><div className={cn("h-full rounded-full", stat.tone === "warning" ? "bg-amber-500" : "bg-teal-500")} style={{ width: `${58 + index * 9}%` }} /></div></div>)}</section>

    <section className="overflow-hidden rounded-2xl border bg-[var(--panel)] shadow-soft">
      <div className="flex flex-col justify-between gap-3 border-b px-5 pt-1 sm:flex-row sm:items-center"><div className="flex min-w-0 gap-1 overflow-x-auto">{moduleConfig.tabs.map(tab => <button key={tab} onClick={() => switchTab(tab)} className={cn("relative whitespace-nowrap px-3 py-4 text-xs font-semibold transition", activeTab === tab ? "text-teal-600" : "text-[var(--muted)] hover:text-[var(--text)]")}>{tab}{activeTab === tab && <span className="absolute inset-x-2 bottom-0 h-0.5 rounded-full bg-teal-500" />}</button>)}</div><div className="hidden items-center gap-1 sm:flex"><button title="List view" className="rounded-lg bg-slate-100 p-2 text-slate-600 dark:bg-slate-800"><List className="h-4 w-4" /></button><button title="Kanban view" onClick={() => notify("Kanban view is available for pipeline records")} className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"><Grid2X2 className="h-4 w-4" /></button><button title="Column settings" onClick={() => notify("All configured columns are visible")} className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"><Columns3 className="h-4 w-4" /></button></div></div>
      {salesWorkflowPathway ? <SalesWorkflowWorkspace initialPathway={salesWorkflowPathway} /> : isApprovalMatrix ? <ApprovalMatrixWorkspace /> : isCommissionWorkspace ? <CommissionWorkspace /> : isSalesCostingWorkspace ? <SalesCostingWorkspace /> : isPricingWorkspace ? <PricingEngineWorkspace /> : readinessView ? <MigrationReadinessWorkspace view={readinessView} /> : <>
      <div className="flex flex-wrap items-center gap-3 border-b px-5 py-3.5"><div className="relative min-w-[210px] flex-1 md:max-w-sm"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" /><input value={query} onChange={event => setQuery(event.target.value)} className="h-9 w-full rounded-lg border bg-[var(--panel)] pl-9 pr-3 text-sm outline-none transition focus:border-teal-500 focus:ring-2 focus:ring-teal-500/10" placeholder={`Search ${activeTab.toLowerCase()}...`} /></div>{statusColumn && <select aria-label={statusColumn === "Action" ? "Filter by action" : "Filter by status"} value={statusFilter} onChange={event => setStatusFilter(event.target.value)} className="h-9 rounded-lg border bg-[var(--panel)] px-3 text-xs font-medium outline-none"><option value="All">{filterLabel}</option>{statuses.map(status => <option key={status}>{status}</option>)}</select>}{masterFilterColumns.map(column => <select key={column} aria-label={`Filter by ${column}`} value={filterValues[column] ?? ""} onChange={event => setFilterValues(current => ({ ...current, [column]: event.target.value }))} className="h-9 rounded-lg border bg-[var(--panel)] px-3 text-xs font-medium outline-none"><option value="">{column}</option>{(masterFilterOptions[column] ?? []).map(option => <option key={option}>{option}</option>)}</select>)}<Button variant="secondary" onClick={resetData}><RotateCcw className="h-4 w-4" /> {isAutomationMonitor ? "Clear/Reset Demo Automation Events" : "Reset data"}</Button>{isAutomationMonitor && <Button onClick={runAutomations}><Play className="h-4 w-4" /> Run Demo Automations</Button>}{approvalSources.length > 0 && <Button variant="secondary" onClick={submitSelectedApprovals}><ShieldCheck className="h-4 w-4" /> Submit approval</Button>}{serviceActions.length > 0 && selectedRecords.length > 0 && serviceActions.map(item => <Button key={item.action} variant="secondary" onClick={() => runSelectedServiceAction(item.action)}><FileText className="h-4 w-4" /> {item.label}</Button>)}{financeActions.length > 0 && (selectedRecords.length > 0 || financeActions.some(item => item.requiresSelection === false)) && financeActions.map(item => <Button key={item.action} variant="secondary" onClick={() => runSelectedFinanceAction(item.action)}><FileText className="h-4 w-4" /> {item.label}</Button>)}{shippingActions.length > 0 && (selectedRecords.length > 0 || shippingActions.some(item => item.requiresSelection === false)) && shippingActions.map(item => <Button key={item.action} variant="secondary" onClick={() => runSelectedShippingAction(item.action)}><FileText className="h-4 w-4" /> {item.label}</Button>)}{projectActions.length > 0 && (selectedRecords.length > 0 || projectActions.some(item => item.requiresSelection === false)) && projectActions.map(item => <Button key={item.action} variant="secondary" onClick={() => runSelectedProjectAction(item.action)}><FileText className="h-4 w-4" /> {item.label}</Button>)}{procurementActions.length > 0 && selectedRecords.length > 0 && procurementActions.map(item => <Button key={item.action} variant="secondary" onClick={() => runSelectedProcurementAction(item.action)}><FileText className="h-4 w-4" /> {item.label}</Button>)}{inventoryActions.length > 0 && selectedRecords.length > 0 && inventoryActions.map(item => <Button key={item.action} variant="secondary" onClick={() => runSelectedInventoryAction(item.action)}><FileText className="h-4 w-4" /> {item.label}</Button>)}{salesCrmConfig && selectedRecords.length > 0 && <><Button variant="secondary" onClick={() => applySalesLeadAction("claim")}><UserPlus className="h-4 w-4" /> Claim</Button><Button variant="secondary" onClick={() => applySalesLeadAction("release")}>Release Claim</Button><Button variant="secondary" onClick={() => applySalesLeadAction("qualify")}><CheckCircle2 className="h-4 w-4 text-emerald-500" /> Qualify</Button><Button variant="secondary" onClick={() => applySalesLeadAction("nurture")}>Mark as Nurture</Button><Button variant="secondary" onClick={() => applySalesLeadAction("disqualify")}><XCircle className="h-4 w-4 text-rose-500" /> Disqualify</Button><Button onClick={() => applySalesLeadAction("convert")}><FileText className="h-4 w-4" /> Convert to Opportunity</Button><Button variant="secondary" onClick={() => applySalesLeadAction("conflict")}>Create Conflict Review</Button></>}{!salesCrmConfig && !isAudit && selectedRecords.length > 0 && <><Button variant="secondary" onClick={() => applyWorkflowAction("submit")}><ShieldCheck className="h-4 w-4" /> Submit</Button><Button variant="secondary" onClick={() => applyWorkflowAction("approve")}><CheckCircle2 className="h-4 w-4 text-emerald-500" /> Approve</Button><Button variant="secondary" onClick={() => applyWorkflowAction("reject")}><XCircle className="h-4 w-4 text-rose-500" /> Reject</Button><Button variant="secondary" onClick={() => applyWorkflowAction("cancel")}>Cancel</Button><Button onClick={downloadDetailedPdf}><FileText className="h-4 w-4" /> Download detailed PDF ({selectedRecords.length})</Button></>}{sortColumn && <span className="text-[10px] text-slate-400">Sorted by <b className="text-[var(--text)]">{sortColumn}</b> ({sortDirection})</span>}</div>
      {importErrors.length > 0 && <div className="border-b border-amber-200 bg-amber-50 px-5 py-3 text-xs text-amber-900 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-200"><div className="font-semibold">Import validation skipped {importErrors.length} row{importErrors.length === 1 ? "" : "s"}</div><div className="mt-1 flex flex-wrap gap-x-4 gap-y-1">{importErrors.map(error => <span key={`${error.row}-${error.message}`}>Row {error.row}: {error.message.replace(/^Row \d+:\s*/, "")}</span>)}</div></div>}
      {isSalesQuotation && <div className="border-b border-amber-200 bg-amber-50 px-5 py-3 text-xs text-amber-900 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-200"><b>Pricing control:</b> final quotations require approved costing, active pricelist, or active customer contract pricing.</div>}
      {sourcePreview && <div className="border-b bg-teal-50/70 px-5 py-3 text-xs text-teal-950 dark:bg-teal-950/20 dark:text-teal-100"><div className="flex flex-wrap items-center gap-2"><b>Source record:</b><span>{sourcePreview["Source Module"]}</span><span>{sourcePreview["Source Record"]}</span><StatusBadge>{sourcePreview.Status}</StatusBadge><button onClick={() => setSourcePreview(null)} className="ml-auto font-semibold text-teal-700 dark:text-teal-300">Close</button></div><div className="mt-1 text-teal-800 dark:text-teal-200">{sourcePreview["Action Taken"]} - {sourcePreview.Notes}</div></div>}
      <div className="overflow-x-auto"><table className="w-full min-w-[800px] border-collapse text-left"><thead><tr className="border-b bg-slate-50/70 dark:bg-slate-900/40">{!isAudit && <th className="w-12 px-4 py-3"><input aria-label="Select all visible records" type="checkbox" checked={filtered.length > 0 && filtered.every(record => selectedIdSet.has(record.__id))} onChange={toggleAllVisible} className="h-4 w-4 rounded border-slate-300 accent-teal-600" /></th>}{columns.map(column => <th key={column} className="px-5 py-3"><button aria-label={`Sort by ${column}`} onClick={() => toggleSort(column)} className="flex items-center gap-1.5 text-left text-[10px] font-bold uppercase tracking-[.08em] text-slate-400 transition hover:text-teal-600">{column}{sortColumn === column ? sortDirection === "asc" ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" /> : <ArrowUpDown className="h-3 w-3 opacity-40" />}</button></th>)}<th className="w-20 px-4 py-3" /></tr></thead><tbody className="divide-y">{filtered.map(record => <tr key={record.__id} onDoubleClick={() => openRecord(record)} className={cn("group cursor-default transition hover:bg-slate-50/70 dark:hover:bg-slate-800/30", selectedIdSet.has(record.__id) && "bg-teal-50/70 dark:bg-teal-950/20")}>{!isAudit && <td className="px-4 py-4"><input aria-label={`Select ${recordName(record)}`} type="checkbox" checked={selectedIdSet.has(record.__id)} onChange={() => toggleSelected(record.__id)} onClick={event => event.stopPropagation()} className="h-4 w-4 rounded border-slate-300 accent-teal-600" /></td>}{columns.map((column, columnIndex) => <td key={column} className={cn("px-5 py-4 text-xs", columnIndex === 0 ? "font-semibold text-[var(--text)]" : "text-[var(--muted)]")}>{column.toLowerCase().includes("status") || ["Stage","Access","Format","Action"].includes(column) ? <StatusBadge>{record[column]}</StatusBadge> : record[column]}</td>)}<td className="px-4"><div className="flex items-center justify-end gap-1">{moduleConfig.key === "reports" && <a aria-label={`Download ${recordName(record)} PDF`} title="Download PDF" href="/api/pdf/sample?template=report&download=1" download onClick={() => logPdf(recordName(record))} className="rounded-lg p-2 text-teal-600 transition hover:bg-teal-50 dark:hover:bg-teal-950/50"><FileText className="h-4 w-4" /></a>}{isAutomationMonitor && <button aria-label={`View source for ${recordName(record)}`} title="View Source Record" onClick={() => viewAutomationSource(record)} className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-semibold text-teal-700 transition hover:bg-teal-50 dark:text-teal-300 dark:hover:bg-teal-950/40"><Eye className="h-3.5 w-3.5" /> Source</button>}{!isAudit && <button aria-label={`Open ${recordName(record)}`} onClick={() => openRecord(record)} className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 group-hover:text-teal-600 dark:hover:bg-slate-700"><Ellipsis className="h-4 w-4" /></button>}</div></td></tr>)}{filtered.length === 0 && <tr><td colSpan={columns.length + (isAudit ? 1 : 2)} className="px-6 py-16 text-center"><Search className="mx-auto h-8 w-8 text-slate-300" /><div className="mt-3 text-sm font-semibold">No matching records</div><div className="mt-1 text-xs text-slate-400">Change the search or filter.</div></td></tr>}</tbody></table></div>
      <div className="flex items-center justify-between border-t px-5 py-3 text-[11px] text-slate-400"><span>{selectedRecords.length > 0 ? `${selectedRecords.length} selected · ` : ""}Showing {filtered.length} of {records.length} {isAudit ? "audit events" : "local demo records"}</span><div className="flex items-center gap-2">{!isAudit && <span className="hidden sm:inline">Select rows for a detailed PDF · Double-click to edit</span>}<Button variant="ghost" className="h-7 px-2 text-[11px]" onClick={exportRecords}><Download className="h-3.5 w-3.5" /> Download Excel</Button></div></div>
    </>}
    </section>
    {!usesCustomWorkspace && !isAudit && <RecordModal open={modalOpen} title={selected ? `Edit ${activeTab} record` : primaryAction} columns={columns} formColumns={formColumns} selectOptions={selectOptions} defaultValues={formDefaults} fieldTypes={fieldTypes} suggestions={suggestions} record={selected} approvalMode={moduleConfig.key === "approvals" && activeTab === "My approvals"} onClose={() => setModalOpen(false)} onSave={save} onDelete={selected ? remove : undefined} onDecision={decide} />}
    {toast && <div role="status" className="fixed bottom-5 right-5 z-[100] flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-3 text-xs font-medium text-white shadow-panel animate-in"><CheckCircle2 className="h-4 w-4 text-teal-400" />{toast}</div>}
  </div>;
}

function templateFor(moduleKey: string, tab: string): PdfTemplate | null {
  if (moduleKey === "reports") return "report";
  if (moduleKey === "sales") return tab === "Quotations" ? "quotation" : tab === "Orders" ? "invoice" : null;
  if (moduleKey === "finance") return tab === "Payments" ? "payment_voucher" : tab === "Customer Invoices" || tab === "Vendor Bills" || tab === "Advance / Progress / Retention Invoices" ? "invoice" : null;
  if (moduleKey === "procurement") return ["Purchase Orders", "Purchase orders", "Purchase Requests", "Purchase requests", "PO Documents"].includes(tab) ? "purchase_order" : null;
  if (moduleKey === "shipping") return tab === "Packing Lists" ? "packing_list" : tab === "Customs / Clearance Documents" ? "report" : "delivery_note";
  if (moduleKey === "service") return "service_report";
  if (moduleKey === "hr") return tab === "Letters" ? "employee_letter" : tab === "Leave" ? "leave_approval" : null;
  return null;
}
function detailTemplateFor(moduleKey: string, tab: string): PdfTemplate {
  if (moduleKey === "procurement" && tab === "RFQs") return "rfq";
  return templateFor(moduleKey, tab) ?? "report";
}
