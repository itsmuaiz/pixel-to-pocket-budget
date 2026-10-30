import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { ChevronRight, CreditCard, Landmark, Plus, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Screen, Money, Section, Sheet, EmptyState } from "./primitives";
import { FormField, formInput, LoadingScreen } from "./BudgetUI";
import { actions, useBudget } from "@/lib/budget/store";
import { accountBalance } from "@/lib/budget/engine";
import { parseAmount } from "@/lib/budget/money";
import type { AccountType } from "@/lib/budget/types";

export function AccountsScreen() {
  const state = useBudget();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [type, setType] = useState<AccountType>("checking");
  const [balance, setBalance] = useState("");
  const [error, setError] = useState("");
  if (!state) return <LoadingScreen />;
  const total = state.accounts.reduce((n, a) => n + accountBalance(state, a.id), 0);
  return <Screen title="Accounts" trailing={<Button variant="ghost" size="icon" aria-label="Add account" onClick={() => setOpen(true)}><Plus /></Button>}>
    <div className="mb-7 border-b pb-6 pt-2"><p className="mb-2 text-sm text-muted-foreground">Total balance</p><Money cents={total} className="text-3xl font-bold" /></div>
    {!state.accounts.length ? <EmptyState icon={<Landmark className="size-12" />} title="Your first account" action={<Button onClick={() => setOpen(true)}><Plus />Add account</Button>} /> : <>{[true, false].map(onBudget => {
      const accounts = state.accounts.filter(a => a.onBudget === onBudget && !a.closed);
      if (!accounts.length) return null;
      return <Section key={String(onBudget)} header={onBudget ? "On budget" : "Tracking"}>{accounts.map(a => {
        const Icon = a.type === "credit" ? CreditCard : a.type === "cash" ? Wallet : Landmark;
        const value = accountBalance(state, a.id);
        return <Link key={a.id} to="/accounts/$accountId" params={{ accountId: a.id }} className="press flex min-h-20 items-center gap-3 px-4 py-3"><div className="grid size-10 shrink-0 place-items-center rounded-lg bg-accent text-primary"><Icon className="size-5" /></div><div className="min-w-0 flex-1"><p className="truncate font-medium">{a.name}</p><p className="mt-0.5 text-xs capitalize text-muted-foreground">{a.type}</p></div><Money cents={value} className={value < 0 ? "text-danger text-sm font-semibold" : "text-sm font-semibold"} /><ChevronRight className="size-4 text-muted-foreground" /></Link>;
      })}</Section>;
    })}<Button variant="outline" onClick={() => setOpen(true)}><Plus />Add account</Button></>}
    <Sheet open={open} onOpenChange={setOpen} title="Add Account" leading={<Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>}><form className="pb-6" onSubmit={e => { e.preventDefault(); const cents = balance.trim() ? parseAmount(balance) : 0; if (!name.trim() || cents === null) { setError("Enter a name and a valid starting balance."); return; } actions.addAccount({ name: name.trim(), type, startingBalance: type === "credit" ? -Math.abs(cents) : cents }); setOpen(false); setName(""); setBalance(""); setError(""); }}>
      <FormField label="Account name"><input required autoFocus className={formInput} value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Checking" /></FormField><FormField label="Account type"><select className={formInput} value={type} onChange={e => setType(e.target.value as AccountType)}><option value="checking">Checking</option><option value="savings">Savings</option><option value="cash">Cash</option><option value="credit">Credit card</option><option value="tracking">Tracking</option></select></FormField><FormField label={type === "credit" ? "Outstanding balance (€)" : "Starting balance (€)"}><input inputMode="decimal" className={formInput} value={balance} onChange={e => setBalance(e.target.value)} placeholder="0,00" /></FormField>{error && <p role="alert" className="text-danger">{error}</p>}<Button type="submit" size="lg" className="mt-4 w-full">Add account</Button>
    </form></Sheet>
  </Screen>;
}