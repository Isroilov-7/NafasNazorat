"use client";

import { UserPlus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { createUserAction } from "./actions";

export function NewUserForm() {
  const t = useTranslations();
  const router = useRouter();
  const [pending, start] = useTransition();
  const [errors, setErrors] = useState<Record<string, string>>({});
  const e = (k: string) => (errors[k] ? t(errors[k] as never) : undefined);

  function submit(ev: React.FormEvent<HTMLFormElement>) {
    ev.preventDefault();
    const form = ev.currentTarget;
    const fd = new FormData(form);
    start(async () => {
      const res = await createUserAction({
        name: String(fd.get("name") ?? ""),
        email: String(fd.get("email") ?? ""),
        role: String(fd.get("role") ?? "doctor"),
        password: String(fd.get("password") ?? ""),
      });
      if (res.ok) {
        toast.success(t("admin.created"));
        form.reset();
        setErrors({});
        router.refresh();
      } else {
        setErrors(res.fieldErrors ?? {});
        toast.error(t(res.error as never));
      }
    });
  }

  return (
    <form onSubmit={submit} className="grid gap-4 md:grid-cols-2" noValidate>
      <Field label={t("admin.name")} error={e("name")} required>
        <Input name="name" autoComplete="off" />
      </Field>
      <Field label={t("auth.email")} error={e("email")} required>
        <Input name="email" type="email" autoComplete="off" />
      </Field>
      <Field label={t("admin.role")}>
        <Select name="role" defaultValue="doctor">
          <option value="doctor">{t("roles.doctor")}</option>
          <option value="admin">{t("roles.admin")}</option>
        </Select>
      </Field>
      <Field label={t("auth.password")} hint={t("admin.passwordHint")} error={e("password")} required>
        <Input name="password" type="password" autoComplete="new-password" minLength={10} />
      </Field>
      <Button type="submit" disabled={pending} className="md:col-span-2 md:justify-self-start">
        <UserPlus /> {pending ? t("common.saving") : t("admin.addUser")}
      </Button>
    </form>
  );
}
