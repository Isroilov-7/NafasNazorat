import { AlarmClock, ChevronRight, ClipboardList, Hourglass, Search, SearchX, TriangleAlert, Users, Wind } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { RiskBadge } from "@/components/clinical/risk-badge";
import { ReferralBadge, ReviewDue } from "@/components/clinical/status-badges";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { RISK_LEVELS, type RiskLevel } from "@/lib/clinical";
import { ageOn, todayInClinic } from "@/lib/domain/dates";
import { type PatientListItem, REFERRAL_STATUSES, type ReferralStatus } from "@/lib/domain/models";
import { formatDate } from "@/lib/format";
import { requireClinician } from "@/lib/server/auth/dal";
import { type PatientFilters, dashboardStats, listPatients } from "@/lib/server/repositories/patients";
import { cn } from "@/lib/utils";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("dashboard");
  return { title: t("title") };
}

function parseFilters(sp: Record<string, string | string[] | undefined>): PatientFilters {
  const one = (k: string) => (typeof sp[k] === "string" ? (sp[k] as string) : undefined);
  const risk = one("risk");
  const referral = one("referral");
  return {
    risk: risk === "none" || RISK_LEVELS.includes(risk as RiskLevel) ? (risk as PatientFilters["risk"]) : undefined,
    referral: REFERRAL_STATUSES.includes(referral as ReferralStatus) ? (referral as ReferralStatus) : undefined,
    q: one("q")?.slice(0, 80),
  };
}

export default async function DashboardPage({ searchParams }: PageProps<"/dashboard">) {
  await requireClinician();
  const t = await getTranslations();
  const sp = await searchParams;
  const filters = parseFilters(sp);
  const today = todayInClinic();
  const stats = dashboardStats(today);
  const patients = listPatients(filters);
  const filtered = Boolean(filters.risk || filters.referral || filters.q);

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{t("dashboard.title")}</h1>
          <p className="mt-1 text-muted-foreground">{t("dashboard.subtitle")}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" asChild>
            <Link href="/spirometry/new">
              <Wind /> {t("nav.spirometry")}
            </Link>
          </Button>
          <Button asChild>
            <Link href="/assessments/new">
              <ClipboardList /> {t("nav.newAssessment")}
            </Link>
          </Button>
        </div>
      </header>

      {sp.error === "forbidden" ? <Alert tone="warning">{t("errors.forbidden")}</Alert> : null}

      <dl className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile icon={Users} label={t("dashboard.stats.patients")} value={stats.patients} />
        <StatTile icon={TriangleAlert} label={t("dashboard.stats.high")} value={stats.high} tone={stats.high ? "high" : undefined} href="/dashboard?risk=high" />
        <StatTile icon={AlarmClock} label={t("dashboard.stats.overdue")} value={stats.overdue} tone={stats.overdue ? "medium" : undefined} />
        <StatTile icon={Hourglass} label={t("dashboard.stats.pendingReferrals")} value={stats.pendingReferrals} href="/dashboard?referral=recommended" />
      </dl>

      <Card>
        <form method="get" role="search" aria-label={t("dashboard.filters.title")} className="grid gap-3 border-b border-border p-4 sm:grid-cols-2 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_minmax(0,1fr)_auto]">
          <label className="relative block">
            <span className="sr-only">{t("dashboard.filters.search")}</span>
            <Search className="pointer-events-none absolute top-1/2 left-3 size-4.5 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
            <Input name="q" type="search" defaultValue={filters.q ?? ""} placeholder={t("dashboard.filters.search")} className="pl-10" />
          </label>
          <label>
            <span className="sr-only">{t("dashboard.filters.risk")}</span>
            <Select name="risk" defaultValue={filters.risk ?? ""} aria-label={t("dashboard.filters.risk")}>
              <option value="">{t("dashboard.filters.anyRisk")}</option>
              {(["high", "medium", "low"] as const).map((l) => (
                <option key={l} value={l}>
                  {t(`risk.levelLong.${l}`)}
                </option>
              ))}
              <option value="none">{t("dashboard.filters.notAssessed")}</option>
            </Select>
          </label>
          <label>
            <span className="sr-only">{t("dashboard.filters.referral")}</span>
            <Select name="referral" defaultValue={filters.referral ?? ""} aria-label={t("dashboard.filters.referral")}>
              <option value="">{t("dashboard.filters.anyReferral")}</option>
              {REFERRAL_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {t(`referral.statuses.${s}`)}
                </option>
              ))}
            </Select>
          </label>
          <div className="flex gap-2">
            <Button type="submit" className="flex-1 lg:flex-none">
              {t("dashboard.filters.apply")}
            </Button>
            {filtered ? (
              <Button variant="ghost" asChild>
                <Link href="/dashboard">{t("dashboard.filters.reset")}</Link>
              </Button>
            ) : null}
          </div>
        </form>

        {patients.length === 0 ? (
          filtered ? (
            <EmptyState icon={SearchX} title={t("dashboard.noMatches.title")} description={t("dashboard.noMatches.body")} action={<Button variant="outline" asChild><Link href="/dashboard">{t("dashboard.filters.reset")}</Link></Button>} />
          ) : (
            <EmptyState
              icon={Users}
              title={t("dashboard.empty.title")}
              description={t("dashboard.empty.body")}
              action={
                <Button asChild>
                  <Link href="/assessments/new">
                    <ClipboardList /> {t("dashboard.empty.action")}
                  </Link>
                </Button>
              }
            />
          )
        ) : (
          <>
            <p className="px-4 pt-3 text-sm text-muted-foreground" aria-live="polite">
              {t("dashboard.results", { count: patients.length })}
            </p>
            {/* Phone: stacked cards */}
            <ul className="flex flex-col divide-y divide-border md:hidden">
              {patients.map((p) => (
                <li key={p.id}>
                  <PatientCardRow p={p} today={today} />
                </li>
              ))}
            </ul>
            {/* Tablet / desktop: table */}
            <div className="hidden md:block">
              <Table>
                <TableCaption className="sr-only">{t("dashboard.table.caption")}</TableCaption>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead>{t("dashboard.table.patient")}</TableHead>
                    <TableHead>{t("dashboard.table.risk")}</TableHead>
                    <TableHead>{t("dashboard.table.referral")}</TableHead>
                    <TableHead className="hidden lg:table-cell">{t("dashboard.table.lastAssessment")}</TableHead>
                    <TableHead>{t("dashboard.table.nextReview")}</TableHead>
                    <TableHead>
                      <span className="sr-only">{t("dashboard.table.actions")}</span>
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {patients.map((p) => (
                    <TableRow key={p.id}>
                      <TableCell>
                        <Link href={`/patients/${p.id}`} className="font-medium text-foreground hover:text-primary hover:underline">
                          {p.fullName}
                        </Link>
                        <span className="block text-sm text-muted-foreground">
                          {t(`sex.${p.sex}`)} · {t("common.yearsOld", { age: ageOn(p.birthDate, today) })} · <span className="tabular">{p.pseudoId}</span>
                        </span>
                      </TableCell>
                      <TableCell>{p.lastRiskLevel ? <RiskBadge level={p.lastRiskLevel} size="sm" /> : <Badge size="sm">{t("dashboard.filters.notAssessed")}</Badge>}</TableCell>
                      <TableCell>
                        <ReferralBadge status={p.referralStatus} />
                      </TableCell>
                      <TableCell className="tabular hidden text-sm lg:table-cell">{formatDate(p.lastAssessedAt)}</TableCell>
                      <TableCell>
                        <ReviewDue date={p.nextReviewDate} today={today} />
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="icon" asChild>
                          <Link href={`/patients/${p.id}`} aria-label={`${t("dashboard.table.open")}: ${p.fullName}`}>
                            <ChevronRight className="size-5" />
                          </Link>
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </>
        )}
      </Card>
    </div>
  );
}

async function PatientCardRow({ p, today }: { p: PatientListItem; today: string }) {
  const t = await getTranslations();
  return (
    <Link href={`/patients/${p.id}`} className="flex items-center gap-3 px-4 py-4 hover:bg-surface-muted/60">
      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <div>
          <p className="truncate font-medium">{p.fullName}</p>
          <p className="text-sm text-muted-foreground">
            {t(`sex.${p.sex}`)} · {t("common.yearsOld", { age: ageOn(p.birthDate, today) })} · {p.pseudoId}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {p.lastRiskLevel ? <RiskBadge level={p.lastRiskLevel} size="sm" /> : <Badge size="sm">{t("dashboard.filters.notAssessed")}</Badge>}
          <ReferralBadge status={p.referralStatus} />
          <ReviewDue date={p.nextReviewDate} today={today} />
        </div>
      </div>
      <ChevronRight className="size-5 shrink-0 text-muted-foreground" aria-hidden="true" />
    </Link>
  );
}

function StatTile({
  icon: Icon,
  label,
  value,
  tone,
  href,
}: {
  icon: typeof Users;
  label: string;
  value: number;
  tone?: "high" | "medium";
  href?: string;
}) {
  const body = (
    <>
      <dt className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
        <Icon className={cn("size-4.5", tone === "high" ? "text-risk-high" : tone === "medium" ? "text-risk-medium" : "text-primary")} aria-hidden="true" />
        {label}
      </dt>
      <dd className="tabular text-metric text-foreground">{value}</dd>
    </>
  );
  const cls = cn(
    "flex flex-col gap-2 rounded-xl border bg-surface p-4 shadow-xs",
    tone === "high" ? "border-risk-high-border" : tone === "medium" ? "border-risk-medium-border" : "border-border",
  );
  return href ? (
    <Link href={href} className={cn(cls, "transition-colors hover:border-primary")}>
      {body}
    </Link>
  ) : (
    <div className={cls}>{body}</div>
  );
}
