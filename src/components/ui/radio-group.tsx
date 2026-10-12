"use client";

import { RadioGroup as RadioGroupPrimitive } from "radix-ui";
import type * as React from "react";
import { cn } from "@/lib/utils";
import { useFieldControl } from "./field";

export function RadioGroup({ className, ...props }: React.ComponentProps<typeof RadioGroupPrimitive.Root>) {
  const field = useFieldControl();
  return (
    <RadioGroupPrimitive.Root
      aria-describedby={field?.describedBy}
      aria-invalid={field?.invalid || undefined}
      aria-required={field?.required || undefined}
      className={cn("grid gap-2", className)}
      {...props}
    />
  );
}

interface RadioCardProps extends Omit<React.ComponentProps<typeof RadioGroupPrimitive.Item>, "title"> {
  title: React.ReactNode;
  description?: React.ReactNode;
  /** Leading badge, e.g. the score "2" for questionnaire options. */
  marker?: React.ReactNode;
}

/**
 * Large, card-style radio option for questionnaires (mMRC, CAT, yes/no):
 * whole card is the tap target (≥ 48 px), selection shown by border, fill
 * AND a check dot — never colour alone.
 */
export function RadioCard({ className, title, description, marker, ...props }: RadioCardProps) {
  return (
    <RadioGroupPrimitive.Item
      className={cn(
        "group flex min-h-12 w-full items-start gap-3 rounded-lg border border-input bg-surface p-3.5 text-left shadow-xs transition-colors",
        "hover:border-primary/60 hover:bg-primary-soft/40",
        "data-[state=checked]:border-primary data-[state=checked]:bg-primary-soft data-[state=checked]:ring-1 data-[state=checked]:ring-primary",
        "disabled:cursor-not-allowed disabled:opacity-50",
        className,
      )}
      {...props}
    >
      <span
        aria-hidden="true"
        className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full border-2 border-input bg-surface group-data-[state=checked]:border-primary"
      >
        <RadioGroupPrimitive.Indicator className="size-2.5 rounded-full bg-primary" />
      </span>
      {marker !== undefined ? (
        <span className="tabular flex h-6 min-w-6 shrink-0 items-center justify-center rounded-md bg-surface-muted px-1.5 text-sm font-semibold text-foreground group-data-[state=checked]:bg-primary group-data-[state=checked]:text-primary-foreground">
          {marker}
        </span>
      ) : null}
      <span className="flex min-w-0 flex-col gap-0.5">
        <span className="text-[0.9375rem] font-medium leading-snug text-foreground">{title}</span>
        {description ? <span className="text-sm text-muted-foreground">{description}</span> : null}
      </span>
    </RadioGroupPrimitive.Item>
  );
}
