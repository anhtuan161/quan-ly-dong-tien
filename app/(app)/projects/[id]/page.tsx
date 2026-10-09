import { notFound } from "next/navigation";
import { getProject, getMonthlySummary, getRecentTransactions, projectCurrency } from "@/lib/data";
import { computeFinance } from "@/lib/finance";
import { buildScope, getCustomMetrics, evaluateMetrics } from "@/lib/formulas";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatMoney } from "@/lib/utils";
import { CashflowChart } from "@/components/charts";
import { TrendingUp, TrendingDown, Target, Wallet, Activity, Settings2 } from "lucide-react";
import { getTranslator } from "@/lib/i18n/server";
import { CustomMetricsForm } from "@/components/custom-metrics-form";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const project = await getProject(id);
  return { title: project?.name || "Project" };
}

export default async function ProjectDashboard({ params }: { params: Promise<{ id: string }> }) {
  const { t, locale } = await getTranslator();
  const { id } = await params;
  const project = await getProject(id);
  if (!project) notFound();

  const [rows, recentTxns] = await Promise.all([
    getMonthlySummary([id]),
    getRecentTransactions([id], 10),
  ]);

  const currency = projectCurrency(project.settings);
  const finance = computeFinance(rows, project.initial_investment);

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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{project.name}</h1>
          <p className="text-muted-foreground mt-1">{t("nav.dashboard")}</p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t("kpi.investment")}</CardTitle>
            <Wallet className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatMoney(finance.initialInvestment, locale, currency)}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t("kpi.revenue")}</CardTitle>
            <TrendingUp className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-500">{formatMoney(finance.totalIncome, locale, currency)}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t("kpi.burn")}</CardTitle>
            <TrendingDown className="h-4 w-4 text-rose-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-rose-500">{formatMoney(finance.totalExpense, locale, currency)}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t("kpi.net")}</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${finance.netCashflow >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
              {formatMoney(finance.netCashflow, locale, currency)}
            </div>
            {finance.roi !== null && (
              <p className="text-xs text-muted-foreground mt-1">
                {t("kpi.roi")}: {(finance.roi * 100).toFixed(2)}%
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t("kpi.breakEven")}</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {finance.breakEven.status === 'reached' && t("kpi.reached")}
              {finance.breakEven.status === 'projected' && t("kpi.inMonths", { months: finance.breakEven.months! })}
              {finance.breakEven.status === 'unreachable' && t("kpi.notReachable")}
              {finance.breakEven.status === 'nodata' && t("kpi.noData")}
            </div>
            {finance.breakEven.status === 'projected' && (
              <p className="text-xs text-muted-foreground mt-1">{t("kpi.eta", { date: finance.breakEven.month! })}</p>
            )}
            {finance.breakEven.status === 'reached' && (
              <p className="text-xs text-muted-foreground mt-1">{t("kpi.reachedOn", { date: finance.breakEven.month! })}</p>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-7 lg:grid-cols-3">
        <Card className="md:col-span-4 lg:col-span-2">
          <CardHeader>
            <CardTitle>{t("chart.monthly")}</CardTitle>
          </CardHeader>
          <CardContent className="pl-2">
            <CashflowChart data={finance.monthly} currency={currency} />
          </CardContent>
        </Card>

        <Card className="md:col-span-3 lg:col-span-1">
          <CardHeader>
            <CardTitle>{t("dash.recent")}</CardTitle>
          </CardHeader>
          <CardContent>
            {recentTxns.length === 0 ? (
              <p className="text-sm text-muted-foreground">{t("txn.none")}</p>
            ) : (
              <div className="space-y-4">
                {recentTxns.map((txn) => (
                  <div key={txn.id} className="flex items-center justify-between border-b pb-2 last:border-0 last:pb-0">
                    <div>
                      <p className="text-sm font-medium">
                        {txn.type === "INCOME" ? (
                          <span className="text-emerald-500">{t("chart.income")}</span>
                        ) : (
                          <span className="text-rose-500">{t("chart.expense")}</span>
                        )}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {txn.date} {txn.note && `- ${txn.note}`}
                      </p>
                    </div>
                    <div className={`font-medium ${txn.type === "INCOME" ? 'text-emerald-500' : 'text-rose-500'}`}>
                      {txn.type === "INCOME" ? "+" : "-"}{formatMoney(txn.amount, locale, currency)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings2 className="h-5 w-5" /> {t("report.customMetrics")}
          </CardTitle>
          <CardDescription>{t("report.customHint")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {results.length > 0 && (
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
                    <TableCell className="text-right font-bold text-lg">
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

          <details className="w-full border rounded-md px-4 group mt-6">
            <summary className="list-none cursor-pointer py-4 font-medium text-sm flex items-center justify-between">
              {t("metric.edit")} / {t("metric.add")}
              <span className="text-muted-foreground group-open:rotate-180 transition-transform">▼</span>
            </summary>
            <div className="pt-2 pb-6 border-t mt-2">
              <CustomMetricsForm projectId={project.id} initialMetrics={customMetrics} />
            </div>
          </details>
        </CardContent>
      </Card>
    </div>
  );
}
