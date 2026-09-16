"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, CalendarDays, CheckCircle2, Plus, Target, Zap } from "lucide-react";

type WorkItem = {
  id: number;
  title: string;
  description: string;
  type: "Challenge" | "Sprint";
  due: string;
  status: "Not started" | "In progress" | "Complete";
};

const starterWork: WorkItem[] = [
  {
    id: 1,
    title: "Build a personal homepage",
    description: "Create a page with a heading, an image, and three links using HTML and CSS.",
    type: "Challenge",
    due: "This week",
    status: "In progress",
  },
  {
    id: 2,
    title: "JavaScript interaction sprint",
    description: "Add one useful interaction to your homepage and explain how the code works.",
    type: "Sprint",
    due: "Next club meeting",
    status: "Not started",
  },
];

export default function ChallengesPage() {
  const router = useRouter();
  const [work, setWork] = useState(starterWork);
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [type, setType] = useState<WorkItem["type"]>("Challenge");

  function addWorkItem(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!title.trim() || !description.trim()) return;
    setWork((items) => [
      ...items,
      {
        id: Date.now(),
        title: title.trim(),
        description: description.trim(),
        type,
        due: "To be scheduled",
        status: "Not started",
      },
    ]);
    setTitle("");
    setDescription("");
    setType("Challenge");
    setShowForm(false);
  }

  return (
    <main className="min-h-screen overflow-auto bg-background text-foreground">
      <header className="border-b border-border bg-panel">
        <div className="mx-auto flex max-w-5xl items-center gap-3 px-6 py-4">
          <button
            type="button"
            onClick={() => router.push("/dashboard")}
            className="rounded p-1.5 text-muted transition hover:bg-panel-2 hover:text-foreground"
            title="Back to dashboard"
          >
            <ArrowLeft className="size-4" />
          </button>
          <div>
            <p className="text-sm font-semibold">Challenges &amp; Sprints</p>
            <p className="text-xs text-muted-2">Set a goal. Make something. Share what you learned.</p>
          </div>
          <div className="flex-1" />
          <button
            type="button"
            onClick={() => setShowForm((visible) => !visible)}
            className="inline-flex items-center gap-1.5 rounded bg-accent px-3 py-1.5 text-xs font-medium text-accent-fg transition hover:opacity-90"
          >
            <Plus className="size-3.5" />
            Set work
          </button>
        </div>
      </header>

      <div className="mx-auto max-w-5xl px-6 py-10">
        <section className="mb-8 grid gap-4 sm:grid-cols-3">
          <Summary icon={<Target className="size-4" />} label="Active work" value={String(work.filter((item) => item.status !== "Complete").length)} />
          <Summary icon={<Zap className="size-4" />} label="Current sprint" value="Web foundations" />
          <Summary icon={<CheckCircle2 className="size-4" />} label="Completed" value={String(work.filter((item) => item.status === "Complete").length)} />
        </section>

        {showForm && (
          <form onSubmit={addWorkItem} className="mb-8 rounded-lg border border-accent/40 bg-panel p-5">
            <h2 className="font-semibold">Set new work</h2>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <label className="text-xs text-muted">
                Title
                <input
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  className="mt-1.5 w-full rounded border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-accent"
                  placeholder="e.g. Build a quiz app"
                  required
                />
              </label>
              <label className="text-xs text-muted">
                Type
                <select
                  value={type}
                  onChange={(event) => setType(event.target.value as WorkItem["type"])}
                  className="mt-1.5 w-full rounded border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-accent"
                >
                  <option>Challenge</option>
                  <option>Sprint</option>
                </select>
              </label>
            </div>
            <label className="mt-4 block text-xs text-muted">
              What should students make or learn?
              <textarea
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                className="mt-1.5 min-h-24 w-full resize-y rounded border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-accent"
                placeholder="Describe the outcome and what a finished submission should show."
                required
              />
            </label>
            <div className="mt-4 flex justify-end gap-2">
              <button type="button" onClick={() => setShowForm(false)} className="rounded border border-border px-3 py-1.5 text-xs text-muted hover:text-foreground">
                Cancel
              </button>
              <button type="submit" className="rounded bg-accent px-3 py-1.5 text-xs font-medium text-accent-fg hover:opacity-90">
                Add work
              </button>
            </div>
          </form>
        )}

        <section id="completed">
          <div className="mb-4">
            <h1 className="text-xl font-semibold">Club work</h1>
            <p className="mt-1 text-xs text-muted">Your current challenges and team sprints.</p>
          </div>
          <div className="space-y-3">
            {work.map((item) => (
              <article key={item.id} className="rounded-lg border border-border bg-panel p-5">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <div className="mb-2 flex items-center gap-2 text-[11px] font-medium uppercase tracking-[0.14em] text-accent">
                      <span>{item.type}</span>
                      <span className="text-muted-2">/</span>
                      <span className="inline-flex items-center gap-1 text-muted-2 normal-case tracking-normal">
                        <CalendarDays className="size-3" />
                        {item.due}
                      </span>
                    </div>
                    <h2 className="font-semibold">{item.title}</h2>
                    <p className="mt-1 max-w-2xl text-sm leading-6 text-muted">{item.description}</p>
                  </div>
                  <select
                    value={item.status}
                    onChange={(event) => {
                      const status = event.target.value as WorkItem["status"];
                      setWork((items) => items.map((current) => current.id === item.id ? { ...current, status } : current));
                    }}
                    className="rounded border border-border bg-background px-2.5 py-1.5 text-xs text-foreground outline-none focus:border-accent"
                    aria-label={`Status for ${item.title}`}
                  >
                    <option>Not started</option>
                    <option>In progress</option>
                    <option>Complete</option>
                  </select>
                </div>
              </article>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}

function Summary({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border bg-panel p-4">
      <div className="flex items-center gap-2 text-accent">
        {icon}
        <span className="text-xs text-muted">{label}</span>
      </div>
      <p className="mt-3 text-lg font-semibold">{value}</p>
    </div>
  );
}