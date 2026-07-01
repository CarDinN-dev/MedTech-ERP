export function numberValue(value?: string | number) {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  const cleaned = String(value ?? "").replace(/[^0-9.-]+/g, "");
  const parsed = Number(cleaned);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function qar(value: number) {
  return `QAR ${Math.round((value + Number.EPSILON) * 100) / 100}`;
}

export function finalSettlementPayable(row: Record<string, string>) {
  return numberValue(row["Working Days Salary"]) + numberValue(row["Leave Balance Encashment"]) + numberValue(row.Gratuity) - numberValue(row["Loan Balance Deduction"]) - numberValue(row["Other Deductions"]);
}
