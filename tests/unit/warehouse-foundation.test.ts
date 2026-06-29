import { describe, expect, it } from "vitest";
import {
  calculateAvailableQuantity,
  isWarehouseMovementType,
  roleHasWarehousePermission,
  WAREHOUSE_MOVEMENT_TYPES,
} from "@/lib/warehouse";

describe("warehouse foundation", () => {
  it("calculates available stock from protected quantity buckets", () => {
    expect(calculateAvailableQuantity({
      physicalQuantity: 100,
      reservedQuantity: 15,
      quarantineQuantity: 20,
      damagedQuantity: 3,
      expiredQuantity: 2,
    })).toBe(60);
  });

  it("keeps the movement list exhaustive and rejects unknown values", () => {
    expect(WAREHOUSE_MOVEMENT_TYPES).toHaveLength(16);
    expect(isWarehouseMovementType("qa_release")).toBe(true);
    expect(isWarehouseMovementType("direct_edit")).toBe(false);
  });

  it("matches the required role permission boundaries", () => {
    expect(roleHasWarehousePermission("warehouse_staff", "receive_stock")).toBe(true);
    expect(roleHasWarehousePermission("warehouse_staff", "approve_adjustment")).toBe(false);
    expect(roleHasWarehousePermission("warehouse_manager", "approve_transfer")).toBe(true);
    expect(roleHasWarehousePermission("qa_officer", "qa_decide")).toBe(true);
    expect(roleHasWarehousePermission("sales_user", "create_reservation")).toBe(true);
    expect(roleHasWarehousePermission("finance_user", "view_valuation")).toBe(true);
    expect(roleHasWarehousePermission("viewer", "view_stock")).toBe(false);
  });
});

