"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { emiAmount } from "./calculations";
import type { Bill, CreditCard, EMI, Profile } from "./types";
import type { CoachRow } from "./coach/types";

function uid() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

type State = {
  profile: Profile;
  emis: EMI[];
  cards: CreditCard[];
  bills: Bill[];
  coachRows: CoachRow[];
  hydrated: boolean;
};

type Actions = {
  updateProfile: (patch: Partial<Profile>) => void;
  addEMI: (input: Omit<EMI, "id" | "createdAt" | "monthlyAmount"> & { monthlyAmount?: number }) => void;
  updateEMI: (id: string, patch: Partial<EMI>) => void;
  removeEMI: (id: string) => void;
  addCard: (input: Omit<CreditCard, "id" | "createdAt">) => void;
  updateCard: (id: string, patch: Partial<CreditCard>) => void;
  removeCard: (id: string) => void;
  addBill: (input: Omit<Bill, "id" | "createdAt">) => void;
  updateBill: (id: string, patch: Partial<Bill>) => void;
  removeBill: (id: string) => void;
  setCoachRows: (rowsOrFn: CoachRow[] | ((prev: CoachRow[]) => CoachRow[])) => void;
  clearCoachRows: () => void;
  seedDemo: () => void;
  resetAll: () => void;
};

const defaultProfile: Profile = {
  monthlySalary: 0,
  salaryDay: 1,
  currentBalance: 0,
  emergencyFund: 0,
  monthlyVariableSpend: 0,
  currency: "INR",
};

export const useStore = create<State & Actions>()(
  persist(
    (set, get) => ({
      profile: defaultProfile,
      emis: [],
      cards: [],
      bills: [],
      coachRows: [],
      hydrated: false,

      updateProfile: (patch) =>
        set((s) => ({ profile: { ...s.profile, ...patch } })),

      addEMI: (input) => {
        const monthly = input.monthlyAmount ?? emiAmount(input.principal, input.interestRate, input.tenureMonths);
        set((s) => ({
          emis: [
            ...s.emis,
            { ...input, monthlyAmount: monthly, id: uid(), createdAt: new Date().toISOString() } as EMI,
          ],
        }));
      },
      updateEMI: (id, patch) =>
        set((s) => ({ emis: s.emis.map((e) => (e.id === id ? { ...e, ...patch } : e)) })),
      removeEMI: (id) => set((s) => ({ emis: s.emis.filter((e) => e.id !== id) })),

      addCard: (input) =>
        set((s) => ({
          cards: [...s.cards, { ...input, id: uid(), createdAt: new Date().toISOString() }],
        })),
      updateCard: (id, patch) =>
        set((s) => ({ cards: s.cards.map((c) => (c.id === id ? { ...c, ...patch } : c)) })),
      removeCard: (id) => set((s) => ({ cards: s.cards.filter((c) => c.id !== id) })),

      addBill: (input) =>
        set((s) => ({
          bills: [...s.bills, { ...input, id: uid(), createdAt: new Date().toISOString() }],
        })),
      updateBill: (id, patch) =>
        set((s) => ({ bills: s.bills.map((b) => (b.id === id ? { ...b, ...patch } : b)) })),
      removeBill: (id) => set((s) => ({ bills: s.bills.filter((b) => b.id !== id) })),

      setCoachRows: (rowsOrFn) =>
        set((s) => ({
          coachRows:
            typeof rowsOrFn === "function" ? rowsOrFn(s.coachRows) : rowsOrFn,
        })),
      clearCoachRows: () => set({ coachRows: [] }),

      seedDemo: () => {
        const now = new Date();
        set({
          profile: {
            monthlySalary: 120000,
            salaryDay: 1,
            currentBalance: 85000,
            emergencyFund: 150000,
            monthlyVariableSpend: 28000,
            currency: "INR",
          },
          emis: [
            {
              id: uid(),
              name: "Home Loan — HDFC",
              category: "home",
              principal: 3500000,
              monthlyAmount: emiAmount(3500000, 8.6, 240),
              interestRate: 8.6,
              tenureMonths: 240,
              monthsPaid: 36,
              startDate: new Date(now.getFullYear() - 3, now.getMonth(), 5).toISOString(),
              createdAt: new Date().toISOString(),
            },
            {
              id: uid(),
              name: "Car Loan — ICICI",
              category: "car",
              principal: 800000,
              monthlyAmount: emiAmount(800000, 9.2, 60),
              interestRate: 9.2,
              tenureMonths: 60,
              monthsPaid: 18,
              startDate: new Date(now.getFullYear() - 1, now.getMonth() - 6, 10).toISOString(),
              createdAt: new Date().toISOString(),
            },
            {
              id: uid(),
              name: "iPhone — Bajaj Finserv",
              category: "consumer_durable",
              principal: 120000,
              monthlyAmount: emiAmount(120000, 14, 12),
              interestRate: 14,
              tenureMonths: 12,
              monthsPaid: 4,
              startDate: new Date(now.getFullYear(), now.getMonth() - 4, 15).toISOString(),
              createdAt: new Date().toISOString(),
            },
          ],
          cards: [
            {
              id: uid(),
              name: "HDFC Regalia",
              bank: "HDFC",
              limit: 350000,
              currentBalance: 142000,
              minDue: 7100,
              statementDate: 5,
              dueDate: 25,
              interestRateAPR: 42,
              createdAt: new Date().toISOString(),
            },
            {
              id: uid(),
              name: "Axis Magnus",
              bank: "Axis",
              limit: 500000,
              currentBalance: 88000,
              minDue: 4400,
              statementDate: 10,
              dueDate: 28,
              interestRateAPR: 39.6,
              createdAt: new Date().toISOString(),
            },
          ],
          bills: [
            { id: uid(), name: "Rent", amount: 35000, dueDay: 5, category: "rent", createdAt: new Date().toISOString() },
            { id: uid(), name: "Electricity", amount: 3500, dueDay: 12, category: "utilities", createdAt: new Date().toISOString() },
            { id: uid(), name: "Internet", amount: 1200, dueDay: 8, category: "utilities", createdAt: new Date().toISOString() },
            { id: uid(), name: "Netflix", amount: 649, dueDay: 14, category: "subscription", createdAt: new Date().toISOString() },
            { id: uid(), name: "Health Insurance", amount: 2800, dueDay: 20, category: "insurance", createdAt: new Date().toISOString() },
          ],
        });
      },

      resetAll: () =>
        set({
          profile: defaultProfile,
          emis: [],
          cards: [],
          bills: [],
          coachRows: [],
        }),
    }),
    {
      name: "debtos-v1",
      storage: createJSONStorage(() => localStorage),
      onRehydrateStorage: () => (state) => {
        if (state) state.hydrated = true;
      },
    },
  ),
);
