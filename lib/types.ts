export type TxnType = "INCOME" | "EXPENSE";
export type MemberRole = "admin" | "editor" | "viewer";
export type MetricFormat = "currency" | "percent" | "number";

export type CustomMetric = {
  key: string;
  label?: string;
  formula: string;
  format?: MetricFormat;
};

export type ProjectSettings = {
  currency?: string;
  custom_metrics?: CustomMetric[];
  /** Legacy / shorthand form: { key: formula } */
  custom_formulas?: Record<string, string>;
  [extra: string]: unknown;
};

export type Project = {
  id: string;
  name: string;
  initial_investment: number;
  settings: ProjectSettings;
  created_at: string;
};

export type ProjectWithRole = Project & { role: MemberRole };

export type Category = {
  id: string;
  project_id: string;
  name: string;
  type: TxnType;
};

export type Transaction = {
  id: string;
  project_id: string;
  amount: number;
  type: TxnType;
  category_id: string | null;
  date: string;
  note: string | null;
};

/** Row of the `transaction_monthly_summary` view. */
export type MonthlySummaryRow = {
  project_id: string;
  month: string; // YYYY-MM-01
  type: TxnType;
  category_id: string | null;
  total: number;
  txn_count: number;
};

export type ActionResult<T = undefined> =
  | { ok: true; data?: T }
  | { ok: false; error: string };
