import { getMonthlySummary, getMyProjects } from "@/lib/data";
import { computeFinance } from "@/lib/finance";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatMoney } from "@/lib/utils";
import { CashflowChart } from "@/components/charts";
import { TrendingUp, TrendingDown, Target, Wallet, Activity } from "lucide-react";

import { getTranslator } from "@/lib/i18n/server";

export const metadata = {
  title: "Dashboard",
};

export default async function DashboardPage() {
  const { locale } = await getTranslator();
  const projects = await getMyProjects();
  
  if (projects.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] text-center space-y-4">
        <h1 className="text-2xl font-semibold tracking-tight">Welcome to Quan Ly Dong Tien</h1>
        <p className="text-muted-foreground">Create a project in the sidebar to get started.</p>
      </div>
    );
  }

  const projectIds = projects.map((p) => p.id);
  const rows = await getMonthlySummary(projectIds);
  
  // Aggregate stats across all projects
  const totalInvestment = projects.reduce((sum, p) => sum + p.initial_investment, 0);
  const finance = computeFinance(rows, totalInvestment);
  
  // Display currency: Use the first project's currency as a fallback
  const currency = projects[0]?.settings?.currency || "VND";

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Global Dashboard</h1>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Initial Investment</CardTitle>
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
              {finance.breakEven.status === 'projected' && `~${finance.breakEven.months} mos`}
              {finance.breakEven.status === 'unreachable' && 'Unreachable'}
              {finance.breakEven.status === 'nodata' && 'No data'}
            </div>
            {finance.breakEven.status === 'projected' && (
              <p className="text-xs text-muted-foreground mt-1">Est. {finance.breakEven.month}</p>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-1">
        <Card className="col-span-1">
          <CardHeader>
            <CardTitle>Monthly Cashflow</CardTitle>
          </CardHeader>
          <CardContent className="pl-2">
            <CashflowChart data={finance.monthly} currency={currency} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
