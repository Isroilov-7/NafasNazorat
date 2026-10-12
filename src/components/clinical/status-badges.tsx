import { AlarmClock, CalendarCheck, CalendarClock, CheckCircle2, CircleDashed, Hourglass, Send, XCircle } from "lucide-react";
import { useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge";
import { type ReviewState, reviewState } from "@/lib/domain/dates";
import type { ReferralStatus } from "@/lib/domain/models";
import { formatDate } from "@/lib/format";

const REFERRAL = {
  none: { tone: "neutral", icon: CircleDashed },
  recommended: { tone: "medium", icon: Hourglass },
  referred: { tone: "info", icon: Send },
  completed: { tone: "low", icon: CheckCircle2 },
  declined: { tone: "neutral", icon: XCircle },
} as const;

/** Referral status — icon + text (never colour alone). */
export function ReferralBadge({ status, size = "sm" }: { status: ReferralStatus; size?: "sm" | "md" }) {
  const t = useTranslations("referral.statuses");
  const { tone, icon: Icon } = REFERRAL[status];
  return (
    <Badge tone={tone} size={size}>
      <Icon aria-hidden="true" />
      {t(status)}
    </Badge>
  );
}

/** Next-review reminder: overdue / due soon / scheduled / none. */
export function ReviewDue({ date, today, size = "sm" }: { date: string | null; today: string; size?: "sm" | "md" }) {
  const t = useTranslations("referral");
  const state: ReviewState = reviewState(date, today);
  if (state === "none") return <span className="text-sm text-muted-foreground">{t("noReview")}</span>;
  if (state === "overdue")
    return (
      <Badge tone="high" size={size}>
        <AlarmClock aria-hidden="true" />
        {t("overdue", { date: formatDate(date) })}
      </Badge>
    );
  if (state === "dueSoon")
    return (
      <Badge tone="medium" size={size}>
        <CalendarClock aria-hidden="true" />
        {t("dueSoon", { date: formatDate(date) })}
      </Badge>
    );
  return (
    <span className="tabular inline-flex items-center gap-1.5 text-sm text-foreground">
      <CalendarCheck className="size-4 text-muted-foreground" aria-hidden="true" />
      {formatDate(date)}
    </span>
  );
}
