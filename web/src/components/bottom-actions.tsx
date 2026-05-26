"use client";

import Link from "next/link";
import { CreditCard, Receipt, TrendingDown, type LucideIcon } from "lucide-react";

const ACTIONS: { href: string; label: string; icon: LucideIcon; iconBg: string }[] = [
  { href: "/emis?new=1", label: "Add EMI", icon: TrendingDown, iconBg: "from-indigo-500/40 to-fuchsia-500/40" },
  { href: "/bills?new=1", label: "Add Bill", icon: Receipt, iconBg: "from-amber-500/35 to-orange-500/35" },
  { href: "/cards?new=1", label: "Add Card", icon: CreditCard, iconBg: "from-cyan-500/40 to-emerald-500/40" },
];

// Fixed bottom action bar — mobile only (desktop has the sidebar).
// Sits above Android's system nav using safe-area-inset-bottom.
export function BottomActions() {
  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-30 flex border-t border-white/10 bg-zinc-950/85 backdrop-blur-xl lg:hidden"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      aria-label="Quick actions"
    >
      {ACTIONS.map((a) => {
        const Icon = a.icon;
        return (
          <Link
            key={a.href}
            href={a.href}
            className="flex flex-1 flex-col items-center gap-1 py-2.5 transition-colors active:bg-white/5"
          >
            <div
              className={`grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br ${a.iconBg}`}
            >
              <Icon className="h-4 w-4 text-white" />
            </div>
            <span className="text-[11px] font-medium text-white/80">{a.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
