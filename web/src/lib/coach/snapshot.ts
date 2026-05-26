import { useStore } from "@/lib/store";
import {
  totalMonthlyEMIs,
  totalMonthlyBills,
  totalDebt,
  totalCardUtilization,
  stressScore,
  stressBand,
  remainingPrincipal,
  remainingTenure,
  emiEndDate,
} from "@/lib/calculations";
import { formatCurrency } from "@/lib/format";

export function buildSnapshot(): string {
  const { profile, emis, cards, bills } = useStore.getState();
  const c = profile.currency;

  const lines: string[] = [];
  lines.push("=== USER FINANCIAL STATE ===");
  lines.push(`Currency: ${c}`);
  lines.push(`Monthly salary: ${formatCurrency(profile.monthlySalary, c)} (credited day ${profile.salaryDay})`);
  lines.push(`Bank balance: ${formatCurrency(profile.currentBalance, c)}`);
  lines.push(`Emergency fund: ${formatCurrency(profile.emergencyFund, c)}`);
  lines.push(`Avg variable spend: ${formatCurrency(profile.monthlyVariableSpend, c)}/mo`);
  lines.push("");

  const score = stressScore(profile, emis, cards);
  lines.push(`Stress score: ${score}/100 (${stressBand(score)})`);
  lines.push(`Total debt outstanding: ${formatCurrency(totalDebt(emis, cards), c)}`);
  lines.push(`Total monthly EMI burden: ${formatCurrency(totalMonthlyEMIs(emis), c)}`);
  lines.push(`Total monthly bills: ${formatCurrency(totalMonthlyBills(bills), c)}`);
  lines.push(`Card utilization: ${totalCardUtilization(cards).toFixed(1)}%`);
  lines.push("");

  if (emis.length) {
    lines.push(`-- EMIs (${emis.length}) --`);
    emis.forEach((e) => {
      const left = remainingTenure(e);
      const principal = remainingPrincipal(e);
      const end = emiEndDate(e).toLocaleDateString(undefined, { month: "short", year: "numeric" });
      lines.push(
        `* ${e.name} [${e.category}] — ${formatCurrency(e.monthlyAmount, c)}/mo @ ${e.interestRate}% • ${left}mo left • outstanding ${formatCurrency(principal, c)} • ends ${end}`,
      );
    });
    lines.push("");
  }

  if (cards.length) {
    lines.push(`-- Credit cards (${cards.length}) --`);
    cards.forEach((card) => {
      const util = card.limit > 0 ? (card.currentBalance / card.limit) * 100 : 0;
      lines.push(
        `* ${card.name} (${card.bank}) — balance ${formatCurrency(card.currentBalance, c)} of ${formatCurrency(card.limit, c)} (${util.toFixed(0)}% util) • min ${formatCurrency(card.minDue, c)} due day ${card.dueDate} • APR ${card.interestRateAPR}%`,
      );
    });
    lines.push("");
  }

  if (bills.length) {
    lines.push(`-- Recurring bills (${bills.length}) --`);
    bills.forEach((b) => {
      lines.push(`* ${b.name} [${b.category}] — ${formatCurrency(b.amount, c)} on day ${b.dueDay}`);
    });
    lines.push("");
  }

  if (emis.length === 0 && cards.length === 0 && bills.length === 0 && profile.monthlySalary === 0) {
    lines.push("(empty profile — no data entered yet)");
  }

  return lines.join("\n");
}
