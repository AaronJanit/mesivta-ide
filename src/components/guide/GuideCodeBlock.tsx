"use client";

import { useEffect, useRef, useState } from "react";
import hljs from "highlight.js";
import { Check, Copy } from "lucide-react";
import type { GuideLanguage } from "./guideContent";
import { cn } from "@/lib/cn";

interface GuideCodeBlockProps {
  code: string;
  language: GuideLanguage;
}

const LANG_LABEL: Record<GuideLanguage, string> = {
  html: "HTML",
  css: "CSS",
  javascript: "JavaScript",
};

export function GuideCodeBlock({ code, language }: GuideCodeBlockProps) {
  const codeRef = useRef<HTMLElement>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (codeRef.current) {
      codeRef.current.removeAttribute("data-highlighted");
      codeRef.current.className = `language-${language}`;
      hljs.highlightElement(codeRef.current);
    }
  }, [code, language]);

  async function copy() {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // ignore
    }
  }

  return (
    <div className="my-3 overflow-hidden rounded-lg border border-border bg-editor">
      <div className="flex h-8 items-center justify-between border-b border-border px-3">
        <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-2">
          {LANG_LABEL[language]}
        </span>
        <button
          onClick={copy}
          className={cn(
            "flex items-center gap-1 rounded px-2 py-1 text-[11px] transition-colors",
            copied ? "text-success" : "text-muted hover:bg-panel-2 hover:text-foreground",
          )}
          aria-label="Copy code"
        >
          {copied ? (
            <>
              <Check className="size-3.5" />
              <span>Copied</span>
            </>
          ) : (
            <>
              <Copy className="size-3.5" />
              <span>Copy</span>
            </>
          )}
        </button>
      </div>
      <pre className="overflow-auto p-3 text-[12.5px] leading-relaxed">
        <code
          ref={codeRef}
          className={`language-${language}`}
        >
          {code}
        </code>
      </pre>
    </div>
  );
}