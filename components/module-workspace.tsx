"use client";

import { useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { ArrowDown, ArrowUp, ArrowUpDown, CheckCircle2, Download, Ellipsis, Eye, FileDown, FileText, Play, Plus, RotateCcw, Search, ShieldCheck, Upload, UserPlus, XCircle } from "lucide-react";
import { getModule } from "@/lib/erp-data";
import { ActionMenu, Button, StatusBadge } from "@/components/ui";
import { ApprovalMatrixWorkspace } from "@/components/approval-matrix-workspace";
import { CommissionWorkspace } from "@/components/commission-workspace";
import { cn } from "@/lib/utils";
import { useDemoRecords, type DemoRecord } from "@/lib/demo-store";
import { auditSeverities, auditSummary, useAuditLog } from "@/lib/audit-store";
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
import { getQualityConfig, qualityActionsFor, runQualityAction, type QualityAction } from "@/lib/quality-workflow";
import { documentActionsFor, getAttachmentConfig, runDocumentAction, type DocumentAction } from "@/lib/attachment-workflow";
import { getProjectConfig, projectActionsFor, runProjectAction, type ProjectAction } from "@/lib/project-workflow";
import { getServiceConfig, runServiceAction, serviceActionsFor, type ServiceAction } from "@/lib/service-workflow";
import { ReportsDashboardWorkspace } from "@/components/reports-dashboard-workspace";
import { MigrationReadinessWorkspace } from "@/components/migration-readiness-workspace";
import { SalesCostingWorkspace } from "@/components/sales-costing-workspace";
import { approvedCostingExists } from "@/lib/sales-costing";
import { validateQuotationPricing } from "@/lib/pricing-engine";
import { erpRoles, permissionError, permissionModule, segregationWarning, type ErpAction } from "@/lib/erp-security";
import { PricingEngineWorkspace } from "@/components/pricing-engine-workspace";
import { LocalDataToolsWorkspace } from "@/components/local-data-tools-workspace";

const coreIconTone = "bg-[var(--navy-tint)] text-medtech-navy dark:bg-[var(--elevated)] dark:text-red-100";
const iconTones: Record<string, string> = {
  emerald: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/45 dark:text-emerald-300",
  amber: "bg-amber-50 text-amber-700 dark:bg-amber-950/45 dark:text-amber-300",
  rose: "bg-rose-50 text-rose-700 dark:bg-rose-950/45 dark:text-rose-300",
  navy: coreIconTone,
  slate: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200",
  violet: coreIconTone,
  blue: coreIconTone,
  cyan: coreIconTone,
  orange: coreIconTone,
  indigo: coreIconTone,
  sky: coreIconTone,
  purple: coreIconTone
};
const auditColumns = ["Time", "User", "Role", "Action", "Module", "Record", "Details", "Before", "After", "Result", "Severity", "IP address"];
const PAGE_SIZE = 50;

export function ModuleWorkspace({ moduleKey }: { moduleKey: string }) {
  const moduleConfig = getModule(moduleKey);
  const [activeTab, setActiveTab] = useState(moduleConfig?.tabs[0] ?? "Records");
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [sortColumn, setSortColumn] = useState("");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
  const [page, setPage] = useState(1);
  const [modalOpen, setModalOpen] = useState(false);
  const [selected, setSelected] = useState<DemoRecord | null>(null);
  const [sourcePreview, setSourcePreview] = useState<DemoRecord | null>(null);
  const [toast, setToast] = useState("");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [filterValues, setFilterValues] = useState<Record<string, string>>({});
  const [dateFilters, setDateFilters] = useState({ from: "", to: "" });
  const [auditFilters, setAuditFilters] = useState({ from: "", to: "", module: "", user: "", severity: "" });
  const [importErrors, setImportErrors] = useState<Array<{ row: number; message: string }>>([]);
  const importRef = useRef<HTMLInputElement>(null);
  const view = useMemo(() => moduleConfig ? getDemoTabView(moduleConfig, activeTab) : { columns: [], rows: [] }, [moduleConfig, activeTab]);
  const masterConfig = useMemo(() => getMasterDataConfig(moduleKey, activeTab), [moduleKey, activeTab]);
  const salesCrmConfig = useMemo(() => getSalesCrmConfig(moduleKey, activeTab), [moduleKey, activeTab]);
  const procurementConfig = useMemo(() => moduleKey === "procurement" ? getProcurementConfig(activeTab) : null, [activeTab, moduleKey]);
  const inventoryConfig = useMemo(() => moduleKey === "inventory" ? getInventoryConfig(activeTab) : null, [activeTab, moduleKey]);
  const financeConfig = useMemo(() => moduleKey === "finance" ? getFinanceConfig(activeTab) : null, [activeTab, moduleKey]);
  const shippingConfig = useMemo(() => moduleKey === "shipping" ? getShippingConfig(activeTab) : null, [activeTab, moduleKey]);
  const qualityConfig = useMemo(() => moduleKey === "quality" ? getQualityConfig(activeTab) : null, [activeTab, moduleKey]);
  const attachmentConfig = useMemo(() => moduleKey === "documents" ? getAttachmentConfig(activeTab) : null, [activeTab, moduleKey]);
  const projectConfig = useMemo(() => moduleKey === "projects" ? getProjectConfig(activeTab) : null, [activeTab, moduleKey]);
  const serviceConfig = useMemo(() => moduleKey === "service" ? getServiceConfig(activeTab) : null, [activeTab, moduleKey]);
  const salesWorkflowPathway = useMemo(() => moduleKey === "sales" ? pathwayForSalesTab(activeTab) : null, [activeTab, moduleKey]);
  const isApprovalMatrix = moduleKey === "approvals" && activeTab === "Approval Matrix";
  const isCommissionWorkspace = moduleKey === "sales" && activeTab === "Commissions";
  const isSalesCostingWorkspace = moduleKey === "sales" && activeTab === "Estimation / Costing";
  const isPricingWorkspace = moduleKey === "sales" && activeTab === "Pricing Engine";
  const isLocalDataTools = moduleKey === "admin" && activeTab === "Local Data Tools";
  const readinessView = moduleKey === "admin" && activeTab === "Data Import Center" ? "import" : moduleKey === "admin" && activeTab === "Migration Reconciliation" ? "reconciliation" : moduleKey === "admin" && activeTab === "UAT Tracker" ? "uat" : null;
  const usesCustomWorkspace = Boolean(salesWorkflowPathway || isApprovalMatrix || isCommissionWorkspace || isSalesCostingWorkspace || isPricingWorkspace || isLocalDataTools || readinessView);
  const tableConfig = masterConfig ?? salesCrmConfig ?? procurementConfig ?? inventoryConfig ?? financeConfig ?? shippingConfig ?? qualityConfig ?? attachmentConfig ?? projectConfig ?? serviceConfig;
  const store = useDemoRecords(`${moduleKey}:${activeTab}`, view.rows);
  const opportunityView = moduleConfig ? getDemoTabView(moduleConfig, "Opportunities") : { columns: [], rows: [] };
  const opportunitiesStore = useDemoRecords(moduleKey === "sales" ? "sales:Opportunities" : `${moduleKey}:__opportunities`, opportunityView.rows);
  const audit = useAuditLog();
  const isAudit = moduleKey === "admin" && activeTab === "Audit log";
  const isAutomationMonitor = moduleKey === "admin" && activeTab === "Automation Monitor";
  const isSalesQuotation = moduleKey === "sales" && activeTab === "Quotations";
  const columns = isAudit ? auditColumns : view.columns;
  const records = useMemo(() => isAudit ? audit.entries : salesCrmConfig ? store.records.map(record => enrichSalesLead(record)) : store.records, [audit.entries, isAudit, salesCrmConfig, store.records]);
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
  const suggestions = useMemo(() => ({ ...(moduleKey === "procurement" && activeTab === "RFQs" ? supplierSuggestions() : {}), ...((masterConfig ?? procurementConfig ?? inventoryConfig ?? shippingConfig ?? qualityConfig ?? attachmentConfig ?? projectConfig ?? serviceConfig)?.suggestions ?? {}) }), [activeTab, moduleKey, masterConfig, procurementConfig, inventoryConfig, shippingConfig, qualityConfig, attachmentConfig, projectConfig, serviceConfig]);
  const deferredQuery = useDeferredValue(query);

  useEffect(() => { setQuery(""); setStatusFilter("All"); setSortColumn(""); setSelected(null); setSourcePreview(null); setSelectedIds([]); setFilterValues({}); setDateFilters({ from: "", to: "" }); setAuditFilters({ from: "", to: "", module: "", user: "", severity: "" }); setImportErrors([]); setModalOpen(false); setPage(1); }, [activeTab]);
  useEffect(() => { setPage(1); }, [deferredQuery, statusFilter, sortColumn, sortDirection, filterValues, dateFilters, auditFilters]);
  const Icon = moduleConfig?.icon;
  const statusColumn = columns.find(column => ["status", "stage", "access", "action"].includes(column.toLowerCase()));
  const filterLabel = statusColumn === "Action" ? "All actions" : "All statuses";
  const statuses = useMemo(() => statusColumn ? Array.from(new Set(records.map(record => record[statusColumn]).filter(Boolean))).sort() : [], [records, statusColumn]);
  const masterFilterColumns = useMemo(() => Array.from(new Set([...(tableConfig?.filterColumns ?? []), ...columns.filter(isUsefulFilterColumn)])).filter(column => column !== statusColumn), [tableConfig, columns, statusColumn]);
  const masterFilterOptions = useMemo(() => Object.fromEntries(masterFilterColumns.map(column => [column, Array.from(new Set(records.map(record => record[column]).filter(Boolean))).sort()])), [masterFilterColumns, records]);
  const dateFilterColumn = useMemo(() => columns.find(isDateFilterColumn) ?? "", [columns]);
  const auditFilterOptions = useMemo(() => ({
    modules: Array.from(new Set(records.map(record => record.Module).filter(Boolean))).sort(),
    users: Array.from(new Set(records.map(record => record.User).filter(Boolean))).sort()
  }), [records]);
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
    const search = deferredQuery.trim().toLowerCase();
    return searchableRecords.filter(({ record, searchText }) => {
    const matchesSearch = !search || searchText.includes(search);
    const matchesStatus = statusFilter === "All" || (statusColumn && record[statusColumn] === statusFilter);
    const matchesMasterFilters = masterFilterColumns.every(column => !filterValues[column] || record[column] === filterValues[column]);
    const date = dateFilterColumn ? dateValue(record[dateFilterColumn]) : 0;
    const fromFilter = dateFilters.from ? new Date(`${dateFilters.from}T00:00:00`).getTime() : 0;
    const toFilter = dateFilters.to ? new Date(`${dateFilters.to}T23:59:59`).getTime() : Number.POSITIVE_INFINITY;
    const matchesDateFilters = !dateFilterColumn || ((!dateFilters.from || date >= fromFilter) && (!dateFilters.to || date <= toFilter));
    const time = auditTime(record.Time);
    const from = auditFilters.from ? new Date(`${auditFilters.from}T00:00:00`).getTime() : 0;
    const to = auditFilters.to ? new Date(`${auditFilters.to}T23:59:59`).getTime() : Number.POSITIVE_INFINITY;
    const matchesAuditFilters = !isAudit ||
      (!auditFilters.module || record.Module === auditFilters.module) &&
      (!auditFilters.user || record.User === auditFilters.user) &&
      (!auditFilters.severity || record.Severity === auditFilters.severity) &&
      (!auditFilters.from || time >= from) &&
      (!auditFilters.to || time <= to);
    return matchesSearch && matchesStatus && matchesMasterFilters && matchesDateFilters && matchesAuditFilters;
  }).map(item => item.record).sort((a, b) => {
    if (!sortColumn) return 0;
    const comparison = (a[sortColumn] ?? "").localeCompare(b[sortColumn] ?? "", undefined, { numeric: true, sensitivity: "base" });
    return sortDirection === "asc" ? comparison : -comparison;
  });
  }, [searchableRecords, deferredQuery, statusFilter, statusColumn, sortColumn, sortDirection, masterFilterColumns, filterValues, dateFilterColumn, dateFilters, auditFilters, isAudit]);
  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount);
  const visibleRecords = useMemo(() => filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE), [filtered, currentPage]);
  const selectedRecords = useMemo(() => selectedIds.map(id => recordById.get(id)).filter((record): record is DemoRecord => Boolean(record)), [recordById, selectedIds]);
  const approvalSources = useMemo(() => selectedRecords.map(record => approvalSourceFromRecord(moduleKey, activeTab, record, getDemoSession()?.name || PRESENTATION_USER_NAME)).filter((source): source is ApprovalSource => Boolean(source)), [activeTab, moduleKey, selectedRecords]);
  const procurementActions = useMemo(() => moduleKey === "procurement" ? procurementActionsFor(activeTab) : [], [activeTab, moduleKey]);
  const inventoryActions = useMemo(() => moduleKey === "inventory" ? inventoryActionsFor(activeTab) : [], [activeTab, moduleKey]);
  const financeActions = useMemo(() => financeActionsFor(moduleKey, activeTab), [activeTab, moduleKey]);
  const shippingActions = useMemo(() => shippingActionsFor(moduleKey, activeTab), [activeTab, moduleKey]);
  const qualityActions = useMemo(() => moduleKey === "quality" ? qualityActionsFor(activeTab) : [], [activeTab, moduleKey]);
  const documentActions = useMemo(() => moduleKey === "documents" ? documentActionsFor(activeTab) : [], [activeTab, moduleKey]);
  const projectActions = useMemo(() => moduleKey === "projects" ? projectActionsFor(activeTab) : [], [activeTab, moduleKey]);
  const serviceActions = useMemo(() => moduleKey === "service" ? serviceActionsFor(activeTab) : [], [activeTab, moduleKey]);
  const session = getDemoSession();
  const accessModule = permissionModule(moduleKey, activeTab);

  const notify = (message: string) => { setToast(message); window.setTimeout(() => setToast(""), 2600); };
  const guard = (action: ErpAction, record?: Record<string, string> | null) => {
    const error = permissionError(session, accessModule, action) || segregationWarning({ action, moduleName: accessModule, record, session });
    if (error) {
      notify(error);
      audit.add({ action: "PERMISSION DENIED", module: String(accessModule), record: record?.[columns[0]] || activeTab, details: error, result: "failure", severity: "high" });
    }
    return !error;
  };
  const switchTab = (tab: string) => setActiveTab(tab);
  const toggleSort = (column: string) => { if (sortColumn === column) setSortDirection(direction => direction === "asc" ? "desc" : "asc"); else { setSortColumn(column); setSortDirection("asc"); } };
  const toggleSelected = (id: string) => setSelectedIds(current => current.includes(id) ? current.filter(value => value !== id) : [...current, id]);
  const toggleAllVisible = () => {
    const visibleIds = visibleRecords.map(record => record.__id);
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
      audit.add({ action: roleChanged ? "ROLE CHANGE" : selected ? "UPDATE USER" : "CREATE USER", module: "Administration", record: values.Email, details: roleChanged ? `${selected.Role} -> ${values.Role}` : `${values.User} - ${values.Role}`, before: auditSummary(selected), after: auditSummary(values), severity: roleChanged ? "warning" : "info" });
      notify(selected ? "User account updated" : "User created and ready to sign in"); setModalOpen(false); return;
    }
    if (selected) { store.update(selected.__id, values); audit.add({ action: "UPDATE", module: moduleConfig.title, record: recordName(values), details: `${activeTab} record updated`, before: auditSummary(selected), after: auditSummary(values) }); notify("Record updated successfully"); }
    else { store.create(values); audit.add({ action: "CREATE", module: moduleConfig.title, record: recordName(values), details: `${activeTab} record created`, after: auditSummary(values) }); notify("New record created successfully"); }
    setModalOpen(false);
  };
  const remove = () => { if (!selected || !guard("delete/archive", selected)) return; const name = recordName(selected); store.remove(selected.__id); audit.add({ action: "DELETE", module: moduleConfig.title, record: name, details: `${activeTab} record removed from the demo dataset`, before: auditSummary(selected), severity: "warning" }); setModalOpen(false); notify("Record removed from the demo dataset"); };
  const decide = (decision: "Approved" | "Rejected") => { if (!selected || !guard(decision === "Approved" ? "approve" : "reject", selected)) return; store.update(selected.__id, { Status: decision }); audit.add({ action: decision === "Approved" ? "APPROVE" : "REJECT", module: moduleConfig.title, record: recordName(selected), details: `${activeTab} request ${decision.toLowerCase()}`, before: auditSummary(selected), after: auditSummary({ ...selected, Status: decision }), severity: "warning" }); setModalOpen(false); notify(`Request ${decision.toLowerCase()}`); };
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
      const prefix = selectedRecords.length > 1 ? `${recordName(record)}  -  ` : "";
      const fields = Object.entries(record).filter(([key]) => !key.startsWith("__") && key !== "Password").map(([key, value]) => [`${prefix}${key}`, value] as [string, string]);
      return index > 0 ? [["Selected record", `${index + 1} of ${selectedRecords.length}`] as [string, string], ...fields] : fields;
    });
    const partyName = first.Supplier || first.Customer || first.Client || first.Employee || first.User || "MedTech Corporation Trading";
    const result = await generateBrandedPdf({
      template: templateForDocumentType(documentType) ?? detailTemplateFor(moduleConfig.key, activeTab), documentNumber, date: new Intl.DateTimeFormat("en-GB", { dateStyle: "long" }).format(new Date()),
      partyLabel: first.Supplier ? "Supplier" : first.Customer ? "Customer" : first.Client ? "Client" : "Record owner", partyName,
      subject: `${moduleConfig.title}  -  ${activeTab} detailed record`, metadata,
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
  const importRecords = async (file?: File) => { if (!file || isAudit) return; const result = await parseExcel<Record<string, string>>(file, row => Object.fromEntries(columns.map(column => [column, String((row as Record<string, unknown>)[column] ?? "")]))) ; if (result.valid.length) { store.importMany(result.valid); audit.add({ action: "IMPORT", module: moduleConfig.title, record: activeTab, details: `${result.valid.length} records imported from ${file.name}` }); } notify(`${result.valid.length} records imported${result.errors.length ? `  -  ${result.errors.length} skipped` : ""}`); if (importRef.current) importRef.current.value = ""; };
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
      notify(`${result.valid.length} records imported${result.errors.length ? `  -  ${result.errors.length} skipped` : ""}`);
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
    notify(`${result.valid.length} records imported${result.errors.length ? `  -  ${result.errors.length} skipped` : ""}`);
    if (importRef.current) importRef.current.value = "";
  };
  const resetData = () => { if (!guard("reset demo data")) return; if (!window.confirm(`Reset ${activeTab} demo data?`)) return; if (isAudit) audit.reset(); else store.reset(); setQuery(""); setStatusFilter("All"); setFilterValues({}); setDateFilters({ from: "", to: "" }); setImportErrors([]); setSortColumn(""); notify(isAudit ? "Audit log reset to sample events" : `${activeTab} reset to sample data`); };
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
  const runSelectedQualityAction = (action: QualityAction) => {
    if (!guard(action === "trace-recall" || action === "apply-qc-decision" ? "finalize/post/lock" : "edit", selectedRecords[0])) return;
    const currentUser = getDemoSession()?.name || PRESENTATION_USER_NAME;
    const result = runQualityAction(action, activeTab, selectedRecords as DemoRecord[], currentUser);
    if ("error" in result) { notify(String(result.error)); return; }
    const updates = "sourceUpdates" in result ? (result as { sourceUpdates?: Record<string, string>[] }).sourceUpdates : undefined;
    updates?.forEach((values, index) => {
      const record = selectedRecords[index];
      if (record) store.update(record.__id, values);
    });
    audit.add({ action: action.replaceAll("-", " ").toUpperCase(), module: moduleConfig.title, record: selectedRecords.map(record => recordName(record)).join(", "), details: result.message });
    notify(result.message);
    if ("targetTab" in result && result.targetTab && (!("targetModule" in result) || result.targetModule === moduleKey)) setActiveTab(result.targetTab);
  };
  const runSelectedDocumentAction = (action: DocumentAction) => {
    if (!guard(action === "archive-attachment" ? "delete/archive" : "edit", selectedRecords[0])) return;
    const currentUser = getDemoSession()?.name || PRESENTATION_USER_NAME;
    const result = runDocumentAction(action, selectedRecords as DemoRecord[], currentUser);
    if ("error" in result) { notify(String(result.error)); return; }
    const updates = "sourceUpdates" in result ? (result as { sourceUpdates?: Record<string, string>[] }).sourceUpdates : undefined;
    updates?.forEach((values, index) => {
      const record = selectedRecords[index];
      if (record) store.update(record.__id, values);
    });
    audit.add({ action: action.replaceAll("-", " ").toUpperCase(), module: moduleConfig.title, record: selectedRecords.map(record => recordName(record)).join(", "), details: result.message });
    notify(result.message);
    const targetTab = "targetTab" in result ? (result as { targetTab?: string }).targetTab : undefined;
    if (targetTab) setActiveTab(targetTab);
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
  const primaryAction = salesCrmConfig ? "Add Enquiry" : masterConfig ? `Add ${activeTab.replace(" Master", "").toLowerCase()}` : procurementConfig || inventoryConfig || qualityConfig || attachmentConfig || projectConfig || serviceConfig ? `Add ${activeTab.replace(/s$/, "").toLowerCase()}` : isUserAdmin ? "Add user" : isRoleAdmin ? "New role" : moduleKey === "admin" && activeTab === "Company" ? "Add setting" : moduleKey === "admin" && activeTab === "Numbering" ? "Add sequence" : moduleConfig.primaryAction;
  const selectedActionItems = [
    ...(isAutomationMonitor ? [{ label: "Run demo automations", icon: <Play className="h-3.5 w-3.5" />, onClick: runAutomations }] : []),
    ...(approvalSources.length > 0 ? [{ label: "Submit approval", icon: <ShieldCheck className="h-3.5 w-3.5" />, onClick: submitSelectedApprovals }] : []),
    ...serviceActions.filter(() => selectedRecords.length > 0).map(item => ({ label: item.label, icon: <FileText className="h-3.5 w-3.5" />, onClick: () => runSelectedServiceAction(item.action) })),
    ...financeActions.filter(item => selectedRecords.length > 0 || item.requiresSelection === false).map(item => ({ label: item.label, icon: <FileText className="h-3.5 w-3.5" />, onClick: () => runSelectedFinanceAction(item.action) })),
    ...shippingActions.filter(item => selectedRecords.length > 0 || item.requiresSelection === false).map(item => ({ label: item.label, icon: <FileText className="h-3.5 w-3.5" />, onClick: () => runSelectedShippingAction(item.action) })),
    ...qualityActions.filter(() => selectedRecords.length > 0).map(item => ({ label: item.label, icon: <FileText className="h-3.5 w-3.5" />, onClick: () => runSelectedQualityAction(item.action) })),
    ...documentActions.filter(() => selectedRecords.length > 0).map(item => ({ label: item.label, icon: <FileText className="h-3.5 w-3.5" />, onClick: () => runSelectedDocumentAction(item.action) })),
    ...projectActions.filter(item => selectedRecords.length > 0 || item.requiresSelection === false).map(item => ({ label: item.label, icon: <FileText className="h-3.5 w-3.5" />, onClick: () => runSelectedProjectAction(item.action) })),
    ...procurementActions.filter(() => selectedRecords.length > 0).map(item => ({ label: item.label, icon: <FileText className="h-3.5 w-3.5" />, onClick: () => runSelectedProcurementAction(item.action) })),
    ...inventoryActions.filter(() => selectedRecords.length > 0).map(item => ({ label: item.label, icon: <FileText className="h-3.5 w-3.5" />, onClick: () => runSelectedInventoryAction(item.action) })),
    ...(salesCrmConfig && selectedRecords.length > 0 ? [
      { label: "Claim", icon: <UserPlus className="h-3.5 w-3.5" />, onClick: () => applySalesLeadAction("claim") },
      { label: "Release claim", onClick: () => applySalesLeadAction("release") },
      { label: "Qualify", icon: <CheckCircle2 className="h-3.5 w-3.5" />, onClick: () => applySalesLeadAction("qualify") },
      { label: "Mark as nurture", onClick: () => applySalesLeadAction("nurture") },
      { label: "Disqualify", icon: <XCircle className="h-3.5 w-3.5" />, danger: true, onClick: () => window.confirm("Disqualify selected enquiry records?") && applySalesLeadAction("disqualify") },
      { label: "Convert to opportunity", icon: <FileText className="h-3.5 w-3.5" />, onClick: () => applySalesLeadAction("convert") },
      { label: "Create conflict review", onClick: () => applySalesLeadAction("conflict") }
    ] : []),
    ...(!salesCrmConfig && !isAudit && selectedRecords.length > 0 ? [
      { label: "Submit", icon: <ShieldCheck className="h-3.5 w-3.5" />, onClick: () => applyWorkflowAction("submit") },
      { label: "Approve", icon: <CheckCircle2 className="h-3.5 w-3.5" />, onClick: () => applyWorkflowAction("approve") },
      { label: "Reject", icon: <XCircle className="h-3.5 w-3.5" />, danger: true, onClick: () => window.confirm("Reject selected records?") && applyWorkflowAction("reject") },
      { label: "Cancel", danger: true, onClick: () => window.confirm("Cancel selected records?") && applyWorkflowAction("cancel") },
      { label: `Download detailed PDF (${selectedRecords.length})`, icon: <FileText className="h-3.5 w-3.5" />, onClick: downloadDetailedPdf }
    ] : [])
  ];

  if (!moduleConfig || !Icon) return null;
  if (moduleConfig.key === "reports") return <ReportsDashboardWorkspace />;

  return <div className="mx-auto max-w-[1600px] p-4 md:p-7">
    <input ref={importRef} type="file" className="hidden" accept={moduleKey === "finance" && activeTab === "Bank Reconciliation Import" ? ".xlsx,.xlsm,.csv" : ".xlsx,.xlsm"} onChange={event => validatedImportRecords(event.target.files?.[0])} />
    <div className="mb-6 flex flex-col justify-between gap-4 lg:flex-row lg:items-end"><div className="flex items-center gap-3.5"><div className={cn("grid h-12 w-12 place-items-center rounded-2xl", iconTones[moduleConfig.color])}><Icon className="h-6 w-6" /></div><div><div className="mb-1 flex items-center gap-2 text-[10px] font-bold uppercase tracking-[.14em] text-slate-400">MedTech Operations <span className="rounded-full bg-[var(--navy-tint)] px-2 py-0.5 text-[9px] text-medtech-navy dark:bg-[var(--elevated)] dark:text-red-200">Interactive demo</span></div><h1 className="text-2xl font-bold tracking-tight">{moduleConfig.title}</h1><p className="mt-1 text-xs text-[var(--muted)]">{moduleConfig.subtitle}</p></div></div><div className="flex flex-wrap items-center gap-2">{moduleConfig.key === "documents" && <Link href="/documents/templates" className="inline-flex h-9 items-center justify-center gap-2 rounded-lg border bg-[var(--panel)] px-3.5 text-sm font-semibold transition hover:bg-slate-50 dark:hover:bg-slate-800"><FileText className="h-4 w-4" /> PDF templates</Link>}{pdfTemplate && !usesCustomWorkspace && <a href={`/api/pdf/sample?template=${pdfTemplate}&download=1`} download onClick={() => logPdf()} className="inline-flex h-9 items-center justify-center gap-2 rounded-lg border bg-[var(--panel)] px-3.5 text-sm font-semibold transition hover:bg-slate-50 dark:hover:bg-slate-800"><FileText className="h-4 w-4 text-medtech-red" /> Download PDF</a>}{!isAudit && !usesCustomWorkspace && <Button variant="secondary" onClick={() => importRef.current?.click()}><Upload className="h-4 w-4" /> Import Excel</Button>}{!usesCustomWorkspace && <Button variant="secondary" onClick={exportRecords}><FileDown className="h-4 w-4" /> Export Excel</Button>}{!isAudit && !usesCustomWorkspace && <Button onClick={openCreate}>{isUserAdmin ? <UserPlus className="h-4 w-4" /> : <Plus className="h-4 w-4" />} {primaryAction}</Button>}</div></div>

    {(isUserAdmin || isRoleAdmin) && <div className="mb-5 flex flex-col gap-3 rounded-2xl border border-medtech-navy/20 bg-[var(--navy-tint)] p-4 text-medtech-deep dark:border-medtech-navy/50 dark:bg-[var(--elevated)] dark:text-red-100 sm:flex-row sm:items-center"><div className="rounded-xl bg-white p-2.5 text-medtech-red dark:bg-slate-900"><ShieldCheck className="h-5 w-5" /></div><div className="flex-1"><div className="text-xs font-bold">{isUserAdmin ? "User access setup" : "Role and permission definitions"}</div><div className="mt-1 text-[11px] text-medtech-navy dark:text-red-200">{isUserAdmin ? "Add a user, assign a role and department, then give them the temporary password. Open any user row to change their role or suspend access." : "Open a role to change its module access and approval authority. User role assignments are managed from the Users tab."}</div></div></div>}

    <section className="mb-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{moduleConfig.stats.map((stat, index) => <div key={stat.label} className="rounded-2xl border bg-[var(--panel)] p-5 shadow-soft animate-in" style={{ animationDelay: `${index * 45}ms` }}><div className="flex items-center justify-between"><p className="text-xs font-medium text-[var(--muted)]">{stat.label}</p>{stat.delta && <span className={cn("rounded-full px-2 py-1 text-[10px] font-semibold", stat.delta.startsWith("-") ? "bg-rose-50 text-rose-600 dark:bg-rose-950" : "bg-emerald-50 text-emerald-600 dark:bg-emerald-950")}>{stat.delta}</span>}</div><div className={cn("mt-3 text-[22px] font-bold tracking-tight tabular", stat.tone === "warning" && "text-amber-600")}>{stat.value}</div><div className="mt-4 h-1 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800"><div className={cn("h-full rounded-full", stat.tone === "warning" ? "bg-amber-500" : "bg-medtech-red")} style={{ width: `${58 + index * 9}%` }} /></div></div>)}</section>

    <section className="overflow-hidden rounded-2xl border bg-[var(--panel)] shadow-soft">
      <div className="flex flex-col justify-between gap-3 border-b px-5 pt-1 sm:flex-row sm:items-center"><div className="flex min-w-0 gap-1 overflow-x-auto">{moduleConfig.tabs.map(tab => <button key={tab} type="button" onClick={() => switchTab(tab)} className={cn("relative whitespace-nowrap px-3 py-4 text-xs font-semibold transition focus-visible:outline-none focus-visible:shadow-focus", activeTab === tab ? "text-medtech-red" : "text-[var(--muted)] hover:text-[var(--text)]")}>{tab}{activeTab === tab && <span className="absolute inset-x-2 bottom-0 h-0.5 rounded-full bg-medtech-red" />}</button>)}</div></div>
      {salesWorkflowPathway ? <SalesWorkflowWorkspace initialPathway={salesWorkflowPathway} /> : isApprovalMatrix ? <ApprovalMatrixWorkspace /> : isCommissionWorkspace ? <CommissionWorkspace /> : isSalesCostingWorkspace ? <SalesCostingWorkspace /> : isPricingWorkspace ? <PricingEngineWorkspace /> : isLocalDataTools ? <LocalDataToolsWorkspace /> : readinessView ? <MigrationReadinessWorkspace view={readinessView} /> : <>
      <div className="flex flex-wrap items-center gap-3 border-b px-5 py-3.5">
        <div className="relative min-w-[210px] flex-1 md:max-w-sm"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" /><input value={query} onChange={event => setQuery(event.target.value)} className="h-9 w-full rounded-lg border bg-[var(--panel)] pl-9 pr-3 text-sm outline-none transition focus:border-medtech-red focus:ring-2 focus:ring-[var(--focus-ring)]" placeholder={`Search ${activeTab.toLowerCase()}...`} /></div>
        {statusColumn && <select aria-label={statusColumn === "Action" ? "Filter by action" : "Filter by status"} value={statusFilter} onChange={event => setStatusFilter(event.target.value)} className="h-9 rounded-lg border bg-[var(--panel)] px-3 text-xs font-medium outline-none"><option value="All">{filterLabel}</option>{statuses.map(status => <option key={status}>{status}</option>)}</select>}
        {!isAudit && dateFilterColumn && <><input aria-label={`${dateFilterColumn} from`} type="date" value={dateFilters.from} onChange={event => setDateFilters(current => ({ ...current, from: event.target.value }))} className="h-9 rounded-lg border bg-[var(--panel)] px-2 text-xs outline-none" /><input aria-label={`${dateFilterColumn} to`} type="date" value={dateFilters.to} onChange={event => setDateFilters(current => ({ ...current, to: event.target.value }))} className="h-9 rounded-lg border bg-[var(--panel)] px-2 text-xs outline-none" /></>}
        {isAudit && <><input aria-label="Audit date from" type="date" value={auditFilters.from} onChange={event => setAuditFilters(current => ({ ...current, from: event.target.value }))} className="h-9 rounded-lg border bg-[var(--panel)] px-2 text-xs outline-none" /><input aria-label="Audit date to" type="date" value={auditFilters.to} onChange={event => setAuditFilters(current => ({ ...current, to: event.target.value }))} className="h-9 rounded-lg border bg-[var(--panel)] px-2 text-xs outline-none" /><select aria-label="Filter by module" value={auditFilters.module} onChange={event => setAuditFilters(current => ({ ...current, module: event.target.value }))} className="h-9 rounded-lg border bg-[var(--panel)] px-3 text-xs font-medium outline-none"><option value="">All modules</option>{auditFilterOptions.modules.map(option => <option key={option}>{option}</option>)}</select><select aria-label="Filter by user" value={auditFilters.user} onChange={event => setAuditFilters(current => ({ ...current, user: event.target.value }))} className="h-9 rounded-lg border bg-[var(--panel)] px-3 text-xs font-medium outline-none"><option value="">All users</option>{auditFilterOptions.users.map(option => <option key={option}>{option}</option>)}</select><select aria-label="Filter by severity" value={auditFilters.severity} onChange={event => setAuditFilters(current => ({ ...current, severity: event.target.value }))} className="h-9 rounded-lg border bg-[var(--panel)] px-3 text-xs font-medium outline-none"><option value="">All severities</option>{auditSeverities.map(option => <option key={option}>{option}</option>)}</select></>}
        {masterFilterColumns.map(column => <select key={column} aria-label={`Filter by ${column}`} value={filterValues[column] ?? ""} onChange={event => setFilterValues(current => ({ ...current, [column]: event.target.value }))} className="h-9 rounded-lg border bg-[var(--panel)] px-3 text-xs font-medium outline-none"><option value="">{column}</option>{(masterFilterOptions[column] ?? []).map(option => <option key={option}>{option}</option>)}</select>)}
        <div className="ml-auto flex items-center gap-2">
          {selectedActionItems.length > 0 && <ActionMenu label={`${selectedRecords.length || 1} available actions`} actions={selectedActionItems} />}
          <Button variant="secondary" onClick={resetData}><RotateCcw className="h-4 w-4" /> Reset data</Button>
          {sortColumn && <span className="text-[10px] text-slate-400">Sorted by <b className="text-[var(--text)]">{sortColumn}</b> ({sortDirection})</span>}
        </div>
      </div>
      {importErrors.length > 0 && <div className="border-b border-amber-200 bg-amber-50 px-5 py-3 text-xs text-amber-900 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-200"><div className="font-semibold">Import validation skipped {importErrors.length} row{importErrors.length === 1 ? "" : "s"}</div><div className="mt-1 flex flex-wrap gap-x-4 gap-y-1">{importErrors.map(error => <span key={`${error.row}-${error.message}`}>Row {error.row}: {error.message.replace(/^Row \d+:\s*/, "")}</span>)}</div></div>}
      {isSalesQuotation && <div className="border-b border-amber-200 bg-amber-50 px-5 py-3 text-xs text-amber-900 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-200"><b>Pricing control:</b> final quotations require approved costing, active pricelist, or active customer contract pricing.</div>}
      {sourcePreview && <div className="border-b bg-[var(--navy-tint)] px-5 py-3 text-xs text-medtech-deep dark:bg-[var(--elevated)] dark:text-red-100"><div className="flex flex-wrap items-center gap-2"><b>Source record:</b><span>{sourcePreview["Source Module"]}</span><span>{sourcePreview["Source Record"]}</span><StatusBadge>{sourcePreview.Status}</StatusBadge><button onClick={() => setSourcePreview(null)} className="ml-auto font-semibold text-medtech-navy dark:text-red-200">Close</button></div><div className="mt-1 text-medtech-navy dark:text-red-100">{sourcePreview["Action Taken"]} - {sourcePreview.Notes}</div></div>}
      {attachmentConfig && <div className="border-b border-medtech-navy/20 bg-[var(--navy-tint)] px-5 py-3 text-xs text-medtech-deep dark:border-medtech-navy/50 dark:bg-[var(--elevated)] dark:text-red-100"><b>Local Demo Only:</b> attachment rows store placeholder metadata and version history only; no large binary files or external storage links are persisted.</div>}
      {store.error && !isAudit && <div className="border-b border-amber-200 bg-amber-50 px-5 py-3 text-xs text-amber-900 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-200">{store.error}</div>}
      <div className="overflow-x-auto"><table className="w-full min-w-[800px] border-collapse text-left"><thead><tr className="border-b bg-slate-50/70 dark:bg-slate-900/40">{!isAudit && <th className="w-12 px-4 py-3"><input aria-label="Select all visible records" type="checkbox" checked={visibleRecords.length > 0 && visibleRecords.every(record => selectedIdSet.has(record.__id))} onChange={toggleAllVisible} className="h-4 w-4 rounded border-slate-300 accent-medtech-red" /></th>}{columns.map(column => <th key={column} className="px-5 py-3"><button aria-label={`Sort by ${column}`} onClick={() => toggleSort(column)} className="flex items-center gap-1.5 text-left text-[10px] font-bold uppercase tracking-[.08em] text-slate-400 transition hover:text-medtech-red">{column}{sortColumn === column ? sortDirection === "asc" ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" /> : <ArrowUpDown className="h-3 w-3 opacity-40" />}</button></th>)}<th className="w-20 px-4 py-3" /></tr></thead><tbody className="divide-y">{visibleRecords.map(record => <tr key={record.__id} onDoubleClick={() => openRecord(record)} className={cn("group cursor-default transition hover:bg-slate-50/70 dark:hover:bg-slate-800/30", selectedIdSet.has(record.__id) && "bg-[var(--navy-tint)] dark:bg-[var(--elevated)]")}>{!isAudit && <td className="px-4 py-4"><input aria-label={`Select ${recordName(record)}`} type="checkbox" checked={selectedIdSet.has(record.__id)} onChange={() => toggleSelected(record.__id)} onClick={event => event.stopPropagation()} className="h-4 w-4 rounded border-slate-300 accent-medtech-red" /></td>}{columns.map((column, columnIndex) => <td key={column} className={cn("px-5 py-4 text-xs", columnIndex === 0 ? "font-semibold text-[var(--text)]" : "text-[var(--muted)]")}>{column.toLowerCase().includes("status") || ["Stage","Access","Format","Action"].includes(column) ? <StatusBadge>{record[column]}</StatusBadge> : record[column]}</td>)}<td className="px-4"><div className="flex items-center justify-end gap-1">{moduleConfig.key === "reports" && <a aria-label={`Download ${recordName(record)} PDF`} title="Download PDF" href="/api/pdf/sample?template=report&download=1" download onClick={() => logPdf(recordName(record))} className="rounded-lg p-2 text-medtech-red transition hover:bg-[var(--navy-tint)] dark:hover:bg-[var(--elevated)]"><FileText className="h-4 w-4" /></a>}{isAutomationMonitor && <button aria-label={`View source for ${recordName(record)}`} title="View Source Record" onClick={() => viewAutomationSource(record)} className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-semibold text-medtech-navy transition hover:bg-[var(--navy-tint)] dark:text-red-200 dark:hover:bg-[var(--elevated)]"><Eye className="h-3.5 w-3.5" /> Source</button>}{!isAudit && <button aria-label={`Open ${recordName(record)}`} onClick={() => openRecord(record)} className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 group-hover:text-medtech-red dark:hover:bg-slate-700"><Ellipsis className="h-4 w-4" /></button>}</div></td></tr>)}{store.ready && filtered.length === 0 && <tr><td colSpan={columns.length + (isAudit ? 1 : 2)} className="px-6 py-16 text-center"><Search className="mx-auto h-8 w-8 text-slate-300" /><div className="mt-3 text-sm font-semibold">No matching records</div><div className="mt-1 text-xs text-slate-400">Change the search or filter.</div></td></tr>}{!store.ready && !isAudit && <tr><td colSpan={columns.length + 2} className="px-6 py-16 text-center text-sm text-slate-400">Loading local demo records...</td></tr>}</tbody></table></div>
      <div className="flex flex-wrap items-center justify-between gap-3 border-t px-5 py-3 text-[11px] text-slate-400"><span>{selectedRecords.length > 0 ? `${selectedRecords.length} selected - ` : ""}Showing {filtered.length ? (currentPage - 1) * PAGE_SIZE + 1 : 0}-{Math.min(currentPage * PAGE_SIZE, filtered.length)} of {filtered.length} filtered / {records.length} {isAudit ? "audit events" : "local demo records"}</span><div className="flex items-center gap-2">{pageCount > 1 && <><Button variant="ghost" className="h-7 px-2 text-[11px]" disabled={currentPage === 1} onClick={() => setPage(value => Math.max(1, value - 1))}>Previous</Button><span>Page {currentPage} of {pageCount}</span><Button variant="ghost" className="h-7 px-2 text-[11px]" disabled={currentPage === pageCount} onClick={() => setPage(value => Math.min(pageCount, value + 1))}>Next</Button></>}<Button variant="ghost" className="h-7 px-2 text-[11px]" onClick={exportRecords}><Download className="h-3.5 w-3.5" /> Download Excel</Button></div></div>
    </>}
    </section>
    {!usesCustomWorkspace && !isAudit && <RecordModal open={modalOpen} title={selected ? `Edit ${activeTab} record` : primaryAction} columns={columns} formColumns={formColumns} selectOptions={selectOptions} defaultValues={formDefaults} fieldTypes={fieldTypes} suggestions={suggestions} record={selected} approvalMode={moduleConfig.key === "approvals" && activeTab === "My approvals"} onClose={() => setModalOpen(false)} onSave={save} onDelete={selected ? remove : undefined} onDecision={decide} />}
    {toast && <div role="status" className="fixed bottom-5 right-5 z-[100] flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-3 text-xs font-medium text-white shadow-panel animate-in"><CheckCircle2 className="h-4 w-4 text-red-300" />{toast}</div>}
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

function auditTime(value = "") {
  const parsed = Date.parse(value);
  return Number.isNaN(parsed) ? 0 : parsed;
}

function isUsefulFilterColumn(column: string) {
  const key = column.toLowerCase();
  return ["company", "department", "employee code", "customer", "supplier", "warehouse", "expiry status"].some(token => key === token || key.includes(token));
}

function isDateFilterColumn(column: string) {
  const key = column.toLowerCase();
  return key.includes("date") || key.includes("expiry") || ["from", "to", "submitted", "updated"].includes(key);
}

function dateValue(value = "") {
  const parsed = Date.parse(value);
  return Number.isNaN(parsed) ? 0 : parsed;
}


