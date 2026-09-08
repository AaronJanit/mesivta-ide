"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { BookOpen, Code2 } from "lucide-react";

export default function HomePage() {
  const router = useRouter();
  const [showChoices, setShowChoices] = useState(false);

  // After the logo fades in and out (~2.5s), reveal the two choices.
  useEffect(() => {
    const t = setTimeout(() => setShowChoices(true), 2600);
    return () => clearTimeout(t);
  }, []);

  return (
    <div className="relative flex h-screen flex-col items-center justify-center bg-background overflow-hidden">
      {/* Logo — fades in then out, then slides up when choices appear */}
      <div
        className={`flex items-center gap-5 transition-all duration-700 ease-out ${
          showChoices ? "-translate-y-48 opacity-0" : "opacity-100"
        }`}
        style={{ animation: "landingFade 2.5s ease-in-out forwards" }}
      >
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

      {/* Two choices — fade + slide in after the logo animation */}
      <div
        className={`absolute flex flex-col items-center gap-5 transition-all duration-700 ease-out ${
          showChoices ? "translate-y-0 opacity-100" : "translate-y-8 opacity-0"
        }`}
        style={{ transitionDelay: showChoices ? "100ms" : "0ms" }}
      >
        <div className="flex flex-col items-center gap-3 sm:flex-row sm:gap-6">
          <ChoiceCard
            icon={<BookOpen className="size-7 text-accent" />}
            title="Docs"
            subtitle="Learn to code"
            onClick={() => router.push("/docs")}
          />
          <ChoiceCard
            icon={<Code2 className="size-7 text-accent" />}
            title="IDE"
            subtitle="Write code"
            onClick={() => router.push("/ide")}
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
  onClick,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="group flex w-64 flex-col items-center gap-3 rounded-xl border border-border bg-panel p-8 shadow-md transition-all duration-200 hover:-translate-y-1 hover:border-accent/50 hover:shadow-[0_8px_30px_-4px_rgba(0,179,255,0.2)]"
    >
      <div className="rounded-full bg-accent-soft p-4 transition-transform group-hover:scale-110">
        {icon}
      </div>
      <span className="text-xl font-bold text-foreground">{title}</span>
      <span className="text-sm text-muted">{subtitle}</span>
    </button>
  );
}