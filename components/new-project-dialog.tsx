"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Loader2, Plus } from "lucide-react";
import { toast } from "sonner";
import { createProject } from "@/lib/actions";
import { CURRENCIES } from "@/lib/validation";
import { useI18n } from "@/components/i18n-provider";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { parseAmount } from "@/lib/amount";

export function NewProjectDialog({ trigger }: { trigger?: React.ReactNode }) {
  const { t } = useI18n();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [currency, setCurrency] = useState<string>("VND");

  function onSubmit(formData: FormData) {
    const investment = parseAmount(String(formData.get("initial_investment") ?? "0"), currency) ?? 0;
    startTransition(async () => {
      const res = await createProject({
        name: formData.get("name"),
        initial_investment: investment,
        currency,
      });
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success(t("project.created"));
      setOpen(false);
      if (res.data) router.push(`/projects/${res.data.id}`);
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button variant="ghost" size="icon-sm" aria-label={t("nav.newProject")} title={t("nav.newProject")}>
            <Plus />
          </Button>
        )}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("nav.newProject")}</DialogTitle>
          <DialogDescription>{t("dash.emptyText")}</DialogDescription>
        </DialogHeader>
        <form action={onSubmit} className="grid gap-4">
          <div className="grid gap-1.5">
            <Label htmlFor="np-name" className="text-xs text-muted-foreground">{t("project.name")}</Label>
            <Input id="np-name" name="name" required maxLength={120} autoFocus />
          </div>
          <div className="grid grid-cols-[1fr_7rem] gap-3">
            <div className="grid gap-1.5">
              <Label htmlFor="np-inv" className="text-xs text-muted-foreground">{t("project.initialInvestment")}</Label>
              <Input id="np-inv" name="initial_investment" inputMode="decimal" placeholder="500tr / 20000" />
            </div>
            <div className="grid gap-1.5">
              <Label className="text-xs text-muted-foreground">{t("project.currency")}</Label>
              <Select value={currency} onValueChange={setCurrency}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CURRENCIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <Button type="submit" disabled={pending}>
            {pending && <Loader2 className="animate-spin" />}
            {t("project.create")}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
