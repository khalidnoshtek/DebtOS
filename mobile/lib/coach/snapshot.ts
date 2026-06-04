import {
  totalMonthlyEMIs,
  totalMonthlyBills,
  totalDebt,
  totalCardUtilization,
  stressScore,
  stressBand,
  remainingPrincipal,
  remainingTenure,
  formatCurrency,
} from "@debtos/core";
import { useStore } from "@/lib/store";

/** Compact financial-state snapshot appended to the system prompt for grounding. */
export function buildSnapshot(): string {
  const { profile, emis, cards, bills } = useStore.getState();
  const c = profile.currency;
  const L: string[] = ["=== USER FINANCIAL STATE ==="];

  L.push(`Monthly salary: ${formatCurrency(profile.monthlySalary, c)}`);
  L.push(`Bank balance: ${formatCurrency(profile.currentBalance, c)} · Emergency fund: ${formatCurrency(profile.emergencyFund, c)}`);
  L.push(`Variable spend: ${formatCurrency(profile.monthlyVariableSpend, c)}/mo`);
  L.push(`Stress score: ${stressScore(profile, emis, cards)} (${stressBand(stressScore(profile, emis, cards))})`);
  L.push(`Total debt: ${formatCurrency(totalDebt(emis, cards), c)} · Monthly EMIs: ${formatCurrency(totalMonthlyEMIs(emis), c)} · Bills: ${formatCurrency(totalMonthlyBills(bills), c)}`);
  L.push(`Card utilization: ${totalCardUtilization(cards).toFixed(0)}%`);

  if (emis.length) {
    L.push("EMIs:");
    emis.forEach((e) =>
      L.push(`  - ${e.name} (${e.category}): ${formatCurrency(e.monthlyAmount, c)}/mo, ${e.interestRate}%, ${remainingTenure(e)} mo left, ${formatCurrency(remainingPrincipal(e), c)} outstanding`),
    );
  }
  if (cards.length) {
    L.push("Cards:");
    cards.forEach((cd) => L.push(`  - ${cd.name} (${cd.bank}): ${formatCurrency(cd.currentBalance, c)}/${formatCurrency(cd.limit, c)}, ${cd.interestRateAPR}% APR`));
  }
  if (bills.length) {
    L.push("Bills:");
    bills.forEach((b) => L.push(`  - ${b.name}: ${formatCurrency(b.amount, c)} on day ${b.dueDay}`));
  }
  return L.join("\n");
}
