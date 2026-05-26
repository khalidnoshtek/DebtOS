import { useStore } from "@/lib/store";
import { emiAmount } from "@/lib/calculations";
import type { ActionRecord } from "./types";
import type { EMI } from "@/lib/types";

type Table = { headers: string[]; rows: string[][] };

type EmiColMap = {
  name?: number;
  monthly?: number;
  tenure?: number;
  paid?: number;
  left?: number;
  rate?: number;
  principal?: number;
};

// --- Number parsing ---------------------------------------------------------

export function parseAmount(s: string | undefined): number {
  if (!s) return 0;
  const cleaned = String(s).trim();
  if (!cleaned) return 0;
  const lower = cleaned.toLowerCase();
  let mult = 1;
  if (/(crore|cr\b)/.test(lower)) mult = 10_000_000;
  else if (/(lakh|lac\b|\bl\b|[\d.]l$)/.test(lower)) mult = 100_000;
  else if (/\dk\b|\dk$/.test(lower)) mult = 1_000;
  const num = parseFloat(lower.replace(/[^\d.]/g, ""));
  if (!Number.isFinite(num)) return 0;
  return num * mult;
}

export function parseMonths(s: string | undefined): number {
  if (!s) return 0;
  const lower = String(s).toLowerCase();
  let total = 0;
  const y = lower.match(/(\d+)\s*(?:y|yr|year)/);
  if (y) total += parseInt(y[1], 10) * 12;
  const m = lower.match(/(\d+)\s*(?:m|mo|month)/);
  if (m) total += parseInt(m[1], 10);
  if (total === 0) {
    const n = lower.match(/(\d+(?:\.\d+)?)/);
    if (n) total = Math.round(parseFloat(n[1]));
  }
  return total;
}

function parseRate(s: string | undefined): number {
  if (!s) return 0;
  const n = parseFloat(String(s).replace(/[^\d.]/g, ""));
  return Number.isFinite(n) ? n : 0;
}

// --- Table detection --------------------------------------------------------

function parseMarkdownTable(text: string): Table | null {
  const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);
  const tableLines = lines.filter((l) => l.startsWith("|") && l.endsWith("|") && l.length > 2);
  if (tableLines.length < 2) return null;
  const headers = splitPipes(tableLines[0]);
  const start = /^\|[\s\-:|]+\|$/.test(tableLines[1]) ? 2 : 1;
  const rows = tableLines.slice(start).map(splitPipes).filter((r) => r.some((c) => c.length > 0));
  if (headers.length < 2 || rows.length === 0) return null;
  return { headers, rows };
}

function splitPipes(line: string): string[] {
  return line.split("|").slice(1, -1).map((c) => c.trim());
}

function parseCsvLike(text: string): Table | null {
  const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);
  // Find a run of consecutive lines with the same number of commas (>= 1)
  let bestStart = -1;
  let bestLen = 0;
  let bestCols = 0;
  for (let i = 0; i < lines.length; i++) {
    const cols = countCommas(lines[i]) + 1;
    if (cols < 2) continue;
    let j = i;
    while (j < lines.length && countCommas(lines[j]) + 1 === cols) j++;
    if (j - i > bestLen) {
      bestLen = j - i;
      bestStart = i;
      bestCols = cols;
    }
    i = j;
  }
  if (bestLen < 2 || bestCols < 2) return null;
  const headers = parseCsvRow(lines[bestStart]);
  const rows = lines.slice(bestStart + 1, bestStart + bestLen).map(parseCsvRow);
  return { headers, rows };
}

function countCommas(line: string): number {
  // Naive — doesn't handle quoted commas. Fine for the formats we see.
  return (line.match(/,/g) || []).length;
}

function parseCsvRow(line: string): string[] {
  const out: string[] = [];
  let cur = "";
  let inQ = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"' && line[i + 1] === '"') { cur += '"'; i++; continue; }
    if (c === '"') { inQ = !inQ; continue; }
    if (c === "," && !inQ) { out.push(cur.trim()); cur = ""; continue; }
    cur += c;
  }
  out.push(cur.trim());
  return out;
}

function detectTable(text: string): Table | null {
  return parseMarkdownTable(text) || parseCsvLike(text);
}

// --- Column mapping ---------------------------------------------------------

function mapEmiColumns(headers: string[], rows: string[][]): EmiColMap {
  const map: EmiColMap = {};

  // Compute how "numeric" each column's data is — vital to disambiguate
  // an "EMI" header that's a loan-name column from one that's an amount.
  const sample = rows.slice(0, Math.min(rows.length, 10));
  const numericRatio = headers.map((_, i) => {
    let n = 0;
    let total = 0;
    for (const r of sample) {
      const v = (r[i] ?? "").trim();
      if (!v) continue;
      total++;
      if (parseAmount(v) > 0 || parseMonths(v) > 0 || /^\d/.test(v)) n++;
    }
    return total ? n / total : 0;
  });

  const isNumeric = (i: number) => numericRatio[i] >= 0.5;
  const used = () =>
    [map.monthly, map.tenure, map.paid, map.left, map.rate, map.principal, map.name].filter((v) => v !== undefined) as number[];

  // Pass 1: unambiguous header + numeric data
  headers.forEach((h, i) => {
    const low = h.toLowerCase().trim();
    if (used().includes(i)) return;
    if (!isNumeric(i)) return;

    if (map.monthly === undefined && /(monthly|payment|installment|installation)/.test(low)) {
      map.monthly = i;
    } else if (map.tenure === undefined && /(total\s*tenure|^tenure$|duration|total\s*months)/.test(low)) {
      map.tenure = i;
    } else if (map.paid === undefined && /(^paid$|months?\s*paid|paid\s*months?)/.test(low) && !/left|remain/.test(low)) {
      map.paid = i;
    } else if (map.left === undefined && /(^left$|months?\s*left|months?\s*remaining|remaining)/.test(low)) {
      map.left = i;
    } else if (map.rate === undefined && /(interest\s*rate|^rate$|interest|%|apr)/.test(low)) {
      map.rate = i;
    } else if (map.principal === undefined && /(principal|loan\s*amount|outstanding|^amount$)/.test(low) && !/monthly/.test(low)) {
      map.principal = i;
    }
  });

  // Pass 2: bare "EMI" header — only counts as monthly if column is numeric
  // AND we don't already have a monthly column.
  if (map.monthly === undefined) {
    for (let i = 0; i < headers.length; i++) {
      if (used().includes(i)) continue;
      if (/^emi(\s*amount)?$/i.test(headers[i].trim()) && isNumeric(i)) {
        map.monthly = i;
        break;
      }
    }
  }

  // Name: prefer a text-heavy (non-numeric) column with a name-ish header.
  if (map.name === undefined) {
    for (let i = 0; i < headers.length; i++) {
      if (used().includes(i)) continue;
      const low = headers[i].toLowerCase();
      if (numericRatio[i] < 0.3 && /(name|emi|loan|description|item|account|product|holder)/.test(low)) {
        map.name = i;
        break;
      }
    }
  }

  // Fallback name: first remaining text-heavy column.
  if (map.name === undefined) {
    for (let i = 0; i < headers.length; i++) {
      if (used().includes(i)) continue;
      if (numericRatio[i] < 0.3) {
        map.name = i;
        break;
      }
    }
  }

  // Last-ditch name: first unused column at all.
  if (map.name === undefined) {
    for (let i = 0; i < headers.length; i++) {
      if (used().includes(i)) continue;
      map.name = i;
      break;
    }
  }

  return map;
}

function inferCategory(name: string): EMI["category"] {
  const n = name.toLowerCase();
  if (/home|house|mortgage/.test(n)) return "home";
  if (/\bcar\b|vehicle|auto|bike|two[-\s]?wheeler/.test(n)) return "car";
  if (/personal/.test(n)) return "personal";
  if (/education|edu|student/.test(n)) return "education";
  if (/credit\s*card|\bcc\b/.test(n)) return "credit_card";
  if (/iphone|samsung|laptop|phone|flipkart|amazon|bajaj|paytech|durable|opus|venus|offus|mer|appliance|dreamplug/.test(n)) return "consumer_durable";
  return "other";
}

// --- Entry points -----------------------------------------------------------

export type TableParseResult = {
  parsed: ActionRecord[];
  rowsConsidered: number;
  rowsSkipped: number;
  remainingText: string;
};

// Find tables, CSV blocks, OR JSON arrays in the input, extract EMI rows,
// apply them to the store, and return the text with the recognized blocks
// removed so the LLM can answer any leftover question.
export function parseAndAddEmisFromText(text: string): TableParseResult {
  const allActions: ActionRecord[] = [];
  let rowsConsidered = 0;
  let rowsSkipped = 0;
  let remainder = text;

  // ---- JSON array path ----------------------------------------------------
  // Detect ALL top-level JSON arrays in the text (people often paste them
  // with leading prose). Walk the string finding balanced [...] blocks.
  let scan = 0;
  while (scan < remainder.length) {
    const i = remainder.indexOf("[", scan);
    if (i < 0) break;
    const balanced = findBalancedBracket(remainder, i);
    if (!balanced) { scan = i + 1; continue; }
    let arr: unknown;
    try {
      arr = JSON.parse(balanced.json);
    } catch {
      scan = i + 1;
      continue;
    }
    if (!Array.isArray(arr) || arr.length === 0 || typeof arr[0] !== "object") {
      scan = balanced.end;
      continue;
    }
    const { added, considered, skipped } = applyEmiObjects(arr as Record<string, unknown>[]);
    allActions.push(...added);
    rowsConsidered += considered;
    rowsSkipped += skipped;
    // Cut the JSON out of remainder so the LLM doesn't re-see it
    remainder = remainder.slice(0, i) + remainder.slice(balanced.end);
    scan = i;
  }

  // ---- Markdown / CSV table path -----------------------------------------
  const sections = splitIntoSections(remainder);
  const remainingSections: string[] = [];

  for (const section of sections) {
    const table = detectTable(section);
    if (!table) {
      remainingSections.push(section);
      continue;
    }
    const map = mapEmiColumns(table.headers, table.rows);
    if (map.name === undefined || (map.monthly === undefined && map.principal === undefined && map.tenure === undefined)) {
      remainingSections.push(section);
      continue;
    }

    for (const row of table.rows) {
      rowsConsidered++;
      const name = (row[map.name] ?? "").trim();
      if (!name) { rowsSkipped++; continue; }
      if (/^total/i.test(name)) { rowsSkipped++; continue; }

      const monthlyVal = map.monthly !== undefined ? parseAmount(row[map.monthly]) : 0;
      const tenureFromCol = map.tenure !== undefined ? parseMonths(row[map.tenure]) : 0;
      const paidVal = map.paid !== undefined ? parseMonths(row[map.paid]) : 0;
      const leftVal = map.left !== undefined ? parseMonths(row[map.left]) : 0;
      const tenure = tenureFromCol > 0 ? tenureFromCol : (paidVal + leftVal > 0 ? paidVal + leftVal : 0);

      // Treat rate = 0 as a legit no-cost EMI rather than "missing".
      const parsedRate = map.rate !== undefined ? parseRate(row[map.rate]) : NaN;
      const rate = Number.isFinite(parsedRate) && parsedRate >= 0 ? parsedRate : 12;

      let principal = map.principal !== undefined ? parseAmount(row[map.principal]) : 0;
      if (!principal && monthlyVal > 0 && tenure > 0) {
        principal = estimatePrincipal(monthlyVal, rate, tenure);
      }

      const finalTenure = tenure || (principal && monthlyVal ? Math.ceil(principal / monthlyVal) : 0);
      if (!finalTenure || (!monthlyVal && !principal)) { rowsSkipped++; continue; }

      const finalPrincipal = principal || monthlyVal * finalTenure;
      const category = inferCategory(name);

      useStore.getState().addEMI({
        name,
        category,
        principal: finalPrincipal,
        interestRate: rate,
        tenureMonths: finalTenure,
        monthsPaid: paidVal,
        startDate: new Date().toISOString(),
      });

      allActions.push({
        kind: "add_emi",
        summary: `Added EMI · ${name}`,
        args: {
          name,
          category,
          principal: Math.round(finalPrincipal),
          monthlyAmount: monthlyVal || Math.round(emiAmount(finalPrincipal, rate, finalTenure)),
          interestRate: rate,
          tenureMonths: finalTenure,
          monthsPaid: paidVal,
        },
      });
    }
  }

  return {
    parsed: allActions,
    rowsConsidered,
    rowsSkipped,
    remainingText: remainingSections.join("\n\n").trim(),
  };
}

// --- JSON object → EMI ------------------------------------------------------

function applyEmiObjects(items: Record<string, unknown>[]): {
  added: ActionRecord[];
  considered: number;
  skipped: number;
} {
  const added: ActionRecord[] = [];
  let skipped = 0;

  for (const raw of items) {
    if (!raw || typeof raw !== "object") { skipped++; continue; }
    const obj = lowercaseKeys(raw);
    const bank = pickStr(obj, ["bank", "lender", "issuer"]);
    let name = pickStr(obj, ["name", "loan", "emi", "description", "title", "account"]);
    if (!name) { skipped++; continue; }
    if (bank && !name.toLowerCase().includes(bank.toLowerCase())) {
      // keep both in the display name for clarity
      name = `${name} (${bank})`;
    }

    const monthly = pickNum(obj, ["monthly_emi", "monthlyemi", "monthly", "monthly_amount", "monthlyamount", "payment", "installment"]);
    const principal = pickNum(obj, ["principal", "outstanding", "loan_amount", "loanamount", "balance", "amount"]);
    const tenure = pickNum(obj, ["tenure", "total_tenure", "totaltenure", "total_months", "totalmonths", "duration"]);
    const paid = pickNum(obj, ["months_paid", "monthspaid", "paid"]);
    const left = pickNum(obj, ["months_left", "monthsleft", "left", "remaining", "months_remaining", "monthsremaining"]);

    const rawRate = pickNum(obj, ["interest_rate", "interestrate", "rate", "interest", "apr"], { allowZero: true });
    const rate = Number.isFinite(rawRate) && rawRate >= 0 ? rawRate : 12;

    const finalTenure = tenure > 0 ? tenure : paid + left;
    if (!finalTenure) { skipped++; continue; }
    if (!monthly && !principal) { skipped++; continue; }

    let finalPrincipal = principal;
    if (!finalPrincipal && monthly > 0) {
      finalPrincipal = estimatePrincipal(monthly, rate, finalTenure);
    }
    if (!finalPrincipal) finalPrincipal = monthly * finalTenure;

    const category = inferCategory(name);

    useStore.getState().addEMI({
      name,
      category,
      principal: finalPrincipal,
      interestRate: rate,
      tenureMonths: finalTenure,
      monthsPaid: paid,
      startDate: new Date().toISOString(),
    });

    added.push({
      kind: "add_emi",
      summary: `Added EMI · ${name}`,
      args: {
        name,
        category,
        principal: Math.round(finalPrincipal),
        monthlyAmount: monthly || Math.round(emiAmount(finalPrincipal, rate, finalTenure)),
        interestRate: rate,
        tenureMonths: finalTenure,
        monthsPaid: paid,
      },
    });
  }

  return { added, considered: items.length, skipped };
}

function lowercaseKeys(obj: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const k of Object.keys(obj)) out[k.toLowerCase().replace(/[^a-z0-9_]/g, "_")] = obj[k];
  return out;
}

function pickStr(obj: Record<string, unknown>, keys: string[]): string | undefined {
  for (const k of keys) {
    const v = obj[k];
    if (typeof v === "string" && v.trim()) return v.trim();
    if (typeof v === "number") return String(v);
  }
  return undefined;
}

function pickNum(
  obj: Record<string, unknown>,
  keys: string[],
  opts: { allowZero?: boolean } = {},
): number {
  for (const k of keys) {
    const v = obj[k];
    if (typeof v === "number" && Number.isFinite(v)) {
      if (v > 0 || opts.allowZero) return v;
    }
    if (typeof v === "string") {
      const n = parseAmount(v);
      if (n > 0) return n;
      if (opts.allowZero && /^0+(?:\.0+)?$/.test(v.trim())) return 0;
    }
  }
  return 0;
}

function findBalancedBracket(text: string, start: number): { json: string; end: number } | null {
  if (text[start] !== "[") return null;
  let depth = 0;
  let inString = false;
  let escape = false;
  for (let i = start; i < text.length; i++) {
    const c = text[i];
    if (escape) { escape = false; continue; }
    if (c === "\\" && inString) { escape = true; continue; }
    if (c === '"') { inString = !inString; continue; }
    if (inString) continue;
    if (c === "[") depth++;
    else if (c === "]") {
      depth--;
      if (depth === 0) return { json: text.slice(start, i + 1), end: i + 1 };
    }
  }
  return null;
}

function splitIntoSections(text: string): string[] {
  // Split on file-extractor markers, then double newlines.
  const parts = text.split(/\n(?=### (?:Sheet|Page):)/g);
  return parts.flatMap((p) => p.split(/\n\n+/));
}

function estimatePrincipal(monthly: number, annualRate: number, tenureMonths: number): number {
  if (tenureMonths <= 0) return 0;
  if (annualRate === 0) return monthly * tenureMonths;
  const r = annualRate / 12 / 100;
  const pow = Math.pow(1 + r, tenureMonths);
  return (monthly * (pow - 1)) / (r * pow);
}
