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

function mapEmiColumns(headers: string[]): EmiColMap {
  const map: EmiColMap = {};
  headers.forEach((h, i) => {
    const low = h.toLowerCase();
    if (map.monthly === undefined && /monthly\s*emi|monthly\s*payment|monthly\s*amount|^monthly$|^emi$/.test(low)) {
      map.monthly = i;
    } else if (map.tenure === undefined && /total\s*tenure|^tenure$|duration|total\s*months/.test(low)) {
      map.tenure = i;
    } else if (map.paid === undefined && /(months?\s*paid|^paid$)/.test(low) && !/left|remain/.test(low)) {
      map.paid = i;
    } else if (map.left === undefined && /(months?\s*left|months?\s*remaining|^left$|remaining)/.test(low)) {
      map.left = i;
    } else if (map.rate === undefined && /rate|interest|%|apr/.test(low)) {
      map.rate = i;
    } else if (map.principal === undefined && /principal|loan\s*amount|^amount$/.test(low) && !/monthly/.test(low)) {
      map.principal = i;
    }
  });
  // First column is the name if nothing else matched it as a number-y column
  if (map.name === undefined) {
    for (let i = 0; i < headers.length; i++) {
      if (i === map.monthly || i === map.tenure || i === map.paid || i === map.left || i === map.rate || i === map.principal) continue;
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

// Find any tabular section in the input, parse rows into EMI actions, apply
// them to the store deterministically, and return the actions + the text
// with the table removed so the LLM can answer any leftover question.
export function parseAndAddEmisFromText(text: string): TableParseResult {
  const sections = splitIntoSections(text);
  const allActions: ActionRecord[] = [];
  let rowsConsidered = 0;
  let rowsSkipped = 0;
  const remainingSections: string[] = [];

  for (const section of sections) {
    const table = detectTable(section);
    if (!table) {
      remainingSections.push(section);
      continue;
    }
    const map = mapEmiColumns(table.headers);
    if (map.name === undefined || (map.monthly === undefined && map.principal === undefined && map.tenure === undefined)) {
      remainingSections.push(section);
      continue;
    }

    for (const row of table.rows) {
      rowsConsidered++;
      const name = (row[map.name] ?? "").trim();
      if (!name) { rowsSkipped++; continue; }
      if (/^total/i.test(name)) { rowsSkipped++; continue; } // skip summary rows

      const monthlyVal = map.monthly !== undefined ? parseAmount(row[map.monthly]) : 0;
      const tenureFromCol = map.tenure !== undefined ? parseMonths(row[map.tenure]) : 0;
      const paidVal = map.paid !== undefined ? parseMonths(row[map.paid]) : 0;
      const leftVal = map.left !== undefined ? parseMonths(row[map.left]) : 0;
      const tenure = tenureFromCol > 0
        ? tenureFromCol
        : (paidVal + leftVal > 0 ? paidVal + leftVal : 0);

      const rate = map.rate !== undefined ? parseRate(row[map.rate]) || 12 : 12;
      let principal = map.principal !== undefined ? parseAmount(row[map.principal]) : 0;

      // Estimate missing principal from monthly EMI and tenure (rough but workable)
      if (!principal && monthlyVal > 0 && tenure > 0) {
        // Use reverse formula: approximate principal so EMI matches monthlyVal
        principal = estimatePrincipal(monthlyVal, rate, tenure);
      }

      if (!tenure || !monthlyVal && !principal) {
        rowsSkipped++;
        continue;
      }

      const finalTenure = tenure || (principal && monthlyVal ? Math.ceil(principal / monthlyVal) : 0);
      if (!finalTenure) { rowsSkipped++; continue; }

      const category = inferCategory(name);
      const finalPrincipal = principal || monthlyVal * finalTenure;

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
