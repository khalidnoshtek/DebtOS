"use client";

import { useStore } from "./store";
import type { Bill, CreditCard, EMI, Profile } from "./types";
import type { CoachRow } from "./coach/types";

const APP_TAG = "DebtOS";
const SCHEMA_VERSION = 1;

type ExportPayload = {
  app: typeof APP_TAG;
  version: number;
  exportedAt: string;
  data: {
    profile: Profile;
    emis: EMI[];
    cards: CreditCard[];
    bills: Bill[];
    coachRows: CoachRow[];
  };
};

export function buildExportPayload(): ExportPayload {
  const s = useStore.getState();
  return {
    app: APP_TAG,
    version: SCHEMA_VERSION,
    exportedAt: new Date().toISOString(),
    data: {
      profile: s.profile,
      emis: s.emis,
      cards: s.cards,
      bills: s.bills,
      coachRows: s.coachRows,
    },
  };
}

export function exportToFile() {
  const payload = buildExportPayload();
  const json = JSON.stringify(payload, null, 2);
  const blob = new Blob([json], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  const date = new Date().toISOString().slice(0, 10);
  a.href = url;
  a.download = `debtos-backup-${date}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export type ImportResult =
  | {
      ok: true;
      counts: { emis: number; cards: number; bills: number; chat: number };
    }
  | { ok: false; error: string };

type ImportMode = "replace" | "merge";

export async function importFromFile(file: File, mode: ImportMode = "replace"): Promise<ImportResult> {
  let parsed: unknown;
  try {
    const text = await file.text();
    parsed = JSON.parse(text);
  } catch (err) {
    return { ok: false, error: err instanceof Error ? `Not a valid JSON file: ${err.message}` : "Not a valid JSON file" };
  }

  if (!parsed || typeof parsed !== "object") {
    return { ok: false, error: "Empty or malformed file" };
  }
  const root = parsed as Partial<ExportPayload>;

  if (root.app !== APP_TAG) {
    return { ok: false, error: `Not a DebtOS backup (app="${root.app}")` };
  }

  if (typeof root.version !== "number") {
    return { ok: false, error: "Missing schema version" };
  }
  if (root.version > SCHEMA_VERSION) {
    return { ok: false, error: `Backup was made by a newer version of DebtOS (v${root.version}). Update the app and try again.` };
  }

  const data = root.data;
  if (
    !data ||
    typeof data !== "object" ||
    !data.profile ||
    !Array.isArray(data.emis) ||
    !Array.isArray(data.cards) ||
    !Array.isArray(data.bills)
  ) {
    return { ok: false, error: "Backup file is missing expected sections" };
  }

  const profile = sanitizeProfile(data.profile);
  const emis = sanitizeList<EMI>(data.emis, isEmi);
  const cards = sanitizeList<CreditCard>(data.cards, isCard);
  const bills = sanitizeList<Bill>(data.bills, isBill);
  const coachRows = Array.isArray(data.coachRows) ? (data.coachRows as CoachRow[]) : [];

  if (mode === "replace") {
    useStore.setState({ profile, emis, cards, bills, coachRows });
  } else {
    const current = useStore.getState();
    const dedupe = <T extends { id: string }>(prev: T[], incoming: T[]) => {
      const seen = new Set(prev.map((p) => p.id));
      return [...prev, ...incoming.filter((i) => !seen.has(i.id))];
    };
    useStore.setState({
      profile: profile.monthlySalary > 0 ? profile : current.profile,
      emis: dedupe(current.emis, emis),
      cards: dedupe(current.cards, cards),
      bills: dedupe(current.bills, bills),
      coachRows: current.coachRows,
    });
  }

  return {
    ok: true,
    counts: { emis: emis.length, cards: cards.length, bills: bills.length, chat: coachRows.length },
  };
}

// Type-narrowing helpers — defensive, since the file came from the user's disk

function isEmi(v: unknown): v is EMI {
  const e = v as Partial<EMI>;
  return !!e && typeof e.id === "string" && typeof e.name === "string" && typeof e.monthlyAmount === "number";
}

function isCard(v: unknown): v is CreditCard {
  const c = v as Partial<CreditCard>;
  return !!c && typeof c.id === "string" && typeof c.name === "string" && typeof c.limit === "number";
}

function isBill(v: unknown): v is Bill {
  const b = v as Partial<Bill>;
  return !!b && typeof b.id === "string" && typeof b.name === "string" && typeof b.amount === "number";
}

function sanitizeList<T>(list: unknown[], pred: (v: unknown) => v is T): T[] {
  return list.filter(pred);
}

function sanitizeProfile(p: unknown): Profile {
  const x = (p ?? {}) as Partial<Profile>;
  return {
    monthlySalary: Number(x.monthlySalary) || 0,
    salaryDay: Number(x.salaryDay) || 1,
    currentBalance: Number(x.currentBalance) || 0,
    emergencyFund: Number(x.emergencyFund) || 0,
    monthlyVariableSpend: Number(x.monthlyVariableSpend) || 0,
    currency: (x.currency as Profile["currency"]) || "INR",
  };
}
