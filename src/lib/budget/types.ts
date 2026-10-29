/** All amounts are integer cents. Positive = inflow, negative = outflow. */
export type Cents = number;
/** "YYYY-MM" */
export type MonthKey = string;
/** "YYYY-MM-DD" */
export type ISODate = string;

export type AccountType = "checking" | "savings" | "cash" | "credit" | "tracking";

export interface Account {
  id: string;
  name: string;
  type: AccountType;
  onBudget: boolean;
  closed?: boolean;
  createdAt: ISODate;
}

export interface CategoryGroup {
  id: string;
  name: string;
  order: number;
  collapsed?: boolean;
  system?: boolean;
}

export type TargetType = "monthly" | "byDate" | "need" | "fill";

export interface Target {
  type: TargetType;
  amount: Cents;
  /** for byDate */
  date?: ISODate;
  /** for need */
  cadence?: "weekly" | "monthly";
}

export interface Category {
  id: string;
  groupId: string;
  name: string;
  order: number;
  hidden?: boolean;
  target?: Target;
  /** set for auto-created credit card payment categories */
  creditAccountId?: string;
}

export const INCOME = "income";

export interface SplitLine {
  categoryId?: string; // category id or INCOME
  amount: Cents;
  memo?: string;
}

export interface Transaction {
  id: string;
  accountId: string;
  date: ISODate;
  payee: string;
  memo?: string;
  amount: Cents;
  cleared: boolean;
  categoryId?: string; // category id or INCOME; ignored when splits present
  splits?: SplitLine[];
  transferAccountId?: string;
  transferPairId?: string;
  recurringId?: string;
}

export type Frequency = "weekly" | "monthly" | "yearly";

export interface Recurring {
  id: string;
  frequency: Frequency;
  nextDate: ISODate;
  template: Omit<Transaction, "id" | "date" | "cleared" | "recurringId" | "transferPairId">;
}

export interface Settings {
  budgetName: string;
  firstDayOfMonth: number; // 1-28
  appearance: "system" | "light" | "dark";
}

export interface BudgetState {
  version: 1;
  settings: Settings;
  accounts: Account[];
  groups: CategoryGroup[];
  categories: Category[];
  /** month -> categoryId -> assigned cents */
  assignments: Record<MonthKey, Record<string, Cents>>;
  transactions: Transaction[];
  recurring: Recurring[];
}
