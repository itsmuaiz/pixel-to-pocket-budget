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
  closed?: boolean | undefined;
  createdAt: ISODate;
}

export interface CategoryGroup {
  id: string;
  name: string;
  order: number;
  collapsed?: boolean | undefined;
  system?: boolean | undefined;
}

export type TargetType = "monthly" | "byDate" | "need" | "fill";

export interface Target {
  type: TargetType;
  amount: Cents;
  /** for byDate */
  date?: ISODate | undefined;
  /** for need */
  cadence?: "weekly" | "monthly" | undefined;
}

export interface Category {
  id: string;
  groupId: string;
  name: string;
  order: number;
  hidden?: boolean | undefined;
  target?: Target | undefined;
  /** set for auto-created credit card payment categories */
  creditAccountId?: string | undefined;
}

export const INCOME = "income";

export interface SplitLine {
  categoryId?: string | undefined; // category id or INCOME
  amount: Cents;
  memo?: string | undefined;
}

export interface Transaction {
  id: string;
  accountId: string;
  date: ISODate;
  payee: string;
  memo?: string | undefined;
  amount: Cents;
  cleared: boolean;
  categoryId?: string | undefined; // category id or INCOME; ignored when splits present
  splits?: SplitLine[] | undefined;
  transferAccountId?: string | undefined;
  transferPairId?: string | undefined;
  recurringId?: string | undefined;
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
