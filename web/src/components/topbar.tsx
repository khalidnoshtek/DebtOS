"use client";

import { useStore } from "@/lib/store";

export function Topbar() {
  const profile = useStore((s) => s.profile);

  return (
    <div className="sticky top-0 z-20 flex h-12 items-center justify-end gap-2 border-b border-white/5 bg-zinc-950/40 px-4 backdrop-blur-xl md:px-6">
      <div className="hidden items-center gap-2 rounded-lg border border-white/5 bg-white/[0.02] px-3 py-1.5 md:flex">
        <span className="text-[10px] uppercase tracking-wider text-white/40">Currency</span>
        <span className="text-xs font-medium text-white/80">{profile.currency}</span>
      </div>
    </div>
  );
}
