"use client";

import { Activity, AlertTriangle, CheckCircle2, HelpCircle, Info, Save, UserRound } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useMemo, useState, useTransition } from "react";
import { toast } from "sonner";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { RadioCard, RadioGroup } from "@/components/ui/radio-group";
import { Stat } from "@/components/ui/stat";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  DEFAULT_ETHNICITY,
  FIXED_RATIO_THRESHOLD,
  type MeasuredSummary,
  type SpirometryInterpretation,
  getReferenceEquation,
  interpretSpirometry,
} from "@/lib/clinical";
import { todayInClinic } from "@/lib/domain/dates";
import { formatDecimal } from "@/lib/format";
import { cn } from "@/lib/utils";
import { fieldErrors } from "@/lib/validation/common";
import { type SpirometryFormInput, spirometryFormSchema } from "@/lib/validation/spirometry";
import { saveSpirometryAction } from "./actions";

export interface SpiroPatient {
  id: string;
  fullName: string;
  pseudoId: string;
  sex: "male" | "female";
  ageYears: number;
  heightCm: number | null;
}

interface FormState {
  testedAt: string;
  ageYears: string;
  heightCm: string;
  sex: "" | "male" | "female";
  preFev1: string;
  preFvc: string;
  postFev1: string;
  postFvc: string;
  lln: boolean;
}

const nul = (v: string) => (v.trim() === "" ? null : v);

function toInput(s: FormState, patientId: string | null): SpirometryFormInput {
  return {
    patientId,
    testedAt: s.testedAt,
    ageYears: nul(s.ageYears),
    heightCm: nul(s.heightCm),
    sex: s.sex === "" ? null : s.sex,
    method: s.lln ? "lln" : "fixedRatio",
    pre: { fev1L: nul(s.preFev1), fvcL: nul(s.preFvc) },
    post: { fev1L: nul(s.postFev1), fvcL: nul(s.postFvc) },
  } as SpirometryFormInput;
}

export function SpirometryInterpreter({ patient }: { patient: SpiroPatient | null }) {
  const t = useTranslations();
  const router = useRouter();
  const [s, setS] = useState<FormState>({
    testedAt: todayInClinic(),
    ageYears: patient ? String(patient.ageYears) : "",
    heightCm: patient?.heightCm ? String(patient.heightCm) : "",
    sex: patient?.sex ?? "",
    preFev1: "",
    preFvc: "",
    postFev1: "",
    postFvc: "",
    lln: false,
  });
  const [submitted, setSubmitted] = useState(false);
  const [saving, startSaving] = useTransition();
  const set = <K extends keyof FormState>(k: K, v: FormState[K]) => setS((p) => ({ ...p, [k]: v }));

  const parsed = useMemo(() => spirometryFormSchema.safeParse(toInput(s, patient?.id ?? null)), [s, patient]);
  const errors = parsed.success ? {} : fieldErrors(parsed.error);
  // Show range errors as soon as a value is typed; "missing" errors only after a save attempt.
  const show = (path: string, raw: string) => {
    const key = errors[path];
    if (!key) return undefined;
    if (!submitted && (raw.trim() === "" || key === "spirometry.errors.pairIncomplete")) return undefined;
    return t(key as never);
  };

  // Interpret whatever is valid so far (never guesses missing values).
  const result: SpirometryInterpretation | null = useMemo(() => {
    const n = (v: string) => {
      const x = Number(v.replace(",", "."));
      return v.trim() === "" || !Number.isFinite(x) ? null : x;
    };
    const pre = { fev1L: n(s.preFev1), fvcL: n(s.preFvc) };
    const post = { fev1L: n(s.postFev1), fvcL: n(s.postFvc) };
    if ((pre.fev1L === null || pre.fvcL === null) && (post.fev1L === null || post.fvcL === null)) return null;
    const age = n(s.ageYears);
    const height = n(s.heightCm);
    return interpretSpirometry(
      {
        ageYears: age !== null && age >= 18 && age <= 110 ? age : null,
        heightCm: height !== null && height >= 120 && height <= 220 ? height : null,
        sex: s.sex === "" ? null : s.sex,
        ethnicity: DEFAULT_ETHNICITY,
        pre,
        post,
      },
      { method: s.lln ? "lln" : "fixedRatio" },
    );
  }, [s]);

  function save() {
    setSubmitted(true);
    startSaving(async () => {
      const res = await saveSpirometryAction(toInput(s, patient?.id ?? null));
      if (res.ok) {
        toast.success(t("spirometry.saved"));
        router.push(`/patients/${res.data.patientId}`);
      } else {
        toast.error(t(res.error as never));
      }
    });
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,26rem)_minmax(0,1fr)]">
      <Card className="self-start">
        <CardHeader>
          <CardTitle>{t("spirometry.demographics")}</CardTitle>
          <CardDescription>{t("spirometry.demographicsHint")}</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-5">
          {patient ? (
            <div className="flex items-center gap-3 rounded-lg border border-border bg-surface-muted/50 p-3">
              <UserRound className="size-5 shrink-0 text-primary" aria-hidden="true" />
              <div className="min-w-0">
                <p className="truncate font-medium">{patient.fullName}</p>
                <p className="text-sm text-muted-foreground">{patient.pseudoId}</p>
              </div>
            </div>
          ) : (
            <Alert tone="info">{t("spirometry.noPatient")}</Alert>
          )}
          <div className="grid grid-cols-2 gap-4">
            <Field label={t("assessment.patient.age")} error={show("ageYears", s.ageYears)}>
              <Input inputMode="numeric" value={s.ageYears} onChange={(e) => set("ageYears", e.target.value)} unit={t("common.years")} />
            </Field>
            <Field label={t("assessment.patient.height")} error={show("heightCm", s.heightCm)}>
              <Input inputMode="decimal" value={s.heightCm} onChange={(e) => set("heightCm", e.target.value)} unit={t("common.cm")} />
            </Field>
          </div>
          <Field label={t("assessment.patient.sex")} as="legend" error={submitted && errors.sex ? t(errors.sex as never) : undefined}>
            <RadioGroup value={s.sex} onValueChange={(v) => set("sex", v as "male")} className="grid-cols-2">
              <RadioCard value="male" title={t("sex.male")} />
              <RadioCard value="female" title={t("sex.female")} />
            </RadioGroup>
          </Field>
          <Field label={t("spirometry.testDate")}>
            <Input type="date" value={s.testedAt} max={todayInClinic()} onChange={(e) => set("testedAt", e.target.value)} />
          </Field>

          <VolumePair
            title={t("spirometry.pre")}
            fev1={s.preFev1}
            fvc={s.preFvc}
            onFev1={(v) => set("preFev1", v)}
            onFvc={(v) => set("preFvc", v)}
            fev1Error={show("pre.fev1L", s.preFev1)}
            fvcError={show("pre.fvcL", s.preFvc)}
          />
          <VolumePair
            title={t("spirometry.post")}
            hint={t("spirometry.postHint")}
            fev1={s.postFev1}
            fvc={s.postFvc}
            onFev1={(v) => set("postFev1", v)}
            onFvc={(v) => set("postFvc", v)}
            fev1Error={show("post.fev1L", s.postFev1)}
            fvcError={show("post.fvcL", s.postFvc)}
            highlight
          />

          <div className="flex flex-col gap-2 rounded-lg border border-border p-4">
            <div className="flex min-h-11 items-center justify-between gap-4">
              <label htmlFor="lln-toggle" className="text-[0.9375rem] font-medium">
                {t("spirometry.methodToggle")}
              </label>
              <Switch id="lln-toggle" checked={s.lln} onCheckedChange={(v) => set("lln", v)} aria-describedby="lln-hint" />
            </div>
            <p id="lln-hint" className="text-sm text-muted-foreground">
              {t("spirometry.methodToggleHint")}
            </p>
          </div>
        </CardContent>
        {patient ? (
          <CardFooter>
            <Button onClick={save} disabled={saving || !result} className="w-full sm:w-auto">
              <Save /> {saving ? t("common.saving") : t("spirometry.saveToPatient")}
            </Button>
            <Button variant="ghost" asChild>
              <Link href={`/patients/${patient.id}`}>{t("common.cancel")}</Link>
            </Button>
          </CardFooter>
        ) : null}
      </Card>

      <section aria-labelledby="interp-title" aria-live="polite" className="flex min-w-0 flex-col gap-4">
        <h2 id="interp-title" className="text-lg font-semibold">
          {t("spirometry.summary")}
        </h2>
        <Alert tone="info">{t("safety.spirometryContext")}</Alert>
        {result ? (
          <InterpretationView r={result} />
        ) : (
          <Card>
            <EmptyState icon={Activity} title={t("spirometry.summaryEmpty")} description={t("spirometry.summaryEmptyHint")} />
          </Card>
        )}
      </section>
    </div>
  );
}

function VolumePair(props: {
  title: string;
  hint?: string;
  fev1: string;
  fvc: string;
  onFev1: (v: string) => void;
  onFvc: (v: string) => void;
  fev1Error?: string;
  fvcError?: string;
  highlight?: boolean;
}) {
  const t = useTranslations();
  return (
    <fieldset className={cn("flex flex-col gap-3 rounded-lg border p-4", props.highlight ? "border-primary/40 bg-primary-soft/30" : "border-border")}>
      <legend className="px-1 text-sm font-semibold">{props.title}</legend>
      {props.hint ? <p className="-mt-1 text-sm text-muted-foreground">{props.hint}</p> : null}
      <div className="grid grid-cols-2 gap-4">
        <Field label={t("spirometry.fev1")} error={props.fev1Error}>
          <Input inputMode="decimal" value={props.fev1} onChange={(e) => props.onFev1(e.target.value)} unit={t("common.liters")} placeholder="0,00" />
        </Field>
        <Field label={t("spirometry.fvc")} error={props.fvcError}>
          <Input inputMode="decimal" value={props.fvc} onChange={(e) => props.onFvc(e.target.value)} unit={t("common.liters")} placeholder="0,00" />
        </Field>
      </div>
    </fieldset>
  );
}

const OBSTRUCTION_UI = {
  present: { icon: AlertTriangle, tone: "high" as const },
  absent: { icon: CheckCircle2, tone: "low" as const },
  indeterminate: { icon: HelpCircle, tone: "neutral" as const },
};

function InterpretationView({ r }: { r: SpirometryInterpretation }) {
  const t = useTranslations();
  const basis = r.basis === "post" ? r.post : r.pre;
  const ui = OBSTRUCTION_UI[r.obstruction];
  const threshold = r.method === "lln" ? (r.predicted ? `LLN ${formatDecimal(r.predicted.FEV1FVC.lln)}` : "LLN —") : formatDecimal(FIXED_RATIO_THRESHOLD);
  const ratioTone = r.obstruction === "present" ? "high" : r.obstruction === "absent" ? "low" : "default";
  const warnFlags = r.flags;

  return (
    <>
      <Card className={cn("border-2", r.obstruction === "present" ? "border-risk-high-border" : r.obstruction === "absent" ? "border-risk-low-border" : "border-border")}>
        <CardContent className="flex flex-col gap-5">
          <div className="flex flex-wrap items-center gap-3">
            <Badge tone={ui.tone} size="lg">
              <ui.icon aria-hidden="true" />
              {t(`spirometry.obstruction.${r.obstruction}`)}
            </Badge>
            {r.basis ? <span className="text-sm text-muted-foreground">{t(`spirometry.basis.${r.basis}`)}</span> : null}
          </div>
          <p className="text-[0.9375rem]">
            {t(`spirometry.obstructionDetail.${r.obstruction}`, { ratio: formatDecimal(basis?.ratio), threshold })}
            {r.alternateMethodObstructed !== null ? (
              <span className="block text-sm text-muted-foreground">
                {t("spirometry.alternateMethod", {
                  result: t(`spirometry.obstruction.${r.alternateMethodObstructed ? "present" : "absent"}`).toLowerCase(),
                })}{" "}
                ({r.method === "lln" ? t("spirometry.methodFixed") : t("spirometry.methodLln")})
              </span>
            ) : null}
          </p>
          <dl className="grid gap-3 sm:grid-cols-3">
            <Stat
              label={t("spirometry.ratio")}
              value={formatDecimal(basis?.ratio)}
              emphasis
              tone={ratioTone}
              detail={r.predicted ? `${t("spirometry.lln")} ${formatDecimal(r.predicted.FEV1FVC.lln)}` : undefined}
            />
            <Stat
              label={t("spirometry.gold")}
              value={r.goldGrade ? `GOLD ${r.goldGrade}` : "—"}
              detail={r.goldGrade ? t(`spirometry.goldNames.${r.goldGrade}`) : t("spirometry.goldNotAssigned")}
            />
            <Stat
              label={`${t("spirometry.fev1")} ${t("spirometry.pctPred")}`}
              value={basis?.fev1PctPred == null ? "—" : `${Math.round(basis.fev1PctPred)}%`}
              detail={r.ersAtsSeverity ? `${t("spirometry.ersAts")}: ${t(`spirometry.ersAtsLevels.${r.ersAtsSeverity}`)}` : basis?.fev1Z != null ? `z ${formatDecimal(basis.fev1Z, 1)}` : undefined}
            />
          </dl>
        </CardContent>
      </Card>

      {warnFlags.length > 0 ? (
        <Alert tone="warning" title={t("spirometry.flags.title")}>
          <ul className="flex list-disc flex-col gap-1 pl-5">
            {warnFlags.map((f) => (
              <li key={f}>{t(`spirometry.flags.${f}`)}</li>
            ))}
          </ul>
        </Alert>
      ) : null}

      <Card className="overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead />
              <TableHead className="text-right">{t("spirometry.predicted")}</TableHead>
              <TableHead className="text-right">{t("spirometry.lln")}</TableHead>
              <TableHead className="text-right">{t("patient.basisShort.pre")}</TableHead>
              <TableHead className="text-right">{t("patient.basisShort.post")}</TableHead>
              <TableHead className="text-right">{t("spirometry.pctPred")}</TableHead>
              <TableHead className="text-right">{t("spirometry.zScore")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <IndexRow label={`${t("spirometry.fev1")} (L)`} pred={r.predicted?.FEV1.predicted} lln={r.predicted?.FEV1.lln} pre={r.pre} post={r.post} pick="fev1" basis={basis} />
            <IndexRow label={`${t("spirometry.fvc")} (L)`} pred={r.predicted?.FVC.predicted} lln={r.predicted?.FVC.lln} pre={r.pre} post={r.post} pick="fvc" basis={basis} />
            <IndexRow label={t("spirometry.ratio")} pred={r.predicted?.FEV1FVC.predicted} lln={r.predicted?.FEV1FVC.lln} pre={r.pre} post={r.post} pick="ratio" basis={basis} />
          </TableBody>
        </Table>
      </Card>

      <p className="flex items-start gap-2 text-sm text-muted-foreground">
        <Info className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
        <span>
          {t("spirometry.equation", { citation: getReferenceEquation(r.equationId).citation, ethnicity: t(`spirometry.ethnicity.${DEFAULT_ETHNICITY}`) })}{" "}
          {t("spirometry.ethnicityReview")}
        </span>
      </p>
    </>
  );
}

function IndexRow({
  label,
  pred,
  lln,
  pre,
  post,
  pick,
  basis,
}: {
  label: string;
  pred: number | undefined;
  lln: number | undefined;
  pre: MeasuredSummary | null;
  post: MeasuredSummary | null;
  pick: "fev1" | "fvc" | "ratio";
  basis: MeasuredSummary | null;
}) {
  const val = (m: MeasuredSummary | null) => (m ? (pick === "fev1" ? m.fev1L : pick === "fvc" ? m.fvcL : m.ratio) : null);
  const pct = basis ? (pick === "fev1" ? basis.fev1PctPred : pick === "fvc" ? basis.fvcPctPred : null) : null;
  const z = basis ? (pick === "fev1" ? basis.fev1Z : pick === "fvc" ? basis.fvcZ : basis.ratioZ) : null;
  return (
    <TableRow>
      <TableHead scope="row" className="text-foreground">
        {label}
      </TableHead>
      <TableCell className="tabular text-right">{formatDecimal(pred)}</TableCell>
      <TableCell className="tabular text-right">{formatDecimal(lln)}</TableCell>
      <TableCell className="tabular text-right">{formatDecimal(val(pre))}</TableCell>
      <TableCell className="tabular text-right font-semibold">{formatDecimal(val(post))}</TableCell>
      <TableCell className="tabular text-right">{pct === null ? "—" : `${Math.round(pct)}%`}</TableCell>
      <TableCell className="tabular text-right">{formatDecimal(z, 1)}</TableCell>
    </TableRow>
  );
}
