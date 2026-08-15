import React from "react";

interface BadgeProps {
  children: React.ReactNode;
  variant?: "emerald" | "blue" | "purple" | "amber" | "red" | "neutral";
  size?: "sm" | "md";
  className?: string;
}

export function Badge({ children, variant = "neutral", size = "sm", className = "" }: BadgeProps) {
  let colorStyle = "bg-white/5 text-gray-300 border-white/10";
  if (variant === "emerald") colorStyle = "bg-emerald-500/10 text-emerald-300 border-emerald-500/20";
  else if (variant === "blue") colorStyle = "bg-blue-500/10 text-blue-300 border-blue-500/20";
  else if (variant === "purple") colorStyle = "bg-purple-500/10 text-purple-300 border-purple-500/20";
  else if (variant === "amber") colorStyle = "bg-amber-500/10 text-amber-300 border-amber-500/20";
  else if (variant === "red") colorStyle = "bg-red-500/10 text-red-300 border-red-500/20";

  const sizeStyle = size === "sm" ? "px-2 py-0.5 text-[11px]" : "px-3 py-1 text-xs";

  return (
    <span
      className={`inline-flex items-center gap-1.5 font-medium rounded-full border ${sizeStyle} ${colorStyle} ${className}`}
    >
      {children}
    </span>
  );
}
