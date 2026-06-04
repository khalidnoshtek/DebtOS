import type { Bill, CreditCard, EMI, ForecastPoint, Profile, StressBand } from "./types";

export function emiAmount(principal: number, annualRate: number, tenureMonths: number) {
  if (tenureMonths <= 0) return 0;
  if (annualRate === 0) return principal / tenureMonths;
  const r = annualRate / 12 / 100;
  const pow = Math.pow(1 + r, tenureMonths);
  return (principal * r * pow) / (pow - 1);
}

export function remainingPrincipal(e: EMI) {
  const r = e.interestRate / 12 / 100;
  const n = e.tenureMonths;
  const k = Math.min(e.monthsPaid, n);
  if (r === 0) return Math.max(0, e.principal - e.monthlyAmount * k);
  const pow = Math.pow(1 + r, n);
  const powK = Math.pow(1 + r, k);
  const balance = e.principal * (pow - powK) / (pow - 1);
  return Math.max(0, balance);
}

export function remainingTenure(e: EMI) {
  return Math.max(0, e.tenureMonths - e.monthsPaid);
}

export function totalInterestRemaining(e: EMI) {
  const months = remainingTenure(e);
  const totalPayments = e.monthlyAmount * months;
  const balance = remainingPrincipal(e);
  return Math.max(0, totalPayments - balance);
}

export function emiEndDate(e: EMI) {
  const start = new Date(e.startDate);
  const end = new Date(start);
  end.setMonth(end.getMonth() + e.tenureMonths);
  return end;
}

export function totalMonthlyEMIs(emis: EMI[]) {
  return emis.reduce((sum, e) => (remainingTenure(e) > 0 ? sum + e.monthlyAmount : sum), 0);
}

export function totalMonthlyBills(bills: Bill[]) {
  return bills.reduce((s, b) => s + b.amount, 0);
}

export function totalMonthlyOutflow(emis: EMI[], bills: Bill[], variable: number, cards: CreditCard[]) {
  const cardMinDues = cards.reduce((s, c) => s + c.minDue, 0);
  return totalMonthlyEMIs(emis) + totalMonthlyBills(bills) + variable + cardMinDues;
}

export function safeToSpend(profile: Profile, emis: EMI[], bills: Bill[], cards: CreditCard[]) {
  const fixed = totalMonthlyEMIs(emis) + totalMonthlyBills(bills) + cards.reduce((s, c) => s + c.minDue, 0);
  const buffer = profile.monthlySalary * 0.1;
  return Math.max(0, profile.monthlySalary - fixed - buffer);
}

export function dailyBurnRate(profile: Profile, emis: EMI[], bills: Bill[], cards: CreditCard[]) {
  return totalMonthlyOutflow(emis, bills, profile.monthlyVariableSpend, cards) / 30;
}

export function emergencyRunwayDays(profile: Profile, emis: EMI[], bills: Bill[], cards: CreditCard[]) {
  const dailyMin = (totalMonthlyEMIs(emis) + totalMonthlyBills(bills) + cards.reduce((s, c) => s + c.minDue, 0)) / 30;
  if (dailyMin <= 0) return Infinity;
  return Math.floor((profile.emergencyFund + profile.currentBalance) / dailyMin);
}

export function cardUtilization(c: CreditCard) {
  if (c.limit <= 0) return 0;
  return (c.currentBalance / c.limit) * 100;
}

export function totalCardUtilization(cards: CreditCard[]) {
  const limit = cards.reduce((s, c) => s + c.limit, 0);
  const balance = cards.reduce((s, c) => s + c.currentBalance, 0);
  if (limit <= 0) return 0;
  return (balance / limit) * 100;
}

export function totalDebt(emis: EMI[], cards: CreditCard[]) {
  const emiDebt = emis.reduce((s, e) => s + remainingPrincipal(e), 0);
  const cardDebt = cards.reduce((s, c) => s + c.currentBalance, 0);
  return emiDebt + cardDebt;
}

export function debtFreedomDate(emis: EMI[]) {
  let furthest = new Date();
  emis.forEach((e) => {
    if (remainingTenure(e) === 0) return;
    const end = emiEndDate(e);
    if (end > furthest) furthest = end;
  });
  return furthest;
}

export function stressScore(profile: Profile, emis: EMI[], cards: CreditCard[]) {
  const emiRatio = profile.monthlySalary > 0 ? totalMonthlyEMIs(emis) / profile.monthlySalary : 0;
  const debtIncomeAnnual = profile.monthlySalary > 0 ? totalDebt(emis, cards) / (profile.monthlySalary * 12) : 0;
  const util = totalCardUtilization(cards) / 100;
  const savings = profile.monthlySalary > 0 ? (profile.emergencyFund + profile.currentBalance) / (profile.monthlySalary * 6) : 0;

  // Normalize each component to 0-100 pain score
  const emiPain = Math.min(100, emiRatio * 200); // 50% EMI/income → 100 pain
  const debtPain = Math.min(100, debtIncomeAnnual * 100); // 1x annual income → 100 pain
  const utilPain = Math.min(100, util * 125); // 80% util → 100 pain
  const savingsRelief = Math.max(0, 100 - Math.min(100, savings * 100));

  const score = emiPain * 0.4 + debtPain * 0.2 + utilPain * 0.25 + savingsRelief * 0.15;
  return Math.round(Math.min(100, Math.max(0, score)));
}

export function stressBand(score: number): StressBand {
  if (score < 30) return "stable";
  if (score < 55) return "warning";
  if (score < 80) return "dangerous";
  return "critical";
}

export function stressLabel(band: StressBand) {
  return { stable: "Stable", warning: "Warning", dangerous: "Dangerous", critical: "Critical" }[band];
}

export function forecast(
  profile: Profile,
  emis: EMI[],
  bills: Bill[],
  cards: CreditCard[],
  monthsAhead = 18,
): ForecastPoint[] {
  const points: ForecastPoint[] = [];
  let balance = profile.currentBalance;
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const billsTotal = totalMonthlyBills(bills);
  const cardMinDues = cards.reduce((s, c) => s + c.minDue, 0);
  const variable = profile.monthlyVariableSpend;

  for (let i = 0; i < monthsAhead; i++) {
    const date = new Date(today);
    date.setMonth(date.getMonth() + i);

    const activeEMIs = emis.filter((e) => {
      const monthsFromStart = (date.getFullYear() - new Date(e.startDate).getFullYear()) * 12 +
        (date.getMonth() - new Date(e.startDate).getMonth());
      return monthsFromStart >= 0 && monthsFromStart < e.tenureMonths;
    });
    const emiSum = activeEMIs.reduce((s, e) => s + e.monthlyAmount, 0);

    const outflow = emiSum + billsTotal + cardMinDues + variable;
    const inflow = profile.monthlySalary;
    balance = balance + inflow - outflow;

    points.push({
      date: date.toISOString().slice(0, 10),
      balance: Math.round(balance),
      expectedInflow: inflow,
      expectedOutflow: Math.round(outflow),
    });
  }

  return points;
}

export function simulatePurchase(
  profile: Profile,
  emis: EMI[],
  cards: CreditCard[],
  purchase: { price: number; tenureMonths: number; interestRate: number; downPayment?: number },
) {
  const principal = purchase.price - (purchase.downPayment ?? 0);
  const monthly = emiAmount(principal, purchase.interestRate, purchase.tenureMonths);
  const totalCost = monthly * purchase.tenureMonths + (purchase.downPayment ?? 0);
  const totalInterest = monthly * purchase.tenureMonths - principal;

  const beforeScore = stressScore(profile, emis, cards);
  const ghostEMI: EMI = {
    id: "__sim__",
    name: "Simulated",
    category: "other",
    principal,
    monthlyAmount: monthly,
    interestRate: purchase.interestRate,
    tenureMonths: purchase.tenureMonths,
    monthsPaid: 0,
    startDate: new Date().toISOString(),
    createdAt: new Date().toISOString(),
  };
  const afterScore = stressScore(profile, [...emis, ghostEMI], cards);

  const beforeDebtFreedom = debtFreedomDate(emis);
  const afterDebtFreedom = debtFreedomDate([...emis, ghostEMI]);
  const delayMonths = Math.max(
    0,
    Math.round(
      (afterDebtFreedom.getTime() - beforeDebtFreedom.getTime()) / (1000 * 60 * 60 * 24 * 30.44),
    ),
  );

  return {
    monthlyEMI: monthly,
    totalCost,
    totalInterest,
    beforeScore,
    afterScore,
    stressIncrease: afterScore - beforeScore,
    debtFreedomDelayMonths: delayMonths,
    cashflowReduction: monthly,
  };
}
