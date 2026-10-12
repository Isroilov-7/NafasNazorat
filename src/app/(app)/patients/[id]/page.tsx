import { ClipboardList, FileClock, History, ShieldCheck, ShieldOff, UserRound, Wind } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { RiskExplanation } from "@/components/clinical/risk-result";
import { RiskBadge } from "@/components/clinical/risk-badge";
import { ReferralBadge, ReviewDue } from "@/components/clinical/status-badges";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { FollowUpForm } from "@/features/patients/follow-up-form";
import { RiskTrendChart } from "@/features/patients/risk-trend-chart";
import { DEFAULT_RISK_CONFIG } from "@/lib/clinical";
import { ageOn, todayInClinic } from "@/lib/domain/dates";
import { formatDate, formatDateTime, formatDecimal } from "@/lib/format";
import { requireClinician } from "@/lib/server/auth/dal";
import { listAssessments } from "@/lib/server/repositories/assessments";
import { listAuditForPatient } from "@/lib/server/repositories/audit";
import { getPatient } from "@/lib/server/repositories/patients";
import { listSpirometry } from "@/lib/server/repositories/spirometry";
import { userNames } from "@/lib/server/repositories/users";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("patient");
  return { title: t("title") }; // never put the patient's name in the <title> (history, screenshots)
}

export default async function PatientPage({ params }: PageProps<"/patients/[id]">) {
  await requireClinician();
  const { id } = await params;
  const patient = getPatient(id);
  if (!patient) notFound();
  const t = await getTranslations();
  const today = todayInClinic();
  const assessments = listAssessments(id);
  const spirometry = listSpirometry(id);
  const audit = listAuditForPatient(id, 8);
  const names = userNames();
  const latest = assessments.at(-1);
  const age = ageOn(patient.birthDate, today);

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <header className="flex flex-col gap-4 rounded-xl border border-border bg-surface p-5 shadow-sm sm:p-6 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-start gap-4">
          <span className="flex size-12 shrink-0 items-center justify-center rounded-full bg-primary-soft text-primary-soft-foreground">
            <UserRound className="size-6" aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <p className="text-sm font-medium text-muted-foreground">{t("patient.title")}</p>
            <h1 className="text-2xl font-bold tracking-tight">{patient.fullName}</h1>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <Badge size="sm">{t(`sex.${patient.sex}`)}</Badge>
              <Badge size="sm">{t("common.yearsOld", { age })}</Badge>
              <Badge size="sm" tone="primary" className="tabular">
                {t("patient.pseudoId")}: {patient.pseudoId}
              </Badge>
              {patient.consentResearch ? (
                <Badge size="sm" tone="low">
                  <ShieldCheck aria-hidden="true" /> {t("patient.consentYes")}
                </Badge>
              ) : (
                <Badge size="sm">
                  <ShieldOff aria-hidden="true" /> {t("patient.consentNo")}
                </Badge>
              )}
            </div>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" asChild>
            <Link href={`/spirometry/new?patientId=${patient.id}`}>
              <Wind /> {t("patient.newSpirometry")}
            </Link>
          </Button>
          <Button asChild>
            <Link href={`/assessments/new?patientId=${patient.id}`}>
              <ClipboardList /> {t("patient.newAssessment")}
            </Link>
          </Button>
        </div>
      </header>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="flex min-w-0 flex-col gap-6">
          {/* Latest risk */}
          <Card>
            <CardHeader>
              <CardTitle>{t("patient.latestRisk")}</CardTitle>
            </CardHeader>
            <CardContent>
              {latest ? (
                <div className="flex flex-col gap-3">
                  <div className="flex flex-wrap items-center gap-3">
                    <RiskBadge level={latest.risk.level} size="lg" variant="long" />
                    <span className="text-sm text-muted-foreground">
                      {formatDate(latest.assessedAt)} · {t("risk.score", { score: latest.risk.score, max: latest.risk.maxScore })}
                    </span>
                  </div>
                  <RiskExplanation result={latest.risk} className="text-base font-semibold" />
                  <p className="text-sm text-muted-foreground">
                    {t("risk.recommendation.title")}: <span className="font-medium text-foreground">{t(`risk.recommendation.${latest.risk.recommendation}.title`)}</span>
                  </p>
                </div>
              ) : (
                <EmptyState
                  icon={ClipboardList}
                  title={t("patient.notAssessed")}
                  description={t("patient.notAssessedBody")}
                  className="py-6"
                  action={
                    <Button asChild>
                      <Link href={`/assessments/new?patientId=${patient.id}`}>{t("patient.newAssessment")}</Link>
                    </Button>
                  }
                />
              )}
            </CardContent>
          </Card>

          {/* Risk over time */}
          <Card>
            <CardHeader>
              <CardTitle>{t("patient.riskOverTime")}</CardTitle>
            </CardHeader>
            <CardContent>
              {assessments.length >= 2 ? (
                <RiskTrendChart
                  points={assessments.map((a) => ({ date: a.assessedAt, score: a.risk.score, level: a.risk.level }))}
                  maxScore={latest!.risk.maxScore}
                  thresholds={DEFAULT_RISK_CONFIG.thresholds}
                />
              ) : (
                <p className="text-sm text-muted-foreground">{t("patient.riskOverTimeEmpty")}</p>
              )}
            </CardContent>
          </Card>

          {/* Score history */}
          <Card className="overflow-hidden">
            <CardHeader>
              <CardTitle>{t("patient.scoreHistory")}</CardTitle>
            </CardHeader>
            <CardContent className="px-0 sm:px-0">
              {assessments.length ? (
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent">
                      <TableHead>{t("patient.columns.date")}</TableHead>
                      <TableHead>{t("patient.columns.risk")}</TableHead>
                      <TableHead className="text-right">{t("patient.columns.score")}</TableHead>
                      <TableHead className="text-right">{t("patient.columns.packYears")}</TableHead>
                      <TableHead className="text-right">{t("patient.columns.mmrc")}</TableHead>
                      <TableHead className="text-right">{t("patient.columns.cat")}</TableHead>
                      <TableHead>{t("patient.columns.by")}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {[...assessments].reverse().map((a) => (
                      <TableRow key={a.id}>
                        <TableCell className="tabular whitespace-nowrap">{formatDate(a.assessedAt)}</TableCell>
                        <TableCell>
                          <RiskBadge level={a.risk.level} size="sm" />
                        </TableCell>
                        <TableCell className="tabular text-right">{a.risk.score}</TableCell>
                        <TableCell className="tabular text-right">{a.answers.smoking.packYears === null ? "—" : formatDecimal(a.answers.smoking.packYears, 1)}</TableCell>
                        <TableCell className="tabular text-right">{a.answers.mmrc}</TableCell>
                        <TableCell className="tabular text-right">{a.answers.catTotal}</TableCell>
                        <TableCell className="whitespace-nowrap text-sm text-muted-foreground">{names.get(a.createdBy) ?? "—"}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <p className="px-5 text-sm text-muted-foreground sm:px-6">{t("patient.scoreHistoryEmpty")}</p>
              )}
            </CardContent>
          </Card>

          {/* Spirometry */}
          <Card className="overflow-hidden">
            <CardHeader>
              <CardTitle>{t("patient.spirometryResults")}</CardTitle>
            </CardHeader>
            <CardContent className="px-0 sm:px-0">
              {spirometry.length ? (
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent">
                      <TableHead>{t("patient.columns.date")}</TableHead>
                      <TableHead className="text-right">{t("patient.columns.fev1")}</TableHead>
                      <TableHead className="text-right">{t("patient.columns.ratio")}</TableHead>
                      <TableHead className="text-right">{t("patient.columns.fev1Pct")}</TableHead>
                      <TableHead>{t("patient.columns.obstruction")}</TableHead>
                      <TableHead>{t("patient.columns.gold")}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {[...spirometry].reverse().map((s) => {
                      const i = s.interpretation;
                      const basis = i.basis === "post" ? i.post : i.pre;
                      return (
                        <TableRow key={s.id}>
                          <TableCell className="whitespace-nowrap">
                            <span className="tabular">{formatDate(s.testedAt)}</span>
                            <span className="block text-sm text-muted-foreground">{i.basis ? t(`patient.basisShort.${i.basis}`) : "—"}</span>
                          </TableCell>
                          <TableCell className="tabular text-right">{formatDecimal(basis?.fev1L)}</TableCell>
                          <TableCell className="tabular text-right font-semibold">{formatDecimal(basis?.ratio)}</TableCell>
                          <TableCell className="tabular text-right">{basis?.fev1PctPred == null ? "—" : `${Math.round(basis.fev1PctPred)}%`}</TableCell>
                          <TableCell className="text-sm">{t(`spirometry.obstruction.${i.obstruction}`)}</TableCell>
                          <TableCell>{i.goldGrade ? <Badge size="sm" tone="primary">{t("spirometry.goldShort", { grade: i.goldGrade })}</Badge> : <span className="text-sm text-muted-foreground">—</span>}</TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              ) : (
                <EmptyState
                  icon={Wind}
                  title={t("patient.spirometryEmpty")}
                  description={t("patient.spirometryEmptyBody")}
                  className="py-6"
                  action={
                    <Button variant="outline" asChild>
                      <Link href={`/spirometry/new?patientId=${patient.id}`}>{t("patient.newSpirometry")}</Link>
                    </Button>
                  }
                />
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right column */}
        <div className="flex flex-col gap-6">
          <Card>
            <CardHeader>
              <CardTitle>{t("referral.title")}</CardTitle>
              <div className="flex flex-wrap gap-2 pt-1">
                <ReferralBadge status={patient.referralStatus} size="md" />
                <ReviewDue date={patient.nextReviewDate} today={today} size="md" />
              </div>
            </CardHeader>
            <CardContent>
              <FollowUpForm patientId={patient.id} status={patient.referralStatus} nextReviewDate={patient.nextReviewDate} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <UserRound className="size-5 text-primary" aria-hidden="true" /> {t("assessment.patient.title")}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-[0.9375rem]">
                <dt className="text-muted-foreground">{t("patient.birthDate")}</dt>
                <dd className="tabular">{formatDate(patient.birthDate)}</dd>
                <dt className="text-muted-foreground">{t("patient.sex")}</dt>
                <dd>{t(`sex.${patient.sex}`)}</dd>
                <dt className="text-muted-foreground">{t("patient.phone")}</dt>
                <dd>{patient.phone ?? t("common.notRecorded")}</dd>
                <dt className="text-muted-foreground">{t("patient.consent")}</dt>
                <dd>{patient.consentResearch ? `${t("patient.consentYes")} (${formatDate(patient.consentAt)})` : t("patient.consentNo")}</dd>
              </dl>
              <p className="mt-4 text-sm text-muted-foreground">{t("patient.createdBy", { name: names.get(patient.createdBy) ?? "—", date: formatDateTime(patient.createdAt) })}</p>
              <p className="text-sm text-muted-foreground">{t("patient.updatedBy", { name: names.get(patient.updatedBy) ?? "—", date: formatDateTime(patient.updatedAt) })}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <History className="size-5 text-primary" aria-hidden="true" /> {t("patient.audit")}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {audit.length ? (
                <ol className="flex flex-col gap-3">
                  {audit.map((e) => (
                    <li key={e.id} className="flex gap-3 text-sm">
                      <FileClock className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                      <div className="min-w-0">
                        <p>
                          <span className="font-medium">{e.actorName}</span> · {t(`audit.entities.${e.entity}`)} — {t(`audit.actions.${e.action}`)}
                        </p>
                        <p className="tabular text-muted-foreground">{formatDateTime(e.at)}</p>
                      </div>
                    </li>
                  ))}
                </ol>
              ) : (
                <p className="text-sm text-muted-foreground">{t("patient.auditEmpty")}</p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
