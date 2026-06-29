export function createClientId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") return crypto.randomUUID();
  const random = Math.random().toString(36).slice(2, 12);
  return `${Date.now().toString(36)}-${random}`;
}
