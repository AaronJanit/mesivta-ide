import {
  Activity,
  ArrowLeft,
  Clock,
  FileCode,
  Folder,
  Gift,
  MessageSquare,
  Rocket,
  Users,
} from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";

import { TIMELINE, type Milestone, type MilestoneStatus } from "@/components/overview/timelineContent";
import { getSession } from "@/lib/auth/session";
import { getClubStats, type ClubStats } from "@/lib/db/stats";

export const dynamic = "force-dynamic";

export default async function OverviewPage() {
  const sess = await getSession();
  if (!sess) redirect("/login?redirect=/overview");

  const stats = await getClubStats();

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
        <div className="relative mx-auto flex max-w-4xl items-center gap-3 px-6 py-4">
          <Link
            href="/dashboard"
            aria-label="Back to dashboard"
            title="Back to dashboard"
            className="rounded p-1.5 text-muted transition hover:bg-panel-2 hover:text-foreground"
          >
            <ArrowLeft className="size-4" />
          </Link>
          <img src="/white-logo.png" alt="Mesivta Code" width={40} height={46} className="drop-shadow-[0_2px_8px_rgba(0,179,255,0.3)]" />
          <div className="flex flex-col leading-none">
            <span className="bg-gradient-to-r from-white via-white to-[hsl(var(--accent))] bg-clip-text text-base font-bold tracking-tight text-transparent">
              Mesivta Code
            </span>
            <span className="mt-1 text-[10px] font-medium uppercase tracking-[0.25em] text-muted">
              2026-7 Coding Club
            </span>
          </div>
        </div>
      </header>

      <div className="relative z-10 mx-auto max-w-4xl px-6 py-10">
        {/* Hero */}
        <section className="mb-10 max-w-2xl animate-[signInCardIn_0.5s_ease-out_both]">
          <div className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-accent">
            <Activity className="size-4" />
            Overview
          </div>
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Where the club is headed</h1>
          <p className="mt-3 text-sm leading-6 text-muted">
            A snapshot of what the club is building right now, and the Hack Club Web
            Dev Series we&apos;ll take on next — with rewards along the way.
          </p>
        </section>

        {/* Club activity (live, anonymous aggregates) */}
        <ClubActivityCard stats={stats} />

        {/* Timeline */}
        <section aria-label="Club timeline" className="mt-12">
          <ol className="relative space-y-8 before:absolute before:bottom-2 before:left-[11px] before:top-2 before:w-px before:bg-border sm:before:left-[15px]">
            {TIMELINE.map((milestone) => (
              <TimelineEntry key={milestone.id} milestone={milestone} />
            ))}
          </ol>
        </section>
      </div>
    </main>
  );
}

function ClubActivityCard({ stats }: { stats: ClubStats }) {
  const tiles = [
    { label: "Members", value: stats.members, icon: Users },
    { label: "Projects", value: stats.projects, icon: Folder },
    { label: "Files", value: stats.files, icon: FileCode },
    { label: "AI messages", value: stats.aiMessages, icon: MessageSquare },
  ];

  return (
    <section
      aria-label="Club activity"
      className="group relative overflow-hidden rounded-xl border border-border bg-panel/70 p-5 backdrop-blur-sm"
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-[hsl(var(--accent)/0.55)] to-transparent"
      />
      <div className="flex items-center gap-2.5">
        <span className="rounded-md bg-accent-soft p-2 text-accent ring-1 ring-[hsl(var(--accent)/0.25)]">
          <Activity className="size-4" />
        </span>
        <h2 className="font-semibold">Club activity</h2>
        <span className="ml-1 inline-flex items-center gap-1.5 rounded-full border border-border bg-panel-2/70 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-muted">
          <span aria-hidden className="relative flex size-1.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[hsl(var(--success)/0.6)]" />
            <span className="relative inline-flex size-1.5 rounded-full bg-[hsl(var(--success))]" />
          </span>
          Live
        </span>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4">
        {tiles.map((tile) => {
          const Icon = tile.icon;
          return (
            <div
              key={tile.label}
              className="rounded-lg border border-border bg-panel-2/50 p-4 transition duration-200 hover:border-accent/40"
            >
              <div className="flex items-center gap-2 text-muted">
                <span className="rounded-md bg-accent-soft p-1.5 text-accent ring-1 ring-[hsl(var(--accent)/0.25)]">
                  <Icon className="size-3.5" />
                </span>
                <span className="text-xs font-medium">{tile.label}</span>
              </div>
              <p className="mt-2.5 text-2xl font-semibold tabular-nums tracking-tight">
                {tile.value.toLocaleString("en-GB")}
              </p>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function statusMeta(status: MilestoneStatus): {
  dot: string;
  chip: string;
  label: string;
  icon: React.ReactNode | null;
} {
  switch (status) {
    case "now":
      return {
        dot: "size-4 bg-[hsl(var(--accent))] ring-4 ring-[hsl(var(--accent)/0.25)]",
        chip: "bg-accent-soft text-accent ring-1 ring-[hsl(var(--accent)/0.25)]",
        label: "Now",
        icon: <span aria-hidden className="relative flex size-1.5">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[hsl(var(--accent)/0.6)]" />
          <span className="relative inline-flex size-1.5 rounded-full bg-[hsl(var(--accent))]" />
        </span>,
      };
    case "finale":
      return {
        dot: "size-3.5 bg-[hsl(var(--success))] ring-4 ring-[hsl(var(--success)/0.2)]",
        chip: "bg-success/10 text-success ring-1 ring-success/25",
        label: "Finish line",
        icon: <Rocket className="size-3" />,
      };
    default:
      return {
        dot: "size-3 bg-panel-2 ring-4 ring-[hsl(var(--border)/0.4)]",
        chip: "bg-panel-2/70 text-muted-2 ring-1 ring-border",
        label: "Upcoming",
        icon: null,
      };
  }
}

function TimelineEntry({ milestone }: { milestone: Milestone }) {
  const meta = statusMeta(milestone.status);
  const isNow = milestone.status === "now";
  const isFinale = milestone.status === "finale";

  return (
    <li className="relative flex gap-5 pl-0">
      {/* Node dot on the rail */}
      <span
        aria-hidden
        className={`relative z-10 mt-6 shrink-0 rounded-full ${meta.dot}`}
        style={{ marginLeft: isNow ? undefined : 2 }}
      />

      <article
        className={`group relative min-h-24 flex-1 overflow-hidden rounded-xl border p-5 backdrop-blur-sm transition duration-200 hover:-translate-y-1 hover:shadow-pop ${
          isNow
            ? "border-accent/50 bg-panel/80 hover:border-accent/70"
            : "border-border bg-panel/70 hover:border-accent/50"
        } ${isFinale ? "border-success/30 bg-panel/70 hover:border-success/50" : ""}`}
      >
        <div
          aria-hidden
          className={`pointer-events-none absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent ${
            isFinale
              ? "via-[hsl(var(--success)/0.55)]"
              : "via-[hsl(var(--accent)/0.55)]"
          } to-transparent ${isNow ? "opacity-100" : "opacity-0 group-hover:opacity-100"} transition duration-200`}
        />

        <div className="flex flex-wrap items-center gap-2.5">
          <h3 className="font-semibold">{milestone.title}</h3>
          <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${meta.chip}`}>
            {meta.icon}
            {meta.label}
          </span>
          {milestone.tag && (
            <span className="rounded-full border border-border bg-panel-2/50 px-2.5 py-0.5 text-[10px] font-medium uppercase tracking-wider text-muted-2">
              {milestone.tag}
            </span>
          )}
          {milestone.image && (
            <img
              src={milestone.image.src}
              alt={milestone.image.alt}
              className="ml-auto h-12 w-auto object-contain"
              loading="lazy"
            />
          )}
        </div>

        <p className="mt-2.5 text-xs leading-5 text-muted">{milestone.description}</p>

        {(milestone.reward || milestone.estTime) && (
          <div className="mt-3.5 flex flex-wrap gap-x-5 gap-y-1.5">
            {milestone.reward && (
              <span className="inline-flex items-center gap-1.5 text-xs font-medium text-warning">
                <Gift className="size-3.5" />
                {milestone.reward}
              </span>
            )}
            {milestone.estTime && (
              <span className="inline-flex items-center gap-1.5 text-xs text-muted-2">
                <Clock className="size-3.5" />
                {milestone.estTime}
              </span>
            )}
          </div>
        )}
      </article>
    </li>
  );
}