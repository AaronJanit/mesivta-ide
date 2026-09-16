"use client";

import { LayoutDashboard } from "lucide-react";

export default function HomePage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-10 overflow-auto bg-background px-6 py-10">
      {/* Keep the welcome branding visible while the workspace choices are available. */}
      <div className="flex items-center gap-5">
        <img
          src="/white-logo.png"
          alt="Mesivta IDE logo"
          width={104}
          height={122}
          className="drop-shadow-[0_4px_20px_rgba(0,179,255,0.4)]"
        />
        <div className="flex flex-col leading-none">
          <span className="bg-gradient-to-r from-white via-white to-[hsl(var(--accent))] bg-clip-text text-4xl font-bold tracking-tight text-transparent">
            Mesivta Code
          </span>
          <span className="mt-2 text-sm font-medium uppercase tracking-[0.25em] text-muted">
            2026-7 Coding Club @
          </span>
          <span className="mt-2 text-sm font-medium uppercase tracking-[0.25em] text-muted">
            Manchester Mesivta
          </span>
        </div>
      </div>

      <div className="flex flex-col items-center gap-5">
        <div className="flex flex-col items-center">
          <ChoiceCard
            icon={<LayoutDashboard className="size-7 text-accent" />}
            title="Dashboard"
            subtitle="Your coding hub"
            href="/dashboard"
          />
        </div>
      </div>
    </div>
  );
}

function ChoiceCard({
  icon,
  title,
  subtitle,
  href,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  href: string;
}) {
  return (
    <a
      href={href}
      className="group flex w-64 flex-col items-center gap-3 rounded-xl border border-border bg-panel p-8 shadow-md transition-all duration-200 hover:-translate-y-1 hover:border-accent/50 hover:shadow-[0_8px_30px_-4px_rgba(0,179,255,0.2)]"
    >
      <div className="rounded-full bg-accent-soft p-4 transition-transform group-hover:scale-110">
        {icon}
      </div>
      <span className="text-xl font-bold text-foreground">{title}</span>
      <span className="text-sm text-muted">{subtitle}</span>
    </a>
  );
}