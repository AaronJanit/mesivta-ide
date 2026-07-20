"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeHighlight from "rehype-highlight";
import { CodeBlock } from "./CodeBlock";

interface Props {
  content: string;
}

export function Markdown({ content }: Props) {
  return (
    <div className="prose-invert max-w-none text-[13px] leading-relaxed text-foreground/90">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[[rehypeHighlight, { detect: true, ignoreMissing: true }]]}
        components={{
          // fenced code blocks — render via CodeBlock with copy
          pre({ children }) {
            // children is a <code className="language-xx">...</code> element
            const codeEl = Array.isArray(children) ? children[0] : children;
            const cls = (codeEl as any)?.props?.className ?? "";
            return <CodeBlock className={cls}>{(codeEl as any)?.props?.children}</CodeBlock>;
          },
          code({ className, children, ...rest }: any) {
            // inline code (no language class) — render plain
            if (!/language-/.test(className ?? "")) {
              return (
                <code className="rounded bg-panel-2 px-1 py-0.5 text-[12px] text-foreground" {...rest}>
                  {children}
                </code>
              );
            }
            return <code className={className} {...rest}>{children}</code>;
          },
          a({ children, href, ...rest }: any) {
            return (
              <a href={href} target="_blank" rel="noopener noreferrer" className="text-accent hover:underline" {...rest}>
                {children}
              </a>
            );
          },
          h1: ({ children }) => <h1 className="mb-2 mt-3 text-[15px] font-semibold text-foreground">{children}</h1>,
          h2: ({ children }) => <h2 className="mb-2 mt-3 text-[14px] font-semibold text-foreground">{children}</h2>,
          h3: ({ children }) => <h3 className="mb-1.5 mt-2 text-[13px] font-semibold text-foreground">{children}</h3>,
          p: ({ children }) => <p className="mb-2 leading-relaxed">{children}</p>,
          ul: ({ children }) => <ul className="mb-2 list-disc space-y-1 pl-5">{children}</ul>,
          ol: ({ children }) => <ol className="mb-2 list-decimal space-y-1 pl-5">{children}</ol>,
          li: ({ children }) => <li className="leading-relaxed">{children}</li>,
          blockquote: ({ children }) => (
            <blockquote className="my-2 border-l-2 border-accent/40 pl-3 text-muted">{children}</blockquote>
          ),
          table: ({ children }) => (
            <div className="my-2 overflow-auto">
              <table className="w-full border-collapse text-[12px]">{children}</table>
            </div>
          ),
          th: ({ children }) => <th className="border border-border bg-panel-2 px-2 py-1 text-left font-medium">{children}</th>,
          td: ({ children }) => <td className="border border-border px-2 py-1">{children}</td>,
          hr: () => <hr className="my-3 border-border" />,
          strong: ({ children }) => <strong className="font-semibold text-foreground">{children}</strong>,
          em: ({ children }) => <em className="italic">{children}</em>,
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}