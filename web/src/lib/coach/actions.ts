import { useStore } from "@/lib/store";
import type { ActionRecord } from "./types";
import type { Bill, CreditCard, EMI, Profile } from "@/lib/types";

const ACTION_REGEX = /<action>\s*([\s\S]*?)\s*<\/action>/g;

export function extractActions(text: string): { cleanedText: string; raws: string[] } {
  const raws: string[] = [];
  const cleanedText = text.replace(ACTION_REGEX, (_, body) => {
    raws.push(body);
    return "";
  }).trim();
  return { cleanedText, raws };
}

type AnyAction =
  | { kind: "add_emi"; args: Partial<EMI> & { name: string; principal: number; interestRate: number; tenureMonths: number } }
  | { kind: "add_card"; args: Partial<CreditCard> & { name: string; bank: string; limit: number } }
  | { kind: "add_bill"; args: Partial<Bill> & { name: string; amount: number } }
  | { kind: "update_profile"; args: Partial<Profile> };

export function applyAction(raw: string): ActionRecord {
  let parsed: AnyAction;
  // Strip optional code fences and leading/trailing prose around the JSON.
  const cleaned = raw
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```\s*$/i, "")
    .trim();
  // Extract the first {...} substring (model sometimes adds prefixes).
  const firstBrace = cleaned.indexOf("{");
  const lastBrace = cleaned.lastIndexOf("}");
  const jsonText = firstBrace >= 0 && lastBrace > firstBrace
    ? cleaned.slice(firstBrace, lastBrace + 1)
    : cleaned;
  try {
    parsed = JSON.parse(jsonText) as AnyAction;
  } catch {
    return { kind: "error", summary: "Could not parse action JSON", detail: raw.slice(0, 200) };
  }
  const store = useStore.getState();

  try {
    switch (parsed.kind) {
      case "add_emi": {
        const a = parsed.args;
        if (!a.name || !a.principal || !a.tenureMonths) {
          return { kind: "error", summary: "Missing required EMI fields", detail: JSON.stringify(a) };
        }
        store.addEMI({
          name: a.name,
          category: (a.category ?? "other") as EMI["category"],
          principal: Number(a.principal),
          interestRate: Number(a.interestRate ?? 0),
          tenureMonths: Number(a.tenureMonths),
          monthsPaid: Number(a.monthsPaid ?? 0),
          startDate: a.startDate ?? new Date().toISOString(),
        });
        return { kind: "add_emi", summary: `Added EMI · ${a.name}` };
      }
      case "add_card": {
        const a = parsed.args;
        if (!a.name || !a.bank) {
          return { kind: "error", summary: "Missing card name/bank", detail: JSON.stringify(a) };
        }
        store.addCard({
          name: a.name,
          bank: a.bank,
          limit: Number(a.limit ?? 0),
          currentBalance: Number(a.currentBalance ?? 0),
          minDue: Number(a.minDue ?? 0),
          statementDate: clampDay(a.statementDate ?? 5),
          dueDate: clampDay(a.dueDate ?? 25),
          interestRateAPR: Number(a.interestRateAPR ?? 40),
        });
        return { kind: "add_card", summary: `Added card · ${a.name}` };
      }
      case "add_bill": {
        const a = parsed.args;
        if (!a.name || a.amount == null) {
          return { kind: "error", summary: "Missing bill name/amount", detail: JSON.stringify(a) };
        }
        store.addBill({
          name: a.name,
          amount: Number(a.amount),
          dueDay: clampDay(a.dueDay ?? 1),
          category: (a.category ?? "other") as Bill["category"],
        });
        return { kind: "add_bill", summary: `Added bill · ${a.name}` };
      }
      case "update_profile": {
        const a = parsed.args ?? {};
        const patch: Partial<Profile> = {};
        if (a.monthlySalary != null) patch.monthlySalary = Number(a.monthlySalary);
        if (a.salaryDay != null) patch.salaryDay = clampDay(a.salaryDay);
        if (a.currentBalance != null) patch.currentBalance = Number(a.currentBalance);
        if (a.emergencyFund != null) patch.emergencyFund = Number(a.emergencyFund);
        if (a.monthlyVariableSpend != null) patch.monthlyVariableSpend = Number(a.monthlyVariableSpend);
        if (a.currency) patch.currency = a.currency;
        if (Object.keys(patch).length === 0) {
          return { kind: "error", summary: "Empty profile update", detail: raw };
        }
        store.updateProfile(patch);
        const fields = Object.keys(patch).join(", ");
        return { kind: "update_profile", summary: `Updated profile · ${fields}` };
      }
      default:
        return { kind: "error", summary: `Unknown action: ${(parsed as { kind?: string }).kind}` };
    }
  } catch (err) {
    return {
      kind: "error",
      summary: "Action failed",
      detail: err instanceof Error ? err.message : String(err),
    };
  }
}

function clampDay(v: number | string): number {
  const n = typeof v === "string" ? parseInt(v, 10) : v;
  if (!Number.isFinite(n)) return 1;
  return Math.min(28, Math.max(1, n));
}
