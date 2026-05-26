"use client";

import { useEffect, useMemo, useState } from "react";
import { Plus, TrendingDown, Trash2, Calendar, Banknote, Percent } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useStore } from "@/lib/store";
import { emiAmount, remainingPrincipal, remainingTenure, totalInterestRemaining, emiEndDate, totalMonthlyEMIs } from "@/lib/calculations";
import { formatCurrency, monthsToHuman } from "@/lib/format";
import { PageHeader } from "@/components/page-header";
import { StatCard } from "@/components/stat-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { EmptyState } from "@/components/empty-state";
import type { EMI } from "@/lib/types";

const CATEGORIES: { value: EMI["category"]; label: string }[] = [
  { value: "home", label: "Home loan" },
  { value: "car", label: "Car / vehicle" },
  { value: "personal", label: "Personal loan" },
  { value: "education", label: "Education" },
  { value: "credit_card", label: "Credit card EMI" },
  { value: "consumer_durable", label: "Consumer durable" },
  { value: "other", label: "Other" },
];

export default function EMIsPage() {
  const { emis, profile, addEMI, updateEMI, removeEMI } = useStore();
  const [mounted, setMounted] = useState(false);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<EMI | null>(null);
  useEffect(() => setMounted(true), []);
  useEffect(() => {
    if (typeof window !== "undefined" && new URLSearchParams(window.location.search).get("new")) {
      setEditing(null);
      setOpen(true);
    }
  }, []);

  const sorted = useMemo(
    () => [...emis].sort((a, b) => emiEndDate(b).getTime() - emiEndDate(a).getTime()),
    [emis],
  );

  const totalMonthly = totalMonthlyEMIs(emis);
  const totalRemaining = emis.reduce((s, e) => s + remainingPrincipal(e), 0);
  const totalInterest = emis.reduce((s, e) => s + totalInterestRemaining(e), 0);

  if (!mounted) return null;

  return (
    <div className="mx-auto max-w-7xl">
      <PageHeader
        title="EMI Intelligence"
        description="Every loan you carry. With remaining tenure, real interest cost, and end dates that tell you when freedom arrives."
        action={
          <Button onClick={() => { setEditing(null); setOpen(true); }}>
            <Plus className="h-4 w-4" />
            Add EMI
          </Button>
        }
      />

      <section className="grid grid-cols-1 gap-3 md:grid-cols-3">
        <StatCard label="Monthly EMI burden" value={formatCurrency(totalMonthly, profile.currency)} hint={`${emis.length} loans`} icon={TrendingDown} />
        <StatCard label="Outstanding principal" value={formatCurrency(totalRemaining, profile.currency)} icon={Banknote} delay={0.05} />
        <StatCard label="Interest still to pay" value={formatCurrency(totalInterest, profile.currency)} hint="across all EMIs" icon={Percent} delay={0.1} />
      </section>

      <section className="mt-6">
        {emis.length === 0 ? (
          <EmptyState
            icon={TrendingDown}
            title="No EMIs yet"
            description="Add your home loan, car loan, personal loan, or any EMI you carry. DebtOS will visualize the real cost over time."
            action={<Button size="sm" onClick={() => setOpen(true)}><Plus className="h-3.5 w-3.5" />Add EMI</Button>}
          />
        ) : (
          <div className="space-y-3">
            <AnimatePresence>
              {sorted.map((e, i) => {
                const tenureRemaining = remainingTenure(e);
                const principalLeft = remainingPrincipal(e);
                const progress = (e.monthsPaid / e.tenureMonths) * 100;
                const interestRemaining = totalInterestRemaining(e);
                const end = emiEndDate(e);
                const isClosed = tenureRemaining === 0;
                return (
                  <motion.div
                    key={e.id}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    transition={{ delay: i * 0.03 }}
                  >
                    <Card>
                      <CardContent className="p-5">
                        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <div className="text-base font-medium text-white truncate">{e.name}</div>
                              {isClosed && <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] uppercase tracking-wider text-emerald-300">Closed</span>}
                            </div>
                            <div className="mt-0.5 text-xs uppercase tracking-wider text-white/40">{CATEGORIES.find(c => c.value === e.category)?.label}</div>

                            <div className="mt-3 grid grid-cols-2 gap-4 md:grid-cols-4">
                              <Stat label="Monthly" value={formatCurrency(e.monthlyAmount, profile.currency)} />
                              <Stat label="Remaining" value={formatCurrency(principalLeft, profile.currency)} />
                              <Stat label="Tenure left" value={monthsToHuman(tenureRemaining)} />
                              <Stat label="Interest left" value={formatCurrency(interestRemaining, profile.currency)} />
                            </div>

                            <div className="mt-4">
                              <div className="mb-1 flex justify-between text-[10px] uppercase tracking-wider text-white/40">
                                <span>{e.monthsPaid} of {e.tenureMonths} months paid</span>
                                <span className="tabular">{progress.toFixed(0)}%</span>
                              </div>
                              <Progress value={progress} barClassName="bg-gradient-to-r from-indigo-400 to-fuchsia-400" />
                            </div>

                            <div className="mt-3 flex items-center gap-1 text-xs text-white/40">
                              <Calendar className="h-3 w-3" />
                              Ends {end.toLocaleDateString(undefined, { month: "short", year: "numeric" })}
                              <span className="ml-2">· {e.interestRate}% p.a.</span>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 md:flex-col">
                            <Button variant="secondary" size="sm" onClick={() => { setEditing(e); setOpen(true); }}>Edit</Button>
                            <Button variant="ghost" size="icon" onClick={() => confirm("Delete this EMI?") && removeEMI(e.id)}>
                              <Trash2 className="h-4 w-4 text-rose-400" />
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        )}
      </section>

      <EMIDialog
        open={open}
        onClose={() => setOpen(false)}
        editing={editing}
        onSubmit={(values) => {
          if (editing) {
            updateEMI(editing.id, values);
          } else {
            addEMI(values);
          }
          setOpen(false);
        }}
      />
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-wider text-white/40">{label}</div>
      <div className="tabular mt-0.5 text-sm font-medium text-white">{value}</div>
    </div>
  );
}

function EMIDialog({
  open,
  onClose,
  editing,
  onSubmit,
}: {
  open: boolean;
  onClose: () => void;
  editing: EMI | null;
  onSubmit: (values: Omit<EMI, "id" | "createdAt">) => void;
}) {
  const [name, setName] = useState("");
  const [category, setCategory] = useState<EMI["category"]>("personal");
  const [monthly, setMonthly] = useState("");
  const [tenure, setTenure] = useState("");
  const [paid, setPaid] = useState("0");
  const [rate, setRate] = useState("");
  const [principal, setPrincipal] = useState("");
  const [startDate, setStartDate] = useState(new Date().toISOString().slice(0, 10));
  const [showAdvanced, setShowAdvanced] = useState(false);

  useEffect(() => {
    if (editing) {
      setName(editing.name);
      setCategory(editing.category);
      setMonthly(String(Math.round(editing.monthlyAmount)));
      setTenure(String(editing.tenureMonths));
      setPaid(String(editing.monthsPaid));
      setRate(editing.interestRate ? String(editing.interestRate) : "");
      setPrincipal(String(Math.round(editing.principal)));
      setStartDate(editing.startDate.slice(0, 10));
      setShowAdvanced(editing.interestRate > 0 || !!editing.principal);
    } else {
      setName(""); setCategory("personal"); setMonthly(""); setTenure(""); setPaid("0");
      setRate(""); setPrincipal("");
      setStartDate(new Date().toISOString().slice(0, 10));
      setShowAdvanced(false);
    }
  }, [editing, open]);

  const monthlyN = Number(monthly) || 0;
  const tenureN = Number(tenure) || 0;
  const paidN = Number(paid) || 0;
  const rateN = Number(rate) || 0;
  const principalN = Number(principal) || 0;

  // Derived principal: if user supplied one, use it. Otherwise reverse-amortize
  // from the monthly EMI; if no rate, fall back to monthly × tenure.
  const derivedPrincipal = principalN > 0
    ? principalN
    : monthlyN > 0 && tenureN > 0
      ? (rateN > 0 ? reverseAmortize(monthlyN, rateN, tenureN) : monthlyN * tenureN)
      : 0;

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || monthlyN <= 0 || tenureN <= 0) return;
    onSubmit({
      name,
      category,
      principal: derivedPrincipal,
      interestRate: rateN,
      tenureMonths: tenureN,
      monthsPaid: paidN,
      monthlyAmount: monthlyN,
      startDate: new Date(startDate).toISOString(),
    });
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={editing ? "Edit EMI" : "Add EMI"}
      description="Just the monthly EMI and tenure are required. Interest rate is optional."
    >
      <form onSubmit={submit} className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <Field label="Name">
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. HDFC Home Loan" required />
          </Field>
          <Field label="Category">
            <Select value={category} onChange={(e) => setCategory(e.target.value as EMI["category"])}>
              {CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
            </Select>
          </Field>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <Field label="Monthly EMI (₹)">
            <Input type="number" inputMode="decimal" value={monthly} onChange={(e) => setMonthly(e.target.value)} required />
          </Field>
          <Field label="Tenure (months)">
            <Input type="number" inputMode="numeric" value={tenure} onChange={(e) => setTenure(e.target.value)} required />
          </Field>
          <Field label="Months paid">
            <Input type="number" inputMode="numeric" value={paid} onChange={(e) => setPaid(e.target.value)} />
          </Field>
        </div>

        <button
          type="button"
          onClick={() => setShowAdvanced((v) => !v)}
          className="text-xs text-white/50 underline-offset-2 hover:text-white hover:underline"
        >
          {showAdvanced ? "Hide" : "Show"} advanced (interest rate, principal, start date)
        </button>

        {showAdvanced && (
          <div className="grid grid-cols-1 gap-3 rounded-xl border border-white/8 bg-white/[0.02] p-3 sm:grid-cols-3">
            <Field label="Interest rate (% p.a.)">
              <Input type="number" inputMode="decimal" step="0.1" value={rate} onChange={(e) => setRate(e.target.value)} placeholder="0 = no-cost" />
            </Field>
            <Field label="Principal (override)">
              <Input
                type="number"
                inputMode="decimal"
                value={principal}
                onChange={(e) => setPrincipal(e.target.value)}
                placeholder={monthlyN && tenureN ? String(Math.round(derivedPrincipal)) : "auto"}
              />
            </Field>
            <Field label="Start date">
              <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
            </Field>
          </div>
        )}

        {monthlyN > 0 && tenureN > 0 && (
          <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-white/60">Estimated principal</span>
              <span className="tabular text-white">{formatCurrency(derivedPrincipal)}</span>
            </div>
            <div className="mt-1 flex items-center justify-between text-xs">
              <span className="text-white/40">Total you&apos;ll pay over {tenureN - paidN} more months</span>
              <span className="tabular text-white/70">{formatCurrency(monthlyN * (tenureN - paidN))}</span>
            </div>
          </div>
        )}

        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
          <Button type="submit">{editing ? "Save" : "Add EMI"}</Button>
        </div>
      </form>
    </Dialog>
  );
}

function reverseAmortize(monthly: number, annualRate: number, tenureMonths: number): number {
  if (tenureMonths <= 0) return 0;
  if (annualRate === 0) return monthly * tenureMonths;
  const r = annualRate / 12 / 100;
  const pow = Math.pow(1 + r, tenureMonths);
  return (monthly * (pow - 1)) / (r * pow);
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      {children}
    </div>
  );
}
