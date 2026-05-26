"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, CreditCard, Trash2, AlertTriangle, ShieldCheck } from "lucide-react";
import { useStore } from "@/lib/store";
import { cardUtilization, totalCardUtilization } from "@/lib/calculations";
import { formatCurrency, formatPercent } from "@/lib/format";
import { PageHeader } from "@/components/page-header";
import { StatCard } from "@/components/stat-card";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { EmptyState } from "@/components/empty-state";
import type { CreditCard as CardT } from "@/lib/types";

function utilRiskBand(util: number) {
  if (util < 30) return { label: "Healthy", color: "text-emerald-300", bar: "bg-emerald-400", bg: "bg-emerald-500/10 border-emerald-500/20" };
  if (util < 50) return { label: "Watch", color: "text-amber-300", bar: "bg-amber-400", bg: "bg-amber-500/10 border-amber-500/20" };
  if (util < 75) return { label: "Risky", color: "text-orange-300", bar: "bg-orange-400", bg: "bg-orange-500/10 border-orange-500/20" };
  return { label: "Critical", color: "text-rose-300", bar: "bg-rose-500", bg: "bg-rose-500/10 border-rose-500/30" };
}

export default function CardsPage() {
  const { cards, profile, addCard, updateCard, removeCard } = useStore();
  const [mounted, setMounted] = useState(false);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<CardT | null>(null);
  useEffect(() => setMounted(true), []);
  useEffect(() => {
    if (typeof window !== "undefined" && new URLSearchParams(window.location.search).get("new")) {
      setEditing(null);
      setOpen(true);
    }
  }, []);
  if (!mounted) return null;

  const totalLimit = cards.reduce((s, c) => s + c.limit, 0);
  const totalBalance = cards.reduce((s, c) => s + c.currentBalance, 0);
  const utilTotal = totalCardUtilization(cards);
  const totalMin = cards.reduce((s, c) => s + c.minDue, 0);

  return (
    <div className="mx-auto max-w-7xl">
      <PageHeader
        title="Credit Card Risk Engine"
        description="Utilization stress, revolving interest exposure, and due-date risk across all your cards."
        action={<Button onClick={() => { setEditing(null); setOpen(true); }}><Plus className="h-4 w-4" />Add card</Button>}
      />

      <section className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard label="Total balance" value={formatCurrency(totalBalance, profile.currency)} icon={CreditCard} hint={`of ${formatCurrency(totalLimit, profile.currency)} limit`} />
        <StatCard label="Total utilization" value={formatPercent(utilTotal)} hint={utilRiskBand(utilTotal).label} icon={AlertTriangle} trend={utilTotal > 50 ? "down" : "up"} delay={0.05} />
        <StatCard label="Total min due" value={formatCurrency(totalMin, profile.currency)} hint="combined monthly" delay={0.1} />
        <StatCard label="Cards" value={String(cards.length)} hint="being tracked" icon={ShieldCheck} delay={0.15} />
      </section>

      <section className="mt-6">
        {cards.length === 0 ? (
          <EmptyState
            icon={CreditCard}
            title="No cards yet"
            description="Add your credit cards. DebtOS tracks utilization (a key driver of credit score), revolving interest exposure, and payment timing."
            action={<Button size="sm" onClick={() => setOpen(true)}><Plus className="h-3.5 w-3.5" />Add card</Button>}
          />
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <AnimatePresence>
              {cards.map((c, i) => {
                const util = cardUtilization(c);
                const band = utilRiskBand(util);
                const revolving = c.currentBalance > c.minDue;
                const annualInterest = revolving ? (c.currentBalance - c.minDue) * (c.interestRateAPR / 100) : 0;
                return (
                  <motion.div
                    key={c.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    transition={{ delay: i * 0.04 }}
                  >
                    <Card className={`border ${band.bg}`}>
                      <CardContent className="p-5">
                        <div className="flex items-start justify-between">
                          <div>
                            <div className="text-base font-medium text-white">{c.name}</div>
                            <div className="text-xs text-white/40">{c.bank}</div>
                          </div>
                          <span className={`rounded-full border px-2 py-0.5 text-[10px] uppercase tracking-wider ${band.color} border-current/30`}>{band.label}</span>
                        </div>

                        <div className="mt-4">
                          <div className="flex justify-between text-xs text-white/40">
                            <span>Utilization</span>
                            <span className={`tabular ${band.color}`}>{formatPercent(util)}</span>
                          </div>
                          <Progress value={util} className="mt-1.5" barClassName={band.bar} />
                          <div className="mt-1 text-[10px] text-white/40 tabular">
                            {formatCurrency(c.currentBalance, profile.currency)} of {formatCurrency(c.limit, profile.currency)}
                          </div>
                        </div>

                        <div className="mt-4 grid grid-cols-3 gap-3">
                          <Stat label="Min due" value={formatCurrency(c.minDue, profile.currency)} />
                          <Stat label="Statement" value={`day ${c.statementDate}`} />
                          <Stat label="Due" value={`day ${c.dueDate}`} />
                        </div>

                        {revolving && (
                          <div className="mt-4 rounded-lg border border-rose-500/20 bg-rose-500/5 p-3 text-xs text-rose-200">
                            <div className="font-medium">Revolving — APR {c.interestRateAPR}%</div>
                            <div className="mt-0.5 text-white/60">If you only pay the minimum, ~{formatCurrency(annualInterest, profile.currency)}/yr in interest.</div>
                          </div>
                        )}

                        <div className="mt-4 flex gap-2">
                          <Button variant="secondary" size="sm" onClick={() => { setEditing(c); setOpen(true); }}>Edit</Button>
                          <Button variant="ghost" size="icon" onClick={() => confirm("Delete this card?") && removeCard(c.id)}>
                            <Trash2 className="h-4 w-4 text-rose-400" />
                          </Button>
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

      <CardDialog
        open={open}
        onClose={() => setOpen(false)}
        editing={editing}
        onSubmit={(values) => {
          if (editing) updateCard(editing.id, values);
          else addCard(values);
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

function CardDialog({
  open, onClose, editing, onSubmit,
}: {
  open: boolean;
  onClose: () => void;
  editing: CardT | null;
  onSubmit: (values: Omit<CardT, "id" | "createdAt">) => void;
}) {
  const [name, setName] = useState("");
  const [bank, setBank] = useState("");
  const [limit, setLimit] = useState("");
  const [balance, setBalance] = useState("");
  const [minDue, setMinDue] = useState("");
  const [statementDate, setStatementDate] = useState("5");
  const [dueDate, setDueDate] = useState("25");
  const [apr, setApr] = useState("40");

  useEffect(() => {
    if (editing) {
      setName(editing.name); setBank(editing.bank);
      setLimit(String(editing.limit)); setBalance(String(editing.currentBalance));
      setMinDue(String(editing.minDue));
      setStatementDate(String(editing.statementDate)); setDueDate(String(editing.dueDate));
      setApr(String(editing.interestRateAPR));
    } else {
      setName(""); setBank(""); setLimit(""); setBalance(""); setMinDue("");
      setStatementDate("5"); setDueDate("25"); setApr("40");
    }
  }, [editing, open]);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !bank) return;
    onSubmit({
      name, bank,
      limit: Number(limit) || 0,
      currentBalance: Number(balance) || 0,
      minDue: Number(minDue) || 0,
      statementDate: Math.min(28, Math.max(1, Number(statementDate) || 1)),
      dueDate: Math.min(28, Math.max(1, Number(dueDate) || 1)),
      interestRateAPR: Number(apr) || 0,
    });
  };

  return (
    <Dialog open={open} onClose={onClose} title={editing ? "Edit card" : "Add credit card"}>
      <form onSubmit={submit} className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <Field label="Card name"><Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Regalia" required /></Field>
          <Field label="Bank"><Input value={bank} onChange={(e) => setBank(e.target.value)} placeholder="e.g. HDFC" required /></Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Credit limit"><Input type="number" inputMode="decimal" value={limit} onChange={(e) => setLimit(e.target.value)} required /></Field>
          <Field label="Current balance"><Input type="number" inputMode="decimal" value={balance} onChange={(e) => setBalance(e.target.value)} required /></Field>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <Field label="Min due"><Input type="number" inputMode="decimal" value={minDue} onChange={(e) => setMinDue(e.target.value)} /></Field>
          <Field label="Statement day"><Input type="number" min="1" max="28" value={statementDate} onChange={(e) => setStatementDate(e.target.value)} /></Field>
          <Field label="Due day"><Input type="number" min="1" max="28" value={dueDate} onChange={(e) => setDueDate(e.target.value)} /></Field>
        </div>
        <Field label="Revolving APR (%)">
          <Input type="number" step="0.1" value={apr} onChange={(e) => setApr(e.target.value)} />
        </Field>
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
          <Button type="submit">{editing ? "Save" : "Add card"}</Button>
        </div>
      </form>
    </Dialog>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="space-y-1.5"><Label>{label}</Label>{children}</div>;
}
