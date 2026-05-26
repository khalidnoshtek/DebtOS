"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle2, AlertCircle, ChevronDown, ChevronRight } from "lucide-react";
import type { ActionRecord } from "@/lib/coach/types";

export function ActionPill({ action }: { action: ActionRecord }) {
  const [open, setOpen] = useState(false);
  const isError = action.kind === "error";
  const hasDetail = !!(action.args || action.detail);

  return (
    <div className="inline-block">
      <button
        type="button"
        onClick={() => hasDetail && setOpen((v) => !v)}
        className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs transition-colors ${
          isError
            ? "border-rose-500/30 bg-rose-500/10 text-rose-200 hover:bg-rose-500/15"
            : "border-emerald-500/30 bg-emerald-500/10 text-emerald-200 hover:bg-emerald-500/15"
        }`}
      >
        {isError ? <AlertCircle className="h-3 w-3" /> : <CheckCircle2 className="h-3 w-3" />}
        <span>{action.summary}</span>
        {hasDetail && (open ? <ChevronDown className="h-3 w-3 opacity-50" /> : <ChevronRight className="h-3 w-3 opacity-50" />)}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="mt-2 overflow-hidden"
          >
            {action.args && <ArgsTable args={action.args} />}
            {action.detail && (
              <pre className="mt-2 max-h-48 overflow-auto rounded-lg border border-white/10 bg-black/40 p-3 text-[10px] font-mono leading-relaxed text-white/60">
                {action.detail}
              </pre>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function ArgsTable({ args }: { args: Record<string, unknown> }) {
  return (
    <div className="rounded-lg border border-white/10 bg-white/[0.02] p-2">
      <table className="w-full text-[11px]">
        <tbody>
          {Object.entries(args).map(([k, v]) => (
            <tr key={k}>
              <td className="py-0.5 pr-3 align-top text-white/40 uppercase tracking-wider">{k}</td>
              <td className="py-0.5 align-top tabular text-white/80">{formatValue(v)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function formatValue(v: unknown): string {
  if (v == null) return "—";
  if (typeof v === "string") return v;
  if (typeof v === "number") return v.toLocaleString();
  return JSON.stringify(v);
}
