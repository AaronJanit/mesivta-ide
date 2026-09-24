// Club curriculum timeline for the Overview page.
// Pure data module — modeled on src/components/guide/guideContent.ts.
//
// Source of truth: https://vibes.hackclub.com (current program) and
// https://webdev.hackclub.com (live events only; ended/paused events excluded).

export type MilestoneStatus = "now" | "upcoming" | "finale";

export interface MilestoneImage {
  src: string;
  alt: string;
}

export interface Milestone {
  id: string;
  title: string;
  status: MilestoneStatus;
  /** Small label chip shown on the card, e.g. "Start here" or "JavaScript starter". */
  tag?: string;
  description: string;
  reward?: string;
  estTime?: string;
  /** Hack Club program logo (hotlinked — Hack Club open assets). */
  image?: MilestoneImage;
}

export const TIMELINE: Milestone[] = [
  {
    id: "vibes",
    title: "Vibes",
    status: "now",
    description:
      "Build a website with good vibes (and a little help from AI) in three parts: prompt an AI to code a site about your topic, then edit the code yourself to change styling and content, then add new features to make it your own.",
    reward: "Club pizza party 🍕",
    estTime: "Current program",
  },
  {
    id: "boba-drops",
    title: "Boba Drops",
    status: "upcoming",
    tag: "Start here",
    description: "Build a website using HTML and CSS — your first hand-made site.",
    reward: "Free boba",
    estTime: "30–60 minutes",
    image: { src: "https://webdev.hackclub.com/imgs/boba.png", alt: "Boba Drops illustration" },
  },
  {
    id: "swirl",
    title: "Swirl",
    status: "upcoming",
    tag: "Continue here",
    description:
      "Build an even cooler website with HTML and CSS, and add a unique feature like a favicon.",
    reward: "Free ice cream",
    estTime: "1–2 hours",
    image: { src: "https://webdev.hackclub.com/imgs/swirl.svg", alt: "Swirl illustration" },
  },
  {
    id: "toppings",
    title: "Toppings",
    status: "upcoming",
    tag: "Alternate track",
    description: "Add some extra flavor to your website with CSS.",
    reward: "Toppings for your ice cream or boba",
    estTime: "30–60 minutes",
    image: { src: "https://webdev.hackclub.com/imgs/toppings.png", alt: "Toppings illustration" },
  },
  {
    id: "flavorless",
    title: "Flavorless",
    status: "upcoming",
    tag: "JavaScript starter",
    description: "Build a website using only HTML and JavaScript. No CSS allowed.",
    reward: undefined,
    estTime: "1 hour",
    image: { src: "https://webdev.hackclub.com/imgs/flavorless.png", alt: "Flavorless logo" },
  },
  {
    id: "waffles",
    title: "Waffles",
    status: "upcoming",
    tag: "JavaScript practice",
    description: "Make a website that uses JavaScript, and get free waffles!",
    reward: "Free waffles",
    estTime: "2 hours",
    image: { src: "https://webdev.hackclub.com/imgs/waffles.jpg", alt: "Waffles illustration" },
  },
  {
    id: "reactive",
    title: "Reactive",
    status: "upcoming",
    tag: "React",
    description: "Make a website using the React framework — a taste of the modern web.",
    reward: "Free domain to host it",
    estTime: "3 hours",
    image: { src: "https://webdev.hackclub.com/imgs/reactive.png", alt: "Reactive illustration" },
  },
  {
    id: "onwards",
    title: "Onwards and upwards!",
    status: "finale",
    description:
      "The series ends, but the building doesn't. Head back to the IDE, the docs, and the challenges to keep making things of your own.",
  },
];