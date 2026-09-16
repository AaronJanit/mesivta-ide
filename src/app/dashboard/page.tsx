"use client";

import {
  ArrowRight,
  BookOpen,
  CheckSquare,
  ExternalLink,
  Flame,
  GraduationCap,
  LayoutDashboard,
  Sparkles,
} from "lucide-react";

const learningLinks = [
  {
    title: "Mesivta Docs",
    description: "The existing HTML, CSS, and JavaScript guide.",
    href: "/docs",
    icon: BookOpen,
    internal: true,
    label: "Open docs",
  },
  {
    title: "CodeHS",
    description: "Structured courses, lessons, and classroom assignments.",
    href: "https://codehs.com/",
    icon: GraduationCap,
    internal: false,
    label: "Open CodeHS",
  },
  {
    title: "Replit",
    description: "Collaborative workspaces for larger coding projects.",
    href: "https://replit.com/",
    icon: Sparkles,
    internal: false,
    label: "Open Replit",
  },
];

export default function DashboardPage() {
  return (
    <main className="min-h-screen overflow-auto bg-background text-foreground">
      <header className="border-b border-border bg-panel">
        <div className="mx-auto flex max-w-6xl items-center gap-3 px-6 py-4">
          <img
            src="/white-logo.png"
            alt="Mesivta Code"
            width={30}
            height={35}
            className="drop-shadow-[0_2px_8px_rgba(0,179,255,0.3)]"
          />
          <div>
            <p className="text-sm font-semibold">Mesivta Code</p>
            <p className="text-xs text-muted-2">Coding club workspace</p>
          </div>
          <div className="flex-1" />
          <span className="hidden text-xs text-muted sm:block">Open workspace</span>
          <a
            href="/login"
            className="rounded border border-border px-3 py-1.5 text-xs text-muted transition hover:border-border-strong hover:text-foreground"
          >
            Sign in
          </a>
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-6 py-10">
        <section className="mb-10 max-w-2xl">
          <div className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-accent">
            <LayoutDashboard className="size-4" />
            Dashboard
          </div>
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Your coding workspace</h1>
          <p className="mt-3 text-sm leading-6 text-muted">
            Choose where to learn, build, or pick up your next piece of work.
          </p>
        </section>

        <section className="mb-10">
          <div className="mb-4">
            <h2 className="text-lg font-semibold">Start coding</h2>
            <p className="mt-1 text-xs text-muted">Your main places to work.</p>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            <WorkspaceCard
              title="Mesivta IDE"
              description="Write, preview, and discuss your own projects in Mesivta."
              icon={<span className="font-mono text-lg">&lt;/&gt;</span>}
              accent="cyan"
              href="/ide"
              action="Open IDE"
            />
            <WorkspaceCard
              title="Challenges & Sprints"
              description="See the current task, sprint goals, and work to complete."
              icon={<CheckSquare className="size-5" />}
              accent="amber"
              href="/challenges"
              action="View work"
            />
            <WorkspaceCard
              title="My progress"
              description="A home for completed work and milestones as the club grows."
              icon={<Flame className="size-5" />}
              accent="green"
              href="/challenges#completed"
              action="View progress"
            />
          </div>
        </section>

        <section>
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
                  className="group flex min-h-36 flex-col justify-between rounded-lg border border-border bg-panel p-5 transition hover:-translate-y-0.5 hover:border-accent/50 hover:bg-panel-2"
                >
                  <div className="flex items-start justify-between gap-3">
                    <span className="rounded-md bg-accent-soft p-2 text-accent">
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
}: {
  title: string;
  description: string;
  icon: React.ReactNode;
  accent: "cyan" | "amber" | "green";
  action: string;
  href: string;
}) {
  const accentClass = {
    cyan: "bg-accent-soft text-accent",
    amber: "bg-warning/10 text-warning",
    green: "bg-success/10 text-success",
  }[accent];

  return (
    <a
      href={href}
      className="group flex min-h-48 flex-col items-start rounded-lg border border-border bg-panel p-5 text-left transition hover:-translate-y-0.5 hover:border-accent/50 hover:bg-panel-2"
    >
      <span className={`rounded-md p-2 ${accentClass}`}>{icon}</span>
      <h3 className="mt-5 font-semibold">{title}</h3>
      <p className="mt-1 flex-1 text-xs leading-5 text-muted">{description}</p>
      <span className="mt-4 inline-flex items-center gap-1 text-xs font-medium text-accent">
        {action}
        <ArrowRight className="size-3 transition-transform group-hover:translate-x-0.5" />
      </span>
    </a>
  );
}