import { notFound } from "next/navigation";
import { getProject, getMembers } from "@/lib/data";
import { getCustomMetrics } from "@/lib/formulas";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { CustomMetricsForm } from "@/components/custom-metrics-form";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const project = await getProject(id);
  return { title: project ? `${project.name} - Settings` : "Settings" };
}

export default async function ProjectSettingsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const project = await getProject(id);
  if (!project) notFound();

  const members = await getMembers(id);
  const customMetrics = getCustomMetrics(project.settings);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Project Settings</h1>
        <p className="text-muted-foreground mt-1">{project.name}</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>General Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm font-medium">Project Name</p>
              <p className="text-sm text-muted-foreground">{project.name}</p>
            </div>
            <div>
              <p className="text-sm font-medium">Initial Investment</p>
              <p className="text-sm text-muted-foreground">{project.initial_investment}</p>
            </div>
            <div>
              <p className="text-sm font-medium">Currency</p>
              <p className="text-sm text-muted-foreground">{typeof project.settings?.currency === "string" ? project.settings.currency : "VND"}</p>
            </div>
            <p className="text-xs text-muted-foreground pt-4">Editing settings is not fully implemented in this demo UI yet. Use the API or DB to update.</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Members</CardTitle>
            <CardDescription>People with access to this project</CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {members.map(m => (
                <li key={m.user_id} className="flex justify-between items-center text-sm border-b pb-2 last:border-0 last:pb-0">
                  <span>{m.email}</span>
                  <span className="capitalize text-muted-foreground">{m.role}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Custom Metrics & Formulas</CardTitle>
          <CardDescription>
            Define custom financial metrics using math formulas. Evaluates top-to-bottom.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <CustomMetricsForm projectId={project.id} initialMetrics={customMetrics} />
        </CardContent>
      </Card>
    </div>
  );
}
