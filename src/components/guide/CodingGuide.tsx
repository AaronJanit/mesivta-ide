"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  BookOpen,
  Search,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  FileCode,
  Palette,
  Braces,
  type LucideIcon,
} from "lucide-react";
import {
  GUIDE_SECTIONS,
  FLAT_LESSONS,
  type FlatLesson,
  type Lesson,
} from "./guideContent";
import { GuideCodeBlock } from "./GuideCodeBlock";
import { PreviewFrame } from "./PreviewFrame";
import { Callout } from "./Callout";
import { cn } from "@/lib/cn";

const SECTION_ICONS: Record<string, LucideIcon> = {
  FileCode,
  Palette,
  Braces,
};

const STORAGE_KEY = "web-ide:guide:lastLessonId";

interface CodingGuideProps {
  onClose: () => void;
}

export function CodingGuide({ onClose }: CodingGuideProps) {
  const [activeLessonId, setActiveLessonId] = useState<string>(FLAT_LESSONS[0].id);
  const [search, setSearch] = useState("");
  const [collapsedSections, setCollapsedSections] = useState<Set<string>>(new Set());
  const scrollRef = useRef<HTMLDivElement>(null);
  const lessonRefs = useRef<Map<string, HTMLElement>>(new Map());

  // Restore last opened lesson.
  useEffect(() => {
    const saved = typeof window !== "undefined" ? localStorage.getItem(STORAGE_KEY) : null;
    if (saved && FLAT_LESSONS.some((l) => l.id === saved)) {
      setActiveLessonId(saved);
    }
  }, []);

  // Persist last opened lesson.
  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem(STORAGE_KEY, activeLessonId);
    }
  }, [activeLessonId]);

  const activeIndex = useMemo(
    () => FLAT_LESSONS.findIndex((l) => l.id === activeLessonId),
    [activeLessonId],
  );
  const activeLesson = FLAT_LESSONS[activeIndex] ?? FLAT_LESSONS[0];
  const prevLesson = activeIndex > 0 ? FLAT_LESSONS[activeIndex - 1] : null;
  const nextLesson = activeIndex < FLAT_LESSONS.length - 1 ? FLAT_LESSONS[activeIndex + 1] : null;

  const goTo = useCallback((id: string) => {
    setActiveLessonId(id);
    // Smooth-scroll the lesson into view inside the scrolling container.
    requestAnimationFrame(() => {
      const el = lessonRefs.current.get(id);
      const container = scrollRef.current;
      if (el && container) {
        const offset = el.offsetTop - container.offsetTop - 12;
        container.scrollTo({ top: offset, behavior: "smooth" });
      }
    });
  }, []);

  // Scroll-spy: highlight the TOC entry for the lesson currently in view.
  useEffect(() => {
    const container = scrollRef.current;
    if (!container) return;
    const onScroll = () => {
      const top = container.scrollTop + 80; // account for header offset
      let current = FLAT_LESSONS[0].id;
      for (const lesson of FLAT_LESSONS) {
        const el = lessonRefs.current.get(lesson.id);
        if (!el) continue;
        if (el.offsetTop - container.offsetTop <= top) {
          current = lesson.id;
        } else {
          break;
        }
      }
      setActiveLessonId((prev) => (prev !== current ? current : prev));
    };
    container.addEventListener("scroll", onScroll, { passive: true });
    return () => container.removeEventListener("scroll", onScroll);
  }, []);

  // Filter lessons by search query.
  const filteredSectionIds = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return null; // null = no filter
    const ids = new Set<string>();
    for (const section of GUIDE_SECTIONS) {
      const sectionMatch =
        section.title.toLowerCase().includes(q) || section.blurb.toLowerCase().includes(q);
      const lessonMatch = section.lessons.some(
        (l) =>
          l.title.toLowerCase().includes(q) ||
          l.summary.toLowerCase().includes(q) ||
          l.explanation.some((p) => p.toLowerCase().includes(q)),
      );
      if (sectionMatch || lessonMatch) {
        ids.add(section.id);
      }
    }
    return ids;
  }, [search]);

  function toggleSection(id: string) {
    setCollapsedSections((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <div className="flex h-full flex-col bg-editor text-foreground">
      {/* Body: TOC + content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Sticky Table of Contents */}
        <aside className="hidden w-64 shrink-0 flex-col border-r border-border bg-panel md:flex">
          <div className="flex h-9 shrink-0 items-center border-b border-border px-3">
            <Search className="size-3.5 text-muted-2" />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search lessons…"
              className="ml-2 w-full bg-transparent text-xs text-foreground placeholder:text-muted-2 focus:outline-none"
              aria-label="Search lessons"
            />
          </div>
          <nav className="flex-1 overflow-auto p-2" aria-label="Guide contents">
            {GUIDE_SECTIONS.map((section) => {
              const Icon = SECTION_ICONS[section.icon] ?? BookOpen;
              const hiddenBySearch =
                filteredSectionIds !== null && !filteredSectionIds.has(section.id);
              if (hiddenBySearch) return null;
              const collapsed = collapsedSections.has(section.id);
              return (
                <div key={section.id} className="mb-1">
                  <button
                    onClick={() => toggleSection(section.id)}
                    className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-[12px] font-semibold text-foreground hover:bg-panel-2"
                    aria-expanded={!collapsed}
                  >
                    <Icon className="size-3.5 shrink-0 text-accent" />
                    <span className="flex-1 truncate">{section.title}</span>
                    <ChevronDown
                      className={cn(
                        "size-3.5 shrink-0 text-muted-2 transition-transform",
                        collapsed && "-rotate-90",
                      )}
                    />
                  </button>
                  {!collapsed && (
                    <ul className="ml-3 border-l border-border pl-2">
                      {section.lessons.map((lesson) => {
                        const matchesSearch =
                          filteredSectionIds === null ||
                          lessonMatches(lesson, search.trim().toLowerCase());
                        if (!matchesSearch) return null;
                        const isActive = lesson.id === activeLessonId;
                        return (
                          <li key={lesson.id}>
                            <button
                              onClick={() => goTo(lesson.id)}
                              className={cn(
                                "flex w-full items-center gap-1.5 rounded px-2 py-1 text-left text-[12px] transition-colors",
                                isActive
                                  ? "bg-accent-soft text-foreground"
                                  : "text-muted hover:bg-panel-2 hover:text-foreground",
                              )}
                            >
                              {isActive && (
                                <span className="absolute -ml-[10px] h-3 w-0.5 rounded-full bg-accent" />
                              )}
                              <span className="truncate">{lesson.title}</span>
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </div>
              );
            })}
            {filteredSectionIds !== null && filteredSectionIds.size === 0 && (
              <p className="px-2 py-4 text-[12px] text-muted-2">
                No lessons match “{search}”.
              </p>
            )}
          </nav>
        </aside>

        {/* Mobile section dropdown */}
        <div className="border-b border-border bg-panel px-3 py-2 md:hidden">
          <label className="text-[11px] uppercase tracking-wide text-muted-2">Jump to lesson</label>
          <select
            value={activeLessonId}
            onChange={(e) => goTo(e.target.value)}
            className="mt-1 w-full rounded border border-border bg-editor px-2 py-1 text-xs text-foreground"
          >
            {GUIDE_SECTIONS.map((section) => (
              <optgroup key={section.id} label={section.title}>
                {section.lessons.map((lesson) => (
                  <option key={lesson.id} value={lesson.id}>
                    {lesson.title}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
        </div>

        {/* Content */}
        <div className="flex flex-1 flex-col overflow-hidden">
          <div ref={scrollRef} className="flex-1 overflow-auto">
            <div className="mx-auto max-w-3xl px-6 py-8">
              {FLAT_LESSONS.map((lesson) => (
                <LessonView
                  key={lesson.id}
                  lesson={lesson}
                  registerRef={(el) => {
                    if (el) lessonRefs.current.set(lesson.id, el);
                    else lessonRefs.current.delete(lesson.id);
                  }}
                />
              ))}
              <div className="h-8" />
            </div>
          </div>

          {/* Prev / Next footer */}
          <div className="flex shrink-0 items-center justify-between border-t border-border bg-panel px-4 py-2">
            <button
              onClick={() => prevLesson && goTo(prevLesson.id)}
              disabled={!prevLesson}
              className="flex items-center gap-1.5 rounded px-2 py-1 text-xs text-muted hover:bg-panel-2 hover:text-foreground disabled:cursor-not-allowed disabled:opacity-40"
            >
              <ChevronLeft className="size-4" />
              <span className="truncate">
                {prevLesson ? prevLesson.title : "Previous"}
              </span>
            </button>
            <span className="text-[11px] text-muted-2">
              {activeIndex + 1} / {FLAT_LESSONS.length}
            </span>
            <button
              onClick={() => nextLesson && goTo(nextLesson.id)}
              disabled={!nextLesson}
              className="flex items-center gap-1.5 rounded px-2 py-1 text-xs text-muted hover:bg-panel-2 hover:text-foreground disabled:cursor-not-allowed disabled:opacity-40"
            >
              <span className="truncate">
                {nextLesson ? nextLesson.title : "Next"}
              </span>
              <ChevronRight className="size-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function lessonMatches(lesson: Lesson, q: string): boolean {
  if (!q) return true;
  return (
    lesson.title.toLowerCase().includes(q) ||
    lesson.summary.toLowerCase().includes(q) ||
    lesson.explanation.some((p) => p.toLowerCase().includes(q))
  );
}

function LessonView({
  lesson,
  registerRef,
}: {
  lesson: FlatLesson;
  registerRef: (el: HTMLElement | null) => void;
}) {
  const Icon = SECTION_ICONS[
    GUIDE_SECTIONS.find((s) => s.id === lesson.sectionId)?.icon ?? ""
  ] ?? BookOpen;
  return (
    <section
      ref={registerRef}
      data-lesson={lesson.id}
      className="scroll-mt-12 rounded-xl border border-border bg-panel/60 p-5 shadow-sm transition-colors first:mt-0"
      style={{ marginBottom: "1.5rem" }}
    >
      <div className="mb-2 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wide text-muted-2">
        <Icon className="size-3.5 text-accent" />
        <span>{lesson.sectionTitle}</span>
      </div>
      <h2 className="text-xl font-semibold text-foreground">{lesson.title}</h2>
      <p className="mt-1 text-[13px] text-muted">{lesson.summary}</p>

      <div className="mt-3 space-y-2 text-[13.5px] leading-relaxed text-foreground/90">
        {lesson.explanation.map((para, i) => (
          <p key={i}>{para}</p>
        ))}
      </div>

      <GuideCodeBlock code={lesson.code} language={lesson.language} />

      {lesson.previewHtml && (
        <PreviewFrame html={lesson.previewHtml} title={`What this renders`} />
      )}

      {lesson.mistakes && lesson.mistakes.length > 0 && (
        <Callout kind="mistake" title="Common Beginner Mistakes">
          <ul className="list-disc space-y-1 pl-4">
            {lesson.mistakes.map((m, i) => (
              <li key={i}>{m}</li>
            ))}
          </ul>
        </Callout>
      )}

      {lesson.tips && lesson.tips.length > 0 && (
        <Callout kind="tip" title="Tips & Best Practices">
          <ul className="list-disc space-y-1 pl-4">
            {lesson.tips.map((t, i) => (
              <li key={i}>{t}</li>
            ))}
          </ul>
        </Callout>
      )}
    </section>
  );
}