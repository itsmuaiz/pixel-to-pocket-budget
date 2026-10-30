import { INCOME, type BudgetState, type Transaction } from "./types";
import { formatPlain, parseAmount } from "./money";

const HEADER = ["Account", "Date", "Payee", "Category", "Memo", "Outflow", "Inflow", "Cleared"];

function esc(v: string) {
  return /[",\n;]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v;
}

export function exportCSV(state: BudgetState): string {
  const acc = new Map(state.accounts.map((a) => [a.id, a.name]));
  const cat = new Map(state.categories.map((c) => [c.id, c.name]));
  const lines = [HEADER.join(",")];
  for (const t of [...state.transactions].sort((a, b) => a.date.localeCompare(b.date))) {
    const category = t.transferAccountId
      ? `Transfer: ${acc.get(t.transferAccountId) ?? ""}`
      : t.splits?.length
        ? "Split"
        : t.categoryId === INCOME
          ? "Ready to Assign"
          : (t.categoryId && cat.get(t.categoryId)) || "";
    lines.push(
      [
        acc.get(t.accountId) ?? "",
        t.date,
        t.payee,
        category,
        t.memo ?? "",
        t.amount < 0 ? formatPlain(-t.amount) : "",
        t.amount > 0 ? formatPlain(t.amount) : "",
        t.cleared ? "yes" : "no",
      ]
        .map((v) => esc(String(v)))
        .join(","),
    );
  }
  return lines.join("\n");
}

function parseRow(line: string, sep: string): string[] {
  const out: string[] = [];
  let cur = "";
  let q = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (q) {
      if (ch === '"' && line[i + 1] === '"') { cur += '"'; i++; }
      else if (ch === '"') q = false;
      else cur += ch;
    } else if (ch === '"') q = true;
    else if (ch === sep) { out.push(cur); cur = ""; }
    else cur += ch;
  }
  out.push(cur);
  return out;
}

/** Imports rows into the given account. Matches categories by name. Returns new transactions. */
export function importCSV(text: string, state: BudgetState, accountId: string): Omit<Transaction, "id">[] {
  const rows = text.split(/\r?\n/).filter((l) => l.trim());
  const first = rows[0];
  if (!first) return [];
  const sep = first.includes(";") && !first.includes(",") ? ";" : ",";
  const head = parseRow(first, sep).map((h) => h.trim().toLowerCase());
  const idx = (n: string) => head.indexOf(n);
  const catByName = new Map(state.categories.map((c) => [c.name.toLowerCase(), c.id]));
  const out: Omit<Transaction, "id">[] = [];
  for (const r of rows.slice(1)) {
    const c = parseRow(r, sep);
    const get = (n: string) => (idx(n) >= 0 ? (c[idx(n)] ?? "").trim() : "");
    const date = get("date");
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) continue;
    let amount = 0;
    if (idx("amount") >= 0) amount = parseAmount(get("amount")) ?? 0;
    else amount = (parseAmount(get("inflow")) ?? 0) - (parseAmount(get("outflow")) ?? 0);
    const catName = get("category").toLowerCase();
    out.push({
      accountId,
      date,
      payee: get("payee"),
      memo: get("memo") || undefined,
      amount,
      cleared: /^(yes|true|1|c)$/i.test(get("cleared")),
      categoryId: catName === "ready to assign" || catName === "income" ? INCOME : catByName.get(catName),
    });
  }
  return out;
}
