import { CalendarClock, Info, ListChecks, Stethoscope } from "lucide-react";
import { useFormatter, useTranslations } from "next-intl";
import type { RiskContribution, RiskResult } from "@/lib/clinical";
import { Alert } from "@/components/ui/alert";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import { RiskBadge } from "./risk-badge";
import { SafetyNotice } from "./safety-notice";

/** Human-readable phrase for one driver, e.g. "40 quti-yil chekish". */
export function useDriverPhrase() {
  const t = useTranslations("risk.drivers");
  const format = useFormatter();
  return (c: RiskContribution): string => {
    const v = c.value;
    switch (c.factor) {
      case "packYears":
        return typeof v === "number" ? t("packYears", { value: format.number(v, "one") }) : t("packYearsUnknown");
      case "biomassYears":
        return typeof v === "number" ? t("biomassYears", { value: v }) : t("biomassYearsUnknown");
      case "occupationalYears":
        return typeof v === "number" ? t("occupationalYears", { value: v }) : t("occupationalYearsUnknown");
      case "ageYears":
      case "mmrc":
      case "catTotal":
        return t(c.factor, { value: String(v ?? "—") });
      default:
        return t(c.factor);
    }
  };
}

/** One-line "why": top drivers → level. */
export function RiskExplanation({ result, className }: { result: RiskResult; className?: string }) {
  const t = useTranslations("risk");
  const phrase = useDriverPhrase();
  const top = result.drivers.slice(0, 3);
  if (top.length === 0) return <p className={className}>{t("noDrivers")}</p>;
  const drivers = top.map(phrase).join(t("driverJoin"));
  return (
    <p className={className}>
      {t("explanation", { drivers: drivers.charAt(0).toUpperCase() + drivers.slice(1), level: t(`levelLong.${result.level}`).toLowerCase() })}
    </p>
  );
}

interface RiskResultPanelProps {
  result: RiskResult;
  /** ISO date of the suggested next review (shown when known). */
  nextReviewDate?: string | null;
  className?: string;
}

/**
 * Full, explainable result: likelihood (colour + icon + text), the "why",
 * referral recommendation, rules applied, missing data, per-factor points,
 * and the persistent "not a diagnosis" notice.
 */
export function RiskResultPanel({ result, nextReviewDate, className }: RiskResultPanelProps) {
  const t = useTranslations();
  const phrase = useDriverPhrase();
  const rec = result.recommendation;

  return (
    <div className={cn("flex flex-col gap-4", className)}>
      <SafetyNotice />

      <Card
        className={cn(
          "border-2",
          result.level === "high" && "border-risk-high-border",
          result.level === "medium" && "border-risk-medium-border",
          result.level === "low" && "border-risk-low-border",
        )}
      >
        <CardContent className="flex flex-col gap-4">
          <p className="text-sm font-medium text-muted-foreground">{t("risk.question")}</p>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
            <RiskBadge level={result.level} size="lg" variant="long" className="px-4 py-2 text-lg" />
            <span className="tabular text-sm text-muted-foreground">{t("risk.score", { score: result.score, max: result.maxScore })}</span>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-foreground">{t("risk.why")}</h3>
            <RiskExplanation result={result} className="mt-1 text-lg font-semibold text-foreground" />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="flex gap-4">
          <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-primary-soft text-primary-soft-foreground">
            <Stethoscope className="size-5" aria-hidden="true" />
          </span>
          <div className="flex min-w-0 flex-col gap-1">
            <p className="text-sm font-medium text-muted-foreground">{t("risk.recommendation.title")}</p>
            <p className="text-lg font-semibold">{t(`risk.recommendation.${rec}.title`)}</p>
            <p className="text-[0.9375rem] text-foreground/90">{t(`risk.recommendation.${rec}.body`)}</p>
            <p className="mt-1 flex items-center gap-2 text-sm font-medium text-foreground">
              <CalendarClock className="size-4 text-primary" aria-hidden="true" />
              {nextReviewDate
                ? t("risk.recommendation.review", { date: formatDate(nextReviewDate) })
                : t("risk.recommendation.reviewInMonths", { months: result.reviewInMonths })}
            </p>
          </div>
        </CardContent>
      </Card>

      {result.triggeredRules.length > 0 ? (
        <Alert tone="info" icon={ListChecks} title={t("risk.rules.title")}>
          <ul className="flex flex-col gap-1">
            {result.triggeredRules.map((id) => (
              <li key={id}>{t.has(`risk.rules.${id}` as never) ? t(`risk.rules.${id}` as never) : id}</li>
            ))}
          </ul>
        </Alert>
      ) : null}

      {result.missing.length > 0 ? (
        <Alert tone="warning" title={t("risk.missing.title")}>
          {t("risk.missing.body", { fields: result.missing.map((f) => t(`risk.factorNames.${f}`)).join(", ") })}
        </Alert>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("assessment.result.contributions")}</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="flex flex-col gap-3">
            {result.contributions.map((c) => (
              <li key={c.factor} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-1 sm:grid-cols-[12rem_minmax(0,1fr)_5rem]">
                <span className={cn("text-[0.9375rem]", c.points > 0 ? "font-medium text-foreground" : "text-muted-foreground")}>
                  {t(`risk.factorNames.${c.factor}`)}
                  {c.points > 0 ? <span className="block text-sm font-normal text-muted-foreground">{phrase(c)}</span> : null}
                </span>
                <span className="tabular text-right text-sm text-muted-foreground sm:order-last">
                  {c.points} / {c.maxPoints}
                </span>
                <span className="col-span-2 h-2 overflow-hidden rounded-full bg-surface-muted sm:col-span-1" aria-hidden="true">
                  <span
                    className={cn("block h-full rounded-full", c.points > 0 ? "bg-primary" : "bg-transparent")}
                    style={{ width: `${c.maxPoints ? (c.points / c.maxPoints) * 100 : 0}%` }}
                  />
                </span>
              </li>
            ))}
          </ul>
          <p className="mt-4 flex items-start gap-2 text-sm text-muted-foreground">
            <Info className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
            {t("safety.provisionalModel", { version: result.configVersion })}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

