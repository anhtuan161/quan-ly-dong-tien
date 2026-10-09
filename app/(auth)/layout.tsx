import { Wallet } from "lucide-react";
import { LanguageSwitcher } from "@/components/language-switcher";
import { getTranslator } from "@/lib/i18n/server";

export default async function AuthLayout({ children }: { children: React.ReactNode }) {
  const { t } = await getTranslator();
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center px-4 py-10">
      <div className="absolute top-4 right-4">
        <LanguageSwitcher />
      </div>
      <div className="mb-8 flex flex-col items-center gap-2 text-center">
        <div className="flex size-10 items-center justify-center rounded-lg bg-primary text-primary-foreground">
          <Wallet className="size-5" />
        </div>
        <h1 className="text-lg font-semibold">{t("app.name")}</h1>
        <p className="max-w-xs text-sm text-muted-foreground">{t("app.tagline")}</p>
      </div>
      <div className="w-full max-w-sm">{children}</div>
    </main>
  );
}
