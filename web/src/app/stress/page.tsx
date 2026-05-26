"use client";

import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { AlertTriangle, ShieldCheck, TrendingUp, Target, ArrowRight, X } from "lucide-react";
import { useStore } from "@/lib/store";
import {
  stressScore, stressBand, stressLabel, stressColor, stressBg,
  totalMonthlyEMIs, totalCardUtilization, totalDebt, remainingPrincipal,
} from "@/lib/calculations";
import { formatCurrency, formatPercent } from "@/lib/format";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

export default function StressPage() {
  const { profile, emis, cards } = useStore();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return null;

  const score = stressScore(profile, emis, cards);
  const band = stressBand(score);

  const emiRatio = profile.monthlySalary > 0 ? totalMonthlyEMIs(emis) / profile.monthlySalary * 100 : 0;
  const debt = totalDebt(emis, cards);
  const debtIncomeRatio = profile.monthlySalary > 0 ? (debt / (profile.monthlySalary * 12)) * 100 : 0;
  const util = totalCardUtilization(cards);
  const savings = profile.monthlySalary > 0 ? ((profile.emergencyFund + profile.currentBalance) / profile.monthlySalary) : 0;

  const drivers = [
    { label: "EMI / Income ratio", value: formatPercent(emiRatio), pct: Math.min(100, emiRatio * 2), healthy: "< 40%", danger: emiRatio > 50 },
    { label: "Debt / Annual income", value: formatPercent(debtIncomeRatio), pct: Math.min(100, debtIncomeRatio), healthy: "< 100%", danger: debtIncomeRatio > 100 },
    { label: "Card utilization", value: formatPercent(util), pct: util, healthy: "< 30%", danger: util > 50 },
    { label: "Savings (months)", value: `${savings.toFixed(1)} mo`, pct: Math.min(100, savings / 6 * 100), healthy: "6+ months", danger: savings < 3, inverted: true },
  ];

  const recommendations = useMemo(() => {
    const recs: { title: string; body: string; icon: typeof Target }[] = [];
    if (emiRatio > 50) recs.push({ icon: AlertTriangle, title: "EMI burden exceeds healthy threshold", body: `Your EMIs consume ${emiRatio.toFixed(0)}% of monthly income. Anything above 40% leaves dangerously thin margins. Avoid new EMIs until this drops.` });
    if (util > 50) recs.push({ icon: AlertTriangle, title: "High credit card utilization", body: `Carrying ${util.toFixed(0)}% utilization signals stress to credit bureaus AND racks up revolving interest. Pay down before the statement closes.` });
    if (savings < 3) recs.push({ icon: ShieldCheck, title: "Build emergency runway", body: "You have less than 3 months of expenses saved. Aim for 6 months before considering any new EMI." });
    const highRate = emis.filter(e => e.interestRate > 14 && remainingPrincipal(e) > 0).sort((a, b) => b.interestRate - a.interestRate)[0];
    if (highRate) recs.push({ icon: TrendingUp, title: `Prioritize ${highRate.name}`, body: `At ${highRate.interestRate}% interest, this is your most expensive debt. Closing it early frees ${formatCurrency(highRate.monthlyAmount, profile.currency)}/mo.` });
    if (recs.length === 0) recs.push({ icon: ShieldCheck, title: "You're in good shape", body: "Maintain current trajectory. Consider channeling surplus into investments or accelerated debt payoff to compound your runway." });
    return recs;
  }, [emiRatio, util, savings, emis, profile.currency]);

  return (
    <div className="mx-auto max-w-7xl">
      <PageHeader
        title="Financial Stress Engine"
        description="A composite score reflecting how exposed your finances are to disruption. Lower is safer."
      />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className={`border ${stressBg(band)} lg:col-span-1`}>
          <CardHeader>
            <CardTitle>Stress score</CardTitle>
          </CardHeader>
          <CardContent>
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className={`tabular text-7xl font-semibold ${stressColor(band)}`}>{score}</motion.div>
            <div className="mt-1 text-base font-medium text-white capitalize">{stressLabel(band)}</div>
            <Progress value={score} className="mt-4" barClassName={band === "stable" ? "bg-emerald-400" : band === "warning" ? "bg-amber-400" : band === "dangerous" ? "bg-orange-400" : "bg-rose-500"} />
            <div className="mt-4 grid grid-cols-4 gap-1 text-[10px]">
              <Zone label="Stable" range="0–29" active={band === "stable"} color="emerald" />
              <Zone label="Warning" range="30–54" active={band === "warning"} color="amber" />
              <Zone label="Danger" range="55–79" active={band === "dangerous"} color="orange" />
              <Zone label="Critical" range="80–100" active={band === "critical"} color="rose" />
            </div>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Drivers</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {drivers.map((d) => (
              <div key={d.label}>
                <div className="flex items-center justify-between">
                  <div className="text-sm text-white/80">{d.label}</div>
                  <div className={`tabular text-sm ${d.danger ? "text-rose-300" : "text-white"}`}>{d.value}</div>
                </div>
                <Progress value={d.pct} className="mt-1.5" barClassName={
                  d.danger ? "bg-rose-500" : d.pct > 60 ? "bg-amber-400" : "bg-emerald-400"
                } />
                <div className="mt-1 flex items-center gap-2 text-[10px] uppercase tracking-wider text-white/40">
                  <span>healthy</span>
                  <span className="text-white/60">{d.healthy}</span>
                  {d.danger && <><X className="h-3 w-3 text-rose-400" /><span className="text-rose-300">over threshold</span></>}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <section className="mt-6">
        <h2 className="mb-3 text-sm font-medium uppercase tracking-wider text-white/50">DebtOS recommendations</h2>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {recommendations.map((r, i) => {
            const Icon = r.icon;
            return (
              <motion.div key={i} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
                <Card>
                  <CardContent className="flex items-start gap-3 p-5">
                    <div className="rounded-lg bg-white/5 p-2"><Icon className="h-4 w-4 text-white/70" /></div>
                    <div>
                      <div className="text-sm font-medium text-white">{r.title}</div>
                      <div className="mt-1 text-xs text-white/60">{r.body}</div>
                    </div>
                    <ArrowRight className="ml-auto h-3.5 w-3.5 text-white/30" />
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>
      </section>
    </div>
  );
}

function Zone({ label, range, active, color }: { label: string; range: string; active: boolean; color: string }) {
  const colors: Record<string, string> = {
    emerald: active ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/30" : "border-white/5 text-white/30",
    amber: active ? "bg-amber-500/20 text-amber-300 border-amber-500/30" : "border-white/5 text-white/30",
    orange: active ? "bg-orange-500/20 text-orange-300 border-orange-500/30" : "border-white/5 text-white/30",
    rose: active ? "bg-rose-500/20 text-rose-300 border-rose-500/30" : "border-white/5 text-white/30",
  };
  return (
    <div className={`rounded-lg border px-2 py-1.5 text-center ${colors[color]}`}>
      <div className="font-medium uppercase tracking-wider">{label}</div>
      <div className="tabular mt-0.5">{range}</div>
    </div>
  );
}
