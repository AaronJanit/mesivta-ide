"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api/client";

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      if (mode === "login") {
        await api.auth.login(username, password);
      } else {
        await api.auth.register(username, password);
      }
      router.replace("/");
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
        <img
          src="https://mesivta.co.uk/wp-content/uploads/2022/04/xwhite-logo-256x300.png.pagespeed.ic.T16UwmHs8r.png"
          alt="Mesivta IDE logo"
          width={104}
          height={122}
          className="drop-shadow-[0_4px_20px_rgba(0,179,255,0.4)]"
        />
        <div className="flex flex-col leading-none">
          <span className="bg-gradient-to-r from-white via-white to-[hsl(var(--accent))] bg-clip-text text-4xl font-bold tracking-tight text-transparent">
            Mesivta IDE
          </span>
          <span className="mt-2 text-sm font-medium uppercase tracking-[0.25em] text-muted">
            Coding Club
          </span>
        </div>
      </div>

      {/* Auth card */}
      <div className="w-[340px] overflow-hidden rounded-md border border-border bg-panel shadow-md">
        {/* Tabs */}
        <div className="grid grid-cols-2 border-b border-border bg-panel-2">
          {(["login", "register"] as const).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => {
                setMode(m);
                setError(null);
              }}
              className={`px-3 py-2.5 text-sm font-medium transition ${
                mode === m
                  ? "bg-panel text-foreground"
                  : "text-muted hover:text-foreground"
              }`}
            >
              {m === "login" ? "Sign in" : "Register"}
            </button>
          ))}
        </div>

        <form onSubmit={submit} className="p-5">
          <p className="mb-4 text-xs text-muted">
            {mode === "login" ? "Welcome back." : "Start coding in seconds."}
          </p>

          <label className="mb-1 block text-xs text-muted">Username</label>
          <input
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            autoFocus
            className="mb-3 w-full rounded border border-border bg-background px-2.5 py-1.5 text-sm text-foreground outline-none focus:border-accent"
            placeholder="username"
            autoComplete="username"
          />

          <label className="mb-1 block text-xs text-muted">Password</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="mb-4 w-full rounded border border-border bg-background px-2.5 py-1.5 text-sm text-foreground outline-none focus:border-accent"
            placeholder="••••••••"
            autoComplete={mode === "login" ? "current-password" : "new-password"}
          />

          {error && (
            <div className="mb-3 rounded border border-danger/40 bg-danger/10 px-2.5 py-1.5 text-xs text-danger">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={busy}
            className="w-full rounded bg-accent px-3 py-1.5 text-sm font-medium text-accent-fg transition hover:opacity-90 disabled:opacity-50"
          >
            {busy ? "…" : mode === "login" ? "Sign in" : "Create account"}
          </button>
        </form>
      </div>
    </div>
  );
}