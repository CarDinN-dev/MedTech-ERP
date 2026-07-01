import { describe, expect, it } from "vitest";
import { createDemoRecord, readDemoRecordsSnapshot } from "@/lib/demo-store";
import { createAttachmentPlaceholder, runDocumentAction } from "@/lib/attachment-workflow";

describe("local attachment workflow", () => {
  it("creates placeholder metadata, versions it, tracks expiry, and archives locally", () => {
    const attachment = createAttachmentPlaceholder({
      sourceModule: "Quality",
      sourceRecord: "REG-DX-TRP-100",
      fileName: "regulatory-certificate.pdf",
      documentCategory: "Regulatory Certificate",
      uploadedBy: "Kashif",
      expiryDate: "2026-08-15"
    });

    expect(readDemoRecordsSnapshot("documents:Attachments", [])[0]).toMatchObject({ "Attachment No": attachment["Attachment No"], "File Size": "metadata only", Status: "Active" });
    expect(readDemoRecordsSnapshot("documents:Document Expiry Tracker", []).some(row => row["Attachment No"] === attachment["Attachment No"])).toBe(true);

    const selected = createDemoRecord(attachment);
    const versioned = runDocumentAction("new-version", [selected], "Aisha Rahman");
    expect(versioned).toMatchObject({ targetTab: "Version History" });
    expect(readDemoRecordsSnapshot("documents:Version History", []).some(row => row["Attachment No"] === attachment["Attachment No"] && row["Version No"] === "2")).toBe(true);

    const archived = runDocumentAction("archive-attachment", [{ ...selected, "Version No": "2" }], "Kashif");
    expect(archived).toMatchObject({ targetTab: "Local Archive" });
    expect(readDemoRecordsSnapshot("documents:Local Archive", [])[0]).toMatchObject({ "Attachment No": attachment["Attachment No"], Status: "Archived" });
  });
});
