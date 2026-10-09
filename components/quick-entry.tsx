"use client";

import { useState, useTransition } from "react";
import { PlusIcon } from "lucide-react";
import { useI18n } from "@/components/i18n-provider";
import { createTransaction } from "@/lib/actions";
import { parseAmount } from "@/lib/amount";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatMoney } from "@/lib/utils";

type ProjectNav = {
  id: string;
  name: string;
  currency: string;
};

type Category = {
  id: string;
  project_id: string;
  name: string;
  type: "INCOME" | "EXPENSE";
};

export function QuickEntry({
  projects,
  categories,
}: {
  projects: ProjectNav[];
  categories: Category[];
}) {
  const { t, locale } = useI18n();
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const [projectId, setProjectId] = useState(projects[0]?.id ?? "");
  const [type, setType] = useState<"INCOME" | "EXPENSE">("EXPENSE");
  const [date, setDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [amountRaw, setAmountRaw] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);

  const activeProject = projects.find((p) => p.id === projectId);
  const currency = activeProject?.currency || "VND";
  const parsedAmount = parseAmount(amountRaw, currency);

  const filteredCategories = categories.filter(
    (c) => c.project_id === projectId && c.type === type
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!parsedAmount || parsedAmount <= 0) {
      setError("Invalid amount");
      return;
    }

    startTransition(async () => {
      const result = await createTransaction({
        project_id: projectId,
        date,
        type,
        category_id: categoryId || undefined,
        amount: parsedAmount,
        note,
      });

      if (!result.ok) {
        setError(result.error || "Failed to create transaction");
      } else {
        setOpen(false);
        setAmountRaw("");
        setNote("");
        setError(null);
      }
    });
  };

  if (!projects.length) return null;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          size="icon"
          className="fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-lg md:bottom-8 md:right-8 z-50"
        >
          <PlusIcon className="h-6 w-6" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t("txn.add")}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 pt-4">
          {error && <div className="text-sm font-medium text-destructive">{error}</div>}

          {projects.length > 1 && (
            <div className="space-y-2">
              <Label>Project</Label>
              <Select value={projectId} onValueChange={setProjectId}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {projects.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Date</Label>
              <Input
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Type</Label>
              <Select
                value={type}
                onValueChange={(v) => {
                  setType(v as "INCOME" | "EXPENSE");
                  setCategoryId("");
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="EXPENSE">{t("txn.expense")}</SelectItem>
                  <SelectItem value="INCOME">{t("txn.income")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Category</Label>
            <Select value={categoryId} onValueChange={setCategoryId}>
              <SelectTrigger>
                <SelectValue placeholder="Select category..." />
              </SelectTrigger>
              <SelectContent>
                {filteredCategories.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Amount</Label>
            <Input
              type="text"
              required
              placeholder="e.g. 50k, 1.5tr"
              value={amountRaw}
              onChange={(e) => setAmountRaw(e.target.value)}
              autoComplete="off"
            />
            {parsedAmount !== null && amountRaw && (
              <p className="text-xs text-muted-foreground">
                = {formatMoney(parsedAmount, locale, currency)}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label>Note (optional)</Label>
            <Input
              value={note}
              onChange={(e) => setNote(e.target.value)}
              autoComplete="off"
            />
          </div>

          <Button type="submit" className="w-full" disabled={isPending || !parsedAmount}>
            {isPending ? "Saving..." : t("txn.save")}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
