"use client";

import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";

// CodingGuide uses browser-only libs (react-dnd via react-arborist), so disable SSR.
const CodingGuide = dynamic(
  () => import("@/components/guide/CodingGuide").then((m) => m.CodingGuide),
  { ssr: false },
);

export default function DocsPage() {
  const router = useRouter();

  return (
    <div className="flex h-screen flex-col bg-background">
      {/* Top bar with logo + link to IDE */}
      <div className="flex h-12 shrink-0 items-center gap-3 border-b border-border bg-panel px-4">
        <img
          src="/white-logo.png"
          alt="Mesivta IDE logo"
          width={28}
          height={33}
          className="drop-shadow-[0_2px_8px_rgba(0,179,255,0.3)]"
        />
        <span className="text-sm font-semibold tracking-tight text-foreground">
          Mesivta IDE
        </span>
        <span className="text-xs uppercase tracking-[0.2em] text-muted-2">
          Documentation
        </span>
        <span className="text-[11px] text-muted-2">— HTML, CSS &amp; JavaScript for beginners</span>
        <div className="flex-1" />
        <button
          onClick={() => router.push("/ide")}
          className="rounded bg-accent px-3 py-1.5 text-xs font-medium text-accent-fg transition hover:opacity-90"
        >
          Open the IDE →
        </button>
      </div>

      {/* Full-height coding guide — same component used inside the IDE */}
      <div className="flex-1 overflow-hidden">
        <CodingGuide onClose={() => router.push("/ide")} />
      </div>
    </div>
  );
}