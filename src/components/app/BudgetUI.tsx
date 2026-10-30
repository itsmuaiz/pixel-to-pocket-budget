import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { addMonths, monthLabel } from "@/lib/budget/dates";
import { haptic } from "@/lib/haptics";
import type { ReactNode } from "react";

export function MonthPicker({ month, onChange }: { month: string; onChange: (month: string) => void }) {
  const change = (n: number) => { onChange(addMonths(month, n)); haptic("selection"); };
  return <div className="flex items-center justify-between py-3"><Button variant="ghost" size="icon" aria-label="Previous month" onClick={() => change(-1)}><ChevronLeft /></Button><span className="text-[17px] font-semibold">{monthLabel(month)}</span><Button variant="ghost" size="icon" aria-label="Next month" onClick={() => change(1)}><ChevronRight /></Button></div>;
}

export function FormField({ label, children }: { label: string; children: ReactNode }) {
  return <label className="grid gap-1.5 py-2 text-sm text-muted-foreground"><span>{label}</span>{children}</label>;
}
export const formInput = "min-h-11 w-full rounded-lg border border-input bg-card px-3 py-2 text-base text-foreground outline-none focus:ring-2 focus:ring-ring";
export function LoadingScreen() { return <div className="mx-auto max-w-2xl p-6 text-muted-foreground" role="status">Loading budget…</div>; }
export function download(name: string, text: string, type = "text/csv") {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const link = document.createElement("a"); link.href = url; link.download = name; link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}