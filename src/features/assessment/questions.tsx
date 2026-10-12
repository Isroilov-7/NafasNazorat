"use client";

import { useTranslations } from "next-intl";
import { RadioGroup as RadioGroupPrimitive } from "radix-ui";
import { Field } from "@/components/ui/field";
import { RadioCard, RadioGroup } from "@/components/ui/radio-group";
import { cn } from "@/lib/utils";
import type { YesNo } from "./wizard-state";

/** Yes/No question as two large cards (≥ 48 px tap targets). */
export function YesNoQuestion({
  label,
  hint,
  value,
  onChange,
  error,
  name,
}: {
  label: string;
  hint?: string;
  value: YesNo;
  onChange: (v: YesNo) => void;
  error?: string;
  name: string;
}) {
  const t = useTranslations("common");
  return (
    <Field label={label} hint={hint} error={error} as="legend" required>
      <RadioGroup name={name} value={value} onValueChange={(v) => onChange(v as YesNo)} className="grid-cols-2 sm:max-w-sm" data-field={name}>
        <RadioCard value="yes" title={t("yes")} />
        <RadioCard value="no" title={t("no")} />
      </RadioGroup>
    </Field>
  );
}

/**
 * One CAT item: 0–5 scale anchored by two opposite statements. Rendered as a
 * radio group of six square buttons (keyboard: arrow keys), with the anchors
 * above on phones and on either side on wider screens.
 */
export function CatItemQuestion({
  index,
  left,
  right,
  value,
  onChange,
  name,
  invalid,
}: {
  index: number;
  left: string;
  right: string;
  value: string;
  onChange: (v: string) => void;
  name: string;
  invalid?: boolean;
}) {
  const t = useTranslations("assessment.scores");
  const labelId = `${name}-label`;
  return (
    <div
      className={cn(
        "grid gap-3 rounded-lg border bg-surface p-4 md:grid-cols-[1fr_auto_1fr] md:items-center",
        invalid ? "border-destructive" : "border-border",
      )}
      data-field={name}
    >
      <p id={labelId} className="sr-only">
        {t("catItemLabel", { index })}: {left} — {right}
      </p>
      <p className="text-sm text-foreground md:text-right">
        <span className="mr-2 font-semibold text-muted-foreground">{index}.</span>
        {left}
      </p>
      <RadioGroupPrimitive.Root
        aria-labelledby={labelId}
        aria-invalid={invalid || undefined}
        value={value}
        onValueChange={onChange}
        orientation="horizontal"
        className="flex justify-between gap-1.5 md:justify-center"
      >
        {[0, 1, 2, 3, 4, 5].map((n) => (
          <RadioGroupPrimitive.Item
            key={n}
            value={String(n)}
            className={cn(
              "tabular flex size-11 items-center justify-center rounded-md border border-input bg-surface text-base font-semibold text-foreground shadow-xs transition-colors sm:size-12",
              "hover:border-primary hover:bg-primary-soft/50",
              "data-[state=checked]:border-primary data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground",
            )}
          >
            {n}
          </RadioGroupPrimitive.Item>
        ))}
      </RadioGroupPrimitive.Root>
      <p className="text-sm text-foreground">{right}</p>
    </div>
  );
}
