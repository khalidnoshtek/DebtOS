"use client";

import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  Wallet,
  ArrowDownRight,
  ArrowUpRight,
  Calendar,
  TrendingDown,
  AlertTriangle,
  Shield,
  Flame,
  Clock,
} from "lucide-react";
import { useStore } from "@/lib/store";
import {
  totalMonthlyEMIs,
  totalMonthlyBills,
  safeToSpend,
  dailyBurnRate,
  emergencyRunwayDays,
  totalDebt,
  debtFreedomDate,
  stressScore,
  stressBand,
  stressLabel,
  stressColor,
  stressBg,
  forecast,
} from "@/lib/calculations";
import { formatCurrency, monthsToHuman } from "@/lib/format";
import { StatCard } from "@/components/stat-card";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import Link from "next/link";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

export default function DashboardPage() {
  const { profile, emis, cards, bills, seedDemo } = useStore();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const monthlyEMI = totalMonthlyEMIs(emis);
  const monthlyBills = totalMonthlyBills(bills);
  const cardMin = cards.reduce((s, c) => s + c.minDue, 0);
  const safe = safeToSpend(profile, emis, bills, cards);
  const burn = dailyBurnRate(profile, emis, bills, cards);
  const runway = emergencyRunwayDays(profile, emis, bills, cards);
  const debt = totalDebt(emis, cards);
  const score = stressScore(profile, emis, cards);
  const band = stressBand(score);
  const freedom = debtFreedomDate(emis);

  const monthsToFreedom = useMemo(() => {
    const now = new Date();
    return Math.max(0, Math.round((freedom.getTime() - now.getTime()) / (1000 * 60 * 60 * 24 * 30.44)));
  }, [freedom]);

  const data = useMemo(() => forecast(profile, emis, bills, cards, 12), [profile, emis, bills, cards]);

  const isEmpty = profile.monthlySalary === 0 && emis.length === 0 && cards.length === 0;

  if (!mounted) return null;

  if (isEmpty) {
    return (
      <div className="mx-auto max-w-4xl">
        <PageHeader
          title="Welcome to DebtOS"
          description="The financial operating system for predicting consequences and surviving debt. Start by adding your salary, EMIs, and credit cards."
        />
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Quick start</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-white/70">
              <p>1. Set your monthly salary in <Link href="/settings" className="text-white underline-offset-2 hover:underline">Settings</Link></p>
              <p>2. Add your EMIs in <Link href="/emis" className="text-white underline-offset-2 hover:underline">EMIs</Link></p>
              <p>3. Track your credit cards in <Link href="/cards" className="text-white underline-offset-2 hover:underline">Cards</Link></p>
              <p>4. See the future on your <Link href="/forecast" className="text-white underline-offset-2 hover:underline">Forecast</Link></p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Or try it instantly</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-white/60">Load a realistic demo to see how DebtOS visualizes EMI stacking, stress scoring, and cashflow forecasting.</p>
              <Button className="mt-4" onClick={seedDemo}>Load demo data</Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl">
      <PageHeader
        title="Live Cashflow"
        description="Your real-time financial pulse. Every metric reflects future obligations, not historical spending."
        action={<Badge variant={band}>{stressLabel(band)} · {score}</Badge>}
      />

      <section className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard
          label="Safe to spend"
          value={formatCurrency(safe, profile.currency)}
          hint="this month after fixed obligations"
          icon={Shield}
          trend={safe > 0 ? "up" : "down"}
          delay={0}
        />
        <StatCard
          label="Monthly EMIs"
          value={formatCurrency(monthlyEMI, profile.currency)}
          hint={`${emis.length} active loans`}
          icon={TrendingDown}
          delay={0.05}
        />
        <StatCard
          label="Daily burn"
          value={formatCurrency(burn, profile.currency)}
          hint="combined daily outflow"
          icon={Flame}
          delay={0.1}
        />
        <StatCard
          label="Runway"
          value={runway === Infinity ? "∞" : `${runway} days`}
          hint="if income stopped today"
          icon={Clock}
          trend={runway < 30 ? "down" : runway < 90 ? "neutral" : "up"}
          delay={0.15}
        />
      </section>

      <section className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>12-month forecast</CardTitle>
              <div className="mt-1 text-xs text-white/40">Projected balance assuming current obligations & inflows</div>
            </div>
            <Link href="/forecast">
              <Button variant="ghost" size="sm">Open</Button>
            </Link>
          </CardHeader>
          <CardContent>
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="bal" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#a78bfa" stopOpacity={0.45} />
                      <stop offset="100%" stopColor="#a78bfa" stopOpacity={0} />
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
                  <Tooltip
                    contentStyle={{
                      background: "rgba(10,10,13,0.95)",
                      border: "1px solid rgba(255,255,255,0.1)",
                      borderRadius: 12,
                      fontSize: 12,
                    }}
                    labelStyle={{ color: "rgba(255,255,255,0.6)" }}
                    formatter={(v) => formatCurrency(Number(v), profile.currency)}
                    labelFormatter={(d) => new Date(d).toLocaleDateString(undefined, { month: "long", year: "numeric" })}
                  />
                  <Area type="monotone" dataKey="balance" stroke="#a78bfa" strokeWidth={2} fill="url(#bal)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card className={`border ${stressBg(band)}`}>
          <CardHeader>
            <CardTitle>Financial stress</CardTitle>
            <div className="mt-1 text-xs text-white/40">Composite of EMI ratio, debt load, utilization & savings</div>
          </CardHeader>
          <CardContent>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className={`tabular text-5xl font-semibold ${stressColor(band)}`}
            >
              {score}
            </motion.div>
            <div className="mt-1 text-sm text-white/60 capitalize">{band}</div>
            <Progress
              value={score}
              className="mt-4"
              barClassName={
                band === "stable" ? "bg-emerald-400" :
                band === "warning" ? "bg-amber-400" :
                band === "dangerous" ? "bg-orange-400" : "bg-rose-500"
              }
            />
            <Link href="/stress">
              <Button variant="secondary" size="sm" className="mt-4 w-full">View breakdown</Button>
            </Link>
          </CardContent>
        </Card>
      </section>

      <section className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Income & obligations</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <Row icon={<ArrowUpRight className="h-3.5 w-3.5 text-emerald-400" />} label="Monthly salary" value={formatCurrency(profile.monthlySalary, profile.currency)} />
            <Row icon={<ArrowDownRight className="h-3.5 w-3.5 text-rose-400" />} label="EMIs" value={formatCurrency(monthlyEMI, profile.currency)} />
            <Row icon={<ArrowDownRight className="h-3.5 w-3.5 text-rose-400" />} label="Bills" value={formatCurrency(monthlyBills, profile.currency)} />
            <Row icon={<ArrowDownRight className="h-3.5 w-3.5 text-rose-400" />} label="Card min dues" value={formatCurrency(cardMin, profile.currency)} />
            <Row icon={<ArrowDownRight className="h-3.5 w-3.5 text-rose-400" />} label="Variable spend" value={formatCurrency(profile.monthlyVariableSpend, profile.currency)} />
            <div className="border-t border-white/5 pt-3">
              <Row icon={<Wallet className="h-3.5 w-3.5 text-white/60" />} label="Net after fixed" value={formatCurrency(profile.monthlySalary - monthlyEMI - monthlyBills - cardMin, profile.currency)} bold />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Debt freedom</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="tabular text-3xl font-semibold text-white">{monthsToHuman(monthsToFreedom)}</div>
            <div className="mt-1 text-xs text-white/40">until last EMI closes</div>
            <div className="mt-4 space-y-2 text-xs text-white/50">
              <div className="flex justify-between"><span>Total debt</span><span className="tabular text-white">{formatCurrency(debt, profile.currency)}</span></div>
              <div className="flex justify-between"><span>Furthest end</span><span className="tabular text-white">{freedom.toLocaleDateString(undefined, { month: "short", year: "numeric" })}</span></div>
              <div className="flex justify-between"><span>Active EMIs</span><span className="tabular text-white">{emis.filter(e => e.tenureMonths - e.monthsPaid > 0).length}</span></div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Upcoming this month</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {[
                ...bills.map(b => ({ name: b.name, day: b.dueDay, amount: b.amount, kind: "Bill" })),
                ...cards.map(c => ({ name: `${c.name} min`, day: c.dueDate, amount: c.minDue, kind: "Card" })),
              ]
                .sort((a, b) => a.day - b.day)
                .slice(0, 6)
                .map((item, i) => (
                  <div key={i} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-3.5 w-3.5 text-white/40" />
                      <span className="text-white/80">{item.name}</span>
                      <span className="text-[10px] uppercase tracking-wider text-white/40">{item.kind}</span>
                    </div>
                    <div className="text-right">
                      <div className="tabular text-sm text-white">{formatCurrency(item.amount, profile.currency)}</div>
                      <div className="text-[10px] text-white/40">day {item.day}</div>
                    </div>
                  </div>
                ))}
              {bills.length === 0 && cards.length === 0 && (
                <div className="text-xs text-white/40">No bills or cards yet.</div>
              )}
            </div>
          </CardContent>
        </Card>
      </section>

      {band !== "stable" && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className={`mt-6 rounded-2xl border p-5 ${stressBg(band)}`}
        >
          <div className="flex items-start gap-3">
            <AlertTriangle className={`mt-0.5 h-5 w-5 ${stressColor(band)}`} />
            <div>
              <div className="font-medium text-white">DebtOS advisory</div>
              <p className="mt-1 text-sm text-white/70">
                {band === "critical"
                  ? "Your EMI burden has crossed sustainable thresholds. Avoid new EMIs and consider accelerated payoff of the highest-interest debt."
                  : band === "dangerous"
                  ? "Your obligations are heavy. A single income disruption could trigger missed payments. Build runway before taking on new debt."
                  : "You're managing, but margins are tight. Reducing variable spend by 10–15% would meaningfully improve resilience."}
              </p>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
}

function Row({ icon, label, value, bold }: { icon: React.ReactNode; label: string; value: string; bold?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2 text-white/70">
        {icon}
        <span>{label}</span>
      </div>
      <span className={`tabular ${bold ? "font-semibold text-white" : "text-white/90"}`}>{value}</span>
    </div>
  );
}
