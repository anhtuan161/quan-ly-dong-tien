import { all, create } from "mathjs";
import type { FinanceSummary } from "@/lib/finance";
import type { CustomMetric, MetricFormat, ProjectSettings } from "@/lib/types";

// ---------------------------------------------------------------------------
// Sandboxed mathjs instance (https://mathjs.org/docs/expressions/security.html)
// ---------------------------------------------------------------------------
const math = create(all, {});
const evaluate = math.evaluate;

const blocked = (name: string) => () => {
  throw new Error(`Function ${name} is disabled`);
};
math.import(
  {
    import: blocked("import"),
    createUnit: blocked("createUnit"),
    evaluate: blocked("evaluate"),
    parse: blocked("parse"),
    simplify: blocked("simplify"),
    derivative: blocked("derivative"),
    resolve: blocked("resolve"),
    reviver: blocked("reviver"),
  },
  { override: true },
);

// ---------------------------------------------------------------------------
// Built-in variables
// ---------------------------------------------------------------------------
export const BUILTIN_VARIABLES = [
  "TOTAL_INCOME",
  "TOTAL_EXPENSE",
  "NET_CASHFLOW",
  "INITIAL_INVESTMENT",
  "CASH_POSITION",
  "ROI",
  "MONTHS_ACTIVE",
  "AVG_MONTHLY_INCOME",
  "AVG_MONTHLY_EXPENSE",
  "BURN_RATE",
  "AVG_MONTHLY_NET",
] as const;

export type FormulaScope = Record<string, number>;

export function buildScope(f: FinanceSummary): FormulaScope {
  return {
    TOTAL_INCOME: f.totalIncome,
    TOTAL_EXPENSE: f.totalExpense,
    NET_CASHFLOW: f.netCashflow,
    INITIAL_INVESTMENT: f.initialInvestment,
    CASH_POSITION: f.cashPosition,
    ROI: f.roi ?? 0,
    MONTHS_ACTIVE: f.monthsActive,
    AVG_MONTHLY_INCOME: f.avgMonthlyIncome,
    AVG_MONTHLY_EXPENSE: f.avgMonthlyExpense,
    BURN_RATE: f.avgMonthlyExpense,
    AVG_MONTHLY_NET: f.avgMonthlyNet,
  };
}

/** Sample scope used to validate formulas without real data. */
export const SAMPLE_SCOPE: FormulaScope = Object.fromEntries(BUILTIN_VARIABLES.map((v) => [v, 1]));

export const METRIC_KEY_RE = /^[A-Za-z][A-Za-z0-9_]{0,39}$/;
const RESERVED = new Set<string>(BUILTIN_VARIABLES.map((v) => v.toLowerCase()));

export function isReservedKey(key: string) {
  const k = key.toLowerCase();
  // Also reject keys shadowing mathjs functions/constants (e.g. "pi", "sqrt").
  return RESERVED.has(k) || k in (math as unknown as Record<string, unknown>);
}

// ---------------------------------------------------------------------------
// Settings normalisation
// ---------------------------------------------------------------------------
const FORMATS: MetricFormat[] = ["currency", "percent", "number"];

function guessFormat(key: string): MetricFormat {
  return /margin|ratio|percent|pct|rate_pct|roi/i.test(key) ? "percent" : "currency";
}

/**
 * Reads custom metrics from `projects.settings`. Supported shapes:
 *  1. { custom_metrics: [{ key, label, formula, format }] }   (canonical)
 *  2. { custom_formulas: { key: "formula" } }
 *  3. { key: "formula", ... }                                 (flat map)
 */
export function getCustomMetrics(settings: ProjectSettings | null | undefined): CustomMetric[] {
  if (!settings || typeof settings !== "object") return [];

  if (Array.isArray(settings.custom_metrics)) {
    return settings.custom_metrics
      .filter((m): m is CustomMetric => !!m && typeof m.key === "string" && typeof m.formula === "string")
      .map((m) => ({
        key: m.key,
        label: typeof m.label === "string" ? m.label : undefined,
        formula: m.formula,
        format: FORMATS.includes(m.format as MetricFormat) ? m.format : guessFormat(m.key),
      }));
  }

  const map =
    settings.custom_formulas && typeof settings.custom_formulas === "object"
      ? settings.custom_formulas
      : (settings as Record<string, unknown>);

  return Object.entries(map)
    .filter(([key, formula]) => key !== "currency" && typeof formula === "string" && METRIC_KEY_RE.test(key))
    .map(([key, formula]) => ({ key, formula: formula as string, format: guessFormat(key) }));
}

// ---------------------------------------------------------------------------
// Evaluation
// ---------------------------------------------------------------------------
export type MetricResult = CustomMetric & { value: number | null; error?: string };

function toNumber(raw: unknown): number {
  if (typeof raw === "number") return raw;
  if (typeof raw === "boolean") return raw ? 1 : 0;
  if (raw && typeof raw === "object" && "toNumber" in raw && typeof (raw as { toNumber: unknown }).toNumber === "function") {
    return (raw as { toNumber: () => number }).toNumber();
  }
  throw new Error("Result is not a number");
}

export function evaluateFormula(formula: string, scope: FormulaScope): number {
  if (!formula.trim()) throw new Error("Empty formula");
  if (formula.length > 500) throw new Error("Formula too long");
  // Shallow copy: assignments inside a formula must not leak into the shared scope.
  const value = toNumber(evaluate(formula, { ...scope }));
  if (!Number.isFinite(value)) throw new Error(Number.isNaN(value) ? "NaN" : "Division by zero");
  return value;
}

/** Evaluates metrics in order; each result is added to the scope so later metrics can reference it. */
export function evaluateMetrics(metrics: CustomMetric[], baseScope: FormulaScope): MetricResult[] {
  const scope: FormulaScope = { ...baseScope };
  return metrics.map((m) => {
    try {
      const value = evaluateFormula(m.formula, scope);
      scope[m.key] = value;
      return { ...m, value };
    } catch (e) {
      return { ...m, value: null, error: e instanceof Error ? e.message : String(e) };
    }
  });
}
