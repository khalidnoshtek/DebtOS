"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { CreditCard, Receipt, TrendingDown, type LucideIcon } from "lucide-react";

const ACTIONS: { href: string; label: string; icon: LucideIcon; gradient: string }[] = [
  { href: "/emis?new=1", label: "Add EMI", icon: TrendingDown, gradient: "from-indigo-500/30 to-fuchsia-500/30" },
  { href: "/bills?new=1", label: "Add Bill", icon: Receipt, gradient: "from-amber-500/25 to-orange-500/25" },
  { href: "/cards?new=1", label: "Add Card", icon: CreditCard, gradient: "from-cyan-500/30 to-emerald-500/25" },
];

export function QuickActions() {
  return (
    <section className="mb-4 grid grid-cols-3 gap-2 sm:gap-3">
      {ACTIONS.map((a, i) => {
        const Icon = a.icon;
        return (
          <motion.div
            key={a.href}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25, delay: i * 0.04 }}
          >
            <Link
              href={a.href}
              className="group block rounded-2xl border border-white/8 bg-white/[0.02] p-3 transition-colors hover:bg-white/[0.05] sm:p-4"
            >
              <div
                className={`grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br ${a.gradient} sm:h-10 sm:w-10`}
              >
                <Icon className="h-4 w-4 text-white sm:h-5 sm:w-5" />
              </div>
              <div className="mt-2 text-xs font-medium text-white sm:mt-3 sm:text-sm">{a.label}</div>
            </Link>
          </motion.div>
        );
      })}
    </section>
  );
}
