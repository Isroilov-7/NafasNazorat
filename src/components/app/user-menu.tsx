import { LogOut } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { logoutAction } from "@/features/auth/actions";
import type { User } from "@/lib/domain/models";

export async function UserMenu({ user }: { user: User }) {
  const t = await getTranslations();
  const initials = user.name
    .split(/\s+/)
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
  return (
    <div className="flex items-center gap-3">
      <span aria-hidden="true" className="flex size-9 items-center justify-center rounded-full bg-primary-soft text-sm font-semibold text-primary-soft-foreground">
        {initials}
      </span>
      <span className="flex min-w-0 flex-col leading-tight">
        <span className="truncate text-sm font-medium text-foreground">{user.name}</span>
        <span className="text-xs text-muted-foreground">{t(`roles.${user.role}`)}</span>
      </span>
      <form action={logoutAction} className="ml-auto">
        <button type="submit" className="flex size-11 items-center justify-center rounded-md text-muted-foreground hover:bg-surface-muted hover:text-foreground">
          <LogOut className="size-5" aria-hidden="true" />
          <span className="sr-only">{t("nav.logout")}</span>
        </button>
      </form>
    </div>
  );
}
