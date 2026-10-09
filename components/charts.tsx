"use client";

import { useMemo } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  ReferenceLine,
} from "recharts";
import { MonthPoint } from "@/lib/finance";
import { formatMoney } from "@/lib/utils";
import { useI18n } from "@/components/i18n-provider";

export function CashflowChart({ data, currency }: { data: MonthPoint[]; currency: string }) {
  const { t, locale } = useI18n();

  
  const formattedData = useMemo(() => {
    return data.map((point) => ({
      ...point,
      income: point.income,
      expense: point.expense,
      net: point.net,
      displayMonth: point.month,
    }));
  }, [data]);

  return (
    <ResponsiveContainer width="100%" height={350}>
      <BarChart data={formattedData} margin={{ top: 20, right: 0, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.3} />
        <XAxis
          dataKey="displayMonth"
          tickLine={false}
          axisLine={false}
          tickMargin={10}
          fontSize={12}
        />
        <YAxis
          tickLine={false}
          axisLine={false}
          tickMargin={10}
          fontSize={12}
          tickFormatter={(value) =>
            new Intl.NumberFormat("en-US", { notation: "compact", compactDisplay: "short" }).format(
              value
            )
          }
        />
        <Tooltip
          cursor={{ fill: "hsl(var(--muted))", opacity: 0.2 }}
          content={({ active, payload, label }) => {
            if (!active || !payload || !payload.length) return null;
            return (
              <div className="rounded-lg border bg-background p-3 shadow-md">
                <div className="mb-2 font-medium">{label}</div>
                <div className="flex flex-col gap-1">
                  {payload.map((entry: any) => (
                    <div key={entry.name} className="flex items-center justify-between gap-4">
                      <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
                        <div
                          className="h-2 w-2 rounded-full"
                          style={{ backgroundColor: entry.color }}
                        />
                        {entry.name === "income" ? t("chart.income") : entry.name === "expense" ? t("chart.expense") : entry.name}
                      </span>
                      <span className="font-medium text-sm">
                        {formatMoney(entry.value as number, locale, currency)}
                      </span>
                    </div>
                  ))}
                  <div className="mt-1 pt-1 border-t flex items-center justify-between gap-4">
                    <span className="text-sm font-medium">Net</span>
                    <span
                      className={`text-sm font-bold ${
                        payload[0].payload.net >= 0 ? "text-emerald-500" : "text-rose-500"
                      }`}
                    >
                      {formatMoney(payload[0].payload.net, locale, currency)}
                    </span>
                  </div>
                </div>
              </div>
            );
          }}
        />
        <Legend verticalAlign="top" height={36} iconType="circle" />
        <ReferenceLine y={0} stroke="hsl(var(--muted-foreground))" strokeDasharray="3 3" />
        <Bar dataKey="income" name="Income" fill="#10b981" radius={[4, 4, 0, 0]} maxBarSize={50} />
        <Bar dataKey="expense" name="Expense" fill="#f43f5e" radius={[4, 4, 0, 0]} maxBarSize={50} />
      </BarChart>
    </ResponsiveContainer>
  );
}
