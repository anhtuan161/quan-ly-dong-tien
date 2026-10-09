import "server-only";
import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import type {
  Category,
  MemberRole,
  MonthlySummaryRow,
  ProjectSettings,
  ProjectWithRole,
  Transaction,
} from "@/lib/types";

/** All projects the current user is a member of, with their role. Cached per request. */
export const getMyProjects = cache(async (): Promise<ProjectWithRole[]> => {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return [];

  const { data, error } = await supabase
    .from("project_members")
    .select("role, projects(id, name, initial_investment, settings, created_at)")
    .eq("user_id", auth.user.id);
  if (error) throw error;

  type Row = {
    role: MemberRole;
    projects: { id: string; name: string; initial_investment: number; settings: ProjectSettings | null; created_at: string } | null;
  };

  return ((data ?? []) as unknown as Row[])
    .filter((r) => r.projects)
    .map((r) => ({
      ...r.projects!,
      initial_investment: Number(r.projects!.initial_investment) || 0,
      settings: r.projects!.settings ?? {},
      role: r.role,
    }))
    .sort((a, b) => a.created_at.localeCompare(b.created_at));
});

export const getProject = cache(async (id: string) => {
  const projects = await getMyProjects();
  return projects.find((p) => p.id === id) ?? null;
});

export const getCategories = cache(async (projectIds: string[]): Promise<Category[]> => {
  if (!projectIds.length) return [];
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("categories")
    .select("id, project_id, name, type")
    .in("project_id", projectIds)
    .order("name");
  if (error) throw error;
  return (data ?? []) as Category[];
});

export async function getMonthlySummary(projectIds: string[]): Promise<MonthlySummaryRow[]> {
  if (!projectIds.length) return [];
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("transaction_monthly_summary")
    .select("project_id, month, type, category_id, total, txn_count")
    .in("project_id", projectIds)
    .order("month")
    .limit(10000);
  if (error) throw error;
  return (data ?? []).map((r) => ({ ...r, total: Number(r.total) || 0 })) as MonthlySummaryRow[];
}

export async function getRecentTransactions(projectIds: string[], limit = 15): Promise<Transaction[]> {
  if (!projectIds.length) return [];
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("transactions")
    .select("id, project_id, amount, type, category_id, date, note")
    .in("project_id", projectIds)
    .order("date", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data ?? []).map((r) => ({ ...r, amount: Number(r.amount) || 0 })) as Transaction[];
}

export async function getMembers(projectId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_project_members", { p_project_id: projectId });
  if (error) throw error;
  return (data ?? []) as { user_id: string; email: string; role: MemberRole; created_at: string }[];
}

export function projectCurrency(settings: ProjectSettings | null | undefined) {
  return typeof settings?.currency === "string" ? settings.currency : "VND";
}
