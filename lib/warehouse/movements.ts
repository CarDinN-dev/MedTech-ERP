export const WAREHOUSE_MOVEMENT_TYPES = [
  "receipt",
  "qa_release",
  "qa_reject",
  "transfer_out",
  "transfer_in",
  "reservation",
  "reservation_release",
  "dispatch",
  "adjustment_in",
  "adjustment_out",
  "damage_writeoff",
  "expiry_writeoff",
  "return_from_customer",
  "return_to_supplier",
  "recall_block",
  "stock_count_adjustment",
] as const;

export type WarehouseMovementType = (typeof WAREHOUSE_MOVEMENT_TYPES)[number];

export const INBOUND_MOVEMENT_TYPES = [
  "receipt",
  "qa_release",
  "transfer_in",
  "adjustment_in",
  "return_from_customer",
] as const satisfies readonly WarehouseMovementType[];

export const OUTBOUND_MOVEMENT_TYPES = [
  "qa_reject",
  "transfer_out",
  "dispatch",
  "adjustment_out",
  "damage_writeoff",
  "expiry_writeoff",
  "return_to_supplier",
] as const satisfies readonly WarehouseMovementType[];

export const ALLOCATION_MOVEMENT_TYPES = [
  "reservation",
  "reservation_release",
  "recall_block",
] as const satisfies readonly WarehouseMovementType[];

export function isWarehouseMovementType(value: string): value is WarehouseMovementType {
  return (WAREHOUSE_MOVEMENT_TYPES as readonly string[]).includes(value);
}

