"use client";

import { ChevronDown } from "lucide-react";
import type * as React from "react";
import { cn } from "@/lib/utils";
import { useFieldControl } from "./field";
import { controlClasses } from "./input";

/**
 * Styled native <select>. Deliberately native (not a custom listbox): on clinic
 * tablets/phones it opens the OS picker, works with any assistive tech, needs
 * no JS to submit in a <form>, and has no portal/hydration edge cases.
 */
export function Select({ className, id, children, ...props }: React.ComponentProps<"select">) {
  const field = useFieldControl();
  return (
    <div className="relative">
      <select
        id={id ?? field?.id}
        aria-describedby={props["aria-describedby"] ?? field?.describedBy}
        aria-invalid={props["aria-invalid"] ?? (field?.invalid || undefined)}
        required={props.required ?? field?.required}
        className={cn(controlClasses, "cursor-pointer appearance-none pr-10", className)}
        {...props}
      >
        {children}
      </select>
      <ChevronDown
        className="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 text-muted-foreground"
        aria-hidden="true"
      />
    </div>
  );
}
