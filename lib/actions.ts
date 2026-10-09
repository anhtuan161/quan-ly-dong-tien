"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getTranslator } from "@/lib/i18n/server";
import { defaultCategories } from "@/lib/i18n/dictionaries";
import { evaluateFormula, isReservedKey, SAMPLE_SCOPE } from "@/lib/formulas";
import {
  categorySchema,
  memberSchema,
  metricsSchema,
  projectSchema,
  transactionSchema,
} from "@/lib/validation";
import type { ActionResult, CustomMetric, MemberRole, ProjectSettings } from "@/lib/types";

type PgError = { code?: string; message: string } | null;

async function fail(error: PgError | string): Promise<{ ok: false; error: string }> {
  const { t } = await getTranslator();
  if (typeof error === "string") return { ok: false, error };
  if (error?.code === "42501" || /row-level security/i.test(error?.message ?? "")) {
    return { ok: false, error: t("common.forbidden") };
  }
  console.error(error);
  return { ok: false, error: error?.message ?? t("common.error") };
}

const refresh = () => revalidatePath("/", "layout");

// ---------------------------------------------------------------------------
// Transactions
// ---------------------------------------------------------------------------
export async function createTransaction(input: unknown): Promise<ActionResult> {
  const parsed = transactionSchema.safeParse(input);
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Invalid input");

  const supabase = await createClient();
  const { error } = await supabase.from("transactions").insert({
    ...parsed.data,
    category_id: parsed.data.category_id || null,
    note: parsed.data.note || null,
  });
  if (error) return fail(error);

  refresh();
  return { ok: true };
}

export async function deleteTransaction(id: string): Promise<ActionResult> {
  const supabase = await createClient();
  const { error, count } = await supabase.from("transactions").delete({ count: "exact" }).eq("id", id);
  if (error) return fail(error);
  if (!count) return fail({ code: "42501", message: "forbidden" });
  refresh();
  return { ok: true };
}

// ---------------------------------------------------------------------------
// Projects
// ---------------------------------------------------------------------------
export async function createProject(input: unknown): Promise<ActionResult<{ id: string }>> {
  const parsed = projectSchema.safeParse(input);
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Invalid input");

  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return fail({ code: "42501", message: "unauthenticated" });

  // Generate the id here: INSERT ... RETURNING would be filtered by the SELECT policy
  // because the membership row is created by an AFTER trigger.
  const id = crypto.randomUUID();
  const { error } = await supabase.from("projects").insert({
    id,
    name: parsed.data.name,
    initial_investment: parsed.data.initial_investment,
    settings: { currency: parsed.data.currency, custom_metrics: [] },
    created_by: auth.user.id,
  });
  if (error) return fail(error);

  const { locale } = await getTranslator();
  const defaults = defaultCategories(locale);
  await supabase.from("categories").insert([
    ...defaults.INCOME.map((name) => ({ project_id: id, name, type: "INCOME" as const })),
    ...defaults.EXPENSE.map((name) => ({ project_id: id, name, type: "EXPENSE" as const })),
  ]);

  refresh();
  return { ok: true, data: { id } };
}

async function readSettings(projectId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase.from("projects").select("settings").eq("id", projectId).single();
  return { supabase, settings: (data?.settings ?? {}) as ProjectSettings, error };
}

export async function updateProject(projectId: string, input: unknown): Promise<ActionResult> {
  const parsed = projectSchema.safeParse(input);
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Invalid input");

  const { supabase, settings, error: readError } = await readSettings(projectId);
  if (readError) return fail(readError);

  const { data, error } = await supabase
    .from("projects")
    .update({
      name: parsed.data.name,
      initial_investment: parsed.data.initial_investment,
      settings: { ...settings, currency: parsed.data.currency },
    })
    .eq("id", projectId)
    .select("id");
  if (error) return fail(error);
  if (!data?.length) return fail({ code: "42501", message: "forbidden" });

  refresh();
  return { ok: true };
}

export async function deleteProject(projectId: string): Promise<ActionResult> {
  const supabase = await createClient();
  const { error, count } = await supabase.from("projects").delete({ count: "exact" }).eq("id", projectId);
  if (error) return fail(error);
  if (!count) return fail({ code: "42501", message: "forbidden" });
  refresh();
  return { ok: true };
}

// ---------------------------------------------------------------------------
// Categories
// ---------------------------------------------------------------------------
export async function createCategory(input: unknown): Promise<ActionResult> {
  const parsed = categorySchema.safeParse(input);
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Invalid input");
  const supabase = await createClient();
  const { error } = await supabase.from("categories").insert(parsed.data);
  if (error) return fail(error);
  refresh();
  return { ok: true };
}

export async function deleteCategory(id: string): Promise<ActionResult> {
  const supabase = await createClient();
  const { error, count } = await supabase.from("categories").delete({ count: "exact" }).eq("id", id);
  if (error) return fail(error);
  if (!count) return fail({ code: "42501", message: "forbidden" });
  refresh();
  return { ok: true };
}

// ---------------------------------------------------------------------------
// Custom metrics (stored in projects.settings.custom_metrics)
// ---------------------------------------------------------------------------
export async function saveCustomMetrics(projectId: string, input: unknown): Promise<ActionResult> {
  const { t } = await getTranslator();
  const parsed = metricsSchema.safeParse(input);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return fail(issue?.path.includes("key") ? t("metric.keyInvalid") : issue?.message ?? "Invalid input");
  }

  const metrics: CustomMetric[] = parsed.data.map((m) => ({ ...m, label: m.label || undefined }));
  const scope = { ...SAMPLE_SCOPE };
  const seen = new Set<string>();

  for (const m of metrics) {
    if (isReservedKey(m.key)) return fail(`${m.key}: ${t("metric.keyReserved")}`);
    if (seen.has(m.key.toLowerCase())) return fail(`${m.key}: ${t("metric.keyDuplicate")}`);
    seen.add(m.key.toLowerCase());
    try {
      evaluateFormula(m.formula, scope);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      // Numeric edge cases with sample data are fine; syntax / unknown symbols are not.
      if (!/^(Division by zero|NaN)$/.test(msg)) return fail(`${m.key}: ${msg}`);
    }
    scope[m.key] = 1;
  }

  const { supabase, settings, error: readError } = await readSettings(projectId);
  if (readError) return fail(readError);

  // Canonical shape: drop legacy formula maps / flat string entries.
  const cleaned: ProjectSettings = Object.fromEntries(
    Object.entries(settings).filter(([k, v]) => k !== "custom_formulas" && (k === "currency" || typeof v !== "string")),
  );

  const { data, error } = await supabase
    .from("projects")
    .update({ settings: { ...cleaned, custom_metrics: metrics } })
    .eq("id", projectId)
    .select("id");
  if (error) return fail(error);
  if (!data?.length) return fail({ code: "42501", message: "forbidden" });

  refresh();
  return { ok: true };
}

// ---------------------------------------------------------------------------
// Members
// ---------------------------------------------------------------------------
export async function addMember(input: unknown): Promise<ActionResult> {
  const parsed = memberSchema.safeParse(input);
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Invalid input");
  const supabase = await createClient();
  const { error } = await supabase.rpc("add_project_member", {
    p_project_id: parsed.data.project_id,
    p_email: parsed.data.email,
    p_role: parsed.data.role,
  });
  if (error) {
    if (error.message.includes("USER_NOT_FOUND")) return fail((await getTranslator()).t("member.notFound"));
    return fail(error);
  }
  refresh();
  return { ok: true };
}

export async function updateMemberRole(projectId: string, userId: string, role: MemberRole): Promise<ActionResult> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("project_members")
    .update({ role })
    .eq("project_id", projectId)
    .eq("user_id", userId)
    .select("user_id");
  if (error) return fail(error);
  if (!data?.length) return fail({ code: "42501", message: "forbidden" });
  refresh();
  return { ok: true };
}

export async function removeMember(projectId: string, userId: string): Promise<ActionResult> {
  const supabase = await createClient();
  const { error, count } = await supabase
    .from("project_members")
    .delete({ count: "exact" })
    .eq("project_id", projectId)
    .eq("user_id", userId);
  if (error) return fail(error);
  if (!count) return fail({ code: "42501", message: "forbidden" });
  refresh();
  return { ok: true };
}
