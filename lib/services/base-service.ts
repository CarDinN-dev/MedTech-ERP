import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";

export interface ListOptions {
  page?: number; pageSize?: number; search?: string; searchColumns?: string[];
  orderBy?: string; ascending?: boolean; filters?: Record<string, string | number | boolean>; columns?: string;
}

export class Repository<TCreate extends object, TUpdate extends object = Partial<TCreate>> {
  constructor(private client: SupabaseClient, private table: string, private createSchema: z.ZodType<TCreate>, private updateSchema?: z.ZodType<TUpdate>) {}

  async list(options: ListOptions = {}) {
    const page = Math.max(options.page ?? 1, 1); const pageSize = Math.min(options.pageSize ?? 25, 100);
    let query = this.client.from(this.table).select(options.columns ?? "*", { count: "exact" }).is("deleted_at", null);
    Object.entries(options.filters ?? {}).forEach(([key, value]) => { query = query.eq(key, value); });
    if (options.search && options.searchColumns?.length) query = query.or(options.searchColumns.map(column => `${column}.ilike.%${options.search}%`).join(","));
    const { data, error, count } = await query.order(options.orderBy ?? "created_at", { ascending: options.ascending ?? false }).range((page - 1) * pageSize, page * pageSize - 1);
    if (error) throw new DataError(error.message, error.code); return { data, count: count ?? 0, page, pageSize };
  }

  async find(id: string, columns = "*") { const { data, error } = await this.client.from(this.table).select(columns).eq("id", id).is("deleted_at", null).single(); if (error) throw new DataError(error.message, error.code); return data; }
  async create(input: TCreate) { const validated = this.createSchema.parse(input); const { data, error } = await this.client.from(this.table).insert(validated).select().single(); if (error) throw new DataError(error.message, error.code); return data; }
  async update(id: string, input: TUpdate) { const validated = this.updateSchema ? this.updateSchema.parse(input) : input; const { data, error } = await this.client.from(this.table).update(validated).eq("id", id).select().single(); if (error) throw new DataError(error.message, error.code); return data; }
  async softDelete(id: string) { const { error } = await this.client.from(this.table).update({ deleted_at: new Date().toISOString() }).eq("id", id); if (error) throw new DataError(error.message, error.code); }
}

export class DataError extends Error { constructor(message: string, public code?: string) { super(message); this.name = "DataError"; } }
