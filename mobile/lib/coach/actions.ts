import { emiAmount, type ActionRecord } from "@debtos/core";
import { useStore } from "@/lib/store";

/**
 * Parse <action>{...}</action> blocks the coach emits and execute them against
 * the shared store. Returns a clean text (blocks stripped) + executed records.
 */
export function parseAndRunActions(raw: string): { text: string; actions: ActionRecord[] } {
  const actions: ActionRecord[] = [];
  const re = /<action>\s*(\{[\s\S]*?\})\s*<\/action>/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(raw)) !== null) {
    try {
      const parsed = JSON.parse(m[1]) as { kind: string; args: Record<string, unknown> };
      actions.push(run(parsed.kind, parsed.args ?? {}));
    } catch (e) {
      actions.push({ kind: "error", summary: "Could not parse an action", detail: e instanceof Error ? e.message : String(e) });
    }
  }
  const text = raw.replace(re, "").replace(/\n{3,}/g, "\n\n").trim();
  return { text, actions };
}

const num = (v: unknown, d = 0) => (typeof v === "number" ? v : Number(v) || d);
const str = (v: unknown, d = "") => (typeof v === "string" ? v : d);

function run(kind: string, a: Record<string, unknown>): ActionRecord {
  const store = useStore.getState();
  try {
    switch (kind) {
      case "add_emi": {
        const tenureMonths = num(a.tenureMonths, 12);
        const interestRate = num(a.interestRate, 12);
        const principal = num(a.principal) || num(a.monthlyAmount) * tenureMonths;
        store.addEMI({
          name: str(a.name, "Loan"),
          category: (str(a.category, "other") as never),
          principal,
          monthlyAmount: num(a.monthlyAmount) || emiAmount(principal, interestRate, tenureMonths),
          interestRate,
          tenureMonths,
          monthsPaid: num(a.monthsPaid, 0),
          startDate: str(a.startDate) || new Date().toISOString(),
        });
        return { kind: "add_emi", summary: `Added EMI: ${str(a.name, "Loan")}`, args: a };
      }
      case "add_card": {
        store.addCard({
          name: str(a.name, "Card"),
          bank: str(a.bank),
          limit: num(a.limit),
          currentBalance: num(a.currentBalance),
          minDue: num(a.minDue),
          statementDate: num(a.statementDate, 1),
          dueDate: num(a.dueDate, 20),
          interestRateAPR: num(a.interestRateAPR, 40),
        });
        return { kind: "add_card", summary: `Added card: ${str(a.name, "Card")}`, args: a };
      }
      case "add_bill": {
        store.addBill({
          name: str(a.name, "Bill"),
          amount: num(a.amount),
          dueDay: num(a.dueDay, 1),
          category: (str(a.category, "other") as never),
        });
        return { kind: "add_bill", summary: `Added bill: ${str(a.name, "Bill")}`, args: a };
      }
      case "update_profile": {
        const patch: Record<string, unknown> = {};
        for (const k of ["monthlySalary", "salaryDay", "currentBalance", "emergencyFund", "monthlyVariableSpend"]) {
          if (a[k] != null) patch[k] = num(a[k]);
        }
        if (a.currency != null) patch.currency = str(a.currency);
        store.updateProfile(patch as never);
        return { kind: "update_profile", summary: "Updated profile", args: a };
      }
      default:
        return { kind: "error", summary: `Unknown action: ${kind}`, args: a };
    }
  } catch (e) {
    return { kind: "error", summary: `Failed to run ${kind}`, detail: e instanceof Error ? e.message : String(e) };
  }
}
