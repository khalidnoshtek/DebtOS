"use client";

import { motion } from "framer-motion";
import { type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export function StatCard({
  label,
  value,
  hint,
  icon: Icon,
  trend,
  className,
  delay = 0,
}: {
  label: string;
  value: string;
  hint?: string;
  icon?: LucideIcon;
  trend?: "up" | "down" | "neutral";
  className?: string;
  delay?: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay }}
      className={cn(
        "rounded-2xl border border-white/8 bg-white/[0.02] p-5 backdrop-blur-xl",
        "shadow-[inset_0_1px_0_0_rgba(255,255,255,0.04)]",
        className,
      )}
    >
      <div className="flex items-center justify-between">
        <div className="text-[11px] uppercase tracking-wider text-white/50">{label}</div>
        {Icon && <Icon className="h-3.5 w-3.5 text-white/30" />}
      </div>
      <div className="tabular mt-2 text-2xl font-semibold text-white md:text-3xl">{value}</div>
      {hint && (
        <div
          className={cn(
            "mt-1 text-xs",
            trend === "up" && "text-emerald-400",
            trend === "down" && "text-rose-400",
            (!trend || trend === "neutral") && "text-white/40",
          )}
        >
          {hint}
        </div>
      )}
    </motion.div>
  );
}
