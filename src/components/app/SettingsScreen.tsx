import { useRef, useState } from "react";
import { Download, Upload, Trash2, FlaskConical, Check } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Screen, Section, Segmented, Sheet } from "./primitives";
import { LoadingScreen, FormField, formInput, download } from "./BudgetUI";
import { actions, useBudget } from "@/lib/budget/store";
import { exportCSV, importCSV } from "@/lib/budget/csv";
import type { Settings, Transaction } from "@/lib/budget/types";

export function SettingsScreen() {
  const state = useBudget(); const file = useRef<HTMLInputElement>(null);
  const [account, setAccount] = useState(""); const [rows, setRows] = useState<Omit<Transaction, "id">[] | null>(null);
  if (!state) return <LoadingScreen />;
  const selectedAccount = account || state.accounts[0]?.id || "";
  return <Screen title="Settings">
    <Section header="Budget"><div className="px-4 py-2"><FormField label="Budget name"><input className={formInput} value={state.settings.budgetName} onChange={e => actions.updateSettings({ budgetName: e.target.value })} /></FormField><FormField label="First day of month"><select className={formInput} value={state.settings.firstDayOfMonth} onChange={e => actions.updateSettings({ firstDayOfMonth: Number(e.target.value) })}>{Array.from({ length: 28 }, (_, i) => <option key={i + 1} value={i + 1}>{i + 1}</option>)}</select></FormField></div></Section>
    <Section header="Appearance"><div className="p-4"><Segmented<Settings["appearance"]> value={state.settings.appearance} onChange={appearance => actions.updateSettings({ appearance })} options={[{ value: "system", label: "System" }, { value: "light", label: "Light" }, { value: "dark", label: "Dark" }]} /></div></Section>
    <Section header="Import & export"><div className="px-4 py-3"><Button variant="ghost" className="w-full justify-start" onClick={() => { download("budgetly-transactions.csv", exportCSV(state)); toast.success("Transactions exported"); }}><Download />Export transactions (CSV)</Button><FormField label="Import into account"><select className={formInput} value={selectedAccount} onChange={e => setAccount(e.target.value)}><option value="" disabled>Choose account</option>{state.accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}</select></FormField><Button disabled={!selectedAccount} variant="ghost" className="w-full justify-start" onClick={() => file.current?.click()}><Upload />Import transactions (CSV)</Button><input ref={file} className="hidden" type="file" accept=".csv,text/csv" onChange={async e => { const picked = e.target.files?.[0]; if (!picked) return; try { const imported = importCSV(await picked.text(), state, selectedAccount); if (!imported.length) toast.error("No valid transactions found"); else setRows(imported); } catch { toast.error("Could not read this file"); } e.target.value = ""; }} /></div></Section>
    <Section header="Data"><div className="px-4 py-3"><Button variant="ghost" className="w-full justify-start" onClick={() => { if (!state.transactions.length || window.confirm("Replace your budget with sample data? Your current data will be removed.")) { actions.loadSample(); toast.success("Sample budget loaded"); } }}><FlaskConical />Load sample budget</Button><Button variant="ghost" className="mt-1 w-full justify-start text-danger" onClick={() => { if (window.confirm("Reset your budget? All accounts, transactions, targets and assignments will be deleted. This cannot be undone.")) { actions.reset(); toast.success("Budget reset"); } }}><Trash2 />Reset all data</Button></div></Section>
    <div className="pt-2 text-center"><p className="font-semibold text-primary">Budgetly</p><p className="mt-1 text-xs text-muted-foreground">Local budget · EUR · Version 1.0</p></div>
    <Sheet open={rows !== null} onOpenChange={o => { if (!o) setRows(null); }} title="Import Transactions" leading={<Button variant="ghost" onClick={() => setRows(null)}>Cancel</Button>}><div className="pb-6"><p className="py-4">{rows?.length ?? 0} transactions into {state.accounts.find(a => a.id === selectedAccount)?.name}</p><div className="max-h-64 overflow-y-auto">{rows?.slice(0, 10).map((r, i) => <div className="flex justify-between border-b py-2 text-sm" key={i}><span>{r.date} · {r.payee}</span></div>)}</div><Button className="mt-5 w-full" onClick={() => { if (rows) actions.importTransactions(rows); setRows(null); }}><Check />Import {rows?.length} transactions</Button></div></Sheet>
  </Screen>;
}