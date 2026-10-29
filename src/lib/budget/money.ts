import type { Cents } from "./types";

const fmt = new Intl.NumberFormat("nl-NL", { style: "currency", currency: "EUR" });
const plain = new Intl.NumberFormat("nl-NL", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export function formatEUR(cents: Cents): string {
  return fmt.format(cents / 100);
}

/** "1.234,56" without currency sign, for inputs */
export function formatPlain(cents: Cents): string {
  return plain.format(cents / 100);
}

/** Parses Dutch ("1.234,56") or dot-decimal ("12.5") input into cents. Returns null when invalid. */
export function parseAmount(input: string): Cents | null {
  let s = input.trim().replace(/[€\s]/g, "");
  if (!s) return null;
  const neg = s.startsWith("-");
  s = s.replace(/^[-+]/, "");
  if (s.includes(",")) s = s.replace(/\./g, "").replace(",", ".");
  else if ((s.match(/\./g) || []).length > 1) s = s.replace(/\./g, "");
  if (!/^\d*(\.\d{0,2})?$/.test(s) || s === "" || s === ".") return null;
  const cents = Math.round(parseFloat(s) * 100);
  return neg ? -cents : cents;
}

/** VoiceOver-friendly: "twelve euros fifty" style -> "12 euros 50 cents" */
export function speakEUR(cents: Cents): string {
  const neg = cents < 0;
  const abs = Math.abs(cents);
  const e = Math.floor(abs / 100);
  const c = abs % 100;
  const parts = [`${e} ${e === 1 ? "euro" : "euros"}`];
  if (c) parts.push(`${c} ${c === 1 ? "cent" : "cents"}`);
  return (neg ? "minus " : "") + parts.join(" ");
}
