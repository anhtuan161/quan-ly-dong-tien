import { z } from "zod";

export const txnTypeSchema = z.enum(["INCOME", "EXPENSE"]);

export const transactionSchema = z.object({
  project_id: z.string().uuid(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  type: txnTypeSchema,
  category_id: z.string().uuid().nullable().optional(),
  amount: z.coerce.number().positive().max(1e15),
  note: z.string().trim().max(500).optional(),
});
export type TransactionInput = z.infer<typeof transactionSchema>;

export const projectSchema = z.object({
  name: z.string().trim().min(1).max(120),
  initial_investment: z.coerce.number().min(0).max(1e15),
  currency: z.string().trim().regex(/^[A-Z]{3}$/).default("VND"),
});
export type ProjectInput = z.infer<typeof projectSchema>;

export const categorySchema = z.object({
  project_id: z.string().uuid(),
  name: z.string().trim().min(1).max(80),
  type: txnTypeSchema,
});

export const metricSchema = z.object({
  key: z.string().trim().regex(/^[A-Za-z][A-Za-z0-9_]{0,39}$/),
  label: z.string().trim().max(80).optional(),
  formula: z.string().trim().min(1).max(500),
  format: z.enum(["currency", "percent", "number"]),
});
export const metricsSchema = z.array(metricSchema).max(50);

export const memberSchema = z.object({
  project_id: z.string().uuid(),
  email: z.string().trim().email(),
  role: z.enum(["admin", "editor", "viewer"]),
});

export const CURRENCIES = ["VND", "USD", "EUR", "JPY", "SGD"] as const;
