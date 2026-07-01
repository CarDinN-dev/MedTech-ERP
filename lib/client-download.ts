"use client";

import { safeFileName } from "@/lib/validation";

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  const ext = filename.match(/\.[a-z0-9]{1,8}$/i)?.[0] ?? "";
  anchor.download = `${safeFileName(filename)}${ext}`;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}
