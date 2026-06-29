import { describe, expect, it, vi } from "vitest";
import { createClientId } from "@/lib/ids";

describe("client id generation", () => {
  it("uses randomUUID where the browser exposes it", () => {
    const randomUUID = vi.spyOn(crypto, "randomUUID").mockReturnValue("00000000-0000-4000-8000-000000000001");
    expect(createClientId()).toBe("00000000-0000-4000-8000-000000000001");
    randomUUID.mockRestore();
  });

  it("falls back safely for non-secure local network hosts", () => {
    const original = crypto.randomUUID;
    Object.defineProperty(crypto, "randomUUID", { configurable: true, value: undefined });
    expect(createClientId()).toMatch(/^[a-z0-9]+-[a-z0-9]+$/);
    Object.defineProperty(crypto, "randomUUID", { configurable: true, value: original });
  });
});
