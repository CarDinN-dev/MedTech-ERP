import type { SupabaseClient } from "@supabase/supabase-js";

export const WAREHOUSE_PERMISSIONS = [
  "view_stock",
  "receive_stock",
  "prepare_transfer",
  "approve_transfer",
  "prepare_dispatch",
  "create_reservation",
  "view_reservation",
  "qa_decide",
  "approve_adjustment",
  "writeoff",
  "manage_count",
  "manage_recall",
  "track_ldl",
  "view_valuation",
  "view_reports",
  "manage_settings",
  "manage_users",
] as const;

export type WarehousePermission = (typeof WAREHOUSE_PERMISSIONS)[number];
export type WarehouseRole =
  | "admin"
  | "warehouse_manager"
  | "warehouse_staff"
  | "qa_officer"
  | "sales_user"
  | "finance_user"
  | "viewer";

export const WAREHOUSE_ROLE_PERMISSIONS: Readonly<Record<WarehouseRole, readonly WarehousePermission[]>> = {
  admin: WAREHOUSE_PERMISSIONS,
  warehouse_manager: ["view_stock", "receive_stock", "prepare_transfer", "approve_transfer", "prepare_dispatch", "view_reservation", "approve_adjustment", "writeoff", "manage_count", "manage_recall", "track_ldl", "view_valuation", "view_reports"],
  warehouse_staff: ["view_stock", "receive_stock", "prepare_transfer", "prepare_dispatch", "view_reservation", "track_ldl"],
  qa_officer: ["view_stock", "qa_decide", "view_reports"],
  sales_user: ["view_stock", "create_reservation", "view_reservation"],
  finance_user: ["view_stock", "view_valuation", "view_reports"],
  viewer: ["view_reports"],
};

export function roleHasWarehousePermission(role: WarehouseRole, permission: WarehousePermission): boolean {
  return WAREHOUSE_ROLE_PERMISSIONS[role].includes(permission);
}

export async function hasWarehousePermission(
  client: SupabaseClient,
  permission: WarehousePermission,
): Promise<boolean> {
  const { data, error } = await client.rpc("has_permission", {
    p_module: "warehouse",
    p_action: permission,
  });
  if (error) throw new Error(`Unable to evaluate warehouse permission: ${error.message}`);
  return data === true;
}

