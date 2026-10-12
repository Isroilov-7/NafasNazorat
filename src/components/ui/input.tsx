"use client";

import type * as React from "react";
import { cn } from "@/lib/utils";
import { useFieldControl } from "./field";

export const controlClasses = cn(
  "h-11 w-full min-w-0 rounded-md border border-input bg-surface px-3 text-base text-foreground shadow-xs",
  "placeholder:text-muted-foreground/80 transition-colors",
  "focus-visible:border-primary focus-visible:outline-3 focus-visible:outline-offset-0 focus-visible:outline-ring/35",
  "disabled:cursor-not-allowed disabled:bg-surface-muted disabled:opacity-70",
  "aria-invalid:border-destructive aria-invalid:outline-destructive/30",
);

export interface InputProps extends React.ComponentProps<"input"> {
  /** Unit shown inside the field on the right, e.g. "L", "sm". */
  unit?: React.ReactNode;
}

export function Input({ className, unit, id, ...props }: InputProps) {
  const field = useFieldControl();
  const input = (
    <input
      data-slot="input"
      id={id ?? field?.id}
      aria-describedby={props["aria-describedby"] ?? field?.describedBy}
      aria-invalid={props["aria-invalid"] ?? (field?.invalid || undefined)}
      required={props.required ?? field?.required}
      className={cn(controlClasses, unit && "pr-12", className)}
      {...props}
    />
  );
  if (!unit) return input;
  return (
    <div className="relative">
      {input}
      <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-sm text-muted-foreground">
        {unit}
      </span>
    </div>
  );
}
