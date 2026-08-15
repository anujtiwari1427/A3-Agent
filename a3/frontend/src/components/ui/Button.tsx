import React from "react";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "danger" | "ghost" | "outline";
  size?: "sm" | "md" | "lg";
  loading?: boolean;
  children: React.ReactNode;
}

export function Button({
  variant = "primary",
  size = "md",
  loading = false,
  children,
  className = "",
  disabled,
  ...props
}: ButtonProps) {
  let variantClass = "";
  if (variant === "primary") {
    variantClass =
      "bg-gradient-to-r from-[var(--accent-emerald)] to-emerald-400 text-black font-semibold shadow-lg shadow-emerald-500/10 hover:brightness-110 active:scale-[0.98]";
  } else if (variant === "secondary") {
    variantClass =
      "bg-white/5 hover:bg-white/10 text-white border border-white/10 active:scale-[0.98]";
  } else if (variant === "danger") {
    variantClass =
      "bg-red-500/15 hover:bg-red-500/25 text-red-300 border border-red-500/30 active:scale-[0.98]";
  } else if (variant === "outline") {
    variantClass =
      "bg-transparent hover:bg-white/5 text-[var(--text-secondary)] hover:text-white border border-white/10 active:scale-[0.98]";
  } else if (variant === "ghost") {
    variantClass =
      "bg-transparent hover:bg-white/5 text-[var(--text-secondary)] hover:text-white";
  }

  let sizeClass = "px-4 py-2 text-sm";
  if (size === "sm") sizeClass = "px-2.5 py-1.5 text-xs";
  else if (size === "lg") sizeClass = "px-6 py-3 text-base";

  return (
    <button
      disabled={disabled || loading}
      className={`inline-flex items-center justify-center gap-2 rounded-xl transition-all duration-200 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${sizeClass} ${variantClass} ${className}`}
      {...props}
    >
      {loading && (
        <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin shrink-0" />
      )}
      {children}
    </button>
  );
}
