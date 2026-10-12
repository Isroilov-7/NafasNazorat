import { ShieldAlert } from "lucide-react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";

/**
 * Persistent "decision support, not a diagnosis" notice. Shown prominently on
 * every result screen (risk + spirometry), not buried in a footer.
 */
export function SafetyNotice({ variant = "full", className }: { variant?: "full" | "compact"; className?: string }) {
  const t = useTranslations("safety");
  if (variant === "compact") {
    return (
      <p className={cn("flex items-center gap-2 text-sm text-muted-foreground", className)}>
        <ShieldAlert className="size-4 shrink-0 text-info" aria-hidden="true" />
        {t("short")}
      </p>
    );
  }
  return (
    <aside
      aria-label={t("title")}
      className={cn("flex gap-3 rounded-lg border border-info-border bg-info-bg p-4 text-[0.9375rem]", className)}
    >
      <ShieldAlert className="mt-0.5 size-5 shrink-0 text-info" aria-hidden="true" />
      <div>
        <p className="font-semibold text-foreground">{t("title")}</p>
        <p className="mt-1 text-foreground/90">{t("body")}</p>
      </div>
    </aside>
  );
}
