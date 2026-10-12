"use client";

import { Toaster as Sonner } from "sonner";

/** App-wide toast outlet (aria-live region handled by sonner). Use `toast()` from "sonner". */
export function Toaster() {
  return (
    <Sonner
      position="top-center"
      closeButton
      toastOptions={{
        classNames: {
          toast: "!rounded-lg !border !border-border !bg-surface !text-foreground !shadow-lg !text-[0.9375rem]",
          description: "!text-muted-foreground",
          success: "[&_[data-icon]]:!text-risk-low",
          error: "!border-risk-high-border [&_[data-icon]]:!text-risk-high",
          warning: "!border-risk-medium-border [&_[data-icon]]:!text-risk-medium",
        },
      }}
    />
  );
}
