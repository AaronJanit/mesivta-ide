"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, Compass, X } from "lucide-react";

export interface TourStep {
  /** CSS selector for the element to spotlight + point at. */
  target: string;
  /** Short label shown above the description (e.g. the page/area name). */
  label: string;
  title: string;
  description: string;
  /** Where the card floats relative to the target. */
  side?: "top" | "bottom" | "left" | "right";
  /**
   * Navigate before showing this step. The element must exist on that page.
   * Tour waits for the selector to appear before spotlighting.
   */
  navigate?: string;
  /** Optional action to run when arriving at the step (e.g. open a panel). */
  beforeShow?: () => void;
}

const STORAGE_KEY = "mesivta:intro-tour-done";

export function isIntroTourDone(): boolean {
  if (typeof window === "undefined") return true;
  return window.localStorage.getItem(STORAGE_KEY) === "1";
}

export function markIntroTourDone(): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, "1");
}

/** The full site tour: dashboard → IDE → docs → challenges → overview → done. */
export const INTRO_TOUR_STEPS: TourStep[] = [
  {
    target: "[data-tour='hero']",
    label: "Dashboard",
    title: "Welcome to Mesivta Code 👋",
    description:
      "This is your home base. Everything you need is a click away — let's take a quick lap around the site.",
    navigate: "/dashboard",
  },
  {
    target: "[data-tour='get-started']",
    label: "Dashboard",
    title: "Start here anytime",
    description:
      "This card re-opens the intro guide whenever you need it. You can dismiss it once you're comfortable.",
    side: "bottom",
  },
  {
    target: "[data-tour='card-ide']",
    label: "Dashboard",
    title: "The IDE is where you build",
    description:
      "The Mesivta IDE is a real code editor in your browser — files, tabs, terminal, preview, and an AI assistant.",
    side: "bottom",
  },
  {
    target: "[data-tour='card-overview']",
    label: "Dashboard",
    title: "See what the club is up to",
    description:
      "The Overview page shows live club stats and the timeline of projects — what we're building now and what's next.",
    side: "bottom",
  },
  {
    target: "[data-tour='card-docs']",
    label: "Dashboard",
    title: "Learn with the docs",
    description:
      "Mesivta Docs has a step-by-step HTML, CSS & JavaScript guide written for our club, plus trusted references.",
    side: "bottom",
  },
  {
    target: "[data-tour='card-progress']",
    label: "Dashboard",
    title: "Track your progress",
    description:
      "My progress shows the Vibes program stage by stage. Complete a stage to unlock the next — and earn the pizza party 🍕",
    side: "bottom",
  },
  {
    target: "[data-tour='learning-library']",
    label: "Dashboard",
    title: "Extra places to learn",
    description:
      "Trusted external sites plus one-page HTML & CSS cheatsheets you can keep open while you code.",
    side: "top",
  },
  {
    target: "[data-tour='ide-activity-bar']",
    label: "Mesivta IDE",
    title: "Your toolbox",
    description:
      "The activity bar switches between the Explorer (your files), the Coding Guide, the Debugger, and the Terminal.",
    navigate: "/ide",
    side: "right",
  },
  {
    target: "[data-tour='ide-toolbar']",
    label: "Mesivta IDE",
    title: "Toolbar",
    description:
      "Create projects, add files, and sign out from the top bar. The Hack Club toolbox link lives here too.",
    side: "bottom",
  },
  {
    target: "[data-tour='ide-editor']",
    label: "Mesivta IDE",
    title: "Write your code here",
    description:
      "Open a file from the Explorer and it appears here. The AI Assistant panel on the right can help whenever you're stuck.",
    side: "left",
  },
  {
    target: "[data-tour='ide-terminal']",
    label: "Mesivta IDE",
    title: "Terminal & preview",
    description:
      "Run npm start to spin up your site — it appears in the Preview tab next to the terminal. Try typing help.",
    side: "top",
    beforeShow: () => window.dispatchEvent(new Event("tour:open-terminal")),
  },
  {
    target: "[data-tour='ide-debug']",
    label: "Mesivta IDE",
    title: "The debugger",
    description:
      "The bug icon scans your project for syntax errors and explains them — click it to see any issues found.",
    side: "right",
    beforeShow: () => window.dispatchEvent(new Event("tour:open-debug")),
  },
  {
    target: "[data-tour='ide-guide']",
    label: "Mesivta IDE",
    title: "The built-in guide",
    description:
      "The book icon opens lesson-by-lesson walkthroughs right inside the IDE, with live previews as you learn.",
    side: "right",
    beforeShow: () => window.dispatchEvent(new Event("tour:open-guide")),
  },
  {
    target: "[data-tour='docs-hero']",
    label: "Mesivta Docs",
    title: "Your reference library",
    description:
      "The docs page holds our own HTML/CSS/JS guide series and links to the best references on the web.",
    navigate: "/docs",
    side: "bottom",
  },
  {
    target: "[data-tour='docs-guide-card']",
    label: "Mesivta Docs",
    title: "The Mesivta guide",
    description:
      "This is the full beginner course — lessons with code examples, live previews, and common mistakes to avoid.",
    side: "bottom",
  },
  {
    target: "[data-tour='challenges-hero']",
    label: "My progress",
    title: "Vibes — the current project",
    description:
      "Work through the three parts of Vibes here. Each 'I've done this' saves your answer into your project folder.",
    navigate: "/challenges",
    side: "bottom",
  },
  {
    target: "[data-tour='challenges-progress']",
    label: "My progress",
    title: "Watch your progress fill up",
    description:
      "The bar fills as you complete stages. Finish all three parts and the club celebrates with a pizza party 🍕",
    side: "bottom",
  },
  {
    target: "[data-tour='hero']",
    label: "All done!",
    title: "You're ready to build 🚀",
    description:
      "That's the tour! Start with the Vibes program in My progress, or dive straight into the IDE. Good luck!",
    navigate: "/dashboard",
    side: "bottom",
  },
];

interface Spotlight {
  rect: DOMRect;
}

export function IntroTour({ steps, onFinish }: { steps: TourStep[]; onFinish?: () => void }) {
  const router = useRouter();
  const [index, setIndex] = useState(0);
  const [spot, setSpot] = useState<Spotlight | null>(null);
  const [waiting, setWaiting] = useState(false);
  const step = steps[index];

  const finish = useCallback(() => {
    markIntroTourDone();
    onFinish?.();
  }, [onFinish]);

  // Navigate to the step's page if needed, then wait for the target element.
  useEffect(() => {
    if (!step) return;
    let cancelled = false;
    let pollTimer: ReturnType<typeof setTimeout> | undefined;
    setWaiting(true);

    // Run the step's side effects FIRST — some targets (terminal panel, debug
    // view) don't exist in the DOM until the effect has opened them.
    step.beforeShow?.();

    const findAndSpot = (attempt: number) => {
      if (cancelled) return;
      const el = document.querySelector(step.target) as HTMLElement | null;
      if (el) {
        el.scrollIntoView({ block: "center", behavior: "instant" as ScrollBehavior });
        requestAnimationFrame(() => {
          if (cancelled) return;
          setSpot({ rect: el.getBoundingClientRect() });
          setWaiting(false);
        });
      } else if (attempt < 60) {
        pollTimer = setTimeout(() => findAndSpot(attempt + 1), 150);
      } else {
        setSpot(null);
        setWaiting(false);
      }
    };

    if (step.navigate) {
      router.push(step.navigate);
      // Give the SPA navigation a moment, then poll for the element.
      setTimeout(() => findAndSpot(0), 350);
    } else {
      findAndSpot(0);
    }

    return () => {
      cancelled = true;
      clearTimeout(pollTimer);
    };
  }, [index, step, router]);

  // Reposition on resize/scroll.
  useEffect(() => {
    const reposition = () => {
      const el = step ? document.querySelector(step.target) : null;
      if (el) setSpot({ rect: el.getBoundingClientRect() });
    };
    window.addEventListener("resize", reposition);
    window.addEventListener("scroll", reposition, true);
    return () => {
      window.removeEventListener("resize", reposition);
      window.removeEventListener("scroll", reposition, true);
    };
  }, [step]);

  const cardStyle = useMemo(() => {
    if (!spot) return { opacity: 0 };
    const pad = 12;
    const cardW = 340;
    const cardH = 210;
    const side = step?.side ?? "bottom";
    const { rect } = spot;
    const vw = window.innerWidth;
    const vh = window.innerHeight;

    let top = 0;
    let left = 0;
    if (side === "bottom") {
      top = rect.bottom + pad;
      left = Math.min(Math.max(rect.left + rect.width / 2 - cardW / 2, pad), vw - cardW - pad);
    } else if (side === "top") {
      top = rect.top - cardH - pad;
      left = Math.min(Math.max(rect.left + rect.width / 2 - cardW / 2, pad), vw - cardW - pad);
      if (top < pad) {
        top = rect.bottom + pad;
      }
    } else if (side === "right") {
      top = Math.min(Math.max(rect.top + rect.height / 2 - cardH / 2, pad), vh - cardH - pad);
      left = rect.right + pad;
      if (left + cardW > vw - pad) {
        left = Math.max(rect.left - cardW - pad, pad);
      }
    } else {
      left = rect.left - cardW - pad;
      if (left < pad) left = rect.right + pad;
      top = Math.min(Math.max(rect.top + rect.height / 2 - cardH / 2, pad), vh - cardH - pad);
    }
    // Clamp into viewport.
    top = Math.min(Math.max(top, pad), vh - cardH - pad);
    left = Math.min(Math.max(left, pad), vw - cardW - pad);
    return { top, left, width: cardW, opacity: 1 };
  }, [spot, step]);

  if (!step) return null;

  const isFirst = index === 0;
  const isLast = index === steps.length - 1;

  return (
    <div className="fixed inset-0 z-[100]" role="dialog" aria-modal="true" aria-label="Site tour">
      {/* Dimmed backdrop with a spotlight cut-out over the target */}
      <svg className="absolute inset-0 h-full w-full">
        <defs>
          <mask id="tour-spotlight">
            <rect width="100%" height="100%" fill="white" />
            {spot && (
              <rect
                x={spot.rect.left - 8}
                y={spot.rect.top - 8}
                width={spot.rect.width + 16}
                height={spot.rect.height + 16}
                rx={12}
                fill="black"
              />
            )}
          </mask>
        </defs>
        <rect width="100%" height="100%" fill="black" opacity="0.6" mask="url(#tour-spotlight)" />
      </svg>

      {/* Step card */}
      <div
        className="fixed rounded-xl border border-accent/50 bg-panel/95 p-5 shadow-pop backdrop-blur-xl transition-all duration-200"
        style={cardStyle}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-accent">
            <Compass className="size-3.5" />
            {step.label}
          </div>
          <button
            type="button"
            onClick={finish}
            aria-label="End tour"
            title="End tour"
            className="-mr-1 -mt-1 rounded p-1 text-muted transition hover:bg-panel-2 hover:text-foreground"
          >
            <X className="size-4" />
          </button>
        </div>
        <h3 className="mt-2 font-semibold">{step.title}</h3>
        <p className="mt-1.5 text-xs leading-5 text-muted">{step.description}</p>
        <div className="mt-4 flex items-center justify-between">
          <span className="text-[11px] tabular-nums text-muted-2">
            {index + 1} of {steps.length}
          </span>
          <div className="flex gap-2">
            {index > 0 && (
              <button
                type="button"
                onClick={() => setIndex((i) => i - 1)}
                className="inline-flex items-center gap-1 rounded border border-border px-3 py-1.5 text-xs text-muted transition hover:text-foreground"
              >
                <ArrowLeft className="size-3" />
                Back
              </button>
            )}
            <button
              type="button"
              onClick={() => (isFirst && index === 0 ? setIndex(1) : isLast ? finish() : setIndex((i) => i + 1))}
              className="inline-flex items-center gap-1.5 rounded bg-accent px-3.5 py-1.5 text-xs font-semibold text-accent-fg transition hover:brightness-110 active:scale-[0.98]"
            >
              {isLast ? "Finish tour" : "Next"}
              <ArrowRight className="size-3" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}