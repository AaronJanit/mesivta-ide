"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Clock,
  Lock,
  PartyPopper,
  Sparkles,
} from "lucide-react";
import { api } from "@/lib/api/client";

interface Stage {
  title: string;
  emoji: string;
  blurb: string;
  /** null = no "I've done this" button (intro / celebration) */
  stageId: string | null;
  needsInput: { label: string; placeholder: string; textarea?: boolean } | null;
  estTime: string;
}

const VIBES_STAGES: Stage[] = [
  {
    title: "Start Vibes",
    emoji: "✨",
    blurb:
      "Build a website with good vibes (and a little help from AI). By the end you'll have a live website built by you — and the club throws a pizza party 🍕",
    stageId: null,
    needsInput: null,
    estTime: "The journey begins",
  },
  {
    title: "Part 1 — Prompt an AI",
    emoji: "🧠",
    blurb: "Prompt an AI to code a website about the topic of your choice.",
    stageId: "part-1",
    needsInput: {
      label: "Your AI prompt",
      placeholder:
        "e.g. Make a website about my football club with a hero, fixtures table, and a signup form. Dark colours, big bold headings.",
    },
    estTime: "15–30 min",
  },
  {
    title: "Part 2 — Edit the code",
    emoji: "🎨",
    blurb: "Edit the code yourself to change the styling and content.",
    stageId: "part-2",
    needsInput: {
      label: "What did you change?",
      placeholder: "e.g. Changed the colours, swapped the heading text, moved the image.",
      textarea: true,
    },
    estTime: "30–60 min",
  },
  {
    title: "Part 3 — Make it yours",
    emoji: "🚀",
    blurb: "Add new features to improve your website and make it your own.",
    stageId: "part-3",
    needsInput: {
      label: "What new features did you add?",
      placeholder: "e.g. Added a gallery, a lightbox, and a contact form.",
      textarea: true,
    },
    estTime: "1–2 hours",
  },
  {
    title: "Pizza party!",
    emoji: "🍕",
    blurb: "You finished Vibes — the club celebrates with a reward from the Clubs Shop.",
    stageId: null,
    needsInput: null,
    estTime: "Finish line",
  },
];

export default function ChallengesPage() {
  const router = useRouter();
  const [stages, setStages] = useState<Record<string, { done: boolean; fileName?: string; projectName?: string }>>({});
  const [activeStage, setActiveStage] = useState<string | null>(null);
  const [fieldValue, setFieldValue] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const { stages: rows } = await api.vibes.progress();
        if (!cancelled) {
          setStages(
            Object.fromEntries(
              Object.entries(rows).map(([k, v]) => [
                k,
                { done: v.done, fileName: v.fileName, projectName: v.projectName },
              ]),
            ),
          );
        }
      } catch {
        // Not signed in — page still renders, stages just unchecked.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const doneCount = useMemo(
    () => VIBES_STAGES.filter((s) => s.stageId && stages[s.stageId]?.done).length,
    [stages],
  );
  const totalStages = VIBES_STAGES.filter((s) => s.stageId).length;
  const progressPercent = totalStages === 0 ? 0 : Math.round((doneCount / totalStages) * 100);

  const isUnlocked = useCallback(
    (index: number) => {
      if (index === 0) return true;
      const prev = VIBES_STAGES[index - 1];
      if (!prev.stageId) return true;
      return stages[prev.stageId]?.done ?? false;
    },
    [stages],
  );

  const handleSave = useCallback(async (stage: Stage, value: string) => {
    if (!stage.stageId) return;
    setSaving(true);
    setSaveError(null);
    try {
      const res = await api.vibes.saveDoc(stage.stageId, { [stage.stageId === "part-1" ? "prompt" : stage.stageId === "part-2" ? "changes" : "features"]: value });
      setStages((prev) => ({
        ...prev,
        [stage.stageId!]: { done: true, fileName: res.fileName, projectName: res.projectName },
      }));
      setActiveStage(null);
      setFieldValue("");
    } catch (e) {
      setSaveError((e as Error).message || "Could not save");
    } finally {
      setSaving(false);
    }
  }, []);

  return (
    <main className="relative h-screen overflow-y-auto bg-background text-foreground">
      {/* Ambient background: faint grid + accent glows (fixed = covers viewport while scrolling) */}
      <div aria-hidden className="pointer-events-none fixed inset-0">
        <div className="ambient-grid absolute inset-0" />
        <div className="absolute -top-32 left-1/2 h-[380px] w-[720px] -translate-x-1/2 rounded-full bg-[radial-gradient(closest-side,hsl(var(--accent)/0.13),transparent)] blur-2xl" />
        <div className="absolute top-1/3 -right-28 h-[360px] w-[520px] rounded-full bg-[radial-gradient(closest-side,hsl(262_60%_50%/0.12),transparent)] blur-2xl" />
        <div className="absolute bottom-0 -left-28 h-[320px] w-[460px] rounded-full bg-[radial-gradient(closest-side,hsl(var(--accent)/0.08),transparent)] blur-2xl" />
      </div>

      {/* Sticky glass header — matches dashboard & overview */}
      <header className="sticky top-0 z-20 border-b border-border bg-panel/80 backdrop-blur-xl">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[hsl(var(--accent)/0.45)] to-transparent"
        />
        <div className="relative mx-auto flex max-w-4xl items-center gap-3 px-6 py-4">
          <button
            type="button"
            onClick={() => router.push("/dashboard")}
            aria-label="Back to dashboard"
            title="Back to dashboard"
            className="rounded p-1.5 text-muted transition hover:bg-panel-2 hover:text-foreground"
          >
            <ArrowLeft className="size-4" />
          </button>
          <img
            src="/white-logo.png"
            alt="Mesivta Code"
            width={40}
            height={46}
            className="drop-shadow-[0_2px_8px_rgba(0,179,255,0.3)]"
          />
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

      <div className="relative z-10 mx-auto max-w-4xl px-6 py-12">
        {/* Hero */}
        <section className="mb-10 max-w-2xl animate-[signInCardIn_0.5s_ease-out_both]">
          <div className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-accent">
            <Sparkles className="size-4" />
            Current project
          </div>
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">HackClub Vibes</h1>
          <p className="mt-3 text-sm leading-6 text-muted">
            Build a website with good vibes (and a little help from AI). Complete each
            stage to unlock the next — your answers are saved as markdown notes in your
            project folder.
          </p>
        </section>

        {/* Progress card */}
        <section
          aria-label="Progress"
          className="group relative mb-12 overflow-hidden rounded-xl border border-border bg-panel/70 p-5 backdrop-blur-sm"
        >
          <div
            aria-hidden
            className="pointer-events-none absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-[hsl(var(--accent)/0.55)] to-transparent"
          />
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <span className="rounded-md bg-accent-soft p-2 text-accent ring-1 ring-[hsl(var(--accent)/0.25)]">
                <PartyPopper className="size-4" />
              </span>
              <div>
                <h2 className="text-sm font-semibold">Journey progress</h2>
                <p className="text-[11px] text-muted-2">
                  {doneCount} of {totalStages} stages complete
                </p>
              </div>
            </div>
            <span className="text-2xl font-semibold tabular-nums tracking-tight">
              {progressPercent}%
            </span>
          </div>
          <div className="mt-4 h-1.5 w-full overflow-hidden rounded-full bg-panel-2">
            <div
              className="h-full rounded-full bg-gradient-to-r from-[hsl(var(--accent)/0.7)] to-[hsl(var(--accent))] transition-all duration-500"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </section>

        {/* Vibes stages */}
        <section aria-label="Vibes stages" className="mb-12">
          <ol className="relative space-y-6 before:absolute before:bottom-4 before:left-[15px] before:top-4 before:w-px before:bg-border">
            {VIBES_STAGES.map((stage, index) => {
              const done = stage.stageId ? stages[stage.stageId]?.done ?? false : progressPercent === 100;
              const unlocked = isUnlocked(index);
              const isCelebration = stage.stageId === null && index === VIBES_STAGES.length - 1;
              const needsInput = stage.needsInput;
              const saved = stage.stageId ? stages[stage.stageId] : null;

              return (
                <li key={stage.title} className="relative flex gap-4">
                  <span
                    aria-hidden
                    className={`relative z-10 mt-5 flex size-8 shrink-0 items-center justify-center rounded-full border text-sm font-bold shadow-[0_0_0_4px_hsl(var(--background))] ${
                      done
                        ? "border-success/40 bg-success/15 text-success"
                        : unlocked
                          ? "border-accent/50 bg-accent/10 text-accent"
                          : "border-border bg-panel-2 text-muted-2"
                    }`}
                  >
                    {done ? <Check className="size-4" /> : unlocked ? stage.emoji : <Lock className="size-3.5" />}
                  </span>

                  <article
                    className={`group relative min-h-20 flex-1 overflow-hidden rounded-xl border p-5 backdrop-blur-sm transition duration-200 hover:-translate-y-0.5 ${
                      done
                        ? "border-success/30 bg-panel/70 hover:border-success/50"
                        : unlocked
                          ? "border-border bg-panel/70 hover:border-accent/50 hover:shadow-pop"
                          : "border-border bg-panel/40 opacity-70"
                    }`}
                  >
                    {/* hover hairline */}
                    <div
                      aria-hidden
                      className={`pointer-events-none absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent ${
                        done ? "via-[hsl(var(--success)/0.55)]" : "via-[hsl(var(--accent)/0.55)]"
                      } to-transparent opacity-0 transition duration-200 group-hover:opacity-100`}
                    />

                    <div className="flex flex-wrap items-center gap-2.5">
                      <h2 className="font-semibold">{stage.title}</h2>
                      <span className="inline-flex items-center gap-1 rounded-full border border-border bg-panel-2/50 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-muted-2">
                        <Clock className="size-3" />
                        {stage.estTime}
                      </span>
                      {done && !isCelebration && (
                        <span className="rounded-full bg-success/10 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-success ring-1 ring-success/25">
                          Done
                        </span>
                      )}
                      {!unlocked && (
                        <span className="rounded-full bg-panel-2/70 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-muted-2 ring-1 ring-border">
                          Locked
                        </span>
                      )}
                    </div>
                    <p className="mt-2 max-w-2xl text-xs leading-5 text-muted">{stage.blurb}</p>

                    {/* Saved-doc pill */}
                    {saved?.done && stage.stageId && (
                      <p className="mt-2.5 flex items-center gap-1 text-[11px] font-medium text-success">
                        <Check className="size-3" />
                        {saved.projectName
                          ? `Saved to ${saved.projectName}/vibes/${stages[stage.stageId]?.fileName ?? ""}`
                          : "Saved"}
                      </p>
                    )}

                    {/* Input form when active */}
                    {stage.stageId && needsInput && unlocked && activeStage === stage.stageId && (
                      <form
                        onSubmit={(e) => {
                          e.preventDefault();
                          void handleSave(stage, fieldValue);
                        }}
                        className="mt-4 rounded-lg border border-accent/40 bg-panel-2/40 p-4"
                      >
                        <label className="block text-xs font-medium text-muted">
                          {needsInput.label}
                          {needsInput.textarea ? (
                            <textarea
                              value={fieldValue}
                              onChange={(e) => setFieldValue(e.target.value)}
                              className="mt-1.5 min-h-24 w-full resize-y rounded border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-accent"
                              placeholder={needsInput.placeholder}
                              required
                            />
                          ) : (
                            <input
                              value={fieldValue}
                              onChange={(e) => setFieldValue(e.target.value)}
                              className="mt-1.5 w-full rounded border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-accent"
                              placeholder={needsInput.placeholder}
                              required
                            />
                          )}
                        </label>
                        {saveError && <p className="mt-2 text-xs text-danger">{saveError}</p>}
                        <div className="mt-3 flex justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              setActiveStage(null);
                              setSaveError(null);
                            }}
                            className="rounded border border-border px-3 py-1.5 text-xs text-muted hover:text-foreground"
                          >
                            Cancel
                          </button>
                          <button
                            type="submit"
                            disabled={saving}
                            className="inline-flex items-center gap-1.5 rounded bg-accent px-3 py-1.5 text-xs font-medium text-accent-fg transition hover:opacity-90 disabled:opacity-50"
                          >
                            {saving ? "Saving…" : "Save & continue"}
                            <ArrowRight className="size-3" />
                          </button>
                        </div>
                      </form>
                    )}

                    {/* Done button */}
                    {stage.stageId && unlocked && activeStage !== stage.stageId && (
                      <button
                        type="button"
                        disabled={saving}
                        onClick={() => {
                          setActiveStage(stage.stageId);
                          setFieldValue("");
                          setSaveError(null);
                        }}
                        className="mt-4 inline-flex items-center gap-1.5 rounded bg-accent px-3.5 py-1.5 text-xs font-medium text-accent-fg shadow-[0_1px_10px_rgba(0,179,255,0.25)] transition hover:brightness-110 active:scale-[0.98] disabled:opacity-50"
                      >
                        <Check className="size-3.5" />
                        {saved?.done ? "Update my answer" : "I've done this"}
                      </button>
                    )}

                    {/* Celebration */}
                    {isCelebration && progressPercent === 100 && (
                      <div className="mt-4 flex items-center gap-2 rounded-lg border border-success/30 bg-success/10 p-3 text-xs font-medium text-success">
                        <PartyPopper className="size-4" />
                        All stages complete — the club celebrates tonight! 🍕
                      </div>
                    )}
                  </article>
                </li>
              );
            })}
          </ol>
        </section>
      </div>
    </main>
  );
}