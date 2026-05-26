"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  LayoutDashboard,
  Activity,
  CreditCard,
  Calculator,
  TrendingDown,
  AlertTriangle,
  Settings,
  Menu,
  X,
  Receipt,
  Bot,
} from "lucide-react";
import { cn } from "@/lib/utils";

const nav = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/emis", label: "EMIs", icon: TrendingDown },
  { href: "/cards", label: "Credit Cards", icon: CreditCard },
  { href: "/bills", label: "Bills", icon: Receipt },
  { href: "/stress", label: "Stress Engine", icon: AlertTriangle },
  { href: "/simulator", label: "Simulator", icon: Calculator },
  { href: "/forecast", label: "Forecast", icon: Activity },
  { href: "/coach", label: "Coach", icon: Bot },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setOpen(!open)}
        className="fixed left-4 top-4 z-40 rounded-lg border border-white/10 bg-zinc-950/80 p-2 text-white backdrop-blur lg:hidden"
        aria-label="Toggle navigation"
      >
        {open ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
      </button>

      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-30 w-64 border-r border-white/8 bg-zinc-950/60 backdrop-blur-xl transition-transform duration-300 lg:translate-x-0",
          open ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="flex h-full flex-col">
          <Link href="/" className="flex items-center gap-2 px-6 py-6">
            <div className="grid h-8 w-8 place-items-center rounded-lg bg-gradient-to-br from-indigo-500 to-fuchsia-500 font-bold text-white">
              D
            </div>
            <div>
              <div className="text-base font-semibold text-white">DebtOS</div>
              <div className="text-[10px] uppercase tracking-widest text-white/40">survival mode</div>
            </div>
          </Link>

          <nav className="flex-1 space-y-1 px-3">
            {nav.map((item) => {
              const active = pathname === item.href;
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setOpen(false)}
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
                    active
                      ? "bg-white/10 text-white shadow-[inset_0_1px_0_0_rgba(255,255,255,0.06)]"
                      : "text-white/55 hover:bg-white/5 hover:text-white",
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <div className="px-6 py-4 text-[10px] text-white/30">
            DebtOS v0.1 · webapp
          </div>
        </div>
      </aside>
    </>
  );
}
