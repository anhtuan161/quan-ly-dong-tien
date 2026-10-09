"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { BarChart3, FileText, FolderKanban, LayoutDashboard, LogOut, Menu, Settings, Wallet, X } from "lucide-react";
import { signOut } from "@/app/(auth)/actions";
import { useI18n } from "@/components/i18n-provider";
import { LanguageSwitcher } from "@/components/language-switcher";
import { NewProjectDialog } from "@/components/new-project-dialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { MemberRole } from "@/lib/types";

export type NavProject = { id: string; name: string; role: MemberRole; currency: string };

export function Sidebar({ projects, email }: { projects: NavProject[]; email: string }) {
  const { t } = useI18n();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  useEffect(() => setOpen(false), [pathname]);

  const link = (href: string, active: boolean) =>
    cn(
      "flex items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors",
      active ? "bg-accent font-medium text-foreground" : "text-muted-foreground hover:bg-accent/60 hover:text-foreground",
    );

  const content = (
    <div className="flex h-full flex-col gap-4 p-3">
      <Link href="/dashboard" className="flex items-center gap-2 px-2 pt-1">
        <span className="flex size-7 items-center justify-center rounded-md bg-primary text-primary-foreground">
          <Wallet className="size-4" />
        </span>
        <span className="text-sm font-semibold">{t("app.name")}</span>
      </Link>

      <nav className="grid gap-0.5">
        <Link href="/dashboard" className={link("/dashboard", pathname === "/dashboard")}>
          <LayoutDashboard className="size-4" /> {t("nav.overview")}
        </Link>
      </nav>

      <div className="flex min-h-0 flex-1 flex-col gap-1">
        <div className="flex items-center justify-between px-2">
          <span className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">{t("nav.projects")}</span>
          <NewProjectDialog />
        </div>
        <nav className="grid gap-0.5 overflow-y-auto">
          {projects.length === 0 && <p className="px-2 py-1.5 text-xs text-muted-foreground">{t("nav.noProjects")}</p>}
          {projects.map((p) => {
            const base = `/projects/${p.id}`;
            const inProject = pathname.startsWith(base);
            return (
              <div key={p.id}>
                <Link href={base} className={link(base, inProject && pathname === base)}>
                  <FolderKanban className="size-4 shrink-0" />
                  <span className="truncate">{p.name}</span>
                </Link>
                {inProject && (
                  <div className="ml-4 grid gap-0.5 border-l py-0.5 pl-2">
                    <Link href={base} className={link(base, pathname === base)}>
                      <BarChart3 className="size-3.5" /> {t("nav.dashboard")}
                    </Link>
                    <Link href={`${base}/report`} className={link(`${base}/report`, pathname === `${base}/report`)}>
                      <FileText className="size-3.5" /> {t("nav.report")}
                    </Link>
                    <Link href={`${base}/settings`} className={link(`${base}/settings`, pathname === `${base}/settings`)}>
                      <Settings className="size-3.5" /> {t("nav.settings")}
                    </Link>
                  </div>
                )}
              </div>
            );
          })}
        </nav>
      </div>

      <div className="grid gap-2 border-t pt-3">
        <LanguageSwitcher className="w-fit" />
        <div className="flex items-center justify-between gap-2 px-1">
          <span className="truncate text-xs text-muted-foreground" title={email}>{email}</span>
          <form action={signOut}>
            <Button type="submit" variant="ghost" size="icon-sm" title={t("auth.logout")} aria-label={t("auth.logout")}>
              <LogOut />
            </Button>
          </form>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile top bar */}
      <div className="fixed inset-x-0 top-0 z-30 flex h-12 items-center gap-2 border-b bg-background/90 px-3 backdrop-blur md:hidden">
        <Button variant="ghost" size="icon-sm" onClick={() => setOpen(true)} aria-label="Menu">
          <Menu />
        </Button>
        <span className="text-sm font-semibold">{t("app.name")}</span>
      </div>

      {/* Mobile drawer */}
      {open && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div className="absolute inset-0 bg-black/40" onClick={() => setOpen(false)} />
          <aside className="absolute inset-y-0 left-0 w-64 border-r bg-background">
            <Button variant="ghost" size="icon-sm" className="absolute top-3 right-2" onClick={() => setOpen(false)} aria-label="Close">
              <X />
            </Button>
            {content}
          </aside>
        </div>
      )}

      {/* Desktop */}
      <aside className="sticky top-0 hidden h-dvh w-60 shrink-0 border-r bg-background md:block">{content}</aside>
    </>
  );
}
