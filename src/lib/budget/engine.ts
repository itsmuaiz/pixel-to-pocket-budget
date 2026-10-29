/**
 * Pure, framework-free budgeting math. Portable to React Native as-is.
 */
import { addMonths, budgetMonth, daysBetween, monthDiff, weeksInMonth } from "./dates";
import { INCOME, type BudgetState, type Category, type Cents, type MonthKey, type Transaction } from "./types";

export interface CategoryMonth {
  assigned: Cents;
  activity: Cents;
  available: Cents;
}

export interface MonthSummary {
  month: MonthKey;
  readyToAssign: Cents;
  income: Cents;
  assignedTotal: Cents;
  activityTotal: Cents;
  overspentLastMonth: Cents;
  rows: Record<string, CategoryMonth>;
}

type ActivityMap = Map<MonthKey, Map<string, Cents>>;

function bump(map: ActivityMap, month: MonthKey, key: string, amt: Cents) {
  let m = map.get(month);
  if (!m) map.set(month, (m = new Map()));
  m.set(key, (m.get(key) ?? 0) + amt);
}

/** Lines of a transaction as (categoryId, amount) pairs. */
export function txLines(t: Transaction) {
  if (t.splits && t.splits.length) return t.splits;
  return [{ categoryId: t.categoryId, amount: t.amount, memo: t.memo }];
}

function buildActivity(state: BudgetState): ActivityMap {
  const map: ActivityMap = new Map();
  const acc = new Map(state.accounts.map((a) => [a.id, a]));
  const ccCat = new Map(state.categories.filter((c) => c.creditAccountId).map((c) => [c.creditAccountId!, c.id]));
  const fd = state.settings.firstDayOfMonth;
  for (const t of state.transactions) {
    const a = acc.get(t.accountId);
    if (!a || !a.onBudget) continue;
    const month = budgetMonth(t.date, fd);
    if (t.transferAccountId) {
      const other = acc.get(t.transferAccountId);
      if (other?.onBudget) {
        // Payment from a cash account to a credit card reduces the CC Payment category.
        if (a.type !== "credit" && other.type === "credit") {
          const cc = ccCat.get(other.id);
          if (cc) bump(map, month, cc, t.amount);
        }
        continue;
      }
      // transfer to tracking account: treated like normal categorized spending
    }
    for (const l of txLines(t)) {
      if (!l.categoryId) continue;
      if (l.categoryId === INCOME) {
        bump(map, month, INCOME, l.amount);
        continue;
      }
      bump(map, month, l.categoryId, l.amount);
      if (a.type === "credit") {
        const cc = ccCat.get(a.id);
        if (cc) bump(map, month, cc, -l.amount);
      }
    }
  }
  return map;
}

function firstMonth(state: BudgetState, upTo: MonthKey): MonthKey {
  let min = upTo;
  const fd = state.settings.firstDayOfMonth;
  for (const t of state.transactions) {
    const m = budgetMonth(t.date, fd);
    if (m < min) min = m;
  }
  for (const k of Object.keys(state.assignments)) if (k < min) min = k;
  return min;
}

const cache = new WeakMap<BudgetState, Map<MonthKey, MonthSummary>>();

export function computeMonth(state: BudgetState, month: MonthKey): MonthSummary {
  let c = cache.get(state);
  if (!c) cache.set(state, (c = new Map()));
  const hit = c.get(month);
  if (hit) return hit;

  const activity = buildActivity(state);
  const cats = state.categories;
  const carry = new Map<string, Cents>();
  let rta = 0;
  let penalty = 0;
  let m = firstMonth(state, month);
  let result: MonthSummary | null = null;

  while (m <= month) {
    const act = activity.get(m) ?? new Map();
    const asg = state.assignments[m] ?? {};
    const income = act.get(INCOME) ?? 0;
    let assignedTotal = 0;
    let activityTotal = 0;
    const rows: Record<string, CategoryMonth> = {};
    let nextPenalty = 0;
    for (const cat of cats) {
      const assigned = asg[cat.id] ?? 0;
      const a = act.get(cat.id) ?? 0;
      const available = (carry.get(cat.id) ?? 0) + assigned + a;
      rows[cat.id] = { assigned, activity: a, available };
      assignedTotal += assigned;
      activityTotal += a;
      carry.set(cat.id, Math.max(0, available));
      if (available < 0) nextPenalty += available;
    }
    rta += income - assignedTotal + penalty;
    const summary: MonthSummary = {
      month: m,
      readyToAssign: rta,
      income,
      assignedTotal,
      activityTotal,
      overspentLastMonth: penalty,
      rows,
    };
    c.set(m, summary);
    if (m === month) result = summary;
    penalty = nextPenalty;
    m = addMonths(m, 1);
  }
  return result!;
}

export type FundingStatus = "funded" | "underfunded" | "overspent" | "neutral";

export function fundingStatus(cat: Category, row: CategoryMonth, month: MonthKey): FundingStatus {
  if (row.available < 0) return "overspent";
  if (cat.target && targetNeed(cat, row, month) > 0) return "underfunded";
  if (row.available > 0 || cat.target) return "funded";
  return "neutral";
}

/** How much more needs to be assigned this month to satisfy the target. */
export function targetNeed(cat: Category, row: CategoryMonth, month: MonthKey): Cents {
  const t = cat.target;
  if (!t) return 0;
  switch (t.type) {
    case "monthly":
      return Math.max(0, t.amount - row.assigned);
    case "need": {
      const total = t.cadence === "weekly" ? t.amount * weeksInMonth(month) : t.amount;
      return Math.max(0, total - row.assigned);
    }
    case "fill":
      return Math.max(0, t.amount - row.available);
    case "byDate": {
      const startOfMonth = row.available - row.assigned;
      const remaining = t.amount - startOfMonth;
      if (remaining <= 0) return 0;
      const left = t.date ? Math.max(1, monthDiff(month, t.date.slice(0, 7)) + 1) : 1;
      const perMonth = Math.ceil(remaining / left);
      return Math.max(0, perMonth - row.assigned);
    }
  }
}

/** 0..1 progress towards a target. */
export function targetProgress(cat: Category, row: CategoryMonth, month: MonthKey): number {
  const t = cat.target;
  if (!t) return 0;
  if (t.type === "fill" || t.type === "byDate") return t.amount ? Math.min(1, Math.max(0, row.available / t.amount)) : 1;
  const need = targetNeed(cat, row, month);
  const total = row.assigned + need;
  return total ? Math.min(1, row.assigned / total) : 1;
}

/** Returns new per-category assignments for the month funding targets in order until RTA runs out. */
export function autoAssign(state: BudgetState, month: MonthKey): Record<string, Cents> {
  const s = computeMonth(state, month);
  let left = s.readyToAssign;
  const next: Record<string, Cents> = { ...(state.assignments[month] ?? {}) };
  const groupOrder = new Map(state.groups.map((g) => [g.id, g.order]));
  const cats = [...state.categories]
    .filter((c) => c.target && !c.hidden)
    .sort((a, b) => (groupOrder.get(a.groupId)! - groupOrder.get(b.groupId)!) || a.order - b.order);
  for (const cat of cats) {
    if (left <= 0) break;
    const need = targetNeed(cat, s.rows[cat.id], month);
    const give = Math.min(need, left);
    if (give > 0) {
      next[cat.id] = (next[cat.id] ?? 0) + give;
      left -= give;
    }
  }
  return next;
}

export function accountBalance(state: BudgetState, accountId: string, opts?: { clearedOnly?: boolean; until?: string }) {
  let sum = 0;
  for (const t of state.transactions) {
    if (t.accountId !== accountId) continue;
    if (opts?.clearedOnly && !t.cleared) continue;
    if (opts?.until && t.date > opts.until) continue;
    sum += t.amount;
  }
  return sum;
}

// ---------- Reports ----------

export interface DateRange {
  from: string; // ISO date
  to: string;
}

function isSpending(state: BudgetState, t: Transaction) {
  const a = state.accounts.find((x) => x.id === t.accountId);
  if (!a?.onBudget) return false;
  if (t.transferAccountId && state.accounts.find((x) => x.id === t.transferAccountId)?.onBudget) return false;
  return true;
}

export function spendingByCategory(state: BudgetState, range: DateRange) {
  const ccCats = new Set(state.categories.filter((c) => c.creditAccountId).map((c) => c.id));
  const totals = new Map<string, Cents>();
  for (const t of state.transactions) {
    if (t.date < range.from || t.date > range.to || !isSpending(state, t)) continue;
    for (const l of txLines(t)) {
      if (l.categoryId === INCOME || (l.categoryId && ccCats.has(l.categoryId))) continue;
      const key = l.categoryId ?? "uncategorized";
      totals.set(key, (totals.get(key) ?? 0) - l.amount);
    }
  }
  return [...totals.entries()]
    .filter(([, v]) => v > 0)
    .map(([categoryId, amount]) => ({ categoryId, amount }))
    .sort((a, b) => b.amount - a.amount);
}

export function monthsInRange(range: DateRange): MonthKey[] {
  const out: MonthKey[] = [];
  let m = range.from.slice(0, 7);
  const end = range.to.slice(0, 7);
  while (m <= end) {
    out.push(m);
    m = addMonths(m, 1);
  }
  return out;
}

export function incomeVsExpense(state: BudgetState, range: DateRange) {
  const months = monthsInRange(range);
  const rows = new Map(months.map((m) => [m, { month: m, income: 0, expense: 0 }]));
  for (const t of state.transactions) {
    if (t.date < range.from || t.date > range.to || !isSpending(state, t)) continue;
    const r = rows.get(t.date.slice(0, 7));
    if (!r) continue;
    for (const l of txLines(t)) {
      if (l.categoryId === INCOME) r.income += l.amount;
      else r.expense -= l.amount;
    }
  }
  return [...rows.values()];
}

export function netWorthSeries(state: BudgetState, range: DateRange) {
  return monthsInRange(range).map((m) => {
    const end = `${m}-31`;
    let assets = 0;
    let debts = 0;
    for (const a of state.accounts) {
      const b = accountBalance(state, a.id, { until: end });
      if (b >= 0) assets += b;
      else debts += b;
    }
    return { month: m, assets, debts, net: assets + debts };
  });
}

/** Simplified YNAB Age of Money: FIFO match outflows to inflows; average age of last 10 outflows. */
export function ageOfMoney(state: BudgetState): number | null {
  const onBudget = new Set(state.accounts.filter((a) => a.onBudget).map((a) => a.id));
  const txs = state.transactions
    .filter((t) => onBudget.has(t.accountId) && !(t.transferAccountId && onBudget.has(t.transferAccountId)))
    .sort((a, b) => a.date.localeCompare(b.date));
  const queue: { date: string; left: Cents }[] = [];
  const ages: number[] = [];
  for (const t of txs) {
    if (t.amount > 0) queue.push({ date: t.date, left: t.amount });
    else if (t.amount < 0) {
      let need = -t.amount;
      let weighted = 0;
      const total = need;
      while (need > 0 && queue.length) {
        const q = queue[0];
        const take = Math.min(q.left, need);
        weighted += take * daysBetween(q.date, t.date);
        q.left -= take;
        need -= take;
        if (q.left === 0) queue.shift();
      }
      if (need < total) ages.push(weighted / (total - need));
    }
  }
  if (!ages.length) return null;
  const last = ages.slice(-10);
  return Math.round(last.reduce((a, b) => a + b, 0) / last.length);
}
