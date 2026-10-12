import type * as React from "react";
import { cn } from "@/lib/utils";

interface StatProps {
  label: React.ReactNode;
  value: React.ReactNode;
  unit?: React.ReactNode;
  /** Secondary line: reference, LLN, % predicted… */
  detail?: React.ReactNode;
  /** Emphasis for the key clinical number on a screen. */
  emphasis?: boolean;
  tone?: "default" | "low" | "medium" | "high";
  className?: string;
}

/** Metric block for clinical numbers (FEV1/FVC, CAT, pack-years…). Uses tabular figures. */
export function Stat({ label, value, unit, detail, emphasis = false, tone = "default", className }: StatProps) {
  return (
    <div
      className={cn(
        "flex min-w-0 flex-col gap-1 rounded-lg border border-border bg-surface p-4",
        tone === "low" && "border-risk-low-border bg-risk-low-bg/50",
        tone === "medium" && "border-risk-medium-border bg-risk-medium-bg/50",
        tone === "high" && "border-risk-high-border bg-risk-high-bg/50",
        className,
      )}
    >
      <dt className="text-sm font-medium text-muted-foreground">{label}</dt>
      <dd className="flex items-baseline gap-1.5">
        <span className={cn("tabular text-foreground", emphasis ? "text-display" : "text-metric")}>{value}</span>
        {unit ? <span className="text-sm text-muted-foreground">{unit}</span> : null}
      </dd>
      {detail ? <dd className="text-sm text-muted-foreground">{detail}</dd> : null}
    </div>
  );
}

export function StatGrid({ className, ...props }: React.ComponentProps<"dl">) {
  return <dl className={cn("grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3", className)} {...props} />;
}
