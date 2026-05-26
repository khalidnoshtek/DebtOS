"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Loader2, ChevronDown, ChevronRight, Sparkles } from "lucide-react";

export function WorkingPill({
  label = "Working",
  detail,
}: {
  label?: string;
  detail?: string;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="inline-block">
      <button
        type="button"
        onClick={() => detail && setOpen((v) => !v)}
        className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/[0.03] px-2.5 py-1.5 text-xs text-white/70 transition-colors hover:bg-white/[0.06]"
      >
        <Loader2 className="h-3 w-3 animate-spin text-indigo-300" />
        <span>{label}</span>
        {detail && (open ? <ChevronDown className="h-3 w-3 opacity-50" /> : <ChevronRight className="h-3 w-3 opacity-50" />)}
      </button>
      <AnimatePresence>
        {open && detail && (
          <motion.pre
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="mt-2 max-h-48 overflow-auto rounded-lg border border-white/10 bg-black/40 p-3 text-[10px] font-mono leading-relaxed text-white/60"
          >
            {detail}
          </motion.pre>
        )}
      </AnimatePresence>
    </div>
  );
}

export function ThinkingPill() {
  return (
    <div className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/[0.03] px-2.5 py-1.5 text-xs text-white/60">
      <Sparkles className="h-3 w-3 animate-pulse text-indigo-300" />
      <span>Thinking…</span>
    </div>
  );
}
