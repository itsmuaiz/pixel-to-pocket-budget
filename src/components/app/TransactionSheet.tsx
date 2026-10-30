import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, Segmented } from "./primitives";
import { FormField, formInput } from "./BudgetUI";
import { actions } from "@/lib/budget/store";
import { formatPlain, parseAmount } from "@/lib/budget/money";
import { todayISO } from "@/lib/budget/dates";
import { INCOME, type BudgetState, type Frequency, type Transaction } from "@/lib/budget/types";

export function TransactionSheet({ state, accountId, transaction, open, onClose }: { state: BudgetState; accountId: string; transaction?: Transaction; open: boolean; onClose: () => void }) {
  const [amount, setAmount] = useState(transaction ? formatPlain(Math.abs(transaction.amount)) : "");
  const [direction, setDirection] = useState<"outflow" | "inflow">((transaction?.amount ?? -1) > 0 ? "inflow" : "outflow");
  const [payee, setPayee] = useState(transaction?.payee ?? "");
  const [date, setDate] = useState(transaction?.date ?? todayISO());
  const [category, setCategory] = useState(transaction?.categoryId ?? "");
  const [memo, setMemo] = useState(transaction?.memo ?? "");
  const [cleared, setCleared] = useState(transaction?.cleared ?? false);
  const [transfer, setTransfer] = useState(transaction?.transferAccountId ?? "");
  const [frequency, setFrequency] = useState<Frequency | "">("");
  const [advanced, setAdvanced] = useState(Boolean(transaction?.splits || transaction?.transferAccountId));
  const [splits, setSplits] = useState<{ categoryId: string; amount: string }[]>(transaction?.splits?.map(s => ({ categoryId: s.categoryId ?? "", amount: formatPlain(Math.abs(s.amount)) })) ?? []);
  const [error, setError] = useState("");
  const selectCategories = <><option value="">Uncategorized</option><option value={INCOME}>Ready to Assign</option>{state.categories.filter(c => !c.hidden).map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</>;
  const save = (e: React.FormEvent) => {
    e.preventDefault(); const parsed = parseAmount(amount);
    if (parsed === null || parsed <= 0) { setError("Enter an amount greater than zero."); return; }
    const sign = direction === "outflow" ? -1 : 1;
    const lines = splits.map(s => ({ categoryId: s.categoryId || undefined, amount: (parseAmount(s.amount) ?? 0) * sign }));
    if (!transfer && lines.length && lines.reduce((n, s) => n + s.amount, 0) !== parsed * sign) { setError("Split amounts must equal the transaction total."); return; }
    const t: Omit<Transaction, "id"> = { accountId, date, payee: transfer ? `Transfer: ${state.accounts.find(a => a.id === transfer)?.name ?? ""}` : payee.trim(), amount: parsed * sign, cleared, memo: memo || undefined, categoryId: transfer ? undefined : category || (direction === "inflow" ? INCOME : undefined), transferAccountId: transfer || undefined, splits: !transfer && lines.length ? lines : undefined, recurringId: transaction?.recurringId };
    if (!t.payee) { setError("Enter a payee."); return; }
    if (transaction) actions.updateTransaction(transaction.id, t); else actions.addTransaction(t, frequency || undefined);
    onClose();
  };
  return <Sheet open={open} onOpenChange={o => { if (!o) onClose(); }} title={transaction ? "Edit Transaction" : "New Transaction"} leading={<Button variant="ghost" onClick={onClose}>Cancel</Button>}><form onSubmit={save} className="pb-6">
    <Segmented value={direction} onChange={setDirection} options={[{ value: "outflow", label: "Outflow" }, { value: "inflow", label: "Inflow" }]} />
    <FormField label="Amount (€)"><input autoFocus inputMode="decimal" aria-label="Amount (€)" className={`${formInput} py-5 text-center text-3xl font-semibold money`} value={amount} onChange={e => setAmount(e.target.value)} placeholder="0,00" /></FormField>
    {!transfer && <FormField label="Payee"><input className={formInput} value={payee} onChange={e => setPayee(e.target.value)} placeholder="Payee" /></FormField>}
    <FormField label="Date"><input className={formInput} type="date" required value={date} onChange={e => setDate(e.target.value)} /></FormField>
    {!transfer && !splits.length && <FormField label="Category"><select className={formInput} value={category} onChange={e => setCategory(e.target.value)}>{selectCategories}</select></FormField>}
    <FormField label="Memo"><input className={formInput} value={memo} onChange={e => setMemo(e.target.value)} placeholder="Optional" /></FormField>
    <label className="flex items-center justify-between py-3">Cleared<input type="checkbox" checked={cleared} onChange={e => setCleared(e.target.checked)} className="size-5 accent-primary" /></label>
    <Button variant="ghost" onClick={() => setAdvanced(!advanced)} className="mb-2">{advanced ? "Fewer options" : "More options"}</Button>
    {advanced && <><FormField label="Transfer to"><select className={formInput} value={transfer} onChange={e => setTransfer(e.target.value)}><option value="">Not a transfer</option>{state.accounts.filter(a => a.id !== accountId && !a.closed).map(a => <option key={a.id} value={a.id}>{a.name}</option>)}</select></FormField>
      {!transaction && <FormField label="Repeat"><select className={formInput} value={frequency} onChange={e => setFrequency(e.target.value as Frequency | "")}><option value="">Never</option><option value="weekly">Weekly</option><option value="monthly">Monthly</option><option value="yearly">Yearly</option></select></FormField>}
      {!transfer && <div className="space-y-2 py-2">{splits.map((s, i) => <div className="flex gap-2" key={i}><select aria-label={`Split ${i + 1} category`} className={`${formInput} min-w-0 flex-1`} value={s.categoryId} onChange={e => setSplits(splits.map((x, j) => j === i ? { ...x, categoryId: e.target.value } : x))}>{selectCategories}</select><input aria-label={`Split ${i + 1} amount`} className={`${formInput} w-24`} inputMode="decimal" value={s.amount} onChange={e => setSplits(splits.map((x, j) => j === i ? { ...x, amount: e.target.value } : x))} /><Button variant="ghost" size="icon" aria-label={`Remove split ${i + 1}`} onClick={() => setSplits(splits.filter((_, j) => j !== i))}><Trash2 /></Button></div>)}<Button variant="outline" onClick={() => setSplits([...splits, { categoryId: "", amount: "" }])}><Plus />Add split</Button></div>}
    </>}
    {error && <p role="alert" className="py-2 text-danger">{error}</p>}<Button type="submit" size="lg" className="mt-3 min-h-12 w-full">Save transaction</Button>
  </form></Sheet>;
}