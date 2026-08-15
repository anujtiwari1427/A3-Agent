"use client";

import React, { useEffect } from "react";

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  maxWidth?: "sm" | "md" | "lg" | "xl" | "2xl";
}

export function Modal({
  isOpen,
  onClose,
  title,
  children,
  maxWidth = "lg",
}: ModalProps) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    if (isOpen) {
      document.body.style.overflow = "hidden";
      window.addEventListener("keydown", handleKeyDown);
    }
    return () => {
      document.body.style.overflow = "unset";
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  let widthClass = "max-w-lg";
  if (maxWidth === "sm") widthClass = "max-w-sm";
  else if (maxWidth === "md") widthClass = "max-w-md";
  else if (maxWidth === "xl") widthClass = "max-w-xl";
  else if (maxWidth === "2xl") widthClass = "max-w-3xl";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        onClick={onClose}
        className="fixed inset-0 bg-black/75 backdrop-blur-md transition-opacity animate-fade-in-up"
      />

      {/* Modal Dialog */}
      <div
        className={`relative z-10 w-full ${widthClass} rounded-2xl glass-card bg-[rgba(12,16,28,0.95)] border border-white/10 p-6 shadow-2xl animate-fade-in-up`}
      >
        <div className="flex items-center justify-between pb-4 mb-4 border-b border-white/10">
          <h3 className="text-base font-semibold text-white tracking-wide">{title}</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors p-1.5 rounded-lg hover:bg-white/5 cursor-pointer"
          >
            ✕
          </button>
        </div>
        <div>{children}</div>
      </div>
    </div>
  );
}
