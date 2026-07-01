import { describe, expect, it } from "vitest";
import { importLocalDemoData } from "@/lib/demo-store";
import { parseExcel } from "@/lib/export/excel";
import { safeLocalPath } from "@/lib/security";
import { plainText, validateStructuredRecord } from "@/lib/validation";
import nextConfig from "@/next.config";
import * as healthRoute from "@/app/api/health/route";
import * as samplePdfRoute from "@/app/api/pdf/sample/route";

describe("security hardening", () => {
  it("accepts only same-origin relative redirects", () => {
    expect(safeLocalPath("/sales?tab=Quotes")).toBe("/sales?tab=Quotes");
    expect(safeLocalPath("//evil.example")).toBe("/");
    expect(safeLocalPath("https://evil.example")).toBe("/");
    expect(safeLocalPath("/\\evil")).toBe("/");
  });

  it("rejects oversized spreadsheet imports with a controlled error", async () => {
    const file = new File([new Uint8Array(5 * 1024 * 1024 + 1)], "huge.xlsx");
    const result = await parseExcel(file, row => row);

    expect(result.valid).toEqual([]);
    expect(result.errors[0].message).toContain("5 MB");
  });

  it("validates local backup values before clearing existing demo data", () => {
    localStorage.setItem("medtech-demo:sales:records:v1", "keep-me");

    expect(() => importLocalDemoData({ items: { "medtech-demo:bad:records:v1": "x".repeat(1_000_001) } })).toThrow("too large");
    expect(localStorage.getItem("medtech-demo:sales:records:v1")).toBe("keep-me");
  });

  it("rejects corrupted backup JSON before clearing existing demo data", () => {
    localStorage.setItem("medtech-demo:sales:records:v1", JSON.stringify([{ __id: "safe", Name: "Keep" }]));

    expect(() => importLocalDemoData({ schemaVersion: 3, items: { "medtech-demo:sales:records:v1": "{bad json" } })).toThrow("Corrupted");
    expect(localStorage.getItem("medtech-demo:sales:records:v1")).toContain("Keep");
  });

  it("keeps unsafe text payloads inert for imports, exports, and PDFs", () => {
    expect(plainText("<img src=x onerror=alert(1)>Safe")).toBe("Safe");
  });

  it("rejects invalid quantities, amounts, and percentages", () => {
    expect(validateStructuredRecord({ Quantity: "-1" }, {}, {}, false)).toContain("greater than 0");
    expect(validateStructuredRecord({ Amount: "-1" }, {}, {}, false)).toContain("negative");
    expect(validateStructuredRecord({ "Discount %": "101" }, {}, {}, false)).toContain("between 0 and 100");
  });

  it("keeps public API routes read-only", () => {
    expect("GET" in healthRoute).toBe(true);
    expect("POST" in healthRoute).toBe(false);
    expect("GET" in samplePdfRoute).toBe(true);
    expect("POST" in samplePdfRoute).toBe(false);
  });

  it("serves defensive security headers", async () => {
    const headers = await nextConfig.headers?.();
    const keys = new Set(headers?.flatMap(route => route.headers.map(header => header.key)));

    expect(keys.has("Content-Security-Policy")).toBe(true);
    expect(keys.has("X-Content-Type-Options")).toBe(true);
    expect(keys.has("X-Frame-Options")).toBe(true);
    expect(keys.has("Referrer-Policy")).toBe(true);
    expect(keys.has("Permissions-Policy")).toBe(true);
  });
});
