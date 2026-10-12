import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";

/** Wordmark + mark (stylised lungs / breath wave). Decorative SVG; name is real text. */
export function Logo({ className, compact = false }: { className?: string; compact?: boolean }) {
  const t = useTranslations("app");
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <svg viewBox="0 0 32 32" className="size-8 shrink-0" aria-hidden="true">
        <rect width="32" height="32" rx="8" className="fill-primary" />
        <path d="M5 17c3 0 3-5 6-5s3 9 6 9 3-12 6-12 3 8 4 8" fill="none" stroke="white" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      {compact ? null : (
        <span className="flex flex-col leading-none">
          <span className="text-[1.0625rem] font-bold tracking-tight text-foreground">{t("name")}</span>
        </span>
      )}
    </span>
  );
}
