import type { MonthlySummaryRow } from "@/lib/types";

export type MonthPoint = {
  month: string; // YYYY-MM
  income: number;
  expense: number;
  net: number;
  /** Cumulative cash position: -initial investment + cumulative net. */
  position: number;
};

export type BreakEven =
  | { status: "reached"; month: string }
  | { status: "projected"; months: number; month: string; windowMonths: number }
  | { status: "unreachable"; windowMonths: number }
  | { status: "nodata" };

export type FinanceSummary = {
  initialInvestment: number;
  totalIncome: number;
  totalExpense: number;
  netCashflow: number;
  cashPosition: number;
  /** Net cashflow / initial investment (null when no investment). */
  roi: number | null;
  monthsActive: number;
  avgMonthlyIncome: number;
  /** Average monthly expense = burn rate. */
  avgMonthlyExpense: number;
  avgMonthlyNet: number;
  monthly: MonthPoint[];
  breakEven: BreakEven;
};

const BREAK_EVEN_WINDOW = 3;

const monthKey = (iso: string) => iso.slice(0, 7);

function addMonths(ym: string, n: number) {
  const [y, m] = ym.split("-").map(Number);
  const d = new Date(Date.UTC(y, m - 1 + n, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

function monthRange(from: string, to: string) {
  const out: string[] = [];
  for (let cur = from; cur <= to && out.length < 600; cur = addMonths(cur, 1)) out.push(cur);
  return out;
}

export function filterRowsByPeriod(rows: MonthlySummaryRow[], fromMonth?: string, toMonth?: string) {
  return rows.filter((r) => {
    const k = monthKey(r.month);
    return (!fromMonth || k >= fromMonth) && (!toMonth || k <= toMonth);
  });
}

export function computeFinance(rows: MonthlySummaryRow[], initialInvestment: number): FinanceSummary {
  const byMonth = new Map<string, { income: number; expense: number }>();
  let totalIncome = 0;
  let totalExpense = 0;

  for (const r of rows) {
    const k = monthKey(r.month);
    const amount = Number(r.total) || 0;
    const bucket = byMonth.get(k) ?? { income: 0, expense: 0 };
    if (r.type === "INCOME") {
      bucket.income += amount;
      totalIncome += amount;
    } else {
      bucket.expense += amount;
      totalExpense += amount;
    }
    byMonth.set(k, bucket);
  }

  const keys = [...byMonth.keys()].sort();
  const months = keys.length ? monthRange(keys[0], keys[keys.length - 1]) : [];

  let position = -initialInvestment;
  const monthly: MonthPoint[] = months.map((month) => {
    const { income, expense } = byMonth.get(month) ?? { income: 0, expense: 0 };
    const net = income - expense;
    position += net;
    return { month, income, expense, net, position };
  });

  const netCashflow = totalIncome - totalExpense;
  const cashPosition = netCashflow - initialInvestment;
  const monthsActive = monthly.length;

  return {
    initialInvestment,
    totalIncome,
    totalExpense,
    netCashflow,
    cashPosition,
    roi: initialInvestment > 0 ? netCashflow / initialInvestment : null,
    monthsActive,
    avgMonthlyIncome: monthsActive ? totalIncome / monthsActive : 0,
    avgMonthlyExpense: monthsActive ? totalExpense / monthsActive : 0,
    avgMonthlyNet: monthsActive ? netCashflow / monthsActive : 0,
    monthly,
    breakEven: estimateBreakEven(monthly, cashPosition),
  };
}

function estimateBreakEven(monthly: MonthPoint[], cashPosition: number): BreakEven {
  if (!monthly.length) return { status: "nodata" };

  if (cashPosition >= 0) {
    // First month of the latest run where the position stayed >= 0.
    let idx = monthly.length - 1;
    while (idx > 0 && monthly[idx - 1].position >= 0) idx--;
    return { status: "reached", month: monthly[idx].month };
  }

  const window = monthly.slice(-BREAK_EVEN_WINDOW);
  const avgNet = window.reduce((s, m) => s + m.net, 0) / window.length;
  if (avgNet <= 0) return { status: "unreachable", windowMonths: window.length };

  const months = Math.ceil(-cashPosition / avgNet);
  if (months > 600) return { status: "unreachable", windowMonths: window.length };
  return {
    status: "projected",
    months,
    month: addMonths(monthly[monthly.length - 1].month, months),
    windowMonths: window.length,
  };
}

export type CategoryTotal = { categoryId: string | null; total: number };

export function totalsByCategory(rows: MonthlySummaryRow[], type: "INCOME" | "EXPENSE"): CategoryTotal[] {
  const map = new Map<string | null, number>();
  for (const r of rows) {
    if (r.type !== type) continue;
    map.set(r.category_id, (map.get(r.category_id) ?? 0) + (Number(r.total) || 0));
  }
  return [...map.entries()]
    .map(([categoryId, total]) => ({ categoryId, total }))
    .sort((a, b) => b.total - a.total);
}
