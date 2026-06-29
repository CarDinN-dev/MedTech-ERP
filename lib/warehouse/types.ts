import type { WarehouseMovementType } from "./movements";

export type UUID = string;
export type ISODate = string;
export type ISODateTime = string;
export type WarehouseQaStatus = "pending" | "approved" | "rejected" | "blocked";
export type WarehouseStockStatus = "available" | "quarantine" | "expired" | "damaged" | "recalled" | "blocked";
export type WarehouseDocumentStatus = "draft" | "pending" | "approved" | "rejected" | "in_progress" | "completed" | "cancelled" | "archived";
export type WarehouseMasterStatus = "draft" | "pending" | "approved" | "rejected" | "active" | "inactive" | "cancelled" | "completed" | "archived";

export interface WarehouseProductCategory {
  id: UUID;
  name: string;
  code: string;
  parentId: UUID | null;
  description: string | null;
  status: WarehouseMasterStatus;
  createdAt: ISODateTime;
  updatedAt: ISODateTime;
  archivedAt: ISODateTime | null;
}

export interface WarehouseProduct {
  id: UUID;
  sku: string;
  productName: string;
  categoryId: UUID | null;
  productType: string;
  description: string | null;
  unitOfMeasure: string;
  supplierId: UUID | null;
  storageRequirement: string | null;
  temperatureMin: number | null;
  temperatureMax: number | null;
  isBatchTracked: boolean;
  isExpiryTracked: boolean;
  isLdlItem: boolean;
  compatibleAnalyzer: string | null;
  reorderLevel: number;
  reorderQuantity: number;
  status: WarehouseMasterStatus;
  createdAt: ISODateTime;
  updatedAt: ISODateTime;
  archivedAt: ISODateTime | null;
}

export interface WarehouseLocation {
  id: UUID;
  code: string;
  name: string;
  locationType: string;
  address: string | null;
  isTemperatureControlled: boolean;
  temperatureMin: number | null;
  temperatureMax: number | null;
  status: WarehouseMasterStatus;
  createdAt: ISODateTime;
  updatedAt: ISODateTime;
  archivedAt: ISODateTime | null;
}

export interface WarehouseBin {
  id: UUID;
  locationId: UUID;
  code: string;
  name: string | null;
  zone: string | null;
  status: WarehouseMasterStatus;
  createdAt: ISODateTime;
  updatedAt: ISODateTime;
  archivedAt: ISODateTime | null;
}

export interface WarehouseBatch {
  id: UUID;
  productId: UUID;
  batchNumber: string;
  lotNumber: string | null;
  supplierId: UUID | null;
  manufactureDate: ISODate | null;
  expiryDate: ISODate | null;
  receivedDate: ISODate;
  qaStatus: WarehouseQaStatus;
  stockStatus: WarehouseStockStatus;
  certificateUrl: string | null;
  notes: string | null;
  createdAt: ISODateTime;
  updatedAt: ISODateTime;
  archivedAt: ISODateTime | null;
}

export interface WarehouseStockBalance {
  id: UUID;
  productId: UUID;
  batchId: UUID | null;
  locationId: UUID;
  binId: UUID | null;
  physicalQuantity: number;
  reservedQuantity: number;
  availableQuantity: number;
  quarantineQuantity: number;
  damagedQuantity: number;
  expiredQuantity: number;
  updatedAt: ISODateTime;
}

export interface WarehouseStockMovement {
  id: UUID;
  movementType: WarehouseMovementType;
  productId: UUID;
  batchId: UUID | null;
  sourceLocationId: UUID | null;
  sourceBinId: UUID | null;
  destinationLocationId: UUID | null;
  destinationBinId: UUID | null;
  quantity: number;
  referenceType: string | null;
  referenceId: UUID | null;
  reason: string | null;
  performedBy: UUID;
  approvedBy: UUID | null;
  createdAt: ISODateTime;
}

export interface WarehouseAuditLog {
  id: number;
  userId: UUID | null;
  action: "insert" | "update" | "delete" | string;
  entityType: string;
  entityId: UUID | null;
  oldValues: Record<string, unknown> | null;
  newValues: Record<string, unknown> | null;
  reason: string | null;
  ipAddress: string | null;
  createdAt: ISODateTime;
}

export interface WarehouseReceipt {
  id: UUID;
  receiptNumber: string;
  supplierId: UUID;
  purchaseOrderId: UUID | null;
  destinationLocationId: UUID;
  supplierDeliveryNote: string | null;
  receivedAt: ISODateTime;
  status: WarehouseDocumentStatus;
  notes: string | null;
}

export interface WarehouseTransfer {
  id: UUID;
  transferNumber: string;
  sourceLocationId: UUID;
  destinationLocationId: UUID;
  status: WarehouseDocumentStatus;
  reason: string | null;
}

export interface WarehouseDispatch {
  id: UUID;
  dispatchNumber: string;
  customerId: UUID;
  salesOrderId: UUID | null;
  sourceLocationId: UUID;
  dispatchDate: ISODate | null;
  status: WarehouseDocumentStatus;
  notes: string | null;
}

export interface WarehouseReservation {
  id: UUID;
  reservationNumber: string;
  productId: UUID;
  batchId: UUID | null;
  locationId: UUID;
  binId: UUID | null;
  salesOrderId: UUID | null;
  customerId: UUID | null;
  quantity: number;
  reservedUntil: ISODateTime | null;
  status: WarehouseDocumentStatus;
  reason: string | null;
  createdBy: UUID;
}

export interface StockQuantityParts {
  physicalQuantity: number;
  reservedQuantity: number;
  quarantineQuantity: number;
  damagedQuantity: number;
  expiredQuantity: number;
}

export function calculateAvailableQuantity(parts: StockQuantityParts): number {
  return parts.physicalQuantity
    - parts.reservedQuantity
    - parts.quarantineQuantity
    - parts.damagedQuantity
    - parts.expiredQuantity;
}

