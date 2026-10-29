import { useSyncExternalStore } from "react";
import { toast } from "sonner";
import { advance, todayISO } from "./dates";
import { autoAssign as computeAutoAssign } from "./engine";
import { LocalRepository, type BudgetRepository } from "./repository";
import {
  INCOME,
  type Account,
  type AccountType,
  type BudgetState,
  type Category,
  type Cents,
  type Frequency,
  type MonthKey,
  type Settings,
  type Target,
  type Transaction,
} from "./types";

export const uid = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2) + Date.now().toString(36);

export function defaultState(): BudgetState {
  const groups = [
    { id: "g-bills", name: "Bills", cats: ["Rent", "Utilities", "Phone & Internet", "Insurance"] },
    { id: "g-needs", name: "Needs", cats: ["Groceries", "Transportation", "Medical"] },
    { id: "g-wants", name: "Wants", cats: ["Dining Out", "Entertainment", "Shopping"] },
    { id: "g-savings", name: "Savings Goals", cats: ["Emergency Fund", "Vacation"] },
  ];
  return {
    version: 1,
    settings: { budgetName: "My Budget", firstDayOfMonth: 1, appearance: "system" },
    accounts: [],
    groups: groups.map((g, i) => ({ id: g.id, name: g.name, order: i + 1 })),
    categories: groups.flatMap((g) => g.cats.map((name, i) => ({ id: uid(), groupId: g.id, name, order: i }))),
    assignments: {},
    transactions: [],
    recurring: [],
  };
}

let repo: BudgetRepository | null = null;
let state: BudgetState | null = null;
const listeners = new Set<() => void>();

function materializeRecurring(s: BudgetState): BudgetState {
  const today = todayISO();
  if (!s.recurring.some((r) => r.nextDate <= today)) return s;
  const txs = [...s.transactions];
  const recurring = s.recurring.map((r) => {
    let next = r.nextDate;
    let guard = 0;
    while (next <= today && guard++ < 120) {
      txs.push(...buildTransfer({ ...r.template, date: next, cleared: false, recurringId: r.id }, s));
      next = advance(next, r.frequency);
    }
    return { ...r, nextDate: next };
  });
  return { ...s, transactions: txs, recurring };
}

function ensure(): BudgetState {
  if (!state) {
    repo = new LocalRepository();
    state = materializeRecurring(repo.load() ?? defaultState());
    repo.save(state);
  }
  return state;
}

function set(next: BudgetState) {
  state = next;
  repo?.save(next);
  listeners.forEach((l) => l());
}

function mutate(fn: (s: BudgetState) => BudgetState) {
  set(fn(ensure()));
}

/** Apply a change and offer an Undo toast. */
function undoable(message: string, fn: (s: BudgetState) => BudgetState) {
  const prev = ensure();
  set(fn(prev));
  toast(message, { action: { label: "Undo", onClick: () => set(prev) }, duration: 5000 });
}

const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => listeners.delete(l);
};

/** Returns null during SSR / before hydration. */
export function useBudget(): BudgetState | null {
  return useSyncExternalStore(subscribe, ensure, () => null);
}

export function getState() {
  return ensure();
}

/** For tests */
export function __setState(s: BudgetState) {
  state = s;
}

// ---------- helpers ----------

function buildTransfer(t: Omit<Transaction, "id">, s: BudgetState): Transaction[] {
  const id = uid();
  if (!t.transferAccountId) return [{ ...t, id }];
  const pairId = uid();
  const otherOnBudget = s.accounts.find((a) => a.id === t.transferAccountId)?.onBudget;
  const thisOnBudget = s.accounts.find((a) => a.id === t.accountId)?.onBudget;
  const keepCat = thisOnBudget !== otherOnBudget;
  return [
    { ...t, id, transferPairId: pairId, categoryId: keepCat ? t.categoryId : undefined, splits: undefined },
    {
      ...t,
      id: pairId,
      accountId: t.transferAccountId,
      transferAccountId: t.accountId,
      transferPairId: id,
      amount: -t.amount,
      categoryId: undefined,
      splits: undefined,
    },
  ];
}

const CC_GROUP = "g-cc";

// ---------- actions ----------

export const actions = {
  updateSettings(patch: Partial<Settings>) {
    mutate((s) => ({ ...s, settings: { ...s.settings, ...patch } }));
  },

  addAccount(input: { name: string; type: AccountType; startingBalance: Cents }) {
    mutate((s) => {
      const onBudget = input.type !== "tracking";
      const acc: Account = { id: uid(), name: input.name, type: input.type, onBudget, createdAt: todayISO() };
      let groups = s.groups;
      let categories = s.categories;
      if (input.type === "credit") {
        if (!groups.some((g) => g.id === CC_GROUP))
          groups = [{ id: CC_GROUP, name: "Credit Card Payments", order: 0, system: true }, ...groups];
        categories = [
          ...categories,
          { id: uid(), groupId: CC_GROUP, name: input.name, order: categories.length, creditAccountId: acc.id },
        ];
      }
      const transactions = [...s.transactions];
      if (input.startingBalance !== 0) {
        transactions.push({
          id: uid(),
          accountId: acc.id,
          date: todayISO(),
          payee: "Starting Balance",
          amount: input.startingBalance,
          cleared: true,
          categoryId: onBudget && input.type !== "credit" ? INCOME : undefined,
        });
      }
      return { ...s, accounts: [...s.accounts, acc], groups, categories, transactions };
    });
  },

  updateAccount(id: string, patch: Partial<Account>) {
    mutate((s) => ({ ...s, accounts: s.accounts.map((a) => (a.id === id ? { ...a, ...patch } : a)) }));
  },

  deleteAccount(id: string) {
    mutate((s) => ({
      ...s,
      accounts: s.accounts.filter((a) => a.id !== id),
      transactions: s.transactions.filter((t) => t.accountId !== id && t.transferAccountId !== id),
      categories: s.categories.filter((c) => c.creditAccountId !== id),
    }));
  },

  setAssigned(month: MonthKey, categoryId: string, amount: Cents) {
    mutate((s) => ({
      ...s,
      assignments: { ...s.assignments, [month]: { ...(s.assignments[month] ?? {}), [categoryId]: amount } },
    }));
  },

  /** Move money between categories. Use INCOME as "Ready to Assign". */
  moveMoney(month: MonthKey, fromId: string, toId: string, amount: Cents) {
    undoable("Money moved", (s) => {
      const m = { ...(s.assignments[month] ?? {}) };
      if (fromId !== INCOME) m[fromId] = (m[fromId] ?? 0) - amount;
      if (toId !== INCOME) m[toId] = (m[toId] ?? 0) + amount;
      return { ...s, assignments: { ...s.assignments, [month]: m } };
    });
  },

  autoAssign(month: MonthKey) {
    undoable("Targets funded", (s) => ({
      ...s,
      assignments: { ...s.assignments, [month]: computeAutoAssign(s, month) },
    }));
  },

  addTransaction(t: Omit<Transaction, "id">, recurring?: Frequency) {
    mutate((s) => {
      let rec = s.recurring;
      let tx = t;
      if (recurring) {
        const rid = uid();
        const { date, cleared, ...template } = t;
        void cleared;
        rec = [...rec, { id: rid, frequency: recurring, nextDate: advance(date, recurring), template }];
        tx = { ...t, recurringId: rid };
      }
      return { ...s, recurring: rec, transactions: [...s.transactions, ...buildTransfer(tx, s)] };
    });
  },

  updateTransaction(id: string, t: Omit<Transaction, "id">) {
    mutate((s) => {
      const old = s.transactions.find((x) => x.id === id);
      const rest = s.transactions.filter((x) => x.id !== id && x.id !== old?.transferPairId);
      const built = buildTransfer(t, s);
      built[0].id = id;
      return { ...s, transactions: [...rest, ...built] };
    });
  },

  deleteTransaction(id: string) {
    undoable("Transaction deleted", (s) => {
      const t = s.transactions.find((x) => x.id === id);
      return { ...s, transactions: s.transactions.filter((x) => x.id !== id && x.id !== t?.transferPairId) };
    });
  },

  toggleCleared(id: string) {
    mutate((s) => ({ ...s, transactions: s.transactions.map((t) => (t.id === id ? { ...t, cleared: !t.cleared } : t)) }));
  },

  deleteRecurring(id: string) {
    mutate((s) => ({ ...s, recurring: s.recurring.filter((r) => r.id !== id) }));
  },

  importTransactions(rows: Omit<Transaction, "id">[]) {
    undoable(`Imported ${rows.length} transactions`, (s) => ({
      ...s,
      transactions: [...s.transactions, ...rows.map((r) => ({ ...r, id: uid() }))],
    }));
  },

  addCategory(groupId: string, name: string) {
    mutate((s) => ({
      ...s,
      categories: [...s.categories, { id: uid(), groupId, name, order: s.categories.filter((c) => c.groupId === groupId).length }],
    }));
  },

  addGroup(name: string) {
    mutate((s) => ({ ...s, groups: [...s.groups, { id: uid(), name, order: s.groups.length + 1 }] }));
  },

  updateCategory(id: string, patch: Partial<Category>) {
    mutate((s) => ({ ...s, categories: s.categories.map((c) => (c.id === id ? { ...c, ...patch } : c)) }));
  },

  hideCategory(id: string, hidden: boolean) {
    undoable(hidden ? "Category hidden" : "Category shown", (s) => ({
      ...s,
      categories: s.categories.map((c) => (c.id === id ? { ...c, hidden } : c)),
    }));
  },

  setTarget(id: string, target: Target | undefined) {
    mutate((s) => ({ ...s, categories: s.categories.map((c) => (c.id === id ? { ...c, target } : c)) }));
  },

  moveCategory(id: string, dir: -1 | 1) {
    mutate((s) => {
      const cat = s.categories.find((c) => c.id === id);
      if (!cat) return s;
      const siblings = s.categories.filter((c) => c.groupId === cat.groupId).sort((a, b) => a.order - b.order);
      const i = siblings.findIndex((c) => c.id === id);
      const j = i + dir;
      if (j < 0 || j >= siblings.length) return s;
      [siblings[i], siblings[j]] = [siblings[j], siblings[i]];
      const order = new Map(siblings.map((c, k) => [c.id, k]));
      return { ...s, categories: s.categories.map((c) => (order.has(c.id) ? { ...c, order: order.get(c.id)! } : c)) };
    });
  },

  toggleGroup(id: string) {
    mutate((s) => ({ ...s, groups: s.groups.map((g) => (g.id === id ? { ...g, collapsed: !g.collapsed } : g)) }));
  },

  loadSample() {
    mutate(() => sampleState());
  },

  reset() {
    set(defaultState());
  },
};

/** Demo data for exploring the app. */
export function sampleState(): BudgetState {
  const s = defaultState();
  const today = todayISO();
  const month = today.slice(0, 7);
  const checking: Account = { id: uid(), name: "ING Checking", type: "checking", onBudget: true, createdAt: today };
  const savings: Account = { id: uid(), name: "Savings", type: "savings", onBudget: true, createdAt: today };
  s.accounts = [checking, savings];
  const byName = (n: string) => s.categories.find((c) => c.name === n)!.id;
  const d = (day: number) => `${month}-${String(Math.min(day, Number(today.slice(8)))).padStart(2, "0")}`;
  const tx = (p: Partial<Transaction> & { amount: number; payee: string }): Transaction => ({
    id: uid(),
    accountId: checking.id,
    date: d(1),
    cleared: true,
    ...p,
  });
  s.transactions = [
    tx({ payee: "Starting Balance", amount: 120000, categoryId: INCOME }),
    tx({ payee: "Starting Balance", amount: 300000, categoryId: INCOME, accountId: savings.id }),
    tx({ payee: "Employer BV", amount: 285000, categoryId: INCOME, date: d(2) }),
    tx({ payee: "Landlord", amount: -125000, categoryId: byName("Rent"), date: d(2) }),
    tx({ payee: "Albert Heijn", amount: -8645, categoryId: byName("Groceries"), date: d(4) }),
    tx({ payee: "NS", amount: -4210, categoryId: byName("Transportation"), date: d(5) }),
    tx({ payee: "Vattenfall", amount: -11200, categoryId: byName("Utilities"), date: d(6) }),
    tx({ payee: "Jumbo", amount: -5320, categoryId: byName("Groceries"), date: d(9), cleared: false }),
    tx({ payee: "Café de Jaren", amount: -3850, categoryId: byName("Dining Out"), date: d(10), cleared: false }),
  ];
  s.categories = s.categories.map((c) =>
    c.name === "Rent"
      ? { ...c, target: { type: "monthly", amount: 125000 } }
      : c.name === "Groceries"
        ? { ...c, target: { type: "need", amount: 7500, cadence: "weekly" } }
        : c.name === "Emergency Fund"
          ? { ...c, target: { type: "fill", amount: 500000 } }
          : c,
  );
  s.assignments = {
    [month]: { [byName("Rent")]: 125000, [byName("Groceries")]: 20000, [byName("Utilities")]: 11200, [byName("Transportation")]: 6000, [byName("Dining Out")]: 3000 },
  };
  return s;
}
