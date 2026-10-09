"use client";

import { Languages } from "lucide-react";
import { useI18n } from "@/components/i18n-provider";
import { cn } from "@/lib/utils";

export function LanguageSwitcher({ className }: { className?: string }) {
  const { locale, setLocale, isSwitching, t } = useI18n();
  return (
    <div
      role="group"
      aria-label={t("common.language")}
      className={cn("inline-flex items-center gap-1 rounded-md border bg-background p-0.5 text-xs", isSwitching && "opacity-60", className)}
    >
      <Languages className="ml-1 size-3.5 text-muted-foreground" aria-hidden />
      {(["vi", "en"] as const).map((l) => (
        <button
          key={l}
          type="button"
          onClick={() => l !== locale && setLocale(l)}
          aria-pressed={l === locale}
          className={cn(
            "rounded px-2 py-1 font-medium uppercase transition-colors",
            l === locale ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground",
          )}
        >
          {l}
        </button>
      ))}
    </div>
  );
}
