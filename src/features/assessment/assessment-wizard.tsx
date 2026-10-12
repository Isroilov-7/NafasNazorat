"use client";

import { ArrowLeft, ArrowRight, Save, UserRound } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useFormatter, useTranslations } from "next-intl";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import { RiskResultPanel } from "@/components/clinical/risk-result";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { RadioCard, RadioGroup } from "@/components/ui/radio-group";
import { Stat } from "@/components/ui/stat";
import { Stepper } from "@/components/ui/stepper";
import { CAT_ITEM_KEYS, MMRC_GRADES, nextReviewDate } from "@/lib/clinical";
import { todayInClinic } from "@/lib/domain/dates";
import { cn } from "@/lib/utils";
import {
  AGE_MAX,
  AGE_MIN,
  exposureYearsExceedAge,
  exposuresStepSchema,
  patientStepSchema,
  scoresStepSchema,
  symptomsStepSchema,
} from "@/lib/validation/assessment";
import { fieldErrors } from "@/lib/validation/common";
import { saveAssessmentAction } from "./actions";
import { CatItemQuestion, YesNoQuestion } from "./questions";
import {
  type PatientSummary,
  type WizardState,
  catTotal,
  computedPackYears,
  initialState,
  patientAge,
  previewRisk,
  toPayload,
} from "./wizard-state";

const STEPS = ["patient", "exposures", "symptoms", "scores", "result"] as const;
type Errors = Record<string, string>;

/** Error paths cleared when the user edits a given field. */
const ERROR_PATHS: Partial<Record<keyof WizardState, string[]>> = {
  fullName: ["patient.fullName"],
  birthDate: ["patient.birthDate"],
  sex: ["patient.sex"],
  heightCm: ["heightCm"],
  weightKg: ["weightKg"],
  smokingStatus: ["smoking.status", "smoking.cigarettesPerDay", "smoking.yearsSmoked"],
  cigarettesPerDay: ["smoking.cigarettesPerDay"],
  yearsSmoked: ["smoking.yearsSmoked"],
  biomass: ["biomass.exposed", "biomass.years"],
  biomassYears: ["biomass.years"],
  occupational: ["occupational.exposed", "occupational.years"],
  occupationalYears: ["occupational.years"],
  cough: ["symptoms.chronicCough"],
  sputum: ["symptoms.sputum"],
  dyspnea: ["symptoms.dyspnea"],
};

/** Which step owns a field path (used to jump back to server-side errors). */
function stepOf(path: string): number {
  if (path.startsWith("patient") || path.startsWith("heightCm") || path.startsWith("weightKg")) return 0;
  if (path.startsWith("smoking") || path.startsWith("biomass") || path.startsWith("occupational")) return 1;
  if (path.startsWith("symptoms")) return 2;
  return 3;
}

export function AssessmentWizard({ existingPatient }: { existingPatient: PatientSummary | null }) {
  const t = useTranslations();
  const format = useFormatter();
  const router = useRouter();
  const [state, setState] = useState<WizardState>(() => initialState(existingPatient));
  const [step, setStep] = useState(0);
  const [errors, setErrors] = useState<Errors>({});
  const [saving, startSaving] = useTransition();
  const headingRef = useRef<HTMLHeadingElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);
  const firstRender = useRef(true);

  const today = todayInClinic();
  const age = patientAge(state, today);
  const py = computedPackYears(state);
  const cat = catTotal(state);

  const set = <K extends keyof WizardState>(key: K, value: WizardState[K]) => {
    setState((s) => ({ ...s, [key]: value }));
    const paths = ERROR_PATHS[key] ?? [];
    setErrors((e) => {
      if (!paths.some((p) => p in e)) return e;
      const next = { ...e };
      for (const p of paths) delete next[p];
      return next;
    });
  };
  const err = (path: string) => (errors[path] ? t(errors[path] as never) : undefined);

  // Move focus to the step heading on navigation (screen-reader + keyboard users).
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    headingRef.current?.focus();
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [step]);

  function focusFirstError() {
    requestAnimationFrame(() => {
      const el = bodyRef.current?.querySelector<HTMLElement>('[aria-invalid="true"]');
      if (!el) return;
      const target = el.matches("input,select,button,textarea") ? el : el.querySelector<HTMLElement>("button,input");
      target?.focus();
      target?.scrollIntoView({ block: "center", behavior: "smooth" });
    });
  }

  function validate(index: number): Errors {
    const payload = toPayload(state);
    let result: Errors = {};
    if (index === 0) {
      const r = patientStepSchema.safeParse(payload);
      if (!r.success) result = fieldErrors(r.error);
      if (!state.existing && !result["patient.birthDate"] && age !== null && (age < AGE_MIN || age > AGE_MAX)) {
        result["patient.birthDate"] = "assessment.errors.ageRange";
      }
    } else if (index === 1) {
      const r = exposuresStepSchema.safeParse(payload);
      if (!r.success) result = fieldErrors(r.error);
      else if (age !== null) for (const f of exposureYearsExceedAge(r.data, age)) result[f] = "assessment.errors.yearsExceedAge";
    } else if (index === 2) {
      const r = symptomsStepSchema.safeParse(payload);
      if (!r.success) result = fieldErrors(r.error);
    } else if (index === 3) {
      const r = scoresStepSchema.safeParse(payload);
      if (!r.success) result = fieldErrors(r.error);
    }
    return result;
  }

  function next() {
    const e = validate(step);
    setErrors(e);
    if (Object.keys(e).length > 0) {
      focusFirstError();
      return;
    }
    setStep((s) => Math.min(s + 1, STEPS.length - 1));
  }

  function save() {
    startSaving(async () => {
      const res = await saveAssessmentAction(toPayload(state));
      if (res.ok) {
        toast.success(t("assessment.result.saved"));
        router.push(`/patients/${res.data.patientId}`);
        return;
      }
      toast.error(t(res.error as never));
      if (res.fieldErrors && Object.keys(res.fieldErrors).length > 0) {
        setErrors(res.fieldErrors);
        setStep(Math.min(...Object.keys(res.fieldErrors).map(stepOf)));
        focusFirstError();
      }
    });
  }

  const risk = useMemo(() => (step === 4 && age !== null ? previewRisk(state, age) : null), [step, state, age]);
  const steps = STEPS.map((id) => ({ id, label: t(`assessment.steps.${id}`) }));

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_18rem]">
      <div className="flex min-w-0 flex-col gap-6">
        <Stepper
          steps={steps}
          current={step}
          label={t("assessment.stepperLabel")}
          progressText={t("assessment.stepOf", { current: step + 1, total: STEPS.length })}
          onStepSelect={(i) => setStep(i)}
        />

        <Card>
          <CardHeader>
            <CardTitle>
              <span ref={headingRef} tabIndex={-1} className="rounded-sm outline-none focus-visible:outline-3 focus-visible:outline-ring">
                {t(`assessment.${STEPS[step] ?? "patient"}.title`)}
              </span>
            </CardTitle>
            {step < 4 ? <CardDescription>{t(`assessment.${STEPS[step] as "patient"}.description`)}</CardDescription> : null}
          </CardHeader>
          <CardContent>
            <div ref={bodyRef} className="flex flex-col gap-6">
              {step === 0 ? <PatientStep state={state} set={set} err={err} age={age} /> : null}
              {step === 1 ? <ExposuresStep state={state} set={set} err={err} packYears={py} /> : null}
              {step === 2 ? (
                <>
                  <YesNoQuestion name="cough" label={t("assessment.symptoms.chronicCough")} hint={t("assessment.symptoms.chronicCoughHint")} value={state.cough} onChange={(v) => set("cough", v)} error={err("symptoms.chronicCough")} />
                  <YesNoQuestion name="sputum" label={t("assessment.symptoms.sputum")} hint={t("assessment.symptoms.sputumHint")} value={state.sputum} onChange={(v) => set("sputum", v)} error={err("symptoms.sputum")} />
                  <YesNoQuestion name="dyspnea" label={t("assessment.symptoms.dyspnea")} hint={t("assessment.symptoms.dyspneaHint")} value={state.dyspnea} onChange={(v) => set("dyspnea", v)} error={err("symptoms.dyspnea")} />
                </>
              ) : null}
              {step === 3 ? <ScoresStep state={state} setState={setState} err={err} errors={errors} setErrors={setErrors} total={cat} /> : null}
              {step === 4 && risk ? (
                <RiskResultPanel result={risk} nextReviewDate={nextReviewDate(new Date(`${today}T00:00:00Z`), risk.reviewInMonths)} />
              ) : null}
            </div>
          </CardContent>
          <CardFooter className="justify-between">
            {step > 0 ? (
              <Button variant="outline" onClick={() => setStep((s) => s - 1)} disabled={saving}>
                <ArrowLeft /> {step === 4 ? t("assessment.result.editAnswers") : t("common.back")}
              </Button>
            ) : (
              <Button variant="ghost" asChild>
                <Link href={existingPatient ? `/patients/${existingPatient.id}` : "/dashboard"}>{t("common.cancel")}</Link>
              </Button>
            )}
            {step < 4 ? (
              <Button onClick={next}>
                {t("common.next")} <ArrowRight />
              </Button>
            ) : (
              <Button onClick={save} disabled={saving} size="lg">
                {saving ? null : <Save />} {saving ? t("common.saving") : t("assessment.result.saveAndFinish")}
              </Button>
            )}
          </CardFooter>
        </Card>
      </div>

      <aside className="hidden lg:block" aria-label={t("assessment.title")}>
        <div className="sticky top-8 flex flex-col gap-3">
          {state.existing ? <PatientChip patient={state.existing} /> : null}
          <dl className="grid gap-3">
            <Stat label={t("assessment.patient.age")} value={age ?? "—"} unit={age !== null ? t("common.years") : undefined} />
            <Stat label={t("assessment.exposures.packYears")} value={py === null ? "—" : format.number(py, "one")} />
            <Stat label="mMRC" value={state.mmrc === "" ? "—" : state.mmrc} unit="/ 4" />
            <Stat label="CAT" value={cat.complete ? cat.total : "—"} unit="/ 40" detail={cat.complete ? undefined : t("assessment.scores.catAnswered", { answered: cat.answered })} />
          </dl>
        </div>
      </aside>
    </div>
  );
}

function PatientChip({ patient }: { patient: PatientSummary }) {
  const t = useTranslations();
  return (
    <div className="flex items-center gap-3 rounded-lg border border-border bg-surface p-3">
      <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary-soft text-primary-soft-foreground">
        <UserRound className="size-5" aria-hidden="true" />
      </span>
      <span className="min-w-0">
        <span className="block truncate font-medium">{patient.fullName}</span>
        <span className="block text-sm text-muted-foreground">
          {t(`sex.${patient.sex}`)} · {patient.pseudoId}
        </span>
      </span>
    </div>
  );
}

type Setter = <K extends keyof WizardState>(key: K, value: WizardState[K]) => void;
type ErrFn = (path: string) => string | undefined;

function PatientStep({ state, set, err, age }: { state: WizardState; set: Setter; err: ErrFn; age: number | null }) {
  const t = useTranslations();
  return (
    <>
      {state.existing ? (
        <div className="flex flex-wrap items-center gap-3">
          <PatientChip patient={state.existing} />
          {age !== null ? <Badge tone="neutral">{t("common.yearsOld", { age })}</Badge> : null}
        </div>
      ) : (
        <div className="grid gap-5 md:grid-cols-2">
          <Field label={t("assessment.patient.fullName")} error={err("patient.fullName")} required className="md:col-span-2">
            <Input value={state.fullName} onChange={(e) => set("fullName", e.target.value)} placeholder={t("assessment.patient.fullNamePlaceholder")} autoComplete="off" />
          </Field>
          <Field label={t("assessment.patient.birthDate")} error={err("patient.birthDate")} hint={age !== null ? t("common.yearsOld", { age }) : undefined} required>
            <Input type="date" value={state.birthDate} onChange={(e) => set("birthDate", e.target.value)} max={todayInClinic()} min="1900-01-01" />
          </Field>
          <Field label={t("assessment.patient.phone")} optionalText={t("common.optional")}>
            <Input type="tel" inputMode="tel" value={state.phone} onChange={(e) => set("phone", e.target.value)} placeholder={t("assessment.patient.phonePlaceholder")} autoComplete="off" />
          </Field>
          <Field label={t("assessment.patient.sex")} as="legend" error={err("patient.sex")} required className="md:col-span-2">
            <RadioGroup value={state.sex} onValueChange={(v) => set("sex", v as "male")} className="grid-cols-2 sm:max-w-sm">
              <RadioCard value="male" title={t("sex.male")} />
              <RadioCard value="female" title={t("sex.female")} />
            </RadioGroup>
          </Field>
        </div>
      )}
      <div className="grid gap-5 md:grid-cols-2">
        <Field label={t("assessment.patient.height")} error={err("heightCm")} required>
          <Input inputMode="decimal" value={state.heightCm} onChange={(e) => set("heightCm", e.target.value)} unit={t("common.cm")} />
        </Field>
        <Field label={t("assessment.patient.weight")} error={err("weightKg")} optionalText={t("common.optional")}>
          <Input inputMode="decimal" value={state.weightKg} onChange={(e) => set("weightKg", e.target.value)} unit={t("common.kg")} />
        </Field>
      </div>
      {state.existing ? null : (
        <div className="flex flex-col gap-1 rounded-lg border border-border bg-surface-muted/50 p-4">
          <label className="flex min-h-11 cursor-pointer items-start gap-3">
            <Checkbox checked={state.consent} onCheckedChange={(v) => set("consent", v === true)} className="mt-0.5" aria-describedby="consent-hint" />
            <span className="text-[0.9375rem] font-medium">{t("assessment.patient.consent")}</span>
          </label>
          <p id="consent-hint" className="pl-8 text-sm text-muted-foreground">
            {t("assessment.patient.consentHint")}
          </p>
        </div>
      )}
    </>
  );
}

function ExposuresStep({ state, set, err, packYears }: { state: WizardState; set: Setter; err: ErrFn; packYears: number | null }) {
  const t = useTranslations("assessment.exposures");
  const tc = useTranslations("common");
  const format = useFormatter();
  const smokes = state.smokingStatus === "former" || state.smokingStatus === "current";
  return (
    <>
      <Field label={t("smokingStatus")} as="legend" error={err("smoking.status")} required>
        <RadioGroup value={state.smokingStatus} onValueChange={(v) => set("smokingStatus", v as "never")} className="sm:grid-cols-3">
          {(["never", "former", "current"] as const).map((s) => (
            <RadioCard key={s} value={s} title={t(`smoking.${s}`)} />
          ))}
        </RadioGroup>
      </Field>
      {smokes ? (
        <div className="grid gap-5 rounded-lg border border-border bg-surface-muted/40 p-4 md:grid-cols-3">
          <Field label={t("cigarettesPerDay")} error={err("smoking.cigarettesPerDay")} required>
            <Input inputMode="numeric" value={state.cigarettesPerDay} onChange={(e) => set("cigarettesPerDay", e.target.value)} />
          </Field>
          <Field label={t("yearsSmoked")} error={err("smoking.yearsSmoked")} required>
            <Input inputMode="numeric" value={state.yearsSmoked} onChange={(e) => set("yearsSmoked", e.target.value)} unit={tc("years")} />
          </Field>
          <div className="flex flex-col justify-end gap-1" aria-live="polite">
            <span className="text-sm font-medium text-muted-foreground">{t("packYears")}</span>
            <span className="tabular text-metric text-foreground">{packYears === null ? "—" : format.number(packYears, "one")}</span>
          </div>
          <p className="text-sm text-muted-foreground md:col-span-3">{t("packYearsHint")}</p>
        </div>
      ) : null}

      <ExposureBlock
        label={t("biomass")}
        hint={t("biomassHint")}
        yesNo={state.biomass}
        onYesNo={(v) => set("biomass", v)}
        years={state.biomassYears}
        onYears={(v) => set("biomassYears", v)}
        yearsLabel={t("biomassYears")}
        error={err("biomass.exposed")}
        yearsError={err("biomass.years")}
        name="biomass"
      />
      <ExposureBlock
        label={t("occupational")}
        hint={t("occupationalHint")}
        yesNo={state.occupational}
        onYesNo={(v) => set("occupational", v)}
        years={state.occupationalYears}
        onYears={(v) => set("occupationalYears", v)}
        yearsLabel={t("occupationalYears")}
        error={err("occupational.exposed")}
        yearsError={err("occupational.years")}
        name="occupational"
      />
    </>
  );
}

function ExposureBlock(props: {
  label: string;
  hint: string;
  yesNo: WizardState["biomass"];
  onYesNo: (v: WizardState["biomass"]) => void;
  years: string;
  onYears: (v: string) => void;
  yearsLabel: string;
  error?: string;
  yearsError?: string;
  name: string;
}) {
  const tc = useTranslations("common");
  return (
    <div className="flex flex-col gap-4">
      <YesNoQuestion name={props.name} label={props.label} hint={props.hint} value={props.yesNo} onChange={props.onYesNo} error={props.error} />
      {props.yesNo === "yes" ? (
        <Field label={props.yearsLabel} error={props.yearsError} optionalText={tc("optional")} className="sm:max-w-xs">
          <Input inputMode="numeric" value={props.years} onChange={(e) => props.onYears(e.target.value)} unit={tc("years")} />
        </Field>
      ) : null}
    </div>
  );
}

function ScoresStep({
  state,
  setState,
  err,
  errors,
  setErrors,
  total,
}: {
  state: WizardState;
  setState: React.Dispatch<React.SetStateAction<WizardState>>;
  err: ErrFn;
  errors: Errors;
  setErrors: React.Dispatch<React.SetStateAction<Errors>>;
  total: ReturnType<typeof catTotal>;
}) {
  const t = useTranslations("assessment.scores");
  const catError = CAT_ITEM_KEYS.some((k) => errors[`catItems.${k}`]);
  const clear = (path: string) =>
    setErrors((e) => {
      if (!(path in e)) return e;
      const n = { ...e };
      delete n[path];
      return n;
    });
  return (
    <>
      <Field label={t("mmrc")} as="legend" error={err("mmrc")} required>
        <RadioGroup
          value={state.mmrc}
          onValueChange={(v) => {
            setState((s) => ({ ...s, mmrc: v }));
            clear("mmrc");
          }}
        >
          {MMRC_GRADES.map((g) => (
            <RadioCard key={g} value={String(g)} marker={g} title={t(`mmrcOptions.${g}`)} />
          ))}
        </RadioGroup>
      </Field>

      <fieldset className="flex flex-col gap-3" aria-describedby="cat-status">
        <legend className="mb-1 flex w-full flex-wrap items-baseline justify-between gap-2 text-sm font-medium">
          <span>
            {t("cat")}
            <span aria-hidden="true" className="text-destructive">
              {" "}*
            </span>
          </span>
          <span id="cat-status" className={cn("tabular text-base font-semibold", total.complete ? "text-foreground" : "text-muted-foreground")} aria-live="polite">
            {total.complete ? t("catTotal", { total: total.total }) : t("catAnswered", { answered: total.answered })}
          </span>
        </legend>
        {CAT_ITEM_KEYS.map((key, i) => (
          <CatItemQuestion
            key={key}
            index={i + 1}
            name={`cat-${key}`}
            left={t(`catItems.${key}.left`)}
            right={t(`catItems.${key}.right`)}
            value={state.cat[key]}
            invalid={Boolean(errors[`catItems.${key}`])}
            onChange={(v) => {
              setState((s) => ({ ...s, cat: { ...s.cat, [key]: v } }));
              clear(`catItems.${key}`);
            }}
          />
        ))}
        {catError ? (
          <p role="alert" className="text-sm font-medium text-destructive">
            {err(`catItems.${CAT_ITEM_KEYS.find((k) => errors[`catItems.${k}`])}`)}
          </p>
        ) : null}
        <Alert tone="info" className="text-sm">
          {t("catLicenseNote")}
        </Alert>
      </fieldset>
    </>
  );
}

