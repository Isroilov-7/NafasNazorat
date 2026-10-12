"use client";

import { createContext, useContext, useId } from "react";
import type * as React from "react";
import { cn } from "@/lib/utils";

interface FieldContextValue {
  id: string;
  describedBy: string | undefined;
  invalid: boolean;
  required: boolean;
}

const FieldContext = createContext<FieldContextValue | null>(null);

/** Controls (Input, SelectTrigger, RadioGroup…) read their id + ARIA wiring from the nearest Field. */
export function useFieldControl() {
  return useContext(FieldContext);
}

export interface FieldProps {
  label: React.ReactNode;
  hint?: React.ReactNode;
  error?: React.ReactNode;
  required?: boolean;
  /** Visually smaller label for dense layouts. */
  className?: string;
  /** Use "legend" for radio groups so the label names the whole group. */
  as?: "label" | "legend";
  children: React.ReactNode;
  /** Text appended after the label, e.g. a unit "(sm)". */
  labelSuffix?: React.ReactNode;
  optionalText?: React.ReactNode;
}

export function Field({ label, hint, error, required = false, className, as = "label", children, labelSuffix, optionalText }: FieldProps) {
  const id = useId();
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  const describedBy = [hintId, errorId].filter(Boolean).join(" ") || undefined;
  const labelContent = (
    <>
      {label}
      {labelSuffix ? <span className="font-normal text-muted-foreground"> {labelSuffix}</span> : null}
      {required ? (
        <span aria-hidden="true" className="text-destructive">
          {" "}*
        </span>
      ) : optionalText ? (
        <span className="font-normal text-muted-foreground"> · {optionalText}</span>
      ) : null}
    </>
  );
  const Wrapper = as === "legend" ? "fieldset" : "div";
  return (
    <FieldContext value={{ id, describedBy, invalid: Boolean(error), required }}>
      <Wrapper className={cn("flex min-w-0 flex-col gap-2", className)} aria-describedby={as === "legend" ? describedBy : undefined}>
        {as === "legend" ? (
          <legend className="mb-2 text-sm font-medium text-foreground">{labelContent}</legend>
        ) : (
          <label htmlFor={id} className="text-sm font-medium text-foreground">
            {labelContent}
          </label>
        )}
        {children}
        {hint ? (
          <p id={hintId} className="text-sm text-muted-foreground">
            {hint}
          </p>
        ) : null}
        {error ? (
          <p id={errorId} role="alert" className="text-sm font-medium text-destructive">
            {error}
          </p>
        ) : null}
      </Wrapper>
    </FieldContext>
  );
}
