import { useState } from "react";
import { BarChart3 } from "lucide-react";
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, LineChart, Line, XAxis, YAxis, CartesianGrid, BarChart, Bar } from "recharts";
import { Screen, Money, Segmented, EmptyState } from "./primitives";
import { FormField, formInput, LoadingScreen } from "./BudgetUI";
import { useBudget } from "@/lib/budget/store";
import { ageOfMoney, incomeVsExpense, netWorthSeries, spendingByCategory } from "@/lib/budget/engine";
import { addMonths, todayISO, monthLabel } from "@/lib/budget/dates";
import { formatEUR } from "@/lib/budget/money";
import { haptic } from "@/lib/haptics";

const colors = ["var(--chart-1)", "var(--chart-2)", "var(--chart-3)", "var(--chart-4)", "var(--chart-5)"];
const chartTip = { background: "var(--card)", color: "var(--foreground)", border: "1px solid var(--border)", borderRadius: 8 };
export function ReportsScreen() {
  const state = useBudget();
  const today = todayISO();
  const [from, setFrom] = useState(`${addMonths(today.slice(0, 7), -5)}-01`);
  const [to, setTo] = useState(today);
  const [view, setView] = useState<"spending" | "cashflow" | "networth">("spending");
  if (!state) return <LoadingScreen />;
  const range = { from, to };
  const spending = spendingByCategory(state, range).map(x => ({ ...x, name: state.categories.find(c => c.id === x.categoryId)?.name ?? "Uncategorized" }));
  const monthly = incomeVsExpense(state, range).map(x => ({ ...x, label: monthLabel(x.month, "short") }));
  const net = netWorthSeries(state, range).map(x => ({ ...x, label: monthLabel(x.month, "short") }));
  const total = spending.reduce((n, x) => n + x.amount, 0);
  const age = ageOfMoney(state);
  const axis = { stroke: "var(--muted-foreground)", fontSize: 11, tickLine: false, axisLine: false };
  return <Screen title="Reports"><div className="mb-4 grid grid-cols-2 gap-3"><FormField label="From"><input className={formInput} type="date" max={to} value={from} onChange={e => { if (e.target.value) setFrom(e.target.value); }} /></FormField><FormField label="To"><input className={formInput} type="date" min={from} value={to} onChange={e => { if (e.target.value) setTo(e.target.value); }} /></FormField></div>
    <Segmented value={view} onChange={v => { setView(v); haptic("selection"); }} options={[{ value: "spending", label: "Spending" }, { value: "cashflow", label: "Cash flow" }, { value: "networth", label: "Net worth" }]} />
    {!state.transactions.length ? <EmptyState icon={<BarChart3 className="size-12" />} title="No transactions yet" /> : <>
      {view === "spending" && <><div className="pt-6"><p className="text-sm text-muted-foreground">Total spending</p><Money cents={total} className="mt-1 block text-3xl font-bold" /></div>
        {spending.length ? <><div className="h-64 w-full"><ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={spending} dataKey="amount" nameKey="name" innerRadius={65} outerRadius={95} paddingAngle={3} stroke="var(--background)">{spending.map((x, i) => <Cell key={x.categoryId} fill={colors[i % colors.length]} />)}</Pie><Tooltip formatter={v => formatEUR(Number(v))} contentStyle={chartTip} /></PieChart></ResponsiveContainer></div><div className="mb-8">{spending.map((x, i) => <div key={x.categoryId} className="flex items-center gap-3 border-b py-3"><span className={`size-2.5 shrink-0 rounded-full report-color-${i % 5}`} /><span className="min-w-0 flex-1 text-sm">{x.name}</span><span className="text-xs text-muted-foreground">{Math.round(x.amount / total * 100)}%</span><Money cents={x.amount} className="text-sm font-medium" /></div>)}</div></> : <p className="py-10 text-center text-muted-foreground">No spending in this period</p>}
        <h2 className="mb-4 text-lg font-semibold">Spending trend</h2><div className="h-56"><ResponsiveContainer width="100%" height="100%"><LineChart data={monthly}><CartesianGrid stroke="var(--border)" vertical={false} /><XAxis dataKey="label" {...axis} /><YAxis {...axis} width={45} tickFormatter={v => String(v / 100)} /><Tooltip contentStyle={chartTip} formatter={v => formatEUR(Number(v))} /><Line name="Spending" type="monotone" dataKey="expense" stroke="var(--chart-1)" strokeWidth={2.5} dot={{ r: 3 }} /></LineChart></ResponsiveContainer></div>
      </>}
      {view === "cashflow" && <><h2 className="mb-4 mt-6 text-lg font-semibold">Income vs. expense</h2><div className="h-72"><ResponsiveContainer width="100%" height="100%"><BarChart data={monthly}><CartesianGrid stroke="var(--border)" vertical={false} /><XAxis dataKey="label" {...axis} /><YAxis {...axis} width={45} tickFormatter={v => String(v / 100)} /><Tooltip formatter={v => formatEUR(Number(v))} contentStyle={chartTip} /><Bar name="Income" dataKey="income" fill="var(--chart-1)" radius={[4, 4, 0, 0]} /><Bar name="Expense" dataKey="expense" fill="var(--chart-2)" radius={[4, 4, 0, 0]} /></BarChart></ResponsiveContainer></div><div className="flex justify-center gap-5 py-4 text-xs"><span className="text-primary">Income</span><span className="text-warning">Expense</span></div>{monthly.map(x => <div className="flex flex-wrap justify-between gap-2 border-b py-3 text-sm" key={x.month}><span>{x.label}</span><div className="flex gap-4"><Money cents={x.income} className="text-success" /><Money cents={-x.expense} className="text-muted-foreground" /></div></div>)}</>}
      {view === "networth" && <><p className="mt-6 text-sm text-muted-foreground">Net worth at end of period</p><Money cents={net.at(-1)?.net ?? 0} className="mt-1 block text-3xl font-bold" /><div className="mt-6 h-72"><ResponsiveContainer width="100%" height="100%"><LineChart data={net}><CartesianGrid stroke="var(--border)" vertical={false} /><XAxis dataKey="label" {...axis} /><YAxis {...axis} width={45} tickFormatter={v => String(v / 100)} /><Tooltip formatter={v => formatEUR(Number(v))} contentStyle={chartTip} /><Line name="Net worth" dataKey="net" stroke="var(--chart-1)" strokeWidth={3} type="monotone" /></LineChart></ResponsiveContainer></div></>}
      <div className="mt-8 flex items-center justify-between border-t py-6"><div><h2 className="font-semibold">Age of Money</h2><p className="mt-1 text-xs text-muted-foreground">Last 10 outflows</p></div><p className="text-2xl font-bold money">{age === null ? "—" : `${age} days`}</p></div>
    </>}
  </Screen>;
}