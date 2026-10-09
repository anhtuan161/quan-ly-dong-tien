import { notFound } from "next/navigation";
import { getProject, getMonthlySummary, getCategories, projectCurrency } from "@/lib/data";
import { computeFinance, totalsByCategory } from "@/lib/finance";
import { buildScope, getCustomMetrics, evaluateMetrics } from "@/lib/formulas";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatMoney } from "@/lib/utils";
import { getTranslator } from "@/lib/i18n/server";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const project = await getProject(id);
  return { title: project ? `${project.name} - Report` : "Report" };
}

export default async function ProjectReport({ params }: { params: Promise<{ id: string }> }) {
  const { t, locale } = await getTranslator();
  const { id } = await params;
  const project = await getProject(id);
  if (!project) notFound();

  const [rows, allCategories] = await Promise.all([
    getMonthlySummary([id]),
    getCategories([id]),
  ]);

  const currency = projectCurrency(project.settings);
  const finance = computeFinance(rows, project.initial_investment);
  
  const incomeTotals = totalsByCategory(rows, "INCOME");
  const expenseTotals = totalsByCategory(rows, "EXPENSE");
  
  const categoryMap = new Map(allCategories.map(c => [c.id, c.name]));
  const getCatName = (id: string | null) => (id && categoryMap.get(id)) || t("txn.noCategory");

  // Formulas
  const scope = buildScope(finance);
  const customMetrics = getCustomMetrics(project.settings);
  const results = evaluateMetrics(customMetrics, scope);

  const formatValue = (value: number | null, format?: string) => {
    if (value === null) return "-";
    if (format === "percent") return `${(value * 100).toFixed(2)}%`;
    if (format === "currency") return formatMoney(value, locale, currency);
    return new Intl.NumberFormat(locale === "vi" ? "vi-VN" : "en-US").format(value);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">{t("report.title")}</h1>
        <p className="text-muted-foreground mt-1">{project.name}</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>{t("report.revenue")}</CardTitle>
          </CardHeader>
          <CardContent>
            {incomeTotals.length === 0 ? (
              <p className="text-sm text-muted-foreground">{t("txn.none")}</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("txn.category")}</TableHead>
                    <TableHead className="text-right">{t("common.total")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {incomeTotals.map((item) => (
                    <TableRow key={item.categoryId || "null"}>
                      <TableCell className="font-medium">{getCatName(item.categoryId)}</TableCell>
                      <TableCell className="text-right font-bold text-emerald-500">
                        {formatMoney(item.total, locale, currency)}
                      </TableCell>
                    </TableRow>
                  ))}
                  <TableRow>
                    <TableCell className="font-bold">{t("report.totalRevenue")}</TableCell>
                    <TableCell className="text-right font-bold text-emerald-500">
                      {formatMoney(finance.totalIncome, locale, currency)}
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t("report.expenses")}</CardTitle>
          </CardHeader>
          <CardContent>
            {expenseTotals.length === 0 ? (
              <p className="text-sm text-muted-foreground">{t("txn.none")}</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("txn.category")}</TableHead>
                    <TableHead className="text-right">{t("common.total")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {expenseTotals.map((item) => (
                    <TableRow key={item.categoryId || "null"}>
                      <TableCell className="font-medium">{getCatName(item.categoryId)}</TableCell>
                      <TableCell className="text-right font-bold text-rose-500">
                        {formatMoney(item.total, locale, currency)}
                      </TableCell>
                    </TableRow>
                  ))}
                  <TableRow>
                    <TableCell className="font-bold">{t("report.totalExpenses")}</TableCell>
                    <TableCell className="text-right font-bold text-rose-500">
                      {formatMoney(finance.totalExpense, locale, currency)}
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t("report.customMetrics")}</CardTitle>
        </CardHeader>
        <CardContent>
          {results.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t("report.noMetrics")}</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("metric.label")}</TableHead>
                  <TableHead>{t("metric.key")}</TableHead>
                  <TableHead>{t("metric.formula")}</TableHead>
                  <TableHead className="text-right">{t("common.total")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {results.map((metric) => (
                  <TableRow key={metric.key}>
                    <TableCell className="font-medium">{metric.label || metric.key}</TableCell>
                    <TableCell className="text-muted-foreground text-sm font-mono">{metric.key}</TableCell>
                    <TableCell className="text-muted-foreground text-sm font-mono">{metric.formula}</TableCell>
                    <TableCell className="text-right font-bold">
                      {metric.error ? (
                        <span className="text-destructive text-sm" title={metric.error}>{t("report.error")}</span>
                      ) : (
                        formatValue(metric.value, metric.format)
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
