import { notFound } from "next/navigation";
import { getProject, getMembers } from "@/lib/data";
import { getCustomMetrics } from "@/lib/formulas";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { CustomMetricsForm } from "@/components/custom-metrics-form";
import { getTranslator } from "@/lib/i18n/server";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const project = await getProject(id);
  return { title: project ? `${project.name} - Settings` : "Settings" };
}

export default async function ProjectSettingsPage({ params }: { params: Promise<{ id: string }> }) {
  const { t } = await getTranslator();
  const { id } = await params;
  const project = await getProject(id);
  if (!project) notFound();

  const members = await getMembers(id);
  const customMetrics = getCustomMetrics(project.settings);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">{t("nav.settings")}</h1>
        <p className="text-muted-foreground mt-1">{project.name}</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>{t("project.general")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm font-medium">{t("project.name")}</p>
              <p className="text-sm text-muted-foreground">{project.name}</p>
            </div>
            <div>
              <p className="text-sm font-medium">{t("project.initialInvestment")}</p>
              <p className="text-sm text-muted-foreground">{project.initial_investment}</p>
            </div>
            <div>
              <p className="text-sm font-medium">{t("project.currency")}</p>
              <p className="text-sm text-muted-foreground">{typeof project.settings?.currency === "string" ? project.settings.currency : "VND"}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t("member.title")}</CardTitle>
            <CardDescription>{t("member.desc")}</CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {members.map(m => (
                <li key={m.user_id} className="flex justify-between items-center text-sm border-b pb-2 last:border-0 last:pb-0">
                  <span>{m.email}</span>
                  <span className="capitalize text-muted-foreground">{t(`role.${m.role}` as any) || m.role}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t("report.customMetrics")}</CardTitle>
          <CardDescription>
            {t("report.customHint")}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <CustomMetricsForm projectId={project.id} initialMetrics={customMetrics} />
        </CardContent>
      </Card>
    </div>
  );
}
