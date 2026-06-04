export type ID = string;

export type EMI = {
  id: ID;
  name: string;
  category: "home" | "car" | "personal" | "education" | "credit_card" | "consumer_durable" | "other";
  principal: number;
  monthlyAmount: number;
  interestRate: number;
  tenureMonths: number;
  monthsPaid: number;
  startDate: string;
  createdAt: string;
};

export type CreditCard = {
  id: ID;
  name: string;
  bank: string;
  limit: number;
  currentBalance: number;
  minDue: number;
  statementDate: number;
  dueDate: number;
  interestRateAPR: number;
  createdAt: string;
};

export type Bill = {
  id: ID;
  name: string;
  amount: number;
  dueDay: number;
  category: "rent" | "utilities" | "subscription" | "insurance" | "groceries" | "other";
  createdAt: string;
};

export type Profile = {
  monthlySalary: number;
  salaryDay: number;
  currentBalance: number;
  emergencyFund: number;
  monthlyVariableSpend: number;
  currency: "INR" | "USD" | "EUR" | "GBP";
};

export type StressBand = "stable" | "warning" | "dangerous" | "critical";

export type ForecastPoint = {
  date: string;
  balance: number;
  expectedInflow: number;
  expectedOutflow: number;
};
