import { useState } from "react";
import { ArrowDownUp, ArrowDown, ArrowUp, ChevronDown, ChevronRight, Plus, Sparkles, Wallet, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AmountInput } from "./AmountInput";
import { Screen, Sheet, Money, Pill, Section } from "./primitives";
import { MonthPicker, FormField, formInput, LoadingScreen } from "./BudgetUI";
import { SwipeRow } from "./SwipeRow";
import { useBudget, actions } from "@/lib/budget/store";
import { currentMonth, formatDate } from "@/lib/budget/dates";
import { computeMonth, fundingStatus, targetNeed, targetProgress, txLines } from "@/lib/budget/engine";
import { formatPlain, parseAmount } from "@/lib/budget/money";
import { INCOME, type Target, type TargetType } from "@/lib/budget/types";
import { cn } from "@/lib/utils";

const tones = { funded: "success", underfunded: "warning", overspent: "danger", neutral: "neutral" } as const;

export function BudgetScreen() {
  const state = useBudget();
  const [month, setMonth] = useState<string | null>(null);
  const [editing, setEditing] = useState<string | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [move, setMove] = useState(false);
  const [from, setFrom] = useState(INCOME);
  const [to, setTo] = useState("");
  const [moveAmount, setMoveAmount] = useState("");
  const [error, setError] = useState("");
  const [add, setAdd] = useState(false);
  const [name, setName] = useState("");
  const [group, setGroup] = useState("");
  const [newGroup, setNewGroup] = useState(false);
  const [showHidden, setShowHidden] = useState(false);
  const [targetType, setTargetType] = useState<TargetType>("monthly");
  const [targetAmount, setTargetAmount] = useState("");
  const [targetDate, setTargetDate] = useState("");
  const [cadence, setCadence] = useState<"weekly" | "monthly">("monthly");
  if (!state) return <LoadingScreen />;
  const key = month ?? currentMonth(state.settings.firstDayOfMonth);
  const summary = computeMonth(state, key);
  const category = state.categories.find(c => c.id === selected);
  const row = selected ? summary.rows[selected] : undefined;
  const openCategory = (id: string) => {
    const target = state.categories.find(c => c.id === id)?.target;
    setSelected(id); setTargetType(target?.type ?? "monthly"); setTargetAmount(target ? formatPlain(target.amount) : ""); setTargetDate(target?.date ?? ""); setCadence(target?.cadence ?? "monthly");
  };
  const openMove = (fromId = INCOME, toId = "", amount = "") => { setFrom(fromId); setTo(toId); setMoveAmount(amount); setError(""); setSelected(null); setMove(true); };
  const options = <><option value={INCOME}>Ready to Assign</option>{state.categories.filter(c => !c.hidden).map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</>;
  const overspent = state.categories.filter(c => (summary.rows[c.id]?.available ?? 0) < 0);
  return <Screen title="Budget" trailing={<Button variant="ghost" size="icon" aria-label="Add category or group" onClick={() => { setAdd(true); setGroup(state.groups.find(g => !g.system)?.id ?? ""); }}><Plus /></Button>}>
    <div className="flex items-center justify-between"><span className="text-sm text-muted-foreground">{state.settings.budgetName}</span><span className="flex items-center gap-1 text-xs text-muted-foreground"><Wallet className="size-3.5" />Budgetly</span></div>
    <MonthPicker month={key} onChange={setMonth} />
    <div className={cn("mb-5 flex items-center justify-between gap-3 rounded-xl px-5 py-5", summary.readyToAssign === 0 ? "bg-success-soft text-success" : summary.readyToAssign > 0 ? "bg-warning-soft text-warning" : "bg-danger-soft text-danger")}>
      <div><p className="text-sm font-medium">Ready to Assign</p><Money cents={summary.readyToAssign} className="mt-1 block text-3xl font-bold" /></div><Button variant="ghost" size="icon" aria-label="Assign or move money" onClick={() => openMove()}><ArrowDownUp className="size-5" /></Button>
    </div>
    {!state.accounts.length && <div className="mb-6 flex items-center justify-between gap-3 border-b pb-5"><p className="text-sm text-muted-foreground">No accounts yet</p><Button asChild variant="outline"><a href="/accounts">Add your first account</a></Button></div>}
    <div className="mb-5 flex flex-wrap gap-2"><Button variant="outline" onClick={() => actions.autoAssign(key)} disabled={summary.readyToAssign <= 0}><Sparkles />Auto-assign</Button><Button variant="ghost" onClick={() => openMove()}><ArrowDownUp />Move money</Button>{overspent.length > 0 && <Button variant="ghost" className="text-danger" onClick={() => { const c = overspent[0]; if (c) openMove(INCOME, c.id, formatPlain(-(summary.rows[c.id]?.available ?? 0))); }}>Cover overspending</Button>}</div>
    <div className="budget-columns mb-2 px-3 text-[11px] font-medium uppercase text-muted-foreground"><span>Category</span><span className="text-right">Assigned</span><span className="text-right">Activity</span><span className="text-right">Available</span></div>
    {[...state.groups].sort((a, b) => a.order - b.order).map(g => {
      const cats = state.categories.filter(c => c.groupId === g.id && (!c.hidden || showHidden)).sort((a, b) => a.order - b.order);
      return <Section key={g.id} className="mb-4"><Button variant="ghost" className="flex h-auto min-h-11 w-full justify-start rounded-none bg-muted/40 px-3 text-sm" onClick={() => actions.toggleGroup(g.id)}>{g.collapsed ? <ChevronRight /> : <ChevronDown />}<span className="flex-1 text-left font-semibold">{g.name}</span><Money cents={cats.reduce((n, c) => n + (summary.rows[c.id]?.available ?? 0), 0)} className="text-xs text-muted-foreground" /></Button>
        {!g.collapsed && cats.map(c => {
          const r = summary.rows[c.id]; if (!r) return null;
          return <SwipeRow key={c.id} onLongPress={() => openCategory(c.id)} actions={[{ label: c.hidden ? "Show" : "Hide", tone: "muted", onAction: () => actions.hideCategory(c.id, !c.hidden) }, { label: "Move", tone: "primary", onAction: () => openMove(c.id) }]}><div className="budget-columns min-h-16 items-center gap-1 px-3 py-2">
            <Button variant="ghost" className="h-auto min-w-0 justify-start whitespace-normal px-0 py-1 text-left text-sm font-medium" onClick={() => openCategory(c.id)}><span className="min-w-0">{c.name}{c.hidden && <EyeOff className="ml-1 inline size-3" />}{c.target && <span className="mt-1 block text-[10px] font-normal text-muted-foreground">{targetNeed(c, r, key) > 0 ? `${formatPlain(targetNeed(c, r, key))} more needed` : "Target funded"}</span>}</span></Button>
            {editing === c.id ? <AmountInput label={`Assigned to ${c.name}`} value={r.assigned} onCommit={v => { actions.setAssigned(key, c.id, v); setEditing(null); }} onCancel={() => setEditing(null)} className="text-xs" /> : <Button variant="ghost" className="h-auto justify-end px-0 text-xs money font-normal" aria-label={`Edit assigned for ${c.name}`} onClick={() => setEditing(c.id)}><Money cents={r.assigned} /></Button>}
            <Money cents={r.activity} className="text-right text-xs text-muted-foreground" /><div className="flex justify-end"><Pill tone={tones[fundingStatus(c, r, key)]} onClick={() => openMove(c.id)} label={`Move money from ${c.name}`}><Money cents={r.available} className="text-xs" /></Pill></div>
          </div></SwipeRow>;
        })}
      </Section>;
    })}
    {state.categories.some(c => c.hidden) && <Button variant="ghost" onClick={() => setShowHidden(!showHidden)}>{showHidden ? "Hide hidden categories" : "Show hidden categories"}</Button>}
    <Sheet open={move} onOpenChange={setMove} title="Move Money" leading={<Button variant="ghost" onClick={() => setMove(false)}>Cancel</Button>}><form className="pb-6" onSubmit={e => { e.preventDefault(); const amount = parseAmount(moveAmount); const balance = from === INCOME ? summary.readyToAssign : summary.rows[from]?.available ?? 0; if (amount === null || amount <= 0 || from === to || !to || amount > balance) { setError("Choose different categories and an amount within the available balance."); return; } actions.moveMoney(key, from, to, amount); setMove(false); }}><FormField label="From"><select className={formInput} value={from} onChange={e => setFrom(e.target.value)}>{options}</select></FormField><FormField label="To"><select className={formInput} value={to} onChange={e => setTo(e.target.value)}><option value="">Choose category</option>{options}</select></FormField><FormField label="Amount (€)"><input inputMode="decimal" className={formInput} value={moveAmount} onChange={e => setMoveAmount(e.target.value)} /></FormField>{error && <p role="alert" className="text-danger">{error}</p>}<Button className="mt-3 w-full" size="lg" type="submit">Move money</Button></form></Sheet>
    <Sheet open={add} onOpenChange={setAdd} title="Add Category" leading={<Button variant="ghost" onClick={() => setAdd(false)}>Cancel</Button>}><form className="pb-6" onSubmit={e => { e.preventDefault(); if (!name.trim()) return; if (newGroup) actions.addGroup(name.trim()); else actions.addCategory(group, name.trim()); setName(""); setAdd(false); }}><FormField label="Name"><input required className={formInput} value={name} onChange={e => setName(e.target.value)} /></FormField><label className="flex items-center justify-between py-3">New group<input type="checkbox" checked={newGroup} onChange={e => setNewGroup(e.target.checked)} /></label>{!newGroup && <FormField label="Group"><select required className={formInput} value={group} onChange={e => setGroup(e.target.value)}>{state.groups.filter(g => !g.system).map(g => <option key={g.id} value={g.id}>{g.name}</option>)}</select></FormField>}<Button type="submit" className="mt-3 w-full">Add {newGroup ? "group" : "category"}</Button></form></Sheet>
    <Sheet open={Boolean(category)} onOpenChange={o => { if (!o) setSelected(null); }} title={category?.name ?? "Category"} leading={<Button variant="ghost" onClick={() => setSelected(null)}>Done</Button>}>
      {category && row && <div className="pb-6"><div className="grid grid-cols-3 gap-2 py-4 text-center">{[{ label: "Assigned", value: row.assigned }, { label: "Activity", value: row.activity }, { label: "Available", value: row.available }].map(x => <div key={x.label}><p className="mb-1 text-xs text-muted-foreground">{x.label}</p><Money cents={x.value} className="text-sm font-semibold" /></div>)}</div>
        <div className="mb-4 flex flex-wrap gap-2"><Button variant="outline" onClick={() => openMove(category.id)}><ArrowDownUp />Move money</Button><Button variant="ghost" size="icon" aria-label="Move category up" onClick={() => actions.moveCategory(category.id, -1)}><ArrowUp /></Button><Button variant="ghost" size="icon" aria-label="Move category down" onClick={() => actions.moveCategory(category.id, 1)}><ArrowDown /></Button><Button variant="ghost" size="icon" aria-label={category.hidden ? "Show category" : "Hide category"} onClick={() => { actions.hideCategory(category.id, !category.hidden); setSelected(null); }}><EyeOff /></Button></div>
        <h3 className="font-semibold">Target</h3>{category.target && <><progress className="my-3 h-2 w-full accent-primary" value={targetProgress(category, row, key)} max={1} /><p className="text-sm text-muted-foreground">Needs <Money cents={targetNeed(category, row, key)} /> more this month</p></>}
        <form onSubmit={e => { e.preventDefault(); const amount = parseAmount(targetAmount); if (amount === null || amount <= 0) return; const target: Target = { type: targetType, amount, date: targetType === "byDate" ? targetDate : undefined, cadence: targetType === "need" ? cadence : undefined }; actions.setTarget(category.id, target); }}><FormField label="Type"><select className={formInput} value={targetType} onChange={e => setTargetType(e.target.value as TargetType)}><option value="monthly">Monthly savings</option><option value="byDate">Balance by date</option><option value="need">Spending need</option><option value="fill">Fill up to</option></select></FormField><FormField label="Target amount (€)"><input required inputMode="decimal" className={formInput} value={targetAmount} onChange={e => setTargetAmount(e.target.value)} /></FormField>{targetType === "byDate" && <FormField label="Target date"><input required type="date" className={formInput} value={targetDate} onChange={e => setTargetDate(e.target.value)} /></FormField>}{targetType === "need" && <FormField label="Cadence"><select className={formInput} value={cadence} onChange={e => setCadence(e.target.value as "weekly" | "monthly")}><option value="monthly">Monthly</option><option value="weekly">Weekly</option></select></FormField>}<div className="flex gap-2 py-3"><Button type="submit">Save target</Button>{category.target && <Button variant="ghost" onClick={() => actions.setTarget(category.id, undefined)}>Remove target</Button>}</div></form>
        <h3 className="mb-2 mt-3 font-semibold">Transactions</h3>{state.transactions.filter(t => t.date.slice(0, 7) === key && txLines(t).some(l => l.categoryId === category.id)).map(t => <div className="flex justify-between border-b py-3" key={t.id}><div><p className="text-sm">{t.payee}</p><p className="text-xs text-muted-foreground">{formatDate(t.date)}</p></div><Money cents={txLines(t).filter(l => l.categoryId === category.id).reduce((n, l) => n + l.amount, 0)} className="text-sm" /></div>)}
      </div>}
    </Sheet>
  </Screen>;
}