"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "../lib/api";

type Mode = "local" | "cloud" | null;

/* ──────────────────────────────────────────────────────
   Animated background orbs
   ────────────────────────────────────────────────────── */
function BackgroundOrbs() {
  return (
    <div className="pointer-events-none fixed inset-0 overflow-hidden -z-10">
      {/* Emerald orb */}
      <div
        className="absolute -top-[30%] -left-[15%] w-[60vw] h-[60vw] rounded-full opacity-[0.07] blur-[120px]"
        style={{
          background:
            "radial-gradient(circle, var(--accent-emerald) 0%, transparent 70%)",
          animation: "float 12s ease-in-out infinite",
        }}
      />
      {/* Blue orb */}
      <div
        className="absolute -bottom-[25%] -right-[10%] w-[55vw] h-[55vw] rounded-full opacity-[0.06] blur-[120px]"
        style={{
          background:
            "radial-gradient(circle, var(--accent-blue) 0%, transparent 70%)",
          animation: "float 15s ease-in-out infinite 3s",
        }}
      />
      {/* Purple accent */}
      <div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[40vw] h-[40vw] rounded-full opacity-[0.04] blur-[100px]"
        style={{
          background:
            "radial-gradient(circle, var(--accent-purple) 0%, transparent 70%)",
          animation: "float 18s ease-in-out infinite 6s",
        }}
      />
    </div>
  );
}

/* ──────────────────────────────────────────────────────
   Logo component
   ────────────────────────────────────────────────────── */
function Logo() {
  return (
    <div className="flex flex-col items-center gap-3 animate-fade-in-up">
      {/* Diamond icon */}
      <div className="relative w-16 h-16 flex items-center justify-center">
        <div
          className="absolute inset-0 rounded-2xl rotate-45"
          style={{
            background:
              "linear-gradient(135deg, var(--accent-emerald) 0%, var(--accent-blue) 50%, var(--accent-purple) 100%)",
            opacity: 0.15,
          }}
        />
        <span className="text-3xl font-bold bg-gradient-to-br from-[var(--accent-emerald)] via-[var(--accent-blue)] to-[var(--accent-purple)] bg-clip-text text-transparent">
          ◈
        </span>
      </div>
      <h1 className="text-5xl font-bold tracking-tight">
        <span className="bg-gradient-to-r from-[var(--accent-emerald)] via-[var(--accent-blue)] to-[var(--accent-purple)] bg-clip-text text-transparent">
          a3
        </span>
      </h1>
      <p className="text-[var(--text-secondary)] text-base tracking-wide">
        Data Intelligence Platform
      </p>
    </div>
  );
}

/* ──────────────────────────────────────────────────────
   Mode selection card
   ────────────────────────────────────────────────────── */
function ModeCard({
  title,
  icon,
  description,
  features,
  accentColor,
  glowShadow,
  selected,
  onSelect,
}: {
  mode: Mode;
  title: string;
  icon: string;
  description: string;
  features: string[];
  accentColor: string;
  glowShadow: string;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      onClick={onSelect}
      className="relative group text-left w-full transition-all duration-500 focus:outline-none"
    >
      <div
        className={`glass-card p-7 h-full cursor-pointer transition-all duration-500 ${
          selected
            ? "border-opacity-100 scale-[1.02]"
            : "hover:scale-[1.01]"
        }`}
        style={{
          borderColor: selected ? accentColor : undefined,
          boxShadow: selected ? glowShadow : undefined,
        }}
      >
        {/* Status dot */}
        <div className="flex items-center justify-between mb-5">
          <span className="text-3xl">{icon}</span>
          <div
            className={`w-3 h-3 rounded-full transition-all duration-500 ${
              selected ? "scale-100" : "scale-0"
            }`}
            style={{ backgroundColor: accentColor }}
          />
        </div>

        {/* Title */}
        <h3
          className="text-xl font-semibold mb-2 transition-colors duration-300"
          style={{ color: selected ? accentColor : "var(--text-primary)" }}
        >
          {title}
        </h3>

        {/* Description */}
        <p className="text-[var(--text-secondary)] text-sm leading-relaxed mb-5">
          {description}
        </p>

        {/* Features */}
        <ul className="space-y-2.5">
          {features.map((f, i) => (
            <li
              key={i}
              className="flex items-center gap-2.5 text-sm text-[var(--text-muted)]"
            >
              <span
                className="w-1.5 h-1.5 rounded-full shrink-0"
                style={{ backgroundColor: accentColor }}
              />
              {f}
            </li>
          ))}
        </ul>

        {/* Bottom shimmer line */}
        <div
          className={`absolute bottom-0 left-[10%] right-[10%] h-px transition-opacity duration-500 ${
            selected ? "opacity-100" : "opacity-0 group-hover:opacity-50"
          }`}
          style={{
            background: `linear-gradient(90deg, transparent, ${accentColor}, transparent)`,
          }}
        />
      </div>
    </button>
  );
}

/* ──────────────────────────────────────────────────────
   Auth Form: Security License (Local) / Email (Cloud)
   ────────────────────────────────────────────────────── */
function LoginForm({ mode }: { mode: "local" | "cloud" }) {
  const router = useRouter();
  const isCloud = mode === "cloud";
  const accentColor = isCloud ? "var(--accent-blue)" : "var(--accent-emerald)";

  // Local Mode: Security License Key (default: 7710916655)
  const [licenseKey, setLicenseKey] = useState("7710916655");

  // Cloud Mode Form State
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleLocalLicenseSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const data = await api.loginWithLicense(licenseKey);
      localStorage.setItem("a3_token", data.access_token);
      localStorage.setItem("a3_user", JSON.stringify(data.user));
      router.push("/dashboard");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Invalid Security License Key";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  async function handleCloudSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const data = isRegister
        ? await api.register(email, password, fullName || undefined)
        : await api.login(email, password);

      localStorage.setItem("a3_token", data.access_token);
      localStorage.setItem("a3_user", JSON.stringify(data.user));
      router.push("/dashboard");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Authentication failed";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="animate-fade-in-up w-full max-w-md mx-auto mt-10">
      <div className="glass-card p-8">
        {/* Mode badge */}
        <div className="flex items-center justify-center mb-6">
          <span
            className="px-4 py-1.5 rounded-full text-xs font-medium tracking-wider uppercase flex items-center gap-1.5"
            style={{
              color: accentColor,
              backgroundColor: isCloud
                ? "var(--accent-blue-dim)"
                : "var(--accent-emerald-dim)",
              border: `1px solid ${accentColor}33`,
            }}
          >
            {isCloud ? "☁ Cloud Mode" : "🔒 Local Protected Mode"}
          </span>
        </div>

        <h2 className="text-2xl font-semibold text-center mb-2">
          {isCloud
            ? isRegister
              ? "Create Cloud Account"
              : "Sign in to a3"
            : "Security License Authorization"}
        </h2>
        <p className="text-xs text-center text-[var(--text-muted)] mb-6">
          {isCloud
            ? "Enter your team credentials to access the shared cloud workspace"
            : "Enter your authorized security license key to unlock your local platform"}
        </p>

        {/* Error message */}
        {error && (
          <div
            className="mb-5 px-4 py-3 rounded-[var(--radius-sm)] text-sm animate-fade-in-up"
            style={{
              backgroundColor: "rgba(239, 68, 68, 0.12)",
              border: "1px solid rgba(239, 68, 68, 0.3)",
              color: "#fca5a5",
            }}
          >
            {error}
          </div>
        )}

        {/* Local Mode: Security License Key Authorization */}
        {!isCloud ? (
          <form onSubmit={handleLocalLicenseSubmit} className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-2">
                <label
                  htmlFor="licenseKey"
                  className="block text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider"
                >
                  Security License Key
                </label>
                <span className="text-[11px] text-[var(--accent-emerald)] font-mono">
                  Default: 7710916655
                </span>
              </div>
              <div className="relative">
                <input
                  id="licenseKey"
                  type="text"
                  value={licenseKey}
                  onChange={(e) => setLicenseKey(e.target.value)}
                  placeholder="7710916655"
                  required
                  className="w-full px-4 py-3 rounded-[var(--radius-sm)] bg-[var(--bg-glass)] border border-[var(--border-subtle)] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--accent-emerald)] transition-colors duration-300 font-mono tracking-wider text-sm"
                />
                <button
                  type="button"
                  onClick={() => setLicenseKey("7710916655")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs px-2 py-1 rounded bg-[var(--accent-emerald-dim)] text-[var(--accent-emerald)] hover:brightness-125 transition-all"
                  title="Reset to default license"
                >
                  Auto-fill
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-[var(--radius-sm)] text-sm font-semibold text-[var(--bg-primary)] transition-all duration-300 hover:brightness-110 active:scale-[0.98] mt-2 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              style={{ backgroundColor: accentColor }}
            >
              {loading ? "Verifying License…" : "◈ Unlock Platform"}
            </button>

            <div className="pt-3 text-center">
              <p className="text-[11px] text-[var(--text-muted)] leading-relaxed">
                Licensed for local standalone intelligence on this machine.
                All calculations and storage run 100% offline.
              </p>
            </div>
          </form>
        ) : (
          /* Cloud Mode: Email & Password */
          <form onSubmit={handleCloudSubmit} className="space-y-4">
            {isRegister && (
              <div>
                <label
                  htmlFor="fullName"
                  className="block text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider mb-2"
                >
                  Full Name
                </label>
                <input
                  id="fullName"
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Jane Doe"
                  className="w-full px-4 py-3 rounded-[var(--radius-sm)] bg-[var(--bg-glass)] border border-[var(--border-subtle)] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--border-accent)] transition-colors duration-300 text-sm"
                />
              </div>
            )}

            <div>
              <label
                htmlFor="email"
                className="block text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider mb-2"
              >
                Email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@company.com"
                required
                className="w-full px-4 py-3 rounded-[var(--radius-sm)] bg-[var(--bg-glass)] border border-[var(--border-subtle)] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--border-accent)] transition-colors duration-300 text-sm"
              />
            </div>
            <div>
              <label
                htmlFor="password"
                className="block text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider mb-2"
              >
                Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                className="w-full px-4 py-3 rounded-[var(--radius-sm)] bg-[var(--bg-glass)] border border-[var(--border-subtle)] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--border-accent)] transition-colors duration-300 text-sm"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-[var(--radius-sm)] text-sm font-semibold text-[var(--bg-primary)] transition-all duration-300 hover:brightness-110 active:scale-[0.98] mt-2 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
              style={{ backgroundColor: accentColor }}
            >
              {loading
                ? "Please wait…"
                : isRegister
                  ? "Create Account"
                  : "Sign In"}
            </button>

            <p className="text-center text-xs text-[var(--text-muted)] mt-5">
              {isRegister ? "Already have an account?" : "Don't have an account?"}{" "}
              <button
                type="button"
                onClick={() => {
                  setIsRegister(!isRegister);
                  setError(null);
                }}
                className="underline transition-colors duration-300 cursor-pointer"
                style={{ color: accentColor }}
              >
                {isRegister ? "Sign in" : "Create one"}
              </button>
            </p>
          </form>
        )}
      </div>
    </div>
  );
}

/* ──────────────────────────────────────────────────────
   Main page
   ────────────────────────────────────────────────────── */
export default function Home() {
  const [selectedMode, setSelectedMode] = useState<Mode>("local");

  return (
    <main className="relative flex flex-col items-center justify-center min-h-screen px-6 py-16 overflow-hidden">
      <BackgroundOrbs />

      {/* Logo + title */}
      <div className="mb-12">
        <Logo />
      </div>

      {/* Mode cards */}
      <div
        className="grid grid-cols-1 sm:grid-cols-2 gap-5 w-full max-w-2xl animate-fade-in-up"
        style={{ animationDelay: "0.15s" }}
      >
        <ModeCard
          mode="local"
          title="Local Protected Mode"
          icon="🔒"
          description="Security license key authorized. Runs entirely on your machine."
          features={[
            "Security License: 7710916655",
            "Zero email/password hassle",
            "Offline-first local computation",
            "Direct local PC storage",
          ]}
          accentColor="var(--accent-emerald)"
          glowShadow="var(--shadow-glow-emerald)"
          selected={selectedMode === "local"}
          onSelect={() => setSelectedMode("local")}
        />
        <ModeCard
          mode="cloud"
          title="Cloud Mode"
          icon="☁️"
          description="Collaborate with your team from anywhere."
          features={[
            "Multi-tenant organizations",
            "Shared datasets & dashboards",
            "Fast cloud inference",
            "Role-based team access",
          ]}
          accentColor="var(--accent-blue)"
          glowShadow="var(--shadow-glow-blue)"
          selected={selectedMode === "cloud"}
          onSelect={() => setSelectedMode("cloud")}
        />
      </div>

      {/* Hint text when no mode selected */}
      {!selectedMode && (
        <p
          className="mt-8 text-sm text-[var(--text-muted)] animate-fade-in-up"
          style={{ animationDelay: "0.3s" }}
        >
          Select a mode to continue →
        </p>
      )}

      {/* Login form */}
      {selectedMode && <LoginForm mode={selectedMode} />}

      {/* Footer */}
      <footer
        className="mt-auto pt-16 pb-6 text-center text-xs text-[var(--text-muted)] animate-fade-in-up"
        style={{ animationDelay: "0.4s" }}
      >
        <p>
          One product. Two deployment realities.{" "}
          <span className="text-[var(--accent-purple)]">a3 v2.4</span>
        </p>
      </footer>
    </main>
  );
}
