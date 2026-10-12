"use client";

import { LogIn } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { useActionState } from "react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { type LoginState, loginAction } from "@/features/auth/actions";

export function LoginForm() {
  const t = useTranslations("auth");
  const params = useSearchParams();
  const [state, action, pending] = useActionState<LoginState, FormData>(loginAction, { error: null });
  return (
    <form action={action} className="flex flex-col gap-5" noValidate>
      {params.get("error") === "role" ? <Alert tone="warning">{t("roleNotAvailable")}</Alert> : null}
      {state.error ? (
        <Alert tone="danger">{state.error === "auth.rateLimited" ? t("rateLimited", { minutes: state.minutes ?? 15 }) : t("invalid")}</Alert>
      ) : null}
      <input type="hidden" name="next" value={params.get("next") ?? "/dashboard"} />
      <Field label={t("email")}>
        <Input name="email" type="email" autoComplete="username" inputMode="email" required defaultValue={state.email} autoFocus />
      </Field>
      <Field label={t("password")}>
        <Input name="password" type="password" autoComplete="current-password" required />
      </Field>
      <Button type="submit" size="lg" disabled={pending} className="w-full">
        <LogIn /> {pending ? t("submitting") : t("submit")}
      </Button>
      <p className="text-sm text-muted-foreground">{t("demoHint")}</p>
    </form>
  );
}
