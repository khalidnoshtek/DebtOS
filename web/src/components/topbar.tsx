"use client";

import { useStore } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Sparkles, RotateCcw } from "lucide-react";

export function Topbar() {
  const seedDemo = useStore((s) => s.seedDemo);
  const resetAll = useStore((s) => s.resetAll);
  const profile = useStore((s) => s.profile);

  return (
    <div className="sticky top-0 z-20 mb-2 flex items-center justify-end gap-2 border-b border-white/5 bg-zinc-950/40 px-2 py-3 backdrop-blur-xl">
      <Button variant="ghost" size="sm" onClick={seedDemo}>
        <Sparkles className="h-3.5 w-3.5" />
        Load demo data
      </Button>
      <Button variant="ghost" size="sm" onClick={() => confirm("Reset all data?") && resetAll()}>
        <RotateCcw className="h-3.5 w-3.5" />
        Reset
      </Button>
      <div className="ml-2 hidden items-center gap-2 rounded-lg border border-white/5 bg-white/[0.02] px-3 py-1.5 md:flex">
        <span className="text-[10px] uppercase tracking-wider text-white/40">Currency</span>
        <span className="text-xs font-medium text-white/80">{profile.currency}</span>
      </div>
    </div>
  );
}
