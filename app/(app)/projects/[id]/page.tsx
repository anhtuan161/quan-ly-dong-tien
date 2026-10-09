import { notFound } from "next/navigation";
import { getProject, getMonthlySummary, getRecentTransactions, projectCurrency } from "@/lib/data";
import { computeFinance } from "@/lib/finance";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatMoney } from "@/lib/utils";
import { CashflowChart } from "@/components/charts";
import { TrendingUp, TrendingDown, Target, Wallet, Activity, Receipt } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { getTranslator } from "@/lib/i18n/server";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const project = await getProject(id);
  return { title: project?.name || "Project" };
}

export default async function ProjectDashboard({ params }: { params: Promise<{ id: string }> }) {
  const { locale } = await getTranslator();
  const { id } = await params;
  const project = await getProject(id);
  if (!project) notFound();

  const [rows, recentTxns] = await Promise.all([
    getMonthlySummary([id]),
    getRecentTransactions([id], 10),
  ]);

  const currency = projectCurrency(project.settings);
  const finance = computeFinance(rows, project.initial_investment);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{project.name}</h1>
          <p className="text-muted-foreground mt-1">Project Dashboard</p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Initial Inv.</CardTitle>
            <Wallet className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatMoney(finance.initialInvestment, locale, currency)}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <TrendingUp className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-500">{formatMoney(finance.totalIncome, locale, currency)}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Burn</CardTitle>
            <TrendingDown className="h-4 w-4 text-rose-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-rose-500">{formatMoney(finance.totalExpense, locale, currency)}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Net Cashflow</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${finance.netCashflow >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
              {formatMoney(finance.netCashflow, locale, currency)}
            </div>
            {finance.roi !== null && (
              <p className="text-xs text-muted-foreground mt-1">
                ROI: {(finance.roi * 100).toFixed(2)}%
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Break-even</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {finance.breakEven.status === 'reached' && finance.breakEven.month}
              {finance.breakEven.status === 'projected' && `~${finance.breakEven.months}m`}
              {finance.breakEven.status === 'unreachable' && 'N/A'}
              {finance.breakEven.status === 'nodata' && '-'}
            </div>
            {finance.breakEven.status === 'projected' && (
              <p className="text-xs text-muted-foreground mt-1">Est. {finance.breakEven.month}</p>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-7 lg:grid-cols-3">
        <Card className="md:col-span-4 lg:col-span-2">
          <CardHeader>
            <CardTitle>Cashflow</CardTitle>
          </CardHeader>
          <CardContent className="pl-2">
            <CashflowChart data={finance.monthly} currency={currency} />
          </CardContent>
        </Card>

        <Card className="md:col-span-3 lg:col-span-1">
          <CardHeader>
            <CardTitle>Recent Transactions</CardTitle>
          </CardHeader>
          <CardContent>
            {recentTxns.length === 0 ? (
              <p className="text-sm text-muted-foreground">No transactions yet.</p>
            ) : (
              <div className="space-y-4">
                {recentTxns.map((txn) => (
                  <div key={txn.id} className="flex items-center justify-between border-b pb-2 last:border-0 last:pb-0">
                    <div>
                      <p className="text-sm font-medium">
                        {txn.type === "INCOME" ? (
                          <span className="text-emerald-500">Income</span>
                        ) : (
                          <span className="text-rose-500">Expense</span>
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
    </div>
  );
}
