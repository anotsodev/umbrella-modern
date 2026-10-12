// Button primitive. Four variants cover every call site in the app
// today; the `as` prop lets a caller render a <Link> when the
// action is navigation and a <button> when it's a click handler.
// Colors flow from the role-based tokens in app/globals.css so a
// future theme picker slots in cleanly.

import Link from "next/link";
import type { ComponentPropsWithoutRef, ReactNode } from "react";

type Variant = "primary" | "secondary" | "ghost" | "success" | "warn";
type Size = "sm" | "md";

const BASE =
  "inline-flex items-center justify-center gap-1.5 rounded-md font-medium " +
  "transition-colors focus:outline-none focus-visible:ring-2 " +
  "focus-visible:ring-focus-ring focus-visible:ring-offset-2 " +
  "focus-visible:ring-offset-bg disabled:cursor-not-allowed disabled:opacity-50";

const SIZE: Record<Size, string> = {
  sm: "px-2.5 py-1 text-xs",
  md: "px-4 py-2 text-sm",
};

const VARIANT: Record<Variant, string> = {
  primary:
    "bg-accent text-accent-fg hover:bg-accent-hover",
  secondary:
    "border border-line-strong bg-surface text-fg hover:bg-surface-sunken " +
    "dark:border-line",
  ghost:
    "text-fg-muted hover:bg-surface-sunken hover:text-fg",
  success:
    "bg-success text-success-fg hover:bg-success-hover",
  warn:
    "bg-warn text-warn-fg hover:bg-warn-hover",
};

type CommonProps = {
  variant?: Variant;
  size?: Size;
  className?: string;
  children: ReactNode;
};

type LinkButtonProps = CommonProps & {
  as: "link";
  href: string;
  prefetch?: boolean;
};

type NativeButtonProps = CommonProps &
  Omit<ComponentPropsWithoutRef<"button">, "className" | "children"> & {
  as?: "button";
};

export function Button(props: LinkButtonProps | NativeButtonProps) {
  const { variant = "primary", size = "md", className = "" } = props;
  const classes = `${BASE} ${SIZE[size]} ${VARIANT[variant]} ${className}`.trim();

  if (props.as === "link") {
    return (
      <Link href={props.href} prefetch={props.prefetch} className={classes}>
        {props.children}
      </Link>
    );
  }

  // Native button case: every prop other than the styling ones above
  // is a native button attribute (type, onClick, disabled, ...).
  // Pass them through with a `type` default of "button" so a stray
  // <Button> inside a <form> never accidentally submits it.
  const { children, type, ...buttonProps } = props as NativeButtonProps & {
    type?: "button" | "submit" | "reset";
  };
  return (
    <button type={type ?? "button"} className={classes} {...buttonProps}>
      {children}
    </button>
  );
}
