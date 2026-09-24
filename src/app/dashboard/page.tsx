"use client";

import { useEffect, useState } from "react";
import {
  ArrowRight,
  BookOpen,
  CheckSquare,
  Compass,
  ExternalLink,
  FileText,
  Flame,
  GraduationCap,
  LayoutDashboard,
  Sparkles,
  X,
} from "lucide-react";
import Link from "next/link";
import { useAuthStore } from "@/stores/useAuthStore";

const learningLinks = [
  {
    title: "CodeHS",
    description: "Structured courses, lessons, and classroom assignments.",
    href: "https://codehs.com/",
    icon: GraduationCap,
    internal: false,
    label: "Open CodeHS",
  },
  {
    title: "W3Schools",
    description: "Tutorials and references for HTML, CSS, JavaScript, and more.",
    href: "https://www.w3schools.com/",
    icon: Sparkles,
    internal: false,
    label: "Open W3Schools",
  },
];

export default function DashboardPage() {
  const user = useAuthStore((s) => s.user);
  const loadUser = useAuthStore((s) => s.loadUser);
  const [showIntro, setShowIntro] = useState(true);

  useEffect(() => {
    if (!user) void loadUser();
  }, [user, loadUser]);

  return (
    <main className="relative h-screen overflow-y-auto bg-background text-foreground">
      {/* Ambient background: faint grid + accent glows (fixed = covers viewport while scrolling) */}
      <div aria-hidden className="pointer-events-none fixed inset-0">
        <div className="ambient-grid absolute inset-0" />
        <div className="absolute -top-32 left-1/2 h-[380px] w-[720px] -translate-x-1/2 rounded-full bg-[radial-gradient(closest-side,hsl(var(--accent)/0.13),transparent)] blur-2xl" />
        <div className="absolute top-1/3 -right-28 h-[360px] w-[520px] rounded-full bg-[radial-gradient(closest-side,hsl(262_60%_50%/0.12),transparent)] blur-2xl" />
        <div className="absolute bottom-0 -left-28 h-[320px] w-[460px] rounded-full bg-[radial-gradient(closest-side,hsl(var(--accent)/0.08),transparent)] blur-2xl" />
      </div>

      <header className="sticky top-0 z-20 border-b border-border bg-panel/80 backdrop-blur-xl">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[hsl(var(--accent)/0.45)] to-transparent"
        />
        <div className="relative mx-auto flex max-w-6xl items-center gap-4 px-6 py-4">
          <Link href="/" aria-label="Go to Mesivta Code home" className="flex items-center gap-3">
            <img
              src="/white-logo.png"
              alt="Mesivta Code"
              width={56}
              height={65}
              className="drop-shadow-[0_2px_8px_rgba(0,179,255,0.3)]"
            />
            <div className="flex flex-col leading-none">
              <span className="bg-gradient-to-r from-white via-white to-[hsl(var(--accent))] bg-clip-text text-xl font-bold tracking-tight text-transparent">
                Mesivta Code
              </span>
              <span className="mt-1 text-[10px] font-medium uppercase tracking-[0.25em] text-muted">
                2026-7 Coding Club
              </span>
            </div>
          </Link>
          <div className="flex-1" />
          <Link
            href="/ide"
            className="group inline-flex items-center gap-2 rounded-lg bg-accent px-4 py-2 text-xs font-semibold text-accent-fg shadow-[0_1px_10px_rgba(0,179,255,0.3)] transition hover:brightness-110 hover:shadow-[0_2px_14px_rgba(0,179,255,0.45)] active:scale-[0.98]"
          >
            Open IDE
            <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5" />
          </Link>
        </div>
      </header>

      <div className="relative z-10 mx-auto max-w-6xl px-6 py-12">
        <section data-tour="hero" className="mb-12 max-w-2xl animate-[signInCardIn_0.5s_ease-out_both]">
          <div className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-accent">
            <LayoutDashboard className="size-4" />
            Dashboard
          </div>
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Your coding workspace{user ? <span className="text-accent">, {user.username}</span> : null}
          </h1>
          <p className="mt-3 text-sm leading-6 text-muted">
            Choose where to learn, build, or pick up your next piece of work.
          </p>
        </section>

        {/* Get started banner (dismissible) */}
        {showIntro && (
          <section
            data-tour="get-started"
            aria-label="Get started"
            className="group relative mb-8 flex flex-wrap items-center gap-4 overflow-hidden rounded-xl border border-accent/40 bg-panel/80 p-5 backdrop-blur-sm animate-[signInCardIn_0.5s_ease-out_both]"
          >
            <div
              aria-hidden
              className="pointer-events-none absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-[hsl(var(--accent)/0.55)] to-transparent"
            />
            <span className="rounded-lg bg-accent-soft p-2.5 text-accent ring-1 ring-[hsl(var(--accent)/0.25)]">
              <Compass className="size-5" />
            </span>
            <div className="min-w-48 flex-1">
              <h2 className="font-semibold">Get started</h2>
              <p className="mt-0.5 text-xs leading-5 text-muted">
                First time here? Take the intro guide to learn your way around.
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                setShowIntro(false);
                window.dispatchEvent(new Event("mesivta:start-intro-tour"));
              }}
              className="group/cta inline-flex items-center gap-1.5 rounded-lg bg-accent px-4 py-2 text-xs font-semibold text-accent-fg shadow-[0_1px_10px_rgba(0,179,255,0.3)] transition hover:brightness-110 active:scale-[0.98]"
            >
              Take the intro guide
              <ArrowRight className="size-3.5 transition-transform group-hover/cta:translate-x-0.5" />
            </button>
            <button
              type="button"
              onClick={() => setShowIntro(false)}
              aria-label="Dismiss"
              title="Dismiss"
              className="rounded p-1.5 text-muted transition hover:bg-panel-2 hover:text-foreground"
            >
              <X className="size-4" />
            </button>
          </section>
        )}

        <section className="mb-12">
          <div className="mb-4">
            <h2 className="text-lg font-semibold">Start coding</h2>
            <p className="mt-1 text-xs text-muted">Your main places to work.</p>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <WorkspaceCard
              title="Mesivta IDE"
              description="Write, preview, and discuss your own projects in Mesivta."
              icon={<span className="font-mono text-lg">&lt;/&gt;</span>}
              accent="cyan"
              href="/ide"
              action="Open IDE"
              tourId="card-ide"
            />
            <WorkspaceCard
              title="Overview"
              description="A snapshot of club activity, progress, and what's happening now."
              icon={<CheckSquare className="size-5" />}
              accent="amber"
              href="/overview"
              action="View overview"
              tourId="card-overview"
            />
            <WorkspaceCard
              title="Mesivta Docs"
              description="Learn HTML, CSS, and JavaScript with the Mesivta coding guide."
              icon={<BookOpen className="size-5" />}
              accent="green"
              href="/docs"
              action="Open docs"
              tourId="card-docs"
            />
            <WorkspaceCard
              title="My progress"
              description="A home for completed work and milestones as the club grows."
              icon={<Flame className="size-5" />}
              accent="cyan"
              href="/challenges#completed"
              action="View progress"
              tourId="card-progress"
            />
          </div>
        </section>

        <section data-tour="learning-library">
          <div className="mb-4">
            <h2 className="text-lg font-semibold">Learning library</h2>
            <p className="mt-1 text-xs text-muted">Mesivta guides and trusted places to learn more.</p>
          </div>
          <div className="grid gap-3 md:grid-cols-3">
            {learningLinks.map((link) => {
              const Icon = link.icon;
              return (
                <a
                  key={link.title}
                  href={link.href}
                  target={link.internal ? undefined : "_blank"}
                  rel={link.internal ? undefined : "noopener noreferrer"}
                  className="group relative flex min-h-36 flex-col justify-between overflow-hidden rounded-xl border border-border bg-panel/70 p-5 backdrop-blur-sm transition duration-200 hover:-translate-y-1 hover:border-accent/50 hover:bg-panel-2/70 hover:shadow-pop"
                >
                  <div
                    aria-hidden
                    className="pointer-events-none absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-[hsl(var(--accent)/0.55)] to-transparent opacity-0 transition duration-200 group-hover:opacity-100"
                  />
                  <div className="flex items-start justify-between gap-3">
                    <span className="rounded-md bg-accent-soft p-2 text-accent ring-1 ring-[hsl(var(--accent)/0.25)]">
                      <Icon className="size-5" />
                    </span>
                    {!link.internal && <ExternalLink className="size-4 text-muted-2" />}
                  </div>
                  <div className="mt-5">
                    <h3 className="font-semibold">{link.title}</h3>
                    <p className="mt-1 text-xs leading-5 text-muted">{link.description}</p>
                    <span className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-accent">
                      {link.label}
                      <ArrowRight className="size-3 transition-transform group-hover:translate-x-0.5" />
                    </span>
                  </div>
                </a>
              );
            })}

            {/* Cheatsheets card — links to both PDFs */}
            <div className="group relative flex min-h-36 flex-col justify-between overflow-hidden rounded-xl border border-border bg-panel/70 p-5 backdrop-blur-sm transition duration-200 hover:-translate-y-1 hover:border-accent/50 hover:bg-panel-2/70 hover:shadow-pop">
              <div
                aria-hidden
                className="pointer-events-none absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-[hsl(var(--accent)/0.55)] to-transparent opacity-0 transition duration-200 group-hover:opacity-100"
              />
              <div className="flex items-start justify-between gap-3">
                <span className="rounded-md bg-accent-soft p-2 text-accent ring-1 ring-[hsl(var(--accent)/0.25)]">
                  <FileText className="size-5" />
                </span>
              </div>
              <div className="mt-5">
                <h3 className="font-semibold">Cheatsheets</h3>
                <p className="mt-1 text-xs leading-5 text-muted">
                  One-page references to keep handy while you code.
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <a
                    href="/html-cheatsheet.pdf"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 rounded border border-accent/40 bg-accent-soft px-2.5 py-1 text-xs font-medium text-accent transition hover:border-accent/70 hover:brightness-110"
                  >
                    HTML
                    <ArrowRight className="size-3" />
                  </a>
                  <a
                    href="/css-cheatsheet.pdf"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 rounded border border-accent/40 bg-accent-soft px-2.5 py-1 text-xs font-medium text-accent transition hover:border-accent/70 hover:brightness-110"
                  >
                    CSS
                    <ArrowRight className="size-3" />
                  </a>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}

function WorkspaceCard({
  title,
  description,
  icon,
  accent,
  action,
  href,
  tourId,
}: {
  title: string;
  description: string;
  icon: React.ReactNode;
  accent: "cyan" | "amber" | "green";
  action: string;
  href: string;
  tourId?: string;
}) {
  const accentClass = {
    cyan: "bg-accent-soft text-accent ring-[hsl(var(--accent)/0.25)]",
    amber: "bg-warning/10 text-warning ring-warning/25",
    green: "bg-success/10 text-success ring-success/25",
  }[accent];

  return (
    <a
      href={href}
      data-tour={tourId}
      className="group relative flex min-h-48 flex-col items-start overflow-hidden rounded-xl border border-border bg-panel/70 p-5 text-left backdrop-blur-sm transition duration-200 hover:-translate-y-1 hover:border-accent/50 hover:bg-panel-2/70 hover:shadow-pop"
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-[hsl(var(--accent)/0.55)] to-transparent opacity-0 transition duration-200 group-hover:opacity-100"
      />
      <span className={`rounded-lg p-2 ring-1 ${accentClass}`}>{icon}</span>
      <h3 className="mt-5 font-semibold">{title}</h3>
      <p className="mt-1 flex-1 text-xs leading-5 text-muted">{description}</p>
      <span className="mt-4 inline-flex items-center gap-1 text-xs font-medium text-accent">
        {action}
        <ArrowRight className="size-3 transition-transform group-hover:translate-x-0.5" />
      </span>
    </a>
  );
}