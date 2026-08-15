import React from "react";

interface SkeletonProps {
  className?: string;
  count?: number;
}

export function Skeleton({ className = "h-4 w-full", count = 1 }: SkeletonProps) {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className={`rounded-lg bg-white/5 animate-pulse ${className}`}
        />
      ))}
    </>
  );
}

export function CardSkeleton() {
  return (
    <div className="glass-card p-6 rounded-2xl bg-white/[0.02] border border-white/5 space-y-4">
      <Skeleton className="h-5 w-1/3" />
      <Skeleton className="h-8 w-2/3" />
      <Skeleton className="h-4 w-full" count={3} />
    </div>
  );
}
