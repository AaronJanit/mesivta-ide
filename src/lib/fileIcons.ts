// Map file extension -> lucide icon name. Used by the explorer tree rows.
export interface IconSpec {
  icon: "file" | "file-code" | "file-json" | "file-text" | "image" | "file-cog" | "braces";
  color?: string; // tailwind text-* class
}

const MAP: Record<string, IconSpec> = {
  ts: { icon: "file-code", color: "text-[#3178c6]" },
  tsx: { icon: "file-code", color: "text-[#3178c6]" },
  js: { icon: "file-code", color: "text-[#e8b339]" },
  jsx: { icon: "file-code", color: "text-[#e8b339]" },
  mjs: { icon: "file-code", color: "text-[#e8b339]" },
  cjs: { icon: "file-code", color: "text-[#e8b339]" },
  json: { icon: "file-json", color: "text-[#cbcb41]" },
  html: { icon: "file-code", color: "text-[#e44d26]" },
  htm: { icon: "file-code", color: "text-[#e44d26]" },
  css: { icon: "file-code", color: "text-[#42a5f5]" },
  scss: { icon: "file-code", color: "text-[#cf649a]" },
  less: { icon: "file-code", color: "text-[#1d365d]" },
  md: { icon: "file-text", color: "text-muted" },
  mdx: { icon: "file-text", color: "text-muted" },
  txt: { icon: "file-text", color: "text-muted" },
  py: { icon: "file-code", color: "text-[#3572A5]" },
  rb: { icon: "file-code", color: "text-[#701516]" },
  go: { icon: "file-code", color: "text-[#00ADD8]" },
  rs: { icon: "file-code", color: "text-[#dea584]" },
  java: { icon: "file-code", color: "text-[#b07219]" },
  c: { icon: "file-code", color: "text-[#555]" },
  h: { icon: "file-code", color: "text-[#555]" },
  cpp: { icon: "file-code", color: "text-[#f34b7d]" },
  hpp: { icon: "file-code", color: "text-[#f34b7d]" },
  cs: { icon: "file-code", color: "text-[#178600]" },
  php: { icon: "file-code", color: "text-[#4F5D95]" },
  sh: { icon: "file-cog", color: "text-muted" },
  bash: { icon: "file-cog", color: "text-muted" },
  yml: { icon: "file-cog", color: "text-muted" },
  yaml: { icon: "file-cog", color: "text-muted" },
  toml: { icon: "file-cog", color: "text-muted" },
  env: { icon: "file-cog", color: "text-muted" },
  svg: { icon: "image", color: "text-[#ffb13b]" },
  png: { icon: "image", color: "text-muted" },
  jpg: { icon: "image", color: "text-muted" },
  jpeg: { icon: "image", color: "text-muted" },
  gif: { icon: "image", color: "text-muted" },
  webp: { icon: "image", color: "text-muted" },
  lock: { icon: "file-cog", color: "text-muted-2" },
  sql: { icon: "file-code", color: "text-[#e38c00]" },
  xml: { icon: "file-code", color: "text-muted" },
};

export function iconForFile(name: string | undefined | null): IconSpec {
  const ext = (name ?? "").split(".").pop()?.toLowerCase() ?? "";
  return MAP[ext] ?? { icon: "file", color: "text-muted" };
}