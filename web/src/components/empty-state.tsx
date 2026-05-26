"use client";

import { Sparkles, type LucideIcon } from "lucide-react";
import { Button } from "./ui/button";
import { useStore } from "@/lib/store";

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  const seedDemo = useStore((s) => s.seedDemo);
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-white/10 bg-white/[0.01] py-16 text-center">
      <div className="grid h-12 w-12 place-items-center rounded-xl bg-white/5">
        <Icon className="h-5 w-5 text-white/50" />
      </div>
      <div>
        <div className="text-base font-medium text-white">{title}</div>
        <div className="mt-1 max-w-sm text-sm text-white/50">{description}</div>
      </div>
      <div className="mt-2 flex items-center gap-2">
        {action}
        <Button variant="secondary" size="sm" onClick={seedDemo}>
          <Sparkles className="h-3.5 w-3.5" />
          Try demo data
        </Button>
      </div>
    </div>
  );
}
