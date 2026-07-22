"use client";

import type { LucideIcon } from "lucide-react";
import { Lightbulb, AlertTriangle, Star } from "lucide-react";
import { cn } from "@/lib/cn";

export type CalloutKind = "tip" | "mistake" | "best";

interface CalloutProps {
  kind: CalloutKind;
  title?: string;
  children: React.ReactNode;
}

const CONFIG: Record<
  CalloutKind,
  { icon: LucideIcon; label: string; classes: string; iconColor: string }
> = {
  tip: {
    icon: Lightbulb,
    label: "Tip",
    classes: "border-accent/40 bg-accent-soft",
    iconColor: "text-accent",
  },
  mistake: {
    icon: AlertTriangle,
    label: "Common Mistake",
    classes: "border-warning/40 bg-warning/10",
    iconColor: "text-warning",
  },
  best: {
    icon: Star,
    label: "Best Practice",
    classes: "border-success/40 bg-success/10",
    iconColor: "text-success",
  },
};

export function Callout({ kind, title, children }: CalloutProps) {
  const { icon: Icon, label, classes, iconColor } = CONFIG[kind];
  const heading = title ?? label;
  return (
    <div className={cn("my-3 flex gap-3 rounded-lg border p-3", classes)}>
      <Icon className={cn("mt-0.5 size-4 shrink-0", iconColor)} />
      <div className="min-w-0 flex-1">
        <p className="text-[12px] font-semibold text-foreground">{heading}</p>
        <div className="mt-1 text-[12.5px] leading-relaxed text-muted">{children}</div>
      </div>
    </div>
  );
}