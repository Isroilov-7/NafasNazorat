import { type VariantProps, cva } from "class-variance-authority";
import { Slot } from "radix-ui";
import type * as React from "react";
import { cn } from "@/lib/utils";

export const buttonVariants = cva(
  [
    "inline-flex shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-md font-medium",
    "transition-colors select-none disabled:pointer-events-none disabled:opacity-50",
    "[&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4.5",
  ],
  {
    variants: {
      variant: {
        primary: "bg-primary text-primary-foreground shadow-xs hover:bg-primary-hover",
        secondary: "bg-primary-soft text-primary-soft-foreground hover:bg-primary-soft/70",
        outline: "border border-input bg-surface text-foreground shadow-xs hover:bg-surface-muted",
        ghost: "text-foreground hover:bg-surface-muted",
        destructive: "bg-destructive text-destructive-foreground shadow-xs hover:bg-destructive/90",
        link: "h-auto px-0 text-primary underline-offset-4 hover:underline",
      },
      // md/lg meet the 44×44 px minimum tap target (WCAG 2.5.5 / clinic tablets).
      size: {
        sm: "h-9 px-3 text-sm",
        md: "h-11 px-4 text-[0.9375rem]",
        lg: "h-12 px-6 text-base",
        icon: "size-11",
      },
    },
    defaultVariants: { variant: "primary", size: "md" },
  },
);

export interface ButtonProps extends React.ComponentProps<"button">, VariantProps<typeof buttonVariants> {
  /** Render as the child element (e.g. a Next <Link>) while keeping button styles. */
  asChild?: boolean;
}

export function Button({ className, variant, size, asChild = false, type, ...props }: ButtonProps) {
  const Comp = asChild ? Slot.Root : "button";
  return (
    <Comp
      data-slot="button"
      className={cn(buttonVariants({ variant, size }), className)}
      {...(asChild ? {} : { type: type ?? "button" })}
      {...props}
    />
  );
}
