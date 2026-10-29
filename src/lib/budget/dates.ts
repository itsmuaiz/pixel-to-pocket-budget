import type { Frequency, ISODate, MonthKey } from "./types";

export function todayISO(): ISODate {
  const d = new Date();
  return toISO(d);
}
export function toISO(d: Date): ISODate {
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
}
export function parseISO(s: ISODate): Date {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d);
}
export function addMonths(key: MonthKey, n: number): MonthKey {
  const [y, m] = key.split("-").map(Number);
  const d = new Date(y, m - 1 + n, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}
export function monthDiff(a: MonthKey, b: MonthKey): number {
  const [ay, am] = a.split("-").map(Number);
  const [by, bm] = b.split("-").map(Number);
  return (by - ay) * 12 + (bm - am);
}
/** Budget month for a date, honoring the configured first day of month. */
export function budgetMonth(date: ISODate, firstDay = 1): MonthKey {
  const key = date.slice(0, 7);
  const day = Number(date.slice(8, 10));
  return day < firstDay ? addMonths(key, -1) : key;
}
export function currentMonth(firstDay = 1): MonthKey {
  return budgetMonth(todayISO(), firstDay);
}
export function monthLabel(key: MonthKey, style: "long" | "short" = "long"): string {
  const [y, m] = key.split("-").map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString("en-GB", { month: style, year: style === "long" ? "numeric" : "2-digit" });
}
export function formatDate(d: ISODate): string {
  return parseISO(d).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}
export function advance(date: ISODate, f: Frequency): ISODate {
  const d = parseISO(date);
  if (f === "weekly") d.setDate(d.getDate() + 7);
  else if (f === "monthly") d.setMonth(d.getMonth() + 1);
  else d.setFullYear(d.getFullYear() + 1);
  return toISO(d);
}
/** Number of a given weekday occurrences in month (used for weekly needs: counts Mondays). */
export function weeksInMonth(key: MonthKey): number {
  const [y, m] = key.split("-").map(Number);
  let n = 0;
  const d = new Date(y, m - 1, 1);
  while (d.getMonth() === m - 1) {
    if (d.getDay() === 1) n++;
    d.setDate(d.getDate() + 1);
  }
  return n;
}
export function daysBetween(a: ISODate, b: ISODate): number {
  return Math.round((parseISO(b).getTime() - parseISO(a).getTime()) / 86400000);
}
