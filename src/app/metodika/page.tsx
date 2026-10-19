import { ArrowLeft, ArrowRight, BookOpen, Calculator, Info, ListChecks, MonitorCheck } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { getFormatter, getTranslations } from "next-intl/server";
import { type RiskInput, type ScaleCriterion, type ScaleFactor, computeRisk, describeRiskScale, DEFAULT_RISK_CONFIG } from "@/lib/clinical";
import { Logo } from "@/components/app/logo";
import { RiskBadge } from "@/components/clinical/risk-badge";
import { SafetyNotice } from "@/components/clinical/safety-notice";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

/**
 * Public methodology page — "19-point scale" explained (static, no session).
 * Every number comes from the live risk config via describeRiskScale(), so the
 * page cannot drift from what computeRisk() does.
 */

const EXAMPLE: RiskInput = {
  ageYears: 45,
  smoking: { status: "never", packYears: null },
  biomass: { exposed: true, years: 15 },
  occupational: { exposed: false, years: null },
  symptoms: { chronicCough: false, sputum: false, dyspnea: true },
  mmrc: 2,
  catTotal: 12,
};

const GROUPS = ["ageYears", "packYears", "biomassYears", "occupationalYears", "symptoms", "mmrc", "catTotal"] as const;

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("method");
  return { title: t("metaTitle", { max: describeRiskScale().maxScore }) };
}

export default async function MethodologyPage() {
  const t = await getTranslations();
  const format = await getFormatter();
  const scale = describeRiskScale();
  const example = computeRisk(EXAMPLE);

  const num = (v: number) => format.number(v, { maximumFractionDigits: 1 });
  const unit = (f: ScaleFactor) => (t.has(`method.units.${f.factor}` as never) ? ` ${t(`method.units.${f.factor}` as never)}` : "");
  const criterion = (f: ScaleFactor, c: ScaleCriterion): string => {
    switch (c.kind) {
      case "below":
        return t("method.criterion.below", { value: num(c.max) }) + unit(f);
      case "range":
        return t("method.criterion.range", { min: num(c.min), max: num(c.max - f.step) }) + unit(f);
      case "atLeast":
        return t("method.criterion.atLeast", { value: num(c.min) }) + unit(f);
      case "yes":
        return t("method.criterion.yes");
      case "grade":
        return t("method.criterion.grade", { value: c.grade });
    }
  };

  return (
    <div className="min-h-dvh bg-background">
      <header className="border-b border-border bg-surface">
        <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-4 sm:px-6">
          <Link href="/" aria-label={t("method.backHome")}>
            <Logo />
          </Link>
          <Button asChild variant="outline">
            <Link href="/login">{t("landing.ctaLogin")}</Link>
          </Button>
        </div>
      </header>

      <main id="main" className="mx-auto flex max-w-5xl flex-col gap-10 px-4 py-10 sm:px-6 sm:py-14">
        <section className="flex flex-col gap-4">
          <Badge tone="primary" className="self-start">
            <BookOpen aria-hidden="true" /> {t("method.badge")}
          </Badge>
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">{t("method.title", { max: scale.maxScore })}</h1>
          <p className="max-w-3xl text-lg text-muted-foreground">{t("method.lead", { max: scale.maxScore })}</p>
          <p className="flex items-start gap-2 text-sm text-muted-foreground">
            <Info className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
            {t("method.version", { version: scale.version })}
          </p>
        </section>

        <section aria-labelledby="levels" className="flex flex-col gap-4">
          <h2 id="levels" className="text-2xl font-bold tracking-tight">{t("method.levelsTitle")}</h2>
          <div className="grid gap-4 md:grid-cols-3">
            {scale.levels.map((l) => (
              <Card key={l.level}>
                <CardContent className="flex flex-col gap-3">
                  <RiskBadge level={l.level} size="lg" variant="long" className="self-start" />
                  <p className="tabular text-2xl font-bold">{t("method.levelRange", { min: l.minScore, max: l.maxScore })}</p>
                  <p className="font-semibold">{t(`risk.recommendation.${l.recommendation}.title`)}</p>
                  <p className="text-sm text-muted-foreground">{t("method.levelReview", { months: l.reviewInMonths })}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        <section aria-labelledby="factors" className="flex flex-col gap-4">
          <h2 id="factors" className="text-2xl font-bold tracking-tight">{t("method.factorsTitle")}</h2>
          <p className="max-w-3xl text-muted-foreground">{t("method.factorsLead")}</p>
          <div className="grid gap-4 sm:grid-cols-2">
            {GROUPS.map((g) => (
              <Card key={g}>
                <CardContent className="flex flex-col gap-1.5">
                  <h3 className="font-semibold">{t(`method.groups.${g}.title`)}</h3>
                  <p className="text-[0.9375rem] text-foreground/90">{t(`method.groups.${g}.body`)}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        <section aria-labelledby="table" className="flex flex-col gap-4">
          <h2 id="table" className="text-2xl font-bold tracking-tight">{t("method.tableTitle")}</h2>
          <Card>
            <CardContent className="overflow-x-auto p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("method.tableFactor")}</TableHead>
                    <TableHead>{t("method.tableCriterion")}</TableHead>
                    <TableHead className="text-right">{t("method.tablePoints")}</TableHead>
                    <TableHead className="text-right">{t("method.tableMax")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {scale.factors.map((f) =>
                    f.criteria.map((c, i) => (
                      <TableRow key={`${f.factor}-${i}`}>
                        {i === 0 ? (
                          <TableCell rowSpan={f.criteria.length} className="align-top font-medium">
                            {t(`risk.factorNames.${f.factor}`)}
                          </TableCell>
                        ) : null}
                        <TableCell className="tabular">{criterion(f, c)}</TableCell>
                        <TableCell className="tabular text-right">{c.points}</TableCell>
                        {i === 0 ? (
                          <TableCell rowSpan={f.criteria.length} className="tabular text-right align-top font-semibold">
                            {f.maxPoints}
                          </TableCell>
                        ) : null}
                      </TableRow>
                    )),
                  )}
                  <TableRow>
                    <TableCell colSpan={3} className="font-semibold">{t("method.total")}</TableCell>
                    <TableCell className="tabular text-right text-lg font-bold">{scale.maxScore}</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </section>

        <section aria-labelledby="rules" className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle id="rules" className="flex items-center gap-2 text-lg">
                <ListChecks className="size-5 text-primary" aria-hidden="true" /> {t("method.rulesTitle")}
              </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              <p className="text-sm text-muted-foreground">{t("method.rulesLead")}</p>
              {DEFAULT_RISK_CONFIG.escalationRules.map((r) => (
                <div key={r.id} className="flex flex-col gap-2 rounded-lg border border-border p-3">
                  <RiskBadge level={r.minLevel} size="sm" className="self-start" />
                  <p className="text-[0.9375rem]">{t(`risk.rules.${r.id}` as never)}</p>
                </div>
              ))}
            </CardContent>
          </Card>
          <div className="flex flex-col gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <MonitorCheck className="size-5 text-primary" aria-hidden="true" /> {t("method.outputTitle")}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ol className="flex list-decimal flex-col gap-2 pl-5 text-[0.9375rem]">
                  {(["1", "2", "3", "4", "5"] as const).map((n) => (
                    <li key={n}>{t(`method.output.${n}`)}</li>
                  ))}
                </ol>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="flex flex-col gap-1.5">
                <h3 className="font-semibold">{t("method.missingTitle")}</h3>
                <p className="text-[0.9375rem] text-foreground/90">{t("method.missingBody")}</p>
              </CardContent>
            </Card>
          </div>
        </section>

        <section aria-labelledby="example" className="flex flex-col gap-4">
          <h2 id="example" className="flex items-center gap-2 text-2xl font-bold tracking-tight">
            <Calculator className="size-6 text-primary" aria-hidden="true" /> {t("method.exampleTitle")}
          </h2>
          <Card>
            <CardContent className="flex flex-col gap-4">
              <p className="text-[0.9375rem]">{t("method.exampleLead")}</p>
              <ul className="grid gap-2 sm:grid-cols-3">
                {example.contributions.map((c) => (
                  <li key={c.factor} className="flex items-center justify-between rounded-md bg-surface-muted px-3 py-2 text-sm">
                    <span className={c.points > 0 ? "font-medium" : "text-muted-foreground"}>{t(`risk.factorNames.${c.factor}`)}</span>
                    <span className="tabular">
                      {c.points} / {c.maxPoints}
                    </span>
                  </li>
                ))}
              </ul>
              <div className="flex flex-wrap items-center gap-3 border-t border-border pt-4">
                <RiskBadge level={example.level} variant="long" />
                <span className="tabular font-semibold">
                  {t("method.exampleScore", { score: example.score, max: example.maxScore, level: t(`risk.levels.${example.scoreLevel}`) })}
                </span>
              </div>
              {example.level !== example.scoreLevel ? (
                <p className="text-sm text-muted-foreground">
                  {t("method.exampleRule", { scoreLevel: t(`risk.levels.${example.scoreLevel}`), level: t(`risk.levels.${example.level}`) })}
                </p>
              ) : null}
            </CardContent>
          </Card>
        </section>

        <section aria-labelledby="sources" className="flex flex-col gap-3">
          <h2 id="sources" className="text-xl font-bold tracking-tight">{t("method.sourcesTitle")}</h2>
          <ol className="flex list-decimal flex-col gap-1.5 pl-5 text-sm text-muted-foreground">
            {(["1", "2", "3", "4", "5", "6"] as const).map((n) => (
              <li key={n}>{t(`method.sources.${n}`)}</li>
            ))}
          </ol>
          <p className="text-sm text-muted-foreground">{t("method.sourcesNote")}</p>
        </section>

        <SafetyNotice />

        <div className="flex flex-wrap gap-3">
          <Button size="lg" asChild>
            <Link href="/assessments/new">
              {t("method.ctaAssess")} <ArrowRight />
            </Link>
          </Button>
          <Button size="lg" variant="outline" asChild>
            <Link href="/">
              <ArrowLeft /> {t("method.backHome")}
            </Link>
          </Button>
        </div>
      </main>
    </div>
  );
}
