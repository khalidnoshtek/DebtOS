import { type HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export function Badge({
  className,
  variant = "default",
  ...props
}: HTMLAttributes<HTMLDivElement> & { variant?: "default" | "stable" | "warning" | "dangerous" | "critical" }) {
  const variants = {
    default: "bg-white/5 text-white/70 border-white/10",
    stable: "bg-emerald-500/10 text-emerald-300 border-emerald-500/20",
    warning: "bg-amber-500/10 text-amber-300 border-amber-500/20",
    dangerous: "bg-orange-500/10 text-orange-300 border-orange-500/20",
    critical: "bg-rose-500/10 text-rose-300 border-rose-500/30",
  };
  return (
    <div
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-[10px] font-medium tracking-wide uppercase",
        variants[variant],
        className,
      )}
      {...props}
    />
  );
}
