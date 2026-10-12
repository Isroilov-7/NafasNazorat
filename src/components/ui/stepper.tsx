import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

export interface StepperStep {
  id: string;
  label: string;
}

interface StepperProps {
  steps: StepperStep[];
  /** 0-based index of the active step. */
  current: number;
  /** Accessible name of the whole stepper, e.g. "Baholash bosqichlari". */
  label: string;
  /** Translated "Step 2 of 5" text (shown on small screens, announced to SR). */
  progressText: string;
  /** Lets users jump back to a completed step. Omit to make steps non-interactive. */
  onStepSelect?: (index: number) => void;
  className?: string;
}

/**
 * Progress indicator for multi-step flows. Desktop/tablet: full labelled
 * track. Phone: compact "Step 2 of 5 · Label" + progress bar. State is shown
 * by number/check icon + text weight + colour (never colour alone).
 */
export function Stepper({ steps, current, label, progressText, onStepSelect, className }: StepperProps) {
  const pct = steps.length > 1 ? (current / (steps.length - 1)) * 100 : 100;
  return (
    <nav aria-label={label} className={cn("w-full", className)}>
      <div className="sm:hidden">
        <p className="text-sm font-medium text-foreground">
          {progressText} · <span className="text-primary">{steps[current]?.label}</span>
        </p>
        <div
          className="mt-2 h-2 overflow-hidden rounded-full bg-surface-muted"
          role="progressbar"
          aria-valuemin={1}
          aria-valuemax={steps.length}
          aria-valuenow={current + 1}
          aria-valuetext={progressText}
        >
          <div className="h-full rounded-full bg-primary transition-[width]" style={{ width: `${Math.max(pct, 6)}%` }} />
        </div>
      </div>
      <ol className="hidden items-center gap-2 sm:flex">
        {steps.map((step, i) => {
          const state = i < current ? "complete" : i === current ? "current" : "upcoming";
          const clickable = Boolean(onStepSelect) && state === "complete";
          const content = (
            <>
              <span
                aria-hidden="true"
                className={cn(
                  "tabular flex size-8 shrink-0 items-center justify-center rounded-full border-2 text-sm font-semibold",
                  state === "complete" && "border-primary bg-primary text-primary-foreground",
                  state === "current" && "border-primary bg-primary-soft text-primary-soft-foreground",
                  state === "upcoming" && "border-input bg-surface text-muted-foreground",
                )}
              >
                {state === "complete" ? <Check className="size-4" strokeWidth={3} /> : i + 1}
              </span>
              <span
                className={cn(
                  "truncate text-sm",
                  state === "current" ? "font-semibold text-foreground" : "text-muted-foreground max-xl:sr-only",
                )}
              >
                {step.label}
              </span>
            </>
          );
          return (
            <li key={step.id} className="flex min-w-0 flex-1 items-center gap-2 last:flex-none">
              {clickable ? (
                <button
                  type="button"
                  onClick={() => onStepSelect?.(i)}
                  className="flex min-h-11 min-w-0 items-center gap-2 rounded-md pr-1 hover:text-foreground"
                  aria-label={step.label}
                >
                  {content}
                </button>
              ) : (
                <span className="flex min-h-11 min-w-0 items-center gap-2" aria-current={state === "current" ? "step" : undefined} title={step.label}>
                  {content}
                </span>
              )}
              {i < steps.length - 1 ? (
                <span aria-hidden="true" className={cn("h-0.5 min-w-4 flex-1 rounded-full", i < current ? "bg-primary" : "bg-border")} />
              ) : null}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
