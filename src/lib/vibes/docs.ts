/** Shared definitions of the Vibes program stages and their saved docs. */

export interface VibesDocSpec {
  /** API/progress key */
  stage: string;
  /** File created in the user's `vibes/` project folder */
  fileName: string;
  title: string;
  /** Form field key the client must send */
  fieldKey: string;
  fieldLabel: string;
  fieldPlaceholder: string;
  textarea?: boolean;
}

export interface VibesStageState {
  done: boolean;
  fileId: string;
  updatedAt: string;
  fileName?: string;
  projectName?: string;
}

export const VIBES_DOC_SPECS: VibesDocSpec[] = [
  {
    stage: "part-1",
    fileName: "part-1-prompt.md",
    title: "Part 1 — Prompt an AI",
    fieldKey: "prompt",
    fieldLabel: "Your AI prompt",
    fieldPlaceholder:
      "e.g. Make a website about my football club with a hero, fixtures table, and a signup form. Dark colours, big bold headings.",
  },
  {
    stage: "part-2",
    fileName: "part-2-edits.md",
    title: "Part 2 — Edit the code",
    fieldKey: "changes",
    fieldLabel: "What did you change?",
    fieldPlaceholder: "e.g. Changed the colours, swapped the heading text, moved the image.",
    textarea: true,
  },
  {
    stage: "part-3",
    fileName: "part-3-features.md",
    title: "Part 3 — Make it yours",
    fieldKey: "features",
    fieldLabel: "What new features did you add?",
    fieldPlaceholder: "e.g. Added a gallery, a lightbox, and a contact form.",
    textarea: true,
  },
];