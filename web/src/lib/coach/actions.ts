import { useStore } from "@/lib/store";
import type { ActionRecord } from "./types";
import type { Bill, CreditCard, EMI, Profile } from "@/lib/types";

const VALID_KINDS = ["add_emi", "add_card", "add_bill", "update_profile"];

type AnyAction =
  | { kind: "add_emi"; args: Partial<EMI> & { name: string; principal: number; interestRate: number; tenureMonths: number } }
  | { kind: "add_card"; args: Partial<CreditCard> & { name: string; bank: string; limit: number } }
  | { kind: "add_bill"; args: Partial<Bill> & { name: string; amount: number } }
  | { kind: "update_profile"; args: Partial<Profile> };

// Find a balanced { ... } substring starting at `start`. Returns the matched
// JSON text and the index past the closing brace, or null.
function findBalancedObject(text: string, start: number): { json: string; end: number } | null {
  let depth = 0;
  let inString = false;
  let escape = false;
  for (let i = start; i < text.length; i++) {
    const c = text[i];
    if (escape) { escape = false; continue; }
    if (c === "\\" && inString) { escape = true; continue; }
    if (c === '"') { inString = !inString; continue; }
    if (inString) continue;
    if (c === "{") depth++;
    else if (c === "}") {
      depth--;
      if (depth === 0) return { json: text.slice(start, i + 1), end: i + 1 };
    }
  }
  return null;
}

// Extract every action-shaped JSON object from the model output and return
// the prose with all of them removed.
export function extractActions(text: string): { cleanedText: string; raws: string[] } {
  const raws: string[] = [];
  const cuts: Array<[number, number]> = [];

  // Pass 1: <action>...</action> tags (the documented protocol)
  const tagRe = /<action>\s*([\s\S]*?)\s*<\/action>/g;
  let m: RegExpExecArray | null;
  while ((m = tagRe.exec(text)) !== null) {
    raws.push(m[1]);
    cuts.push([m.index, m.index + m[0].length]);
  }

  // Pass 2: ```json { ... } ``` fenced blocks
  const fenceRe = /```(?:json)?\s*(\{[\s\S]*?\})\s*```/g;
  while ((m = fenceRe.exec(text)) !== null) {
    if (cuts.some(([s, e]) => m!.index >= s && m!.index < e)) continue;
    raws.push(m[1]);
    cuts.push([m.index, m.index + m[0].length]);
  }

  // Pass 3: bare {"kind":"..."} objects with balanced braces
  for (const kind of VALID_KINDS) {
    const needle = `"kind"`;
    let i = 0;
    while ((i = text.indexOf(needle, i)) !== -1) {
      const openBrace = text.lastIndexOf("{", i);
      if (openBrace < 0) { i += needle.length; continue; }
      if (cuts.some(([s, e]) => openBrace >= s && openBrace < e)) { i += needle.length; continue; }
      const balanced = findBalancedObject(text, openBrace);
      if (!balanced) { i += needle.length; continue; }
      if (!balanced.json.includes(`"${kind}"`)) { i += needle.length; continue; }
      raws.push(balanced.json);
      cuts.push([openBrace, balanced.end]);
      i = balanced.end;
      break;
    }
  }

  // Build cleaned text by removing all cut ranges
  cuts.sort((a, b) => a[0] - b[0]);
  let cleaned = "";
  let cursor = 0;
  for (const [s, e] of cuts) {
    if (s < cursor) continue;
    cleaned += text.slice(cursor, s);
    cursor = e;
  }
  cleaned += text.slice(cursor);
  // Final scrub: any orphan opening / closing action tags or stray fences.
  cleaned = cleaned
    .replace(/<\/?action[^>]*>/gi, "")
    .replace(/```/g, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
  return { cleanedText: cleaned, raws };
}

// Strip in-progress / completed JSON from a streaming string so the user
// never sees raw schema. Returns the visible text and whether the model is
// currently writing JSON (so the UI can show a "working" pill).
export function sanitizeStreamingText(text: string): { text: string; working: boolean } {
  let s = text;
  let working = false;

  // Strip completed <action>...</action> (case-insensitive, allow attributes)
  s = s.replace(/<action[^>]*>[\s\S]*?<\/action>/gi, "");
  // Strip completed ```...```
  s = s.replace(/```[\s\S]*?```/g, "");
  // Strip completed bare {"kind":"..."} objects via balanced braces
  for (const kind of VALID_KINDS) {
    while (true) {
      const idx = s.indexOf(`"kind"`);
      if (idx < 0) break;
      const open = s.lastIndexOf("{", idx);
      if (open < 0) break;
      const balanced = findBalancedObject(s, open);
      if (!balanced) break;
      if (!balanced.json.includes(`"${kind}"`)) break;
      s = s.slice(0, open) + s.slice(balanced.end);
    }
  }

  // In-progress opening tag (no matching closing tag yet)
  const openTagMatch = /<action[^>]*>[\s\S]*$/i.exec(s);
  if (openTagMatch && !/<\/action>/i.test(openTagMatch[0])) {
    s = s.slice(0, openTagMatch.index);
    working = true;
  }

  // Partial opening-tag prefix at the very end: <, <a, <ac, ..., <action
  const partialOpen = s.match(/<(?:a(?:c(?:t(?:i(?:o(?:n)?)?)?)?)?)?$/i);
  if (partialOpen && typeof partialOpen.index === "number") {
    s = s.slice(0, partialOpen.index);
    working = true;
  }

  // Orphan closing tags
  s = s.replace(/<\/action>/gi, "");

  // In-progress code fence
  const openFence = s.lastIndexOf("```");
  if (openFence !== -1 && !s.slice(openFence + 3).includes("```")) {
    s = s.slice(0, openFence);
    working = true;
  }

  // Partial bare JSON at tail
  const openBrace = s.indexOf("{");
  if (openBrace !== -1 && /"kind"\s*:/.test(s.slice(openBrace))) {
    s = s.slice(0, openBrace);
    working = true;
  }

  return { text: s.replace(/\n{3,}/g, "\n\n").trim(), working };
}

// Tolerant of trailing commas, single quotes, unquoted keys, and stray text
// outside the JSON object.
function lenientJsonParse(raw: string): unknown {
  const cleaned = raw
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```\s*$/i, "")
    .trim();
  const firstBrace = cleaned.indexOf("{");
  const lastBrace = cleaned.lastIndexOf("}");
  const body = firstBrace >= 0 && lastBrace > firstBrace
    ? cleaned.slice(firstBrace, lastBrace + 1)
    : cleaned;
  const candidates = [
    body,
    body.replace(/,(\s*[}\]])/g, "$1"), // trailing commas
    body.replace(/'/g, '"'), // single → double quotes
    body
      .replace(/,(\s*[}\]])/g, "$1")
      .replace(/'/g, '"')
      .replace(/([{,]\s*)([A-Za-z_][A-Za-z0-9_]*)\s*:/g, '$1"$2":'), // bare keys
  ];
  for (const c of candidates) {
    try { return JSON.parse(c); } catch { /* try next */ }
  }
  return null;
}

export function applyAction(raw: string): ActionRecord {
  const parsed = lenientJsonParse(raw) as AnyAction | null;
  if (!parsed) {
    return { kind: "error", summary: "Couldn't read one entry", detail: raw.slice(0, 400) };
  }
  const store = useStore.getState();

  try {
    switch (parsed.kind) {
      case "add_emi": {
        const a = parsed.args;
        if (!a?.name || !a.principal || !a.tenureMonths) {
          return { kind: "error", summary: "Skipped EMI — missing fields", detail: JSON.stringify(a, null, 2) };
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
        return { kind: "add_emi", summary: `Added EMI · ${a.name}`, args: a as Record<string, unknown> };
      }
      case "add_card": {
        const a = parsed.args;
        if (!a?.name || !a.bank) {
          return { kind: "error", summary: "Skipped card — missing name/bank", detail: JSON.stringify(a, null, 2) };
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
        return { kind: "add_card", summary: `Added card · ${a.name}`, args: a as Record<string, unknown> };
      }
      case "add_bill": {
        const a = parsed.args;
        if (!a?.name || a.amount == null) {
          return { kind: "error", summary: "Skipped bill — missing name/amount", detail: JSON.stringify(a, null, 2) };
        }
        store.addBill({
          name: a.name,
          amount: Number(a.amount),
          dueDay: clampDay(a.dueDay ?? 1),
          category: (a.category ?? "other") as Bill["category"],
        });
        return { kind: "add_bill", summary: `Added bill · ${a.name}`, args: a as Record<string, unknown> };
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
          return { kind: "error", summary: "Empty profile update" };
        }
        store.updateProfile(patch);
        const fields = Object.keys(patch).join(", ");
        return { kind: "update_profile", summary: `Updated profile · ${fields}`, args: patch as Record<string, unknown> };
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
