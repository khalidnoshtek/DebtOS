// The deterministic financial core now lives in @debtos/core (shared with mobile).
// The two Tailwind-string helpers below are web-only presentation and stay here.
export * from "@debtos/core";
import type { StressBand } from "@debtos/core";

export function stressColor(band: StressBand) {
  return {
    stable: "text-emerald-400",
    warning: "text-amber-400",
    dangerous: "text-orange-400",
    critical: "text-rose-500",
  }[band];
}

export function stressBg(band: StressBand) {
  return {
    stable: "bg-emerald-500/10 border-emerald-500/30",
    warning: "bg-amber-500/10 border-amber-500/30",
    dangerous: "bg-orange-500/10 border-orange-500/30",
    critical: "bg-rose-500/10 border-rose-500/30",
  }[band];
}
