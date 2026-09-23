"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { api } from "@/lib/api/client";

export default function LoginPage() {
  return (
    <Suspense>
      <LoginPageInner />
    </Suspense>
  );
}

function LoginPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const requestedRedirect = searchParams.get("redirect");
  const redirectTo = requestedRedirect?.startsWith("/") && !requestedRedirect.startsWith("//")
    ? requestedRedirect
    : "/dashboard";
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    setError(null);
    setBusy(true);
    try {
      await api.auth.login(code);
      router.replace(redirectTo);
      router.refresh();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4 pt-[8vh] pb-10">
      {/* Hero */}
      <div className="mb-10 flex items-center gap-5">
        <Link href="/" aria-label="Go to Mesivta Code home">
          <img
            src="/white-logo.png"
            alt="Mesivta IDE logo"
            width={124}
            height={145}
            className="drop-shadow-[0_4px_20px_rgba(0,179,255,0.4)]"
          />
        </Link>
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
      <div className="w-[340px] overflow-hidden rounded-md border border-border bg-panel shadow-md">
        <div className="border-b border-border bg-panel-2 px-5 py-2.5 text-sm font-medium text-foreground">
          Sign in
        </div>

        <form onSubmit={submit} className="p-5">
          <p className="mb-4 text-xs text-muted">
            Enter your 4-digit code to open your workspace.
          </p>

          <label htmlFor="signin-code" className="mb-1 block text-xs text-muted">
            Your code
          </label>
          <input
            id="signin-code"
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 4))}
            autoFocus
            inputMode="numeric"
            autoComplete="one-time-code"
            placeholder="0000"
            disabled={busy}
            className="mb-4 w-full rounded border border-border bg-background px-2.5 py-2 text-center font-mono text-2xl tracking-[0.6em] text-foreground outline-none focus:border-accent disabled:opacity-50"
          />

          {error && (
            <div className="mb-3 rounded border border-danger/40 bg-danger/10 px-2.5 py-1.5 text-xs text-danger">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={busy || code.length !== 4}
            className="w-full rounded bg-accent px-3 py-1.5 text-sm font-medium text-accent-fg transition hover:opacity-90 disabled:opacity-50"
          >
            {busy ? "…" : "Sign in"}
          </button>

          <p className="mt-4 text-center text-[11px] text-muted-2">
            Lost your code? Ask the club admin for it.
          </p>
        </form>
      </div>
    </div>
  );
}