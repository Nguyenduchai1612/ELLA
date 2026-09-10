import type { ButtonHTMLAttributes, ReactNode } from "react";

type ButtonVariant = "primary" | "secondary" | "outline" | "ghost" | "danger";
type ButtonSize = "sm" | "md" | "lg";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  isLoading?: boolean;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
}

const VARIANT_CLASSES: Record<ButtonVariant, string> = {
  primary: "bg-neutral-900 text-neutral-50 hover:bg-neutral-800 disabled:bg-neutral-300",
  secondary: "bg-rose-500 text-white hover:bg-rose-600 disabled:bg-rose-200",
  outline:
    "border border-neutral-300 text-neutral-900 hover:border-neutral-900 disabled:border-neutral-200 disabled:text-neutral-400",
  ghost: "text-neutral-700 hover:bg-neutral-100 disabled:text-neutral-300",
  danger: "border border-error-500 text-error-500 hover:bg-error-50 disabled:border-neutral-200 disabled:text-neutral-400",
};

const SIZE_CLASSES: Record<ButtonSize, string> = {
  sm: "h-9 px-3 text-sm",
  md: "h-11 px-5 text-sm",
  lg: "h-13 px-6 text-base",
};

/**
 * Section 36: the one reusable button — every CTA in the storefront goes
 * through this rather than one-off `<button className="...">` markup.
 * Handles the double-submit prevention pattern from Section 17/35: pass
 * `isLoading` and the button disables + shows a spinner automatically.
 */
export function Button({
  variant = "primary",
  size = "md",
  isLoading = false,
  leftIcon,
  rightIcon,
  disabled,
  children,
  className = "",
  ...rest
}: ButtonProps) {
  return (
    <button
      className={`inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full font-medium transition-colors disabled:cursor-not-allowed ${VARIANT_CLASSES[variant]} ${SIZE_CLASSES[size]} ${className}`}
      disabled={disabled || isLoading}
      aria-busy={isLoading}
      {...rest}
    >
      {isLoading ? (
        <span
          className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent"
          aria-hidden="true"
        />
      ) : (
        leftIcon
      )}
      {children}
      {!isLoading && rightIcon}
    </button>
  );
}
