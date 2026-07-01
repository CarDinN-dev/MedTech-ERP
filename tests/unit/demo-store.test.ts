import { describe, expect, it } from "vitest";
import { demoRecordsStorageKey, exportLocalDemoData, importLocalDemoData, readDemoRecordsSnapshot, writeDemoRecordsSnapshot, type DemoRecord } from "@/lib/demo-store";

describe("demo store safety", () => {
  it("falls back when localStorage is empty or corrupted", () => {
    const seed = [{ Name: "Seed", Status: "Active" }];
    expect(readDemoRecordsSnapshot("sales:Customer Master", seed)[0]).toMatchObject(seed[0]);

    localStorage.setItem(demoRecordsStorageKey("sales:Customer Master"), "{bad json");
    expect(readDemoRecordsSnapshot("sales:Customer Master", seed)[0]).toMatchObject(seed[0]);
  });

  it("migrates old array records with missing fields", () => {
    localStorage.setItem("medtech-demo:sales:Customer Master:records:v1", JSON.stringify([{ Name: "Old customer" }]));

    const [record] = readDemoRecordsSnapshot("sales:Customer Master", [{ Name: "", Status: "Active" }]);

    expect(record.Name).toBe("Old customer");
    expect(record.Status).toBe("");
    expect(record.__id).toBeTruthy();
  });

  it("exports and imports versioned local demo data", () => {
    const row = { __id: "r1", Name: "Backup row", __createdAt: "2026-07-01T00:00:00.000Z" } as DemoRecord;
    writeDemoRecordsSnapshot("inventory:Products", [row]);

    const backup = exportLocalDemoData();
    localStorage.clear();
    importLocalDemoData(backup);

    expect(readDemoRecordsSnapshot("inventory:Products", [])[0]).toMatchObject({ Name: "Backup row" });
  });
});
