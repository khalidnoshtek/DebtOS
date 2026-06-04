import type { Bill, CreditCard, EMI, Profile } from "./types";
import type { CoachRow } from "./coach-types";

export const APP_TAG = "DebtOS";
export const SCHEMA_VERSION = 1;

export type BackupData = {
  profile: Profile;
  emis: EMI[];
  cards: CreditCard[];
  bills: Bill[];
  coachRows: CoachRow[];
};

export type ExportPayload = {
  app: typeof APP_TAG;
  version: number;
  exportedAt: string;
  data: BackupData;
};

export type ImportMode = "replace" | "merge";

export type ImportCounts = { emis: number; cards: number; bills: number; chat: number };

export type ParsedImport =
  | { ok: true; data: BackupData; counts: ImportCounts }
  | { ok: false; error: string };

/** Build the serializable backup payload from current store data. Pure. */
export function buildExportPayload(state: BackupData): ExportPayload {
  return {
    app: APP_TAG,
    version: SCHEMA_VERSION,
    exportedAt: new Date().toISOString(),
    data: {
      profile: state.profile,
      emis: state.emis,
      cards: state.cards,
      bills: state.bills,
      coachRows: state.coachRows,
    },
  };
}

/** A stable filename for a backup written today. */
export function backupFilename(date = new Date()): string {
  return `debtos-backup-${date.toISOString().slice(0, 10)}.json`;
}

/**
 * Validate + sanitize a backup JSON string. Defensive — the text came from the
 * user's disk / a picked file. Pure; no platform APIs.
 */
export function parseImport(text: string): ParsedImport {
  let parsed: unknown;
  try {
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

  return {
    ok: true,
    data: { profile, emis, cards, bills, coachRows },
    counts: { emis: emis.length, cards: cards.length, bills: bills.length, chat: coachRows.length },
  };
}

/** Merge incoming backup into current data, deduping by id. Pure. */
export function mergeBackup(current: BackupData, incoming: BackupData): BackupData {
  const dedupe = <T extends { id: string }>(prev: T[], next: T[]) => {
    const seen = new Set(prev.map((p) => p.id));
    return [...prev, ...next.filter((i) => !seen.has(i.id))];
  };
  return {
    profile: incoming.profile.monthlySalary > 0 ? incoming.profile : current.profile,
    emis: dedupe(current.emis, incoming.emis),
    cards: dedupe(current.cards, incoming.cards),
    bills: dedupe(current.bills, incoming.bills),
    coachRows: current.coachRows,
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
