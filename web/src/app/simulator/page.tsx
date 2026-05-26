"use client";

import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Calculator, AlertTriangle, TrendingUp, ArrowRight } from "lucide-react";
import { useStore } from "@/lib/store";
import { simulatePurchase, stressBand, stressLabel } from "@/lib/calculations";
import { formatCurrency, monthsToHuman } from "@/lib/format";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";

export default function SimulatorPage() {
  const { profile, emis, cards } = useStore();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const [price, setPrice] = useState("150000");
  const [down, setDown] = useState("0");
  const [tenure, setTenure] = useState("18");
  const [rate, setRate] = useState("14");

  const result = useMemo(() => {
    const p = Number(price) || 0;
    const t = Number(tenure) || 0;
    const r = Number(rate) || 0;
    const d = Number(down) || 0;
    if (p <= 0 || t <= 0) return null;
    return simulatePurchase(profile, emis, cards, { price: p, tenureMonths: t, interestRate: r, downPayment: d });
  }, [price, tenure, rate, down, profile, emis, cards]);

  if (!mounted) return null;

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader
        title="Purchase Simulator"
        description="Before you swipe, simulate the future. See how this EMI changes your stress score and delays debt freedom."
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>The purchase</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Field label="Price"><Input type="number" inputMode="decimal" value={price} onChange={(e) => setPrice(e.target.value)} /></Field>
            <Field label="Down payment"><Input type="number" inputMode="decimal" value={down} onChange={(e) => setDown(e.target.value)} /></Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Tenure (months)"><Input type="number" inputMode="numeric" value={tenure} onChange={(e) => setTenure(e.target.value)} /></Field>
              <Field label="Interest %"><Input type="number" step="0.1" inputMode="decimal" value={rate} onChange={(e) => setRate(e.target.value)} /></Field>
            </div>

            <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
              <div className="text-[10px] uppercase tracking-wider text-white/40">If you proceed</div>
              <div className="tabular mt-1 text-2xl font-semibold text-white">{result ? formatCurrency(result.monthlyEMI, profile.currency) : "—"}</div>
              <div className="text-xs text-white/40">per month for {tenure} months</div>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-4 lg:col-span-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Impact preview</CardTitle>
              {result && <Calculator className="h-4 w-4 text-white/30" />}
            </CardHeader>
            <CardContent>
              {!result ? (
                <p className="text-sm text-white/50">Enter a price to simulate impact.</p>
              ) : (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <ScoreShift before={result.beforeScore} after={result.afterScore} />
                  <Metric label="Cashflow reduction" value={`−${formatCurrency(result.cashflowReduction, profile.currency)}`} sub="every month" danger />
                  <Metric label="Debt freedom delay" value={monthsToHuman(result.debtFreedomDelayMonths)} sub="pushed further out" danger={result.debtFreedomDelayMonths > 0} />
                  <Metric label="Total interest paid" value={formatCurrency(result.totalInterest, profile.currency)} sub="over full tenure" />
                </div>
              )}
            </CardContent>
          </Card>

          {result && (
            <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}>
              <Card>
                <CardContent className="space-y-3 p-5">
                  <div className="flex items-start gap-3">
                    <div className="rounded-lg bg-white/5 p-2"><TrendingUp className="h-4 w-4 text-white/70" /></div>
                    <div className="text-sm">
                      <div className="font-medium text-white">Total cost of this purchase</div>
                      <div className="mt-1 text-white/60">
                        You pay <span className="tabular text-white">{formatCurrency(result.totalCost, profile.currency)}</span> for a {formatCurrency(Number(price), profile.currency)} item
                        — that&apos;s <span className="tabular text-rose-300">{formatCurrency(result.totalInterest, profile.currency)}</span> in interest alone.
                      </div>
                    </div>
                  </div>
                  {result.stressIncrease >= 10 && (
                    <div className="flex items-start gap-3 rounded-lg border border-rose-500/20 bg-rose-500/5 p-3">
                      <AlertTriangle className="mt-0.5 h-4 w-4 text-rose-400" />
                      <div className="text-sm text-rose-100">
                        <div className="font-medium">DebtOS recommends against this purchase.</div>
                        <div className="mt-0.5 text-rose-200/70">Your stress jumps {result.stressIncrease} points. Consider waiting, saving, or buying a cheaper alternative outright.</div>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
}

function ScoreShift({ before, after }: { before: number; after: number }) {
  const bandBefore = stressBand(before);
  const bandAfter = stressBand(after);
  return (
    <div className="rounded-xl border border-white/8 bg-white/[0.02] p-4">
      <div className="text-[10px] uppercase tracking-wider text-white/40">Stress shift</div>
      <div className="mt-2 flex items-center gap-3">
        <div className="flex-1">
          <Badge variant={bandBefore}>{stressLabel(bandBefore)}</Badge>
          <div className="tabular mt-1 text-2xl font-semibold text-white">{before}</div>
        </div>
        <ArrowRight className="h-4 w-4 text-white/30" />
        <div className="flex-1">
          <Badge variant={bandAfter}>{stressLabel(bandAfter)}</Badge>
          <div className="tabular mt-1 text-2xl font-semibold text-white">{after}</div>
        </div>
      </div>
      <div className="mt-2 text-xs text-white/50">
        {after - before > 0 ? `+${after - before} points (worse)` : `−${before - after} points`}
      </div>
    </div>
  );
}

function Metric({ label, value, sub, danger }: { label: string; value: string; sub: string; danger?: boolean }) {
  return (
    <div className="rounded-xl border border-white/8 bg-white/[0.02] p-4">
      <div className="text-[10px] uppercase tracking-wider text-white/40">{label}</div>
      <div className={`tabular mt-1 text-xl font-semibold ${danger ? "text-rose-300" : "text-white"}`}>{value}</div>
      <div className="text-xs text-white/40">{sub}</div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="space-y-1.5"><Label>{label}</Label>{children}</div>;
}
