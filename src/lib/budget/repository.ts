import type { BudgetState } from "./types";

/**
 * Storage abstraction. Swap LocalRepository for an AsyncStorage/SQLite or cloud-sync
 * implementation without touching UI or engine code.
 */
export interface BudgetRepository {
  load(): BudgetState | null;
  save(state: BudgetState): void;
  clear(): void;
}

const KEY = "budgetly:v1";

export class LocalRepository implements BudgetRepository {
  load(): BudgetState | null {
    try {
      const raw = localStorage.getItem(KEY);
      return raw ? (JSON.parse(raw) as BudgetState) : null;
    } catch {
      return null;
    }
  }
  save(state: BudgetState) {
    try {
      localStorage.setItem(KEY, JSON.stringify(state));
    } catch {
      /* quota */
    }
  }
  clear() {
    localStorage.removeItem(KEY);
  }
}
