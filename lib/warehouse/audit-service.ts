import type { SupabaseClient } from "@supabase/supabase-js";
import type { WarehouseAuditLog } from "./types";

interface AuditListOptions {
  entityType?: string;
  entityId?: string;
  userId?: string;
  limit?: number;
}

interface WarehouseAuditRow {
  id: number;
  user_id: string | null;
  action: string;
  entity_type: string;
  entity_id: string | null;
  old_values: Record<string, unknown> | null;
  new_values: Record<string, unknown> | null;
  reason: string | null;
  ip_address: string | null;
  created_at: string;
}

export class WarehouseAuditService {
  constructor(private readonly client: SupabaseClient) {}

  async list(options: AuditListOptions = {}): Promise<WarehouseAuditLog[]> {
    const limit = Math.min(Math.max(options.limit ?? 100, 1), 500);
    let query = this.client
      .from("warehouse_audit_logs")
      .select("id,user_id,action,entity_type,entity_id,old_values,new_values,reason,ip_address,created_at")
      .order("created_at", { ascending: false })
      .limit(limit);

    if (options.entityType) query = query.eq("entity_type", options.entityType);
    if (options.entityId) query = query.eq("entity_id", options.entityId);
    if (options.userId) query = query.eq("user_id", options.userId);

    const { data, error } = await query;
    if (error) throw new Error(`Unable to load warehouse audit history: ${error.message}`);
    return ((data ?? []) as WarehouseAuditRow[]).map(mapAuditRow);
  }

  async listForEntity(entityType: string, entityId: string, limit = 100): Promise<WarehouseAuditLog[]> {
    return this.list({ entityType, entityId, limit });
  }
}

function mapAuditRow(row: WarehouseAuditRow): WarehouseAuditLog {
  return {
    id: row.id,
    userId: row.user_id,
    action: row.action,
    entityType: row.entity_type,
    entityId: row.entity_id,
    oldValues: row.old_values,
    newValues: row.new_values,
    reason: row.reason,
    ipAddress: row.ip_address,
    createdAt: row.created_at,
  };
}

