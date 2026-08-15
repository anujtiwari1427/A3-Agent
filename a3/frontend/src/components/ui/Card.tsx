import React, { forwardRef } from "react";

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  className?: string;
  glow?: "emerald" | "blue" | "purple" | "none";
}

export const Card = forwardRef<HTMLDivElement, CardProps>(
  ({ children, className = "", glow = "none", ...props }, ref) => {
    let glowStyle = "";
    if (glow === "emerald")
      glowStyle = "shadow-[0_0_40px_rgba(52,211,153,0.06)] border-[rgba(52,211,153,0.2)]";
    else if (glow === "blue")
      glowStyle = "shadow-[0_0_40px_rgba(96,165,250,0.06)] border-[rgba(96,165,250,0.2)]";
    else if (glow === "purple")
      glowStyle = "shadow-[0_0_40px_rgba(167,139,250,0.06)] border-[rgba(167,139,250,0.2)]";

    return (
      <div
        ref={ref}
        className={`glass-card p-5 rounded-2xl bg-[rgba(15,20,35,0.6)] border border-white/5 backdrop-blur-xl ${glowStyle} ${className}`}
        {...props}
      >
        {children}
      </div>
    );
  }
);

Card.displayName = "Card";
