import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("security definer grants", () => {
  it("locks down callable core security-definer functions", () => {
    const migration = readFileSync("supabase/migrations/202606290001_lock_down_security_definer_functions.sql", "utf8");

    expect(migration).toContain("revoke all on function public.next_document_number(text) from public, anon");
    expect(migration).toContain("grant execute on function public.next_document_number(text) to authenticated");
    expect(migration).toContain("revoke all on function public.audit_row_change() from public, anon, authenticated");
    expect(migration).toContain("revoke all on function public.handle_new_user() from public, anon, authenticated");
  });
});
