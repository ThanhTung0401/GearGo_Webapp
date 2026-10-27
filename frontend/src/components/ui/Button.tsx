import React from "react";

export type ButtonVariant = "primary" | "secondary" | "danger" | "ghost" | "outline";
export type ButtonSize = "sm" | "md" | "lg";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  isLoading?: boolean;
  iconLeft?: React.ReactNode;
  iconRight?: React.ReactNode;
}

export default function Button({
  children,
  variant = "primary",
  size = "md",
  isLoading = false,
  iconLeft,
  iconRight,
  className = "",
  disabled,
  ...props
}: ButtonProps) {
  // Base classes
  const baseStyles = "inline-flex items-center justify-center font-semibold rounded-xl transition-all duration-200 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed select-none";

  // Size classes
  const sizeStyles = {
    sm: "px-3 py-1.5 text-xs gap-1.5",
    md: "px-4 py-2 text-sm gap-2",
    lg: "px-5 py-2.5 text-base gap-2.5",
  }[size];

  // Variant classes
  const variantStyles = {
    primary: "bg-gradient-to-r from-[var(--color-amber)] to-[#D46931] text-white shadow-xs hover:brightness-105 active:scale-[0.98]",
    secondary: "bg-[var(--color-parchment)] text-[var(--color-bark)] hover:bg-[#EAE6DF] active:scale-[0.98]",
    danger: "bg-rose-600 text-white hover:bg-rose-700 active:scale-[0.98]",
    ghost: "bg-transparent text-[var(--color-bark)] hover:bg-black/5 active:bg-black/10",
    outline: "border border-[var(--color-bone)] bg-white text-[var(--color-bark)] hover:bg-gray-50 active:scale-[0.98]",
  }[variant];

  return (
    <button
      className={`${baseStyles} ${sizeStyles} ${variantStyles} ${className}`}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading ? (
        <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin mr-1" />
      ) : iconLeft}
      {children}
      {!isLoading && iconRight}
    </button>
  );
}
