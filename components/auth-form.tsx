"use client";

import Link from "next/link";
import { useActionState } from "react";
import { Loader2 } from "lucide-react";
import { signIn, signUp, type AuthState } from "@/app/(auth)/actions";
import { useI18n } from "@/components/i18n-provider";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function AuthForm({ mode, next }: { mode: "login" | "register"; next?: string }) {
  const { t } = useI18n();
  const [state, action, pending] = useActionState<AuthState, FormData>(mode === "login" ? signIn : signUp, {});
  const isLogin = mode === "login";

  return (
    <Card>
      <CardContent>
        <form action={action} className="grid gap-4">
          {next && <input type="hidden" name="next" value={next} />}
          <div className="grid gap-1.5">
            <Label htmlFor="email" className="text-xs text-muted-foreground">{t("auth.email")}</Label>
            <Input id="email" name="email" type="email" autoComplete="email" required autoFocus defaultValue={state.email} />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="password" className="text-xs text-muted-foreground">{t("auth.password")}</Label>
            <Input
              id="password"
              name="password"
              type="password"
              autoComplete={isLogin ? "current-password" : "new-password"}
              minLength={6}
              required
            />
          </div>

          {state.error && <p className="text-xs text-destructive" role="alert">{state.error}</p>}
          {state.message && <p className="rounded-md bg-muted p-2 text-xs" role="status">{state.message}</p>}

          <Button type="submit" disabled={pending}>
            {pending && <Loader2 className="animate-spin" />}
            {isLogin ? t("auth.login") : t("auth.register")}
          </Button>

          <p className="text-center text-xs text-muted-foreground">
            {isLogin ? t("auth.noAccount") : t("auth.haveAccount")}{" "}
            <Link href={isLogin ? "/register" : "/login"} className="font-medium text-foreground underline-offset-4 hover:underline">
              {isLogin ? t("auth.register") : t("auth.login")}
            </Link>
          </p>
        </form>
      </CardContent>
    </Card>
  );
}
