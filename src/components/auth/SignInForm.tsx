"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, ArrowRight, KeyRound, Loader2 } from "lucide-react";
import { api } from "@/lib/api/client";

const CODE_LENGTH = 4;

/**
 * The sign-in form: a single 4-digit code, handed to the student in person
 * by the admin. Shown on the landing page — the whole site requires sign-in.
 */
export function SignInForm({ redirectTo = "/dashboard" }: { redirectTo?: string }) {
  const router = useRouter();
  const [digits, setDigits] = useState<string[]>(() => Array<string>(CODE_LENGTH).fill(""));
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [shakeKey, setShakeKey] = useState(0);
  const inputsRef = useRef<Array<HTMLInputElement | null>>([]);

  const code = digits.join("");
  const complete = code.length === CODE_LENGTH;

  async function doLogin(codeValue: string) {
    if (busy || codeValue.length !== CODE_LENGTH) return;
    setError(null);
    setBusy(true);
    try {
      await api.auth.login(codeValue);
      const safe =
        redirectTo.startsWith("/") && !redirectTo.startsWith("//") ? redirectTo : "/dashboard";
      router.replace(safe);
      router.refresh();
    } catch (err) {
      setError((err as Error).message);
      setBusy(false);
      setShakeKey((k) => k + 1);
    }
  }

  function setDigit(i: number, raw: string) {
    const d = raw.replace(/\D/g, "").slice(-1);
    if (!d) {
      setDigits((prev) => prev.map((c, idx) => (idx === i ? "" : c)));
      return;
    }
    const wasComplete = digits.every(Boolean);
    const next = [...digits];
    next[i] = d;
    setDigits(next);
    if (i < CODE_LENGTH - 1) inputsRef.current[i + 1]?.focus();
    // Auto-submit only when typing the final digit of an incomplete code —
    // editing an already-complete code requires an explicit Enter/click.
    if (!wasComplete && next.every(Boolean)) void doLogin(next.join(""));
  }

  function handleKeyDown(i: number, e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Backspace") {
      if (!digits[i] && i > 0) {
        e.preventDefault();
        inputsRef.current[i - 1]?.focus();
        setDigits((prev) => prev.map((c, idx) => (idx === i - 1 ? "" : c)));
      }
    } else if (e.key === "ArrowLeft" && i > 0) {
      e.preventDefault();
      inputsRef.current[i - 1]?.focus();
    } else if (e.key === "ArrowRight" && i < CODE_LENGTH - 1) {
      e.preventDefault();
      inputsRef.current[i + 1]?.focus();
    }
  }

  function handlePaste(e: React.ClipboardEvent<HTMLDivElement>) {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, CODE_LENGTH);
    if (!pasted) return;
    setDigits(Array.from({ length: CODE_LENGTH }, (_, idx) => pasted[idx] ?? ""));
    inputsRef.current[Math.min(pasted.length, CODE_LENGTH) - 1]?.focus();
    if (pasted.length === CODE_LENGTH) void doLogin(pasted);
  }

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-background px-4 py-12">
      {/* Ambient background: faint grid + accent glows */}
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <div className="ambient-grid absolute inset-0" />
        <div className="absolute -top-40 left-1/2 h-[440px] w-[760px] -translate-x-1/2 rounded-full bg-[radial-gradient(closest-side,hsl(var(--accent)/0.16),transparent)] blur-2xl" />
        <div className="absolute -bottom-44 -right-24 h-[420px] w-[560px] rounded-full bg-[radial-gradient(closest-side,hsl(262_60%_50%/0.14),transparent)] blur-2xl" />
        <div className="absolute -bottom-40 -left-28 h-[360px] w-[480px] rounded-full bg-[radial-gradient(closest-side,hsl(var(--accent)/0.09),transparent)] blur-2xl" />
      </div>

      {/* Hero */}
      <div className="relative z-10 mb-10 flex items-center gap-5">
        <img
          src="/white-logo.png"
          alt="Mesivta IDE logo"
          width={124}
          height={145}
          className="drop-shadow-[0_4px_20px_rgba(0,179,255,0.4)]"
        />
        <div className="flex flex-col leading-none">
          <span className="bg-gradient-to-r from-white via-white to-[hsl(var(--accent))] bg-clip-text text-5xl font-bold tracking-tight text-transparent">
            Mesivta Code
          </span>
          <span className="mt-2 text-sm font-medium uppercase tracking-[0.25em] text-muted">
            2026-7 Coding Club
          </span>
        </div>
      </div>

      {/* Sign-in card */}
      <div className="relative z-10 w-full max-w-[400px] animate-[signInCardIn_0.5s_ease-out_both]">
        <div
          aria-hidden
          className="absolute -inset-4 rounded-[28px] bg-[radial-gradient(closest-side,hsl(var(--accent)/0.2),transparent)] blur-xl"
        />
        <div className="relative overflow-hidden rounded-2xl border border-border bg-panel/85 shadow-pop backdrop-blur-xl">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-x-12 top-0 h-px bg-gradient-to-r from-transparent via-[hsl(var(--accent)/0.7)] to-transparent"
          />

          <div className="p-7">
            {/* Card header */}
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent-soft text-accent ring-1 ring-[hsl(var(--accent)/0.35)]">
                <KeyRound size={18} strokeWidth={2.2} />
              </span>
              <div className="min-w-0">
                <h1 className="text-[15px] font-semibold text-foreground">Sign in</h1>
                <p className="mt-0.5 text-xs text-muted">
                  Enter your 4-digit code to open your workspace.
                </p>
              </div>
            </div>

            <form
              noValidate
              onSubmit={(e) => {
                e.preventDefault();
                void doLogin(code);
              }}
              className="mt-6"
            >
              <label htmlFor="signin-code-0" className="mb-2 block text-xs font-medium text-muted">
                Your code
              </label>

              <div className="flex gap-2.5" onPaste={handlePaste}>
                {digits.map((digit, i) => (
                  <input
                    key={i}
                    ref={(el) => {
                      inputsRef.current[i] = el;
                    }}
                    id={i === 0 ? "signin-code-0" : undefined}
                    value={digit}
                    onChange={(e) => setDigit(i, e.target.value)}
                    onKeyDown={(e) => handleKeyDown(i, e)}
                    onFocus={(e) => e.currentTarget.select()}
                    aria-label={`Digit ${i + 1}`}
                    autoFocus={i === 0}
                    inputMode="numeric"
                    autoComplete={i === 0 ? "one-time-code" : "off"}
                    placeholder="•"
                    disabled={busy}
                    maxLength={1}
                    className={`h-14 w-full min-w-0 rounded-lg border bg-background text-center font-mono text-[26px] leading-none text-foreground caret-accent outline-none transition placeholder:text-muted-2 focus:border-accent focus:ring-2 focus:ring-accent/30 disabled:opacity-50 ${
                      digit ? "border-accent/50" : "border-border"
                    }`}
                  />
                ))}
              </div>

              {error && (
                <div
                  key={shakeKey}
                  role="alert"
                  className="mt-4 flex animate-[signInShake_0.4s_ease-in-out] items-start gap-2 rounded-lg border border-danger/40 bg-danger/10 px-3 py-2 text-xs text-danger"
                >
                  <AlertCircle size={14} className="mt-px shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={busy || !complete}
                className="group mt-5 flex w-full items-center justify-center gap-2 rounded-lg bg-accent px-4 py-2.5 text-sm font-semibold text-accent-fg transition hover:brightness-110 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-40"
              >
                {busy ? <Loader2 size={16} className="animate-spin" /> : null}
                {busy ? "Signing in…" : "Sign in"}
                {busy ? null : (
                  <ArrowRight
                    size={16}
                    className="transition-transform group-hover:translate-x-0.5"
                  />
                )}
              </button>
            </form>

            <p className="mt-6 border-t border-border/70 pt-4 text-center text-[11px] text-muted-2">
              Don't have a code or lost it? Speak to Mr Mainzer.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}