import { redirect } from "next/navigation";
import { Sidebar } from "@/components/sidebar";
import { QuickEntry } from "@/components/quick-entry";
import { getCategories, getMyProjects, projectCurrency } from "@/lib/data";
import { getUser } from "@/lib/supabase/server";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await getUser();
  if (!user) redirect("/login");

  const projects = await getMyProjects();
  const categories = await getCategories(projects.map((p) => p.id));

  const nav = projects.map((p) => ({
    id: p.id,
    name: p.name,
    role: p.role,
    currency: projectCurrency(p.settings),
  }));

  return (
    <div className="flex min-h-dvh">
      <Sidebar projects={nav} email={user.email ?? ""} />
      <main className="min-w-0 flex-1 px-4 pt-16 pb-24 md:px-8 md:pt-8">
        <div className="mx-auto max-w-6xl">{children}</div>
      </main>
      <QuickEntry projects={nav} categories={categories} />
    </div>
  );
}
