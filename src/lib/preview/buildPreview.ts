import type { FileDTO } from "@/lib/api/client";

/**
 * Build a self-contained HTML string for an iframe srcDoc by inlining
 * referenced CSS and JS from the project's file tree into the index.html.
 */
export function buildPreview(tree: FileDTO[]): string | null {
  // flatten into a path map
  const map = new Map<string, FileDTO>();
  const byPath = new Map<string, FileDTO>();
  const walk = (nodes: FileDTO[], prefix: string) => {
    for (const n of nodes) {
      const p = prefix ? `${prefix}/${n.name}` : n.name;
      map.set(n.id, n);
      byPath.set(p, n);
      if (n.children) walk(n.children, p);
    }
  };
  walk(tree, "");

  // find an index.html (prefer root)
  const index =
    byPath.get("index.html") ??
    byPath.get("Index.html") ??
    [...byPath.entries()].find(([p]) => p.toLowerCase().endsWith("/index.html"))?.[1] ??
    [...byPath.entries()].find(([p]) => p.toLowerCase().endsWith(".html"))?.[1];

  if (!index || index.content == null) return null;
  let html = index.content;

  // Inline <link rel="stylesheet" href="...">
  html = html.replace(
    /<link[^>]*rel=["']stylesheet["'][^>]*href=["']([^"']+)["'][^>]*>/gi,
    (m, href: string) => {
      if (/^https?:\/\//i.test(href)) return m; // leave external
      const f = resolvePath(href, byPath);
      if (f && f.type === "file" && f.content != null) {
        return `<style data-src="${escapeAttr(href)}">${f.content}</style>`;
      }
      return m;
    },
  );

  // Inline <script src="..."></script>
  html = html.replace(
    /<script[^>]*src=["']([^"']+)["'][^>]*>\s*<\/script>/gi,
    (m, src: string) => {
      if (/^https?:\/\//i.test(src)) return m;
      const f = resolvePath(src, byPath);
      if (f && f.type === "file" && f.content != null) {
        return `<script data-src="${escapeAttr(src)}">${f.content}</script>`;
      }
      return m;
    },
  );

  return html;
}

function resolvePath(href: string, byPath: Map<string, FileDTO>): FileDTO | null {
  const clean = href.replace(/^\.?\//, "");
  return byPath.get(clean) ?? byPath.get(href) ?? null;
}

function escapeAttr(s: string): string {
  return s.replace(/"/g, "&quot;").replace(/</g, "&lt;");
}