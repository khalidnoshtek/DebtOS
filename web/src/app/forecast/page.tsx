"use client";

import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Activity, TrendingDown, AlertTriangle } from "lucide-react";
import { useStore } from "@/lib/store";
import { forecast } from "@/lib/calculations";
import { formatCurrency } from "@/lib/format";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Area, AreaChart, Bar, ComposedChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis, ReferenceLine, Line,
} from "recharts";

const HORIZONS = [
  { months: 6, label: "6M" },
  { months: 12, label: "12M" },
  { months: 18, label: "18M" },
  { months: 24, label: "24M" },
  { months: 36, label: "3Y" },
];

export default function ForecastPage() {
  const { profile, emis, cards, bills } = useStore();
  const [mounted, setMounted] = useState(false);
  const [horizon, setHorizon] = useState(18);
  const [scenario, setScenario] = useState<"base" | "jobloss" | "salaryUp" | "extraEMI">("base");

  useEffect(() => setMounted(true), []);

  const data = useMemo(() => {
    if (scenario === "base") return forecast(profile, emis, bills, cards, horizon);
    if (scenario === "jobloss") return forecast({ ...profile, monthlySalary: 0 }, emis, bills, cards, horizon);
    if (scenario === "salaryUp") return forecast({ ...profile, monthlySalary: profile.monthlySalary * 1.2 }, emis, bills, cards, horizon);
    if (scenario === "extraEMI") return forecast({ ...profile, monthlyVariableSpend: profile.monthlyVariableSpend + 15000 }, emis, bills, cards, horizon);
    return [];
  }, [profile, emis, bills, cards, horizon, scenario]);

  if (!mounted) return null;

  const firstNegative = data.find((p) => p.balance < 0);
  const minBalance = data.reduce((m, p) => Math.min(m, p.balance), Infinity);
  const endBalance = data[data.length - 1]?.balance ?? 0;

  return (
    <div className="mx-auto max-w-7xl">
      <PageHeader
        title="Forecast Engine"
        description="Simulate the future. See where your cashflow lands across scenarios and time horizons."
        action={
          <div className="flex gap-1 rounded-lg border border-white/10 bg-white/[0.02] p-1">
            {HORIZONS.map((h) => (
              <button
                key={h.months}
                onClick={() => setHorizon(h.months)}
                className={`rounded-md px-2.5 py-1 text-xs ${horizon === h.months ? "bg-white text-black" : "text-white/60 hover:text-white"}`}
              >
                {h.label}
              </button>
            ))}
          </div>
        }
      />

      <div className="mb-4 flex flex-wrap gap-2">
        <ScenarioButton active={scenario === "base"} onClick={() => setScenario("base")}>Baseline</ScenarioButton>
        <ScenarioButton active={scenario === "salaryUp"} onClick={() => setScenario("salaryUp")}>+20% salary</ScenarioButton>
        <ScenarioButton active={scenario === "extraEMI"} onClick={() => setScenario("extraEMI")}>+₹15k spending</ScenarioButton>
        <ScenarioButton active={scenario === "jobloss"} onClick={() => setScenario("jobloss")} danger>Job loss</ScenarioButton>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Projected balance</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="bal2" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={endBalance < 0 ? "#f43f5e" : "#22d3ee"} stopOpacity={0.4} />
                    <stop offset="100%" stopColor={endBalance < 0 ? "#f43f5e" : "#22d3ee"} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="rgba(255,255,255,0.05)" vertical={false} />
                <XAxis
                  dataKey="date"
                  stroke="rgba(255,255,255,0.3)"
                  tick={{ fontSize: 10 }}
                  tickFormatter={(d) => new Date(d).toLocaleDateString(undefined, { month: "short" })}
                />
                <YAxis
                  stroke="rgba(255,255,255,0.3)"
                  tick={{ fontSize: 10 }}
                  tickFormatter={(v) => formatCurrency(v, profile.currency, true)}
                  width={70}
                />
                <ReferenceLine y={0} stroke="rgba(244,63,94,0.5)" strokeDasharray="3 3" />
                <Tooltip
                  contentStyle={{ background: "rgba(10,10,13,0.95)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 12, fontSize: 12 }}
                  labelStyle={{ color: "rgba(255,255,255,0.6)" }}
                  formatter={(v) => formatCurrency(Number(v), profile.currency)}
                  labelFormatter={(d) => new Date(d).toLocaleDateString(undefined, { month: "long", year: "numeric" })}
                />
                <Area type="monotone" dataKey="balance" stroke={endBalance < 0 ? "#f43f5e" : "#22d3ee"} strokeWidth={2} fill="url(#bal2)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      <section className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-3">
        <Summary
          icon={Activity}
          label="End balance"
          value={formatCurrency(endBalance, profile.currency)}
          color={endBalance >= 0 ? "text-emerald-300" : "text-rose-300"}
        />
        <Summary
          icon={TrendingDown}
          label="Lowest point"
          value={formatCurrency(Math.max(0, minBalance), profile.currency)}
          color={minBalance < 0 ? "text-rose-300" : "text-white"}
        />
        <Summary
          icon={AlertTriangle}
          label="Negative cashflow?"
          value={firstNegative ? new Date(firstNegative.date).toLocaleDateString(undefined, { month: "short", year: "numeric" }) : "Never"}
          color={firstNegative ? "text-rose-300" : "text-emerald-300"}
        />
      </section>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Inflow vs Outflow</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={data} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
                <CartesianGrid stroke="rgba(255,255,255,0.05)" vertical={false} />
                <XAxis dataKey="date" stroke="rgba(255,255,255,0.3)" tick={{ fontSize: 10 }} tickFormatter={(d) => new Date(d).toLocaleDateString(undefined, { month: "short" })} />
                <YAxis stroke="rgba(255,255,255,0.3)" tick={{ fontSize: 10 }} tickFormatter={(v) => formatCurrency(v, profile.currency, true)} width={70} />
                <Tooltip
                  contentStyle={{ background: "rgba(10,10,13,0.95)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 12, fontSize: 12 }}
                  formatter={(v) => formatCurrency(Number(v), profile.currency)}
                  labelFormatter={(d) => new Date(d).toLocaleDateString(undefined, { month: "long", year: "numeric" })}
                />
                <Bar dataKey="expectedInflow" fill="#34d399" name="Inflow" radius={[4, 4, 0, 0]} />
                <Bar dataKey="expectedOutflow" fill="#f87171" name="Outflow" radius={[4, 4, 0, 0]} />
                <Line type="monotone" dataKey="balance" stroke="#a78bfa" strokeWidth={2} dot={false} name="Balance" />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function ScenarioButton({ children, active, onClick, danger }: { children: React.ReactNode; active: boolean; onClick: () => void; danger?: boolean }) {
  return (
    <button
      onClick={onClick}
      className={`rounded-lg border px-3 py-1.5 text-xs transition-colors ${
        active
          ? danger ? "border-rose-500/40 bg-rose-500/15 text-rose-200" : "border-white/20 bg-white/10 text-white"
          : "border-white/10 text-white/60 hover:bg-white/5 hover:text-white"
      }`}
    >
      {children}
    </button>
  );
}

function Summary({ icon: Icon, label, value, color }: { icon: typeof Activity; label: string; value: string; color: string }) {
  return (
    <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}>
      <Card>
        <CardContent className="flex items-center gap-3 p-5">
          <div className="rounded-lg bg-white/5 p-2"><Icon className="h-4 w-4 text-white/60" /></div>
          <div>
            <div className="text-[10px] uppercase tracking-wider text-white/40">{label}</div>
            <div className={`tabular mt-0.5 text-lg font-semibold ${color}`}>{value}</div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
