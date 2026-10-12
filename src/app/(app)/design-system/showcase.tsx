"use client";

import { Activity, ClipboardList, Search, Stethoscope, Users } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { toast } from "sonner";
import { RiskBadge } from "@/components/clinical/risk-badge";
import { SafetyNotice } from "@/components/clinical/safety-notice";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { RadioCard, RadioGroup } from "@/components/ui/radio-group";
import { Select } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Stat, StatGrid } from "@/components/ui/stat";
import { Stepper } from "@/components/ui/stepper";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

/*
 * Living style guide. Text that would be user-facing in the product comes from
 * the i18n layer; the section headings below are developer documentation and
 * intentionally stay in English (this page is internal).
 */

const SWATCHES = [
  ["primary", "bg-primary"],
  ["primary-soft", "bg-primary-soft"],
  ["surface", "bg-surface"],
  ["background", "bg-background"],
  ["surface-muted", "bg-surface-muted"],
  ["foreground", "bg-foreground"],
  ["muted-foreground", "bg-muted-foreground"],
  ["input", "bg-input"],
  ["risk-low", "bg-risk-low"],
  ["risk-medium", "bg-risk-medium"],
  ["risk-high", "bg-risk-high"],
  ["info", "bg-info"],
] as const;

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-4">
      <h2 className="text-sm font-semibold tracking-wide text-muted-foreground uppercase">{title}</h2>
      {children}
    </section>
  );
}

export function Showcase() {
  const t = useTranslations();
  const [mmrc, setMmrc] = useState("2");
  const [step, setStep] = useState(2);
  const [lln, setLln] = useState(false);
  const steps = (["patient", "exposures", "symptoms", "scores", "result"] as const).map((id) => ({
    id,
    label: t(`assessment.steps.${id}`),
  }));

  return (
    <div className="flex flex-col gap-12">
      <Section title="Colour tokens">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-6">
          {SWATCHES.map(([name, cls]) => (
            <div key={name} className="overflow-hidden rounded-lg border border-border bg-surface">
              <div className={`h-14 ${cls}`} />
              <p className="px-3 py-2 font-mono text-xs text-muted-foreground">--{name}</p>
            </div>
          ))}
        </div>
      </Section>

      <Section title="Typography (Inter · Uzbek Latin: oʻ gʻ ʼ Oʻ Gʻ)">
        <div className="flex flex-col gap-2">
          <p className="text-display tabular">0,58</p>
          <p className="text-3xl font-bold tracking-tight">{t("assessment.title")}</p>
          <p className="text-xl font-semibold">{t("spirometry.title")}</p>
          <p className="text-base">{t("landing.problemBody")}</p>
          <p className="text-sm text-muted-foreground">{t("safety.short")}</p>
        </div>
      </Section>

      <Section title="Risk badges — colour + icon + text">
        <div className="flex flex-wrap items-center gap-3">
          <RiskBadge level="low" />
          <RiskBadge level="medium" />
          <RiskBadge level="high" />
          <RiskBadge level="high" size="lg" variant="long" />
          <Badge tone="primary">GOLD 2</Badge>
          <Badge tone="info">{t("referral.statuses.referred")}</Badge>
          <Badge>{t("referral.statuses.none")}</Badge>
        </div>
      </Section>

      <Section title="Buttons">
        <div className="flex flex-wrap items-center gap-3">
          <Button>{t("common.save")}</Button>
          <Button variant="secondary">{t("patient.newSpirometry")}</Button>
          <Button variant="outline">{t("common.back")}</Button>
          <Button variant="ghost">{t("common.cancel")}</Button>
          <Button variant="destructive">{t("nav.logout")}</Button>
          <Button variant="link">{t("dashboard.table.open")}</Button>
          <Button size="lg">
            <Stethoscope /> {t("nav.newAssessment")}
          </Button>
          <Button disabled>{t("common.saving")}</Button>
        </div>
      </Section>

      <Section title="Stepper / progress">
        <Card>
          <CardContent className="flex flex-col gap-4">
            <Stepper
              steps={steps}
              current={step}
              label={t("assessment.stepperLabel")}
              progressText={t("assessment.stepOf", { current: step + 1, total: steps.length })}
              onStepSelect={setStep}
            />
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setStep((s) => Math.max(0, s - 1))}>
                {t("common.back")}
              </Button>
              <Button onClick={() => setStep((s) => Math.min(steps.length - 1, s + 1))}>{t("common.next")}</Button>
            </div>
          </CardContent>
        </Card>
      </Section>

      <Section title="Form controls">
        <Card>
          <CardContent className="grid gap-6 md:grid-cols-2">
            <Field label={t("assessment.patient.fullName")} required>
              <Input placeholder={t("assessment.patient.fullNamePlaceholder")} />
            </Field>
            <Field label={t("assessment.patient.height")} hint={t("spirometry.demographicsHint")}>
              <Input inputMode="decimal" unit={t("common.cm")} defaultValue="172" />
            </Field>
            <Field label={t("spirometry.fev1")} error={t("spirometry.errors.volumeRange")}>
              <Input inputMode="decimal" unit={t("common.liters")} defaultValue="12" />
            </Field>
            <Field label={t("assessment.patient.sex")}>
              <Select defaultValue="female">
                <option value="male">{t("sex.male")}</option>
                <option value="female">{t("sex.female")}</option>
              </Select>
            </Field>
            <label className="flex min-h-11 items-start gap-3 md:col-span-2">
              <Checkbox defaultChecked className="mt-0.5" />
              <span className="text-[0.9375rem]">{t("assessment.patient.consent")}</span>
            </label>
            <div className="flex min-h-11 items-center gap-3 md:col-span-2">
              <Switch id="lln" checked={lln} onCheckedChange={setLln} />
              <label htmlFor="lln" className="text-[0.9375rem] font-medium">
                {t("spirometry.methodToggle")}
              </label>
            </div>
          </CardContent>
        </Card>
      </Section>

      <Section title="RadioGroup — questionnaire cards (mMRC)">
        <Field label={t("assessment.scores.mmrc")} as="legend">
          <RadioGroup value={mmrc} onValueChange={setMmrc}>
            {(["0", "1", "2", "3", "4"] as const).map((g) => (
              <RadioCard key={g} value={g} marker={g} title={t(`assessment.scores.mmrcOptions.${g}`)} />
            ))}
          </RadioGroup>
        </Field>
      </Section>

      <Section title="Stat / metric blocks">
        <StatGrid>
          <Stat label={t("spirometry.ratio")} value="0,51" emphasis tone="high" detail={`${t("spirometry.lln")} 0,67`} />
          <Stat label={t("spirometry.fev1")} value="1,80" unit={t("common.liters")} detail="55% · z −2,9" />
          <Stat label="CAT" value="18" unit="/ 40" detail={t("risk.levels.medium")} />
        </StatGrid>
      </Section>

      <Section title="Alerts & safety notice">
        <div className="flex flex-col gap-3">
          <SafetyNotice />
          <SafetyNotice variant="compact" />
          <Alert tone="warning" title={t("spirometry.flags.title")}>
            {t("spirometry.flags.postBronchodilatorMissing")}
          </Alert>
          <Alert tone="danger" title={t("errors.generic.title")}>
            {t("errors.generic.body")}
          </Alert>
          <Alert tone="success">{t("assessment.result.saved")}</Alert>
        </div>
      </Section>

      <Section title="Table">
        <Card className="overflow-hidden">
          <Table>
            <TableCaption className="pb-3">{t("dashboard.table.caption")}</TableCaption>
            <TableHeader>
              <TableRow>
                <TableHead>{t("dashboard.table.patient")}</TableHead>
                <TableHead>{t("dashboard.table.risk")}</TableHead>
                <TableHead>{t("dashboard.table.referral")}</TableHead>
                <TableHead>{t("dashboard.table.nextReview")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow>
                <TableCell className="font-medium">Demo bemor A</TableCell>
                <TableCell>
                  <RiskBadge level="high" size="sm" />
                </TableCell>
                <TableCell>{t("referral.statuses.referred")}</TableCell>
                <TableCell className="tabular">12.11.2026</TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="font-medium">Demo bemor B</TableCell>
                <TableCell>
                  <RiskBadge level="low" size="sm" />
                </TableCell>
                <TableCell>{t("referral.statuses.none")}</TableCell>
                <TableCell className="tabular">01.09.2027</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </Card>
      </Section>

      <Section title="Dialog & toast">
        <div className="flex flex-wrap gap-3">
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="outline">{t("referral.update")}</Button>
            </DialogTrigger>
            <DialogContent closeLabel={t("common.close")}>
              <DialogHeader>
                <DialogTitle>{t("referral.update")}</DialogTitle>
                <DialogDescription>{t("referral.noteHint")}</DialogDescription>
              </DialogHeader>
              <Field label={t("referral.note")}>
                <Input />
              </Field>
              <DialogFooter>
                <DialogClose asChild>
                  <Button variant="outline">{t("common.cancel")}</Button>
                </DialogClose>
                <DialogClose asChild>
                  <Button onClick={() => toast.success(t("referral.updated"))}>{t("common.save")}</Button>
                </DialogClose>
              </DialogFooter>
            </DialogContent>
          </Dialog>
          <Button variant="secondary" onClick={() => toast.success(t("assessment.result.saved"))}>
            Toast
          </Button>
          <Button variant="ghost" onClick={() => toast.error(t("common.unknownError"))}>
            Toast (error)
          </Button>
        </div>
      </Section>

      <Section title="Empty state & skeleton (loading)">
        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <EmptyState
              icon={Users}
              title={t("dashboard.empty.title")}
              description={t("dashboard.empty.body")}
              action={
                <Button>
                  <ClipboardList /> {t("dashboard.empty.action")}
                </Button>
              }
            />
          </Card>
          <Card>
            <CardContent className="flex flex-col gap-4" aria-busy="true">
              <span className="sr-only">{t("common.loading")}</span>
              <Skeleton className="h-6 w-1/2" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-5/6" />
              <div className="grid grid-cols-3 gap-3">
                <Skeleton className="h-20" />
                <Skeleton className="h-20" />
                <Skeleton className="h-20" />
              </div>
            </CardContent>
          </Card>
        </div>
      </Section>

      <Section title="Card">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="size-5 text-primary" aria-hidden="true" />
              {t("patient.latestRisk")}
            </CardTitle>
            <CardDescription>{t("risk.question")}</CardDescription>
          </CardHeader>
          <CardContent>
            <RiskBadge level="medium" size="lg" variant="long" />
          </CardContent>
          <CardFooter>
            <Button size="sm" variant="outline">
              <Search /> {t("common.view")}
            </Button>
          </CardFooter>
        </Card>
      </Section>
    </div>
  );
}
