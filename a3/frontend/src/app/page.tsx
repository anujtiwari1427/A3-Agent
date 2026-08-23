"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

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
   Login form (appears after mode selection)
   ────────────────────────────────────────────────────── */
function LoginForm({ mode }: { mode: "local" | "cloud" }) {
  const router = useRouter();
  const isCloud = mode === "cloud";
  const accentColor = isCloud ? "var(--accent-blue)" : "var(--accent-emerald)";

  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const endpoint = isRegister
      ? "/api/v1/auth/register"
      : "/api/v1/auth/login";

    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          password,
          ...(isRegister && fullName ? { full_name: fullName } : {}),
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.detail || "Something went wrong");
        return;
      }

      // Store token & user info, then redirect
      localStorage.setItem("a3_token", data.access_token);
      localStorage.setItem("a3_user", JSON.stringify(data.user));
      router.push("/dashboard");
    } catch {
      setError("Cannot reach the server. Is the backend running?");
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
            className="px-4 py-1.5 rounded-full text-xs font-medium tracking-wider uppercase"
            style={{
              color: accentColor,
              backgroundColor: isCloud
                ? "var(--accent-blue-dim)"
                : "var(--accent-emerald-dim)",
              border: `1px solid ${accentColor}33`,
            }}
          >
            {isCloud ? "☁ Cloud Mode" : "🔒 Local Mode"}
          </span>
        </div>

        <h2 className="text-2xl font-semibold text-center mb-6">
          {isRegister ? "Create account on" : "Sign in to"}{" "}
          <span style={{ color: accentColor }}>a3</span>
        </h2>

        {/* OAuth buttons (cloud only, stubs) */}
        {isCloud && !isRegister && (
          <div className="space-y-3 mb-6">
            <button
              type="button"
              className="w-full flex items-center justify-center gap-3 glass-card py-3 px-4 text-sm font-medium hover:bg-[var(--bg-glass-hover)] transition-all duration-300 rounded-[var(--radius-sm)] opacity-50 cursor-not-allowed"
              disabled
              title="Coming soon"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path
                  fill="currentColor"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
                />
                <path
                  fill="currentColor"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="currentColor"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                />
                <path
                  fill="currentColor"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                />
              </svg>
              Google — Coming Soon
            </button>
            <button
              type="button"
              className="w-full flex items-center justify-center gap-3 glass-card py-3 px-4 text-sm font-medium hover:bg-[var(--bg-glass-hover)] transition-all duration-300 rounded-[var(--radius-sm)] opacity-50 cursor-not-allowed"
              disabled
              title="Coming soon"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
              </svg>
              GitHub — Coming Soon
            </button>

            <div className="flex items-center gap-4 my-4">
              <div className="flex-1 h-px bg-[var(--border-subtle)]" />
              <span className="text-xs text-[var(--text-muted)] uppercase tracking-wider">
                or
              </span>
              <div className="flex-1 h-px bg-[var(--border-subtle)]" />
            </div>
          </div>
        )}

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

        {/* Email / Password form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Full name (register only, cloud only) */}
          {isRegister && isCloud && (
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
              {isCloud ? "Email" : "Username"}
            </label>
            <input
              id="email"
              type={isCloud ? "email" : "text"}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={isCloud ? "you@company.com" : "admin"}
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
                : isCloud
                  ? "Sign In"
                  : "Launch Locally"}
          </button>
        </form>

        {/* Toggle between sign-in / register (cloud only) */}
        {isCloud && (
          <p className="text-center text-xs text-[var(--text-muted)] mt-5">
            {isRegister ? "Already have an account?" : "Don\u0027t have an account?"}{" "}
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
        )}

        {/* Local mode hint */}
        {!isCloud && (
          <p className="text-center text-xs text-[var(--text-muted)] mt-5">
            Default credentials:{" "}
            <code className="px-1.5 py-0.5 rounded bg-[var(--bg-glass)] text-[var(--accent-emerald)] text-xs">
              admin
            </code>{" "}
            /{" "}
            <code className="px-1.5 py-0.5 rounded bg-[var(--bg-glass)] text-[var(--accent-emerald)] text-xs">
              admin123
            </code>
          </p>
        )}
      </div>
    </div>
  );
}

/* ──────────────────────────────────────────────────────
   Main page
   ────────────────────────────────────────────────────── */
export default function Home() {
  const [selectedMode, setSelectedMode] = useState<Mode>(null);

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
          title="Local Mode"
          icon="🔒"
          description="Run entirely on your machine. Your data never leaves."
          features={[
            "Zero cloud dependency",
            "Offline-first operation",
            "Ollama-powered local LLMs",
            "SQLite — no setup needed",
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
            "Groq-powered fast inference",
            "Google & GitHub SSO",
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

      {/* Login form slides in after mode selection */}
      {selectedMode && <LoginForm mode={selectedMode} />}

      {/* Footer */}
      <footer
        className="mt-auto pt-16 pb-6 text-center text-xs text-[var(--text-muted)] animate-fade-in-up"
        style={{ animationDelay: "0.4s" }}
      >
        <p>
          One product. Two deployment realities.{" "}
          <span className="text-[var(--accent-purple)]">a3 v2.0</span>
        </p>
      </footer>
    </main>
  );
}
